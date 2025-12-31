/**
 * RSS News Service
 * Fetches news from RSS feeds (free alternative to NewsAPI)
 * 
 * This service provides a cost-effective alternative to NewsAPI by using
 * RSS feeds from major financial news sources.
 * 
 * NO API KEYS REQUIRED - RSS feeds are free!
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const redis = require('redis');

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// Redis client for news caching
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      redisClient = redis.createClient({ url: redisUrl });
      await redisClient.connect();
      console.log('RSS News Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('RSS News Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

// Cache TTL: 2.5 hours (9000 seconds)
const NEWS_CACHE_TTL = 9000;

// RSS Feed Sources
const RSS_FEEDS = {
  yahooFinance: {
    general: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
    stocks: 'https://feeds.finance.yahoo.com/rss/2.0/headline?category=stocks',
    markets: 'https://feeds.finance.yahoo.com/rss/2.0/headline?category=markets',
  },
  googleNews: {
    finance: 'https://news.google.com/rss/search?q=finance&hl=en-US&gl=US&ceid=US:en',
    stocks: 'https://news.google.com/rss/search?q=stocks+market&hl=en-US&gl=US&ceid=US:en',
    crypto: 'https://news.google.com/rss/search?q=cryptocurrency+bitcoin&hl=en-US&gl=US&ceid=US:en',
  },
  bloomberg: {
    markets: 'https://feeds.bloomberg.com/markets/news.rss',
    technology: 'https://feeds.bloomberg.com/technology/news.rss',
  },
  reuters: {
    business: 'https://feeds.reuters.com/reuters/businessNews',
    markets: 'https://feeds.reuters.com/reuters/marketsNews',
  },
  cnbc: {
    topNews: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    markets: 'https://www.cnbc.com/id/15839135/device/rss/rss.html',
  },
  marketwatch: {
    topStories: 'https://www.marketwatch.com/rss/topstories',
    markets: 'https://www.marketwatch.com/rss/markets',
  },
};

// Parse RSS XML to extract articles
function parseRSSFeed(xmlData) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    
    const result = parser.parse(xmlData);
    
    // Handle different RSS feed structures
    let items = [];
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];
    } else if (result.feed && result.feed.entry) {
      // Atom feed format
      items = Array.isArray(result.feed.entry) 
        ? result.feed.entry 
        : [result.feed.entry];
    }
    
    return items.map((item, index) => {
      // Handle RSS format
      if (item.title) {
        const title = typeof item.title === 'string' ? item.title : (item.title['#text'] || item.title);
        const description = item.description 
          ? (typeof item.description === 'string' ? item.description : (item.description['#text'] || item.description))
          : '';
        const link = item.link 
          ? (typeof item.link === 'string' ? item.link : (item.link['#text'] || item.link['@_href'] || item.link))
          : '';
        const pubDate = item.pubDate || item.published || item['dc:date'] || new Date().toISOString();
        const source = item['dc:source'] || item.source || 'Unknown';
        
        // Extract image from various RSS formats
        let imageUrl = null;
        
        // Check for media:content (RSS 2.0 with Media RSS)
        if (item['media:content'] || item['media:thumbnail']) {
          const mediaContent = item['media:content'] || item['media:thumbnail'];
          if (Array.isArray(mediaContent)) {
            imageUrl = mediaContent[0]?.['@_url'] || mediaContent[0]?.url || null;
          } else if (mediaContent) {
            imageUrl = mediaContent['@_url'] || mediaContent.url || mediaContent['@_href'] || null;
          }
        }
        
        // Check for enclosure (RSS 2.0)
        if (!imageUrl && item.enclosure) {
          const enclosure = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
          if (enclosure && enclosure['@_type'] && enclosure['@_type'].startsWith('image/')) {
            imageUrl = enclosure['@_url'] || null;
          }
        }
        
        // Check for content:encoded with img tags
        if (!imageUrl && item['content:encoded']) {
          const content = typeof item['content:encoded'] === 'string' 
            ? item['content:encoded'] 
            : (item['content:encoded']['#text'] || '');
          const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        
        // Check description for img tags
        if (!imageUrl && description) {
          const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        
        // Check for Atom feed media:thumbnail
        if (!imageUrl && item['media:thumbnail']) {
          const thumbnail = Array.isArray(item['media:thumbnail']) 
            ? item['media:thumbnail'][0] 
            : item['media:thumbnail'];
          imageUrl = thumbnail?.['@_url'] || thumbnail?.url || null;
        }
        
        return {
          title: title.trim(),
          description: description.trim(),
          url: link,
          urlToImage: imageUrl, // Include image URL
          source: typeof source === 'string' ? source : (source['#text'] || 'Unknown'),
          publishedAt: new Date(pubDate).toISOString(),
          publishedDate: new Date(pubDate).toLocaleDateString(),
          publishedTime: new Date(pubDate).toLocaleTimeString(),
        };
      }
      return null;
    }).filter(item => item && item.title && item.url);
  } catch (error) {
    console.error('Error parsing RSS feed:', error.message);
    return [];
  }
}

// Fetch news from RSS feeds
async function fetchNewsFromRSS(category = 'business', query = null) {
  // Use mock service in development if enabled
  if (USE_MOCK_DATA) {
    try {
      const mockRssService = require('../../mockservices/general/rssNewsService');
      return await mockRssService.fetchNewsFromRSS(category, query);
    } catch (error) {
      console.warn('Mock RSS service not available, using real RSS feeds:', error.message);
    }
  }

  const articles = [];
  const seenUrls = new Set();
  
  try {
    // Select appropriate RSS feeds based on category/query
    let feedsToFetch = [];
    
    if (query) {
      // For specific queries (like asset symbols), use Google News
      const encodedQuery = encodeURIComponent(query);
      feedsToFetch = [
        `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`,
        `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${query}`,
      ];
    } else if (category === 'business' || category === 'markets') {
      feedsToFetch = [
        RSS_FEEDS.yahooFinance.markets,
        RSS_FEEDS.googleNews.finance,
        RSS_FEEDS.bloomberg.markets,
        RSS_FEEDS.reuters.markets,
        RSS_FEEDS.cnbc.markets,
        RSS_FEEDS.marketwatch.markets,
      ];
    } else if (category === 'crypto') {
      feedsToFetch = [
        RSS_FEEDS.googleNews.crypto,
        RSS_FEEDS.yahooFinance.markets,
      ];
    } else {
      // General news
      feedsToFetch = [
        RSS_FEEDS.yahooFinance.general,
        RSS_FEEDS.googleNews.finance,
        RSS_FEEDS.reuters.business,
        RSS_FEEDS.cnbc.topNews,
      ];
    }
    
    // Fetch from multiple sources in parallel (with rate limiting)
    for (let i = 0; i < feedsToFetch.length; i++) {
      if (i > 0) {
        // Add 500ms delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      try {
        const feedUrl = feedsToFetch[i];
        const response = await axios.get(feedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FinancialNewsBot/1.0)',
          },
        });
        
        const parsedArticles = parseRSSFeed(response.data);
        
        // Deduplicate by URL
        for (const article of parsedArticles) {
          if (article.url && !seenUrls.has(article.url)) {
            seenUrls.add(article.url);
            articles.push({
              id: `rss_${Date.now()}_${articles.length}`,
              ...article,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch RSS feed ${feedsToFetch[i]}:`, error.message);
        // Continue with other feeds
      }
    }
    
    // Sort by published date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return articles.slice(0, 50); // Return up to 50 articles
  } catch (error) {
    console.error('Error fetching RSS news:', error.message);
    return [];
  }
}

// Fetch and cache news from RSS feeds
async function fetchAndCacheNews(category, country = null, query = null) {
  // Build cache key consistently
  let cacheKey;
  if (country) {
    cacheKey = `rss_news:${category || 'general'}:${country}`;
  } else if (query) {
    cacheKey = `rss_news:${category || 'general'}:${query}`;
  } else {
    cacheKey = `rss_news:${category || 'general'}`;
  }

  try {
    // Check Redis cache first
    if (redisClient && redisClient.isOpen) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < NEWS_CACHE_TTL * 1000) {
            console.log(`✅ Using cached RSS news for ${cacheKey}`);
            return parsed.articles;
          }
        }
      } catch (redisError) {
        console.warn(`Failed to read cache for ${cacheKey}:`, redisError.message);
      }
    }

    console.log(`Fetching RSS news for ${cacheKey}...`);
    const articles = await fetchNewsFromRSS(category, query);

    // Store in Redis
    if (redisClient && redisClient.isOpen && articles.length > 0) {
      try {
        await redisClient.setEx(
          cacheKey,
          NEWS_CACHE_TTL,
          JSON.stringify({ articles, timestamp: Date.now() })
        );
        console.log(`✅ Cached ${articles.length} RSS articles for ${cacheKey}`);
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
  console.log('\n🔄 Starting RSS news refresh cycle...');
  const startTime = Date.now();

  try {
    // Initialize Redis if needed
    await initRedis();

    // Fetch news for all categories
    const newsPromises = [
      fetchAndCacheNews('business', null, null), // Market news
      fetchAndCacheNews('crypto', null, null), // Crypto news
      fetchAndCacheNews(null, 'us', null), // US news
      fetchAndCacheNews(null, null, null), // General news
    ];

    // Execute with delays to respect rate limits
    const results = [];
    for (let i = 0; i < newsPromises.length; i++) {
      if (i > 0) {
        // Add 2 second delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      try {
        const articles = await newsPromises[i];
        results.push(articles);
      } catch (error) {
        console.error(`Error fetching RSS news batch ${i}:`, error.message);
        results.push([]);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ RSS news refresh completed in ${duration}s\n`);
    
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

// Fetch asset-specific news
async function fetchAssetNews(symbol) {
  // Use mock service in development if enabled
  if (USE_MOCK_DATA) {
    try {
      const mockRssService = require('../../mockservices/general/rssNewsService');
      return await mockRssService.fetchAssetNews(symbol);
    } catch (error) {
      console.warn('Mock RSS service not available, using real RSS feeds:', error.message);
    }
  }

  const cacheKey = `rss_news:asset:${symbol}`;
  
  try {
    // Check cache
    if (redisClient && redisClient.isOpen) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < NEWS_CACHE_TTL * 1000) {
            return parsed.articles;
          }
        }
      } catch (redisError) {
        // Continue to fetch
      }
    }

    // Fetch news for specific symbol
    const articles = await fetchNewsFromRSS('business', symbol);
    
    // Cache results
    if (redisClient && redisClient.isOpen && articles.length > 0) {
      try {
        await redisClient.setEx(
          cacheKey,
          NEWS_CACHE_TTL,
          JSON.stringify({ articles, timestamp: Date.now() })
        );
      } catch (redisError) {
        console.error(`Failed to cache asset news for ${symbol}:`, redisError.message);
      }
    }
    
    return articles;
  } catch (error) {
    console.error(`Error fetching asset news for ${symbol}:`, error.message);
    return [];
  }
}

// Start background service
let refreshInterval = null;

function startNewsService(intervalHours = 2.5) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Initial fetch
  refreshAllNews().catch(err => {
    console.error('Initial RSS news fetch failed:', err.message);
  });

  // Set up periodic refresh
  refreshInterval = setInterval(() => {
    refreshAllNews().catch(err => {
      console.error('Periodic RSS news refresh failed:', err.message);
    });
  }, intervalMs);

  console.log(`📰 RSS News service started (refreshing every ${intervalHours} hours)`);
}

function stopNewsService() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('📰 RSS News service stopped');
  }
}

module.exports = {
  initRedis,
  fetchNewsFromRSS,
  fetchAndCacheNews,
  fetchAssetNews,
  refreshAllNews,
  startNewsService,
  stopNewsService,
  getRedisClient: () => redisClient,
};

