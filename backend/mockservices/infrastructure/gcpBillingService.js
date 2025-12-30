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

module.exports = {
  initializeBillingClients,
  fetchBillingDataFromAPI,
  generateMockBillingData,
  storeBillingUsage,
  fetchAndSyncBilling,
  getBillingDataFromCache
};

