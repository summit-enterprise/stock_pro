# Mock Services Directory

This directory contains mock versions of services for **local development only**.

## Purpose

- **services/**: Real services that call external APIs (used in dev and production)
- **mockservices/**: Mock services that generate fake data (used in local development)

## Usage

Set `NODE_ENV=local` or `USE_MOCK_SERVICES=true` to use mock services.

## Services Structure

### Real Services (services/)
- `cryptoService.js` - CoinGecko API integration
- `dividendService.js` - Polygon.io dividend data
- `filingsService.js` - SEC EDGAR filings
- `ratingsService.js` - Analyst ratings
- `newsService.js` - News API integration
- `logoService.js` - Logo fetching from APIs
- etc.

### Mock Services (mockservices/)
- `mockData.js` - Base mock data generator
- `mockCryptoService.js` - Mock crypto data
- `mockDividendService.js` - Mock dividend data
- `mockFilingsService.js` - Mock filings data
- etc.

## Switching Between Real and Mock

The application automatically uses mock services when:
- `NODE_ENV=local`
- `USE_MOCK_SERVICES=true`

Otherwise, it uses real services from `services/` directory.



