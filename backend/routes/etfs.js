/**
 * ETFs Market Data Routes
 * Provides ETF market data
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getRedisClient } = require('../config/redis');

const CACHE_TTL = 5 * 60; // 5 minutes

/**
 * Get ETFs market data
 * GET /api/etfs/market?limit=250
 */
router.get('/market', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 250;
    const cacheKey = `etfs:market:all:${limit}`;

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return res.json({
            success: true,
            data: JSON.parse(cachedData),
          });
        }
      } catch (redisError) {
        console.warn('ETFs market data: Redis cache read failed');
      }
    }

    // Get most recent date
    const mostRecentDateResult = await pool.query(
      `SELECT MAX(date) as max_date FROM asset_data 
       WHERE symbol NOT LIKE 'X:%' 
       AND symbol NOT LIKE '^%'`
    );

    if (!mostRecentDateResult.rows[0]?.max_date) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const mostRecentDate = mostRecentDateResult.rows[0].max_date;

    // Get previous dates for 1h, 24h, 7d calculations
    // For ETFs, we'll use previous trading days since intraday data may not be available
    const previousDateResult = await pool.query(
      `SELECT date FROM asset_data 
       WHERE date < $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [mostRecentDate]
    );
    const previousDate = previousDateResult.rows[0]?.date || mostRecentDate;

    // Get date 7 days ago (or closest available)
    const sevenDaysAgoResult = await pool.query(
      `SELECT date FROM asset_data 
       WHERE date <= $1 
       ORDER BY date DESC 
       LIMIT 1`,
      [new Date(mostRecentDate.getTime() - 7 * 24 * 60 * 60 * 1000)]
    );
    const sevenDaysAgo = sevenDaysAgoResult.rows[0]?.date || previousDate;

    // For 1h, use previous date (intraday data may not be available)
    const oneHourAgo = previousDate;

    // Fetch ETFs market data with price changes
    const etfsResult = await pool.query(
      `WITH latest_prices AS (
        SELECT DISTINCT ON (symbol)
          symbol,
          close as price,
          volume,
          date
        FROM asset_data
        WHERE date <= $1
          AND symbol NOT LIKE 'X:%'
          AND symbol NOT LIKE '^%'
        ORDER BY symbol, date DESC
      ),
      prev_prices AS (
        SELECT DISTINCT ON (symbol)
          symbol,
          close as price
        FROM asset_data
        WHERE date = $2
          AND symbol NOT LIKE 'X:%'
          AND symbol NOT LIKE '^%'
        ORDER BY symbol, date DESC
      ),
      hour_prices AS (
        SELECT DISTINCT ON (symbol)
          symbol,
          close as price
        FROM asset_data
        WHERE date = $3
          AND symbol NOT LIKE 'X:%'
          AND symbol NOT LIKE '^%'
        ORDER BY symbol, date DESC
      ),
      week_prices AS (
        SELECT DISTINCT ON (symbol)
          symbol,
          close as price
        FROM asset_data
        WHERE date = $4
          AND symbol NOT LIKE 'X:%'
          AND symbol NOT LIKE '^%'
        ORDER BY symbol, date DESC
      )
      SELECT 
        lp.symbol,
        COALESCE(sd.name, ai.name) as name,
        COALESCE(ai.logo_url, '') as logo_url,
        COALESCE(ai.market_cap, 0) as market_cap,
        lp.price,
        lp.volume as volume24h,
        COALESCE(pp.price, lp.price) as prev_price,
        COALESCE(hp.price, lp.price) as hour_price,
        COALESCE(wp.price, lp.price) as week_price,
        CASE 
          WHEN COALESCE(hp.price, lp.price) > 0 
          THEN ((lp.price - COALESCE(hp.price, lp.price)) / COALESCE(hp.price, lp.price)) * 100
          ELSE 0
        END as price_change_1h,
        CASE 
          WHEN COALESCE(pp.price, lp.price) > 0 
          THEN ((lp.price - COALESCE(pp.price, lp.price)) / COALESCE(pp.price, lp.price)) * 100
          ELSE 0
        END as price_change_24h,
        CASE 
          WHEN COALESCE(wp.price, lp.price) > 0 
          THEN ((lp.price - COALESCE(wp.price, lp.price)) / COALESCE(wp.price, lp.price)) * 100
          ELSE 0
        END as price_change_7d,
        ROW_NUMBER() OVER (ORDER BY COALESCE(ai.market_cap, 0) DESC NULLS LAST) as rank
      FROM latest_prices lp
      LEFT JOIN stock_data sd ON lp.symbol = sd.ticker
      LEFT JOIN asset_info ai ON lp.symbol = ai.symbol
      LEFT JOIN prev_prices pp ON lp.symbol = pp.symbol
      LEFT JOIN hour_prices hp ON lp.symbol = hp.symbol
      LEFT JOIN week_prices wp ON lp.symbol = wp.symbol
      WHERE sd.ticker IS NOT NULL
        AND sd.active = true
        AND sd.type IN ('ETF', 'ETP')
        AND lp.symbol NOT LIKE 'X:%'
        AND lp.symbol NOT LIKE '^%'
      ORDER BY COALESCE(ai.market_cap, 0) DESC NULLS LAST
      LIMIT $5`,
      [mostRecentDate, previousDate, oneHourAgo, sevenDaysAgo, limit]
    );

    // Transform data
    const marketData = etfsResult.rows.map(row => ({
      rank: parseInt(row.rank) || 0,
      symbol: row.symbol,
      name: row.name || row.symbol,
      price: parseFloat(row.price) || 0,
      priceChange1h: parseFloat(row.price_change_1h) || 0,
      priceChange24h: parseFloat(row.price_change_24h) || 0,
      priceChange7d: parseFloat(row.price_change_7d) || 0,
      marketCap: parseFloat(row.market_cap) || 0,
      volume24h: parseFloat(row.volume24h) || 0,
      logoUrl: row.logo_url,
      lastUpdated: mostRecentDate.toISOString(),
    }));

    // Cache in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(marketData));
      } catch (redisError) {
        console.warn('Failed to cache ETFs market data in Redis');
      }
    }

    res.json({
      success: true,
      data: marketData,
    });
  } catch (error) {
    console.error('Error fetching ETFs market data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;

