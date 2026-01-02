# Mock Data Generation Guide

## Overview

The system includes comprehensive mock data generation for local development and testing. This guide explains how to generate 10 years of historical data for all assets.

## Available Scripts

### 1. Generate 10 Years of Mock Data

**Script**: `scripts/generate10YearsMockData.js`

Generates 10 years (3,650 calendar days) of daily historical data for all assets, including weekends with flat prices.

**Usage:**
```bash
# Generate for all assets
node scripts/generate10YearsMockData.js

# Generate for specific symbols
node scripts/generate10YearsMockData.js AAPL MSFT GOOGL
```

**What it does:**
- Generates 10 years of daily data (3,650 calendar days per asset)
- Includes weekends with flat prices (same as last trading day's close)
- Stores data in TimescaleDB with proper date handling
- Uses `generateExtendedHistoricalData()` from mock data service

**Output:**
- Daily records: 3,650 per asset (includes weekends)
- Trading days: ~2,520 per asset (approximately)
- Weekend days: ~1,130 per asset (with flat prices)

### 2. ETL for All Time Periods

**Script**: `scripts/runETLAllPeriods.js`

Runs historical data ingestion for all time periods using the ETL system.

**Usage:**
```bash
# All assets, all periods
node scripts/runETLAllPeriods.js

# Specific symbols, all periods
node scripts/runETLAllPeriods.js AAPL MSFT
```

**Time Periods Processed:**
- 7D (7 days)
- 1M (1 month)
- 3M (3 months)
- 6M (6 months)
- YTD (Year to date)
- 1Y (1 year)
- 3Y (3 years)
- 5Y (5 years)
- MAX (10 years)

### 3. Individual ETL Jobs

**Script**: `scripts/runETL.js`

Run individual ETL jobs for specific purposes.

**Usage:**
```bash
# Historical data for specific time range
node scripts/runETL.js historical 1Y AAPL MSFT
node scripts/runETL.js historical MAX

# Hourly data (1D)
node scripts/runETL.js hourly AAPL MSFT

# Latest price updates
node scripts/runETL.js latest AAPL MSFT
```

## Data Structure

### Daily Data
- **Trading Days**: Normal price movement with volatility
- **Weekends**: Flat prices (same as last trading day's close), zero volume
- **Storage**: TimescaleDB with `timestamp = NULL`

### Hourly Data (1D only)
- **24 hours**: 12:00 AM - 11:00 PM
- **Trading Hours**: Higher volatility and volume (9:30 AM - 4:00 PM ET)
- **Non-Trading Hours**: Lower volatility and minimal volume
- **Storage**: TimescaleDB with actual `timestamp` values

## Mock Data Service

The `mockData.js` service provides:

### Functions:
- `generateExtendedHistoricalData(symbol, includeHourly)`: 10 years of data
- `generateHistoricalData(symbol, days, includeWeekends)`: Custom range
- `generateHourlyData(symbol, date, dailyOpen, dailyHigh, dailyLow, dailyClose)`: Hourly data
- `generate7DaysData(symbol)`: 7 days including weekends

### Base Prices:
- Defined in `BASE_PRICES` object
- Includes stocks, ETFs, indices, crypto, commodities
- Default: 100.00 for unknown symbols

## Recommended Workflow

### Initial Setup (First Time)
```bash
# 1. Generate 10 years of data for all assets
node scripts/generate10YearsMockData.js

# 2. Generate hourly data for today/last market day
node scripts/runETL.js hourly

# 3. Update latest prices
node scripts/runETL.js latest
```

### Regular Updates
```bash
# Daily: Update hourly data and latest prices
node scripts/runETL.js hourly
node scripts/runETL.js latest

# Weekly: Backfill any missing historical data
node scripts/runETLAllPeriods.js
```

## Performance Considerations

### For All Assets (8,000+ assets):
- 10 years of data: ~29M records (3,650 days × 8,000 assets)
- Generation time: ~2-4 hours (depending on system)
- Database size: ~2-3 GB (compressed with TimescaleDB)

### Batch Processing:
- Processes in batches of 50 assets
- Database inserts in batches of 100 records
- Includes delays to avoid overwhelming the system

## Data Quality

### Realistic Features:
- Price volatility based on asset type (crypto vs stocks)
- Volume distribution (higher during trading hours)
- Weekend flat prices (realistic market behavior)
- Historical trends (price continuity over time)

### Limitations:
- Mock data is deterministic but random
- No correlation between assets
- No market events or news impact
- Simplified volume calculations

## Troubleshooting

### Issue: "No assets found"
**Solution**: Populate assets first using `assetGenerator.js` or add assets to `asset_info` table.

### Issue: "Database connection error"
**Solution**: Ensure PostgreSQL is running and `.env` has correct database credentials.

### Issue: "Out of memory"
**Solution**: Process in smaller batches or specific symbols instead of all assets.

### Issue: "Duplicate key errors"
**Solution**: Data already exists. The script uses `ON CONFLICT DO UPDATE` to handle duplicates safely.

## Integration with ETL System

The mock data generation aligns with the ETL architecture:
- Uses same data structure as real API data
- Compatible with TimescaleDB schema
- Works with Redis caching
- Follows same date range calculations

## Next Steps

After generating mock data:
1. Verify data in database: `SELECT COUNT(*) FROM asset_data WHERE symbol = 'AAPL'`
2. Test charts: View assets in frontend to see historical data
3. Test ETL: Run ETL jobs to ensure they work with existing data
4. Update routes: Ensure backend routes use the new data structure


