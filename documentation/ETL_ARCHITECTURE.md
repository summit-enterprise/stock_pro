# ETL Architecture Documentation

## Overview

The ETL (Extract, Transform, Load) system is responsible for:
1. **Batch Historical Data Ingestion**: Daily data for all time ranges (7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
2. **Hourly Data Ingestion**: 1D hourly data for today/last market day
3. **Latest Price Updates**: Real-time price updates for market overview and watchlists

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                            │
│  (Polygon.io, CoinGecko, etc.)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Ingestion Service (ETL)                    │
│  - fetchAndStoreDailyData()                                  │
│  - fetchAndStoreHourlyData()                                 │
│  - updateLatestPrices()                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│   TimescaleDB    │         │   Redis Cache     │
│  (Historical)     │         │  (Latest/1D)     │
│                   │         │                   │
│ - Daily data      │         │ - Latest prices   │
│ - Hourly data     │         │ - 1D hourly data  │
│ - All time ranges │         │ - TTL: 1-5 min    │
└──────────────────┘         └──────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Routes                              │
│  - /api/asset/:symbol (historical data)                      │
│  - /api/watchlist (latest prices)                           │
│  - /api/market (market overview)                            │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend                                  │
│  - Charts (1D, 7D, 1M, etc.)                                │
│  - Market Overview                                          │
│  - Watchlist                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Storage Strategy

### TimescaleDB (Historical Data)
- **Daily Data**: All time ranges (7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
  - Stored with `timestamp = NULL`
  - One record per day per asset
- **Hourly Data**: Only for 1D (today/last market day)
  - Stored with actual `timestamp` value
  - 24 records per day per asset

### Redis Cache (Latest/Active Data)
- **Latest Prices**: `latest_price:{symbol}`
  - TTL: 1 minute
  - Updated every minute during market hours
- **1D Hourly Data**: `hourly_data:{symbol}:1D`
  - TTL: 2 minutes
  - Updated hourly during market hours

## Scheduled Jobs

### 1. Daily Historical Ingestion
- **Schedule**: 4:30 PM ET (after market close), Monday-Friday
- **Action**: Ingests 1Y of historical daily data for all assets
- **Purpose**: Backfill any missing historical data

### 2. Hourly Data Ingestion
- **Schedule**: Every hour, 9:30 AM - 4:00 PM ET, Monday-Friday
- **Action**: Ingests hourly data for today/last market day (1D)
- **Purpose**: Keep 1D charts up-to-date with hourly data

### 3. Latest Price Updates
- **Schedule**: Every 1 minute, 9:30 AM - 4:00 PM ET, Monday-Friday
- **Action**: Updates latest prices in cache for active assets
- **Purpose**: Keep market overview and watchlists current

### 4. Weekly Full Historical Backfill
- **Schedule**: Sundays at 2:00 AM ET
- **Action**: Ingests MAX historical data for all assets
- **Purpose**: Ensure all historical data is up-to-date

## Manual ETL Execution

### Run Historical Data Ingestion
```bash
# Ingest 1Y of historical data for all assets
node scripts/runETL.js historical 1Y

# Ingest MAX historical data for specific symbols
node scripts/runETL.js historical MAX AAPL MSFT GOOGL
```

### Run Hourly Data Ingestion
```bash
# Ingest hourly data for all assets
node scripts/runETL.js hourly

# Ingest hourly data for specific symbols
node scripts/runETL.js hourly AAPL MSFT GOOGL
```

### Run Latest Price Update
```bash
# Update latest prices for active assets
node scripts/runETL.js latest

# Update latest prices for specific symbols
node scripts/runETL.js latest AAPL MSFT GOOGL
```

## API Integration

### Polygon.io (Stocks/ETFs/Indices)
- **Daily Data**: `/v2/aggs/ticker/{symbol}/range/1/day/{start}/{end}`
- **Hourly Data**: `/v2/aggs/ticker/{symbol}/range/1/hour/{date}/{date}`
- **Latest Price**: `/v2/aggs/ticker/{symbol}/prev`

### CoinGecko (Crypto)
- **Daily Data**: `/api/v3/coins/{id}/market_chart/range`
- **Latest Price**: `/api/v3/simple/price`

## Rate Limiting

- **Batch Size**: 50 assets per batch
- **Request Delay**: 200ms between requests
- **API Rate Limits**: Respects Polygon.io and CoinGecko rate limits

## Error Handling

- Failed API requests are logged but don't stop the batch
- Database errors are caught and logged
- Redis cache failures are non-blocking (falls back to DB)
- Missing data is handled gracefully (returns empty arrays)

## Environment Variables

- `POLYGON_API_KEY`: Polygon.io API key (required for stocks/ETFs)
- `COINGECKO_API_KEY`: CoinGecko API key (optional, for crypto)
- `USE_MOCK_DATA`: Use mock data instead of APIs (local/dev)
- `ENABLE_ETL_SCHEDULER`: Enable scheduled ETL jobs (production)

## Next Steps

1. **Backend Routes Update**: Modify `/api/asset/:symbol` to:
   - For 1D: Pull from Redis cache (hourly data) first, fallback to DB
   - For other ranges: Pull from DB (daily data)
   - Combine cache and DB data when needed

2. **Chart Components Update**: Update frontend charts to:
   - Handle both hourly (1D) and daily (other ranges) data
   - Display data from cache and DB seamlessly
   - Show loading states during data fetching

3. **Market Overview Update**: Modify market overview to:
   - Pull latest prices from Redis cache
   - Fallback to DB if cache miss
   - Update prices in real-time (every minute)


