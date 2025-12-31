/**
 * Mock Asset News Service
 * Generates random mock asset-specific news
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];

function generateMockAssetNews(symbol) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `mock_asset_news_${symbol}_${i}`,
    title: `Mock News: ${symbol} shows strong performance`,
    description: `This is mock news about ${symbol}.`,
    url: `https://example.com/news/${symbol}/${i}`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    source: sources[i % sources.length]
  }));
}

async function fetchAssetNews(symbol) {
  return generateMockAssetNews(symbol);
}

async function fetchAndCacheAssetNews(symbol) {
  return await fetchAssetNews(symbol);
}

// Get news for an asset (checks cache first, fetches if needed)
// Mock version - just returns mock data
async function getAssetNews(symbol) {
  const normalizedSymbol = symbol.toUpperCase();
  console.log(`[MOCK] Fetching asset news for ${normalizedSymbol}`);
  return generateMockAssetNews(normalizedSymbol);
}

async function refreshAllAssetNews() {
  console.log('[MOCK] Would refresh all asset news');
}

module.exports = {
  fetchAssetNews,
  fetchAndCacheAssetNews,
  getAssetNews,
  refreshAllAssetNews,
  generateMockAssetNews
};

