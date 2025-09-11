const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class SecurityAuditor {
  constructor() {
    this.auditResults = {
      vulnerabilities: [],
      warnings: [],
      recommendations: [],
      score: 100
    };
  }

  async runFullAudit() {
    console.log('🔒 Starting comprehensive security audit...\n');
    
    await this.auditDependencies();
    await this.auditEnvironmentVariables();
    await this.auditCodeSecurity();
    await this.auditDatabaseSecurity();
    await this.auditAuthentication();
    await this.auditFilePermissions();
    await this.auditHTTPSConfiguration();
    await this.auditInputValidation();
    await this.auditErrorHandling();
    await this.auditLogging();
    
    this.generateReport();
  }

  async auditDependencies() {
    console.log('📦 Auditing dependencies...');
    
    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json');
      const auditData = JSON.parse(stdout);
      
      if (auditData.vulnerabilities) {
        const vulnCount = Object.keys(auditData.vulnerabilities).length;
        if (vulnCount > 0) {
          this.auditResults.vulnerabilities.push({
            category: 'Dependencies',
            severity: 'HIGH',
            message: `${vulnCount} vulnerabilities found in dependencies`,
            details: auditData.vulnerabilities
          });
          this.auditResults.score -= 20;
        }
      }
      
      // Check for outdated packages
      const { stdout: outdated } = await execAsync('npm outdated --json');
      const outdatedData = JSON.parse(outdated);
      
      if (Object.keys(outdatedData).length > 0) {
        this.auditResults.warnings.push({
          category: 'Dependencies',
          message: `${Object.keys(outdatedData).length} packages are outdated`,
          details: outdatedData
        });
        this.auditResults.score -= 5;
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Dependencies',
        message: 'Could not run npm audit',
        details: error.message
      });
    }
  }

  async auditEnvironmentVariables() {
    console.log('🔐 Auditing environment variables...');
    
    const requiredEnvVars = [
      'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS',
      'JWT_SECRET', 'NODE_ENV'
    ];
    
    const sensitiveEnvVars = [
      'DB_PASS', 'JWT_SECRET', 'API_KEY', 'SECRET_KEY'
    ];
    
    // Check for missing required variables
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      this.auditResults.vulnerabilities.push({
        category: 'Environment',
        severity: 'HIGH',
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
        recommendation: 'Set all required environment variables'
      });
      this.auditResults.score -= 15;
    }
    
    // Check for weak secrets
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.auditResults.vulnerabilities.push({
        category: 'Environment',
        severity: 'HIGH',
        message: 'JWT_SECRET is too short (minimum 32 characters recommended)',
        recommendation: 'Use a longer, more secure JWT secret'
      });
      this.auditResults.score -= 10;
    }
    
    // Check for default values
    if (process.env.NODE_ENV === 'development' && process.env.JWT_SECRET === 'your-secret-key') {
      this.auditResults.vulnerabilities.push({
        category: 'Environment',
        severity: 'CRITICAL',
        message: 'Using default JWT secret in production',
        recommendation: 'Change JWT secret to a secure random string'
      });
      this.auditResults.score -= 25;
    }
  }

  async auditCodeSecurity() {
    console.log('🔍 Auditing code security...');
    
    try {
      // Check for hardcoded secrets
      const files = await this.getSourceFiles();
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for hardcoded passwords
        if (content.includes('password') && content.includes('=')) {
          this.auditResults.warnings.push({
            category: 'Code Security',
            message: `Potential hardcoded password in ${file}`,
            recommendation: 'Use environment variables for sensitive data'
          });
          this.auditResults.score -= 5;
        }
        
        // Check for SQL injection vulnerabilities
        if (content.includes('query(') && content.includes('${')) {
          this.auditResults.vulnerabilities.push({
            category: 'Code Security',
            severity: 'HIGH',
            message: `Potential SQL injection vulnerability in ${file}`,
            recommendation: 'Use parameterized queries or ORM methods'
          });
          this.auditResults.score -= 15;
        }
        
        // Check for eval usage
        if (content.includes('eval(')) {
          this.auditResults.vulnerabilities.push({
            category: 'Code Security',
            severity: 'CRITICAL',
            message: `Use of eval() found in ${file}`,
            recommendation: 'Remove eval() usage as it poses security risks'
          });
          this.auditResults.score -= 20;
        }
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Code Security',
        message: 'Could not audit source files',
        details: error.message
      });
    }
  }

  async auditDatabaseSecurity() {
    console.log('🗄️ Auditing database security...');
    
    // Check database connection string
    if (process.env.DB_HOST && process.env.DB_HOST.includes('localhost')) {
      this.auditResults.warnings.push({
        category: 'Database',
        message: 'Database is running on localhost',
        recommendation: 'Use a dedicated database server for production'
      });
      this.auditResults.score -= 5;
    }
    
    // Check for database user permissions
    this.auditResults.recommendations.push({
      category: 'Database',
      message: 'Ensure database user has minimal required permissions',
      priority: 'MEDIUM'
    });
    
    // Check for database encryption
    this.auditResults.recommendations.push({
      category: 'Database',
      message: 'Enable database encryption in transit and at rest',
      priority: 'HIGH'
    });
  }

  async auditAuthentication() {
    console.log('🔑 Auditing authentication...');
    
    try {
      // Check JWT implementation
      const authFile = path.join(process.cwd(), 'middleware', 'auth.js');
      const authContent = await fs.readFile(authFile, 'utf8');
      
      if (!authContent.includes('expiresIn')) {
        this.auditResults.vulnerabilities.push({
          category: 'Authentication',
          severity: 'MEDIUM',
          message: 'JWT tokens may not have expiration time',
          recommendation: 'Set appropriate expiration time for JWT tokens'
        });
        this.auditResults.score -= 10;
      }
      
      if (!authContent.includes('refresh')) {
        this.auditResults.recommendations.push({
          category: 'Authentication',
          message: 'Implement JWT token refresh mechanism',
          priority: 'MEDIUM'
        });
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Authentication',
        message: 'Could not audit authentication middleware',
        details: error.message
      });
    }
  }

  async auditFilePermissions() {
    console.log('📁 Auditing file permissions...');
    
    try {
      // Check sensitive files
      const sensitiveFiles = [
        'package.json',
        'server.js',
        'config/db.js'
      ];
      
      for (const file of sensitiveFiles) {
        try {
          const stats = await fs.stat(file);
          const mode = stats.mode.toString(8);
          
          if (mode.endsWith('777') || mode.endsWith('666')) {
            this.auditResults.vulnerabilities.push({
              category: 'File Permissions',
              severity: 'HIGH',
              message: `File ${file} has overly permissive permissions (${mode})`,
              recommendation: 'Restrict file permissions to 644 or 600'
            });
            this.auditResults.score -= 10;
          }
        } catch (error) {
          // File doesn't exist, skip
        }
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'File Permissions',
        message: 'Could not audit file permissions',
        details: error.message
      });
    }
  }

  async auditHTTPSConfiguration() {
    console.log('🔒 Auditing HTTPS configuration...');
    
    if (process.env.NODE_ENV === 'production') {
      this.auditResults.recommendations.push({
        category: 'HTTPS',
        message: 'Ensure HTTPS is enabled in production',
        priority: 'HIGH'
      });
      
      this.auditResults.recommendations.push({
        category: 'HTTPS',
        message: 'Implement HSTS (HTTP Strict Transport Security)',
        priority: 'MEDIUM'
      });
    }
  }

  async auditInputValidation() {
    console.log('✅ Auditing input validation...');
    
    try {
      const controllerFiles = await this.getControllerFiles();
      
      for (const file of controllerFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for input validation
        if (!content.includes('validate') && !content.includes('sanitize')) {
          this.auditResults.warnings.push({
            category: 'Input Validation',
            message: `No input validation found in ${file}`,
            recommendation: 'Add input validation and sanitization'
          });
          this.auditResults.score -= 5;
        }
        
        // Check for rate limiting
        if (!content.includes('rateLimit') && !content.includes('throttle')) {
          this.auditResults.recommendations.push({
            category: 'Input Validation',
            message: 'Implement rate limiting for API endpoints',
            priority: 'HIGH'
          });
        }
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Input Validation',
        message: 'Could not audit input validation',
        details: error.message
      });
    }
  }

  async auditErrorHandling() {
    console.log('⚠️ Auditing error handling...');
    
    try {
      const controllerFiles = await this.getControllerFiles();
      
      for (const file of controllerFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for proper error handling
        if (!content.includes('try') || !content.includes('catch')) {
          this.auditResults.warnings.push({
            category: 'Error Handling',
            message: `No try-catch blocks found in ${file}`,
            recommendation: 'Add proper error handling'
          });
          this.auditResults.score -= 5;
        }
        
        // Check for error logging
        if (!content.includes('logger') && !content.includes('console.error')) {
          this.auditResults.warnings.push({
            category: 'Error Handling',
            message: `No error logging found in ${file}`,
            recommendation: 'Add proper error logging'
          });
          this.auditResults.score -= 3;
        }
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Error Handling',
        message: 'Could not audit error handling',
        details: error.message
      });
    }
  }

  async auditLogging() {
    console.log('📝 Auditing logging...');
    
    try {
      const serverFile = path.join(process.cwd(), 'server.js');
      const serverContent = await fs.readFile(serverFile, 'utf8');
      
      if (!serverContent.includes('logger') && !serverContent.includes('morgan')) {
        this.auditResults.warnings.push({
          category: 'Logging',
          message: 'No logging middleware found in server.js',
          recommendation: 'Add request logging middleware'
        });
        this.auditResults.score -= 5;
      }
      
    } catch (error) {
      this.auditResults.warnings.push({
        category: 'Logging',
        message: 'Could not audit logging configuration',
        details: error.message
      });
    }
  }

  async getSourceFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx'];
    const files = [];
    
    const scanDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDir(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDir(process.cwd());
    return files;
  }

  async getControllerFiles() {
    const controllerDir = path.join(process.cwd(), 'controllers');
    const files = [];
    
    try {
      const entries = await fs.readdir(controllerDir);
      for (const entry of entries) {
        if (entry.endsWith('.js')) {
          files.push(path.join(controllerDir, entry));
        }
      }
    } catch (error) {
      // Controllers directory doesn't exist
    }
    
    return files;
  }

  generateReport() {
    console.log('\n📋 Security Audit Report');
    console.log('='.repeat(50));
    
    // Overall score
    console.log(`\n🎯 Overall Security Score: ${this.auditResults.score}/100`);
    
    if (this.auditResults.score >= 90) {
      console.log('✅ Excellent security posture!');
    } else if (this.auditResults.score >= 70) {
      console.log('⚠️  Good security, but room for improvement');
    } else if (this.auditResults.score >= 50) {
      console.log('⚠️  Security needs attention');
    } else {
      console.log('❌ Critical security issues found');
    }
    
    // Vulnerabilities
    if (this.auditResults.vulnerabilities.length > 0) {
      console.log('\n🚨 VULNERABILITIES:');
      this.auditResults.vulnerabilities.forEach((vuln, index) => {
        console.log(`${index + 1}. [${vuln.severity}] ${vuln.message}`);
        console.log(`   Category: ${vuln.category}`);
        if (vuln.recommendation) {
          console.log(`   Recommendation: ${vuln.recommendation}`);
        }
        console.log('');
      });
    }
    
    // Warnings
    if (this.auditResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.auditResults.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
        console.log(`   Category: ${warning.category}`);
        if (warning.recommendation) {
          console.log(`   Recommendation: ${warning.recommendation}`);
        }
        console.log('');
      });
    }
    
    // Recommendations
    if (this.auditResults.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.auditResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`   Category: ${rec.category}`);
        console.log('');
      });
    }
    
    // Save report to file
    this.saveReport();
  }

  async saveReport() {
    try {
      const reportPath = path.join(process.cwd(), 'security-audit-report.json');
      await fs.writeFile(reportPath, JSON.stringify(this.auditResults, null, 2));
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Could not save report:', error);
    }
  }
}

// CLI interface
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runFullAudit();
}

module.exports = SecurityAuditor;
