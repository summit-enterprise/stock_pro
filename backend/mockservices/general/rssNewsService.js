/**
 * Mock RSS News Service
 * Generates mock RSS feed data for development/testing
 */

const { pool } = require('../../db');

const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times', 'MarketWatch', 'Yahoo Finance', 'Forbes', 'Business Insider', 'The Street'];

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
  'Cryptocurrency Adoption Increases Globally',
  'Green Energy Investments Reach Record Highs',
  'AI Technology Transforms Financial Services',
  'Supply Chain Disruptions Impact Global Trade',
  'Central Banks Coordinate Monetary Policy',
  'Emerging Markets Attract Foreign Investment',
  'Corporate Earnings Season Exceeds Expectations',
  'Trade Tensions Ease Between Major Economies',
  'Digital Currency Regulations Take Shape',
  'Sustainable Investing Gains Momentum',
];

// Generate mock RSS articles
function generateMockRSSArticles(category = 'business', query = null, count = 30) {
  const titles = category === 'business' || category === 'markets' 
    ? marketNewsTitles 
    : Array.from({ length: count }, (_, i) => `Mock News Article ${i + 1} about ${category}`);
  
  const allTitles = query 
    ? marketNewsTitles.filter(title => title.toLowerCase().includes(query.toLowerCase())).concat(marketNewsTitles)
    : [...titles, ...marketNewsTitles];
  
  // Mock image URLs for variety
  const mockImages = [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
  ];
  
  return allTitles.slice(0, count).map((title, index) => {
    const publishedAt = new Date(Date.now() - index * 3600000); // Staggered times
    
    return {
      id: `rss_mock_${category || 'general'}_${index}_${Date.now()}`,
      title: query ? `${title} - ${query}` : title,
      description: `Market analysis and insights on ${title.toLowerCase()}. This article provides comprehensive coverage of recent market developments and their implications for investors.`,
      source: sources[index % sources.length],
      author: 'Market Analyst',
      url: `https://example.com/news/${category || 'general'}/${index}`,
      urlToImage: mockImages[index % mockImages.length], // Include mock images
      publishedAt: publishedAt.toISOString(),
      publishedDate: publishedAt.toLocaleDateString(),
      publishedTime: publishedAt.toLocaleTimeString(),
      category: category || 'business',
    };
  });
}

// Mock RSS feed fetching
async function fetchNewsFromRSS(category = 'business', query = null) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return generateMockRSSArticles(category, query, 30);
}

// Mock cached news fetching
async function fetchAndCacheNews(category, country = null, query = null) {
  // Build cache key
  let cacheKey;
  if (country) {
    cacheKey = `rss_news:${category || 'general'}:${country}`;
  } else if (query) {
    cacheKey = `rss_news:${category || 'general'}:${query}`;
  } else {
    cacheKey = `rss_news:${category || 'general'}`;
  }

  console.log(`[MOCK RSS] Fetching news for ${cacheKey}...`);
  const articles = await fetchNewsFromRSS(category, query);
  console.log(`[MOCK RSS] Generated ${articles.length} mock articles for ${cacheKey}`);
  
  return articles;
}

// Mock asset-specific news
async function fetchAssetNews(symbol) {
  console.log(`[MOCK RSS] Fetching asset news for ${symbol}...`);
  
  // Generate news specific to the symbol
  const symbolNews = generateMockRSSArticles('business', symbol, 30);
  
  console.log(`[MOCK RSS] Generated ${symbolNews.length} mock articles for ${symbol}`);
  return symbolNews;
}

// Mock refresh all news
async function refreshAllNews() {
  console.log('[MOCK RSS] Refreshing all news categories...');
  
  const results = {
    market: await fetchNewsFromRSS('business'),
    crypto: await fetchNewsFromRSS('crypto'),
    us: await fetchNewsFromRSS('business'),
    world: await fetchNewsFromRSS('business'),
  };
  
  console.log('[MOCK RSS] News refresh completed');
  return results;
}

// Mock Redis initialization
async function initRedis() {
  console.log('[MOCK RSS] Redis initialization skipped (mock mode)');
  return false;
}

// Mock service control
function startNewsService(intervalHours = 2.5) {
  console.log(`[MOCK RSS] News service started (mock mode, would refresh every ${intervalHours} hours)`);
}

function stopNewsService() {
  console.log('[MOCK RSS] News service stopped');
}

function getRedisClient() {
  return null;
}

module.exports = {
  initRedis,
  fetchNewsFromRSS,
  fetchAndCacheNews,
  fetchAssetNews,
  refreshAllNews,
  startNewsService,
  stopNewsService,
  getRedisClient,
};

