require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { initDb } = require('./db');
const { initRedis } = require('./config/redis');
const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Initialize database and Redis
(async () => {
  try {
    await initDb();
    await initRedis();
    
    // Initialize service health monitoring after database is ready
    const serviceHealthService = require('./services/general/serviceHealthService');
    await serviceHealthService.initializeServiceHealth();
    
    // Start background health monitoring (checks every 5 minutes)
    await serviceHealthService.startHealthMonitoring(5);
    
    // Start application status logging (wait a bit for services to initialize)
    setTimeout(() => {
      const applicationStatusLogger = require('./services/general/applicationStatusLogger');
      applicationStatusLogger.startStatusLogging(5); // Display status every 5 minutes
    }, 3000); // Wait 3 seconds for services to initialize
    
    // Start background services that have start functions
    try {
      // News Service (RSS feeds)
      const newsService = require('./services/general/newsService');
      if (newsService.startNewsService) {
        newsService.startNewsService(2.5); // Refresh every 2.5 hours
      }
      
      // Asset News Service
      const assetNewsService = require('./services/general/assetNewsService');
      if (assetNewsService.startAssetNewsService) {
        assetNewsService.startAssetNewsService(2.5); // Refresh every 2.5 hours
      }
      
      // RSS News Service
      const rssNewsService = require('./services/general/rssNewsService');
      if (rssNewsService.startNewsService) {
        rssNewsService.startNewsService(2.5); // Refresh every 2.5 hours
      }
      
      // Ratings Service
      const ratingsService = require('./services/stocks/ratingsService');
      if (ratingsService.startRatingsService) {
        ratingsService.startRatingsService(12); // Refresh every 12 hours
      }
      
      console.log('✅ All background services started');
    } catch (serviceError) {
      console.warn('Some background services could not be started:', serviceError.message);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
})();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const assetRoutes = require('./routes/asset');
const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');
const newsRoutes = require('./routes/news');
const portfolioRoutes = require('./routes/portfolio');
const ratingsRoutes = require('./routes/ratings');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/user');
const storageRoutes = require('./routes/storage');
const youtubeRoutes = require('./routes/youtube');
const newsStreamsRoutes = require('./routes/newsStreams');
const trendingRoutes = require('./routes/trending');
const watchlistChartRoutes = require('./routes/watchlistChart');
const apiCallsRoutes = require('./routes/apiCalls');
const serviceHealthRoutes = require('./routes/serviceHealth');
const supportRoutes = require('./routes/support');
const contactRoutes = require('./routes/contact');
const filingsRoutes = require('./routes/filings');
const cryptoRoutes = require('./routes/crypto');
const imageRoutes = require('./routes/image');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/api-calls', apiCallsRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/watchlist/chart', watchlistChartRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/filings', filingsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/news-streams', newsStreamsRoutes);
app.use('/api/admin/services', serviceHealthRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/filings', filingsRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/image', imageRoutes);

// Redis client is now initialized via initRedis() above
// Individual routes and services should use the centralized Redis client from config/redis.js

// Logic: Check Cache -> Fetch API -> Store Cache
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `stock:${symbol}`;
    const { getRedisClient } = require('./config/redis');
    const redisClient = await getRedisClient();
  
    // Check if POLYGON_API_KEY is set
    if (!process.env.POLYGON_API_KEY) {
      console.error('POLYGON_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'POLYGON_API_KEY environment variable is not set' 
      });
    }
  
    // 1. Try to get data from Redis (if connected)
    try {
      if (redisClient && redisClient.isOpen) {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log("Cache Hit!");
          return res.json(JSON.parse(cachedData));
        }
      }
    } catch (redisError) {
      console.warn('Redis cache unavailable, fetching from API...');
    }
  
    // 2. Cache Miss: Fetch from Polygon.io
    try {
      const apiUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/2023-01-01/2023-12-31?apiKey=${process.env.POLYGON_API_KEY}`;
      console.log(`Fetching stock data for ${symbol}...`);
      
      const response = await axios.get(apiUrl);
      
      // Check if API returned valid data
      if (!response.data || !response.data.results) {
        return res.status(404).json({ 
          error: 'No data found', 
          message: `No stock data found for symbol: ${symbol}` 
        });
      }
      
      // 3. Save to Redis with 1-minute expiry (60 seconds) - if connected
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.setEx(cacheKey, 60, JSON.stringify(response.data.results));
        }
      } catch (redisError) {
        console.warn('Could not cache data in Redis');
      }
      
      res.json(response.data.results);
    } catch (error) {
      console.error('API Error:', error.message);
      console.error('Error details:', error.response?.data || error.message);
      
      if (error.response) {
        // API returned an error response
        return res.status(error.response.status).json({ 
          error: 'API Error', 
          message: error.response.data?.message || error.response.statusText,
          details: error.response.data
        });
      } else if (error.request) {
        // Request was made but no response received
        return res.status(503).json({ 
          error: 'Service Unavailable', 
          message: 'Could not reach the stock API. Please check your internet connection.' 
        });
      } else {
        // Something else happened
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: error.message 
        });
      }
    }
  });
  
  app.listen(3001, () => console.log("Backend on port 3001"));