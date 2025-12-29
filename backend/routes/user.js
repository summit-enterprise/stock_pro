const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// Middleware to verify user token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Get user preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    // First, verify the user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.userId]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    const result = await pool.query(
      'SELECT sidebar_collapsed, theme FROM user_preferences WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences only if user exists
      await pool.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1)',
        [req.userId]
      );
      return res.json({ sidebarCollapsed: false, theme: 'dark' });
    }

    res.json({
      sidebarCollapsed: result.rows[0].sidebar_collapsed || false,
      theme: result.rows[0].theme || 'dark',
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    // If foreign key constraint violation, user doesn't exist
    if (error.code === '23503') {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    // First, verify the user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.userId]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    const { sidebarCollapsed, theme } = req.body;

    await pool.query(
      `INSERT INTO user_preferences (user_id, sidebar_collapsed, theme, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         sidebar_collapsed = EXCLUDED.sidebar_collapsed,
         theme = EXCLUDED.theme,
         updated_at = CURRENT_TIMESTAMP`,
      [req.userId, sidebarCollapsed || false, theme || 'dark']
    );

    res.json({ message: 'Preferences updated' });
  } catch (error) {
    console.error('Update preferences error:', error);
    // If foreign key constraint violation, user doesn't exist
    if (error.code === '23503') {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

