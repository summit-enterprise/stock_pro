const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

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
      'SELECT id, email, password_hash, name, auth_type, google_id, is_admin, is_superuser FROM users WHERE email = $1',
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
        is_superuser: user.is_superuser || false
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Register/Login with Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, name } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }

    // Check if user exists with this Google ID
    let result = await pool.query(
      'SELECT id, email, name, auth_type, password_hash, is_admin, is_superuser FROM users WHERE google_id = $1',
      [googleId]
    );

    let user;
    let isNewUser = false;

    if (result.rows.length > 0) {
      // User exists with this Google ID - login
      user = result.rows[0];
    } else {
      // Check if email exists (to link accounts or handle existing user)
      const emailCheck = await pool.query(
        'SELECT id, email, name, auth_type, password_hash, google_id, is_admin, is_superuser FROM users WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        // Email exists - link the accounts
        const existingUser = emailCheck.rows[0];
        
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
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 
           RETURNING id, email, name, auth_type, is_admin, is_superuser`,
          [googleId, name || null, existingUser.id]
        );
        
        user = result.rows[0];
        // Preserve admin/superuser status from existing user
        user.is_admin = existingUser.is_admin || false;
        user.is_superuser = existingUser.is_superuser || false;
        console.log(`Linked Google account to existing account for email: ${email} (is_admin: ${user.is_admin}, is_superuser: ${user.is_superuser})`);
      } else {
        // Create new user with Google auth
        result = await pool.query(
          'INSERT INTO users (email, google_id, auth_type, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name, auth_type, is_admin, is_superuser, created_at',
          [email, googleId, 'google', name || null]
        );
        user = result.rows[0];
        isNewUser = true;
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

module.exports = router;

