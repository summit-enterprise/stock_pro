/**
 * Service Health Admin Routes
 * Provides endpoints for viewing and managing service health
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const serviceHealthService = require('../services/general/serviceHealthService');

/**
 * GET /api/admin/services/health
 * Get health status for all services
 */
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const services = await serviceHealthService.getAllServiceHealth();
    res.json({ services });
  } catch (error) {
    console.error('Error fetching service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
  }
});

/**
 * GET /api/admin/services/health/:serviceName
 * Get health status for a specific service
 */
router.get('/health/:serviceName', requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = await serviceHealthService.getServiceHealth(serviceName);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ service });
  } catch (error) {
    console.error('Error fetching service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
  }
});

/**
 * POST /api/admin/services/health/:serviceName/check
 * Manually trigger a health check for a service
 */
router.post('/health/:serviceName/check', requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const result = await serviceHealthService.checkServiceHealth(serviceName);
    res.json({ 
      message: 'Health check completed',
      result 
    });
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({ error: 'Failed to check service health' });
  }
});

/**
 * POST /api/admin/services/health/check-all
 * Manually trigger health checks for all services
 */
router.post('/health/check-all', requireAdmin, async (req, res) => {
  try {
    const services = Object.keys(serviceHealthService.SERVICES);
    const results = {};
    
    for (const serviceName of services) {
      try {
        results[serviceName] = await serviceHealthService.checkServiceHealth(serviceName);
      } catch (error) {
        results[serviceName] = {
          status: 'error',
          healthStatus: 'error',
          errorMessage: error.message,
        };
      }
    }
    
    res.json({ 
      message: 'Health checks completed',
      results 
    });
  } catch (error) {
    console.error('Error checking all services:', error);
    res.status(500).json({ error: 'Failed to check service health' });
  }
});

module.exports = router;

