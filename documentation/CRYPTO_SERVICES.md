# Cryptocurrency Services Documentation

## Overview

The cryptocurrency services fetch and store crypto asset data from CoinGecko API, including:
- Top 8000 cryptocurrencies
- Historical price data (back to 2011)
- Current prices and market data

## Services

### `cryptoService.js`

Main service for cryptocurrency data operations.

#### Functions:

1. **`fetchCryptoList(limit = 8000)`**
   - Fetches list of cryptocurrencies from CoinGecko
   - Returns array of crypto objects with: id, symbol, name, marketCap, currentPrice, etc.
   - Handles pagination and rate limiting

2. **`storeCryptoAssets(cryptos)`**
   - Stores crypto assets in `asset_info` table
   - Creates symbols in format: `X:{SYMBOL}USD` (e.g., `X:BTCUSD`)
   - Stores CoinGecko coin IDs in `crypto_coin_ids` table for later lookup

3. **`fetchHistoricalPrices(coinId, symbol, startDate, endDate)`**
   - Fetches historical OHLC price data from CoinGecko
   - Returns array of price data points
   - Handles rate limiting and retries

4. **`fetchCurrentPrice(coinId, symbol)`**
   - Fetches current price and 24h change
   - Returns price, market cap, volume data

5. **`storeHistoricalPrices(symbol, priceData)`**
   - Stores price data in TimescaleDB `asset_data` table
   - Uses batch inserts for performance
   - Handles conflicts (updates existing data)

6. **`syncHistoricalPrices(coinId, symbol, dbSymbol)`**
   - Syncs historical data back to 2011 or coin launch
   - Fetches data in 90-day chunks (CoinGecko free tier limit)
   - Only fetches missing date ranges

## Scripts

### `populateCryptos.js`

Fetches and stores top 8000 cryptocurrencies.

**Usage:**
```bash
cd backend
node scripts/populateCryptos.js
```

**Options:**
- `FETCH_CRYPTO_HISTORICAL=false` - Skip historical data fetch (default: false)
- Only syncs top 100 cryptos by default to avoid rate limits

**What it does:**
1. Fetches crypto list from CoinGecko (up to 8000)
2. Stores in `asset_info` table with type='crypto'
3. Optionally fetches historical prices (top 100 only)

### `syncCryptoPrices.js`

Syncs historical price data for cryptocurrencies.

**Usage:**
```bash
# Sync all cryptos
node scripts/syncCryptoPrices.js

# Sync top 50 by market cap
node scripts/syncCryptoPrices.js --limit 50

# Sync specific symbols
node scripts/syncCryptoPrices.js --symbols "X:BTCUSD,X:ETHUSD,X:SOLUSD"
```

**What it does:**
1. Gets list of cryptos from database
2. For each crypto, fetches historical data back to 2011
3. Stores in TimescaleDB `asset_data` table
4. Only fetches missing date ranges

## Database Schema

### `asset_info` Table
- `symbol`: `X:{SYMBOL}USD` format (e.g., `X:BTCUSD`)
- `type`: `'crypto'`
- `name`: Full crypto name
- `market_cap`: Market capitalization
- `logo_url`: Logo URL from CoinGecko

### `crypto_coin_ids` Table
- `symbol`: Database symbol (e.g., `X:BTCUSD`)
- `coin_id`: CoinGecko coin ID (e.g., `bitcoin`)
- Used for API lookups

### `asset_data` Table (TimescaleDB)
- Same structure as equity price data
- `symbol`: `X:{SYMBOL}USD` format
- `date`, `open`, `high`, `low`, `close`, `volume`, `adjusted_close`

## Rate Limiting

CoinGecko API limits:
- **Free tier**: 10-50 calls/minute
- **Demo API key**: Higher limits

The services implement:
- 1.5 second delays between pagination requests
- 2-3 second delays between crypto syncs
- 10 second waits on rate limit (429) errors
- Automatic retries

## Historical Data Strategy

1. **Date Range**: Back to 2011-01-01 or coin launch date
2. **Chunking**: Fetches in 90-day chunks (CoinGecko free tier limit)
3. **Incremental**: Only fetches missing date ranges
4. **Storage**: Uses TimescaleDB for efficient time-series storage

## Integration with Existing Services

Crypto assets work with existing services:
- **Asset routes**: `/api/asset/X:BTCUSD` works like equities
- **Portfolio**: Can add crypto to portfolio
- **Watchlist**: Can add crypto to watchlist
- **Charts**: Historical price charts work the same way
- **Logo service**: Automatically fetches crypto logos

## Environment Variables

Required:
- `COINGECKO_API_KEY`: CoinGecko API key (optional but recommended)

Optional:
- `FETCH_CRYPTO_HISTORICAL`: Set to `true` to fetch historical data during population

## Example Usage

```javascript
const cryptoService = require('./services/cryptoService');

// Fetch top 100 cryptos
const cryptos = await cryptoService.fetchCryptoList(100);

// Store in database
await cryptoService.storeCryptoAssets(cryptos);

// Sync historical prices for Bitcoin
await cryptoService.syncHistoricalPrices('bitcoin', 'BTC', 'X:BTCUSD');
```

## Notes

- CoinGecko uses coin IDs (e.g., `bitcoin`) not symbols (e.g., `BTC`)
- The service maintains a mapping table for lookups
- Historical data fetching is slow (3+ seconds per crypto)
- For 8000 cryptos, full historical sync would take days
- Recommended: Sync top 100-500 most popular cryptos first

