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
    const validTimeRanges = ['1D', '5D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'MAX'];
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
      // Use time range
      const daysMap = {
        '1D': 1,
        '5D': 5,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        '3Y': 1095,
        '5Y': 1825,
        '10Y': 3650,
        'MAX': 3650, // Max 10 years for now
      };
      const days = daysMap[timeRange] || 365;
      startDate.setDate(startDate.getDate() - days);
    }

    // Format dates for SQL query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get historical price data for the symbol
    // Note: asset_data table only has: symbol, date, open, high, low, close, volume, adjusted_close
    // It does NOT have change or change_percent columns
    let historicalDataResult;
    try {
      historicalDataResult = await pool.query(
        `SELECT date, open, high, low, close, volume, adjusted_close
         FROM asset_data 
         WHERE symbol = $1 
           AND date >= $2 
           AND date <= $3 
         ORDER BY date ASC`,
        [symbol, startDateStr, endDateStr]
      );
    } catch (dbError) {
      console.error(`Database error for symbol ${symbol}:`, dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    // Format data for chart
    // Calculate change and changePercent from previous day's close price
    const chartData = historicalDataResult.rows.map((row, index) => {
      try {
        let date;
        if (row.date instanceof Date) {
          date = row.date;
        } else if (typeof row.date === 'string') {
          date = new Date(row.date);
        } else {
          date = new Date();
        }
        
        // Validate date
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for symbol ${symbol}:`, row.date);
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

