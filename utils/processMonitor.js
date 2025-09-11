const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ProcessMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      lastHealthCheck: null
    };
    
    this.thresholds = {
      memoryUsage: 0.95, // 95% memory usage (more realistic for Node.js)
      cpuUsage: 0.9,     // 90% CPU usage
      diskUsage: 0.9,    // 90% disk usage
      responseTime: 5000 // 5 seconds response time
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitor every 5 minutes (reduced from 30 seconds)
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, 300000);

    // Health check every 10 minutes (reduced from 5 minutes)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 600000);

    logger.info('Process monitoring started');
  }

  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        process: this.getProcessMetrics(),
        system: await this.getSystemMetrics(),
        application: this.getApplicationMetrics()
      };

      // Log metrics only if there are issues (reduce logging)
      if (this.hasIssues(metrics)) {
        logger.warn('System Metrics with issues:', metrics);
      }

      // Check for threshold breaches
      this.checkThresholds(metrics);

      // Store metrics for health checks
      this.metrics.lastHealthCheck = metrics;

    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  getProcessMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // Percentage
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoopLag: this.getEventLoopLag()
    };
  }

  async getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        used: Math.round((totalMem - freeMem) / 1024 / 1024), // MB
        usage: Math.round(((totalMem - freeMem) / totalMem) * 100) // Percentage
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed
      }
    };
  }

  getApplicationMetrics() {
    return {
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 
        ? Math.round((this.metrics.errorCount / this.metrics.requestCount) * 100) 
        : 0,
      uptime: Date.now() - this.metrics.startTime
    };
  }

  getEventLoopLag() {
    const start = process.hrtime();
    setImmediate(() => {
      const delta = process.hrtime(start);
      const lag = delta[0] * 1000 + delta[1] / 1000000; // Convert to milliseconds
      return lag;
    });
    return 0; // Placeholder - would need more complex implementation
  }

  hasIssues(metrics) {
    // Check if there are any issues that warrant logging
    return (
      metrics.process.memory.usage > this.thresholds.memoryUsage * 100 ||
      metrics.system.memory.usage > this.thresholds.memoryUsage * 100 ||
      metrics.application.errorRate > 5
    );
  }

  checkThresholds(metrics) {
    const alerts = [];

    // Memory usage check
    if (metrics.process.memory.usage > this.thresholds.memoryUsage * 100) {
      alerts.push({
        type: 'memory',
        message: `High memory usage: ${metrics.process.memory.usage}%`,
        severity: 'warning'
      });
    }

    // System memory check
    if (metrics.system.memory.usage > this.thresholds.memoryUsage * 100) {
      alerts.push({
        type: 'system_memory',
        message: `High system memory usage: ${metrics.system.memory.usage}%`,
        severity: 'critical'
      });
    }

    // Error rate check
    if (metrics.application.errorRate > 10) { // 10% error rate
      alerts.push({
        type: 'error_rate',
        message: `High error rate: ${metrics.application.errorRate}%`,
        severity: 'warning'
      });
    }

    // Log alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        logger.error(`CRITICAL ALERT: ${alert.message}`);
      } else {
        logger.warn(`WARNING: ${alert.message}`);
      }
    });
  }

  async performHealthCheck() {
    try {
      // Check if we can write to logs directory
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.access(logsDir, fs.constants.W_OK);

      // Check if we can read package.json
      await fs.access(path.join(process.cwd(), 'package.json'), fs.constants.R_OK);

      logger.info('Health check passed');
      return true;

    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }

  // Method to increment request count
  incrementRequestCount() {
    this.metrics.requestCount++;
  }

  // Method to increment error count
  incrementErrorCount() {
    this.metrics.errorCount++;
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      current: {
        process: this.getProcessMetrics(),
        system: this.getSystemMetrics(),
        application: this.getApplicationMetrics()
      }
    };
  }

  // Stop monitoring
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    logger.info('Process monitoring stopped');
  }
}

module.exports = ProcessMonitor;
