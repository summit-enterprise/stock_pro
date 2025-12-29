const express = require('express');
const axios = require('axios');
const { pool } = require('../db');
const mockData = require('../services/mockData');
const router = express.Router();

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// Helper function to delay requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get asset detail (current price, metadata, recent data)
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1M' } = req.query; // Default to 1 month

    if (!USE_MOCK_DATA && !process.env.POLYGON_API_KEY) {
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
        case '1Y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        case '5Y':
          start.setFullYear(start.getFullYear() - 5);
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

    // 1. ALWAYS check database for historical data first (we have 5 years of data!)
    let historicalData = [];
    
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
    } else {
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
    // Only fetch if we have less than 10 days of data (shouldn't happen with our populated DB)
    if (historicalData.length < 10) {
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
        } else {
          await delay(500); // Rate limit delay
          
          const apiUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${dateRange.start}/${dateRange.end}?apiKey=${process.env.POLYGON_API_KEY}`;
          const apiResponse = await axios.get(apiUrl, { timeout: 10000 });
          
          if (apiResponse.data && apiResponse.data.results) {
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
          }
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
        // Use DB data if available, even if limited
      }
    } else {
      // We have data from DB, log for debugging
      console.log(`✅ Using ${historicalData.length} data points from database for ${symbol} (${range} range)`);
    }

    // 4. Update or insert asset info
    if (assetInfo) {
      // Determine category based on type
      const assetType = (assetInfo.type || assetInfo.type || '').toLowerCase();
      let category = 'equities'; // default
      
      if (assetType.includes('crypto') || symbol.startsWith('X:') && symbol.includes('BTC') || symbol.includes('ETH')) {
        category = 'crypto';
      } else if (assetType.includes('commodity') || symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('CL') || symbol.includes('NG')) {
        category = 'commodities';
      } else if (assetType.includes('forex') || ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'].includes(symbol)) {
        category = 'forex';
      } else if (assetType.includes('etf') || assetType.includes('index')) {
        category = 'equities'; // ETFs and indices are still equities for ratings
      } else if (assetType.includes('stock') || assetType === 'cs' || !assetType) {
        category = 'equities';
      } else {
        category = 'alternatives';
      }

      await pool.query(
        `INSERT INTO asset_info (symbol, name, type, category, exchange, currency, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          assetInfo.name || assetInfo.name,
          assetInfo.type || assetInfo.type,
          category,
          assetInfo.primary_exchange || assetInfo.exchange || assetInfo.market || '',
          assetInfo.currency_name || assetInfo.currency || 'USD'
        ]
      );
    }

    // 5. Get asset info from DB
    const infoResult = await pool.query(
      'SELECT * FROM asset_info WHERE symbol = $1',
      [symbol]
    );

    const assetMetadata = infoResult.rows[0] || {
      symbol,
      name: symbol,
      type: 'stock',
      category: 'equities',
      exchange: '',
      currency: 'USD'
    };

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

    res.json({
      symbol,
      name: assetMetadata.name,
      type: assetMetadata.type,
      category: assetMetadata.category || 'equities',
      exchange: assetMetadata.exchange,
      currency: assetMetadata.currency,
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

module.exports = router;

