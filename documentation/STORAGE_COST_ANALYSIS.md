# Storage Cost Analysis for 150,000 Assets

## Overview
This document calculates estimated storage costs for storing time series data for 150,000 different assets with hourly data since 2000 (24 years) in PostgreSQL (TimescaleDB) and Redis.

> **Note**: 150,000 assets is ambitious and places this platform in the "Large Platform" category, comparable to Yahoo Finance (~120K assets) or TradingView (~120K+ assets). Most platforms start with 5,000-20,000 assets and scale based on demand. See [INDUSTRY_ASSET_COVERAGE.md](./INDUSTRY_ASSET_COVERAGE.md) for industry benchmarks.

## Data Requirements

### Parameters
- **Number of Assets**: 150,000
- **Data Start Date**: January 1, 2000
- **Data End Date**: December 31, 2024 (current)
- **Time Period**: 24 years
- **Data Frequency**: Hourly (where possible)
- **Trading Days per Year**: ~252 (excluding weekends and holidays)
- **Trading Hours per Day**: 6.5 hours (9:30 AM - 4:00 PM EST)
- **Total Trading Hours**: 252 days × 6.5 hours × 24 years = **39,312 hours per asset**

### Data Points per Asset
- **Hourly Data Points**: 39,312 hours
- **Daily Data Points**: 252 days × 24 years = 6,048 days
- **Total Records per Asset**: ~39,312 (using hourly where available, daily otherwise)

## PostgreSQL (TimescaleDB) Storage Calculation

### Table Schema: `asset_data`
```sql
CREATE TABLE asset_data (
  symbol VARCHAR(20),      -- ~20 bytes
  date TIMESTAMP,          -- 8 bytes
  open NUMERIC(12,4),      -- 8 bytes
  high NUMERIC(12,4),      -- 8 bytes
  low NUMERIC(12,4),       -- 8 bytes
  close NUMERIC(12,4),     -- 8 bytes
  volume BIGINT            -- 8 bytes
);
```

### Storage per Record
- **Base Data**: 20 + 8 + (8 × 5) + 8 = **68 bytes**
- **PostgreSQL Overhead**: ~40% (row header, alignment, etc.) = **27 bytes**
- **Index Overhead**: ~30% (B-tree indexes on symbol, date) = **20 bytes**
- **Total per Record**: ~**115 bytes**

### Total Storage Calculation
- **Records per Asset**: 39,312
- **Total Records**: 150,000 × 39,312 = **5,896,800,000 records**
- **Raw Data Size**: 5.9B × 115 bytes = **678 GB**
- **TimescaleDB Compression**: ~70% reduction (hypertable compression)
- **Compressed Size**: 678 GB × 0.3 = **203 GB**
- **Indexes**: ~20% of data size = **41 GB**
- **Total PostgreSQL Storage**: **~244 GB**

### Additional Tables

#### `asset_info` Table
- 150,000 assets × ~500 bytes (name, symbol, type, category, logo_url, etc.) = **75 MB**

#### `dividends` Table
- Estimated 10 dividends per asset per year × 24 years = 36,000,000 records
- ~100 bytes per record = **3.6 GB**

#### `filings` Table
- Estimated 4 filings per asset per year × 24 years = 14,400,000 records
- ~200 bytes per record = **2.9 GB**

#### `analyst_ratings` Table
- Estimated 12 ratings per asset per year × 24 years = 43,200,000 records
- ~150 bytes per record = **6.5 GB**

#### Other Tables (users, watchlist, portfolio, etc.)
- Estimated: **~5 GB**

### Total PostgreSQL Storage
- **Time Series Data**: 244 GB
- **Asset Info**: 0.075 GB
- **Dividends**: 3.6 GB
- **Filings**: 2.9 GB
- **Ratings**: 6.5 GB
- **Other Tables**: 5 GB
- **WAL (Write-Ahead Log)**: ~10% = 26 GB
- **Vacuum/Bloat Overhead**: ~15% = 40 GB
- **Total PostgreSQL**: **~328 GB**

## Redis Storage Calculation

### Caching Strategy
Redis will cache:
- **Recent Price Data**: Last 30 days hourly = 30 × 6.5 = 195 records per asset
- **Current Prices**: 1 record per asset
- **Market Overview**: ~50 assets
- **Top Gainers/Losers**: ~100 records
- **News**: Last 100 articles
- **API Call Logs**: Last 10,000 calls

### Storage per Record Type

#### Price Data Cache
- **Format**: JSON string
- **Size per Record**: ~200 bytes (symbol, date, open, high, low, close, volume)
- **Records**: 150,000 assets × 195 records = 29,250,000 records
- **Total Size**: 29.25M × 200 bytes = **5.85 GB**

#### Current Prices Cache
- **Records**: 150,000 assets × 1 record = 150,000 records
- **Size per Record**: ~150 bytes
- **Total Size**: 150K × 150 bytes = **22.5 MB**

#### Market Data Cache
- **Market Overview**: 50 assets × 200 bytes = 10 KB
- **Top Gainers/Losers**: 100 records × 200 bytes = 20 KB
- **Total**: **~30 KB**

#### News Cache
- **Records**: 100 articles
- **Size per Article**: ~2 KB (title, description, URL, image)
- **Total Size**: 100 × 2 KB = **200 KB**

#### API Call Logs Cache
- **Records**: 10,000 calls
- **Size per Call**: ~500 bytes
- **Total Size**: 10K × 500 bytes = **5 MB**

#### Redis Overhead
- **Key Names**: ~30% overhead = 1.8 GB
- **Redis Internal Structures**: ~10% = 0.6 GB
- **Total Overhead**: **~2.4 GB**

### Total Redis Storage
- **Price Data Cache**: 5.85 GB
- **Current Prices**: 0.0225 GB
- **Market Data**: 0.00003 GB
- **News**: 0.0002 GB
- **API Logs**: 0.005 GB
- **Overhead**: 2.4 GB
- **Total Redis**: **~8.3 GB**

## Docker Image Sizes

### PostgreSQL with TimescaleDB
- **Base Image**: postgres:15-alpine = ~200 MB
- **TimescaleDB Extension**: ~50 MB
- **Additional Tools**: ~50 MB
- **Total Image Size**: **~300 MB**

### Redis
- **Base Image**: redis:7-alpine = **~50 MB**

### Total Docker Images
- **PostgreSQL + TimescaleDB**: 300 MB
- **Redis**: 50 MB
- **Total**: **~350 MB**

## Total Storage Requirements

### Database Storage
- **PostgreSQL**: 328 GB
- **Redis**: 8.3 GB
- **Total Database**: **~336 GB**

### Docker Images
- **Total Images**: **~350 MB**

## Cost Estimates (Cloud Providers)

### AWS RDS (PostgreSQL)
- **db.r6g.xlarge** (4 vCPU, 32 GB RAM, 500 GB storage)
- **Monthly Cost**: ~$200/month
- **Storage**: $0.115/GB/month × 328 GB = **$37.72/month**
- **Total**: **~$238/month**

### AWS ElastiCache (Redis)
- **cache.r6g.large** (2 vCPU, 13.07 GB RAM)
- **Monthly Cost**: ~$100/month
- **Storage included**: Up to 13 GB
- **Total**: **~$100/month**

### Google Cloud SQL (PostgreSQL)
- **db-standard-4** (4 vCPU, 15 GB RAM, 500 GB SSD)
- **Monthly Cost**: ~$180/month
- **Storage**: $0.17/GB/month × 328 GB = **$55.76/month**
- **Total**: **~$236/month**

### Google Cloud Memorystore (Redis)
- **Standard Tier** (2 GB - 300 GB)
- **Monthly Cost**: ~$90/month for 8.3 GB
- **Total**: **~$90/month**

### Azure Database for PostgreSQL
- **General Purpose Gen5, 4 vCores** (500 GB storage)
- **Monthly Cost**: ~$200/month
- **Storage**: $0.115/GB/month × 328 GB = **$37.72/month**
- **Total**: **~$238/month**

### Azure Cache for Redis
- **Standard C1** (1 GB - 53 GB)
- **Monthly Cost**: ~$80/month for 8.3 GB
- **Total**: **~$80/month**

## Self-Hosted Docker Costs

### Hardware Requirements
- **CPU**: 8+ cores recommended
- **RAM**: 64 GB (32 GB for PostgreSQL, 16 GB for Redis, 16 GB for OS)
- **Storage**: 500 GB SSD (for 336 GB data + growth)
- **Network**: 1 Gbps

### Estimated Monthly Costs (Self-Hosted)
- **Dedicated Server**: $100-200/month (Hetzner, OVH, etc.)
- **VPS (Cloud)**: $150-300/month (DigitalOcean, Linode, etc.)
- **Storage Expansion**: $0.10/GB/month for additional storage

## Summary

### Storage Breakdown
| Component | Size | Notes |
|-----------|------|-------|
| PostgreSQL (TimescaleDB) | 328 GB | Compressed time series data |
| Redis Cache | 8.3 GB | Recent data and hot cache |
| Docker Images | 350 MB | Container images |
| **Total** | **~336 GB** | |

### Cost Estimates (Monthly)
| Provider | PostgreSQL | Redis | Total |
|----------|------------|-------|-------|
| AWS | $238 | $100 | **$338/month** |
| Google Cloud | $236 | $90 | **$326/month** |
| Azure | $238 | $80 | **$318/month** |
| Self-Hosted | $100-300 | Included | **$100-300/month** |

### Recommendations

1. **Use TimescaleDB Compression**: Reduces storage by ~70%
2. **Implement Data Retention Policies**: Archive data older than 10 years to cold storage
3. **Use Redis for Hot Data**: Cache only frequently accessed data
4. **Consider Partitioning**: Partition by year for better query performance
5. **Monitor Growth**: Set up alerts for storage usage
6. **Backup Strategy**: Factor in 2-3x storage for backups

### Growth Projections

- **Year 1**: 336 GB
- **Year 2**: 336 + (150,000 × 39,312 × 115 bytes / 1,073,741,824) = 336 + 6.7 GB = **343 GB**
- **Year 5**: ~**360 GB**
- **Year 10**: ~**400 GB**

### Cost Optimization Strategies

1. **Data Archival**: Move data older than 5 years to cheaper object storage (S3, GCS)
2. **Compression**: Already using TimescaleDB compression (70% reduction)
3. **Selective Caching**: Only cache frequently accessed assets in Redis
4. **Read Replicas**: Use read replicas for analytics queries
5. **Partitioning**: Partition by time ranges to enable easier archival

