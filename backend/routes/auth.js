const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const { sendPasswordResetEmail } = require('../services/general/emailService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register new user (custom auth)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, auth_type, google_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // If account exists with Google auth, tell them to use Google login
      if (user.auth_type === 'google' || user.google_id) {
        return res.status(409).json({ 
          error: 'An account with this email already exists via Google. Please use Google login instead.' 
        });
      }
      
      // If account exists with custom auth, they should login instead
      return res.status(409).json({ 
        error: 'An account with this email already exists. Please login instead.' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, auth_type, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, auth_type, created_at',
      [email, passwordHash, 'custom', name || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        auth_type: user.auth_type
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Login (custom auth)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email (check all auth types)
    const result = await pool.query(
      'SELECT id, email, password_hash, name, auth_type, google_id, is_admin, is_superuser, is_banned, is_restricted, ban_reason FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user signed up with Google only (no password)
    if ((user.auth_type === 'google' || user.google_id) && !user.password_hash) {
      return res.status(401).json({ 
        error: 'This account was created with Google. Please use Google login instead.' 
      });
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
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        auth_type: user.auth_type,
        is_admin: user.is_admin || false,
        is_superuser: user.is_superuser || false,
        is_banned: user.is_banned || false,
        is_restricted: user.is_restricted || false,
        ban_reason: user.ban_reason || null
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Get default avatar URL
 * Returns a placeholder avatar URL that can be used when OAuth provider has no picture
 */
function getDefaultAvatarUrl() {
  // Return null to use the default avatar component in the frontend
  // Or return a URL to a default avatar image if you have one hosted
  return null;
}

/**
 * Process OAuth avatar URL
 * Downloads OAuth provider avatars and uploads them to GCP
 * @param {string} picture - Avatar URL from OAuth provider
 * @param {number} userId - User ID
 * @param {string} provider - OAuth provider name ('google', 'apple', 'meta', 'x')
 * @returns {Promise<string|null>} - GCP avatar URL or default avatar
 */
async function processOAuthAvatar(picture, userId, provider = 'google') {
  if (!picture) {
    return getDefaultAvatarUrl();
  }

  try {
    const { imageService } = require('../services');
    const axios = require('axios');
    const path = require('path');
    const fs = require('fs').promises;
    const sharp = require('sharp');

    // Download the avatar from OAuth provider
    console.log(`📥 Downloading ${provider} avatar for user ${userId}...`);
    const response = await axios.get(picture, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    if (!response.data || !response.headers['content-type']?.includes('image')) {
      console.warn(`⚠️  Invalid image response from ${provider} for user ${userId}`);
      return getDefaultAvatarUrl();
    }

    // Create temp file
    const tempDir = path.join(__dirname, '../temp/oauth_avatars');
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `${userId}_${provider}_${Date.now()}.jpg`);

    // Save to temp file
    await fs.writeFile(tempPath, response.data);

    // Process and upload to GCP
    const result = await imageService.processAndUploadAvatar(tempPath, userId, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 85,
    });

    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp OAuth avatar:', cleanupError.message);
    }

    console.log(`✅ ${provider} avatar uploaded to GCP for user ${userId}`);
    return result.publicUrl;

  } catch (error) {
    console.error(`❌ Error processing ${provider} avatar for user ${userId}:`, error.message);
    // Fallback to original URL if download/upload fails
    return picture;
  }
}

// Register/Login with Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }

    // Process OAuth avatar (download and upload to GCP)
    // We'll get the user ID after checking if they exist, so we'll process it later
    let avatarUrl = null;

    // Check if user exists with this Google ID
    let result = await pool.query(
      'SELECT id, email, name, auth_type, password_hash, is_admin, is_superuser, is_banned, is_restricted, ban_reason, avatar_url FROM users WHERE google_id = $1',
      [googleId]
    );

    let user;
    let isNewUser = false;

    if (result.rows.length > 0) {
      // User exists with this Google ID - login
      user = result.rows[0];
      
      // Download and upload OAuth avatar to GCP if we have a picture
      if (picture) {
        avatarUrl = await processOAuthAvatar(picture, user.id, 'google');
        
        // Update avatar if it's different
        if (avatarUrl && avatarUrl !== user.avatar_url) {
          await pool.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, user.id]
          );
          user.avatar_url = avatarUrl;
        }
      }
    } else {
      // Check if email exists (to link accounts or handle existing user)
      const emailCheck = await pool.query(
        'SELECT id, email, name, auth_type, password_hash, google_id, is_admin, is_superuser, is_banned, is_restricted, ban_reason, avatar_url FROM users WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        // Email exists - link the accounts
        const existingUser = emailCheck.rows[0];
        
        // Download and upload OAuth avatar to GCP if we have a picture
        if (picture) {
          avatarUrl = await processOAuthAvatar(picture, existingUser.id, 'google');
        }
        
        // Use OAuth avatar if available, otherwise keep existing avatar
        const finalAvatarUrl = avatarUrl || existingUser.avatar_url;
        
        // If existing user already has a different google_id, update it
        // Otherwise, link the Google account to the existing account
        result = await pool.query(
          `UPDATE users 
           SET google_id = $1, 
               auth_type = CASE 
                 WHEN password_hash IS NOT NULL THEN 'both' 
                 ELSE 'google' 
               END,
               name = COALESCE($2, name),
               avatar_url = COALESCE($3, avatar_url),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 
           RETURNING id, email, name, auth_type, is_admin, is_superuser, avatar_url`,
          [googleId, name || null, finalAvatarUrl, existingUser.id]
        );
        
        user = result.rows[0];
        // Preserve admin/superuser and ban status from existing user
        user.is_admin = existingUser.is_admin || false;
        user.is_superuser = existingUser.is_superuser || false;
        user.is_banned = existingUser.is_banned || false;
        user.is_restricted = existingUser.is_restricted || false;
        user.ban_reason = existingUser.ban_reason || null;
        console.log(`Linked Google account to existing account for email: ${email} (is_admin: ${user.is_admin}, is_superuser: ${user.is_superuser})`);
      } else {
        // Create new user with Google auth
        // First insert user, then process avatar (we need the user ID)
        result = await pool.query(
          'INSERT INTO users (email, google_id, auth_type, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, auth_type, is_admin, is_superuser, avatar_url, created_at',
          [email, googleId, 'google', name || null]
        );
        user = result.rows[0];
        isNewUser = true;
        
        // Download and upload OAuth avatar to GCP if we have a picture
        if (picture) {
          avatarUrl = await processOAuthAvatar(picture, user.id, 'google');
          
          // Update user with GCP avatar URL
          if (avatarUrl) {
            await pool.query(
              'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [avatarUrl, user.id]
            );
            user.avatar_url = avatarUrl;
          }
        }
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: isNewUser ? 'Registration successful' : 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        auth_type: user.auth_type,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin || false,
        is_superuser: user.is_superuser || false
      },
      token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Forgot password - send temporary password via email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, email, name, auth_type, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset email has been sent.' 
      });
    }

    const user = result.rows[0];

    // Check if user has custom auth (can reset password)
    if (user.auth_type === 'google' && !user.password_hash) {
      return res.status(400).json({ 
        error: 'Password cannot be reset for Google-authenticated accounts. Please use Google login.' 
      });
    }

    // Generate temporary password (8 characters, alphanumeric)
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Hash the temporary password
    const saltRounds = 10;
    const tempPasswordHash = await bcrypt.hash(tempPassword, saltRounds);

    // Update user's password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [tempPasswordHash, user.id]
    );

    // Log temporary password for local/mock mode (when EMAIL_PASSWORD is not set)
    const EMAIL_PASS = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    if (!EMAIL_PASS) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🔑 PASSWORD RESET - TEMPORARY PASSWORD (MOCK MODE)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔐 Temporary Password: ${tempPassword}`);
      console.log(`🌐 Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/?email=${encodeURIComponent(user.email)}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Send email with temporary password
    try {
      const emailResult = await sendPasswordResetEmail(user.email, user.name, tempPassword);
      console.log(`✅ Password reset email sent successfully to ${user.email}:`, emailResult);
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
      });
      // Still return success to not reveal if email exists, but log the error
      // In production, you might want to queue this for retry
    }

    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset email has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

