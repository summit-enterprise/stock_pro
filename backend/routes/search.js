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
        const queryLower = query.toLowerCase();
        
        // Search stocks/ETFs from stock_data and crypto/indices from asset_info
        const dbResult = await pool.query(
          `-- Search stocks/ETFs from stock_data
           SELECT 
             sd.ticker as symbol,
             sd.name,
             sd.acronym as ticker_symbol,
             sd.name as display_name,
             sd.type,
             CASE WHEN sd.type IN ('ETF', 'ETP') THEN 'ETF' 
                  WHEN sd.type IN ('ADRC', 'ADRW', 'ADRR') THEN 'ADR'
                  ELSE 'Equity' END as category,
             sd.primary_exchange as exchange,
             sd.currency_name as currency
           FROM stock_data sd
           WHERE sd.active = true
             AND (
               LOWER(sd.ticker) LIKE LOWER($1)
               OR LOWER(sd.name) LIKE LOWER($1)
               OR LOWER(COALESCE(sd.acronym, '')) LIKE LOWER($1)
             )
             -- Exclude fake/mock assets
             AND sd.name !~* 'Tech Company \d+'
             AND sd.name !~* 'Finance Company \d+'
             AND sd.name !~* 'Healthcare Company \d+'
             AND sd.name !~* 'Consumer Company \d+'
             AND sd.name !~* 'Industrial Company \d+'
             AND sd.name !~* 'Energy Company \d+'
             AND sd.name !~* '^ETF \d+'
             AND sd.name !~* '^CRYPTO\d+'
             AND sd.name !~* '^AI \d+ Inc\.?$'
             AND sd.name !~* '^AI\d+$'
             AND sd.name !~* '^AA\d+$'
             AND sd.ticker !~* '^FN[A-Z]\d+$'
             AND sd.ticker !~* '^HC[A-Z]\d+$'
             AND sd.ticker !~* '^CS[A-Z]\d+$'
             AND sd.ticker !~* '^IN[A-Z]\d+$'
             AND sd.ticker !~* '^EN[A-Z]\d+$'
           
           UNION ALL
           
           -- Search crypto/indices from asset_info
           SELECT 
             ai.symbol,
             ai.name,
             ai.ticker_symbol,
             ai.display_name,
             ai.type,
             ai.category,
             ai.exchange,
             ai.currency
           FROM asset_info ai
           WHERE (
             LOWER(ai.symbol) LIKE LOWER($1)
             OR LOWER(ai.name) LIKE LOWER($1)
             OR LOWER(COALESCE(ai.ticker_symbol, '')) LIKE LOWER($1)
             OR LOWER(COALESCE(ai.display_name, '')) LIKE LOWER($1)
           )
             AND (ai.type = 'crypto' OR ai.symbol LIKE '^%' OR ai.symbol LIKE 'X:%')
             -- Exclude fake/mock assets
             AND ai.name !~* 'Tech Company \d+'
             AND ai.name !~* 'Finance Company \d+'
             AND ai.name !~* 'Healthcare Company \d+'
             AND ai.name !~* 'Consumer Company \d+'
             AND ai.name !~* 'Industrial Company \d+'
             AND ai.name !~* 'Energy Company \d+'
             AND ai.name !~* '^ETF \d+'
             AND ai.name !~* '^CRYPTO\d+'
             AND ai.name !~* '^AI \d+ Inc\.?$'
             AND ai.name !~* '^AI\d+$'
             AND ai.name !~* '^AA\d+$'
             AND ai.symbol !~* '^FN[A-Z]\d+$'
             AND ai.symbol !~* '^HC[A-Z]\d+$'
             AND ai.symbol !~* '^CS[A-Z]\d+$'
             AND ai.symbol !~* '^IN[A-Z]\d+$'
             AND ai.symbol !~* '^EN[A-Z]\d+$'
           
           ORDER BY 
             -- Exact matches first
             CASE 
               WHEN LOWER(COALESCE(ticker_symbol, symbol)) = $2 THEN 1
               WHEN LOWER(symbol) = $2 THEN 2
               WHEN LOWER(COALESCE(display_name, name)) = $2 THEN 3
               -- Starts with matches
               WHEN LOWER(COALESCE(ticker_symbol, symbol)) LIKE $2 || '%' THEN 4
               WHEN LOWER(symbol) LIKE $2 || '%' THEN 5
               WHEN LOWER(COALESCE(display_name, name)) LIKE $2 || '%' THEN 6
               -- Contains matches
               ELSE 7
             END,
             symbol
           LIMIT 10`,
          [searchQuery, queryLower]
        );

        const { normalizeCategory, determineCategory } = require('../utils/categoryUtils');
        const results = dbResult.rows.map(row => {
          const category = normalizeCategory(row.category || determineCategory(row.symbol, row.type, row.exchange) || 'Unknown');
          const result = {
            symbol: row.symbol,
            name: row.display_name || row.name || row.symbol,
            ticker: row.ticker_symbol || row.symbol,
            category: category,
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
      } catch (dbError) {
        console.error('Database search error:', dbError.message);
        // Return empty results instead of mock data - only real assets allowed
        return res.json({ results: [] });
      }
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

