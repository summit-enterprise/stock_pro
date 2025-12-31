# Cost Analysis: 25,000 to 150,000 Assets

## Overview
This document provides detailed cost analysis for running the application with asset counts ranging from 15,000 to 150,000, including both storage costs and API usage costs for daily data fetching.

## Storage Costs by Asset Count

### 25,000 Assets (Starting Target)

#### PostgreSQL (TimescaleDB) Storage
- **Records per Asset**: 39,312 (hourly data since 2000)
- **Total Records**: 25,000 × 39,312 = **982,800,000 records**
- **Raw Data Size**: 982.8M × 115 bytes = **113 GB**
- **Compressed Size** (70% reduction): 113 GB × 0.3 = **34 GB**
- **Indexes**: 34 GB × 0.2 = **7 GB**
- **Additional Tables** (dividends, filings, ratings, etc.): **~2 GB**
- **WAL & Overhead**: (34 + 7 + 2) × 0.25 = **11 GB**
- **Total PostgreSQL**: **~54 GB**

#### Redis Storage
- **Price Data Cache**: 25,000 × 195 records × 200 bytes = **975 MB**
- **Current Prices**: 25,000 × 150 bytes = **4 MB**
- **Market Data**: **30 KB**
- **News**: **200 KB**
- **API Logs**: **5 MB**
- **Overhead**: 975 MB × 0.3 = **293 MB**
- **Total Redis**: **~1.3 GB**

#### Total Storage: 25,000 Assets
- **PostgreSQL**: 54 GB
- **Redis**: 1.3 GB
- **Total**: **~55 GB**

### 50,000 Assets

#### PostgreSQL (TimescaleDB) Storage
- **Total Records**: 50,000 × 39,312 = **1,965,600,000 records**
- **Compressed Size**: 113 GB × 2 × 0.3 = **68 GB**
- **Indexes**: 68 GB × 0.2 = **14 GB**
- **Additional Tables**: **~4 GB**
- **WAL & Overhead**: (68 + 14 + 4) × 0.25 = **22 GB**
- **Total PostgreSQL**: **~108 GB**

#### Redis Storage
- **Price Data Cache**: 50,000 × 195 × 200 bytes = **1.95 GB**
- **Current Prices**: 50,000 × 150 bytes = **8 MB**
- **Overhead**: 1.95 GB × 0.3 = **585 MB**
- **Total Redis**: **~2.5 GB**

#### Total Storage: 50,000 Assets
- **PostgreSQL**: 108 GB
- **Redis**: 2.5 GB
- **Total**: **~111 GB**

### 100,000 Assets

#### PostgreSQL (TimescaleDB) Storage
- **Total Records**: 100,000 × 39,312 = **3,931,200,000 records**
- **Compressed Size**: 113 GB × 4 × 0.3 = **136 GB**
- **Indexes**: 136 GB × 0.2 = **27 GB**
- **Additional Tables**: **~8 GB**
- **WAL & Overhead**: (136 + 27 + 8) × 0.25 = **43 GB**
- **Total PostgreSQL**: **~214 GB**

#### Redis Storage
- **Price Data Cache**: 100,000 × 195 × 200 bytes = **3.9 GB**
- **Current Prices**: 100,000 × 150 bytes = **15 MB**
- **Overhead**: 3.9 GB × 0.3 = **1.2 GB**
- **Total Redis**: **~5.1 GB**

#### Total Storage: 100,000 Assets
- **PostgreSQL**: 214 GB
- **Redis**: 5.1 GB
- **Total**: **~219 GB**

### 150,000 Assets (Full Scale)

#### PostgreSQL (TimescaleDB) Storage
- **Total Records**: 150,000 × 39,312 = **5,896,800,000 records**
- **Compressed Size**: 113 GB × 6 × 0.3 = **203 GB**
- **Indexes**: 203 GB × 0.2 = **41 GB**
- **Additional Tables**: **~12 GB**
- **WAL & Overhead**: (203 + 41 + 12) × 0.25 = **64 GB**
- **Total PostgreSQL**: **~328 GB**

#### Redis Storage
- **Price Data Cache**: 150,000 × 195 × 200 bytes = **5.85 GB**
- **Current Prices**: 150,000 × 150 bytes = **23 MB**
- **Overhead**: 5.85 GB × 0.3 = **1.8 GB**
- **Total Redis**: **~8.3 GB**

#### Total Storage: 150,000 Assets
- **PostgreSQL**: 328 GB
- **Redis**: 8.3 GB
- **Total**: **~336 GB**

## API Usage Costs for Daily Data Fetching

### API Providers & Pricing

#### Polygon.io
- **Free Tier**: 5M calls/month
- **Starter Plan**: $29/month (100 calls/minute)
- **Developer Plan**: $99/month (5 calls/second)
- **Advanced Plan**: $249/month (15 calls/second)
- **Quota per Call**: 1 unit (most endpoints)

**Daily Data Requirements:**
- **Current Price**: 1 call per asset
- **Historical Data**: 1 call per asset (if updating)
- **Dividends**: 1 call per asset (weekly check)
- **Filings**: 1 call per asset (weekly check)
- **Ratings**: 1 call per asset (weekly check)

**Daily Calls per Asset**: ~1.5 calls (average)
- Current price: 1 call
- Historical update: 0.3 calls (only for active assets)
- Dividends: 0.1 calls (weekly, daily average)
- Filings: 0.05 calls (weekly, daily average)
- Ratings: 0.05 calls (weekly, daily average)

#### NewsAPI
- **Free Tier**: 100 requests/day
- **Business Plan**: $449/month (250,000 requests/month)
- **Quota per Call**: 1 unit

**Daily Requirements:**
- **Market News**: 10 calls/day
- **Asset News**: 1 call per 100 assets (rotating)
- **Total**: 10 + (assets / 100) calls/day

#### CoinGecko
- **Free Tier**: 50 calls/minute
- **Analyst Plan**: $129/month (500 calls/minute)
- **Quota per Call**: 1 unit

**Daily Requirements:**
- **Crypto List**: 1 call/day
- **Crypto Prices**: 1 call per crypto asset/day
- **Historical Data**: 0.2 calls per crypto asset/day

#### Finnhub
- **Free Tier**: 60 calls/minute
- **Basic Plan**: $9/month (60 calls/minute)
- **Premium Plan**: $39/month (300 calls/minute)
- **Quota per Call**: 1 unit

**Daily Requirements:**
- **Logo Fetching**: 0.1 calls per asset/day (only for new assets)

#### YouTube Data API
- **Free Tier**: 10,000 units/day
- **Quota per Call**: 100 units (search), 1 unit (videos)
- **Daily Requirements**: ~50 calls/day (live stream checks)
- **Total Units**: ~5,000 units/day

### API Cost Calculations

#### 15,000 Assets

**Polygon.io:**
- Daily calls: 15,000 × 1.5 = **22,500 calls/day**
- Monthly calls: 22,500 × 30 = **675,000 calls/month**
- **Plan Needed**: Developer Plan ($99/month) - covers 5M/month
- **Cost**: **$99/month**

**NewsAPI:**
- Daily calls: 10 + (15,000 / 100) = **160 calls/day**
- Monthly calls: 160 × 30 = **4,800 calls/month**
- **Plan Needed**: Free tier (100/day) - **NOT SUFFICIENT**
- **Plan Needed**: Business Plan ($449/month)
- **Cost**: **$449/month**

**CoinGecko:**
- Assuming 20% are crypto: 15,000 × 0.2 = 3,000 cryptos
- Daily calls: 1 + 3,000 + (3,000 × 0.2) = **4,201 calls/day**
- Monthly calls: 4,201 × 30 = **126,030 calls/month**
- **Plan Needed**: Analyst Plan ($129/month)
- **Cost**: **$129/month**

**Finnhub:**
- Daily calls: 15,000 × 0.1 = **1,500 calls/day**
- Monthly calls: 1,500 × 30 = **45,000 calls/month**
- **Plan Needed**: Premium Plan ($39/month)
- **Cost**: **$39/month**

**YouTube:**
- Daily units: **5,000 units/day**
- Monthly units: 5,000 × 30 = **150,000 units/month**
- **Plan Needed**: Free tier (300,000/month)
- **Cost**: **$0/month**

**Total API Costs: 15,000 Assets**
- Polygon.io: $99
- NewsAPI: $449
- CoinGecko: $129
- Finnhub: $39
- YouTube: $0
- **Total**: **$716/month**

#### 25,000 Assets (Starting Target)

**Polygon.io:**
- Daily calls: 25,000 × 1.5 = **37,500 calls/day**
- Monthly calls: 37,500 × 30 = **1,125,000 calls/month**
- **Plan Needed**: Developer Plan ($99/month)
- **Cost**: **$99/month**

**NewsAPI:**
- Daily calls: 10 + (25,000 / 100) = **260 calls/day**
- Monthly calls: 260 × 30 = **7,800 calls/month**
- **Plan Needed**: Business Plan ($449/month)
- **Cost**: **$449/month**

**CoinGecko:**
- Assuming 20% are crypto: 25,000 × 0.2 = 5,000 cryptos
- Daily calls: 1 + 5,000 + (5,000 × 0.2) = **6,001 calls/day**
- Monthly calls: 6,001 × 30 = **180,030 calls/month**
- **Plan Needed**: Analyst Plan ($129/month)
- **Cost**: **$129/month**

**Finnhub:**
- Daily calls: 25,000 × 0.1 = **2,500 calls/day**
- Monthly calls: 2,500 × 30 = **75,000 calls/month**
- **Plan Needed**: Premium Plan ($39/month)
- **Cost**: **$39/month**

**YouTube:**
- **Cost**: **$0/month**

**Total API Costs: 25,000 Assets**
- **Total**: **$716/month** (same as 15,000 - within API limits)

#### 50,000 Assets

**Polygon.io:**
- Daily calls: 50,000 × 1.5 = **75,000 calls/day**
- Monthly calls: 75,000 × 30 = **2,250,000 calls/month**
- **Plan Needed**: Developer Plan ($99/month)
- **Cost**: **$99/month**

**NewsAPI:**
- Daily calls: 10 + (50,000 / 100) = **510 calls/day**
- Monthly calls: 510 × 30 = **15,300 calls/month**
- **Plan Needed**: Business Plan ($449/month)
- **Cost**: **$449/month**

**CoinGecko:**
- Assuming 20% are crypto: 50,000 × 0.2 = 10,000 cryptos
- Daily calls: 1 + 10,000 + (10,000 × 0.2) = **12,001 calls/day**
- Monthly calls: 12,001 × 30 = **360,030 calls/month**
- **Plan Needed**: Analyst Plan ($129/month) - **AT LIMIT**
- **Cost**: **$129/month**

**Finnhub:**
- Daily calls: 50,000 × 0.1 = **5,000 calls/day**
- Monthly calls: 5,000 × 30 = **150,000 calls/month**
- **Plan Needed**: Premium Plan ($39/month)
- **Cost**: **$39/month**

**Total API Costs: 50,000 Assets**
- **Total**: **$716/month**

#### 100,000 Assets

**Polygon.io:**
- Daily calls: 100,000 × 1.5 = **150,000 calls/day**
- Monthly calls: 150,000 × 30 = **4,500,000 calls/month**
- **Plan Needed**: Developer Plan ($99/month) - **AT LIMIT**
- **Cost**: **$99/month**

**NewsAPI:**
- Daily calls: 10 + (100,000 / 100) = **1,010 calls/day**
- Monthly calls: 1,010 × 30 = **30,300 calls/month**
- **Plan Needed**: Business Plan ($449/month)
- **Cost**: **$449/month**

**CoinGecko:**
- Assuming 20% are crypto: 100,000 × 0.2 = 20,000 cryptos
- Daily calls: 1 + 20,000 + (20,000 × 0.2) = **24,001 calls/day**
- Monthly calls: 24,001 × 30 = **720,030 calls/month**
- **Plan Needed**: Analyst Plan ($129/month) - **EXCEEDS LIMIT**
- **Note**: May need Enterprise plan or rate limiting
- **Cost**: **$129/month** (with optimization)

**Finnhub:**
- Daily calls: 100,000 × 0.1 = **10,000 calls/day**
- Monthly calls: 10,000 × 30 = **300,000 calls/month**
- **Plan Needed**: Premium Plan ($39/month) - **AT LIMIT**
- **Cost**: **$39/month**

**Total API Costs: 100,000 Assets**
- **Total**: **$716/month** (with optimizations)

#### 150,000 Assets

**Polygon.io:**
- Daily calls: 150,000 × 1.5 = **225,000 calls/day**
- Monthly calls: 225,000 × 30 = **6,750,000 calls/month**
- **Plan Needed**: Advanced Plan ($249/month) - **EXCEEDS Developer limit**
- **Cost**: **$249/month**

**NewsAPI:**
- Daily calls: 10 + (150,000 / 100) = **1,510 calls/day**
- Monthly calls: 1,510 × 30 = **45,300 calls/month**
- **Plan Needed**: Business Plan ($449/month)
- **Cost**: **$449/month**

**CoinGecko:**
- Assuming 20% are crypto: 150,000 × 0.2 = 30,000 cryptos
- Daily calls: 1 + 30,000 + (30,000 × 0.2) = **36,001 calls/day**
- Monthly calls: 36,001 × 30 = **1,080,030 calls/month**
- **Plan Needed**: Enterprise Plan (custom pricing, ~$500+/month)
- **Cost**: **~$500/month** (estimated)

**Finnhub:**
- Daily calls: 150,000 × 0.1 = **15,000 calls/day**
- Monthly calls: 15,000 × 30 = **450,000 calls/month**
- **Plan Needed**: Enterprise Plan (custom pricing, ~$200+/month)
- **Cost**: **~$200/month** (estimated)

**Total API Costs: 150,000 Assets**
- **Total**: **~$1,398/month**

## Total Monthly Costs Summary

| Asset Count | Storage (PostgreSQL) | Storage (Redis) | Storage Total | API Costs | **Total Monthly** |
|-------------|---------------------|-----------------|---------------|-----------|-------------------|
| **15,000** | 32 GB | 1.0 GB | **33 GB** | $716 | **~$800/month** |
| **25,000** | 54 GB | 1.3 GB | **55 GB** | $716 | **~$850/month** |
| **50,000** | 108 GB | 2.5 GB | **111 GB** | $716 | **~$950/month** |
| **100,000** | 214 GB | 5.1 GB | **219 GB** | $716 | **~$1,100/month** |
| **150,000** | 328 GB | 8.3 GB | **336 GB** | $1,398 | **~$1,900/month** |

### Cloud Provider Storage Costs

#### AWS RDS (PostgreSQL)
- **Storage**: $0.115/GB/month
- **Instance**: db.r6g.large (2 vCPU, 16 GB RAM) = $150/month
- **Backup Storage**: 20% of data = included in instance

#### AWS ElastiCache (Redis)
- **Instance**: cache.r6g.medium (2 vCPU, 6.38 GB RAM) = $50/month
- **Storage included**: Up to instance RAM

#### Total Infrastructure Costs (AWS)

| Asset Count | PostgreSQL | Redis | Storage | **Total Infrastructure** |
|-------------|------------|-------|---------|--------------------------|
| **15,000** | $150 | $50 | $4 | **$204/month** |
| **25,000** | $150 | $50 | $6 | **$206/month** |
| **50,000** | $200 | $50 | $13 | **$263/month** |
| **100,000** | $200 | $100 | $25 | **$325/month** |
| **150,000** | $300 | $100 | $38 | **$438/month** |

## Complete Cost Breakdown

### 25,000 Assets (Starting Target)

**Infrastructure (AWS):**
- PostgreSQL RDS: $150/month
- Redis ElastiCache: $50/month
- Storage: $6/month
- **Subtotal**: **$206/month**

**API Costs:**
- Polygon.io: $99/month
- NewsAPI: $449/month
- CoinGecko: $129/month
- Finnhub: $39/month
- YouTube: $0/month
- **Subtotal**: **$716/month**

**Total Monthly Cost: 25,000 Assets**
- **Infrastructure**: $206
- **APIs**: $716
- **Total**: **~$922/month**

### 150,000 Assets (Full Scale)

**Infrastructure (AWS):**
- PostgreSQL RDS: $300/month
- Redis ElastiCache: $100/month
- Storage: $38/month
- **Subtotal**: **$438/month**

**API Costs:**
- Polygon.io: $249/month
- NewsAPI: $449/month
- CoinGecko: ~$500/month (Enterprise)
- Finnhub: ~$200/month (Enterprise)
- YouTube: $0/month
- **Subtotal**: **~$1,398/month**

**Total Monthly Cost: 150,000 Assets**
- **Infrastructure**: $438
- **APIs**: $1,398
- **Total**: **~$1,836/month**

## Cost Optimization Strategies

### 1. **Reduce API Calls**
- **Batch Updates**: Update assets in batches, not all at once
- **Smart Caching**: Cache data for 24 hours, only update changed assets
- **Priority Queues**: Update popular assets more frequently
- **Estimated Savings**: 30-50% reduction in API calls

### 2. **Use Free Tiers Where Possible**
- **YouTube**: Already free
- **SEC EDGAR**: Free (for filings)
- **Financial Modeling Prep**: Free tier available
- **Estimated Savings**: $50-100/month

### 3. **Optimize Data Fetching**
- **Incremental Updates**: Only fetch new data, not full history
- **Webhook Integration**: Use webhooks instead of polling
- **Rate Limiting**: Spread calls throughout the day
- **Estimated Savings**: 20-30% reduction

### 4. **Storage Optimization**
- **Data Archival**: Move old data (>5 years) to S3 Glacier
- **Compression**: Already using TimescaleDB compression
- **Partitioning**: Partition by year for easier archival
- **Estimated Savings**: 40-60% storage reduction

### 5. **Alternative API Providers**
- **IEX Cloud**: Cheaper for US stocks ($9-49/month)
- **Alpha Vantage**: Free tier available
- **Quandl**: Alternative data sources
- **Estimated Savings**: $100-200/month

## Recommended Starting Plan

### Phase 1: 25,000 Assets
- **Monthly Cost**: ~$922
- **Infrastructure**: $206
- **APIs**: $716
- **Storage**: 55 GB

### Phase 2: 50,000 Assets (After 6 months)
- **Monthly Cost**: ~$979
- **Infrastructure**: $263
- **APIs**: $716
- **Storage**: 111 GB

### Phase 3: 100,000 Assets (After 12 months)
- **Monthly Cost**: ~$1,041
- **Infrastructure**: $325
- **APIs**: $716
- **Storage**: 219 GB

### Phase 4: 150,000 Assets (After 18+ months)
- **Monthly Cost**: ~$1,836
- **Infrastructure**: $438
- **APIs**: $1,398
- **Storage**: 336 GB

## Complete Monthly Cost Summary Table

### With NewsAPI (Current)
| Asset Count | Storage (GB) | Infrastructure | API Costs | **Total Monthly** |
|-------------|--------------|----------------|-----------|-------------------|
| **15,000** | 33 | $204 | $716 | **~$920/month** |
| **25,000** | 55 | $206 | $716 | **~$922/month** |
| **50,000** | 111 | $263 | $716 | **~$979/month** |
| **100,000** | 219 | $325 | $716 | **~$1,041/month** |
| **150,000** | 336 | $438 | $1,398 | **~$1,836/month** |

### With RSS Feeds (Recommended - Free News)
| Asset Count | Storage (GB) | Infrastructure | API Costs | **Total Monthly** | **Savings** |
|-------------|--------------|----------------|-----------|-------------------|-------------|
| **15,000** | 33 | $204 | $267 | **~$471/month** | **$449** |
| **25,000** | 55 | $206 | $267 | **~$473/month** | **$449** |
| **50,000** | 111 | $263 | $267 | **~$530/month** | **$449** |
| **100,000** | 219 | $325 | $267 | **~$592/month** | **$449** |
| **150,000** | 336 | $438 | $998 | **~$1,436/month** | **$400** |

### Cost Breakdown by Component

#### Infrastructure (AWS)
- PostgreSQL RDS: $150-300/month (scales with data)
- Redis ElastiCache: $50-100/month
- Storage: $4-38/month (scales with data)
- **Total Infrastructure**: $204-438/month

#### API Costs
- **Polygon.io**: $99-249/month (scales with asset count)
- **NewsAPI**: $449/month (fixed, highest cost)
- **CoinGecko**: $129-500/month (scales with crypto count)
- **Finnhub**: $39-200/month (scales with asset count)
- **YouTube**: $0/month (free tier)
- **Total APIs**: $716-1,398/month

## Conclusion

**Starting with 25,000 assets is cost-effective** at ~$473/month (with RSS feeds), with room to scale to 150,000 assets at ~$1,436/month. 

### Key Insights:
1. **Storage is efficient**: TimescaleDB compression keeps storage costs low
2. **News API was the main cost driver**: NewsAPI was $449/month, now eliminated with RSS feeds
3. **Scaling is linear**: Costs scale predictably with asset count
4. **Massive cost savings**: $400-449/month saved by using RSS feeds instead of NewsAPI

### Recommendations:
- **Start with 25,000 assets** (~$473/month with RSS feeds)
- **Use RSS feeds for news** (free, saves $449/month)
- **Optimize API calls** to reduce remaining costs by 30-50%
- **Scale gradually** based on actual user demand

### Cost Reduction Summary:
- **Before (NewsAPI)**: $922/month for 25,000 assets
- **After (RSS Feeds)**: $473/month for 25,000 assets
- **Savings**: **$449/month (49% reduction)**

