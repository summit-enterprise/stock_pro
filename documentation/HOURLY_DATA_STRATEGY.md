# Hourly Data Strategy for 1D/5D Charts

## Overview
This document outlines the best approach for storing and serving hourly price data for 1-day and 5-day chart views.

## Recommended Architecture

### 1. **Database Layer: TimescaleDB Hypertable**
Create a separate `asset_data_hourly` table optimized for hourly time-series data:

```sql
CREATE TABLE IF NOT EXISTS asset_data_hourly (
  symbol VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  open NUMERIC(18,8),
  high NUMERIC(18,8),
  low NUMERIC(18,8),
  close NUMERIC(18,8),
  volume BIGINT,
  PRIMARY KEY (symbol, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('asset_data_hourly', 'timestamp', 
  chunk_time_interval => INTERVAL '7 days');
```

**Benefits:**
- Efficient time-series queries
- Automatic partitioning by time
- Compression for older data
- Fast queries for date ranges

### 2. **Redis Cache Layer**
Cache recent hourly data (last 5-7 days) in Redis for ultra-fast access:

**Cache Key Format:** `hourly_data:{symbol}:{date}` (e.g., `hourly_data:AAPL:2024-01-15`)

**TTL:** 24 hours (refresh daily)

**Structure:**
```json
{
  "symbol": "AAPL",
  "date": "2024-01-15",
  "data": [
    {"timestamp": "2024-01-15T09:30:00Z", "open": 150.0, "high": 151.0, "low": 149.5, "close": 150.5, "volume": 1000000},
    ...
  ],
  "cached_at": "2024-01-15T10:00:00Z"
}
```

### 3. **Data Fetching Strategy**

#### For 1D View:
- **Redis:** Check for today's hourly data
- **DB:** If Redis miss, query last 24 hours from `asset_data_hourly`
- **API:** If DB has insufficient data, fetch from Polygon.io intraday API

#### For 5D View:
- **Redis:** Check for last 5 days of hourly data
- **DB:** If Redis miss, query last 5 days from `asset_data_hourly`
- **API:** If DB has insufficient data, fetch missing days from API

### 4. **Background Service**

Create a service that periodically syncs hourly data:

**Service:** `backend/services/stocks/hourlyPriceService.js`

**Responsibilities:**
1. Fetch hourly data from Polygon.io for tracked assets
2. Store in `asset_data_hourly` table
3. Update Redis cache for recent days
4. Run every hour during market hours (9:30 AM - 4:00 PM EST)

**API Endpoints:**
- Polygon.io: `/v2/aggs/ticker/{symbol}/range/1/hour/{start}/{end}`
- CoinGecko: `/api/v3/coins/{id}/market_chart?vs_currency=usd&days=1&interval=hourly`

## Implementation Plan

### Phase 1: Database Schema
1. Create `asset_data_hourly` table
2. Convert to TimescaleDB hypertable
3. Add indexes on `(symbol, timestamp)`

### Phase 2: Service Layer
1. Create `hourlyPriceService.js`
2. Implement fetch functions for Polygon.io and CoinGecko
3. Implement storage functions for DB and Redis
4. Add background sync job (cron or scheduled task)

### Phase 3: API Route Updates
1. Update `/api/assets/:symbol` route to:
   - Check Redis for hourly data when `range=1D` or `range=5D`
   - Fallback to DB query
   - Fallback to API fetch if needed

### Phase 4: Frontend Updates
1. Update `MarketChart.tsx` to handle hourly data
2. Ensure proper time formatting for hourly intervals
3. Optimize data sampling for 1D/5D views

## Data Retention Strategy

- **Redis:** Keep last 7 days of hourly data
- **TimescaleDB:** Keep all historical hourly data
- **Compression:** Enable TimescaleDB compression for data older than 30 days

## Performance Considerations

1. **Redis Cache Hit Rate:** Target >80% for 1D/5D requests
2. **DB Query Performance:** Use TimescaleDB continuous aggregates for common queries
3. **API Rate Limits:** Batch requests and respect Polygon.io rate limits (5 calls/minute)
4. **Data Volume:** 
   - 1 day = 6.5 hours (market hours) = ~6-7 data points
   - 5 days = ~30-35 data points
   - Minimal storage overhead

## Cost Analysis

- **Polygon.io:** Free tier allows 5 calls/minute
- **Redis:** Minimal memory (7 days × ~1000 assets × ~7 hours/day = ~50KB per asset)
- **PostgreSQL:** TimescaleDB compression reduces storage by ~90% for old data

## Alternative Approaches Considered

### Option A: Store hourly in same table
❌ **Rejected:** Mixing daily and hourly data complicates queries and increases storage

### Option B: Only Redis, no DB
❌ **Rejected:** No historical data persistence, data loss on Redis restart

### Option C: Only DB, no Redis
⚠️ **Acceptable but suboptimal:** Slower response times, more DB load

## Recommended Approach: Hybrid (DB + Redis)
✅ **Best balance:** Fast access (Redis) + Historical persistence (DB) + Cost efficiency

