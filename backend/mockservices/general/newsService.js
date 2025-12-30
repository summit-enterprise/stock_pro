/**
 * Mock News Service
 * Generates random mock news articles
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];
const categories = ['business', 'technology', 'finance', 'markets', 'economy'];

function generateMockNews(category = 'business') {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `mock_news_${category}_${i}`,
    title: `Mock News Article ${i + 1} about ${category}`,
    description: `This is a mock news article description for ${category} category.`,
    url: `https://example.com/news/${category}/${i}`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    source: sources[i % sources.length],
    category: category
  }));
}

async function fetchNewsFromAPI(category = 'business') {
  return generateMockNews(category);
}

async function fetchAndCacheNews(category = 'business') {
  const news = await fetchNewsFromAPI(category);
  return news;
}

async function initRedis() {
  return false; // No Redis in mock mode
}

function startNewsService() {
  console.log('[MOCK] News service started (mock mode)');
}

function stopNewsService() {
  console.log('[MOCK] News service stopped');
}

function refreshAllNews() {
  console.log('[MOCK] Would refresh all news');
}

function getRedisClient() {
  return null;
}

module.exports = {
  initRedis,
  fetchNewsFromAPI,
  fetchAndCacheNews,
  refreshAllNews,
  startNewsService,
  stopNewsService,
  getRedisClient
};

