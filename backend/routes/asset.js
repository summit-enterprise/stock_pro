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
      end.setHours(23, 59, 59, 999); // End of today
      const start = new Date();
      
      switch (range) {
        case '1D':
          // TODAY: 12am-11pm
          start.setHours(0, 0, 0, 0);
          break;
        case '7D':
          // Today + 6 previous days (7 days total including today)
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          break;
        case '1M':
          // Exactly 1 month ago to today
          start.setMonth(start.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          break;
        case '3M':
          // Exactly 3 months ago to today
          start.setMonth(start.getMonth() - 3);
          start.setHours(0, 0, 0, 0);
          break;
        case '6M':
          // Exactly 6 months ago to today
          start.setMonth(start.getMonth() - 6);
          start.setHours(0, 0, 0, 0);
          break;
        case 'YTD':
          // Year to date: January 1st of current year to today
          start.setFullYear(start.getFullYear(), 0, 1);
          start.setHours(0, 0, 0, 0);
          break;
        case '3Y':
          // Exactly 3 years ago to today
          start.setFullYear(start.getFullYear() - 3);
          start.setHours(0, 0, 0, 0);
          break;
        case '5Y':
          // Exactly 5 years ago to today
          start.setFullYear(start.getFullYear() - 5);
          start.setHours(0, 0, 0, 0);
          break;
        case 'MAX':
          // 10 years of data
          start.setUTCFullYear(start.getUTCFullYear() - 10);
          start.setHours(0, 0, 0, 0);
          break;
        default:
          // Default to 1 month
          start.setMonth(start.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
      }
      
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        startTimestamp: start.toISOString(),
        endTimestamp: end.toISOString()
      };
    };

    const dateRange = getDateRange(range);

    // Check Redis cache first for historical data
    // For 1D, check today's daily record cache
    // For other ranges, check general asset_data cache
    const redisClient = await getRedisClient();
    let historicalData = [];
    let cacheHit = false;
    
    if (redisClient && redisClient.isOpen) {
      try {
        if (range === '1D') {
          // For 1D, check hourly data cache
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          
          // Check for hourly data cache first
          const hourlyCacheKey = `hourly_data:${symbol}:${todayStr}`;
          const hourlyCachedData = await redisClient.get(hourlyCacheKey);
          
          if (hourlyCachedData) {
            const parsed = JSON.parse(hourlyCachedData);
            // Transform hourly data to chart format
            historicalData = Array.isArray(parsed) ? parsed.map(point => ({
              timestamp: point.timestamp ? new Date(point.timestamp).getTime() : new Date(point.date).getTime(),
              date: point.date,
              open: parseFloat(point.open),
              high: parseFloat(point.high),
              low: parseFloat(point.low),
              close: parseFloat(point.close),
              volume: parseFloat(point.volume) || 0,
            })) : [];
            cacheHit = true;
            console.log(`Hourly data cache hit for ${symbol} (1D - ${todayStr})`);
          } else {
            // Fallback to general asset_data cache
            const cacheKey = `asset_data:${symbol}:${range}`;
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              historicalData = Array.isArray(parsed) ? parsed : [parsed];
              cacheHit = true;
              console.log(`Asset data cache hit for ${symbol} (${range})`);
            }
          }
        } else {
          // For other ranges, check general asset_data cache
          const cacheKey = `asset_data:${symbol}:${range}`;
          const cachedData = await redisClient.get(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            historicalData = parsed;
            cacheHit = true;
            console.log(`Asset data cache hit for ${symbol} (${range})`);
          }
        }
      } catch (redisError) {
        console.warn('Redis cache read failed for asset data, continuing...');
      }
    }

    // If cache miss, fetch from database
    if (!cacheHit) {
      try {
        // Check if timestamp column exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'asset_data' 
            AND column_name = 'timestamp';
        `);
        const hasTimestampColumn = columnCheck.rows.length > 0;
        
        let dbResult;
        
        if (range === '1D') {
          // For 1D, fetch hourly data for today (or last market date) from 12am to 11:59pm
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          
          // Get the most recent date that has hourly data
          const mostRecentDateResult = await pool.query(
            `SELECT DISTINCT date
             FROM asset_data 
             WHERE symbol = $1 
               AND timestamp IS NOT NULL
             ORDER BY date DESC
             LIMIT 1`,
            [symbol]
          );
          
          let targetDateStr = todayStr;
          if (mostRecentDateResult.rows.length > 0) {
            targetDateStr = mostRecentDateResult.rows[0].date;
          }
          
          // Fetch all hourly data for that date (12am to 11:59pm)
          const dayStart = new Date(targetDateStr);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(targetDateStr);
          dayEnd.setHours(23, 59, 59, 999);
          
          dbResult = await pool.query(
            `SELECT date, timestamp, open, high, low, close, volume, adjusted_close
             FROM asset_data 
             WHERE symbol = $1 
               AND date = $2
               AND timestamp IS NOT NULL
               AND timestamp >= $3
               AND timestamp <= $4
             ORDER BY timestamp ASC`,
            [symbol, targetDateStr, dayStart.toISOString(), dayEnd.toISOString()]
          );
          
          // If no hourly data, fallback to daily record
          if (dbResult.rows.length === 0) {
            dbResult = await pool.query(
              `SELECT date, timestamp, open, high, low, close, volume, adjusted_close
               FROM asset_data 
               WHERE symbol = $1 
               AND timestamp IS NULL
               ORDER BY date DESC
               LIMIT 1`,
              [symbol]
            );
          }
          
          // Cache hourly data in Redis
          if (dbResult.rows.length > 0 && redisClient && redisClient.isOpen) {
            const hourlyData = dbResult.rows.map(row => ({
              timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : null,
              date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
              open: parseFloat(row.open),
              high: parseFloat(row.high),
              low: parseFloat(row.low),
              close: parseFloat(row.close),
              volume: parseFloat(row.volume) || 0,
            }));
            const hourlyCacheKey = `hourly_data:${symbol}:${targetDateStr}`;
            await redisClient.setEx(hourlyCacheKey, 24 * 60 * 60, JSON.stringify(hourlyData)); // 24 hour TTL
          }
        } else if (hasTimestampColumn) {
          // Fetch daily data only (timestamp IS NULL for daily records)
          // For 7D, we need to ensure we get all 7 days including weekends
          if (range === '7D') {
            // First, get existing daily data
            dbResult = await pool.query(
              `SELECT date, timestamp, open, high, low, close, volume 
               FROM asset_data 
               WHERE symbol = $1 
                 AND date >= $2 
                 AND date <= $3 
                 AND timestamp IS NULL
               ORDER BY date ASC`,
              [symbol, dateRange.start, dateRange.end]
            );
            
            // Generate missing days (including weekends) with flat prices
            const existingDates = new Set(dbResult.rows.map(row => row.date.toISOString().split('T')[0]));
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            const missingDays = [];
            
            // Get the last trading day's close price to use for weekends
            let lastClosePrice = null;
            if (dbResult.rows.length > 0) {
              // Sort by date descending to get most recent trading day
              const sortedRows = [...dbResult.rows].sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                return dateB - dateA;
              });
              lastClosePrice = parseFloat(sortedRows[0].close);
            } else {
              // No existing data in range, try to get most recent data from database
              const recentResult = await pool.query(
                `SELECT close FROM asset_data 
                 WHERE symbol = $1 
                   AND timestamp IS NULL
                 ORDER BY date DESC 
                 LIMIT 1`,
                [symbol]
              );
              if (recentResult.rows.length > 0) {
                lastClosePrice = parseFloat(recentResult.rows[0].close);
              } else {
                // No data at all, use base price
                const { BASE_PRICES } = require('../services/utils/mockData');
                lastClosePrice = BASE_PRICES[symbol] || 100.00;
              }
            }
            
            // Track the last trading day's close as we iterate through days
            let currentLastClose = lastClosePrice;
            
            // Check if asset is crypto (crypto trades on weekends)
            const { determineCategory } = require('../utils/categoryUtils');
            const assetInfo = await pool.query('SELECT category FROM asset_info WHERE symbol = $1', [symbol]);
            const isCryptoAsset = assetInfo.rows.length > 0 && 
              (assetInfo.rows[0].category === 'Crypto' || symbol.startsWith('X:'));
            
            // Generate data for 7 days
            // For crypto: include all days (including weekends)
            // For non-crypto: only trading days (skip weekends)
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const dayOfWeek = d.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              
              // Skip weekends for non-crypto assets
              if (!isCryptoAsset && isWeekend) {
                continue;
              }
              
              if (!existingDates.has(dateStr)) {
                // Missing day
                if (isWeekend && isCryptoAsset) {
                  // Weekend for crypto: continue trading with price movement
                  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
                  const change = (Math.random() * 2 - 1) * volatility;
                  const open = currentLastClose;
                  const close = open * (1 + change);
                  const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
                  const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
                  
                  currentLastClose = close;
                  
                  missingDays.push({
                    date: new Date(d),
                    timestamp: null,
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat(high.toFixed(2)),
                    low: parseFloat(low.toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                    volume: Math.floor((mockData.generateVolume || require('../services/utils/mockData').generateVolume)(symbol, close))
                  });
                } else {
                  // Trading day: use last close as open, generate small movement
                  const volatility = 0.01; // Small volatility for missing trading days
                  const change = (Math.random() * 2 - 1) * volatility;
                  const open = currentLastClose;
                  const close = open * (1 + change);
                  const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
                  const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
                  
                  currentLastClose = close; // Update for next day
                  
                  missingDays.push({
                    date: new Date(d),
                    timestamp: null,
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat(high.toFixed(2)),
                    low: parseFloat(low.toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                    volume: Math.floor((mockData.generateVolume || require('../services/utils/mockData').generateVolume)(symbol, close))
                  });
                }
              } else {
                // Day exists in database, update last close price for next iteration
                const existingRow = dbResult.rows.find(row => {
                  const rowDate = row.date instanceof Date ? row.date : new Date(row.date);
                  return rowDate.toISOString().split('T')[0] === dateStr;
                });
                if (existingRow && !isWeekend) {
                  currentLastClose = parseFloat(existingRow.close);
                }
              }
            }
            
            // Combine existing and missing days, sort by date
            const allDays = [...dbResult.rows, ...missingDays].sort((a, b) => {
              const dateA = a.date instanceof Date ? a.date : new Date(a.date);
              const dateB = b.date instanceof Date ? b.date : new Date(b.date);
              return dateA - dateB;
            });
            
            dbResult = { rows: allDays };
          } else {
            // For other ranges, fetch normally
            dbResult = await pool.query(
              `SELECT date, timestamp, open, high, low, close, volume 
               FROM asset_data 
               WHERE symbol = $1 
                 AND date >= $2 
                 AND date <= $3 
                 AND timestamp IS NULL
               ORDER BY date ASC`,
              [symbol, dateRange.start, dateRange.end]
            );
          }
        } else {
          // Fallback: timestamp column doesn't exist, fetch all data
          dbResult = await pool.query(
            `SELECT date, open, high, low, close, volume 
             FROM asset_data 
             WHERE symbol = $1 
               AND date >= $2 
               AND date <= $3 
             ORDER BY date ASC`,
            [symbol, dateRange.start, dateRange.end]
          );
        }

        historicalData = dbResult.rows.map(row => {
          // Use timestamp if available (hourly data), otherwise use date (daily data)
          const timestamp = row.timestamp ? new Date(row.timestamp).getTime() : new Date(row.date).getTime();
          return {
            timestamp: timestamp,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseInt(row.volume) || 0
          };
        });
      } catch (dbError) {
        console.error(`Database query error for ${symbol}:`, dbError);
        // If query fails, try a simpler query without timestamp filtering
        try {
          const fallbackResult = await pool.query(
            `SELECT date, timestamp, open, high, low, close, volume 
             FROM asset_data 
             WHERE symbol = $1 
               AND date >= $2 
               AND date <= $3 
             ORDER BY date ASC, COALESCE(timestamp, '1970-01-01'::timestamp) ASC`,
            [symbol, dateRange.start, dateRange.end]
          );
          
          console.log(`Fallback query succeeded for ${symbol}, got ${fallbackResult.rows.length} rows`);
          historicalData = fallbackResult.rows.map(row => {
            const timestamp = row.timestamp ? new Date(row.timestamp).getTime() : new Date(row.date).getTime();
            return {
              timestamp: timestamp,
              open: parseFloat(row.open),
              high: parseFloat(row.high),
              low: parseFloat(row.low),
              close: parseFloat(row.close),
              volume: parseInt(row.volume) || 0
            };
          });
        } catch (fallbackError) {
          console.error(`Fallback query also failed for ${symbol}:`, fallbackError);
          console.error(`Fallback error details:`, {
            message: fallbackError.message,
            code: fallbackError.code,
            detail: fallbackError.detail,
            hint: fallbackError.hint
          });
          
          // Try simplest query without timestamp column (for backward compatibility)
          try {
            console.log(`Attempting simplest query for ${symbol} (no timestamp column)...`);
            const simpleResult = await pool.query(
              `SELECT date, open, high, low, close, volume 
               FROM asset_data 
               WHERE symbol = $1 
                 AND date >= $2 
                 AND date <= $3 
               ORDER BY date ASC`,
              [symbol, dateRange.start, dateRange.end]
            );
            
            console.log(`Simplest query succeeded for ${symbol}, got ${simpleResult.rows.length} rows`);
            historicalData = simpleResult.rows.map(row => {
              const timestamp = new Date(row.date).getTime();
              return {
                timestamp: timestamp,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseInt(row.volume) || 0
              };
            });
          } catch (simpleError) {
            console.error(`Simplest query also failed for ${symbol}:`, simpleError);
            // Return empty array instead of throwing to prevent 500 error
            historicalData = [];
            console.warn(`Using empty historical data for ${symbol} due to database errors`);
          }
        }
      }

      // Cache in Redis
      if (redisClient && redisClient.isOpen && historicalData.length > 0) {
        try {
          await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(historicalData));
          console.log(`Asset data cached for ${symbol} (${range}) - ${historicalData.length} points`);
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
              `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) 
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
                `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
                 VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) 
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
              let mockHistorical;
              if (range === '7D') {
                // For 7D, generate 7 days including weekends with flat prices
                mockHistorical = mockData.generate7DaysData(symbol);
              } else {
                const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : 
                            range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 
                            range === '5Y' ? 1825 : range === '10Y' ? 3650 : 30;
                mockHistorical = mockData.generateHistoricalData(symbol, days);
              }
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
          let mockHistorical;
          if (range === '7D') {
            // For 7D, generate 7 days including weekends with flat prices
            mockHistorical = mockData.generate7DaysData(symbol);
          } else {
            const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : 
                        range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 
                        range === '5Y' ? 1825 : range === '10Y' ? 3650 : 30;
            mockHistorical = mockData.generateHistoricalData(symbol, days);
          }
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
      const { extractTickerSymbol, generateDisplayName } = require('../utils/assetSymbolUtils');
      const tickerSymbol = extractTickerSymbol(symbol);
      const displayName = generateDisplayName(symbol, assetInfo.name || symbol);
      
      await pool.query(
        `INSERT INTO asset_info (symbol, name, ticker_symbol, display_name, type, exchange, currency, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           ticker_symbol = EXCLUDED.ticker_symbol,
           display_name = EXCLUDED.display_name,
           type = EXCLUDED.type,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          assetInfo.name || symbol,
          tickerSymbol,
          displayName,
          assetInfo.type || 'stock',
          assetInfo.primary_exchange || assetInfo.exchange || assetInfo.market || '',
          assetInfo.currency_name || assetInfo.currency || 'USD'
        ]
      );
    }

    // 5. Get asset info from DB - use stock_data for stocks/ETFs, asset_info for crypto/indices
    const isCryptoAsset = symbol.startsWith('X:') && symbol.endsWith('USD');
    const isIndexAsset = symbol.startsWith('^');
    
    let assetMetadata = null;
    
    if (!isCryptoAsset && !isIndexAsset) {
      // Stocks/ETFs: Get from stock_data
      const stockResult = await pool.query(
        `SELECT 
          sd.ticker as symbol,
          sd.name,
          sd.type,
          sd.primary_exchange as exchange,
          sd.currency_name as currency,
          sd.acronym,
          ai.logo_url,
          ai.category,
          ai.market_cap,
          ai.pe_ratio,
          ai.dividend_yield
        FROM stock_data sd
        LEFT JOIN asset_info ai ON sd.ticker = ai.symbol
        WHERE sd.ticker = $1 AND sd.active = true`,
        [symbol]
      );
      
      if (stockResult.rows.length > 0) {
        const row = stockResult.rows[0];
        assetMetadata = {
          symbol: row.symbol,
          name: row.name || symbol,
          type: row.type || 'stock',
          exchange: row.exchange || '',
          currency: row.currency || 'USD',
          logo_url: row.logo_url,
          category: row.category || (row.type === 'ETF' || row.type === 'ETP' ? 'ETF' : 'Equity'),
          market_cap: row.market_cap,
          pe_ratio: row.pe_ratio,
          dividend_yield: row.dividend_yield
        };
      }
    }
    
    // Fallback to asset_info for crypto/indices or if stock_data didn't find it
    if (!assetMetadata) {
      const infoResult = await pool.query(
        'SELECT *, logo_url, category FROM asset_info WHERE symbol = $1',
        [symbol]
      );
      
      if (infoResult.rows.length > 0) {
        assetMetadata = infoResult.rows[0];
      }
    }
    
    const { normalizeCategory, determineCategory } = require('../utils/categoryUtils');
      if (!assetMetadata) {
      assetMetadata = {
        symbol,
        name: symbol,
        type: isCryptoAsset ? 'crypto' : isIndexAsset ? 'index' : 'stock',
        exchange: '',
        currency: 'USD',
        category: null
      };
    }
    
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
    console.error('Error stack:', error.stack);
    console.error('Symbol:', req.params.symbol);
    console.error('Range:', req.query.range);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

