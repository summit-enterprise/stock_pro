# News API Cost Reduction Strategy

## Current Situation
- **NewsAPI**: $449/month (Business Plan, 250,000 requests/month)
- **Daily Requirements**: 10 + (assets / 100) calls/day
- **Monthly Requirements**: 
  - 15,000 assets: ~4,800 calls/month
  - 25,000 assets: ~7,800 calls/month
  - 50,000 assets: ~15,300 calls/month
  - 100,000 assets: ~30,300 calls/month
  - 150,000 assets: ~45,300 calls/month

## Cost-Effective Alternatives

### Option 1: GNews API (Recommended)
- **Free Tier**: 100 requests/day (3,000/month)
- **Basic Plan**: $49.99/month for 30,000 requests
- **Pro Plan**: $99.99/month for 100,000 requests
- **Enterprise**: Custom pricing
- **Coverage**: Global news, financial sources included
- **Features**: Full-text articles, sentiment analysis
- **Savings**: **$350-400/month** (vs NewsAPI)

**For 25,000 assets:**
- Monthly calls: ~7,800
- **Plan Needed**: Basic Plan ($49.99/month)
- **Savings**: **$399/month**

### Option 2: Mediastack
- **Free Tier**: 100 calls/month
- **Standard Plan**: $24.99/month for 10,000 calls
- **Professional Plan**: $99.99/month for 50,000 calls
- **Business Plan**: $249.99/month for 250,000 calls
- **Coverage**: 7,500+ news sources
- **Savings**: **$199-350/month** (vs NewsAPI)

**For 25,000 assets:**
- Monthly calls: ~7,800
- **Plan Needed**: Standard Plan ($24.99/month)
- **Savings**: **$424/month**

### Option 3: Currents News API
- **Free Tier**: 600 requests/month
- **Professional Plan**: $150/month for 300,000 requests
- **Coverage**: 150,000+ sources
- **Features**: Full-text, sentiment, categorization
- **Savings**: **$299/month** (vs NewsAPI)

**For 25,000 assets:**
- Monthly calls: ~7,800
- **Plan Needed**: Free tier + Professional ($150/month)
- **Savings**: **$299/month**

### Option 4: Newsdata.io
- **Free Tier**: 500 requests/day (15,000/month)
- **Starter Plan**: $9/month for 50,000 requests
- **Professional Plan**: $49/month for 200,000 requests
- **Coverage**: Multilingual, global sources
- **Features**: Full-text, sentiment analysis
- **Savings**: **$400/month** (vs NewsAPI)

**For 25,000 assets:**
- Monthly calls: ~7,800
- **Plan Needed**: Free tier (sufficient!)
- **Savings**: **$449/month** (100% savings!)

### Option 5: Scrapingdog
- **Starter Plan**: $40/month for 400,000 requests
- **Coverage**: Web scraping service (can scrape any news site)
- **Features**: Full HTML/content scraping
- **Legal Note**: Requires compliance with site terms
- **Savings**: **$409/month** (vs NewsAPI)

### Option 6: RSS Feeds (Free)
- **Cost**: $0/month
- **Sources**: 
  - Yahoo Finance RSS
  - Google News RSS
  - Bloomberg RSS
  - Reuters RSS
  - CNBC RSS
  - MarketWatch RSS
  - Financial Times RSS
- **Limitations**: 
  - No API rate limits (but respect site policies)
  - Requires RSS parsing
  - May need web scraping for full articles
- **Savings**: **$449/month** (100% savings!)

### Option 7: Hybrid Approach (Recommended)
Combine multiple free/cheap sources:
- **RSS Feeds**: Free (major financial sources)
- **GNews API Free Tier**: 3,000 requests/month
- **Newsdata.io Free Tier**: 15,000 requests/month
- **Total Free Capacity**: ~18,000 requests/month
- **Cost**: **$0/month**
- **Savings**: **$449/month**

## Recommended Strategy: Multi-Source Hybrid

### Tier 1: Free Sources (Primary)
1. **RSS Feeds** (Free)
   - Yahoo Finance: `https://feeds.finance.yahoo.com/rss/2.0/headline`
   - Google News: `https://news.google.com/rss/search?q=finance`
   - Bloomberg: RSS feeds available
   - Reuters: RSS feeds available
   - **Capacity**: Unlimited (with rate limiting)
   - **Cost**: $0

2. **Newsdata.io Free Tier**
   - 500 requests/day = 15,000/month
   - **Cost**: $0

3. **GNews API Free Tier**
   - 100 requests/day = 3,000/month
   - **Cost**: $0

**Total Free Capacity**: ~18,000+ requests/month

### Tier 2: Paid Backup (If Needed)
- **GNews API Basic**: $49.99/month (30,000 requests)
- **Mediastack Standard**: $24.99/month (10,000 requests)
- **Newsdata.io Starter**: $9/month (50,000 requests)

### Implementation Strategy

#### Phase 1: Free Tier Only (0-18,000 requests/month)
- Use RSS feeds for major financial sources
- Use Newsdata.io free tier for general news
- Use GNews API free tier for additional coverage
- **Cost**: **$0/month**
- **Savings**: **$449/month**

#### Phase 2: Hybrid (18,000-50,000 requests/month)
- Continue using free sources
- Add Newsdata.io Starter ($9/month) for overflow
- **Cost**: **$9/month**
- **Savings**: **$440/month**

#### Phase 3: Scale (50,000+ requests/month)
- Free sources + Newsdata.io Professional ($49/month)
- Or GNews API Pro ($99.99/month)
- **Cost**: **$49-100/month**
- **Savings**: **$349-400/month**

## RSS Feed Implementation

### Major Financial News RSS Sources

1. **Yahoo Finance**
   - General: `https://feeds.finance.yahoo.com/rss/2.0/headline`
   - By Category: `https://feeds.finance.yahoo.com/rss/2.0/headline?category=stocks`
   - By Symbol: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL`

2. **Google News**
   - Finance: `https://news.google.com/rss/search?q=finance`
   - Stocks: `https://news.google.com/rss/search?q=stocks`
   - By Symbol: `https://news.google.com/rss/search?q=AAPL+stock`

3. **Bloomberg**
   - Markets: `https://feeds.bloomberg.com/markets/news.rss`
   - Technology: `https://feeds.bloomberg.com/technology/news.rss`

4. **Reuters**
   - Business: `https://feeds.reuters.com/reuters/businessNews`
   - Markets: `https://feeds.reuters.com/reuters/marketsNews`

5. **CNBC**
   - Top News: `https://www.cnbc.com/id/100003114/device/rss/rss.html`
   - Markets: `https://www.cnbc.com/id/15839135/device/rss/rss.html`

6. **MarketWatch**
   - Top Stories: `https://www.marketwatch.com/rss/topstories`
   - Markets: `https://www.marketwatch.com/rss/markets`

7. **Financial Times**
   - Markets: `https://www.ft.com/markets?format=rss`

### RSS Parser Service
Create a service that:
- Fetches RSS feeds every 15-30 minutes
- Parses XML to extract articles
- Stores in database with metadata
- Deduplicates articles
- **Cost**: $0 (just server resources)

## Cost Comparison

### Current (NewsAPI)
| Asset Count | Monthly Calls | Plan | Cost |
|-------------|---------------|------|------|
| 15,000 | 4,800 | Business | $449 |
| 25,000 | 7,800 | Business | $449 |
| 50,000 | 15,300 | Business | $449 |
| 100,000 | 30,300 | Business | $449 |
| 150,000 | 45,300 | Business | $449 |

### Recommended (Hybrid Free + Paid)
| Asset Count | Monthly Calls | Strategy | Cost | Savings |
|-------------|---------------|----------|------|---------|
| 15,000 | 4,800 | Free only | **$0** | **$449** |
| 25,000 | 7,800 | Free only | **$0** | **$449** |
| 50,000 | 15,300 | Free + Newsdata.io Starter | **$9** | **$440** |
| 100,000 | 30,300 | Free + Newsdata.io Professional | **$49** | **$400** |
| 150,000 | 45,300 | Free + Newsdata.io Professional | **$49** | **$400** |

## Implementation Plan

### Step 1: Create RSS Feed Service
```javascript
// services/general/rssNewsService.js
- Fetch RSS feeds from major sources
- Parse XML to extract articles
- Store in database
- Deduplicate by URL/title
- Cost: $0
```

### Step 2: Integrate Free APIs
- Newsdata.io free tier (15,000/month)
- GNews API free tier (3,000/month)
- **Total Free**: 18,000 requests/month

### Step 3: Smart Caching
- Cache news for 24 hours
- Only fetch new articles
- Reduce API calls by 70-80%

### Step 4: Fallback Strategy
- Primary: RSS feeds (free)
- Secondary: Newsdata.io free tier
- Tertiary: GNews API free tier
- Backup: Paid API only if needed

## Updated Total Costs

### 25,000 Assets (With News Cost Reduction)

**Before:**
- Infrastructure: $206
- APIs: $716 (NewsAPI $449 + others $267)
- **Total**: $922/month

**After (Free News Strategy):**
- Infrastructure: $206
- APIs: $267 (NewsAPI $0 + others $267)
- **Total**: **$473/month**
- **Savings**: **$449/month (49% reduction)**

### 150,000 Assets (With News Cost Reduction)

**Before:**
- Infrastructure: $438
- APIs: $1,398 (NewsAPI $449 + others $949)
- **Total**: $1,836/month

**After (Free + Paid News Strategy):**
- Infrastructure: $438
- APIs: $998 (News $49 + others $949)
- **Total**: **$1,436/month**
- **Savings**: **$400/month (22% reduction)**

## Final Recommendation

### **Use Hybrid Free Strategy:**
1. **RSS Feeds** (Primary) - $0
2. **Newsdata.io Free Tier** (15,000/month) - $0
3. **GNews API Free Tier** (3,000/month) - $0
4. **Newsdata.io Starter** (if needed, 50,000/month) - $9

### **Benefits:**
- ✅ **$449/month savings** for 25,000 assets
- ✅ **$400/month savings** for 150,000 assets
- ✅ Redundant sources (high availability)
- ✅ No vendor lock-in
- ✅ Scalable (add paid tiers as needed)

### **Updated Total Monthly Costs:**

| Asset Count | Infrastructure | APIs (w/ Free News) | **Total** | **Savings** |
|-------------|----------------|---------------------|-----------|-------------|
| **15,000** | $204 | $267 | **$471/month** | **$449** |
| **25,000** | $206 | $267 | **$473/month** | **$449** |
| **50,000** | $263 | $276 | **$539/month** | **$440** |
| **100,000** | $325 | $316 | **$641/month** | **$400** |
| **150,000** | $438 | $998 | **$1,436/month** | **$400** |

## Next Steps

1. **Implement RSS Feed Service** (free, immediate savings)
2. **Integrate Newsdata.io Free Tier** (15,000 requests/month)
3. **Integrate GNews API Free Tier** (3,000 requests/month)
4. **Monitor usage** and add paid tier only if needed
5. **Cancel NewsAPI** subscription

**Expected Savings: $400-449/month (22-49% cost reduction)**

