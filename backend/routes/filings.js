const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { loadService } = require('../services');
const secFilingsService = loadService('general/secFilingsService');
const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/filings
 * Get the top 50 most recent SEC filings across all assets
 * Query params:
 *   - limit: number of filings to return (default: 50)
 *   - type: filter by filing type (optional)
 *   - search: search by asset name, symbol, or filing type (optional)
 *   - sortOrder: sort order 'asc' or 'desc' (default: 'desc')
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const filingType = req.query.type || null;
    const searchQuery = req.query.search || null;
    const sortOrder = req.query.sortOrder || 'desc';
    
    const filings = await secFilingsService.getRecentFilings(limit, filingType, searchQuery, sortOrder);
    const statistics = await secFilingsService.getFilingStatistics();
    
    res.json({
      success: true,
      filings,
      statistics,
      count: filings.length,
    });
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * GET /api/filings/chart
 * Get filing counts over time for charting
 * Query params:
 *   - timeRange: '1M', '3M', '6M', '1Y', '3Y', '5Y' (default: '1Y')
 */
router.get('/chart', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '1Y';
    const validRanges = ['1M', '3M', '6M', '1Y', '3Y', '5Y'];
    
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid timeRange. Must be one of: ${validRanges.join(', ')}` 
      });
    }
    
    const chartData = await secFilingsService.getFilingCountsOverTime(timeRange);
    
    res.json({
      success: true,
      data: chartData,
      timeRange,
    });
  } catch (error) {
    console.error('Error fetching filing chart data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;

