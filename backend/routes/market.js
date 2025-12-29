const express = require('express');
const axios = require('axios');
const redis = require('redis');
const { pool } = require('../db');
const mockData = require('../services/mockData');
const router = express.Router();

// Redis client for caching
let redisClient = null;
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Market: Redis connected');
    } catch (error) {
      console.warn('Market: Redis not available, will use in-memory cache');
      redisClient = null;
    }
  }
};
initRedis().catch(() => {});

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
    if (!USE_MOCK_DATA && !process.env.POLYGON_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'POLYGON_API_KEY environment variable is not set' 
      });
    }

    // Check in-memory cache first
    const now = Date.now();
    if (marketCache && (now - cacheTimestamp) < CACHE_TTL) {
      return res.json(marketCache);
    }

    // Define assets to fetch
    const assets = [
      // Indices
      { symbol: 'SPY', name: 'S&P 500', type: 'index' },
      { symbol: 'DIA', name: 'Dow Jones', type: 'index' },
      { symbol: 'QQQ', name: 'NASDAQ', type: 'index' },
      { symbol: 'IWM', name: 'Russell 2000', type: 'index' },
      { symbol: 'EWU', name: 'FTSE 100', type: 'index' },
      { symbol: 'EWJ', name: 'Nikkei 225', type: 'index' },
      { symbol: 'EWC', name: 'S&P/TSX 60', type: 'index' },
      // Crypto
      { symbol: 'X:BTCUSD', name: 'Bitcoin', type: 'crypto' },
      { symbol: 'X:ETHUSD', name: 'Ethereum', type: 'crypto' },
      // Commodities
      { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
      { symbol: 'XAGUSD', name: 'Silver', type: 'commodity' },
    ];

    // Fetch sequentially with delays to avoid rate limiting
    const tiles = [];
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      // Add delay between requests (except for first one)
      // Increased delay to respect rate limits better
      if (i > 0) {
        await delay(500); // 500ms delay between requests (reduced from 200ms to be safer)
      }

      try {
        let currentPrice, change, changePercent;
        
        if (USE_MOCK_DATA) {
          // Use mock data
          const mockPrice = mockData.getCurrentPrice(asset.symbol);
          currentPrice = mockPrice.price;
          change = mockPrice.change;
          changePercent = mockPrice.changePercent;
        } else {
          // Use real API
          const prevCloseUrl = `https://api.polygon.io/v2/aggs/ticker/${asset.symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`;
          let prevResponse;
          
          try {
            prevResponse = await retryWithBackoff(async () => {
              const response = await axios.get(prevCloseUrl, {
                timeout: 10000,
              });
              if (response.status === 429) {
                throw new Error('RATE_LIMITED');
              }
              return response;
            });
          } catch (error) {
            if (error.message === 'RATE_LIMITED' || error.response?.status === 429) {
              console.warn(`Rate limited for ${asset.symbol}, using placeholder value`);
              tiles.push({
                symbol: asset.symbol,
                name: asset.name,
                price: 0,
                change: 0,
                changePercent: 0,
                type: asset.type,
              });
              continue;
            }
            throw error;
          }
          
          if (!prevResponse.data || !prevResponse.data.results || prevResponse.data.results.length === 0) {
            tiles.push({
              symbol: asset.symbol,
              name: asset.name,
              price: 0,
              change: 0,
              changePercent: 0,
              type: asset.type,
            });
            continue;
          }

          const prevClose = prevResponse.data.results[0].c;
          currentPrice = prevResponse.data.results[0].c;
          change = currentPrice - prevClose;
          changePercent = prevClose !== 0 ? ((change / prevClose) * 100) : 0;
        }

        tiles.push({
          symbol: asset.symbol,
          name: asset.name,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          type: asset.type,
        });
      } catch (error) {
        console.error(`Error fetching ${asset.symbol}:`, error.response?.status || error.message);
        tiles.push({
          symbol: asset.symbol,
          name: asset.name,
          price: 0,
          change: 0,
          changePercent: 0,
          type: asset.type,
        });
      }
    }

    const result = { tiles };

    // Update in-memory cache
    marketCache = result;
    cacheTimestamp = Date.now();

    res.json(result);
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Market movers endpoint (top gainers and losers)
router.get('/movers', async (req, res) => {
  try {
    const cacheKey = 'market_movers';
    const CACHE_TTL = 2.5 * 60 * 60; // 2.5 hours in seconds
    const now = Date.now();

    // Try Redis cache first
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Check if cache is still valid (2.5 hours)
          if (now - parsed.timestamp < CACHE_TTL * 1000) {
            console.log('Market movers: Cache hit (Redis)');
            return res.json({
              gainers: parsed.gainers || [],
              losers: parsed.losers || [],
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
    
    let gainers = [];
    let losers = [];

    if (USE_MOCK_DATA) {
      // Use mock data for movers
      const mockMovers = mockData.getMockMovers();
      gainers = mockMovers.gainers.slice(0, 10);
      losers = mockMovers.losers.slice(0, 10);
    } else {
      // Fetch from database - get most recent date
      const mostRecentDateResult = await pool.query(
        `SELECT MAX(date) as max_date FROM asset_data`
      );
      
      if (mostRecentDateResult.rows[0]?.max_date) {
        const mostRecentDate = mostRecentDateResult.rows[0].max_date;
        
        // Get all stocks (equities) with their price changes
        const moversResult = await pool.query(
          `SELECT 
            ad.symbol,
            ai.name,
            ad.close as current_price,
            ad.close - LAG(ad.close) OVER (PARTITION BY ad.symbol ORDER BY ad.date) as price_change,
            ((ad.close - LAG(ad.close) OVER (PARTITION BY ad.symbol ORDER BY ad.date)) / 
             NULLIF(LAG(ad.close) OVER (PARTITION BY ad.symbol ORDER BY ad.date), 0)) * 100 as change_percent
          FROM asset_data ad
          INNER JOIN asset_info ai ON ad.symbol = ai.symbol
          WHERE ad.date = $1 
            AND ai.category = 'equities'
            AND ai.type = 'stock'
          ORDER BY ad.date DESC`,
          [mostRecentDate]
        );

        // If we don't have enough data, try to get previous day's data
        if (moversResult.rows.length < 20) {
          const previousDateResult = await pool.query(
            `SELECT date FROM asset_data 
             WHERE date < $1 
             ORDER BY date DESC 
             LIMIT 1`,
            [mostRecentDate]
          );
          
          if (previousDateResult.rows[0]?.date) {
            const previousDate = previousDateResult.rows[0].date;
            
            // Calculate price changes between most recent and previous date
            const priceChangeResult = await pool.query(
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
                AND ai.category = 'equities'
                AND ai.type = 'stock'
              ORDER BY change_percent DESC NULLS LAST`,
              [previousDate, mostRecentDate]
            );

            const allMovers = priceChangeResult.rows
              .filter(row => row.change_percent !== null && !isNaN(row.change_percent))
              .map(row => ({
                symbol: row.symbol,
                name: row.name || row.symbol,
                price: parseFloat(row.current_price) || 0,
                change: parseFloat(row.price_change) || 0,
                changePercent: parseFloat(row.change_percent) || 0,
              }));

            // Sort and get top 10
            gainers = allMovers
              .filter(m => m.changePercent > 0)
              .sort((a, b) => b.changePercent - a.changePercent)
              .slice(0, 10);
            
            losers = allMovers
              .filter(m => m.changePercent < 0)
              .sort((a, b) => a.changePercent - b.changePercent)
              .slice(0, 10);
          }
        } else {
          // Use the window function results
          const allMovers = moversResult.rows
            .filter(row => row.change_percent !== null && !isNaN(row.change_percent))
            .map(row => ({
              symbol: row.symbol,
              name: row.name || row.symbol,
              price: parseFloat(row.current_price) || 0,
              change: parseFloat(row.price_change) || 0,
              changePercent: parseFloat(row.change_percent) || 0,
            }));

          gainers = allMovers
            .filter(m => m.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 10);
          
          losers = allMovers
            .filter(m => m.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 10);
        }

        // If still no data, try fetching from Polygon API
        if (gainers.length === 0 && losers.length === 0 && process.env.POLYGON_API_KEY) {
          try {
            // Fetch top gainers/losers from Polygon API
            const gainersUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${process.env.POLYGON_API_KEY}`;
            const losersUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${process.env.POLYGON_API_KEY}`;
            
            const [gainersResponse, losersResponse] = await Promise.all([
              axios.get(gainersUrl, { timeout: 10000 }).catch(() => ({ data: { tickers: [] } })),
              axios.get(losersUrl, { timeout: 10000 }).catch(() => ({ data: { tickers: [] } })),
            ]);

            if (gainersResponse.data?.tickers) {
              gainers = gainersResponse.data.tickers.slice(0, 10).map(ticker => ({
                symbol: ticker.ticker,
                name: ticker.name || ticker.ticker,
                price: ticker.day?.c || 0,
                change: (ticker.day?.c || 0) - (ticker.prevDay?.c || 0),
                changePercent: ticker.todaysChangePerc || 0,
              }));
            }

            if (losersResponse.data?.tickers) {
              losers = losersResponse.data.tickers.slice(0, 10).map(ticker => ({
                symbol: ticker.ticker,
                name: ticker.name || ticker.ticker,
                price: ticker.day?.c || 0,
                change: (ticker.day?.c || 0) - (ticker.prevDay?.c || 0),
                changePercent: ticker.todaysChangePerc || 0,
              }));
            }
          } catch (apiError) {
            console.error('Error fetching from Polygon API:', apiError.message);
          }
        }
      }
    }

    const result = {
      gainers: gainers.slice(0, 10),
      losers: losers.slice(0, 10),
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

