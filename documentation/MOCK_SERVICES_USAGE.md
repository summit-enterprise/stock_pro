# Mock Services Usage Guide

## Overview

The application has a **centralized service loader** that automatically switches between real and mock services based on environment variables.

## How It Works

### Service Loader (`services/index.js`)

The service loader checks:
```javascript
const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES === 'true' || 
                          process.env.NODE_ENV === 'local';
```

If `USE_MOCK_SERVICES` is true, it loads services from `mockservices/` directory.
Otherwise, it loads from `services/` directory.

### Using Services in Routes

**✅ Correct way (uses service loader):**
```javascript
const { dividendService, filingsService } = require('../services');
```

**❌ Wrong way (bypasses service loader):**
```javascript
const dividendService = require('../services/stocks/dividendService');
```

## Enabling Mock Services

### Option 1: Set NODE_ENV to 'local'
```bash
# In .env file
NODE_ENV=local
```

### Option 2: Set USE_MOCK_SERVICES to 'true'
```bash
# In .env file
USE_MOCK_SERVICES=true
```

## Current Status

All routes have been updated to use the service loader:
- ✅ `routes/asset.js` - Uses service loader
- ✅ `routes/news.js` - Uses service loader
- ✅ `routes/ratings.js` - Uses service loader
- ✅ `routes/admin.js` - Uses service loader
- ✅ `routes/storage.js` - Uses service loader

## What Gets Mocked

When `NODE_ENV=local` or `USE_MOCK_SERVICES=true`:

### Infrastructure Services
- `storageService` - Mock file uploads (logs instead of uploading)
- `gcpBillingService` - Mock billing data

### General Services
- `newsService` - Mock news articles
- `assetNewsService` - Mock asset-specific news
- `logoService` - Returns null (uses default icons)

### Stock Services
- `dividendService` - Mock dividend data
- `filingsService` - Mock SEC filings
- `ratingsService` - Mock analyst ratings
- `analystRatingsService` - Mock individual ratings

### Crypto Services
- `cryptoService` - Mock crypto asset list
- `cryptoPriceService` - Mock crypto prices

## Testing

To verify mock services are being used:

1. Set `NODE_ENV=local` in your `.env` file
2. Restart the server
3. Check console logs - mock services will log `[MOCK]` messages
4. API responses will contain generated mock data instead of real API data

## Fallback Behavior

If a mock service doesn't exist, the service loader will:
1. Try to load from `mockservices/`
2. If not found, fall back to real service from `services/`
3. Log a warning: `Mock service not found for [path], using real service`

This ensures the application always works, even if some mock services are missing.



