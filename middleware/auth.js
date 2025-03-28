const jwt = require('jsonwebtoken');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 *   responses:
 *     Unauthorized:
 *       description: Invalid or missing authentication token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Authentication required"
 *     Forbidden:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Access denied"
 */

exports.authenticate = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // Swagger security requirements handler
    if (process.env.NODE_ENV === 'development' && req.headers['swagger-test']) {
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'MISSING_AUTH_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Role-based access control
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'ACCESS_DENIED',
          requiredRoles: roles,
          userRole: decoded.role
        });
      }

      // Token renewal mechanism (optional)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      
      if (expiresIn < 3600) { // Renew if expires in < 1 hour
        const newToken = jwt.sign(
          { id: decoded.id, role: decoded.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.set('X-Renewed-Token', newToken);
      }

      next();
    } catch (error) {
      const response = {
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      };

      if (error.name === 'TokenExpiredError') {
        response.message = 'Token expired';
        response.code = 'TOKEN_EXPIRED';
        response.expiredAt = error.expiredAt;
      }

      res.status(401).json(response);
    }
  };
};

exports.authorize = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         code:
 *           type: string
 *         expiredAt:
 *           type: string
 *           format: date-time
 *         requiredRoles:
 *           type: array
 *           items:
 *             type: string
 *         userRole:
 *           type: string
 */