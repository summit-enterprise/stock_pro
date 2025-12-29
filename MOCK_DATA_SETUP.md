# Mock Data Service Setup

This application includes a mock data service for local development that generates realistic pricing data for stocks, crypto, and commodities without requiring API keys or external services.

## How It Works

The mock data service automatically activates when:
- `NODE_ENV !== 'production'` (development mode)
- `USE_MOCK_DATA !== 'false'` (can be explicitly disabled)

In production, the service automatically uses the Polygon.io API.

### Environment Detection

When you run:
- **`npm run dev`** → Sets `NODE_ENV=development` → **Uses Mock Data** ✅
- **`npm start`** → Sets `NODE_ENV=production` → **Uses Real API** 🌐

The server will log which mode it's using when it starts:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: development
Using Mock Data: ✅ YES
📊 Mock data service is active - no API key required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Environment Variables

### Development (Mock Data) - Default
```bash
# .env (development)
NODE_ENV=development
# USE_MOCK_DATA=true (default in development - no need to set)
```

When running `npm run dev`, mock data is automatically used. No API key required!

### Production (Real API) - Default
```bash
# .env (production)
NODE_ENV=production
POLYGON_API_KEY=your_api_key_here
```

When running `npm start`, the real Polygon.io API is used. API key is required.

## Forcing Mock Data or Real API

### Force Real API in Development

If you want to test with the real Polygon.io API during development:

**Option 1: Using environment variable**
```bash
# .env file
NODE_ENV=development
USE_MOCK_DATA=false
POLYGON_API_KEY=your_api_key_here
```

**Option 2: Using command line**
```bash
USE_MOCK_DATA=false npm run dev
```

**Option 3: Temporarily in code**
You can also set `USE_MOCK_DATA=false` in your `.env` file for that session.

### Force Mock Data in Production

If you want to use mock data even in production (for testing/demos):

**Option 1: Using environment variable**
```bash
# .env file
NODE_ENV=production
USE_MOCK_DATA=true
```

**Option 2: Using command line**
```bash
USE_MOCK_DATA=true npm start
```

## Quick Reference

| Command | NODE_ENV | USE_MOCK_DATA | Result |
|---------|----------|---------------|--------|
| `npm run dev` | `development` | `true` (default) | ✅ Mock Data |
| `npm start` | `production` | `false` (default) | 🌐 Real API |
| `USE_MOCK_DATA=false npm run dev` | `development` | `false` | 🌐 Real API |
| `USE_MOCK_DATA=true npm start` | `production` | `true` | ✅ Mock Data |

## Verification

When the server starts, you'll see a log message indicating which mode is active:

**Mock Data Mode:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: development
Using Mock Data: ✅ YES
📊 Mock data service is active - no API key required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Real API Mode:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: production
Using Mock Data: ❌ NO (Real API)
🌐 Using Polygon.io API - POLYGON_API_KEY required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Supported Assets

### Stocks
- Tech: AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, NFLX, AMD, INTC
- Finance: JPM, BAC, GS, V, MA
- Healthcare: JNJ, PFE, UNH
- Consumer: WMT, DIS

### Indices (ETFs)
- SPY (S&P 500)
- DIA (Dow Jones)
- QQQ (NASDAQ)
- IWM (Russell 2000)
- EWU (FTSE 100)
- EWJ (Nikkei 225)
- EWC (S&P/TSX 60)

### Crypto
- X:BTCUSD (Bitcoin)
- X:ETHUSD (Ethereum)

### Commodities
- XAUUSD (Gold)
- XAGUSD (Silver)

## Features

### Realistic Price Generation
- Base prices for each asset type
- Realistic volatility (2-3% for stocks, 3% for crypto)
- Daily price movements with proper high/low/open/close
- Volume generation based on asset popularity

### Historical Data
- **Always generates 30 days of historical data** on first asset view
- Generates historical OHLCV data for any time range
- Stores data in database for consistency
- Supports: 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, All
- Skips weekends (only trading days)
- Realistic price movements with proper high/low/open/close

### Search/Autocomplete
- Mock search results for popular stocks
- Filters by symbol or company name
- Returns up to 10 matching results

## Usage

The mock service is automatically used in all routes:
- `/api/market/overview` - Market tiles
- `/api/asset/:symbol` - Asset detail pages
- `/api/search/autocomplete` - Search functionality
- `/api/watchlist` - Watchlist prices
- `/api/portfolio/summary` - Portfolio calculations

## Customization

To add more assets or modify base prices, edit:
```
backend/services/mockData.js
```

Update the `BASE_PRICES` object and `getMockSearchResults()` function to add new assets.

## Benefits

1. **No API Keys Required** - Develop locally without Polygon.io subscription
2. **No Rate Limits** - Test freely without worrying about API quotas
3. **Consistent Data** - Predictable data for testing UI/UX
4. **Fast Development** - No network delays during development
5. **Cost Effective** - Save API calls for production use

## Notes

- Mock data is generated fresh on each request (prices change slightly)
- Historical data is stored in the database for consistency
- Prices follow realistic patterns but are not real market data
- Always use real API data in production for accurate information

