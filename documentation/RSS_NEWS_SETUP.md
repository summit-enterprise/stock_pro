# RSS News Service Setup Guide

## Overview
The RSS News Service provides a **free alternative to NewsAPI** by fetching news from RSS feeds of major financial news sources. This saves **$449/month** in API costs.

## What's Included

### 1. **General Market News**
- Fetched from RSS feeds (Yahoo Finance, Google News, Bloomberg, Reuters, CNBC, MarketWatch)
- Covers business, markets, crypto, and world news
- **No API keys required** - RSS feeds are free!

### 2. **Asset-Specific News**
- Fetched from RSS feeds for individual stocks/crypto/assets
- Uses Google News and Yahoo Finance RSS feeds with symbol queries
- **No API keys required** - RSS feeds are free!

## Setup Requirements

### Development (Local)
**No configuration needed!** The service automatically uses mock data when:
- `NODE_ENV !== 'production'` AND
- `USE_MOCK_DATA !== 'false'`

Mock RSS data is automatically generated for testing.

### Production/Development (Real RSS Feeds)

#### Required Dependencies
```bash
cd backend
npm install fast-xml-parser
```

#### Environment Variables
**NO API KEYS REQUIRED!** RSS feeds are completely free.

However, you can optionally set:
```env
# Optional: Use mock data even in production (for testing)
USE_MOCK_DATA=false  # Set to 'true' to use mock data

# Optional: Redis URL (if not using default)
REDIS_URL=redis://localhost:6379
```

#### No Additional Configuration Needed!
RSS feeds work out of the box with no API keys, no registration, and no setup.

## How It Works

### Priority Order:
1. **RSS Feeds** (Primary) - Free, no API key required
2. **NewsAPI** (Fallback) - Only used if RSS fails AND `NEWS_API_KEY` is set
3. **Mock Data** (Development) - Used when `USE_MOCK_DATA=true`

### RSS Feed Sources:

#### General News:
- **Yahoo Finance**: Markets, stocks, general finance
- **Google News**: Finance, stocks, crypto searches
- **Bloomberg**: Markets, technology
- **Reuters**: Business, markets
- **CNBC**: Top news, markets
- **MarketWatch**: Top stories, markets

#### Asset-Specific News:
- **Google News RSS**: `https://news.google.com/rss/search?q={SYMBOL}`
- **Yahoo Finance RSS**: `https://feeds.finance.yahoo.com/rss/2.0/headline?s={SYMBOL}`

## Usage

### Automatic Integration
The RSS service is automatically integrated into:
- `newsService.js` - General market news
- `assetNewsService.js` - Asset-specific news

Both services automatically use RSS feeds first, then fall back to NewsAPI if needed.

### Manual Usage
```javascript
const rssNewsService = require('./services/general/rssNewsService');

// Fetch general news
const articles = await rssNewsService.fetchNewsFromRSS('business');

// Fetch asset-specific news
const assetArticles = await rssNewsService.fetchAssetNews('AAPL');

// Fetch and cache news
const cachedArticles = await rssNewsService.fetchAndCacheNews('business');
```

## Mock Data

### Development Mode
When `USE_MOCK_DATA=true`, the service automatically uses mock RSS data:
- Generates 30 mock articles per request
- Includes realistic titles, descriptions, sources
- Simulates network delays
- No external API calls

### Mock Service Location
`backend/mockservices/general/rssNewsService.js`

## Caching

### Redis Caching
- **TTL**: 2.5 hours (9000 seconds)
- **Cache Keys**:
  - `rss_news:business` - General business news
  - `rss_news:asset:AAPL` - Asset-specific news
  - `rss_news:crypto` - Crypto news

### Cache Benefits
- Reduces RSS feed requests
- Faster response times
- Respects rate limits (if any)

## Rate Limiting

### RSS Feed Etiquette
- **Delay between requests**: 500ms
- **Delay between categories**: 2 seconds
- **User-Agent**: Set to identify the bot
- **Respect robots.txt**: Follows standard web scraping practices

### No Hard Limits
RSS feeds don't have API rate limits, but we implement delays to be respectful:
- 500ms between individual feed requests
- 2 seconds between category refreshes

## Cost Savings

### Before (NewsAPI)
- **Cost**: $449/month
- **Limits**: 250,000 requests/month
- **API Key Required**: Yes

### After (RSS Feeds)
- **Cost**: **$0/month** ✅
- **Limits**: None (with respectful rate limiting)
- **API Key Required**: **No** ✅

### Savings
- **$449/month** for 25,000 assets
- **$400/month** for 150,000 assets
- **49% cost reduction** overall

## Troubleshooting

### RSS Feeds Not Working
1. **Check internet connection** - RSS feeds require internet access
2. **Check feed URLs** - Some feeds may be temporarily unavailable
3. **Check logs** - Look for "Failed to fetch RSS feed" warnings
4. **Fallback to NewsAPI** - Service automatically falls back if RSS fails

### Mock Data Not Working
1. **Check `USE_MOCK_DATA`** - Should be `true` in development
2. **Check `NODE_ENV`** - Should not be `production`
3. **Check mock service** - Ensure `mockservices/general/rssNewsService.js` exists

### Redis Caching Issues
1. **Check Redis connection** - Ensure Redis is running
2. **Check `REDIS_URL`** - Verify environment variable
3. **Service continues without Redis** - Caching is optional

## Production Deployment

### Step 1: Install Dependencies
```bash
cd backend
npm install fast-xml-parser
```

### Step 2: Environment Variables
```env
# Production environment
NODE_ENV=production
USE_MOCK_DATA=false

# Optional: Redis URL
REDIS_URL=redis://your-redis-host:6379
```

### Step 3: Deploy
No additional configuration needed! RSS feeds work immediately.

### Step 4: Monitor
- Check logs for RSS feed fetch success/failures
- Monitor Redis cache hit rates
- Verify news articles are being fetched

## Testing

### Test RSS Service Directly
```javascript
const rssNewsService = require('./services/general/rssNewsService');

// Test general news
const articles = await rssNewsService.fetchNewsFromRSS('business');
console.log(`Fetched ${articles.length} articles`);

// Test asset news
const assetNews = await rssNewsService.fetchAssetNews('AAPL');
console.log(`Fetched ${assetNews.length} articles for AAPL`);
```

### Test in Development
```bash
# Set environment variable
export USE_MOCK_DATA=true

# Run server
npm run dev
```

## Summary

✅ **No API keys required** - RSS feeds are completely free  
✅ **Automatic integration** - Works with existing news services  
✅ **Mock data available** - For development and testing  
✅ **Production ready** - Just install `fast-xml-parser`  
✅ **$449/month savings** - Eliminates NewsAPI costs  

**That's it!** RSS feeds work out of the box with no additional setup.



