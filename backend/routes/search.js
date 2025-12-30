const express = require('express');
const axios = require('axios');
const mockData = require('../services/utils/mockData');
const router = express.Router();

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
      // Use mock search results
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

