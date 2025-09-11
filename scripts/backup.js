const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.maxBackups = 30; // Keep last 30 backups
    this.retentionDays = 30; // Keep backups for 30 days
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info('Created backup directory');
    }
  }

  async createDatabaseBackup() {
    try {
      await this.ensureBackupDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Get database credentials from environment
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const dbName = process.env.DB_NAME;
      const dbUser = process.env.DB_USER;
      const dbPass = process.env.DB_PASS;

      if (!dbName || !dbUser || !dbPass) {
        throw new Error('Database credentials not found in environment variables');
      }

      // Create mysqldump command
      const dumpCommand = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPass} ${dbName} > ${backupPath}`;

      logger.info('Starting database backup...');
      await execAsync(dumpCommand);
      
      // Compress the backup
      const compressedPath = `${backupPath}.gz`;
      await execAsync(`gzip ${backupPath}`);
      
      logger.info(`Database backup created: ${compressedPath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return compressedPath;

    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  async createFileBackup() {
    try {
      await this.ensureBackupDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `files-backup-${timestamp}.tar.gz`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Files to backup (exclude node_modules, logs, backups)
      const filesToBackup = [
        'controllers',
        'models',
        'routes',
        'services',
        'middleware',
        'migrations',
        'templates',
        'config',
        'package.json',
        'package-lock.json',
        'server.js',
        'swagger.js'
      ].join(' ');

      const tarCommand = `tar -czf ${backupPath} ${filesToBackup}`;

      logger.info('Starting file backup...');
      await execAsync(tarCommand);
      
      logger.info(`File backup created: ${backupPath}`);
      
      return backupPath;

    } catch (error) {
      logger.error('File backup failed:', error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('backup-') || file.startsWith('files-backup-')
      );

      // Sort by creation time (newest first)
      const sortedFiles = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            createdAt: stats.birthtime
          };
        })
      );

      sortedFiles.sort((a, b) => b.createdAt - a.createdAt);

      // Remove files beyond maxBackups limit
      if (sortedFiles.length > this.maxBackups) {
        const filesToRemove = sortedFiles.slice(this.maxBackups);
        for (const file of filesToRemove) {
          await fs.unlink(file.path);
          logger.info(`Removed old backup: ${file.name}`);
        }
      }

      // Remove files older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      for (const file of sortedFiles) {
        if (file.createdAt < cutoffDate) {
          await fs.unlink(file.path);
          logger.info(`Removed expired backup: ${file.name}`);
        }
      }

    } catch (error) {
      logger.error('Error cleaning up old backups:', error);
    }
  }

  async restoreDatabase(backupPath) {
    try {
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';
      const dbName = process.env.DB_NAME;
      const dbUser = process.env.DB_USER;
      const dbPass = process.env.DB_PASS;

      if (!dbName || !dbUser || !dbPass) {
        throw new Error('Database credentials not found in environment variables');
      }

      // Check if backup file exists
      await fs.access(backupPath);

      // If it's a compressed file, decompress it first
      let sqlPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        sqlPath = backupPath.replace('.gz', '');
        await execAsync(`gunzip -c ${backupPath} > ${sqlPath}`);
      }

      // Restore database
      const restoreCommand = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPass} ${dbName} < ${sqlPath}`;
      
      logger.info('Starting database restore...');
      await execAsync(restoreCommand);
      
      // Clean up temporary file if it was decompressed
      if (sqlPath !== backupPath) {
        await fs.unlink(sqlPath);
      }
      
      logger.info('Database restore completed successfully');

    } catch (error) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      await this.ensureBackupDirectory();
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('backup-') || file.startsWith('files-backup-')
      );

      const backupInfo = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: Math.round(stats.size / 1024 / 1024 * 100) / 100, // MB
            createdAt: stats.birthtime,
            type: file.startsWith('backup-') ? 'database' : 'files'
          };
        })
      );

      return backupInfo.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const backup = new DatabaseBackup();
  const command = process.argv[2];

  switch (command) {
    case 'create':
      backup.createDatabaseBackup()
        .then(() => {
          console.log('Backup created successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Backup failed:', error);
          process.exit(1);
        });
      break;

    case 'files':
      backup.createFileBackup()
        .then(() => {
          console.log('File backup created successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('File backup failed:', error);
          process.exit(1);
        });
      break;

    case 'list':
      backup.listBackups()
        .then((backups) => {
          console.log('Available backups:');
          backups.forEach(backup => {
            console.log(`${backup.name} (${backup.size}MB) - ${backup.createdAt.toISOString()}`);
          });
          process.exit(0);
        })
        .catch((error) => {
          console.error('Error listing backups:', error);
          process.exit(1);
        });
      break;

    case 'restore':
      const backupPath = process.argv[3];
      if (!backupPath) {
        console.error('Please provide backup file path');
        process.exit(1);
      }
      backup.restoreDatabase(backupPath)
        .then(() => {
          console.log('Database restored successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('Restore failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: node backup.js [create|files|list|restore] [backup_path]');
      process.exit(1);
  }
}

module.exports = DatabaseBackup;
