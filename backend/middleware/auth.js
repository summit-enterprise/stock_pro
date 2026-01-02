/**
 * Authentication Middleware
 * Centralized authentication and authorization middleware
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify user token - requires any authenticated user
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query(
      'SELECT id, email, is_admin, is_superuser, is_banned, is_restricted FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is banned or restricted
    if (user.rows[0].is_banned || user.rows[0].is_restricted) {
      // Allow access to support routes and profile routes even if banned/restricted
      // This includes ticket creation, viewing own tickets, contact forms, and viewing/editing own profile
      const originalUrl = req.originalUrl || req.url || '';
      const path = req.path || '';
      
      // Check both path (relative to router mount) and originalUrl (full path)
      const isAllowedRoute = path.includes('/support') || 
                            originalUrl.includes('/api/support') ||
                            originalUrl.includes('/api/contact') ||
                            path === '/profile' || // PUT /api/user/profile -> path is /profile
                            originalUrl.includes('/api/user/profile') ||
                            (req.method === 'GET' && (path.includes('/api/user/') || originalUrl.includes('/api/user/'))) ||
                            (req.method === 'POST' && (path.includes('/tickets') || originalUrl.includes('/tickets'))) ||
                            (req.method === 'GET' && (path.includes('/tickets') || originalUrl.includes('/tickets'))) ||
                            (req.method === 'PUT' && (path === '/profile' || originalUrl.includes('/api/user/profile'))) ||
                            (req.method === 'POST' && (path === '/avatar' || originalUrl.includes('/api/user/avatar')));
      
      if (!isAllowedRoute) {
        return res.status(403).json({ 
          error: 'Account restricted', 
          message: 'Your account has been restricted. Please contact support.',
          is_banned: user.rows[0].is_banned,
          is_restricted: user.rows[0].is_restricted
        });
      }
    }

    req.userId = decoded.userId;
    req.user = user.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Require admin access
 */
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query(
      'SELECT id, email, is_admin, is_superuser FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (user.rows.length === 0 || !user.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user.rows[0];
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Require superuser access
 */
const requireSuperuser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query(
      'SELECT id, email, is_admin, is_superuser FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (user.rows.length === 0 || !user.rows[0].is_superuser) {
      return res.status(403).json({ error: 'Superuser access required' });
    }

    req.user = user.rows[0];
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireSuperuser,
};

