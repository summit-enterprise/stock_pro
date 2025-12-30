const axios = require('axios');
const redis = require('redis');

// Redis client for news caching
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('News Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('News Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

// Cache TTL: 2.5 hours (9000 seconds)
const NEWS_CACHE_TTL = 9000;

// Helper function to fetch news from NewsAPI
async function fetchNewsFromAPI(category, country = null, query = null) {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  
  if (!apiKey) {
    console.warn('NEWS_API_KEY not set, using mock news data');
    return generateMockNews(category);
  }

  try {
    let newsUrl;
    
    if (query) {
      // Use 'everything' endpoint for specific queries (e.g., crypto)
      newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`;
    } else if (country) {
      // Use 'top-headlines' with country
      newsUrl = `https://newsapi.org/v2/top-headlines?country=${country}&language=en&pageSize=30&apiKey=${apiKey}`;
    } else if (category) {
      // Use 'top-headlines' with category
      newsUrl = `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=30&apiKey=${apiKey}`;
    } else {
      // General business news
      newsUrl = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=30&apiKey=${apiKey}`;
    }
    
    const response = await axios.get(newsUrl, {
      timeout: 10000,
    });

    if (response.data && response.data.articles) {
      const articles = response.data.articles
        .filter(article => article.title && article.url)
        .map((article, index) => ({
          id: `news_${category || 'general'}_${index}_${Date.now()}`,
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
        .slice(0, 30);

      return articles.length > 0 ? articles : generateMockNews(category);
    }

    return generateMockNews(category);
  } catch (error) {
    console.error(`Error fetching news (${category}):`, error.message);
    return generateMockNews(category);
  }
}

// Generate mock news data
function generateMockNews(category = 'business') {
  const mockSources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch', 'Yahoo Finance'];
  
  const categoryTitles = {
    business: [
      'Stock Market Reaches New Highs Amid Economic Optimism',
      'Tech Stocks Rally on Strong Earnings Reports',
      'Federal Reserve Signals Potential Rate Changes',
      'Global Markets React to Trade Agreement News',
      'Energy Sector Sees Significant Gains',
    ],
    crypto: [
      'Bitcoin Surges Past Key Resistance Level',
      'Ethereum Network Upgrade Shows Promising Results',
      'Cryptocurrency Market Shows Increased Institutional Interest',
      'Regulatory Clarity Boosts Crypto Market Confidence',
      'DeFi Sector Continues to Expand',
    ],
    world: [
      'Global Economic Growth Exceeds Expectations',
      'International Trade Agreements Strengthen Markets',
      'European Markets Close Higher on Positive Data',
      'Asian Markets Show Mixed Results',
      'Emerging Markets Attract Investor Attention',
    ],
    us: [
      'US Job Market Shows Strong Growth',
      'Consumer Spending Reaches Record Highs',
      'Manufacturing Sector Reports Strong Performance',
      'Housing Market Shows Signs of Stabilization',
      'Technology Sector Leads Market Gains',
    ],
  };

  const titles = categoryTitles[category] || categoryTitles.business;
  const allTitles = [...titles, ...categoryTitles.business]; // Ensure we have 30

  return allTitles.slice(0, 30).map((title, index) => ({
    id: `mock_news_${category}_${index}`,
    title,
    description: `Latest news and analysis on ${title.toLowerCase()}.`,
    source: mockSources[index % mockSources.length],
    author: 'Market Analyst',
    url: `https://example.com/news/${category}/${index}`,
    urlToImage: null,
    publishedAt: new Date(Date.now() - index * 3600000).toISOString(),
    publishedDate: new Date(Date.now() - index * 3600000).toLocaleDateString(),
    publishedTime: new Date(Date.now() - index * 3600000).toLocaleTimeString(),
  }));
}

// Fetch and cache news for a specific category
async function fetchAndCacheNews(category, country = null, query = null) {
  // Build cache key consistently
  let cacheKey;
  if (country) {
    cacheKey = `news:${category || 'general'}:${country}`;
  } else if (query) {
    cacheKey = `news:${category || 'general'}:${query}`;
  } else {
    cacheKey = `news:${category || 'general'}`;
  }

  try {
    console.log(`Fetching news for ${cacheKey}...`);
    const articles = await fetchNewsFromAPI(category, country, query);

    // Store in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(
          cacheKey,
          NEWS_CACHE_TTL,
          JSON.stringify({ articles, timestamp: Date.now() })
        );
        console.log(`✅ Cached ${articles.length} articles for ${cacheKey}`);
      } catch (redisError) {
        console.error(`Failed to cache ${cacheKey}:`, redisError.message);
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error in fetchAndCacheNews for ${cacheKey}:`, error.message);
    return [];
  }
}

// Main function to refresh all news categories
async function refreshAllNews() {
  console.log('\n🔄 Starting news refresh cycle...');
  const startTime = Date.now();

  try {
    // Initialize Redis if needed
    await initRedis();

    // Fetch news for all categories in parallel (with rate limiting consideration)
    const newsPromises = [
      fetchAndCacheNews('business', null, null), // Market news
      fetchAndCacheNews(null, null, 'cryptocurrency OR bitcoin OR ethereum'), // Crypto news
      fetchAndCacheNews(null, 'us', null), // US news
      fetchAndCacheNews(null, null, null), // World news (general headlines)
    ];

    // Execute with delays to respect rate limits
    const results = [];
    for (let i = 0; i < newsPromises.length; i++) {
      if (i > 0) {
        // Add 2 second delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      try {
        const articles = await newsPromises[i];
        results.push(articles);
      } catch (error) {
        console.error(`Error fetching news batch ${i}:`, error.message);
        results.push([]);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ News refresh completed in ${duration}s\n`);
    
    return {
      market: results[0] || [],
      crypto: results[1] || [],
      us: results[2] || [],
      world: results[3] || [],
    };
  } catch (error) {
    console.error('Error in refreshAllNews:', error.message);
    return {
      market: [],
      crypto: [],
      us: [],
      world: [],
    };
  }
}

// Start background service
let refreshInterval = null;

function startNewsService(intervalHours = 2.5) {
  const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds

  // Initial fetch
  refreshAllNews().catch(err => {
    console.error('Initial news fetch failed:', err.message);
  });

  // Set up periodic refresh
  refreshInterval = setInterval(() => {
    refreshAllNews().catch(err => {
      console.error('Periodic news refresh failed:', err.message);
    });
  }, intervalMs);

  console.log(`📰 News service started (refreshing every ${intervalHours} hours)`);
}

function stopNewsService() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('📰 News service stopped');
  }
}

module.exports = {
  initRedis,
  fetchNewsFromAPI,
  fetchAndCacheNews,
  refreshAllNews,
  startNewsService,
  stopNewsService,
  getRedisClient: () => redisClient,
};

