const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { getRedisClient } = require('../config/redis');
const { 
  mockData, 
  logoService, 
  cryptoService, 
  cryptoPriceService,
  dividendService,
  filingsService,
  analystRatingsService
} = require('../services');
const router = express.Router();

// Protect all asset routes
router.use(verifyToken);

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// Helper function to delay requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get asset detail (current price, metadata, recent data)
router.get('/:symbol', async (req, res) => {
  try {
    // Decode the symbol to handle URL encoding (e.g., %5E for ^)
    let { symbol } = req.params;
    symbol = decodeURIComponent(symbol);
    const { range = '1M' } = req.query; // Default to 1 month

    // Check if this is a crypto symbol (format: X:SYMBOLUSD)
    const isCrypto = symbol.startsWith('X:') && symbol.endsWith('USD');
    
    // Only require POLYGON_API_KEY for non-crypto assets
    if (!USE_MOCK_DATA && !isCrypto && !process.env.POLYGON_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error', 
        message: 'POLYGON_API_KEY environment variable is not set' 
      });
    }

    // Calculate date range based on range parameter
    const getDateRange = (range) => {
      const end = new Date();
      const start = new Date();
      
      switch (range) {
        case '1D':
          start.setDate(start.getDate() - 1);
          break;
        case '5D':
          start.setDate(start.getDate() - 5);
          break;
        case '1W':
          start.setDate(start.getDate() - 7);
          break;
        case '1M':
          start.setMonth(start.getMonth() - 1);
          break;
        case '3M':
          start.setMonth(start.getMonth() - 3);
          break;
        case '6M':
          start.setMonth(start.getMonth() - 6);
          break;
        case 'YTD':
          start.setMonth(0, 1); // January 1st of current year
          break;
        case '1Y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        case '3Y':
          start.setFullYear(start.getFullYear() - 3);
          break;
        case '5Y':
          start.setFullYear(start.getFullYear() - 5);
          break;
        case '10Y':
          start.setFullYear(start.getFullYear() - 10);
          break;
        case 'MAX':
          start.setFullYear(2010, 0, 1); // Start from 2010 or earliest available
          break;
        default:
          start.setMonth(start.getMonth() - 1);
      }
      
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      };
    };

    const dateRange = getDateRange(range);

    // Check Redis cache first for historical data
    const cacheKey = `asset_data:${symbol}:${range}`;
    const CACHE_TTL = range === 'MAX' || range === '10Y' ? 60 * 60 : 5 * 60; // 1 hour for MAX/10Y, 5 min for others
    const redisClient = await getRedisClient();
    
    let historicalData = [];
    let cacheHit = false;
    
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          historicalData = parsed;
          cacheHit = true;
          console.log(`Asset data cache hit for ${symbol} (${range})`);
        }
      } catch (redisError) {
        console.warn('Redis cache read failed for asset data, continuing...');
      }
    }

    // If cache miss, fetch from database
    if (!cacheHit) {
      const dbResult = await pool.query(
        `SELECT date, open, high, low, close, volume 
         FROM asset_data 
         WHERE symbol = $1 AND date >= $2 AND date <= $3 
         ORDER BY date ASC`,
        [symbol, dateRange.start, dateRange.end]
      );

      historicalData = dbResult.rows.map(row => ({
        timestamp: new Date(row.date).getTime(),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseInt(row.volume) || 0
      }));

      // Cache in Redis
      if (redisClient && redisClient.isOpen && historicalData.length > 0) {
        try {
          await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(historicalData));
          console.log(`Asset data cached for ${symbol} (${range})`);
        } catch (e) {
          console.warn('Failed to cache asset data in Redis');
        }
      }
    }

    // 2. Get current price and metadata from API or mock
    let currentPrice = null;
    let assetInfo = null;
    let latestData = null;

    if (USE_MOCK_DATA) {
      // Use mock data
      const mockPrice = mockData.getCurrentPrice(symbol);
      currentPrice = mockPrice.price;
      latestData = {
        c: mockPrice.price,
        o: mockPrice.price - mockPrice.change,
        h: mockPrice.price * 1.01,
        l: mockPrice.price * 0.99,
        v: mockPrice.volume,
      };
      assetInfo = mockData.getMockAssetInfo(symbol);
    } else if (isCrypto) {
      // Handle crypto assets using CoinGecko
      try {
        // cryptoService already imported from services/index
        
        // Get coin ID from database
        const coinIdResult = await pool.query(
          'SELECT coin_id FROM crypto_coin_ids WHERE symbol = $1',
          [symbol]
        );
        
        if (coinIdResult.rows.length > 0) {
          const coinId = coinIdResult.rows[0].coin_id;
          const symbolMatch = symbol.match(/^X:(\w+)USD$/);
          const cryptoSymbol = symbolMatch ? symbolMatch[1] : symbol;
          
          // Fetch current price
          const priceData = await cryptoPriceService.fetchCurrentPrice(coinId, cryptoSymbol);
          if (priceData) {
            currentPrice = priceData.price;
            latestData = {
              c: priceData.price,
              o: priceData.price * (1 - (priceData.priceChange24h / 100) / 2),
              h: priceData.price * (1 + Math.abs(priceData.priceChange24h / 100) / 2),
              l: priceData.price * (1 - Math.abs(priceData.priceChange24h / 100) / 2),
              v: priceData.volume24h || 0,
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching crypto data for ${symbol}:`, error.message);
        // Continue with historical data from DB if available
      }
    } else {
      // Handle equity assets using Polygon
      try {
        // Get previous close (current price)
        const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${process.env.POLYGON_API_KEY}`;
        const prevResponse = await axios.get(prevUrl, { timeout: 10000 });
        
        if (prevResponse.data && prevResponse.data.results && prevResponse.data.results.length > 0) {
          latestData = prevResponse.data.results[0];
          currentPrice = latestData.c;
        }

        // Get asset info/ticker details
        const tickerUrl = `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${process.env.POLYGON_API_KEY}`;
        const tickerResponse = await axios.get(tickerUrl, { timeout: 10000 });
        
        if (tickerResponse.data && tickerResponse.data.results) {
          assetInfo = tickerResponse.data.results;
        }
      } catch (error) {
        console.error(`Error fetching current data for ${symbol}:`, error.message);
        // Continue with historical data from DB if available
      }
    }

    // 3. If we don't have enough historical data in DB, fetch from API/mock and store in DB
    // Fetch if we have no data or very little data for the requested range
    const minDataPoints = range === '1D' ? 1 : range === '1W' ? 5 : range === '1M' ? 20 : 
                          range === '3M' ? 60 : range === '6M' ? 120 : range === '1Y' ? 250 : 
                          range === '5Y' ? 1250 : 20;
    
    if (historicalData.length < minDataPoints) {
      try {
        if (USE_MOCK_DATA) {
          // Generate mock historical data based on range (fallback only)
          const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : 
                      range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 
                      range === '5Y' ? 1825 : 30;
          
          // Generate historical data
          const mockHistorical = mockData.generateHistoricalData(symbol, days);
          
          // Store in database
          for (const result of mockHistorical) {
            const date = new Date(result.timestamp);
            const dateStr = date.toISOString().split('T')[0];
            
            await pool.query(
              `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (symbol, date) 
               DO UPDATE SET 
                 open = EXCLUDED.open,
                 high = EXCLUDED.high,
                 low = EXCLUDED.low,
                 close = EXCLUDED.close,
                 volume = EXCLUDED.volume,
                 adjusted_close = EXCLUDED.adjusted_close`,
              [
                symbol,
                dateStr,
                result.open,
                result.high,
                result.low,
                result.close,
                result.volume,
                result.close
              ]
            );
          }

          // Now fetch from DB to get all data (including any existing)
          const dbResult = await pool.query(
            `SELECT date, open, high, low, close, volume 
             FROM asset_data 
             WHERE symbol = $1 AND date >= $2 AND date <= $3 
             ORDER BY date ASC`,
            [symbol, dateRange.start, dateRange.end]
          );

          historicalData = dbResult.rows.map(row => ({
            timestamp: new Date(row.date).getTime(),
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseInt(row.volume) || 0
          }));
        } else if (isCrypto) {
          // Handle crypto historical data using CoinGecko
          try {
            // cryptoPriceService already imported from services/index
            
            // Get coin ID from database
            const coinIdResult = await pool.query(
              'SELECT coin_id FROM crypto_coin_ids WHERE symbol = $1',
              [symbol]
            );
            
            if (coinIdResult.rows.length > 0) {
              const coinId = coinIdResult.rows[0].coin_id;
              const symbolMatch = symbol.match(/^X:(\w+)USD$/);
              const cryptoSymbol = symbolMatch ? symbolMatch[1] : symbol;
              
              const startDate = new Date(dateRange.start);
              const endDate = new Date(dateRange.end);
              
              // Fetch historical prices
              const cryptoHistorical = await cryptoPriceService.fetchHistoricalPrices(
                coinId,
                cryptoSymbol,
                startDate,
                endDate
              );
              
              if (cryptoHistorical && cryptoHistorical.length > 0) {
                // Store in database
                await cryptoPriceService.storeHistoricalPrices(symbol, cryptoHistorical);
                
                // Update historical data
                historicalData = cryptoHistorical.map(point => ({
                  timestamp: new Date(point.date).getTime(),
                  open: parseFloat(point.open),
                  high: parseFloat(point.high),
                  low: parseFloat(point.low),
                  close: parseFloat(point.close),
                  volume: parseInt(point.volume) || 0
                }));
              }
            }
          } catch (error) {
            console.error(`Error fetching crypto historical data for ${symbol}:`, error.message);
            // Use DB data if available
          }
        } else {
          // Handle equity/index historical data using Polygon
          await delay(500); // Rate limit delay
          
          try {
            const apiUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${dateRange.start}/${dateRange.end}?apiKey=${process.env.POLYGON_API_KEY}`;
            console.log(`Fetching historical data from Polygon for ${symbol}...`);
            const apiResponse = await axios.get(apiUrl, { timeout: 15000 });
            
            if (apiResponse.data && apiResponse.data.results && apiResponse.data.results.length > 0) {
              console.log(`✅ Got ${apiResponse.data.results.length} data points from Polygon for ${symbol}`);
            // Store in database
            for (const result of apiResponse.data.results) {
              const date = new Date(result.t);
              const dateStr = date.toISOString().split('T')[0];
              
              // Insert or update in database
              await pool.query(
                `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (symbol, date) 
                 DO UPDATE SET 
                   open = EXCLUDED.open,
                   high = EXCLUDED.high,
                   low = EXCLUDED.low,
                   close = EXCLUDED.close,
                   volume = EXCLUDED.volume,
                   adjusted_close = EXCLUDED.adjusted_close`,
                [
                  symbol,
                  dateStr,
                  result.o, // open
                  result.h, // high
                  result.l, // low
                  result.c, // close
                  result.v || 0, // volume
                  result.c // adjusted close (using close if not available)
                ]
              );
            }

              // Update historical data from API response
              historicalData = apiResponse.data.results.map(result => ({
                timestamp: result.t,
                open: result.o,
                high: result.h,
                low: result.l,
                close: result.c,
                volume: result.v || 0
              }));
            } else {
              console.warn(`⚠️ Polygon API returned no results for ${symbol}. Response:`, apiResponse.data);
            }
          } catch (apiError) {
            console.error(`❌ Error fetching from Polygon API for ${symbol}:`, apiError.response?.status, apiError.response?.data?.error || apiError.message);
            // If API fails and we have no data, try generating mock data as fallback
            if (historicalData.length === 0 && USE_MOCK_DATA) {
              console.log(`🔄 Generating mock data as fallback for ${symbol}...`);
              const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : 
                          range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 
                          range === '5Y' ? 1825 : range === '10Y' ? 3650 : 30;
              const mockHistorical = mockData.generateHistoricalData(symbol, days);
              historicalData = mockHistorical.map(result => ({
                timestamp: result.timestamp,
                open: result.open,
                high: result.high,
                low: result.low,
                close: result.close,
                volume: result.volume || 0
              }));
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
        // Use DB data if available, even if limited
        // If no DB data and USE_MOCK_DATA, generate mock data
        if (historicalData.length === 0 && USE_MOCK_DATA) {
          const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : 
                      range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 
                      range === '5Y' ? 1825 : range === '10Y' ? 3650 : 30;
          const mockHistorical = mockData.generateHistoricalData(symbol, days);
          historicalData = mockHistorical.map(result => ({
            timestamp: result.timestamp,
            open: result.open,
            high: result.high,
            low: result.low,
            close: result.close,
            volume: result.volume || 0
          }));
        }
      }
    } else {
      // We have data from DB, log for debugging
      console.log(`✅ Using ${historicalData.length} data points from database for ${symbol} (${range} range)`);
    }

    // 4. Update or insert asset info
    if (assetInfo) {
      await pool.query(
        `INSERT INTO asset_info (symbol, name, type, exchange, currency, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          assetInfo.name || assetInfo.name,
          assetInfo.type || assetInfo.type,
          assetInfo.primary_exchange || assetInfo.exchange || assetInfo.market || '',
          assetInfo.currency_name || assetInfo.currency || 'USD'
        ]
      );
    }

    // 5. Get asset info from DB
    const infoResult = await pool.query(
      'SELECT *, logo_url, category FROM asset_info WHERE symbol = $1',
      [symbol]
    );

    const { normalizeCategory, determineCategory } = require('../utils/categoryUtils');
    const assetMetadata = infoResult.rows[0] || {
      symbol,
      name: symbol,
      type: 'stock',
      exchange: '',
      currency: 'USD',
      category: null
    };
    
    // Ensure category is set
    const category = assetMetadata.category || normalizeCategory(determineCategory(symbol, assetMetadata.type, assetMetadata.exchange)) || 'Unknown';

    // Calculate price change if we have latest data
    let priceChange = 0;
    let priceChangePercent = 0;
    
    // If we have historical data but no current price from API, use the latest close as current price
    if (!currentPrice && historicalData.length > 0) {
      currentPrice = historicalData[historicalData.length - 1].close;
    }
    
    if (historicalData.length > 0) {
      const latestClose = historicalData[historicalData.length - 1].close;
      const previousClose = historicalData.length > 1 ? historicalData[historicalData.length - 2].close : latestClose;
      
      if (currentPrice) {
        priceChange = currentPrice - previousClose;
        priceChangePercent = previousClose !== 0 ? ((priceChange / previousClose) * 100) : 0;
      } else {
        // Use latest vs previous day
        priceChange = latestClose - previousClose;
        priceChangePercent = previousClose !== 0 ? ((priceChange / previousClose) * 100) : 0;
        currentPrice = latestClose;
      }
    }

    // Get or fetch logo
    let logoUrl = assetMetadata.logo_url;
    if (!logoUrl) {
      // Try to fetch logo asynchronously (don't block response)
      logoService.getAssetLogo(symbol, assetMetadata.type, assetMetadata.name)
        .then(url => {
          if (url) {
            // Logo will be available on next request
            console.log(`Logo fetched for ${symbol}: ${url}`);
          }
        })
        .catch(err => {
          console.log(`Could not fetch logo for ${symbol}:`, err.message);
        });
    }

    res.json({
      symbol,
      name: assetMetadata.name,
      type: assetMetadata.type,
      category: category,
      exchange: assetMetadata.exchange,
      currency: assetMetadata.currency,
      logoUrl: logoUrl || null,
      currentPrice,
      priceChange,
      priceChangePercent,
      historicalData,
      metadata: {
        marketCap: assetMetadata.market_cap,
        peRatio: assetMetadata.pe_ratio,
        dividendYield: assetMetadata.dividend_yield
      }
    });
  } catch (error) {
    console.error('Asset detail error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get dividends for an asset
router.get('/:symbol/dividends', async (req, res) => {
  try {
    const { symbol } = req.params;
    // dividendService already imported from services/index

    // Fetch and sync dividends
    const dividends = await dividendService.fetchAndSyncDividends(symbol);
    
    // Get statistics
    const stats = await dividendService.getDividendStats(symbol);

    res.json({
      symbol,
      dividends,
      statistics: stats,
    });
  } catch (error) {
    console.error('Dividends error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get filings for an asset
router.get('/:symbol/filings', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type, search, sortOrder } = req.query; // Optional: filter by filing type, search, sort order
    // filingsService already imported from services/index

    // Fetch and sync filings
    let filings = await filingsService.fetchAndSyncFilings(symbol);
    
    // Filter by type if provided
    if (type) {
      filings = filings.filter(f => f.filingType === type);
    }
    
    // Filter by search query if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filings = filings.filter(f => 
        f.filingType.toLowerCase().includes(searchLower) ||
        (f.description && f.description.toLowerCase().includes(searchLower)) ||
        (f.formType && f.formType.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by date
    const order = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    filings.sort((a, b) => {
      const dateA = new Date(a.filingDate).getTime();
      const dateB = new Date(b.filingDate).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    // Get statistics
    const stats = await filingsService.getFilingsStats(symbol);

    res.json({
      symbol,
      filings: filings,
      statistics: stats,
    });
  } catch (error) {
    console.error('Filings error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get analyst ratings for an asset
router.get('/:symbol/ratings', async (req, res) => {
  try {
    const { symbol } = req.params;
    // analystRatingsService already imported from services/index

    // Fetch and sync ratings
    const ratings = await analystRatingsService.fetchAndSyncRatings(symbol);

    res.json(ratings);
  } catch (error) {
    console.error('Ratings error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Get logo for an asset
router.get('/:symbol/logo', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get asset info
    const infoResult = await pool.query(
      'SELECT logo_url, type, name FROM asset_info WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    if (infoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const assetInfo = infoResult.rows[0];
    
    // If logo exists, return it
    if (assetInfo.logo_url) {
      return res.json({ logoUrl: assetInfo.logo_url });
    }

    // Try to fetch logo
    const logoUrl = await logoService.getAssetLogo(
      symbol.toUpperCase(),
      assetInfo.type,
      assetInfo.name
    );

    res.json({ logoUrl: logoUrl || null });
  } catch (error) {
    console.error('Logo fetch error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;

