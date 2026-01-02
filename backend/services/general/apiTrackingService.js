/**
 * API Tracking Service
 * Tracks all external API calls, logs them to database, and monitors quota usage
 */

const axios = require('axios');
const { pool } = require('../../db');

// API Provider configurations with quota information
const API_PROVIDERS = {
  polygon: {
    name: 'Polygon.io',
    baseUrl: 'https://api.polygon.io',
    quotaLimit: 5000000, // Free tier: 5M calls/month
    quotaPeriod: 'monthly',
    defaultQuotaUnits: 1, // Most endpoints use 1 unit
  },
  newsapi: {
    name: 'NewsAPI',
    baseUrl: 'https://newsapi.org',
    quotaLimit: 100, // Free tier: 100 requests/day
    quotaPeriod: 'daily',
    defaultQuotaUnits: 1,
  },
  finnhub: {
    name: 'Finnhub',
    baseUrl: 'https://finnhub.io',
    quotaLimit: 60, // Free tier: 60 calls/minute
    quotaPeriod: 'minute',
    defaultQuotaUnits: 1,
  },
  coingecko: {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com',
    quotaLimit: 50, // Free tier: 50 calls/minute
    quotaPeriod: 'minute',
    defaultQuotaUnits: 1,
  },
  youtube: {
    name: 'YouTube Data API',
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    quotaLimit: 10000, // Free tier: 10,000 units/day
    quotaPeriod: 'daily',
    defaultQuotaUnits: 100, // Search uses 100 units, videos uses 1 unit
  },
  alphavantage: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co',
    quotaLimit: 25, // Free tier: 25 requests/day
    quotaPeriod: 'daily',
    defaultQuotaUnits: 1,
  },
  coinmarketcap: {
    name: 'CoinMarketCap',
    baseUrl: 'https://pro-api.coinmarketcap.com',
    quotaLimit: 333, // Free tier: 333 requests/day
    quotaPeriod: 'daily',
    defaultQuotaUnits: 1,
  },
  financialmodelingprep: {
    name: 'Financial Modeling Prep',
    baseUrl: 'https://financialmodelingprep.com',
    quotaLimit: 250, // Free tier: 250 requests/day
    quotaPeriod: 'daily',
    defaultQuotaUnits: 1,
  },
  sec: {
    name: 'SEC EDGAR',
    baseUrl: 'https://www.sec.gov',
    quotaLimit: 10, // 10 requests/second
    quotaPeriod: 'second',
    defaultQuotaUnits: 1,
  },
};

/**
 * Determine API provider from URL
 */
function getApiProvider(url) {
  if (!url) return null;
  
  const urlLower = url.toLowerCase();
  for (const [key, config] of Object.entries(API_PROVIDERS)) {
    if (urlLower.includes(config.baseUrl.toLowerCase()) || urlLower.includes(key)) {
      return key;
    }
  }
  return 'unknown';
}

/**
 * Calculate quota units used based on API provider and endpoint
 */
function calculateQuotaUnits(provider, endpoint, method = 'GET') {
  if (!API_PROVIDERS[provider]) {
    return 1; // Default to 1 unit
  }

  const config = API_PROVIDERS[provider];
  
  // YouTube API has different quota costs
  if (provider === 'youtube') {
    if (endpoint?.includes('/search')) return 100;
    if (endpoint?.includes('/videos')) return 1;
    if (endpoint?.includes('/channels')) return 1;
    if (endpoint?.includes('/playlistItems')) return 1;
    return 1;
  }

  return config.defaultQuotaUnits || 1;
}

/**
 * Log an API call to the database
 */
async function logApiCall({
  apiProvider,
  apiName,
  endpoint,
  method = 'GET',
  statusCode,
  responseTimeMs,
  success = true,
  errorMessage = null,
  requestParams = null,
  responseSizeBytes = null,
  quotaUnitsUsed = null,
  serviceName = null,
}) {
  try {
    await pool.query(
      `INSERT INTO api_call_logs 
       (api_provider, api_name, endpoint, method, status_code, response_time_ms, success, 
        error_message, request_params, response_size_bytes, quota_units_used, service_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        apiProvider,
        apiName,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        success,
        errorMessage,
        requestParams ? JSON.stringify(requestParams) : null,
        responseSizeBytes,
        quotaUnitsUsed,
        serviceName,
      ]
    );
  } catch (error) {
    console.error('Error logging API call:', error.message);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Update quota tracking for an API provider
 */
async function updateQuotaTracking(apiProvider, quotaUnitsUsed) {
  if (!API_PROVIDERS[apiProvider]) return;

  const config = API_PROVIDERS[apiProvider];
  
  try {
    // Get current quota usage
    const result = await pool.query(
      `SELECT quota_used, quota_limit, quota_reset_date 
       FROM api_quota_tracking 
       WHERE api_provider = $1 AND quota_type = 'requests' AND quota_period = $2`,
      [apiProvider, config.quotaPeriod]
    );

    let currentQuotaUsed = 0;
    let quotaLimit = config.quotaLimit;
    let quotaResetDate = null;

    if (result.rows.length > 0) {
      currentQuotaUsed = result.rows[0].quota_used || 0;
      quotaLimit = result.rows[0].quota_limit || config.quotaLimit;
      quotaResetDate = result.rows[0].quota_reset_date;
    } else {
      // Set initial reset date based on period
      const now = new Date();
      if (config.quotaPeriod === 'daily') {
        quotaResetDate = new Date(now.setHours(24, 0, 0, 0));
      } else if (config.quotaPeriod === 'monthly') {
        quotaResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (config.quotaPeriod === 'minute') {
        quotaResetDate = new Date(now.getTime() + 60000);
      } else if (config.quotaPeriod === 'second') {
        quotaResetDate = new Date(now.getTime() + 1000);
      }
    }

    // Check if quota period has reset
    if (quotaResetDate && new Date() > new Date(quotaResetDate)) {
      currentQuotaUsed = 0;
      // Set new reset date
      const now = new Date();
      if (config.quotaPeriod === 'daily') {
        quotaResetDate = new Date(now.setHours(24, 0, 0, 0));
      } else if (config.quotaPeriod === 'monthly') {
        quotaResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (config.quotaPeriod === 'minute') {
        quotaResetDate = new Date(now.getTime() + 60000);
      } else if (config.quotaPeriod === 'second') {
        quotaResetDate = new Date(now.getTime() + 1000);
      }
    }

    const newQuotaUsed = currentQuotaUsed + quotaUnitsUsed;
    const quotaRemaining = Math.max(0, quotaLimit - newQuotaUsed);

    // Upsert quota tracking
    await pool.query(
      `INSERT INTO api_quota_tracking 
       (api_provider, quota_type, quota_limit, quota_used, quota_remaining, quota_reset_date, quota_period)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (api_provider, quota_type, quota_period)
       DO UPDATE SET 
         quota_used = $4,
         quota_remaining = $5,
         quota_reset_date = $6,
         last_updated = CURRENT_TIMESTAMP`,
      [
        apiProvider,
        'requests',
        quotaLimit,
        newQuotaUsed,
        quotaRemaining,
        quotaResetDate,
        config.quotaPeriod,
      ]
    );
  } catch (error) {
    console.error(`Error updating quota tracking for ${apiProvider}:`, error.message);
  }
}

/**
 * Create a tracked axios instance
 */
function createTrackedAxios(serviceName = null) {
  const trackedAxios = axios.create();

  // Add request interceptor
  trackedAxios.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  });

  // Add response interceptor
  trackedAxios.interceptors.response.use(
    async (response) => {
      const endTime = Date.now();
      const responseTime = endTime - response.config.metadata.startTime;
      const url = response.config.url || '';
      const fullUrl = response.config.baseURL 
        ? `${response.config.baseURL}${url}` 
        : url;
      
      const apiProvider = getApiProvider(fullUrl);
      const apiName = API_PROVIDERS[apiProvider]?.name || apiProvider;
      const endpoint = url.split('?')[0]; // Remove query params
      const quotaUnits = calculateQuotaUnits(apiProvider, endpoint, response.config.method);
      
      const responseSize = JSON.stringify(response.data).length;

      // Log the API call
      await logApiCall({
        apiProvider,
        apiName,
        endpoint,
        method: response.config.method?.toUpperCase() || 'GET',
        statusCode: response.status,
        responseTimeMs: responseTime,
        success: true,
        requestParams: response.config.params || null,
        responseSizeBytes: responseSize,
        quotaUnitsUsed: quotaUnits,
        serviceName,
      });

      // Update quota tracking
      await updateQuotaTracking(apiProvider, quotaUnits);

      return response;
    },
    async (error) => {
      const endTime = Date.now();
      const responseTime = error.config?.metadata?.startTime 
        ? endTime - error.config.metadata.startTime 
        : 0;
      
      const url = error.config?.url || '';
      const fullUrl = error.config?.baseURL 
        ? `${error.config.baseURL}${url}` 
        : url;
      
      const apiProvider = getApiProvider(fullUrl);
      const apiName = API_PROVIDERS[apiProvider]?.name || apiProvider;
      const endpoint = url.split('?')[0];
      const quotaUnits = calculateQuotaUnits(apiProvider, endpoint, error.config?.method);
      
      const statusCode = error.response?.status || null;
      const errorMessage = error.response?.data?.error?.message || error.message;

      // Log the failed API call
      await logApiCall({
        apiProvider,
        apiName,
        endpoint,
        method: error.config?.method?.toUpperCase() || 'GET',
        statusCode,
        responseTimeMs: responseTime,
        success: false,
        errorMessage,
        requestParams: error.config?.params || null,
        quotaUnitsUsed: quotaUnits,
        serviceName,
      });

      // Update quota tracking even for errors (some APIs count failed requests)
      await updateQuotaTracking(apiProvider, quotaUnits);

      return Promise.reject(error);
    }
  );

  return trackedAxios;
}

/**
 * Get API call statistics
 */
async function getApiCallStats(timeRange = '24h', apiProvider = null) {
  try {
    let timeFilter = '';
    const params = [];
    
    if (timeRange === '24h') {
      timeFilter = 'created_at >= NOW() - INTERVAL \'24 hours\'';
    } else if (timeRange === '7d') {
      timeFilter = 'created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (timeRange === '30d') {
      timeFilter = 'created_at >= NOW() - INTERVAL \'30 days\'';
    } else if (timeRange === 'all') {
      timeFilter = '1=1';
    }

    if (apiProvider) {
      timeFilter += ` AND api_provider = $${params.length + 1}`;
      params.push(apiProvider);
    }

    const query = `
      SELECT 
        api_provider,
        api_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_calls,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_calls,
        AVG(response_time_ms) as avg_response_time,
        SUM(quota_units_used) as total_quota_units,
        MAX(created_at) as last_call_time
      FROM api_call_logs
      WHERE ${timeFilter}
      GROUP BY api_provider, api_name
      ORDER BY total_calls DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting API call stats:', error);
    throw error;
  }
}

/**
 * Get quota usage for all APIs
 */
async function getQuotaUsage() {
  try {
    const result = await pool.query(
      `SELECT 
        api_provider,
        quota_type,
        quota_limit,
        quota_used,
        quota_remaining,
        quota_reset_date,
        quota_period,
        last_updated
       FROM api_quota_tracking
       ORDER BY api_provider, quota_type`
    );

    return result.rows.map(row => ({
      ...row,
      quota_percentage: row.quota_limit 
        ? Math.round((row.quota_used / row.quota_limit) * 100) 
        : 0,
    }));
  } catch (error) {
    console.error('Error getting quota usage:', error);
    throw error;
  }
}

/**
 * Get recent API calls
 */
async function getRecentApiCalls(limit = 100, apiProvider = null) {
  try {
    let query = `
      SELECT *
      FROM api_call_logs
    `;
    const params = [];
    
    if (apiProvider) {
      query += ` WHERE api_provider = $1`;
      params.push(apiProvider);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting recent API calls:', error);
    throw error;
  }
}

module.exports = {
  createTrackedAxios,
  logApiCall,
  updateQuotaTracking,
  getApiCallStats,
  getQuotaUsage,
  getRecentApiCalls,
  API_PROVIDERS,
};



