const express = require('express');
const axios = require('axios');
const redis = require('redis');
const router = express.Router();

// Redis client will be passed from server.js or created here
// For now, we'll create our own connection to avoid circular dependencies
let redisClient = null;
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('News: Redis connected');
    } catch (error) {
      console.warn('News: Redis not available, will use in-memory cache');
      redisClient = null;
    }
  }
};
// Initialize Redis connection
initRedis().catch(() => {});

// In-memory cache fallback
let newsCache = null;
let newsCacheTimestamp = 0;
const NEWS_CACHE_TTL = 2.5 * 60 * 60 * 1000; // 2.5 hours in milliseconds

// Note: fetchAssetNewsFromAPI has been moved to assetNewsService.js

// Helper function to fetch news from NewsAPI
async function fetchNewsFromAPI() {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  
  if (!apiKey) {
    console.warn('NEWS_API_KEY not set, using mock news data');
    return generateMockNews();
  }

  try {
    // Fetch business/finance news from NewsAPI
    // Using 'business' category and 'en' language for market news
    const newsUrl = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=15&apiKey=${apiKey}`;
    
    const response = await axios.get(newsUrl, {
      timeout: 10000, // 10 second timeout
    });

    if (response.data && response.data.articles) {
      // Filter and format articles
      const articles = response.data.articles
        .filter(article => article.title && article.url) // Only include valid articles
        .map((article, index) => ({
          id: `news_${index}_${Date.now()}`,
          title: article.title,
          description: article.description || '',
          source: article.source?.name || 'Unknown',
          author: article.author || '',
          url: article.url,
          urlToImage: article.urlToImage || null,
          publishedAt: article.publishedAt,
          publishedDate: new Date(article.publishedAt).toLocaleDateString(),
          publishedTime: new Date(article.publishedAt).toLocaleTimeString(),
        }))
        .slice(0, 15); // Ensure we have exactly 15 articles

      return articles;
    }

    return generateMockNews();
  } catch (error) {
    console.error('Error fetching news from NewsAPI:', error.message);
    // Fallback to mock data if API fails
    return generateMockNews();
  }
}

// Note: generateMockAssetNews has been moved to assetNewsService.js

// Generate mock news data as fallback
function generateMockNews() {
  const mockSources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch', 'Yahoo Finance'];
  const mockTitles = [
    'Stock Market Reaches New Highs Amid Economic Optimism',
    'Tech Stocks Rally on Strong Earnings Reports',
    'Federal Reserve Signals Potential Rate Changes',
    'Cryptocurrency Market Shows Volatility',
    'Global Markets React to Trade Agreement News',
    'Energy Sector Sees Significant Gains',
    'Healthcare Stocks Surge on Drug Approval News',
    'Real Estate Market Shows Signs of Cooling',
    'Consumer Spending Data Exceeds Expectations',
    'Manufacturing Sector Reports Strong Growth',
    'International Markets Close Mixed',
    'Commodity Prices Fluctuate on Supply Concerns',
    'Banking Sector Announces Major Merger',
    'Tech Giants Report Record Quarterly Earnings',
    'Economic Indicators Point to Continued Growth',
  ];

  return mockTitles.map((title, index) => ({
    id: `mock_news_${index}`,
    title,
    description: `Market analysis and insights on ${title.toLowerCase()}.`,
    source: mockSources[index % mockSources.length],
    author: 'Market Analyst',
    url: `https://example.com/news/${index}`,
    urlToImage: null,
    publishedAt: new Date(Date.now() - index * 3600000).toISOString(), // Staggered times
    publishedDate: new Date(Date.now() - index * 3600000).toLocaleDateString(),
    publishedTime: new Date(Date.now() - index * 3600000).toLocaleTimeString(),
  }));
}

// Asset-specific news endpoint
router.get('/asset/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Use the asset news service
    const assetNewsService = require('../services/assetNewsService');
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

    // Cache miss - fetch from API
    const newsService = require('../services/newsService');
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

    // Cache miss - fetch from API
    const newsService = require('../services/newsService');
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
    const newsService = require('../services/newsService');
    const articles = await newsService.fetchAndCacheNews('world', null, null);

    res.json({ articles });
  } catch (error) {
    console.error('World news error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

