const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const youtubeService = require('../services/general/youtubeService');
const { pool } = require('../db');

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

    // Fetch channel configs from database to know which channels need livestream checks
    const channelConfigs = await pool.query(
      'SELECT channel_id, pull_livestreams FROM youtube_channels WHERE channel_id = ANY($1) AND is_active = TRUE',
      [channelIds]
    );
    
    const configMap = {};
    channelConfigs.rows.forEach(row => {
      configMap[row.channel_id] = {
        pullLivestreams: row.pull_livestreams !== false, // Default to true if not set
      }
    });

    const results = await youtubeService.checkMultipleChannelsLiveStatus(channelIds, configMap);
    res.json(results);
  } catch (error) {
    console.error('YouTube batch status error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Get active YouTube channels from database
router.get('/channels', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM youtube_channels WHERE is_active = TRUE';
    const params = [];
    
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY category, channel_name';
    
    const result = await pool.query(query, params);
    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

module.exports = router;

