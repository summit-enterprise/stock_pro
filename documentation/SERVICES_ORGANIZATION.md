# Services Organization

## Overview

Services are organized by their role and asset type specificity:

```
services/
├── infrastructure/     # Storage, billing, cloud services
├── general/           # Services used by all asset types (news, logos)
├── stocks/            # Stock-specific services
├── crypto/            # Crypto-specific services
└── utils/             # Utility services

mockservices/
├── infrastructure/    # Mock infrastructure services
├── general/           # Mock general services
├── stocks/            # Mock stock services
├── crypto/            # Mock crypto services
└── utils/             # Mock utility services
```

## Service Categories

### Infrastructure Services (`infrastructure/`)

**Purpose**: Core infrastructure services (storage, billing, cloud)

**Services**:
- `storageService.js` - Google Cloud Storage operations
- `googleCloudService.js` - GCP service initialization
- `gcpBillingService.js` - GCP billing and usage data

**Used by**: All services that need storage or billing data

### General Services (`general/`)

**Purpose**: Services used by all asset types (stocks, crypto, etc.)

**Services**:
- `newsService.js` - General news articles
- `assetNewsService.js` - Asset-specific news
- `logoService.js` - Logo fetching for all asset types

**Used by**: All asset types

### Stock-Specific Services (`stocks/`)

**Purpose**: Services specific to stock/equity assets

**Services**:
- `dividendService.js` - Dividend data (stocks only)
- `filingsService.js` - SEC filings (stocks only)
- `ratingsService.js` - Analyst ratings (stocks only)
- `analystRatingsService.js` - Individual analyst ratings (stocks only)

**Used by**: Stock/equity assets only

### Crypto-Specific Services (`crypto/`)

**Purpose**: Services specific to cryptocurrency assets

**Services**:
- `cryptoService.js` - Crypto asset list and metadata
- `cryptoPriceService.js` - Crypto price data (historical and current)

**Used by**: Cryptocurrency assets only

### Utility Services (`utils/`)

**Purpose**: Utility and helper services

**Services**:
- `assetGenerator.js` - Asset list generation
- `mockData.js` - Mock data generation utilities

**Used by**: Scripts and testing

## Mock Services Structure

Mock services mirror the real services structure:

```
mockservices/
├── infrastructure/
│   ├── storageService.js
│   └── gcpBillingService.js
├── general/
│   ├── newsService.js
│   ├── assetNewsService.js
│   └── logoService.js
├── stocks/
│   ├── mockDividendService.js
│   ├── filingsService.js
│   ├── ratingsService.js
│   └── analystRatingsService.js
├── crypto/
│   ├── mockCryptoService.js
│   └── mockCryptoPriceService.js
└── utils/
    ├── assetGenerator.js
    └── mockData.js
```

## Service Loading

### Automatic Service Loader

The `services/index.js` file provides automatic service loading:

```javascript
const { cryptoService, dividendService } = require('../services');
```

This automatically:
- Loads mock services if `USE_MOCK_SERVICES=true` or `NODE_ENV=local`
- Falls back to real services if mock doesn't exist
- Loads real services in dev/production

### Manual Service Loading

You can also load services directly:

```javascript
// Real service
const cryptoService = require('../services/crypto/cryptoService');

// Mock service
const cryptoService = require('../mockservices/crypto/mockCryptoService');
```

## Service Responsibilities

### Crypto Services

**cryptoService.js**:
- Fetches crypto list from CoinGecko (top 8000)
- Stores crypto assets in database
- Manages coin ID mappings

**cryptoPriceService.js**:
- Fetches historical prices (back to 2011)
- Fetches current prices
- Stores price data in TimescaleDB
- Syncs missing date ranges

### Stock Services

**dividendService.js**:
- Fetches dividend data from Polygon.io
- Stores dividends in database
- Provides dividend statistics

**filingsService.js**:
- Fetches SEC filings from EDGAR API
- Stores filings in database
- Provides filing statistics

**ratingsService.js**:
- Fetches analyst ratings from Polygon.io
- Stores ratings in database
- Provides consensus ratings

**analystRatingsService.js**:
- Fetches individual analyst ratings
- Stores in database
- Provides detailed rating breakdowns

### General Services

**newsService.js**:
- Fetches general news articles
- Caches in Redis
- Supports multiple categories

**assetNewsService.js**:
- Fetches asset-specific news
- Caches in Redis
- Supports all asset types

**logoService.js**:
- Fetches logos from multiple APIs
- Financial Modeling Prep (stocks)
- CoinGecko (crypto)
- Finnhub, Polygon, Clearbit (fallbacks)
- Stores in GCP Storage or returns URLs

## Import Paths

### Updated Import Paths

All imports have been updated to use the new structure:

```javascript
// Old (deprecated)
const cryptoService = require('../services/cryptoService');
const dividendService = require('../services/dividendService');

// New (correct)
const cryptoService = require('../services/crypto/cryptoService');
const dividendService = require('../services/stocks/dividendService');

// Or use index (recommended)
const { cryptoService, dividendService } = require('../services');
```

## Environment Variables

### Service Selection

- `USE_MOCK_SERVICES=true` - Use mock services
- `NODE_ENV=local` - Use mock services
- `NODE_ENV=production` - Use real services

### API Keys

- `COINGECKO_API_KEY` - For crypto services
- `POLYGON_API_KEY` - For stock services
- `FINNHUB_API_KEY` - For logos and ratings
- `NEWS_API_KEY` - For news services

## Migration Notes

All existing code has been updated to use the new paths. The old flat structure is deprecated.

If you see import errors, update to:
- `services/crypto/cryptoService` (not `services/cryptoService`)
- `services/stocks/dividendService` (not `services/dividendService`)
- `services/general/logoService` (not `services/logoService`)
- `services/infrastructure/storageService` (not `services/storageService`)

## Benefits of This Organization

1. **Clear Separation**: Easy to find services by type
2. **Scalability**: Easy to add new asset types (e.g., `commodities/`)
3. **Maintainability**: Related services grouped together
4. **Mock Support**: Complete mock service coverage
5. **Type Safety**: Clear which services work with which asset types

