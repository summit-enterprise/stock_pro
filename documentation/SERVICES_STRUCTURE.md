# Services Structure Documentation

## Overview

The backend services are organized into two main directories:
- **`services/`**: Real services that call external APIs (used in dev and production)
- **`mockservices/`**: Mock services for local development (optional, services have built-in mock fallbacks)

## Current Structure

### Services Directory (`backend/services/`)

Real services that integrate with external APIs:

1. **`cryptoService.js`** ⭐ NEW
   - CoinGecko API integration
   - Fetches top 8000 cryptocurrencies
   - Historical price data (back to 2011)
   - Current prices and market data

2. **`dividendService.js`**
   - Polygon.io dividend data
   - Built-in mock fallback

3. **`filingsService.js`**
   - SEC EDGAR filings
   - Built-in mock fallback

4. **`ratingsService.js`**
   - Analyst ratings (Polygon.io)
   - Built-in mock fallback

5. **`analystRatingsService.js`**
   - Individual analyst ratings
   - Built-in mock fallback

6. **`newsService.js`**
   - News API integration
   - Built-in mock fallback

7. **`assetNewsService.js`**
   - Asset-specific news
   - Built-in mock fallback

8. **`logoService.js`**
   - Logo fetching from multiple APIs
   - Financial Modeling Prep, CoinGecko, Finnhub, Polygon

9. **`gcpBillingService.js`**
   - Google Cloud billing data
   - Built-in mock fallback

10. **`storageService.js`**
    - Google Cloud Storage operations
    - File upload, compression, management

11. **`googleCloudService.js`**
    - GCP service initialization
    - Storage client setup

12. **`assetGenerator.js`**
    - Asset list generation (for testing)

### Mock Services Directory (`backend/mockservices/`)

Mock-only versions for local development:

1. **`mockData.js`**
   - Base mock data generator
   - Price generation, search results, market movers

2. **`README.md`**
   - Documentation for mock services

## Service Behavior

### Automatic Mock Fallback

Most services automatically use mock data when:
- `NODE_ENV !== 'production'`
- `USE_MOCK_DATA !== 'false'`
- API keys are missing

Example from `dividendService.js`:
```javascript
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

async function fetchDividendsFromAPI(symbol) {
  if (!process.env.POLYGON_API_KEY) {
    return generateMockDividends(symbol);
  }
  // ... real API call
}
```

### Environment-Based Switching

To force real services:
```bash
NODE_ENV=production USE_MOCK_DATA=false node server.js
```

To force mock services:
```bash
NODE_ENV=local USE_MOCK_DATA=true node server.js
```

## Crypto Service Usage

### Fetch and Store Cryptocurrencies

```bash
cd backend
node scripts/populateCryptos.js
```

This will:
1. Fetch top 8000 cryptocurrencies from CoinGecko
2. Store in `asset_info` table with `type='crypto'`
3. Store CoinGecko coin IDs in `crypto_coin_ids` table
4. Optionally fetch historical prices (top 100 only)

### Sync Historical Prices

```bash
# Sync all cryptos
node scripts/syncCryptoPrices.js

# Sync top 50
node scripts/syncCryptoPrices.js --limit 50

# Sync specific symbols
node scripts/syncCryptoPrices.js --symbols "X:BTCUSD,X:ETHUSD"
```

## Database Integration

### Crypto Assets

- Stored in `asset_info` table
- Symbol format: `X:{SYMBOL}USD` (e.g., `X:BTCUSD`)
- Type: `'crypto'`
- Coin IDs stored in `crypto_coin_ids` table for API lookups

### Price Data

- Stored in `asset_data` table (TimescaleDB)
- Same structure as equity price data
- Efficient time-series storage with compression
- Historical data back to 2011

## Service Patterns

### Standard Service Pattern

```javascript
// Check for mock mode
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

// API function with mock fallback
async function fetchDataFromAPI(symbol) {
  if (!process.env.API_KEY || USE_MOCK_DATA) {
    return generateMockData(symbol);
  }
  
  try {
    // Real API call
    const response = await axios.get(url);
    return processResponse(response);
  } catch (error) {
    // Fallback to mock on error
    return generateMockData(symbol);
  }
}

// Store in database
async function storeData(symbol, data) {
  // Database operations
}

// Cache in Redis
async function cacheData(symbol, data) {
  // Redis caching
}
```

## Future Improvements

### True Service Separation

For a cleaner separation, consider:

1. **Service Loader Pattern**:
   ```javascript
   const serviceLoader = require('./serviceLoader');
   const dividendService = serviceLoader.load('dividendService');
   ```

2. **Interface-Based Design**:
   - Define service interfaces
   - Implement real and mock versions
   - Load based on environment

3. **Dependency Injection**:
   - Inject services at application startup
   - Easy to swap real/mock implementations

## Notes

- Current services have built-in mock fallbacks (no separate mock files needed)
- `mockservices/` directory is for future expansion
- Crypto service is new and doesn't have mock fallback yet (uses real API only)
- All services follow similar patterns for consistency
- TimescaleDB is used for efficient time-series storage

## Related Documentation

- `CRYPTO_SERVICES.md` - Crypto service details
- `GCP_BILLING_AND_STORAGE.md` - GCP integration
- `LOGO_IMPLEMENTATION_SUMMARY.md` - Logo service details



