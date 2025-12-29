const express = require('express');
const { pool } = require('../db');
const ratingsService = require('../services/ratingsService');
const router = express.Router();

// Middleware to verify user token (optional for ratings)
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      // Ratings can be public, but we'll still try to get user if available
      req.userId = null;
      return next();
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // Continue without user ID for public access
    req.userId = null;
    next();
  }
};

// Get consensus analyst ratings for a symbol (only for equities)
router.get('/:symbol', verifyToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    const normalizedSymbol = symbol.toUpperCase();

    // Check if asset is an equity - ratings only apply to equities
    try {
      const assetInfoResult = await pool.query(
        `SELECT category FROM asset_info WHERE symbol = $1`,
        [normalizedSymbol]
      );

      if (assetInfoResult.rows.length > 0) {
        const category = assetInfoResult.rows[0].category;
        // Only return ratings for equities
        if (category && category.toLowerCase() !== 'equities') {
          return res.json({
            symbol: normalizedSymbol,
            shortTerm: null,
            longTerm: null,
            consensus: null,
            message: 'Ratings are only available for equities',
          });
        }
      }
    } catch (dbError) {
      console.error(`Error checking asset category for ${normalizedSymbol}:`, dbError.message);
      // Continue - we'll try to fetch anyway
    }

    const redisClient = ratingsService.getRedisClient();
    const cacheKey = `ratings:${normalizedSymbol}`;

    // Try Redis cache first
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          console.log(`Ratings (${normalizedSymbol}): Cache hit (Redis)`);
          return res.json(parsed);
        }
      } catch (redisError) {
        console.warn(`Ratings (${normalizedSymbol}): Redis cache read failed`);
      }
    }

    // Try database
    try {
      const dbResult = await pool.query(
        `SELECT * FROM analyst_ratings WHERE symbol = $1`,
        [normalizedSymbol]
      );

      if (dbResult.rows.length > 0) {
        const row = dbResult.rows[0];
        const ratings = {
          symbol: normalizedSymbol,
          shortTerm: {
            signal: row.short_term_signal,
            strength: row.short_term_strength,
          },
          longTerm: {
            signal: row.long_term_signal,
            strength: row.long_term_strength,
          },
          consensus: {
            rating: row.consensus_rating,
            targetPrice: parseFloat(row.target_price) || 0,
            distribution: {
              strongBuy: row.strong_buy_count || 0,
              buy: row.buy_count || 0,
              hold: row.hold_count || 0,
              sell: row.sell_count || 0,
              strongSell: row.strong_sell_count || 0,
            },
            totalAnalysts: row.total_analysts || 0,
          },
        };

        // Cache in Redis
        if (redisClient && redisClient.isOpen) {
          await redisClient.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(ratings));
        }

        console.log(`Ratings (${normalizedSymbol}): Found in database`);
        return res.json(ratings);
      }
    } catch (dbError) {
      console.error(`Database error for ${normalizedSymbol}:`, dbError.message);
    }

    // Not in cache or database - fetch and store (non-blocking)
    // Return deterministic ratings immediately, fetch real data in background
    const fallbackRatings = ratingsService.generateDeterministicRatings(normalizedSymbol);
    
    // Fetch real ratings in background (don't wait)
    ratingsService.fetchAndStoreRatings(normalizedSymbol).catch(err => {
      console.error(`Background fetch failed for ${normalizedSymbol}:`, err.message);
    });

    res.json(fallbackRatings);
  } catch (error) {
    console.error('Ratings error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Note: Rating generation and processing moved to ratingsService.js

module.exports = router;

