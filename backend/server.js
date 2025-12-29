require('dotenv').config();
const express = require('express');
const cors = require('cors');
const redis = require('redis');
const axios = require('axios');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const marketRoutes = require('./routes/market');
const assetRoutes = require('./routes/asset');
const watchlistRoutes = require('./routes/watchlist');
const portfolioRoutes = require('./routes/portfolio');
const newsRoutes = require('./routes/news');
const userRoutes = require('./routes/user');
const ratingsRoutes = require('./routes/ratings');

// Determine if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// Log environment info
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Using Mock Data: ${USE_MOCK_DATA ? '✅ YES' : '❌ NO (Real API)'}`);
if (USE_MOCK_DATA) {
  console.log('📊 Mock data service is active - no API key required');
} else {
  console.log('🌐 Using Polygon.io API - POLYGON_API_KEY required');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// Start news background services
const newsService = require('./services/newsService');
const assetNewsService = require('./services/assetNewsService');
const ratingsService = require('./services/ratingsService');

// Start category-based news service (market, crypto, world, US)
newsService.startNewsService(2.5); // Refresh every 2.5 hours

// Start asset-specific news service (for individual assets)
assetNewsService.startAssetNewsService(2.5); // Refresh every 2.5 hours

// Start ratings service (refreshes analyst ratings)
ratingsService.startRatingsService(12); // Refresh every 12 hours

const client = redis.createClient({ url: 'redis://localhost:6379' });
client.connect().catch((err) => {
  console.error('Redis connection error:', err.message);
  console.warn('Continuing without Redis cache...');
});

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Search routes
app.use('/api/search', searchRoutes);

// Market routes
app.use('/api/market', marketRoutes);

// Asset routes
app.use('/api/asset', assetRoutes);

// Watchlist routes
app.use('/api/watchlist', watchlistRoutes);

// Portfolio routes
app.use('/api/portfolio', portfolioRoutes);

// News routes
app.use('/api/news', newsRoutes);

// User routes
app.use('/api/user', userRoutes);

// Ratings routes
app.use('/api/ratings', ratingsRoutes);

// Logic: Check Cache -> Fetch API -> Store Cache
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `stock:${symbol}`;
  
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
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log("Cache Hit!");
        return res.json(JSON.parse(cachedData));
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
        await client.setEx(cacheKey, 60, JSON.stringify(response.data.results));
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