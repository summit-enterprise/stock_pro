const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const newsStreamService = require('../services/general/newsStreamService');

/**
 * GET /api/news-streams
 * Get all news network live stream URLs
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const streams = await newsStreamService.getAllNewsStreams();
    res.json(streams);
  } catch (error) {
    console.error('News streams error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

/**
 * GET /api/news-streams/:network
 * Get live stream URL for a specific network
 * Networks: bloomberg, cnbc, cnbcInternational, foxBusiness, yahooFinance, cheddar, cbsNews
 */
router.get('/:network', verifyToken, async (req, res) => {
  try {
    const { network } = req.params;
    const streamInfo = await newsStreamService.getNewsStreamUrl(network);
    
    if (streamInfo.error && !streamInfo.url) {
      return res.status(404).json(streamInfo);
    }
    
    res.json(streamInfo);
  } catch (error) {
    console.error('News stream error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

/**
 * POST /api/news-streams/verify
 * Verify and update embed URLs (admin endpoint)
 */
router.post('/verify', async (req, res) => {
  try {
    const updates = await newsStreamService.verifyAndUpdateEmbedUrls();
    res.json({ 
      message: 'Verification complete',
      updates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News stream verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

module.exports = router;

