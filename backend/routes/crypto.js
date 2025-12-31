/**
 * Crypto Routes
 * Handles cryptocurrency market data endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { cryptoMarketService } = require('../services');

/**
 * GET /api/crypto/market
 * Get comprehensive crypto market data
 * Query params:
 *   - limit: Number of cryptos to return (default: 250, max: 250)
 * 
 * Returns:
 *   - Array of crypto objects with: rank, symbol, name, price, 1h%, 24h%, 7d%, 
 *     market cap, volume, circulating supply
 */
router.get('/market', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 250;
    const maxLimit = 250; // CoinGecko max per page
    
    if (limit > maxLimit) {
      return res.status(400).json({ 
        error: 'Limit exceeds maximum', 
        message: `Maximum limit is ${maxLimit}` 
      });
    }
    
    const marketData = await cryptoMarketService.getCryptoMarketData(limit);
    
    res.json({
      success: true,
      data: marketData,
      count: marketData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching crypto market data:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

/**
 * POST /api/crypto/market/sync
 * Sync crypto market data from CoinGecko API
 * Admin only - triggers a fresh fetch from API
 */
router.post('/market/sync', verifyToken, async (req, res) => {
  try {
    // Check if user is admin (optional - can be added later)
    // For now, any authenticated user can trigger sync
    
    const limit = parseInt(req.body.limit) || 250;
    const maxLimit = 250;
    
    if (limit > maxLimit) {
      return res.status(400).json({ 
        error: 'Limit exceeds maximum', 
        message: `Maximum limit is ${maxLimit}` 
      });
    }
    
    // Fetch fresh data from API (bypasses cache)
    const marketData = await cryptoMarketService.fetchCryptoMarketData(limit);
    
    // Store in database
    await cryptoMarketService.storeCryptoMarketData(marketData);
    
    res.json({
      success: true,
      message: 'Crypto market data synced successfully',
      data: marketData,
      count: marketData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing crypto market data:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

module.exports = router;

