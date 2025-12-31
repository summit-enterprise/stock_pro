const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    let userId = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
      } catch (e) {
        // Token invalid or expired, continue without user_id
      }
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (user_id, name, email, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, 'new')
       RETURNING *`,
      [userId, name, email, subject, message]
    );

    res.status(201).json({
      message: 'Contact message sent successfully',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get all contact messages
router.get('/admin/messages', requireAdmin, async (req, res) => {
  try {
    const { 
      status, 
      search, 
      page = 1,
      limit = 25,
      offset 
    } = req.query;
    
    // Calculate offset from page if not provided
    const calculatedOffset = offset !== undefined ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        cm.id,
        cm.name,
        cm.email,
        cm.subject,
        cm.message,
        cm.status,
        cm.created_at,
        cm.updated_at,
        u.email as user_email,
        u.name as user_name
      FROM contact_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND cm.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        cm.name ILIKE $${paramIndex} OR
        cm.email ILIKE $${paramIndex} OR
        cm.subject ILIKE $${paramIndex} OR
        cm.message ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    ).replace(/ORDER BY[\s\S]*$/, '');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    query += ` ORDER BY cm.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), calculatedOffset);

    const result = await pool.query(query, params);

    res.json({
      messages: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      offset: calculatedOffset,
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Update message status
router.patch('/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['new', 'read', 'replied', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE contact_messages
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get contact message statistics
router.get('/admin/messages/stats', requireAdmin, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM contact_messages
      GROUP BY status
    `);

    const totalResult = await pool.query(`
      SELECT COUNT(*) as total FROM contact_messages
    `);

    res.json({
      byStatus: statsResult.rows,
      total: parseInt(totalResult.rows[0].total),
    });
  } catch (error) {
    console.error('Error fetching contact message stats:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get contact message replies
router.get('/admin/messages/:id/replies', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        cr.id,
        cr.contact_message_id,
        cr.user_id,
        cr.is_admin,
        cr.message,
        cr.created_at,
        u.email as user_email,
        u.name as user_name
      FROM contact_replies cr
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE cr.contact_message_id = $1
      ORDER BY cr.created_at ASC`,
      [id]
    );

    res.json({ replies: result.rows });
  } catch (error) {
    console.error('Error fetching contact message replies:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Add reply to contact message
router.post('/admin/messages/:id/replies', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify contact message exists
    const messageResult = await pool.query(
      'SELECT id FROM contact_messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    // Get admin status
    const userResult = await pool.query(
      'SELECT is_admin, is_superuser FROM users WHERE id = $1',
      [adminId]
    );

    const isAdmin = userResult.rows[0]?.is_admin || userResult.rows[0]?.is_superuser || false;

    // Add reply
    const replyResult = await pool.query(
      `INSERT INTO contact_replies (contact_message_id, user_id, is_admin, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, adminId, isAdmin, message.trim()]
    );

    // Update contact message updated_at timestamp
    await pool.query(
      'UPDATE contact_messages SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Get reply with user info
    const fullReplyResult = await pool.query(
      `SELECT 
        cr.id,
        cr.contact_message_id,
        cr.user_id,
        cr.is_admin,
        cr.message,
        cr.created_at,
        u.email as user_email,
        u.name as user_name
      FROM contact_replies cr
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE cr.id = $1`,
      [replyResult.rows[0].id]
    );

    res.status(201).json({ reply: fullReplyResult.rows[0] });
  } catch (error) {
    console.error('Error adding contact message reply:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

