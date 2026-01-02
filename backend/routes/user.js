const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { imageService } = require('../services');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
  dest: path.join(__dirname, '../temp/avatars'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp/avatars');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

/**
 * Normalize avatar URL - converts old mock-storage URLs to new format
 * @param {string} avatarUrl - Original avatar URL
 * @returns {string} Normalized avatar URL
 */
function normalizeAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Convert old mock-storage.example.com URLs
  if (avatarUrl.includes('mock-storage.example.com')) {
    // Extract filename from old URL
    const match = avatarUrl.match(/\/avatars\/(.+)$/);
    if (match) {
      const filename = match[1];
      // Convert .jpg to .webp if needed (old format was .jpg, new is .webp)
      const normalizedFilename = filename.replace(/\.jpg$/, '.webp');
      return `${BACKEND_URL}/api/image/avatar/${normalizedFilename}`;
    }
  }
  
  // Return as-is if already in correct format
  return avatarUrl;
}

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

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  // Note: verifyToken middleware already checks for banned/restricted users
  // but allows access to support routes. This endpoint should still return
  // the ban/restrict status so frontend can handle it appropriately.
  try {
    const result = await pool.query(
      'SELECT id, email, name, username, full_name, avatar_url, auth_type, is_admin, is_superuser, is_banned, is_restricted, ban_reason, banned_at, created_at, updated_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    // Normalize avatar URL
    user.avatar_url = normalizeAvatarUrl(user.avatar_url);

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username, full_name, name } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, username, full_name, avatar_url, auth_type, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Upload avatar
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Validate image
    const validation = await imageService.validateImage(filePath);
    if (!validation.valid) {
      // Clean up temp file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
      }
      return res.status(400).json({ error: validation.error });
    }

    // Process and upload avatar using image service
    const result = await imageService.processAndUploadAvatar(filePath, req.userId, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 85,
    });

    // Clean up temp file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }

    // Update user's avatar_url in database
    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [result.publicUrl, req.userId]
    );

    res.json({
      success: true,
      avatar_url: result.publicUrl,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Clean up temp file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
      }
    }
    
    res.status(500).json({ error: 'Avatar upload failed', message: error.message });
  }
});

// Change password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user's current password hash
    const userResult = await pool.query(
      'SELECT password_hash, auth_type FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user has a password (not Google-only)
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password cannot be changed for Google-authenticated accounts' });
    }

    // Verify current password (required for security)
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.userId]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

