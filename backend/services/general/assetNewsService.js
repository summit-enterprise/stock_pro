const axios = require('axios');
const redis = require('redis');
const { pool } = require('../../db');

// Redis client for asset news caching
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Asset News Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('Asset News Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

// Cache TTL: 2.5 hours (9000 seconds)
const ASSET_NEWS_CACHE_TTL = 9000;

// Helper function to fetch asset-specific news (RSS first, then free mock data)
async function fetchAssetNewsFromAPI(symbol) {
  // Priority 1: Try RSS feeds (free, no API key required)
  try {
    const rssNewsService = require('./rssNewsService');
    const rssArticles = await rssNewsService.fetchAssetNews(symbol);
    
    if (rssArticles && rssArticles.length > 0) {
      console.log(`✅ Using RSS news for ${symbol} (${rssArticles.length} articles)`);
      return rssArticles.slice(0, 30).map((article, index) => ({
        id: `asset_news_${symbol}_${index}_${Date.now()}`,
        ...article,
      }));
    }
  } catch (error) {
    console.warn(`RSS news service not available for ${symbol}, falling back to free mock data:`, error.message);
  }

  // Priority 2: Use free mock data (never use paid NewsAPI to avoid costs)
  console.log(`Using free mock asset news data for ${symbol} (RSS unavailable)`);
  return generateMockAssetNews(symbol);
}

// Generate mock asset-specific news data as fallback
function generateMockAssetNews(symbol) {
  const mockSources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch', 'Yahoo Finance'];
  const companyName = symbol; // Could be enhanced to lookup company name
  const mockTitles = [
    `${symbol} Reports Strong Quarterly Earnings`,
    `${symbol} Announces New Product Launch`,
    `Analysts Upgrade ${symbol} Price Target`,
    `${symbol} Stock Surges on Positive News`,
    `${symbol} Expands Market Share in Key Sector`,
    `${symbol} CEO Discusses Future Growth Strategy`,
    `${symbol} Partners with Major Technology Company`,
    `${symbol} Dividend Announcement Draws Investor Interest`,
    `${symbol} Beats Revenue Expectations`,
    `${symbol} Announces Strategic Acquisition`,
    `${symbol} Expands into New Markets`,
    `${symbol} Reports Record Sales Figures`,
    `${symbol} Announces Major Partnership Deal`,
    `${symbol} Stock Analysis: Bullish Outlook`,
    `${symbol} Innovation Drives Market Performance`,
    `${symbol} Regulatory Approval Boosts Stock`,
    `${symbol} Quarterly Results Exceed Expectations`,
    `${symbol} Announces Share Buyback Program`,
    `${symbol} Leadership Changes Signal Growth`,
    `${symbol} Market Position Strengthens`,
    `${symbol} Technology Investment Pays Off`,
    `${symbol} Customer Base Expands Rapidly`,
    `${symbol} International Expansion Plans`,
    `${symbol} Sustainability Initiatives Gain Traction`,
    `${symbol} Research and Development Milestone`,
    `${symbol} Industry Recognition for Innovation`,
    `${symbol} Strategic Investment from Major Fund`,
    `${symbol} New Product Line Launches Successfully`,
    `${symbol} Market Share Growth Continues`,
    `${symbol} Analyst Coverage Increases`,
  ];

  return mockTitles.map((title, index) => ({
    id: `mock_asset_news_${symbol}_${index}`,
    title,
    description: `Latest news and analysis about ${symbol}. ${title.toLowerCase()}.`,
    source: mockSources[index % mockSources.length],
    author: 'Market Analyst',
    url: `https://example.com/news/${symbol}/${index}`,
    urlToImage: null,
    publishedAt: new Date(Date.now() - index * 3600000).toISOString(), // Staggered times
    publishedDate: new Date(Date.now() - index * 3600000).toLocaleDateString(),
    publishedTime: new Date(Date.now() - index * 3600000).toLocaleTimeString(),
  }));
}

// Fetch and cache news for a specific asset
async function fetchAndCacheAssetNews(symbol) {
  const normalizedSymbol = symbol.toUpperCase();
  const cacheKey = `asset_news:${normalizedSymbol}`;

  try {
    console.log(`Fetching news for asset ${normalizedSymbol}...`);
    const articles = await fetchAssetNewsFromAPI(normalizedSymbol);

    // Store in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(
          cacheKey,
          ASSET_NEWS_CACHE_TTL,
          JSON.stringify({ articles, timestamp: Date.now(), symbol: normalizedSymbol })
        );
        console.log(`✅ Cached ${articles.length} articles for ${normalizedSymbol}`);
      } catch (redisError) {
        console.error(`Failed to cache ${normalizedSymbol}:`, redisError.message);
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error in fetchAndCacheAssetNews for ${normalizedSymbol}:`, error.message);
    return [];
  }
}

// Get news for an asset (checks cache first, fetches if needed)
async function getAssetNews(symbol) {
  const normalizedSymbol = symbol.toUpperCase();
  const cacheKey = `asset_news:${normalizedSymbol}`;

  // Track that this asset was viewed (for background refresh)
  trackAssetView(normalizedSymbol).catch(() => {}); // Don't block on tracking

  // Try Redis cache first
  if (redisClient && redisClient.isOpen) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log(`Asset News (${normalizedSymbol}): Cache hit (Redis)`);
        return parsed.articles || [];
      }
    } catch (redisError) {
      console.warn(`Asset News (${normalizedSymbol}): Redis cache read failed`);
    }
  }

  // Cache miss - fetch and cache
  console.log(`Asset News (${normalizedSymbol}): Cache miss, fetching from API...`);
  return await fetchAndCacheAssetNews(normalizedSymbol);
}

// Track recently viewed assets in Redis (last 200 assets viewed)
async function trackAssetView(symbol) {
  const normalizedSymbol = symbol.toUpperCase();
  
  if (redisClient && redisClient.isOpen) {
    try {
      const key = 'recently_viewed_assets';
      // Add to a sorted set with timestamp as score
      await redisClient.zAdd(key, {
        score: Date.now(),
        value: normalizedSymbol
      });
      
      // Keep only the last 200 assets (remove oldest)
      await redisClient.zRemRangeByRank(key, 0, -201); // Keep top 200
    } catch (error) {
      // Silently fail - tracking is optional
    }
  }
}

// Get list of assets that need news refresh (from watchlists, popular assets, and recently viewed)
async function getAssetsToRefresh() {
  try {
    // Get all unique symbols from watchlists
    const watchlistResult = await pool.query(
      `SELECT DISTINCT symbol FROM watchlist ORDER BY symbol`
    );
    const watchlistSymbols = watchlistResult.rows.map(row => row.symbol);

    // Get popular assets (assets with most data points - likely most viewed)
    const popularResult = await pool.query(
      `SELECT symbol, COUNT(*) as data_count 
       FROM asset_data 
       GROUP BY symbol 
       ORDER BY data_count DESC 
       LIMIT 100`
    );
    const popularSymbols = popularResult.rows.map(row => row.symbol);

    // Get recently viewed assets from Redis (last 200)
    let recentlyViewedSymbols = [];
    if (redisClient && redisClient.isOpen) {
      try {
        const recentAssets = await redisClient.zRange('recently_viewed_assets', -200, -1); // Last 200
        recentlyViewedSymbols = recentAssets;
      } catch (error) {
        console.warn('Could not fetch recently viewed assets from Redis');
      }
    }

    // Combine and deduplicate
    const allSymbols = [...new Set([...watchlistSymbols, ...popularSymbols, ...recentlyViewedSymbols])];
    
    return allSymbols;
  } catch (error) {
    console.error('Error getting assets to refresh:', error.message);
    return [];
  }
}

// Refresh news for a batch of assets
async function refreshAssetNewsBatch(symbols, batchSize = 10) {
  console.log(`\n🔄 Refreshing news for ${symbols.length} assets...`);
  const startTime = Date.now();

  let successCount = 0;
  let errorCount = 0;

  // Process in batches to respect rate limits
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    // Process batch in parallel with delays
    const batchPromises = batch.map(async (symbol, index) => {
      if (index > 0) {
        // Add 2 second delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      try {
        await fetchAndCacheAssetNews(symbol);
        successCount++;
      } catch (error) {
        console.error(`Error refreshing news for ${symbol}:`, error.message);
        errorCount++;
      }
    });

    await Promise.all(batchPromises);
    
    // Add delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between batches
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Asset news refresh completed in ${duration}s (${successCount} success, ${errorCount} errors)\n`);
  
  return { successCount, errorCount };
}

// Main function to refresh news for all tracked assets
async function refreshAllAssetNews() {
  console.log('\n🔄 Starting asset news refresh cycle...');
  
  try {
    // Initialize Redis if needed
    await initRedis();

    // Get assets that need news refresh
    const assetsToRefresh = await getAssetsToRefresh();
    
    if (assetsToRefresh.length === 0) {
      console.log('No assets found to refresh news for.');
      return { successCount: 0, errorCount: 0 };
    }

    console.log(`Found ${assetsToRefresh.length} assets to refresh news for.`);

    // Refresh news for all assets (in batches to respect rate limits)
    return await refreshAssetNewsBatch(assetsToRefresh, 10); // 10 assets per batch
  } catch (error) {
    console.error('Error in refreshAllAssetNews:', error.message);
    return { successCount: 0, errorCount: 0 };
  }
}

// Start background service for asset news
let assetNewsRefreshInterval = null;

function startAssetNewsService(intervalHours = 2.5) {
  const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds

  // Initial fetch
  refreshAllAssetNews().catch(err => {
    console.error('Initial asset news fetch failed:', err.message);
  });

  // Set up periodic refresh
  assetNewsRefreshInterval = setInterval(() => {
    refreshAllAssetNews().catch(err => {
      console.error('Periodic asset news refresh failed:', err.message);
    });
  }, intervalMs);

  console.log(`📰 Asset news service started (refreshing every ${intervalHours} hours)`);
}

function stopAssetNewsService() {
  if (assetNewsRefreshInterval) {
    clearInterval(assetNewsRefreshInterval);
    assetNewsRefreshInterval = null;
    console.log('📰 Asset news service stopped');
  }
}

module.exports = {
  initRedis,
  fetchAssetNewsFromAPI,
  fetchAndCacheAssetNews,
  getAssetNews,
  trackAssetView,
  refreshAllAssetNews,
  refreshAssetNewsBatch,
  startAssetNewsService,
  stopAssetNewsService,
  getRedisClient: () => redisClient,
};

