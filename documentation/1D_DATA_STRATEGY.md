# 1D Data Strategy - Simplified Approach

## Overview

**1D charts now show today's daily record** (open, high, low, close), not hourly data.

This simplifies the architecture and aligns with ETL running once daily.

## Architecture

```
ETL (Daily) → Updates today's daily record → Cache in Redis → 1D Chart displays
```

## Data Flow

### 1. ETL Service (Runs Once Daily)
- Updates all historical daily data
- Includes today's daily record (open, high, low, close, volume)
- Stores in database
- **Caches today's daily record in Redis** with key: `daily_data:{symbol}:{date}`
- TTL: 24 hours

### 2. 1D Chart Request
- **Check Redis cache first**: `daily_data:{symbol}:{today}`
- **If cache miss**: Fetch today's daily record from database
- **Display**: Single data point showing today's OHLC

### 3. Cache Strategy

**Redis Cache Keys:**
```
daily_data:{symbol}:{date}
TTL: 24 hours
Content: { date, open, high, low, close, volume }
```

## Benefits

1. ✅ **Simpler**: No hourly data complexity
2. ✅ **Efficient**: ETL runs once daily, caches today's record
3. ✅ **Fast**: Redis cache for instant 1D chart loads
4. ✅ **Consistent**: Same data structure as other time ranges
5. ✅ **Reliable**: Daily data is complete and accurate

## Implementation Details

### Backend Route (`/api/assets/:symbol?range=1D`)
- Checks Redis cache: `daily_data:{symbol}:{today}`
- If cache miss, queries database for today's daily record
- Returns single data point with today's OHLC

### ETL Service (`storeDailyDataInDB`)
- After storing daily data, checks if today's record was included
- Caches today's record in Redis with 24-hour TTL
- Key format: `daily_data:{symbol}:{date}`

### Frontend Chart
- Receives single data point for 1D
- Displays as line chart from open to close
- Shows high/low range

## Migration Notes

- **Removed**: Hourly data complexity for 1D
- **Removed**: Real-time hourly data updates (no longer needed)
- **Simplified**: 1D now uses same daily data structure as other ranges
- **Cached**: Today's daily record cached in Redis for fast access

## Future Enhancements

If intraday granularity is needed in the future:
- Consider 15-minute or 30-minute intervals (not hourly)
- Use separate real-time service for intraday updates
- Keep daily data as the primary source of truth
