const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { loadService } = require('../services');
const router = express.Router();

// Load the trending assets service
const trendingAssetsService = loadService('general/trendingAssetsService');

// Protect all trending routes
router.use(verifyToken);

/**
 * GET /api/trending
 * Get trending assets based on search counts
 * Query params:
 *   - limit: Number of assets to return (default: 10)
 *   - timeRange: '24h', '7d', '30d', 'all' (default: '7d')
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeRange = req.query.timeRange || '7d';
    
    const validTimeRanges = ['24h', '7d', '30d', 'all'];
    if (!validTimeRanges.includes(timeRange)) {
      return res.status(400).json({ error: `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}` });
    }

    const trendingAssets = await trendingAssetsService.getTrendingAssets(limit, timeRange);
    
    res.json({
      success: true,
      data: trendingAssets,
      limit,
      timeRange,
    });
  } catch (error) {
    console.error('Error fetching trending assets:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;

