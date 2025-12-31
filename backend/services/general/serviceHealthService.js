/**
 * Service Health Monitoring Service
 * Tracks the health and status of major application services
 */

const { pool } = require('../../db');
const { loadService } = require('../index');

// Service definitions
const SERVICES = {
  logoService: {
    name: 'Logo Service',
    type: 'asset_processing',
    description: 'Fetches and stores asset logos from multiple APIs',
    checkInterval: 300000, // 5 minutes
  },
  dividendService: {
    name: 'Dividend Service',
    type: 'data_fetching',
    description: 'Fetches dividend data from Polygon.io',
    checkInterval: 600000, // 10 minutes
  },
  cryptoService: {
    name: 'Crypto Service',
    type: 'data_fetching',
    description: 'Fetches cryptocurrency data from CoinGecko',
    checkInterval: 600000, // 10 minutes
  },
  cryptoPriceService: {
    name: 'Crypto Price Service',
    type: 'data_fetching',
    description: 'Fetches historical and current crypto prices from CoinGecko',
    checkInterval: 600000, // 10 minutes
  },
  newsService: {
    name: 'News Service',
    type: 'data_fetching',
    description: 'Fetches financial news from NewsAPI',
    checkInterval: 300000, // 5 minutes
  },
  assetNewsService: {
    name: 'Asset News Service',
    type: 'data_fetching',
    description: 'Fetches news specific to assets (stocks, crypto)',
    checkInterval: 300000, // 5 minutes
  },
  youtubeService: {
    name: 'YouTube Service',
    type: 'data_fetching',
    description: 'Fetches YouTube live stream status',
    checkInterval: 300000, // 5 minutes
  },
  newsStreamService: {
    name: 'News Stream Service',
    type: 'data_fetching',
    description: 'Fetches live stream URLs from news networks',
    checkInterval: 300000, // 5 minutes
  },
  ratingsService: {
    name: 'Ratings Service',
    type: 'data_fetching',
    description: 'Fetches analyst ratings from Polygon.io',
    checkInterval: 600000, // 10 minutes
  },
  analystRatingsService: {
    name: 'Analyst Ratings Service',
    type: 'data_fetching',
    description: 'Fetches detailed analyst ratings and consensus',
    checkInterval: 600000, // 10 minutes
  },
  filingsService: {
    name: 'Filings Service',
    type: 'data_fetching',
    description: 'Fetches SEC filings data',
    checkInterval: 600000, // 10 minutes
  },
  storageService: {
    name: 'Storage Service',
    type: 'infrastructure',
    description: 'Google Cloud Storage operations',
    checkInterval: 300000, // 5 minutes
  },
  googleCloudService: {
    name: 'Google Cloud Service',
    type: 'infrastructure',
    description: 'Google Cloud Platform integration and authentication',
    checkInterval: 300000, // 5 minutes
  },
  gcpBillingService: {
    name: 'GCP Billing Service',
    type: 'infrastructure',
    description: 'Google Cloud billing data sync',
    checkInterval: 3600000, // 1 hour
  },
  apiTrackingService: {
    name: 'API Tracking Service',
    type: 'monitoring',
    description: 'Tracks API calls and quota usage',
    checkInterval: 300000, // 5 minutes
  },
  serviceHealthService: {
    name: 'Service Health Service',
    type: 'monitoring',
    description: 'Monitors health and status of application services',
    checkInterval: 300000, // 5 minutes
  },
  marketMoversService: {
    name: 'Market Movers Service',
    type: 'data_fetching',
    description: 'Fetches top gainers and losers data',
    checkInterval: 300000, // 5 minutes
  },
  rssNewsService: {
    name: 'RSS News Service',
    type: 'data_fetching',
    description: 'Fetches news from RSS feeds (free alternative to NewsAPI)',
    checkInterval: 300000, // 5 minutes
  },
};

/**
 * Update service health status
 */
async function updateServiceHealth({
  serviceName,
  status = 'unknown',
  healthStatus = 'unknown',
  responseTimeMs = null,
  errorMessage = null,
  metadata = null,
}) {
  try {
    const now = new Date();
    const updateData = {
      status,
      health_status: healthStatus,
      last_check: now,
      response_time_ms: responseTimeMs,
      error_message: errorMessage,
      metadata: metadata ? JSON.stringify(metadata) : null,
      updated_at: now,
    };

    // Update last_success or last_failure based on status
    if (healthStatus === 'healthy') {
      updateData.last_success = now;
    } else if (healthStatus === 'unhealthy' || healthStatus === 'error') {
      updateData.last_failure = now;
    }

    // Check if service exists
    const existing = await pool.query(
      'SELECT id FROM service_health WHERE service_name = $1',
      [serviceName]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const setClause = Object.keys(updateData)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ');
      
      await pool.query(
        `UPDATE service_health SET ${setClause} WHERE service_name = $1`,
        [serviceName, ...Object.values(updateData)]
      );
    } else {
      // Insert new
      const serviceDef = SERVICES[serviceName];
      await pool.query(
        `INSERT INTO service_health 
         (service_name, service_type, status, health_status, last_check, last_success, last_failure, 
          response_time_ms, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          serviceName,
          serviceDef?.type || 'unknown',
          updateData.status,
          updateData.health_status,
          updateData.last_check,
          updateData.last_success,
          updateData.last_failure,
          updateData.response_time_ms,
          updateData.error_message,
          updateData.metadata,
        ]
      );
    }
  } catch (error) {
    console.error(`Error updating service health for ${serviceName}:`, error.message);
  }
}

/**
 * Check service health by attempting a simple operation
 */
async function checkServiceHealth(serviceName) {
  const serviceDef = SERVICES[serviceName];
  if (!serviceDef) {
    return {
      status: 'unknown',
      healthStatus: 'unknown',
      error: 'Service not defined',
    };
  }

  const startTime = Date.now();
  let healthStatus = 'healthy';
  let errorMessage = null;
  let metadata = null;

  try {
    // Perform health check based on service type
    switch (serviceName) {
      case 'logoService': {
        const logoService = loadService('general/logoService');
        // Try to get a known logo (AAPL)
        try {
          await logoService.getLogoUrl('AAPL');
          healthStatus = 'healthy';
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'dividendService': {
        const dividendService = loadService('stocks/dividendService');
        // Try to get dividends for a known symbol
        try {
          await dividendService.getDividends('AAPL', { limit: 1 });
          healthStatus = 'healthy';
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'cryptoService': {
        const cryptoService = loadService('crypto/cryptoService');
        // Try to get a known crypto
        try {
          await cryptoService.getCryptoInfo('BTC');
          healthStatus = 'healthy';
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'newsService': {
        const newsService = loadService('general/newsService');
        // Try to fetch news (use fetchNewsFromAPI which handles RSS)
        try {
          const articles = await newsService.fetchNewsFromAPI('business');
          if (articles && articles.length > 0) {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = 'No articles returned';
          }
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'youtubeService': {
        const youtubeService = loadService('general/youtubeService');
        // Try to check a known channel
        try {
          await youtubeService.checkChannelLiveStatus('UCjZnbgPb08NFg7MHyPQRZ3Q');
          healthStatus = 'healthy';
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'storageService': {
        const storageService = loadService('infrastructure/storageService');
        // Try to list buckets (lightweight operation)
        try {
          await storageService.listBuckets();
          healthStatus = 'healthy';
        } catch (error) {
          // In local/mock mode, storage service may not be available - that's OK
          if (process.env.NODE_ENV === 'local' || process.env.USE_MOCK_SERVICES === 'true') {
            healthStatus = 'healthy'; // Mock services are always healthy
          } else {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        }
        break;
      }
      case 'assetNewsService': {
        const assetNewsService = loadService('general/assetNewsService');
        // Try to get news for a known asset
        try {
          const articles = await assetNewsService.fetchAssetNewsFromAPI('AAPL');
          if (articles && articles.length > 0) {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = 'No articles returned';
          }
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'newsStreamService': {
        // Try to load newsStreamService if it exists
        try {
          const newsStreamService = require('./newsStreamService');
          // Try to get a known stream
          try {
            const stream = await newsStreamService.getNewsStreamUrl('bloomberg');
            if (stream && stream.url) {
              healthStatus = 'healthy';
            } else {
              healthStatus = 'degraded';
              errorMessage = 'No stream URL returned';
            }
          } catch (error) {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        } catch (error) {
          healthStatus = 'unknown';
          errorMessage = 'Service not available';
        }
        break;
      }
      case 'analystRatingsService': {
        const analystRatingsService = loadService('stocks/analystRatingsService');
        // Try to get ratings for a known symbol
        try {
          await analystRatingsService.getAnalystRatings('AAPL');
          healthStatus = 'healthy';
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'cryptoPriceService': {
        const cryptoPriceService = loadService('crypto/cryptoPriceService');
        // Try to get price for a known crypto
        try {
          const price = await cryptoPriceService.getCurrentPrice('BTC');
          if (price && price > 0) {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = 'Invalid price returned';
          }
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'filingsService': {
        const filingsService = loadService('stocks/filingsService');
        // Try to get filings for a known symbol
        try {
          const filings = await filingsService.getFilings('AAPL', { limit: 1 });
          if (filings && (filings.length > 0 || filings.filings)) {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = 'No filings returned';
          }
        } catch (error) {
          healthStatus = 'degraded';
          errorMessage = error.message;
        }
        break;
      }
      case 'marketMoversService': {
        // Market movers service - try to load from service loader or direct
        try {
          let marketMoversService;
          try {
            marketMoversService = loadService('general/marketMoversService');
          } catch (e) {
            // Fallback to direct require if service loader doesn't have it
            marketMoversService = require('../../mockservices/general/marketMoversService');
          }
          // Try to get market movers
          try {
            const movers = await marketMoversService.getMarketMovers();
            if (movers && (movers.stockGainers || movers.stockLosers)) {
              healthStatus = 'healthy';
            } else {
              healthStatus = 'degraded';
              errorMessage = 'No movers data returned';
            }
          } catch (error) {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        } catch (error) {
          healthStatus = 'unknown';
          errorMessage = 'Service not available';
        }
        break;
      }
      case 'rssNewsService': {
        // RSS News Service
        try {
          const rssNewsService = loadService('general/rssNewsService');
          // Try to fetch RSS news
          try {
            const articles = await rssNewsService.fetchNewsFromRSS('business');
            if (articles && articles.length > 0) {
              healthStatus = 'healthy';
            } else {
              healthStatus = 'degraded';
              errorMessage = 'No articles returned';
            }
          } catch (error) {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        } catch (error) {
          healthStatus = 'unknown';
          errorMessage = 'Service not available';
        }
        break;
      }
      case 'googleCloudService': {
        // Check if Google Cloud credentials are available
        try {
          // In local/mock mode, GCP may not be available - that's OK
          if (process.env.NODE_ENV === 'local' || process.env.USE_MOCK_SERVICES === 'true') {
            healthStatus = 'healthy'; // Mock services are always healthy
          } else {
            const { Storage } = require('@google-cloud/storage');
            const storage = new Storage();
            await storage.getBuckets();
            healthStatus = 'healthy';
          }
        } catch (error) {
          // In local mode, GCP errors are expected
          if (process.env.NODE_ENV === 'local' || process.env.USE_MOCK_SERVICES === 'true') {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        }
        break;
      }
      case 'gcpBillingService': {
        const gcpBillingService = loadService('infrastructure/gcpBillingService');
        // Try to get billing data
        try {
          // In local/mock mode, billing may not be available - that's OK
          if (process.env.NODE_ENV === 'local' || process.env.USE_MOCK_SERVICES === 'true') {
            healthStatus = 'healthy'; // Mock services are always healthy
          } else {
            await gcpBillingService.getBillingUsage();
            healthStatus = 'healthy';
          }
        } catch (error) {
          // In local mode, billing errors are expected
          if (process.env.NODE_ENV === 'local' || process.env.USE_MOCK_SERVICES === 'true') {
            healthStatus = 'healthy';
          } else {
            healthStatus = 'degraded';
            errorMessage = error.message;
          }
        }
        break;
      }
      case 'apiTrackingService':
      case 'serviceHealthService':
        // These are internal services, always healthy if running
        healthStatus = 'healthy';
        break;
      default:
        healthStatus = 'unknown';
        errorMessage = 'Health check not implemented';
    }

    const responseTime = Date.now() - startTime;

    await updateServiceHealth({
      serviceName,
      status: 'running',
      healthStatus,
      responseTimeMs: responseTime,
      errorMessage,
      metadata: {
        checkDuration: responseTime,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 'running',
      healthStatus,
      responseTimeMs: responseTime,
      errorMessage,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    healthStatus = 'error';
    errorMessage = error.message;

    await updateServiceHealth({
      serviceName,
      status: 'error',
      healthStatus: 'error',
      responseTimeMs: responseTime,
      errorMessage,
    });

    return {
      status: 'error',
      healthStatus: 'error',
      responseTimeMs: responseTime,
      errorMessage: error.message,
    };
  }
}

/**
 * Get all service health statuses
 */
async function getAllServiceHealth() {
  try {
    const result = await pool.query(
      `SELECT 
        service_name,
        service_type,
        status,
        health_status,
        last_check,
        last_success,
        last_failure,
        response_time_ms,
        error_message,
        metadata,
        updated_at
       FROM service_health
       ORDER BY service_name`
    );

    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      serviceInfo: SERVICES[row.service_name] || null,
    }));
  } catch (error) {
    console.error('Error getting service health:', error);
    throw error;
  }
}

/**
 * Get health status for a specific service
 */
async function getServiceHealth(serviceName) {
  try {
    const result = await pool.query(
      `SELECT * FROM service_health WHERE service_name = $1`,
      [serviceName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      serviceInfo: SERVICES[row.service_name] || null,
    };
  } catch (error) {
    console.error(`Error getting service health for ${serviceName}:`, error);
    throw error;
  }
}

/**
 * Initialize service health records
 */
async function initializeServiceHealth() {
  try {
    for (const [key, serviceDef] of Object.entries(SERVICES)) {
      const existing = await pool.query(
        'SELECT id FROM service_health WHERE service_name = $1',
        [key]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO service_health (service_name, service_type, status, health_status)
           VALUES ($1, $2, $3, $4)`,
          [key, serviceDef.type, 'unknown', 'unknown']
        );
      }
    }
    console.log('Service health records initialized');
  } catch (error) {
    console.error('Error initializing service health:', error);
  }
}

/**
 * Start background health monitoring for all services
 */
let healthCheckInterval = null;

async function startHealthMonitoring(intervalMinutes = 5) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Initial health check for all services
  console.log('🔍 Starting initial health check for all services...');
  await checkAllServicesHealth();
  
  // Set up periodic health checks
  healthCheckInterval = setInterval(async () => {
    console.log('🔍 Running periodic health check for all services...');
    await checkAllServicesHealth();
  }, intervalMs);
  
  console.log(`✅ Health monitoring started (checking every ${intervalMinutes} minutes)`);
}

async function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('🛑 Health monitoring stopped');
  }
}

/**
 * Check health for all services
 */
async function checkAllServicesHealth() {
  const services = Object.keys(SERVICES);
  const results = {};
  
  for (const serviceName of services) {
    try {
      await checkServiceHealth(serviceName);
    } catch (error) {
      console.error(`Error checking health for ${serviceName}:`, error.message);
      await updateServiceHealth({
        serviceName,
        status: 'error',
        healthStatus: 'error',
        errorMessage: error.message,
      });
    }
  }
  
  return results;
}

module.exports = {
  updateServiceHealth,
  checkServiceHealth,
  getAllServiceHealth,
  getServiceHealth,
  initializeServiceHealth,
  startHealthMonitoring,
  stopHealthMonitoring,
  checkAllServicesHealth,
  SERVICES,
};

