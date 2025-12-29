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

// Check if symbol is in watchlist
router.get('/check/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await pool.query(
      'SELECT symbol FROM watchlist WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol]
    );
    res.json({ inWatchlist: result.rows.length > 0 });
  } catch (error) {
    console.error('Check watchlist error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get user's watchlist
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.symbol, ai.name, ai.type, ai.category, ai.exchange, w.added_at
       FROM watchlist w
       LEFT JOIN asset_info ai ON w.symbol = ai.symbol
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [req.userId]
    );

    // Fetch current prices for watchlist items
    const items = await Promise.all(
      result.rows.map(async (row) => {
        try {
          const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
          
          if (USE_MOCK_DATA) {
            // Use mock data
            const mockData = require('../services/mockData');
            const priceData = mockData.getCurrentPrice(row.symbol);
            return {
              symbol: row.symbol,
              name: row.name || row.symbol,
              category: row.category,
              price: priceData.price,
              change: priceData.change,
              changePercent: priceData.changePercent,
            };
          }

          const axios = require('axios');
          if (!process.env.POLYGON_API_KEY) {
            return {
              symbol: row.symbol,
              name: row.name || row.symbol,
              category: row.category,
              price: 0,
              change: 0,
              changePercent: 0,
            };
          }

          const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${row.symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`;
          const response = await axios.get(prevUrl, { timeout: 5000 });
          
          if (response.data && response.data.results && response.data.results.length > 0) {
            const data = response.data.results[0];
            // Get previous close for change calculation
            const dbResult = await pool.query(
              'SELECT close FROM asset_data WHERE symbol = $1 ORDER BY date DESC LIMIT 1',
              [row.symbol]
            );
            
            const previousClose = dbResult.rows[0]?.close || data.c;
            const currentPrice = data.c;
            const change = currentPrice - previousClose;
            const changePercent = previousClose !== 0 ? ((change / previousClose) * 100) : 0;

            return {
              symbol: row.symbol,
              name: row.name || row.symbol,
              category: row.category,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
            };
          }
        } catch (error) {
          console.error(`Error fetching price for ${row.symbol}:`, error.message);
        }

        return {
          symbol: row.symbol,
          name: row.name || row.symbol,
          category: row.category,
          price: 0,
          change: 0,
          changePercent: 0,
        };
      })
    );

    res.json({ items });
  } catch (error) {
    console.error('Watchlist error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Add to watchlist
router.post('/', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    await pool.query(
      'INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2) ON CONFLICT (user_id, symbol) DO NOTHING',
      [req.userId, symbol]
    );

    res.json({ message: 'Added to watchlist' });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Remove from watchlist
router.delete('/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;

    await pool.query(
      'DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol]
    );

    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

