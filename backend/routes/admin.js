const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('../services/general/emailService');
const { batchGetChannelNames } = require('../services/general/youtubeService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to check if user is admin
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
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user is superuser
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
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Verify regular token and return admin token if user is admin
router.post('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query(
      'SELECT id, email, name, is_admin, is_superuser FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.rows[0];

    if (!userData.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Generate admin token
    const adminToken = jwt.sign(
      { userId: userData.id, email: userData.email, isAdmin: true, isSuperuser: userData.is_superuser },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token verified',
      token: adminToken,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        is_admin: userData.is_admin,
        is_superuser: userData.is_superuser
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user and check if admin
    const result = await pool.query(
      'SELECT id, email, password_hash, name, is_admin, is_superuser FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: true, isSuperuser: user.is_superuser },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        is_superuser: user.is_superuser
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, auth_type, is_admin, is_superuser, is_banned, is_restricted, ban_reason, banned_at, created_at 
       FROM users 
       WHERE is_admin = FALSE 
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get all admins (admin only)
router.get('/admins', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, auth_type, is_admin, is_superuser, is_banned, is_restricted, ban_reason, banned_at, created_at 
       FROM users 
       WHERE is_admin = TRUE 
       ORDER BY created_at DESC`
    );

    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update user/admin
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, is_admin, is_superuser, password } = req.body;
    const isSuperuser = req.user.is_superuser;

    // Check if user exists and get their current status
    const existing = await pool.query('SELECT id, is_admin, is_superuser FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = existing.rows[0];

    // Regular admins can only edit regular users (non-admins)
    // Superusers can edit anyone
    if (!isSuperuser && targetUser.is_admin) {
      return res.status(403).json({ error: 'Only superusers can edit admin accounts' });
    }

    // Only superusers can change admin/superuser status
    if ((is_admin !== undefined || is_superuser !== undefined) && !isSuperuser) {
      return res.status(403).json({ error: 'Only superusers can change admin/superuser status' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(is_admin);
    }

    if (is_superuser !== undefined) {
      updates.push(`is_superuser = $${paramCount++}`);
      values.push(is_superuser);
    }

    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, auth_type, is_admin, is_superuser, created_at`;
    
    const result = await pool.query(query, values);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Ban/Restrict user
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const isSuperuser = req.user.is_superuser;

    // Prevent banning yourself
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    if (parseInt(id) === decoded.userId) {
      return res.status(400).json({ error: 'Cannot ban your own account' });
    }

    // Check if target user exists and get their status
    const targetUser = await pool.query('SELECT id, is_admin, is_superuser FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only ban regular users (non-admins)
    // Superusers can ban anyone
    if (!isSuperuser && targetUser.rows[0].is_admin) {
      return res.status(403).json({ error: 'Only superusers can ban admin accounts' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_banned = TRUE, is_restricted = TRUE, ban_reason = $1, banned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, is_banned, is_restricted, ban_reason, banned_at`,
      [reason || null, id]
    );

    res.json({
      message: 'User banned successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Unban user
// NOTE: This only updates the ban status flags. All user data (watchlist, portfolio, tickets, etc.) is preserved.
router.post('/users/:id/unban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const isSuperuser = req.user.is_superuser;

    // Check if target user exists and get their status
    const targetUser = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only unban regular users (non-admins)
    // Superusers can unban anyone
    if (!isSuperuser && targetUser.rows[0].is_admin) {
      return res.status(403).json({ error: 'Only superusers can unban admin accounts' });
    }

    // Verify user data exists before unbanning (for logging/debugging)
    const watchlistCount = await pool.query('SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1', [id]);
    const portfolioCount = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = $1', [id]);
    console.log(`Unbanning user ${id}: Watchlist items: ${watchlistCount.rows[0].count}, Portfolio items: ${portfolioCount.rows[0].count}`);

    // Only update ban status flags - preserve all user data (watchlist, portfolio, etc.)
    // This UPDATE statement does NOT trigger CASCADE DELETE - only DELETE statements do
    const result = await pool.query(
      `UPDATE users 
       SET is_banned = FALSE, is_restricted = FALSE, ban_reason = NULL, banned_at = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, email, is_banned, is_restricted`,
      [id]
    );

    // Verify data is still present after unban
    const watchlistCountAfter = await pool.query('SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1', [id]);
    const portfolioCountAfter = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = $1', [id]);
    console.log(`After unban user ${id}: Watchlist items: ${watchlistCountAfter.rows[0].count}, Portfolio items: ${portfolioCountAfter.rows[0].count}`);

    if (parseInt(watchlistCountAfter.rows[0].count) !== parseInt(watchlistCount.rows[0].count) || 
        parseInt(portfolioCountAfter.rows[0].count) !== parseInt(portfolioCount.rows[0].count)) {
      console.error(`⚠️  WARNING: Data loss detected for user ${id} during unban operation!`);
    }

    res.json({
      message: 'User unbanned successfully',
      user: result.rows[0],
      dataPreserved: {
        watchlist: parseInt(watchlistCountAfter.rows[0].count),
        portfolio: parseInt(portfolioCountAfter.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Restrict user (less severe than ban - can still access support)
router.post('/users/:id/restrict', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const isSuperuser = req.user.is_superuser;

    // Prevent restricting yourself
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    if (parseInt(id) === decoded.userId) {
      return res.status(400).json({ error: 'Cannot restrict your own account' });
    }

    // Check if target user exists and get their status
    const targetUser = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only restrict regular users (non-admins)
    // Superusers can restrict anyone
    if (!isSuperuser && targetUser.rows[0].is_admin) {
      return res.status(403).json({ error: 'Only superusers can restrict admin accounts' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_restricted = TRUE, ban_reason = $1, banned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, is_banned, is_restricted, ban_reason, banned_at`,
      [reason || null, id]
    );

    res.json({
      message: 'User restricted successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error restricting user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Remove restriction from user
// NOTE: This only updates the restriction status flag. All user data (watchlist, portfolio, tickets, etc.) is preserved.
router.post('/users/:id/unrestrict', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const isSuperuser = req.user.is_superuser;

    // Check if target user exists and get their status
    const targetUser = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only unrestrict regular users (non-admins)
    // Superusers can unrestrict anyone
    if (!isSuperuser && targetUser.rows[0].is_admin) {
      return res.status(403).json({ error: 'Only superusers can unrestrict admin accounts' });
    }

    // Verify user data exists before unrestricting (for logging/debugging)
    const watchlistCount = await pool.query('SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1', [id]);
    const portfolioCount = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = $1', [id]);
    console.log(`Unrestricting user ${id}: Watchlist items: ${watchlistCount.rows[0].count}, Portfolio items: ${portfolioCount.rows[0].count}`);

    // Only update restriction status flag - preserve all user data (watchlist, portfolio, etc.)
    // This UPDATE statement does NOT trigger CASCADE DELETE - only DELETE statements do
    const result = await pool.query(
      `UPDATE users 
       SET is_restricted = FALSE, ban_reason = NULL, banned_at = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, email, is_banned, is_restricted`,
      [id]
    );

    // Verify data is still present after unrestrict
    const watchlistCountAfter = await pool.query('SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1', [id]);
    const portfolioCountAfter = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = $1', [id]);
    console.log(`After unrestrict user ${id}: Watchlist items: ${watchlistCountAfter.rows[0].count}, Portfolio items: ${portfolioCountAfter.rows[0].count}`);

    if (parseInt(watchlistCountAfter.rows[0].count) !== parseInt(watchlistCount.rows[0].count) || 
        parseInt(portfolioCountAfter.rows[0].count) !== parseInt(portfolioCount.rows[0].count)) {
      console.error(`⚠️  WARNING: Data loss detected for user ${id} during unrestrict operation!`);
    }

    res.json({
      message: 'User restriction removed successfully',
      user: result.rows[0],
      dataPreserved: {
        watchlist: parseInt(watchlistCountAfter.rows[0].count),
        portfolio: parseInt(portfolioCountAfter.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error removing restriction:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Delete user/admin
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const isSuperuser = req.user.is_superuser;

    // Prevent deleting yourself
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    if (parseInt(id) === decoded.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if target user exists and get their status
    const targetUser = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only delete regular users (non-admins)
    // Superusers can delete anyone
    if (!isSuperuser && targetUser.rows[0].is_admin) {
      return res.status(403).json({ error: 'Only superusers can delete admin accounts' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Create regular user (admin can create users, superuser can create admins)
router.post('/create-user', requireAdmin, async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const isSuperuser = req.user.is_superuser;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id, is_admin FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      // If existing user is an admin and current user is not superuser, deny
      if (existingUser.is_admin && !isSuperuser) {
        return res.status(403).json({ error: 'Only superusers can modify admin accounts' });
      }
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Generate secure random password if not provided
    let finalPassword = password;
    if (!finalPassword) {
      finalPassword = crypto.randomBytes(16).toString('base64').slice(0, 16) + 'A1!';
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

    // Create new regular user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_type, name, is_admin, is_superuser) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, is_admin, is_superuser, created_at`,
      [email, passwordHash, 'custom', name || null, false, false]
    );

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name || null, finalPassword, false);
    } catch (emailError) {
      console.error('Error sending welcome email (non-fatal):', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0],
      password: finalPassword,
      emailSent: true,
      warning: password ? undefined : 'Please share this password securely with the new user'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Create superuser (superuser only)
router.post('/create-superuser', requireSuperuser, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id, is_superuser FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_superuser) {
        return res.status(409).json({ error: 'User is already a superuser' });
      }
      // Upgrade to superuser
      await pool.query(
        'UPDATE users SET is_superuser = TRUE, is_admin = TRUE WHERE id = $1',
        [user.id]
      );
      return res.json({
        message: 'User upgraded to superuser successfully',
        email: email
      });
    }

    // Generate secure random password if not provided
    let finalPassword = password;
    if (!finalPassword) {
      finalPassword = crypto.randomBytes(16).toString('base64').slice(0, 16) + 'A1!';
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

    // Create new superuser
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_type, name, is_admin, is_superuser) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, is_admin, is_superuser, created_at`,
      [email, passwordHash, 'custom', name || null, true, true]
    );

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name || null, finalPassword, true);
    } catch (emailError) {
      console.error('Error sending welcome email (non-fatal):', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Superuser created successfully',
      user: result.rows[0],
      password: finalPassword,
      emailSent: true,
      warning: password ? undefined : 'Please share this password securely with the new superuser'
    });
  } catch (error) {
    console.error('Error creating superuser:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Create new admin (superuser only)
router.post('/create-admin', requireAdmin, async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const isSuperuser = req.user.is_superuser;

    // Only superusers can create admins
    if (!isSuperuser) {
      return res.status(403).json({ error: 'Only superusers can create admin accounts' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_admin) {
        return res.status(409).json({ error: 'User is already an admin' });
      }
      // Upgrade existing user to admin
      await pool.query(
        'UPDATE users SET is_admin = TRUE WHERE id = $1',
        [user.id]
      );
      return res.json({ 
        message: 'User upgraded to admin successfully',
        email: email
      });
    }

    // Generate secure random password if not provided
    let finalPassword = password;
    if (!finalPassword) {
      finalPassword = crypto.randomBytes(16).toString('base64').slice(0, 16) + 'A1!';
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

    // Create new admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_type, name, is_admin, is_superuser) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, is_admin, is_superuser`,
      [email, passwordHash, 'custom', name || null, true, false]
    );

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name || null, finalPassword, true);
    } catch (emailError) {
      console.error('Error sending welcome email (non-fatal):', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name
      },
      password: finalPassword, // Return password so superuser can share it
      emailSent: true,
      warning: password ? undefined : 'Please share this password securely with the new admin'
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// GCP Billing and Usage routes
const { gcpBillingService: billingService } = require('../services');

/**
 * Get billing usage data
 * GET /api/admin/billing/usage
 */
router.get('/billing/usage', requireAdmin, async (req, res) => {
  try {
    const { serviceName, startDate, endDate, projectId } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const filters = {
      serviceName,
      startDate: start,
      endDate: end,
      projectId,
    };

    const data = await billingService.getBillingUsageFromDB(filters);
    res.json({ success: true, data, filters });
  } catch (error) {
    console.error('Billing usage error:', error);
    res.status(500).json({ error: 'Failed to fetch billing usage', message: error.message });
  }
});

/**
 * Get aggregated billing data
 * GET /api/admin/billing/aggregates
 */
router.get('/billing/aggregates', requireAdmin, async (req, res) => {
  try {
    const { serviceName, startDate, endDate, projectId } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const filters = {
      serviceName,
      startDate: start,
      endDate: end,
      projectId,
    };

    const data = await billingService.getAggregatedBilling(filters);
    res.json({ success: true, data, filters });
  } catch (error) {
    console.error('Billing aggregates error:', error);
    res.status(500).json({ error: 'Failed to fetch billing aggregates', message: error.message });
  }
});

/**
 * Get service list
 * GET /api/admin/billing/services
 */
router.get('/billing/services', requireAdmin, async (req, res) => {
  try {
    const services = await billingService.getServiceList();
    res.json({ success: true, services });
  } catch (error) {
    console.error('Service list error:', error);
    res.status(500).json({ error: 'Failed to fetch service list', message: error.message });
  }
});

/**
 * Sync billing data from GCP
 * POST /api/admin/billing/sync
 */
router.post('/billing/sync', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await billingService.fetchAndSyncBilling(start, end);
    res.json({ 
      success: true, 
      message: `Synced ${data.length} billing records`,
      recordCount: data.length,
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('Billing sync error:', error);
    res.status(500).json({ error: 'Failed to sync billing data', message: error.message });
  }
});

// YouTube Channels Management Routes
// Get all YouTube channels
router.get('/youtube-channels', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM youtube_channels ORDER BY category, channel_name'
    );
    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube channels', message: error.message });
  }
});

// Create or update YouTube channels (bulk)
router.post('/youtube-channels', requireAdmin, async (req, res) => {
  try {
    const { channels } = req.body;
    
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }

    // Fetch channel names from YouTube API for channels that need it
    const channelIdsToFetch = channels
      .filter(ch => ch.channel_id && (!ch.channel_name || ch.channel_name === 'Channel'))
      .map(ch => ch.channel_id);
    
    let channelNamesMap = {};
    if (channelIdsToFetch.length > 0) {
      try {
        channelNamesMap = await batchGetChannelNames(channelIdsToFetch);
        console.log(`Fetched ${Object.keys(channelNamesMap).length} channel names from YouTube`);
      } catch (error) {
        console.warn('Error fetching channel names from YouTube:', error.message);
      }
    }

    const results = [];
    
    for (const channel of channels) {
      const { channel_id, channel_name, subject, category, content_type, pull_livestreams, is_active } = channel;
      
      if (!channel_id || !category || !content_type) {
        results.push({ 
          channel_id, 
          success: false, 
          error: 'Missing required fields: channel_id, category, content_type' 
        });
        continue;
      }

      // Use fetched channel name if available, otherwise use provided name or fallback
      const finalChannelName = channelNamesMap[channel_id] || channel_name || 'Channel';

      try {
        // Check if channel exists
        const existing = await pool.query(
          'SELECT id FROM youtube_channels WHERE channel_id = $1',
          [channel_id]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE youtube_channels 
             SET channel_name = $1, subject = $2, category = $3, content_type = $4, 
                 pull_livestreams = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
             WHERE channel_id = $7`,
            [finalChannelName, subject || null, category, content_type, pull_livestreams !== false, is_active !== false, channel_id]
          );
          results.push({ channel_id, success: true, action: 'updated' });
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO youtube_channels 
             (channel_id, channel_name, subject, category, content_type, pull_livestreams, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [channel_id, finalChannelName, subject || null, category, content_type, pull_livestreams !== false, is_active !== false]
          );
          results.push({ channel_id, success: true, action: 'created' });
        }
      } catch (error) {
        console.error(`Error processing channel ${channel_id}:`, error);
        results.push({ channel_id, success: false, error: error.message });
      }
    }

    res.json({ 
      success: true, 
      results,
      message: `Processed ${channels.length} channels` 
    });
  } catch (error) {
    console.error('Error saving YouTube channels:', error);
    res.status(500).json({ error: 'Failed to save YouTube channels', message: error.message });
  }
});

// Delete a YouTube channel
router.delete('/youtube-channels/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM youtube_channels WHERE id = $1', [id]);
    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    console.error('Error deleting YouTube channel:', error);
    res.status(500).json({ error: 'Failed to delete channel', message: error.message });
  }
});

module.exports = router;

