/**
 * Create Mock Services Script
 * Generates mock versions of all services with random data generation
 */

const fs = require('fs');
const path = require('path');

// Mock service templates for each service type
const mockServices = {
  'data/filingsService': `/**
 * Mock Filings Service
 * Generates random mock SEC filings data
 */

const { pool } = require('../../db');

const filingTypes = ['10-K', '10-Q', '8-K', '13F', 'DEF 14A', 'S-1', 'S-3'];

function generateMockFilings(symbol) {
  const filings = [];
  const today = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i * 2);
    
    filings.push({
      filingType: filingTypes[Math.floor(Math.random() * filingTypes.length)],
      filingDate: date.toISOString().split('T')[0],
      reportDate: date.toISOString().split('T')[0],
      acceptanceDate: date.toISOString().split('T')[0],
      accessionNumber: \`MOCK-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
      documentUrl: \`https://example.com/filing/\${symbol}\`,
      description: \`Mock filing for \${symbol}\`,
    });
  }
  
  return filings;
}

async function fetchFilingsFromAPI(symbol) {
  return generateMockFilings(symbol);
}

async function storeFilings(symbol, filings) {
  // Store to DB if needed
  return filings;
}

async function fetchAndSyncFilings(symbol) {
  const filings = await fetchFilingsFromAPI(symbol);
  await storeFilings(symbol, filings);
  return filings;
}

async function getFilingsStats(symbol) {
  const filings = await fetchAndSyncFilings(symbol);
  return {
    total: filings.length,
    byType: filingTypes.reduce((acc, type) => {
      acc[type] = filings.filter(f => f.filingType === type).length;
      return acc;
    }, {})
  };
}

module.exports = {
  fetchFilingsFromAPI,
  storeFilings,
  fetchAndSyncFilings,
  getFilingsStats,
  generateMockFilings
};`,

  'data/ratingsService': `/**
 * Mock Ratings Service
 * Generates random mock analyst ratings
 */

const { pool } = require('../../db');

const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
const firms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Wells Fargo'];

function generateMockRatings(symbol) {
  return {
    consensus: {
      rating: ratings[Math.floor(Math.random() * ratings.length)],
      targetPrice: Math.random() * 200 + 50,
      numberOfRatings: Math.floor(Math.random() * 20) + 5
    },
    individual: Array.from({ length: 5 }, () => ({
      firm: firms[Math.floor(Math.random() * firms.length)],
      rating: ratings[Math.floor(Math.random() * ratings.length)],
      targetPrice: Math.random() * 200 + 50,
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    }))
  };
}

async function fetchRatingsFromAPI(symbol) {
  return generateMockRatings(symbol);
}

async function storeRatings(ratings) {
  // Store to DB if needed
  return ratings;
}

async function fetchAndSyncRatings(symbol) {
  const ratings = await fetchRatingsFromAPI(symbol);
  await storeRatings(ratings);
  return ratings;
}

module.exports = {
  fetchRatingsFromAPI,
  storeRatings,
  fetchAndSyncRatings,
  generateMockRatings
};`,

  'data/analystRatingsService': `/**
 * Mock Analyst Ratings Service
 * Generates random mock individual analyst ratings
 */

const { pool } = require('../../db');

const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
const firms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Wells Fargo'];
const analysts = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];

function generateMockIndividualRatings(symbol) {
  return Array.from({ length: 10 }, () => ({
    analyst: analysts[Math.floor(Math.random() * analysts.length)],
    firm: firms[Math.floor(Math.random() * firms.length)],
    rating: ratings[Math.floor(Math.random() * ratings.length)],
    targetPrice: Math.random() * 200 + 50,
    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
  }));
}

function generateMockConsensus(symbol, individualRatings) {
  const ratingCounts = individualRatings.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {});
  
  const topRating = Object.keys(ratingCounts).reduce((a, b) => 
    ratingCounts[a] > ratingCounts[b] ? a : b
  );
  
  return {
    rating: topRating,
    targetPrice: individualRatings.reduce((sum, r) => sum + r.targetPrice, 0) / individualRatings.length,
    numberOfRatings: individualRatings.length
  };
}

async function fetchAndSyncRatings(symbol) {
  const individual = generateMockIndividualRatings(symbol);
  const consensus = generateMockConsensus(symbol, individual);
  return { individual, consensus };
}

module.exports = {
  generateMockIndividualRatings,
  generateMockConsensus,
  fetchAndSyncRatings
};`,

  'data/newsService': `/**
 * Mock News Service
 * Generates random mock news articles
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];
const categories = ['business', 'technology', 'finance', 'markets', 'economy'];

function generateMockNews(category = 'business') {
  return Array.from({ length: 10 }, (_, i) => ({
    id: \`mock_news_\${category}_\${i}\`,
    title: \`Mock News Article \${i + 1} about \${category}\`,
    description: \`This is a mock news article description for \${category} category.\`,
    url: \`https://example.com/news/\${category}/\${i}\`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    source: sources[i % sources.length],
    category: category
  }));
}

async function fetchNews(category = 'business') {
  return generateMockNews(category);
}

async function getNewsFromCache(category) {
  return null;
}

async function cacheNews(category, news) {
  // No caching in mock mode
}

module.exports = {
  fetchNews,
  getNewsFromCache,
  cacheNews,
  generateMockNews
};`,

  'data/assetNewsService': `/**
 * Mock Asset News Service
 * Generates random mock asset-specific news
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];

function generateMockAssetNews(symbol) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: \`mock_asset_news_\${symbol}_\${i}\`,
    title: \`Mock News: \${symbol} shows strong performance\`,
    description: \`This is mock news about \${symbol}.\`,
    url: \`https://example.com/news/\${symbol}/\${i}\`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    source: sources[i % sources.length]
  }));
}

async function fetchAssetNews(symbol) {
  return generateMockAssetNews(symbol);
}

module.exports = {
  fetchAssetNews,
  generateMockAssetNews
};`,

  'storage/logoService': `/**
 * Mock Logo Service
 * Returns null logos (uses default icons)
 */

async function fetchLogoUrl(symbol, assetType, assetName) {
  return null; // No logos in mock mode
}

async function getAssetLogo(symbol, assetType, assetName) {
  return null; // No logos in mock mode
}

async function getLogoUrl(symbol) {
  return null;
}

module.exports = {
  getAssetLogo,
  getLogoUrl,
  fetchLogoUrl
};`,

  'storage/storageService': `/**
 * Mock Storage Service
 * Simulates file storage operations
 */

async function uploadFile(localFilePath, destinationPath, options = {}) {
  console.log(\`[MOCK] Would upload \${localFilePath} to \${destinationPath}\`);
  return {
    success: true,
    bucket: options.bucket || 'mock-bucket',
    path: destinationPath,
    publicUrl: \`https://mock-storage.example.com/\${destinationPath}\`
  };
}

async function uploadFileCompressed(localFilePath, destinationPath, options = {}) {
  return uploadFile(localFilePath, destinationPath, options);
}

async function deleteFile(destinationPath, bucketName) {
  console.log(\`[MOCK] Would delete \${destinationPath}\`);
  return { success: true };
}

async function getFileMetadata(destinationPath, bucketName) {
  return {
    size: 1024,
    contentType: 'image/png',
    updated: new Date().toISOString()
  };
}

module.exports = {
  uploadFile,
  uploadFileCompressed,
  deleteFile,
  getFileMetadata
};`,

  'billing/gcpBillingService': `/**
 * Mock GCP Billing Service
 * Generates random mock billing data
 */

function generateMockBillingData(startDate, endDate) {
  const services = [
    'Compute Engine', 'Cloud Storage', 'Cloud SQL', 'Cloud Functions',
    'BigQuery', 'Cloud Run', 'Cloud Logging', 'Cloud Monitoring'
  ];
  
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

async function fetchAndSyncBilling(startDate, endDate) {
  return generateMockBillingData(startDate, endDate);
}

async function getBillingDataFromCache(key) {
  return null;
}

module.exports = {
  generateMockBillingData,
  fetchAndSyncBilling,
  getBillingDataFromCache
};`
};

// Create mock services
const servicesDir = path.join(__dirname, '..');
const mockservicesDir = path.join(servicesDir, 'mockservices');

Object.entries(mockServices).forEach(([servicePath, content]) => {
  const fullPath = path.join(mockservicesDir, \`\${servicePath}.js\`);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write mock service file
  fs.writeFileSync(fullPath, content);
  console.log(\`✅ Created \${servicePath}.js\`);
});

console.log('\\n✅ All mock services created!');



