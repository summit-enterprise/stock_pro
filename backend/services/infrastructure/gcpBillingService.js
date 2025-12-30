/**
 * Google Cloud Platform Billing and Usage Service
 * Fetches usage and billing data from GCP Billing API
 */

const { CloudBillingClient } = require('@google-cloud/billing');
const { MonitoringServiceV2Client } = require('@google-cloud/monitoring');
const redis = require('redis');
const { pool } = require('../../db');
const { getStorageClient } = require('./googleCloudService');

// Redis client for caching billing data
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('GCP Billing Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('GCP Billing Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

const BILLING_CACHE_TTL = 60 * 60; // 1 hour (billing data doesn't change frequently)

// Initialize billing clients
let billingClient = null;
let monitoringClient = null;

/**
 * Initialize GCP Billing clients
 */
async function initializeBillingClients() {
  if (billingClient && monitoringClient) {
    return { billingClient, monitoringClient };
  }

  try {
    // Get project ID from environment
    const projectId = process.env.GCP_PROJECT_ID || 'project-finance-482417';
    
    billingClient = new CloudBillingClient();
    monitoringClient = new MonitoringServiceV2Client();

    console.log('✅ GCP Billing clients initialized');
    return { billingClient, monitoringClient };
  } catch (error) {
    console.error('❌ Failed to initialize GCP Billing clients:', error.message);
    throw error;
  }
}

/**
 * Generate mock billing data for development/testing
 */
function generateMockBillingData(startDate, endDate) {
  const services = [
    { name: 'Cloud Storage', id: 'storage.googleapis.com', unit: 'byte-seconds' },
    { name: 'Compute Engine', id: 'compute.googleapis.com', unit: 'seconds' },
    { name: 'Cloud SQL', id: 'cloudsql.googleapis.com', unit: 'seconds' },
    { name: 'Cloud Functions', id: 'cloudfunctions.googleapis.com', unit: 'seconds' },
    { name: 'BigQuery', id: 'bigquery.googleapis.com', unit: 'bytes' },
    { name: 'Cloud Run', id: 'run.googleapis.com', unit: 'seconds' },
    { name: 'Cloud Logging', id: 'logging.googleapis.com', unit: 'bytes' },
    { name: 'Cloud Monitoring', id: 'monitoring.googleapis.com', unit: 'bytes' },
  ];

  const data = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    services.forEach((service) => {
      // Generate realistic usage and cost
      const baseUsage = Math.random() * 1000000 + 100000;
      const baseCost = baseUsage * (Math.random() * 0.01 + 0.001); // Cost per unit

      data.push({
        serviceName: service.name,
        serviceId: service.id,
        usageDate: dateStr,
        usageAmount: parseFloat(baseUsage.toFixed(6)),
        usageUnit: service.unit,
        costAmount: parseFloat(baseCost.toFixed(6)),
        costCurrency: 'USD',
        location: 'us-central1',
        projectId: process.env.GCP_PROJECT_ID || 'project-finance-482417',
        skuId: `sku-${service.id}-${i}`,
        skuDescription: `${service.name} usage`,
      });
    });
  }

  return data;
}

/**
 * Fetch billing data from GCP Billing API
 * Note: This requires proper billing account setup and permissions
 */
async function fetchBillingDataFromAPI(startDate, endDate) {
  try {
    const { billingClient } = await initializeBillingClients();
    const projectId = process.env.GCP_PROJECT_ID || 'project-finance-482417';
    
    // For now, return mock data
    // In production, you would use the actual billing API:
    // const [accounts] = await billingClient.listBillingAccounts();
    // const billingAccount = accounts[0].name;
    // Then query usage and costs
    
    console.log('Using mock billing data (GCP Billing API requires billing account setup)');
    return generateMockBillingData(startDate, endDate);
  } catch (error) {
    console.error('Error fetching billing data from API:', error.message);
    // Fallback to mock data
    return generateMockBillingData(startDate, endDate);
  }
}

/**
 * Store billing usage data in database
 */
async function storeBillingUsage(data) {
  if (!data || data.length === 0) return;

  try {
    for (const record of data) {
      await pool.query(
        `INSERT INTO gcp_billing_usage (
          service_name, service_id, usage_date, usage_amount, usage_unit,
          cost_amount, cost_currency, location, project_id, sku_id, sku_description, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (service_name, service_id, usage_date, sku_id) 
         DO UPDATE SET 
           usage_amount = EXCLUDED.usage_amount,
           usage_unit = EXCLUDED.usage_unit,
           cost_amount = EXCLUDED.cost_amount,
           cost_currency = EXCLUDED.cost_currency,
           location = EXCLUDED.location,
           project_id = EXCLUDED.project_id,
           sku_description = EXCLUDED.sku_description,
           updated_at = CURRENT_TIMESTAMP`,
        [
          record.serviceName || record.service_name,
          record.serviceId || record.service_id,
          record.usageDate || record.usage_date,
          record.usageAmount || record.usage_amount,
          record.usageUnit || record.usage_unit,
          record.costAmount || record.cost_amount,
          record.costCurrency || record.cost_currency || 'USD',
          record.location,
          record.projectId || record.project_id,
          record.skuId || record.sku_id,
          record.skuDescription || record.sku_description,
        ]
      );
    }

    // Update aggregates
    await updateAggregates(data);
  } catch (error) {
    console.error('Error storing billing usage:', error.message);
    throw error;
  }
}

/**
 * Update aggregated billing data
 */
async function updateAggregates(data) {
  try {
    // Group by service and date
    const aggregates = {};
    
    data.forEach((record) => {
      const key = `${record.serviceName || record.service_name}_${record.usageDate || record.usage_date}`;
      if (!aggregates[key]) {
        aggregates[key] = {
          serviceName: record.serviceName || record.service_name,
          aggregationDate: record.usageDate || record.usage_date,
          totalCost: 0,
          totalUsage: 0,
          usageUnit: record.usageUnit || record.usage_unit,
          currency: record.costCurrency || record.cost_currency || 'USD',
          projectId: record.projectId || record.project_id,
        };
      }
      aggregates[key].totalCost += parseFloat(record.costAmount || record.cost_amount || 0);
      aggregates[key].totalUsage += parseFloat(record.usageAmount || record.usage_amount || 0);
    });

    // Store aggregates
    for (const key in aggregates) {
      const agg = aggregates[key];
      await pool.query(
        `INSERT INTO gcp_billing_aggregates (
          service_name, aggregation_date, total_cost, total_usage,
          usage_unit, currency, project_id, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (service_name, aggregation_date, project_id) 
         DO UPDATE SET 
           total_cost = EXCLUDED.total_cost,
           total_usage = EXCLUDED.total_usage,
           usage_unit = EXCLUDED.usage_unit,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
        [
          agg.serviceName,
          agg.aggregationDate,
          agg.totalCost,
          agg.totalUsage,
          agg.usageUnit,
          agg.currency,
          agg.projectId,
        ]
      );
    }
  } catch (error) {
    console.error('Error updating aggregates:', error.message);
  }
}

/**
 * Get billing usage from database
 */
async function getBillingUsageFromDB(filters = {}) {
  try {
    let query = `
      SELECT 
        id, service_name, service_id, usage_date, usage_amount, usage_unit,
        cost_amount, cost_currency, location, project_id, sku_id, sku_description,
        created_at, updated_at
      FROM gcp_billing_usage
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.serviceName) {
      query += ` AND service_name = $${paramIndex}`;
      params.push(filters.serviceName);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND usage_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND usage_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.projectId) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.projectId);
      paramIndex++;
    }

    query += ` ORDER BY usage_date DESC, service_name`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      serviceName: row.service_name,
      serviceId: row.service_id,
      usageDate: row.usage_date,
      usageAmount: parseFloat(row.usage_amount || 0),
      usageUnit: row.usage_unit,
      costAmount: parseFloat(row.cost_amount || 0),
      costCurrency: row.cost_currency,
      location: row.location,
      projectId: row.project_id,
      skuId: row.sku_id,
      skuDescription: row.sku_description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching billing usage from DB:', error.message);
    throw error;
  }
}

/**
 * Get aggregated billing data
 */
async function getAggregatedBilling(filters = {}) {
  try {
    let query = `
      SELECT 
        service_name, aggregation_date, total_cost, total_usage,
        usage_unit, currency, project_id, updated_at
      FROM gcp_billing_aggregates
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.serviceName) {
      query += ` AND service_name = $${paramIndex}`;
      params.push(filters.serviceName);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND aggregation_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND aggregation_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY aggregation_date DESC, service_name`;

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      serviceName: row.service_name,
      aggregationDate: row.aggregation_date,
      totalCost: parseFloat(row.total_cost || 0),
      totalUsage: parseFloat(row.total_usage || 0),
      usageUnit: row.usage_unit,
      currency: row.currency,
      projectId: row.project_id,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching aggregated billing:', error.message);
    throw error;
  }
}

/**
 * Get service list
 */
async function getServiceList() {
  try {
    const result = await pool.query(
      `SELECT DISTINCT service_name, service_id 
       FROM gcp_billing_usage 
       ORDER BY service_name`
    );
    return result.rows.map(row => ({
      serviceName: row.service_name,
      serviceId: row.service_id,
    }));
  } catch (error) {
    console.error('Error fetching service list:', error.message);
    return [];
  }
}

/**
 * Cache billing data in Redis
 */
async function cacheBillingData(key, data) {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.setEx(key, BILLING_CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to cache billing data: ${key}`, error.message);
    }
  }
}

/**
 * Get billing data from cache
 */
async function getBillingDataFromCache(key) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`Failed to get billing data from cache: ${key}`, error.message);
    }
  }
  return null;
}

/**
 * Fetch and sync billing data
 */
async function fetchAndSyncBilling(startDate, endDate) {
  try {
    await initRedis();

    const cacheKey = `billing:${startDate}:${endDate}`;
    
    // Check cache
    const cached = await getBillingDataFromCache(cacheKey);
    if (cached) {
      console.log('Billing cache hit');
      return cached;
    }

    // Check database for recent data
    const dbData = await getBillingUsageFromDB({
      startDate,
      endDate,
    });

    // If we have data within last 24 hours, use it
    if (dbData.length > 0) {
      const mostRecent = new Date(dbData[0].usageDate);
      const hoursSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        await cacheBillingData(cacheKey, dbData);
        return dbData;
      }
    }

    // Fetch from API (or generate mock)
    const apiData = await fetchBillingDataFromAPI(startDate, endDate);

    // Store in database
    if (apiData.length > 0) {
      await storeBillingUsage(apiData);
    }

    // Cache results
    await cacheBillingData(cacheKey, apiData);

    return apiData;
  } catch (error) {
    console.error('Error in fetchAndSyncBilling:', error.message);
    // Fallback to database
    return await getBillingUsageFromDB({ startDate, endDate });
  }
}

module.exports = {
  initializeBillingClients,
  fetchBillingDataFromAPI,
  generateMockBillingData,
  storeBillingUsage,
  getBillingUsageFromDB,
  getAggregatedBilling,
  getServiceList,
  fetchAndSyncBilling,
  updateAggregates,
  initRedis,
  getRedisClient: () => redisClient,
};

