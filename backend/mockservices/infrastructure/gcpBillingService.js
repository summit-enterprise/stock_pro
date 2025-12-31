/**
 * Mock GCP Billing Service
 * Generates random mock billing data
 */

const { pool } = require('../../db');

const services = [
  'Compute Engine', 'Cloud Storage', 'Cloud SQL', 'Cloud Functions',
  'BigQuery', 'Cloud Run', 'Cloud Logging', 'Cloud Monitoring'
];

function generateMockBillingData(startDate, endDate) {
  const data = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    services.forEach(service => {
      data.push({
        service: service,
        date: currentDate.toISOString().split('T')[0],
        cost: Math.random() * 1000,
        usage: Math.random() * 1000000,
        unit: 'bytes'
      });
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

async function fetchBillingDataFromAPI(startDate, endDate) {
  return generateMockBillingData(startDate, endDate);
}

async function storeBillingUsage(data) {
  // Store to DB if needed
  return data;
}

async function fetchAndSyncBilling(startDate, endDate) {
  const data = await fetchBillingDataFromAPI(startDate, endDate);
  await storeBillingUsage(data);
  return data;
}

async function getBillingDataFromCache(key) {
  return null;
}

async function initializeBillingClients() {
  console.log('[MOCK] Billing clients initialized (mock mode)');
  return true;
}

async function getBillingUsageFromDB(filters = {}) {
  try {
    // Return empty array if table doesn't exist or no data
    try {
      const result = await pool.query('SELECT COUNT(*) FROM gcp_billing_usage');
      if (result.rows[0].count === '0') {
        return [];
      }
    } catch (e) {
      return [];
    }

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
    console.error('Error fetching billing usage:', error.message);
    return [];
  }
}

async function getAggregatedBilling(filters = {}) {
  try {
    // Return empty array if table doesn't exist or no data
    try {
      const result = await pool.query('SELECT COUNT(*) FROM gcp_billing_aggregates');
      if (result.rows[0].count === '0') {
        return [];
      }
    } catch (e) {
      return [];
    }

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
    return [];
  }
}

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

module.exports = {
  initializeBillingClients,
  fetchBillingDataFromAPI,
  generateMockBillingData,
  storeBillingUsage,
  fetchAndSyncBilling,
  getBillingDataFromCache,
  getBillingUsageFromDB,
  getAggregatedBilling,
  getServiceList,
};

