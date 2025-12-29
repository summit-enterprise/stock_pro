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

// Get portfolio summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const holdings = await pool.query(
      'SELECT symbol, quantity, purchase_price FROM portfolio WHERE user_id = $1',
      [req.userId]
    );

    if (holdings.rows.length === 0) {
      return res.json(null);
    }

    const axios = require('axios');
    let totalValue = 0;
    let totalCost = 0;
    let todayChange = 0;

    const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
    const mockData = USE_MOCK_DATA ? require('../services/mockData') : null;

    for (const holding of holdings.rows) {
      try {
        let currentPrice = 0;
        
        if (USE_MOCK_DATA) {
          // Use mock data
          const priceData = mockData.getCurrentPrice(holding.symbol);
          currentPrice = priceData.price;
        } else if (process.env.POLYGON_API_KEY) {
          const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${holding.symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`;
          const response = await axios.get(prevUrl, { timeout: 5000 });
          
          if (response.data && response.data.results && response.data.results.length > 0) {
            currentPrice = response.data.results[0].c;
          }
        }

        if (currentPrice > 0) {
          const value = currentPrice * parseFloat(holding.quantity);
          const cost = parseFloat(holding.purchase_price) * parseFloat(holding.quantity);
          
          totalValue += value;
          totalCost += cost;

          // Get yesterday's close for today's change
          const dbResult = await pool.query(
            'SELECT close FROM asset_data WHERE symbol = $1 ORDER BY date DESC LIMIT 1',
            [holding.symbol]
          );
          
          if (dbResult.rows[0]) {
            const yesterdayClose = dbResult.rows[0].close;
            const priceChange = currentPrice - yesterdayClose;
            todayChange += priceChange * parseFloat(holding.quantity);
          } else if (USE_MOCK_DATA) {
            // For mock data, calculate a small change
            const priceData = mockData.getCurrentPrice(holding.symbol);
            todayChange += priceData.change * parseFloat(holding.quantity);
          }
        }
      } catch (error) {
        console.error(`Error fetching price for ${holding.symbol}:`, error.message);
      }
    }

    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost !== 0 ? ((totalGain / totalCost) * 100) : 0;
    const todayChangePercent = totalValue !== 0 ? ((todayChange / totalValue) * 100) : 0;

    res.json({
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      todayChange,
      todayChangePercent,
      holdings: holdings.rows.length,
    });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

