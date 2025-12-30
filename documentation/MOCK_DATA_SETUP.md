# Mock Data Service Setup

This application includes a mock data service for local development that generates realistic pricing data for stocks, crypto, and commodities without requiring API keys or external services.

## How It Works

The mock data service automatically activates when:
- `NODE_ENV !== 'production'` (development mode)
- `USE_MOCK_DATA !== 'false'` (can be explicitly disabled)

In production, the service automatically uses the Polygon.io API.

## Environment Variables

### Development (Mock Data)
```bash
# .env (development)
NODE_ENV=development
# USE_MOCK_DATA=true (default in development)
```

### Production (Real API)
```bash
# .env (production)
NODE_ENV=production
POLYGON_API_KEY=your_api_key_here
```

### Force Real API in Development
```bash
# .env (development with real API)
NODE_ENV=development
USE_MOCK_DATA=false
POLYGON_API_KEY=your_api_key_here
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
- Generates historical OHLCV data for any time range
- Stores data in database for consistency
- Supports: 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, All

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

