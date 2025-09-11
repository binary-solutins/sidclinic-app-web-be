const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

// Basic health check
router.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Detailed health check with database connectivity
router.get('/health/detailed', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Database connectivity check
    try {
      await sequelize.authenticate();
      healthData.checks.database = {
        status: 'healthy',
        message: 'Database connection successful'
      };
    } catch (dbError) {
      healthData.checks.database = {
        status: 'unhealthy',
        message: dbError.message
      };
      healthData.status = 'unhealthy';
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    healthData.checks.memory = {
      status: 'healthy',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    };

    // CPU usage check
    const cpus = os.cpus();
    healthData.checks.cpu = {
      status: 'healthy',
      cores: cpus.length,
      model: cpus[0].model,
      speed: `${cpus[0].speed} MHz`
    };

    // Disk space check
    try {
      const stats = await fs.stat(process.cwd());
      healthData.checks.disk = {
        status: 'healthy',
        message: 'Disk access successful'
      };
    } catch (diskError) {
      healthData.checks.disk = {
        status: 'unhealthy',
        message: diskError.message
      };
      healthData.status = 'unhealthy';
    }

    // Environment variables check
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      healthData.checks.environment = {
        status: 'unhealthy',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      };
      healthData.status = 'unhealthy';
    } else {
      healthData.checks.environment = {
        status: 'healthy',
        message: 'All required environment variables present'
      };
    }

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await sequelize.authenticate();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
