const express = require('express');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');
const { pool } = require('../db');
const mockData = require('../services/utils/mockData');
const { trendingAssetsService } = require('../services');
const router = express.Router();

// Protect all search routes
router.use(verifyToken);

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// Search/autocomplete endpoint for stocks, crypto, etc.
router.get('/autocomplete', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 1) {
      return res.json({ results: [] });
    }

    if (USE_MOCK_DATA) {
      // First, try to search the database for real assets
      try {
        const searchQuery = `%${query}%`;
        const dbResult = await pool.query(
          `SELECT symbol, name, type, category, exchange, currency 
           FROM asset_info 
           WHERE (LOWER(symbol) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($1))
           ORDER BY 
             CASE WHEN LOWER(symbol) = LOWER($2) THEN 1
                  WHEN LOWER(symbol) LIKE LOWER($2 || '%') THEN 2
                  WHEN LOWER(name) LIKE LOWER($2 || '%') THEN 3
                  ELSE 4 END,
             symbol
           LIMIT 10`,
          [searchQuery, query]
        );

        if (dbResult.rows.length > 0) {
          const { normalizeCategory, determineCategory } = require('../utils/categoryUtils');
          const results = dbResult.rows.map(row => {
            const category = normalizeCategory(row.category || determineCategory(row.symbol, row.type, row.exchange) || 'Unknown');
            const result = {
              symbol: row.symbol,
              name: row.name || row.symbol,
              category: category, // Include category in response
              market: row.type === 'crypto' ? 'crypto' : row.type === 'index' ? 'indices' : 'stocks',
              type: row.type === 'crypto' ? 'crypto' : row.type === 'index' ? 'index' : row.type === 'commodity' ? 'commodity' : 'CS',
              exchange: row.exchange || '',
              currency: row.currency || 'USD'
            };
            
            // Track search for trending assets (async, don't wait)
            trendingAssetsService.trackAssetSearch(row.symbol).catch(err => {
              console.error('Error tracking asset search:', err);
            });
            
            return result;
          });
          return res.json({ results });
        }
      } catch (dbError) {
        console.error('Database search error:', dbError.message);
        // Fall through to mock data
      }

      // Fallback to mock search results if database search fails or returns no results
      const mockResults = mockData.getMockSearchResults(query);
      const results = mockResults.map(ticker => ({
        symbol: ticker.symbol,
        name: ticker.name,
        market: ticker.market,
        type: ticker.type || 'stock',
        exchange: ticker.exchange,
        currency: 'USD'
      }));
      return res.json({ results });
    }

    // Use Polygon.io ticker search API
    if (!process.env.POLYGON_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'POLYGON_API_KEY environment variable is not set' 
      });
    }

    try {
      // Search for tickers matching the query
      const searchUrl = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&limit=10&apiKey=${process.env.POLYGON_API_KEY}`;
      
      const response = await axios.get(searchUrl);

      if (!response.data || !response.data.results) {
        return res.json({ results: [] });
      }

      // Format results
      const results = response.data.results.map(ticker => ({
        symbol: ticker.ticker,
        name: ticker.name,
        market: ticker.market,
        type: ticker.type || 'stock',
        exchange: ticker.primary_exchange || ticker.market,
        currency: ticker.currency_name || 'USD'
      }));

      res.json({ results });
    } catch (error) {
      console.error('Search API Error:', error.message);
      
      // Fallback: Return empty results if API fails
      res.json({ results: [] });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

