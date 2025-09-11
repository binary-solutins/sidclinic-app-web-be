const compression = require('compression');
const morgan = require('morgan');
const logger = require('../utils/logger');

// Production middleware configuration
const productionMiddleware = (app) => {
  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return true;
    }
  }));

  // Request logging middleware
  app.use(morgan('combined', {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      }
    },
    skip: (req, res) => {
      // Skip logging for health checks
      return req.path === '/health' || req.path === '/ready' || req.path === '/live';
    }
  }));

  // Security headers
  app.use((req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Cache control for static assets
    if (req.path.startsWith('/static/') || req.path.startsWith('/uploads/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    // Log error
    logger.error('Unhandled Error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
      success: false,
      message: isDevelopment ? err.message : 'Internal Server Error',
      ...(isDevelopment && { stack: err.stack })
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
      method: req.method
    });
  });
};

module.exports = productionMiddleware;
