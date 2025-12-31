const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Generate unique ticket number
function generateTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

// Create a new support ticket
router.post('/tickets', verifyToken, async (req, res) => {
  try {
    const { category, subject, description, priority } = req.body;
    const userId = req.userId;

    if (!category || !subject || !description) {
      return res.status(400).json({ error: 'Category, subject, and description are required' });
    }

    const ticketNumber = generateTicketNumber();
    const validPriorities = ['unknown', 'low', 'medium', 'high', 'urgent'];
    const validCategories = ['bug', 'feature', 'technical', 'account', 'billing', 'data', 'api', 'other'];
    
    // Default to 'unknown' if no priority provided or invalid priority
    const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'unknown';
    const ticketCategory = validCategories.includes(category) ? category : 'other';

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, ticket_number, category, subject, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [userId, ticketNumber, ticketCategory, subject, description, ticketPriority]
    );

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get user's own tickets
router.get('/tickets', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, category, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id, ticket_number, category, subject, description, priority, status,
        created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      tickets: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get a specific ticket
router.get('/tickets/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        id, ticket_number, category, subject, description, priority, status,
        created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: result.rows[0] });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get all tickets with search and filters
router.get('/admin/tickets', requireAdmin, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      search, 
      assigned_to,
      page = 1,
      limit = 25,
      offset 
    } = req.query;
    
    // Calculate offset from page if not provided
    const calculatedOffset = offset !== undefined ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        st.id,
        st.ticket_number,
        st.category,
        st.subject,
        st.description,
        st.priority,
        st.status,
        st.assigned_to,
        st.created_at,
        st.updated_at,
        st.resolved_at,
        u.email as user_email,
        u.name as user_name,
        a.email as assigned_email,
        a.name as assigned_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN users a ON st.assigned_to = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND st.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND st.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (priority) {
      query += ` AND st.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (assigned_to) {
      query += ` AND st.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        st.ticket_number ILIKE $${paramIndex} OR
        st.subject ILIKE $${paramIndex} OR
        st.description ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
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

    query += ` ORDER BY st.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), calculatedOffset);

    const result = await pool.query(query, params);

    res.json({
      tickets: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      offset: calculatedOffset,
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Update ticket status/assignment
router.patch('/admin/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      if (status === 'resolved' || status === 'closed') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`resolved_at = NULL`);
      }
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      params.push(assigned_to || null);
      paramIndex++;
    }

    if (priority) {
      // Validate priority
      const validPriorities = ['unknown', 'low', 'medium', 'high', 'urgent'];
      if (validPriorities.includes(priority)) {
        updates.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE support_tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: result.rows[0] });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get ticket statistics
router.get('/admin/tickets/stats', requireAdmin, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY status
    `);

    const categoryResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY category
    `);

    const priorityResult = await pool.query(`
      SELECT 
        priority,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY priority
    `);

    const totalResult = await pool.query(`
      SELECT COUNT(*) as total FROM support_tickets
    `);

    res.json({
      byStatus: statsResult.rows,
      byCategory: categoryResult.rows,
      byPriority: priorityResult.rows,
      total: parseInt(totalResult.rows[0].total),
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Get ticket analytics for charts
router.get('/admin/tickets/analytics', requireAdmin, async (req, res) => {
  try {
    const { 
      timeRange = '30d', // 7d, 30d, 90d, 180d, 1y, all
      groupBy = 'day', // day, week, month
      metric = 'count', // count, completion_rate, avg_resolution_time
      filterBy = 'all' // all, status, category, priority
    } = req.query;

    // Calculate date range
    let dateFilter = '';
    const params = [];
    let paramIndex = 1;

    if (timeRange !== 'all') {
      const daysMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '180d': 180,
        '1y': 365
      };
      const days = daysMap[timeRange] || 30;
      dateFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'`;
    }

    // Determine grouping interval
    let dateTrunc = 'day';
    if (groupBy === 'week') {
      dateTrunc = 'week';
    } else if (groupBy === 'month') {
      dateTrunc = 'month';
    }

    // Build query based on metric and filter
    let query = '';
    
    // Validate inputs
    const validMetrics = ['count', 'completion_rate', 'avg_resolution_time'];
    const validFilters = ['all', 'status', 'category', 'priority'];
    const validGroupBy = ['day', 'week', 'month'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric', validMetrics });
    }
    if (!validFilters.includes(filterBy)) {
      return res.status(400).json({ error: 'Invalid filterBy', validFilters });
    }
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({ error: 'Invalid groupBy', validGroupBy });
    }
    
    if (metric === 'count') {
      // Count tickets by time period
      if (filterBy === 'status') {
        query = `
          SELECT 
            DATE_TRUNC('${dateTrunc}', created_at) as period,
            status,
            COUNT(*) as count
          FROM support_tickets
          ${dateFilter}
          GROUP BY DATE_TRUNC('${dateTrunc}', created_at), status
          ORDER BY period ASC, status ASC
        `;
      } else if (filterBy === 'category') {
        query = `
          SELECT 
            DATE_TRUNC('${dateTrunc}', created_at) as period,
            category,
            COUNT(*) as count
          FROM support_tickets
          ${dateFilter}
          GROUP BY DATE_TRUNC('${dateTrunc}', created_at), category
          ORDER BY period ASC, category ASC
        `;
      } else if (filterBy === 'priority') {
        query = `
          SELECT 
            DATE_TRUNC('${dateTrunc}', created_at) as period,
            priority,
            COUNT(*) as count
          FROM support_tickets
          ${dateFilter}
          GROUP BY DATE_TRUNC('${dateTrunc}', created_at), priority
          ORDER BY period ASC, priority ASC
        `;
      } else {
        // All tickets
        query = `
          SELECT 
            DATE_TRUNC('${dateTrunc}', created_at) as period,
            COUNT(*) as count
          FROM support_tickets
          ${dateFilter}
          GROUP BY DATE_TRUNC('${dateTrunc}', created_at)
          ORDER BY period ASC
        `;
      }
    } else if (metric === 'completion_rate') {
      // Completion rate (resolved + closed) / total
      query = `
        SELECT 
          DATE_TRUNC('${dateTrunc}', created_at) as period,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as completed,
          COUNT(*) as total,
          ROUND(
            (COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::numeric / 
             NULLIF(COUNT(*), 0)) * 100, 
            2
          ) as completion_rate
        FROM support_tickets
        ${dateFilter}
        GROUP BY DATE_TRUNC('${dateTrunc}', created_at)
        ORDER BY period ASC
      `;
    } else if (metric === 'avg_resolution_time') {
      // Average resolution time in hours
      // Combine dateFilter with resolved_at check
      const resolvedFilter = dateFilter 
        ? `${dateFilter} AND resolved_at IS NOT NULL`
        : 'WHERE resolved_at IS NOT NULL';
      
      query = `
        SELECT 
          DATE_TRUNC('${dateTrunc}', created_at) as period,
          COUNT(*) as count,
          ROUND(
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric,
            2
          ) as avg_resolution_hours
        FROM support_tickets
        ${resolvedFilter}
        GROUP BY DATE_TRUNC('${dateTrunc}', created_at)
        ORDER BY period ASC
      `;
    }

    if (!query) {
      return res.status(400).json({ error: 'Invalid metric or filter combination' });
    }

    const result = await pool.query(query, params);

    // Format dates for frontend
    const formattedData = result.rows.map(row => {
      try {
        // Handle period date formatting - PostgreSQL returns Date objects
        let periodStr;
        if (row.period) {
          if (row.period instanceof Date) {
            periodStr = row.period.toISOString().split('T')[0];
          } else if (typeof row.period === 'string') {
            // If it's already a string, try to parse and format
            const date = new Date(row.period);
            if (!isNaN(date.getTime())) {
              periodStr = date.toISOString().split('T')[0];
            } else {
              periodStr = row.period.split('T')[0]; // Fallback to string manipulation
            }
          } else {
            // Try to convert to Date
            const date = new Date(row.period);
            periodStr = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : String(row.period);
          }
        } else {
          periodStr = null;
        }
        
        return {
          ...row,
          period: periodStr,
        };
      } catch (dateError) {
        console.warn('Error formatting date for row:', row, dateError);
        // Fallback: try to extract date from string representation
        const periodStr = row.period ? String(row.period).split('T')[0].split(' ')[0] : null;
        return {
          ...row,
          period: periodStr,
        };
      }
    });

    res.json({
      data: formattedData,
      timeRange,
      groupBy,
      metric,
      filterBy
    });
  } catch (error) {
    console.error('Error fetching ticket analytics:', error);
    console.error('Query was:', query);
    console.error('Params were:', params);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: process.env.NODE_ENV === 'local' ? error.stack : undefined
    });
  }
});

// Admin: Get ticket replies
router.get('/admin/tickets/:id/replies', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        tr.id,
        tr.ticket_id,
        tr.user_id,
        tr.is_admin,
        tr.message,
        tr.created_at,
        u.email as user_email,
        u.name as user_name
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.ticket_id = $1
      ORDER BY tr.created_at ASC`,
      [id]
    );

    res.json({ replies: result.rows });
  } catch (error) {
    console.error('Error fetching ticket replies:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Admin: Add reply to ticket
router.post('/admin/tickets/:id/replies', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const adminId = req.userId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify ticket exists
    const ticketResult = await pool.query(
      'SELECT id FROM support_tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get admin status
    const userResult = await pool.query(
      'SELECT is_admin, is_superuser FROM users WHERE id = $1',
      [adminId]
    );

    const isAdmin = userResult.rows[0]?.is_admin || userResult.rows[0]?.is_superuser || false;

    // Add reply
    const replyResult = await pool.query(
      `INSERT INTO ticket_replies (ticket_id, user_id, is_admin, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, adminId, isAdmin, message.trim()]
    );

    // Update ticket updated_at timestamp
    await pool.query(
      'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Get reply with user info
    const fullReplyResult = await pool.query(
      `SELECT 
        tr.id,
        tr.ticket_id,
        tr.user_id,
        tr.is_admin,
        tr.message,
        tr.created_at,
        u.email as user_email,
        u.name as user_name
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1`,
      [replyResult.rows[0].id]
    );

    res.status(201).json({ reply: fullReplyResult.rows[0] });
  } catch (error) {
    console.error('Error adding ticket reply:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

