# Weekend Data Strategy

## Overview

**Weekends are excluded for all assets EXCEPT crypto**, which continues trading 24/7.

## Implementation

### Crypto Assets
- **Symbol Pattern**: Assets starting with `X:` (e.g., `X:BTCUSD`, `X:ETHUSD`)
- **Weekend Behavior**: Continue trading with price movements
- **Data Generation**: All 7 days of the week included
- **10-Year Data**: All 3650 calendar days included

### Non-Crypto Assets (Stocks, ETFs, Indices, Commodities, etc.)
- **Weekend Behavior**: **Skipped entirely** - no data generated for weekends
- **Data Generation**: Only trading days (Monday-Friday)
- **10-Year Data**: Approximately 2520 trading days (not 3650 calendar days)
- **7D Charts**: Only shows 5 trading days (weekends excluded)

## Code Changes

### Mock Data Service (`mockData.js`)
- Added `isCrypto()` helper function to identify crypto assets
- Updated `generateHistoricalData()`: Skips weekends for non-crypto
- Updated `generate7DaysData()`: Only generates trading days for non-crypto
- Updated `generateExtendedHistoricalData()`: Skips weekends for non-crypto in 10-year generation

### ETL Service (`dataIngestionService.js`)
- Updated to only include weekends when generating mock data for crypto assets
- Uses `isCryptoAsset` check before calling `generateHistoricalData()`

### Backend Routes (`asset.js`)
- Updated 7D missing day generation to skip weekends for non-crypto assets
- Crypto assets get weekend data with price movements
- Non-crypto assets skip weekends entirely

## Database Impact

### Non-Crypto Assets
- **No weekend records** in `asset_data` table
- Only trading days (Monday-Friday) are stored
- Reduces storage by ~30% (no weekend data)

### Crypto Assets
- **All days included** (including weekends)
- Full 3650 days for 10-year data
- Weekend data shows actual price movements

## Chart Behavior

### 7D Charts
- **Non-Crypto**: Shows 5 trading days (weekends excluded)
- **Crypto**: Shows all 7 days (including weekends)

### Other Time Ranges
- **Non-Crypto**: Only trading days displayed
- **Crypto**: All calendar days displayed

## Benefits

1. ✅ **Accurate Representation**: Stocks/ETFs don't trade on weekends
2. ✅ **Reduced Storage**: ~30% less data for non-crypto assets
3. ✅ **Faster Queries**: Fewer records to query for non-crypto
4. ✅ **Crypto Accuracy**: Crypto continues trading 24/7 as expected


