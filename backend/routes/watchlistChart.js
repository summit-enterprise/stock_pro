const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { pool } = require('../db');
const router = express.Router();

// Protect all watchlist chart routes
router.use(verifyToken);

/**
 * GET /api/watchlist/chart/:symbol
 * Get historical price data for a watchlist asset
 * Query params:
 *   - timeRange: '1D', '5D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX' (default: '1Y')
 *   - startDate: Custom start date (YYYY-MM-DD) - overrides timeRange if provided
 *   - endDate: Custom end date (YYYY-MM-DD) - overrides timeRange if provided
 */
router.get('/:symbol', async (req, res) => {
  try {
    let { symbol } = req.params;
    const { timeRange = '1Y', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Validate and decode symbol
    if (!symbol) {
      return res.status(400).json({ 
        error: 'Symbol is required',
        success: false 
      });
    }

    // Decode URL-encoded symbol (handle special characters like ^ which becomes %5E)
    try {
      symbol = decodeURIComponent(symbol).trim();
    } catch (decodeError) {
      // If decoding fails, use symbol as-is
      symbol = symbol.trim();
    }
    
    // Uppercase for most symbols, but preserve case for crypto symbols (X:BTCUSD format)
    if (!symbol.startsWith('X:')) {
      symbol = symbol.toUpperCase();
    }

    // Validate timeRange
    const validTimeRanges = ['1D', '7D', '1M', '3M', '6M', 'YTD', '3Y', '5Y', 'MAX'];
    if (timeRange && !validTimeRanges.includes(timeRange)) {
      return res.status(400).json({ 
        error: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`,
        success: false 
      });
    }

    // Calculate date range - use custom dates if provided, otherwise use timeRange
    const now = new Date();
    let startDate = new Date();
    let endDate = now;
    
    if (customStartDate && customEndDate) {
      // Use custom date range
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid date format. Use YYYY-MM-DD',
          success: false 
        });
      }
      
      // Ensure endDate is not in the future
      if (endDate > now) {
        endDate = now;
      }
      
      // Ensure startDate is before endDate
      if (startDate > endDate) {
        return res.status(400).json({ 
          error: 'Start date must be before end date',
          success: false 
        });
      }
    } else {
      // Use time range - calculate accurate dates (all ranges include TODAY)
      if (timeRange === '1D') {
        // TODAY: 12am-11pm
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '7D') {
        // Today + 6 previous days (7 days total including today)
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '1M') {
        // Exactly 1 month ago to today
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '3M') {
        // Exactly 3 months ago to today
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '6M') {
        // Exactly 6 months ago to today
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'YTD') {
        // Year to date: January 1st of current year to today
        startDate.setFullYear(startDate.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '3Y') {
        // Exactly 3 years ago to today
        startDate.setFullYear(startDate.getFullYear() - 3);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '5Y') {
        // Exactly 5 years ago to today
        startDate.setFullYear(startDate.getFullYear() - 5);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'MAX') {
        // Start from 2010 to today
        startDate.setFullYear(2010, 0, 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Default to 1 month
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
      }
    }

    // Format dates for SQL query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const startTimestamp = startDate.toISOString();

    // Determine if we need hourly data (for 1D and 7D ranges)
    const needsHourlyData = timeRange === '1D' || timeRange === '7D';

    // Check Redis cache first
    const { getRedisClient } = require('../config/redis');
    const redisClient = await getRedisClient();
    const cacheKey = `watchlist_chart:${symbol}:${timeRange}`;
    const CACHE_TTL = needsHourlyData ? 2 * 60 : (timeRange === 'MAX' ? 60 * 60 : 5 * 60); // 2 min for hourly, 1 hour for MAX, 5 min for others
    
    let historicalDataResult;
    let cacheHit = false;

    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          historicalDataResult = { rows: parsed };
          cacheHit = true;
          console.log(`Watchlist chart cache hit for ${symbol} (${timeRange})`);
        }
      } catch (redisError) {
        console.warn('Redis cache read failed for watchlist chart, continuing...');
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

        if (needsHourlyData && hasTimestampColumn) {
          // Fetch hourly data for 1D and 7D ranges
          historicalDataResult = await pool.query(
            `SELECT date, timestamp, open, high, low, close, volume, adjusted_close
             FROM asset_data 
             WHERE symbol = $1 
               AND date >= $2 
               AND date <= $3
               AND (timestamp IS NOT NULL OR timestamp >= $4::timestamp)
             ORDER BY COALESCE(timestamp, date::timestamp) ASC`,
            [symbol, startDateStr, endDateStr, startTimestamp]
          );
        } else if (hasTimestampColumn) {
          // Fetch daily data only (timestamp IS NULL for daily records)
          historicalDataResult = await pool.query(
            `SELECT date, timestamp, open, high, low, close, volume, adjusted_close
             FROM asset_data 
             WHERE symbol = $1 
               AND date >= $2 
               AND date <= $3 
               AND timestamp IS NULL
             ORDER BY date ASC`,
            [symbol, startDateStr, endDateStr]
          );
        } else {
          // Fallback: timestamp column doesn't exist, fetch all data
          historicalDataResult = await pool.query(
            `SELECT date, open, high, low, close, volume, adjusted_close
             FROM asset_data 
             WHERE symbol = $1 
               AND date >= $2 
               AND date <= $3 
             ORDER BY date ASC`,
            [symbol, startDateStr, endDateStr]
          );
        }

        // Cache in Redis
        if (redisClient && redisClient.isOpen && historicalDataResult.rows.length > 0) {
          try {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(historicalDataResult.rows));
            console.log(`Watchlist chart cached for ${symbol} (${timeRange}) - ${historicalDataResult.rows.length} points`);
          } catch (e) {
            console.warn('Failed to cache watchlist chart data in Redis');
          }
        }
      } catch (dbError) {
        console.error(`Database error for symbol ${symbol}:`, dbError);
        throw new Error(`Database query failed: ${dbError.message}`);
      }
    }

    // Format data for chart
    // Calculate change and changePercent from previous point's close price
    const chartData = historicalDataResult.rows.map((row, index) => {
      try {
        // Use timestamp if available (hourly data), otherwise use date (daily data)
        let date;
        if (row.timestamp) {
          date = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
        } else if (row.date instanceof Date) {
          date = row.date;
        } else if (typeof row.date === 'string') {
          date = new Date(row.date);
        } else {
          date = new Date();
        }
        
        // Validate date
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for symbol ${symbol}:`, row.date || row.timestamp);
          date = new Date();
        }

        const close = parseFloat(row.close) || 0;
        const previousClose = index > 0 
          ? parseFloat(historicalDataResult.rows[index - 1].close) || close
          : close;
        const change = close - previousClose;
        const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

        return {
          date: date.toISOString().split('T')[0],
          dateObj: date,
          timestamp: date.getTime(),
          open: parseFloat(row.open) || 0,
          high: parseFloat(row.high) || 0,
          low: parseFloat(row.low) || 0,
          close: close,
          volume: parseFloat(row.volume) || 0,
          adjustedClose: parseFloat(row.adjusted_close) || close,
          change: change,
          changePercent: changePercent,
        };
      } catch (mapError) {
        console.error(`Error mapping row for symbol ${symbol}:`, mapError);
        // Return a default entry to prevent breaking the chart
        return {
          date: new Date().toISOString().split('T')[0],
          dateObj: new Date(),
          timestamp: Date.now(),
          open: 0,
          high: 0,
          low: 0,
          close: 0,
          volume: 0,
          adjustedClose: 0,
          change: 0,
          changePercent: 0,
        };
      }
    });

    // Return response with data
    const response = {
      success: true,
      data: chartData,
      symbol,
      timeRange,
      startDate: startDateStr,
      endDate: endDateStr,
      count: chartData.length,
    };
    
    // Log for debugging
    if (chartData.length === 0) {
      console.log(`No data found for ${symbol} between ${startDateStr} and ${endDateStr}`);
    } else {
      console.log(`Returning ${chartData.length} data points for ${symbol}`);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Watchlist chart error:', error);
    console.error('Error details:', {
      symbol: req.params.symbol,
      timeRange: req.query.timeRange,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
      success: false
    });
  }
});

module.exports = router;

