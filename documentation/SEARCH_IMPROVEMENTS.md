# Search Improvements - Ticker Symbols and Display Names

## Overview

Search functionality has been enhanced to support intuitive searching by:
- **Traditional ticker symbols** (e.g., "BTC", "AAPL")
- **Company/asset names** (e.g., "Bitcoin", "Apple")
- **Database symbols** (e.g., "X:BTCUSD", "AAPL")

## Database Schema Changes

### New Columns in `asset_info` Table

1. **`ticker_symbol`** (VARCHAR(50))
   - Traditional ticker symbol for the asset
   - Examples:
     - `X:BTCUSD` → `BTC`
     - `AAPL` → `AAPL`
     - `^GSPC` → `^GSPC`

2. **`display_name`** (VARCHAR(255))
   - Clean, user-friendly name for the asset
   - Examples:
     - `X:BTCUSD` → `Bitcoin`
     - `AAPL` → `Apple Inc.` (cleaned)
     - `^GSPC` → `S&P 500`

### Indexes

- `idx_asset_info_ticker_symbol` - Index on `ticker_symbol` for fast search
- `idx_asset_info_display_name` - Index on `display_name` for fast search

## Utility Functions

### `assetSymbolUtils.js`

New utility module with helper functions:

1. **`extractTickerSymbol(symbol)`**
   - Extracts traditional ticker from database symbol
   - `X:BTCUSD` → `BTC`
   - `AAPL` → `AAPL`
   - `^GSPC` → `^GSPC`

2. **`generateDisplayName(symbol, name)`**
   - Generates clean display name
   - Removes common suffixes (Inc., Corp., Ltd., etc.)
   - Maps crypto tickers to common names (BTC → Bitcoin)
   - Maps index symbols to readable names (^GSPC → S&P 500)

3. **`generateSearchAliases(symbol, name, ticker)`**
   - Generates alternative search terms
   - Includes ticker, symbol, display name, and word variations

## Search Query Updates

### Backend Search Route (`/api/search/autocomplete`)

**Enhanced SQL Query:**
```sql
SELECT symbol, name, ticker_symbol, display_name, type, category, exchange, currency 
FROM asset_info 
WHERE (
  LOWER(symbol) LIKE LOWER($1) 
  OR LOWER(name) LIKE LOWER($1)
  OR LOWER(COALESCE(ticker_symbol, '')) LIKE LOWER($1)
  OR LOWER(COALESCE(display_name, '')) LIKE LOWER($1)
)
```

**Search Priority:**
1. Exact ticker match
2. Exact symbol match
3. Exact display name match
4. Starts with ticker
5. Starts with symbol
6. Starts with display name
7. Contains matches

### Response Format

```json
{
  "results": [
    {
      "symbol": "X:BTCUSD",
      "name": "Bitcoin",
      "ticker": "BTC",
      "category": "Crypto",
      "market": "crypto",
      "type": "crypto",
      "exchange": "CoinGecko",
      "currency": "USD"
    }
  ]
}
```

## Frontend Updates

### SearchBar Component

- Displays `display_name` or `name` as primary text
- Shows `ticker` or extracted ticker as secondary text
- Example: "Bitcoin" with "BTC" below (instead of "X:BTCUSD")

## Asset Creation/Update

All asset insertion/update points now populate `ticker_symbol` and `display_name`:

1. **Crypto Service** (`cryptoService.js`)
   - Extracts ticker from `X:BTCUSD` format
   - Uses crypto name as display name

2. **Crypto Market Service** (`cryptoMarketService.js`)
   - Updates ticker and display name on market data refresh

3. **Asset Routes** (`asset.js`, `portfolio.js`, `watchlist.js`)
   - Populates ticker and display name when creating assets

4. **Populate Scripts** (`populateStocksIndicesCrypto.js`)
   - Generates ticker and display name for all assets

## Migration Script

### `updateTickerSymbols.js`

Script to update existing assets with ticker symbols and display names:

```bash
node scripts/updateTickerSymbols.js
```

This script:
- Reads all assets from `asset_info`
- Extracts ticker symbols using `extractTickerSymbol()`
- Generates display names using `generateDisplayName()`
- Updates database records

## Search Examples

### Before
- Search "BTC" → No results (only "X:BTCUSD" exists)
- Search "Bitcoin" → No results (name might be "Bitcoin (Crypto)")
- Search "Apple" → No results (only "AAPL" exists)

### After
- Search "BTC" → Finds `X:BTCUSD` (via ticker_symbol)
- Search "Bitcoin" → Finds `X:BTCUSD` (via display_name)
- Search "Apple" → Finds `AAPL` (via display_name)
- Search "AAPL" → Finds `AAPL` (via ticker_symbol or symbol)

## Benefits

1. ✅ **Intuitive Search**: Users can search by common names/tickers
2. ✅ **Better UX**: Display names are cleaner and more readable
3. ✅ **Faster Queries**: Indexed columns for quick lookups
4. ✅ **Backward Compatible**: Still supports database symbol format


