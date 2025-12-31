const express = require('express');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');
const { newsService, assetNewsService } = require('../services');
const { getRedisClient } = require('../config/redis');
const router = express.Router();

// Protect all news routes
router.use(verifyToken);

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// In-memory cache fallback
let newsCache = null;
let newsCacheTimestamp = 0;
const NEWS_CACHE_TTL = 2.5 * 60 * 60 * 1000; // 2.5 hours in milliseconds

// Helper function to fetch news from RSS feeds (free) or mock service
async function fetchNewsFromAPI() {
  // Always use newsService which handles RSS feeds first, then free mock data
  // Never use paid NewsAPI to avoid costs
  return await newsService.fetchNewsFromAPI('business');
}

// Asset-specific news endpoint
router.get('/asset/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Use the asset news service (already imported at top)
    const articles = await assetNewsService.getAssetNews(symbol);

    res.json({ articles });
  } catch (error) {
    console.error(`Asset News error (${req.params.symbol}):`, error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Market news endpoint
router.get('/market', async (req, res) => {
  try {
    const cacheKey = 'news:business';
    const now = Date.now();

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          return res.json({ articles: parsed.articles || [] });
        }
      } catch (redisError) {
        console.warn('News: Redis cache read failed, trying in-memory cache');
      }
    }

    // Try in-memory cache
    if (newsCache && (now - newsCacheTimestamp) < NEWS_CACHE_TTL) {
      console.log('News: Cache hit (in-memory)');
      return res.json({ articles: newsCache });
    }

    // Cache miss - fetch from API
    console.log('News: Cache miss, fetching from API...');
    const articles = await fetchNewsFromAPI();

    // Store in Redis cache (2.5 hours = 9000 seconds)
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(
          cacheKey,
          9000, // 2.5 hours in seconds
          JSON.stringify({ articles, timestamp: now })
        );
        console.log('News: Stored in Redis cache');
      } catch (redisError) {
        console.warn('News: Failed to store in Redis cache');
      }
    }

    // Also store in in-memory cache as fallback
    newsCache = articles;
    newsCacheTimestamp = now;

    res.json({ articles });
  } catch (error) {
    console.error('News error:', error);
    // Return cached data if available, even if expired
    if (newsCache) {
      console.log('News: Returning stale cache due to error');
      return res.json({ articles: newsCache });
    }
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Crypto news endpoint
router.get('/crypto', async (req, res) => {
  try {
    const cacheKey = 'news:crypto:cryptocurrency OR bitcoin OR ethereum';

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          return res.json({ articles: parsed.articles || [] });
        }
      } catch (redisError) {
        console.warn('Crypto News: Redis cache read failed');
      }
    }

    // Cache miss - fetch from API (newsService already imported)
    const articles = await newsService.fetchAndCacheNews('crypto', null, 'cryptocurrency OR bitcoin OR ethereum');

    res.json({ articles });
  } catch (error) {
    console.error('Crypto news error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// US news endpoint
router.get('/us', async (req, res) => {
  try {
    const cacheKey = 'news:us:us';

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          return res.json({ articles: parsed.articles || [] });
        }
      } catch (redisError) {
        console.warn('US News: Redis cache read failed');
      }
    }

    // Cache miss - fetch from API (newsService already imported)
    const articles = await newsService.fetchAndCacheNews('us', 'us', null);

    res.json({ articles });
  } catch (error) {
    console.error('US news error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// World news endpoint
router.get('/world', async (req, res) => {
  try {
    const cacheKey = 'news:world';

    // Try Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          return res.json({ articles: parsed.articles || [] });
        }
      } catch (redisError) {
        console.warn('World News: Redis cache read failed');
      }
    }

    // Cache miss - fetch from API
    // newsService already imported
    const articles = await newsService.fetchAndCacheNews('world', null, null);

    res.json({ articles });
  } catch (error) {
    console.error('World news error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

