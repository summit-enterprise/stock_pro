# Data Ingestion Architecture

## Overview

The data ingestion system is split into two distinct services with clear responsibilities:

1. **ETL Service** - Historical batch processing
2. **Real-Time Data Service** - Live/current data updates

## Architecture Separation

### ETL Service (`/backend/services/etl/`)

**Purpose**: Batch processing of historical data

**Responsibilities**:
- ✅ Daily historical data ingestion (7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
- ✅ Weekly full historical backfill
- ✅ One-time data migrations

**Schedule**:
- Daily historical ingestion: After market close (4:30 PM ET)
- Weekly backfill: Sundays at 2 AM ET

**Data Flow**:
```
API → Database (TimescaleDB)
```

**Characteristics**:
- Runs less frequently (daily/weekly)
- Can be slow (batch processing)
- Processes all assets
- Focuses on historical data completeness

---

### Real-Time Data Service (`/backend/services/realtime/`)

**Purpose**: Live/current data updates

**Responsibilities**:
- ✅ Hourly data updates (for 1D charts)
- ✅ Latest price updates (for market overview)

**Schedule**:
- Hourly data: Every 10 minutes during market hours (9:30 AM - 4:00 PM ET)
- Latest prices: Every 1 minute during market hours

**Data Flow**:
```
API → Database (TimescaleDB) + Redis Cache
```

**Characteristics**:
- Runs frequently (every 1-10 minutes)
- Must be fast (real-time requirements)
- Processes only active assets (watchlisted + market overview)
- Focuses on current data freshness

---

## Why This Separation?

### 1. **Clear Responsibilities**
- ETL = Historical batch processing
- Real-Time = Current data freshness

### 2. **Different Performance Requirements**
- ETL can be slow (batch processing)
- Real-Time must be fast (user-facing)

### 3. **Different Update Frequencies**
- ETL runs daily/weekly
- Real-Time runs every 1-10 minutes

### 4. **Different Asset Scope**
- ETL processes all assets (completeness)
- Real-Time processes only active assets (efficiency)

### 5. **Independent Scaling**
- ETL can run on separate infrastructure
- Real-Time can scale independently based on user activity

---

## Data Sources

### Historical Data (ETL)
- **Stocks/ETFs**: Polygon.io daily aggregates
- **Crypto**: CoinGecko historical data
- **Mock Data**: For local/dev environments

### Real-Time Data
- **Hourly Data**: 
  - Stocks/ETFs: Polygon.io aggregates API
  - Crypto: CoinGecko hourly data
  - Mock Data: Generated hourly data points
- **Latest Prices**:
  - Stocks/ETFs: Polygon.io last trade
  - Crypto: CoinGecko simple price API
  - Mock Data: Generated price changes

---

## Cache Strategy

### Redis Cache Keys

**Hourly Data**:
```
hourly_data:{symbol}:1D
TTL: 2 minutes
```

**Latest Prices**:
```
latest_price:{symbol}
TTL: 1 minute
```

**Historical Data**:
```
asset_data:{symbol}:{range}
TTL: 5 minutes (or 1 hour for MAX)
```

---

## Service Initialization

Both services are initialized in `server.js`:

```javascript
// ETL Scheduler (Historical)
const etlSchedulerService = require('./services/etl/schedulerService');
etlSchedulerService.start();

// Real-Time Scheduler (Live Data)
const realtimeSchedulerService = require('./services/realtime/realtimeSchedulerService');
realtimeSchedulerService.start();
```

---

## Manual Execution

### ETL Jobs
```bash
# Historical data for all assets
node scripts/runETL.js historical 1Y

# Historical data for specific assets
node scripts/runETL.js historical 1Y AAPL MSFT GOOGL
```

### Real-Time Jobs
```javascript
// Via scheduler service
realtimeSchedulerService.triggerJob('hourly');
realtimeSchedulerService.triggerJob('latest');
```

---

## Monitoring

Both services log their activities:
- ✅ Success: Number of records processed/inserted
- ❌ Errors: Failed symbols with error messages
- ⚠️ Warnings: Missing data, API rate limits, etc.

---

## Future Enhancements

1. **WebSocket Support**: Push real-time updates to frontend
2. **Rate Limiting**: Smart rate limiting based on API quotas
3. **Retry Logic**: Automatic retries for failed API calls
4. **Metrics**: Track update frequency, cache hit rates, API usage
5. **Alerting**: Notify when services fail or data is stale


