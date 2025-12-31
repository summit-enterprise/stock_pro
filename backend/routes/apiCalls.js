/**
 * API Calls Admin Routes
 * Provides endpoints for viewing API call logs and quota usage
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const apiTrackingService = require('../services/general/apiTrackingService');

/**
 * GET /api/admin/api-calls/stats
 * Get API call statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { timeRange = '24h', apiProvider = null } = req.query;
    const stats = await apiTrackingService.getApiCallStats(timeRange, apiProvider);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching API call stats:', error);
    res.status(500).json({ error: 'Failed to fetch API call statistics' });
  }
});

/**
 * GET /api/admin/api-calls/quota
 * Get quota usage for all APIs
 */
router.get('/quota', requireAdmin, async (req, res) => {
  try {
    const quotaUsage = await apiTrackingService.getQuotaUsage();
    res.json({ quotaUsage });
  } catch (error) {
    console.error('Error fetching quota usage:', error);
    res.status(500).json({ error: 'Failed to fetch quota usage' });
  }
});

/**
 * GET /api/admin/api-calls/recent
 * Get recent API calls
 */
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const { limit = 100, apiProvider = null } = req.query;
    const calls = await apiTrackingService.getRecentApiCalls(
      parseInt(limit),
      apiProvider || null
    );
    res.json({ calls });
  } catch (error) {
    console.error('Error fetching recent API calls:', error);
    res.status(500).json({ error: 'Failed to fetch recent API calls' });
  }
});

/**
 * GET /api/admin/api-calls/providers
 * Get list of all API providers from database
 */
router.get('/providers', requireAdmin, async (req, res) => {
  try {
    const { pool } = require('../db');
    const result = await pool.query(
      `SELECT 
        provider_key,
        provider_name,
        base_url,
        api_key_env_var,
        quota_limit,
        quota_period,
        quota_units_per_call,
        documentation_url,
        status,
        description
       FROM api_providers
       ORDER BY provider_name`
    );
    
    res.json({ providers: result.rows });
  } catch (error) {
    console.error('Error fetching API providers:', error);
    res.status(500).json({ error: 'Failed to fetch API providers' });
  }
});

module.exports = router;

