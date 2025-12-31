const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const youtubeService = require('../services/general/youtubeService');

// Check live status for a single channel
router.get('/channel/:channelId/status', verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const status = await youtubeService.checkChannelLiveStatus(channelId);
    res.json(status);
  } catch (error) {
    console.error('YouTube status error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      isLive: false,
      videoId: null,
    });
  }
});

// Batch check multiple channels
router.post('/channels/status', verifyToken, async (req, res) => {
  try {
    const { channelIds } = req.body;
    
    if (!Array.isArray(channelIds)) {
      return res.status(400).json({ error: 'channelIds must be an array' });
    }

    const results = await youtubeService.checkMultipleChannelsLiveStatus(channelIds);
    res.json(results);
  } catch (error) {
    console.error('YouTube batch status error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

module.exports = router;

