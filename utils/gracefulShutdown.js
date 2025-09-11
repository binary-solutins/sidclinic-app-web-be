const { sequelize } = require('../models');
const logger = require('./logger');

class GracefulShutdown {
  constructor(server) {
    this.server = server;
    this.isShuttingDown = false;
    this.connections = new Set();
    this.setupProcessHandlers();
    this.setupServerHandlers();
  }

  setupProcessHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('unhandledRejection');
    });

    // Handle SIGTERM (termination signal)
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.shutdown('SIGTERM');
    });

    // Handle SIGINT (interrupt signal - Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.shutdown('SIGINT');
    });

    // Handle SIGHUP (hangup signal)
    process.on('SIGHUP', () => {
      logger.info('SIGHUP received, starting graceful shutdown');
      this.shutdown('SIGHUP');
    });
  }

  setupServerHandlers() {
    if (!this.server) return;

    // Track connections
    this.server.on('connection', (socket) => {
      this.connections.add(socket);
      
      socket.on('close', () => {
        this.connections.delete(socket);
      });
    });

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error('Port is already in use');
        process.exit(1);
      } else {
        logger.error('Server error:', error);
      }
    });
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown due to: ${signal}`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // 1. Stop accepting new connections
      if (this.server) {
        logger.info('Closing server...');
        await new Promise((resolve, reject) => {
          this.server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        logger.info('Server closed');
      }

      // 2. Close existing connections
      if (this.connections.size > 0) {
        logger.info(`Closing ${this.connections.size} active connections...`);
        await Promise.all(
          Array.from(this.connections).map(
            (socket) => new Promise((resolve) => {
              socket.end(() => resolve());
            })
          )
        );
        logger.info('All connections closed');
      }

      // 3. Close database connections
      logger.info('Closing database connections...');
      await sequelize.close();
      logger.info('Database connections closed');

      // 4. Clear any remaining timers/intervals
      this.clearTimers();

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  clearTimers() {
    // Clear all timers and intervals
    const activeHandles = process._getActiveHandles();
    const activeRequests = process._getActiveRequests();

    activeHandles.forEach(handle => {
      if (handle.constructor.name === 'Timer') {
        clearTimeout(handle);
      }
    });

    activeRequests.forEach(request => {
      if (request.constructor.name === 'Timer') {
        clearTimeout(request);
      }
    });
  }

  // Method to check if server is shutting down
  isShuttingDown() {
    return this.isShuttingDown;
  }
}

module.exports = GracefulShutdown;
