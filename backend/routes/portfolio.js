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

// Get user's portfolio
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.symbol, ai.name, ai.type, ai.exchange, ai.logo_url, p.shares_owned, p.avg_share_price, p.updated_at
       FROM portfolio p
       LEFT JOIN asset_info ai ON p.symbol = ai.symbol
       WHERE p.user_id = $1
       ORDER BY p.updated_at DESC`,
      [req.userId]
    );

    // Fetch current prices for portfolio items
    const items = await Promise.all(
      result.rows.map(async (row) => {
        try {
          const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
          
          let currentPrice = 0;
          let change = 0;
          let changePercent = 0;

          if (USE_MOCK_DATA) {
            // Use mock data
            const mockData = require('../services/utils/mockData');
            const priceData = mockData.getCurrentPrice(row.symbol);
            currentPrice = priceData.price;
            change = priceData.change;
            changePercent = priceData.changePercent;
          } else if (process.env.POLYGON_API_KEY) {
            const axios = require('axios');
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
              currentPrice = data.c;
              change = currentPrice - previousClose;
              changePercent = previousClose !== 0 ? ((change / previousClose) * 100) : 0;
            }
          }

          const sharesOwned = parseFloat(row.shares_owned) || 0;
          const avgSharePrice = parseFloat(row.avg_share_price) || 0;
          const totalMarketValue = currentPrice * sharesOwned;
          const totalCost = avgSharePrice * sharesOwned;
          const profitLoss = totalMarketValue - totalCost;
          const profitLossPercent = totalCost !== 0 ? ((profitLoss / totalCost) * 100) : 0;

          return {
            symbol: row.symbol,
            name: row.name || row.symbol,
            type: row.type,
            exchange: row.exchange,
            logoUrl: row.logo_url || null,
            sharesOwned: sharesOwned,
            avgSharePrice: avgSharePrice,
            currentPrice: currentPrice,
            change: change,
            changePercent: changePercent,
            totalMarketValue: totalMarketValue,
            totalCost: totalCost,
            profitLoss: profitLoss,
            profitLossPercent: profitLossPercent,
            updatedAt: row.updated_at,
          };
        } catch (error) {
          console.error(`Error fetching price for ${row.symbol}:`, error.message);
          
          const sharesOwned = parseFloat(row.shares_owned) || 0;
          const avgSharePrice = parseFloat(row.avg_share_price) || 0;
          const totalCost = avgSharePrice * sharesOwned;

          return {
            symbol: row.symbol,
            name: row.name || row.symbol,
            type: row.type,
            exchange: row.exchange,
            logoUrl: row.logo_url || null,
            sharesOwned: sharesOwned,
            avgSharePrice: avgSharePrice,
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            totalMarketValue: 0,
            totalCost: totalCost,
            profitLoss: -totalCost,
            profitLossPercent: -100,
            updatedAt: row.updated_at,
          };
        }
      })
    );

    res.json({ items });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Add or update portfolio item
router.post('/', verifyToken, async (req, res) => {
  try {
    const { symbol, sharesOwned, avgSharePrice } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const shares = parseFloat(sharesOwned) || 0;
    const avgPrice = parseFloat(avgSharePrice) || 0;

    // Check if record exists first
    const existing = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol]
    );

    if (existing.rows.length > 0) {
      // Update existing record - update both old and new columns for compatibility
      await pool.query(
        `UPDATE portfolio 
         SET shares_owned = $1, avg_share_price = $2, 
             quantity = COALESCE(quantity, $1), purchase_price = COALESCE(purchase_price, $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND symbol = $4`,
        [shares, avgPrice, req.userId, symbol]
      );
    } else {
      // Insert new record - include old columns if they exist, use new column values
      // Use NULL for purchase_date if it exists (now nullable)
      await pool.query(
        `INSERT INTO portfolio (user_id, symbol, shares_owned, avg_share_price, quantity, purchase_price, purchase_date, updated_at)
         VALUES ($1, $2, $3, $4, $3, $4, NULL, CURRENT_TIMESTAMP)`,
        [req.userId, symbol, shares, avgPrice]
      );
    }

    res.json({ message: 'Portfolio updated successfully' });
  } catch (error) {
    console.error('Add/Update portfolio error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update portfolio item
router.put('/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { sharesOwned, avgSharePrice } = req.body;

    const shares = parseFloat(sharesOwned) || 0;
    const avgPrice = parseFloat(avgSharePrice) || 0;

    const result = await pool.query(
      `UPDATE portfolio 
       SET shares_owned = $1, avg_share_price = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3 AND symbol = $4
       RETURNING *`,
      [shares, avgPrice, req.userId, symbol]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    res.json({ message: 'Portfolio updated successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Remove from portfolio
router.delete('/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;

    await pool.query(
      'DELETE FROM portfolio WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol]
    );

    res.json({ message: 'Removed from portfolio' });
  } catch (error) {
    console.error('Remove from portfolio error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Check if symbol is in portfolio
router.get('/check/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;

    const result = await pool.query(
      'SELECT shares_owned, avg_share_price FROM portfolio WHERE user_id = $1 AND symbol = $2',
      [req.userId, symbol]
    );

    if (result.rows.length === 0) {
      return res.json({ inPortfolio: false });
    }

    res.json({
      inPortfolio: true,
      sharesOwned: parseFloat(result.rows[0].shares_owned) || 0,
      avgSharePrice: parseFloat(result.rows[0].avg_share_price) || 0,
    });
  } catch (error) {
    console.error('Check portfolio error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get portfolio summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const holdings = await pool.query(
      'SELECT symbol, shares_owned, avg_share_price FROM portfolio WHERE user_id = $1',
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
    const mockData = USE_MOCK_DATA ? require('../services/utils/mockData') : null;

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
          const shares = parseFloat(holding.shares_owned) || 0;
          const value = currentPrice * shares;
          const cost = parseFloat(holding.avg_share_price) * shares;
          
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
            todayChange += priceChange * shares;
          } else if (USE_MOCK_DATA) {
            // For mock data, calculate a small change
            const priceData = mockData.getCurrentPrice(holding.symbol);
            todayChange += priceData.change * shares;
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

// Get portfolio performance history
router.get('/performance', verifyToken, async (req, res) => {
  try {
    const { timeRange = '1Y', symbols } = req.query;
    
    // Get user's portfolio holdings
    const holdingsResult = await pool.query(
      'SELECT symbol, shares_owned, avg_share_price FROM portfolio WHERE user_id = $1',
      [req.userId]
    );

    if (holdingsResult.rows.length === 0) {
      return res.json({ data: [] });
    }

    // Filter by symbols if provided
    let holdings = holdingsResult.rows;
    if (symbols && symbols !== 'all') {
      const symbolList = symbols.split(',').map(s => s.trim());
      holdings = holdings.filter(h => symbolList.includes(h.symbol));
    }

    if (holdings.length === 0) {
      return res.json({ data: [] });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    const daysMap = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 1825, // Max 5 years for now
    };
    const days = daysMap[timeRange] || 365;
    startDate.setDate(startDate.getDate() - days);

    const symbolList = holdings.map(h => h.symbol);
    
    // Get all historical data for all symbols at once (more efficient)
    const historicalDataResult = await pool.query(
      `SELECT symbol, date, close 
       FROM asset_data 
       WHERE symbol = ANY($1) 
         AND date >= $2 
         AND date <= $3 
       ORDER BY symbol, date ASC`,
      [symbolList, startDate.toISOString().split('T')[0], now.toISOString().split('T')[0]]
    );

    // Organize data by symbol and date for quick lookup
    const priceMap = {};
    for (const row of historicalDataResult.rows) {
      if (!priceMap[row.symbol]) {
        priceMap[row.symbol] = {};
      }
      priceMap[row.symbol][row.date.toISOString().split('T')[0]] = parseFloat(row.close);
    }

    // Get all unique dates
    const allDates = new Set();
    for (const symbol of symbolList) {
      if (priceMap[symbol]) {
        Object.keys(priceMap[symbol]).forEach(date => allDates.add(date));
      }
    }
    const dates = Array.from(allDates).sort();

    // Calculate total cost once
    let totalCost = 0;
    const holdingMap = {};
    for (const holding of holdings) {
      const shares = parseFloat(holding.shares_owned) || 0;
      const avgPrice = parseFloat(holding.avg_share_price) || 0;
      const cost = shares * avgPrice;
      totalCost += cost;
      holdingMap[holding.symbol] = { shares, avgPrice, cost };
    }

    // For each date, calculate total portfolio value
    const performanceData = [];
    const lastKnownPrice = {}; // Track last known price for each symbol

    for (const date of dates) {
      let totalValue = 0;
      const positionValues = {};

      for (const holding of holdings) {
        const { shares, cost } = holdingMap[holding.symbol];
        let price = null;

        // Try to get price for this date
        if (priceMap[holding.symbol] && priceMap[holding.symbol][date]) {
          price = priceMap[holding.symbol][date];
          lastKnownPrice[holding.symbol] = price;
        } else if (lastKnownPrice[holding.symbol]) {
          // Use last known price if no price for this date
          price = lastKnownPrice[holding.symbol];
        }

        if (price !== null) {
          const value = price * shares;
          totalValue += value;
          positionValues[holding.symbol] = value;
        }
      }

      const profitLoss = totalValue - totalCost;
      const profitLossPercent = totalCost !== 0 ? ((profitLoss / totalCost) * 100) : 0;

      performanceData.push({
        date: date,
        totalValue: totalValue,
        totalCost: totalCost,
        profitLoss: profitLoss,
        profitLossPercent: profitLossPercent,
        positions: positionValues,
      });
    }

    res.json({ data: performanceData });
  } catch (error) {
    console.error('Portfolio performance error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
