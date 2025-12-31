/**
 * Mock News Service
 * Generates random mock news articles
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch', 'Yahoo Finance', 'Forbes', 'Business Insider', 'The Street'];
const categories = ['business', 'technology', 'finance', 'markets', 'economy'];

const marketNewsTitles = [
  'Stock Market Reaches New Highs Amid Economic Optimism',
  'Tech Stocks Rally on Strong Earnings Reports',
  'Federal Reserve Signals Potential Rate Changes',
  'Cryptocurrency Market Shows Volatility',
  'Global Markets React to Trade Agreement News',
  'Energy Sector Sees Significant Gains',
  'Healthcare Stocks Surge on Drug Approval News',
  'Real Estate Market Shows Signs of Cooling',
  'Consumer Spending Data Exceeds Expectations',
  'Manufacturing Sector Reports Strong Growth',
  'International Markets Close Mixed',
  'Commodity Prices Fluctuate on Supply Concerns',
  'Banking Sector Announces Major Merger',
  'Tech Giants Report Record Quarterly Earnings',
  'Economic Indicators Point to Continued Growth',
  'Inflation Data Surprises Analysts',
  'Housing Market Shows Resilience',
  'Oil Prices Climb on Production Cuts',
  'Retail Sector Faces Headwinds',
  'Airlines Rebound on Travel Demand',
];

function generateMockNews(category = 'business') {
  const titles = category === 'business' || category === 'markets' ? marketNewsTitles : 
    Array.from({ length: 15 }, (_, i) => `Mock News Article ${i + 1} about ${category}`);
  
  return titles.slice(0, 15).map((title, index) => ({
    id: `mock_news_${category}_${index}_${Date.now()}`,
    title,
    description: `Market analysis and insights on ${title.toLowerCase()}. This article provides comprehensive coverage of recent market developments and their implications for investors.`,
    source: sources[index % sources.length],
    author: 'Market Analyst',
    url: `https://example.com/news/${category}/${index}`,
    urlToImage: null,
    publishedAt: new Date(Date.now() - index * 3600000).toISOString(), // Staggered times
    publishedDate: new Date(Date.now() - index * 3600000).toLocaleDateString(),
    publishedTime: new Date(Date.now() - index * 3600000).toLocaleTimeString(),
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

