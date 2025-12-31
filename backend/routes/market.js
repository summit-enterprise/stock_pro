const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { mockData } = require('../services');
const { getRedisClient } = require('../config/redis');
const router = express.Router();

// Load mock market movers service if in mock mode
let marketMoversService = null;
if (process.env.USE_MOCK_SERVICES === 'true' || process.env.NODE_ENV === 'local') {
  try {
    marketMoversService = require('../mockservices/general/marketMoversService');
  } catch (error) {
    console.warn('Mock market movers service not found, using fallback');
  }
}

// Protect all market routes
router.use(verifyToken);

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// In-memory cache for market overview (10 minute TTL for better rate limit management)
let marketCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper function to delay requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for exponential backoff retry
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Rate limited, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Market overview endpoint - returns current prices for major indices, crypto, and commodities
router.get('/overview', async (req, res) => {
  try {
    const cacheKey = 'market_overview';
    const CACHE_TTL = 5 * 60; // 5 minutes in seconds
    const now = Date.now();

    // Try Redis cache first (faster than in-memory)
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Check if cache is still valid
          if (now - parsed.timestamp < CACHE_TTL * 1000) {
            console.log('Market overview: Cache hit (Redis)');
            return res.json(parsed.data);
          }
        }
      } catch (redisError) {
        console.warn('Market overview: Redis cache read failed, continuing...');
      }
    }

    // Check in-memory cache as fallback
    if (marketCache && (now - cacheTimestamp) < CACHE_TTL * 1000) {
      console.log('Market overview: Cache hit (in-memory)');
      return res.json(marketCache);
    }

    // Define assets to fetch
    const { determineCategory, normalizeCategory } = require('../utils/categoryUtils');
    const assetSymbols = [
      '^GSPC', '^DJI', '^IXIC', '^RUT', '^FTSE', '^N225', '^GSPTSE', // Indices
      'X:BTCUSD', 'X:ETHUSD', // Crypto
      'XAUUSD', 'XAGUSD', // Commodities
    ];

    // Fetch from database in a single optimized query
    const mostRecentDateResult = await pool.query(
      `SELECT MAX(date) as max_date FROM asset_data WHERE symbol = ANY($1)`,
      [assetSymbols]
    );
    
    const mostRecentDate = mostRecentDateResult.rows[0]?.max_date;
    
    if (!mostRecentDate) {
      // Fallback to mock data if no database data
      const assets = [
        { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
        { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: 'index' },
        { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'index' },
        { symbol: '^RUT', name: 'Russell 2000', type: 'index' },
        { symbol: '^FTSE', name: 'FTSE 100', type: 'index' },
        { symbol: '^N225', name: 'Nikkei 225', type: 'index' },
        { symbol: '^GSPTSE', name: 'S&P/TSX 60', type: 'index' },
        { symbol: 'X:BTCUSD', name: 'Bitcoin', type: 'crypto' },
        { symbol: 'X:ETHUSD', name: 'Ethereum', type: 'crypto' },
        { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
        { symbol: 'XAGUSD', name: 'Silver', type: 'commodity' },
      ].map(asset => ({
        ...asset,
        category: normalizeCategory(determineCategory(asset.symbol, asset.type, null))
      }));

      const tiles = assets.map(asset => {
        const mockPrice = mockData.getCurrentPrice(asset.symbol);
        return {
          symbol: asset.symbol,
          name: asset.name,
          price: mockPrice.price,
          change: mockPrice.change,
          changePercent: mockPrice.changePercent,
          type: asset.type,
          category: asset.category,
        };
      });

      const result = { tiles };
      
      // Cache result
      if (redisClient && redisClient.isOpen) {
        try {
          await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify({ data: result, timestamp: now }));
        } catch (e) {}
      }
      marketCache = result;
      cacheTimestamp = now;
      
      return res.json(result);
    }

    // Get previous date for change calculation
    const previousDateResult = await pool.query(
      `SELECT DISTINCT date FROM asset_data 
       WHERE date < $1 AND symbol = ANY($2)
       ORDER BY date DESC 
       LIMIT 1`,
      [mostRecentDate, assetSymbols]
    );
    const previousDate = previousDateResult.rows[0]?.date || mostRecentDate;

    // Single optimized query to get all assets with prices and changes
    const priceDataResult = await pool.query(
      `SELECT 
        recent.symbol,
        ai.name,
        ai.type,
        recent.close as current_price,
        COALESCE(prev.close, recent.close) as prev_price,
        recent.close - COALESCE(prev.close, recent.close) as price_change,
        CASE 
          WHEN COALESCE(prev.close, recent.close) > 0 
          THEN ((recent.close - COALESCE(prev.close, recent.close)) / COALESCE(prev.close, recent.close)) * 100
          ELSE 0
        END as change_percent
      FROM asset_data recent
      INNER JOIN asset_info ai ON recent.symbol = ai.symbol
      LEFT JOIN asset_data prev ON recent.symbol = prev.symbol AND prev.date = $1
      WHERE recent.date = $2
        AND recent.symbol = ANY($3)
      ORDER BY 
        CASE recent.symbol
          WHEN '^GSPC' THEN 1
          WHEN '^DJI' THEN 2
          WHEN '^IXIC' THEN 3
          WHEN '^RUT' THEN 4
          WHEN '^FTSE' THEN 5
          WHEN '^N225' THEN 6
          WHEN '^GSPTSE' THEN 7
          WHEN 'X:BTCUSD' THEN 8
          WHEN 'X:ETHUSD' THEN 9
          WHEN 'XAUUSD' THEN 10
          WHEN 'XAGUSD' THEN 11
          ELSE 99
        END`,
      [previousDate, mostRecentDate, assetSymbols]
    );

    // Create a map for quick lookup
    const priceMap = new Map();
    priceDataResult.rows.forEach(row => {
      priceMap.set(row.symbol, {
        name: row.name || row.symbol,
        type: row.type || 'index',
        price: parseFloat(row.current_price) || 0,
        change: parseFloat(row.price_change) || 0,
        changePercent: parseFloat(row.change_percent) || 0,
      });
    });

    // Build tiles array in the correct order
    const assets = [
      { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
      { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: 'index' },
      { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'index' },
      { symbol: '^RUT', name: 'Russell 2000', type: 'index' },
      { symbol: '^FTSE', name: 'FTSE 100', type: 'index' },
      { symbol: '^N225', name: 'Nikkei 225', type: 'index' },
      { symbol: '^GSPTSE', name: 'S&P/TSX 60', type: 'index' },
      { symbol: 'X:BTCUSD', name: 'Bitcoin', type: 'crypto' },
      { symbol: 'X:ETHUSD', name: 'Ethereum', type: 'crypto' },
      { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
      { symbol: 'XAGUSD', name: 'Silver', type: 'commodity' },
    ];

    const tiles = assets.map(asset => {
      const category = normalizeCategory(determineCategory(asset.symbol, asset.type, null));
      const priceData = priceMap.get(asset.symbol);
      
      if (priceData) {
        return {
          symbol: asset.symbol,
          name: priceData.name || asset.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          type: priceData.type || asset.type,
          category: category,
        };
      } else {
        // Fallback to mock data if not in database
        const mockPrice = mockData.getCurrentPrice(asset.symbol);
        return {
          symbol: asset.symbol,
          name: asset.name,
          price: mockPrice.price,
          change: mockPrice.change,
          changePercent: mockPrice.changePercent,
          type: asset.type,
          category: category,
        };
      }
    });

    const result = { tiles };

    // Cache in Redis (preferred) and in-memory (fallback)
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify({ data: result, timestamp: now }));
        console.log('Market overview: Stored in Redis cache');
      } catch (e) {
        console.warn('Market overview: Failed to store in Redis cache');
      }
    }
    marketCache = result;
    cacheTimestamp = now;

    res.json(result);
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Market movers endpoint (top gainers and losers for stocks and crypto)
router.get('/movers', async (req, res) => {
  try {
    const cacheKey = 'market_movers';
    const CACHE_TTL = 2.5 * 60 * 60; // 2.5 hours in seconds
    const now = Date.now();

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Check if cache is still valid (2.5 hours)
          if (now - parsed.timestamp < CACHE_TTL * 1000) {
            console.log('Market movers: Cache hit (Redis)');
            return res.json({
              stockGainers: parsed.stockGainers || [],
              stockLosers: parsed.stockLosers || [],
              cryptoGainers: parsed.cryptoGainers || [],
              cryptoLosers: parsed.cryptoLosers || [],
            });
          }
        }
      } catch (redisError) {
        console.warn('Market movers: Redis cache read failed');
      }
    }

    // Cache miss - fetch from database
    console.log('Market movers: Cache miss, fetching from database...');
    
    const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
    
    let stockGainers = [];
    let stockLosers = [];
    let cryptoGainers = [];
    let cryptoLosers = [];

    if (USE_MOCK_DATA) {
      // Use mock market movers service if available, otherwise fallback to mockData
      if (marketMoversService) {
        const mockMovers = await marketMoversService.getMarketMovers();
        // Separate stocks and crypto
        stockGainers = mockMovers.stockGainers || mockMovers.gainers?.filter(g => !g.symbol.startsWith('X:')).slice(0, 25) || [];
        stockLosers = mockMovers.stockLosers || mockMovers.losers?.filter(l => !l.symbol.startsWith('X:')).slice(0, 25) || [];
        cryptoGainers = mockMovers.cryptoGainers || mockMovers.gainers?.filter(g => g.symbol.startsWith('X:')).slice(0, 25) || [];
        cryptoLosers = mockMovers.cryptoLosers || mockMovers.losers?.filter(l => l.symbol.startsWith('X:')).slice(0, 25) || [];
      } else {
        const mockMovers = mockData.getMockMovers();
        // Separate stocks and crypto
        stockGainers = mockMovers.gainers?.filter(g => !g.symbol.startsWith('X:')).slice(0, 25) || [];
        stockLosers = mockMovers.losers?.filter(l => !l.symbol.startsWith('X:')).slice(0, 25) || [];
        cryptoGainers = mockMovers.gainers?.filter(g => g.symbol.startsWith('X:')).slice(0, 25) || [];
        cryptoLosers = mockMovers.losers?.filter(l => l.symbol.startsWith('X:')).slice(0, 25) || [];
      }
    } else {
      // Fetch from database - get most recent date
      const mostRecentDateResult = await pool.query(
        `SELECT MAX(date) as max_date FROM asset_data`
      );
      
      if (mostRecentDateResult.rows[0]?.max_date) {
        const mostRecentDate = mostRecentDateResult.rows[0].max_date;
        
        // Get previous date for comparison
        const previousDateResult = await pool.query(
          `SELECT date FROM asset_data 
           WHERE date < $1 
           ORDER BY date DESC 
           LIMIT 1`,
          [mostRecentDate]
        );
        
        const previousDate = previousDateResult.rows[0]?.date || mostRecentDate;
        
        // Get stock movers (equities)
        const stockPriceChangeResult = await pool.query(
          `SELECT 
            recent.symbol,
            ai.name,
            recent.close as current_price,
            recent.close - prev.close as price_change,
            ((recent.close - prev.close) / NULLIF(prev.close, 0)) * 100 as change_percent
          FROM asset_data recent
          INNER JOIN asset_data prev ON recent.symbol = prev.symbol AND prev.date = $1
          INNER JOIN asset_info ai ON recent.symbol = ai.symbol
          WHERE recent.date = $2
            AND (ai.category = 'Equity' OR (ai.category IS NULL AND ai.type = 'stock' AND ai.symbol NOT LIKE 'X:%' AND ai.symbol NOT LIKE '^%'))
          ORDER BY change_percent DESC NULLS LAST`,
          [previousDate, mostRecentDate]
        );

        // Get crypto movers
        const cryptoPriceChangeResult = await pool.query(
          `SELECT 
            recent.symbol,
            ai.name,
            recent.close as current_price,
            recent.close - prev.close as price_change,
            ((recent.close - prev.close) / NULLIF(prev.close, 0)) * 100 as change_percent
          FROM asset_data recent
          INNER JOIN asset_data prev ON recent.symbol = prev.symbol AND prev.date = $1
          INNER JOIN asset_info ai ON recent.symbol = ai.symbol
          WHERE recent.date = $2
            AND (ai.category = 'Crypto' OR (ai.category IS NULL AND (ai.type = 'crypto' OR ai.symbol LIKE 'X:%')))
          ORDER BY change_percent DESC NULLS LAST`,
          [previousDate, mostRecentDate]
        );

        // Process stock movers
        const allStockMovers = stockPriceChangeResult.rows
          .filter(row => row.change_percent !== null && !isNaN(row.change_percent))
          .map(row => ({
            symbol: row.symbol,
            name: row.name || row.symbol,
            price: parseFloat(row.current_price) || 0,
            change: parseFloat(row.price_change) || 0,
            changePercent: parseFloat(row.change_percent) || 0,
          }));

        stockGainers = allStockMovers
          .filter(m => m.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 25);
        
        stockLosers = allStockMovers
          .filter(m => m.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 25);

        // Process crypto movers
        const allCryptoMovers = cryptoPriceChangeResult.rows
          .filter(row => row.change_percent !== null && !isNaN(row.change_percent))
          .map(row => ({
            symbol: row.symbol,
            name: row.name || row.symbol,
            price: parseFloat(row.current_price) || 0,
            change: parseFloat(row.price_change) || 0,
            changePercent: parseFloat(row.change_percent) || 0,
          }));

        cryptoGainers = allCryptoMovers
          .filter(m => m.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 25);
        
        cryptoLosers = allCryptoMovers
          .filter(m => m.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 25);
      }
    }

    const result = {
      stockGainers: stockGainers.slice(0, 25),
      stockLosers: stockLosers.slice(0, 25),
      cryptoGainers: cryptoGainers.slice(0, 25),
      cryptoLosers: cryptoLosers.slice(0, 25),
    };

    // Store in Redis cache (2.5 hours)
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL,
          JSON.stringify({ ...result, timestamp: now })
        );
        console.log('Market movers: Stored in Redis cache');
      } catch (redisError) {
        console.warn('Market movers: Failed to store in Redis cache');
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Market movers error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

