# API Tracking & Quota Monitoring Setup

## Overview

The API tracking system monitors all external API calls made by the application, logs them to the database, and tracks quota usage for each API provider.

## Database Tables

### `api_call_logs`
Stores individual API call records with:
- API provider and name
- Endpoint and method
- Status code and response time
- Success/failure status
- Quota units used
- Service name that made the call

### `api_quota_tracking`
Tracks quota usage per API provider:
- Quota limit and current usage
- Quota remaining
- Quota reset date
- Quota period (daily, monthly, minute, second)

## API Providers Tracked

The system tracks the following APIs:
- **Polygon.io** - 5M calls/month (free tier)
- **NewsAPI** - 100 requests/day (free tier)
- **Finnhub** - 60 calls/minute (free tier)
- **CoinGecko** - 50 calls/minute (free tier)
- **YouTube Data API** - 10,000 units/day (free tier)
- **Alpha Vantage** - 25 requests/day (free tier)
- **CoinMarketCap** - 333 requests/day (free tier)
- **Financial Modeling Prep** - 250 requests/day (free tier)
- **SEC EDGAR** - 10 requests/second

## Integration

### Using Tracked Axios in Services

To track API calls in your services, replace `axios` with the tracked version:

```javascript
const { createTrackedAxios } = require('../services/general/apiTrackingService');

// Create a tracked axios instance for your service
const trackedAxios = createTrackedAxios('dividendService');

// Use trackedAxios instead of axios
const response = await trackedAxios.get(url, { params });
```

### Manual Logging

You can also manually log API calls:

```javascript
const apiTrackingService = require('../services/general/apiTrackingService');

await apiTrackingService.logApiCall({
  apiProvider: 'polygon',
  apiName: 'Polygon.io',
  endpoint: '/v2/reference/dividends',
  method: 'GET',
  statusCode: 200,
  responseTimeMs: 150,
  success: true,
  quotaUnitsUsed: 1,
  serviceName: 'dividendService',
});
```

## Admin Routes

- `GET /api/admin/api-calls/stats` - Get API call statistics
  - Query params: `timeRange` (24h, 7d, 30d, all), `apiProvider`
- `GET /api/admin/api-calls/quota` - Get quota usage for all APIs
- `GET /api/admin/api-calls/recent` - Get recent API calls
  - Query params: `limit`, `apiProvider`
- `GET /api/admin/api-calls/providers` - Get list of all API providers

## Admin UI

The admin panel now includes an "API Calls & Quota" tab that displays:
- **Quota Usage Cards**: Visual representation of quota usage per API
- **API Call Statistics**: Table showing total calls, success/failure rates, response times
- **Recent API Calls**: Log of recent API calls with details

## Next Steps

To fully enable tracking, update services to use `createTrackedAxios()`:

1. **Priority Services** (high API usage):
   - `dividendService.js` - Polygon.io
   - `newsService.js` - NewsAPI
   - `youtubeService.js` - YouTube Data API
   - `cryptoService.js` - CoinGecko
   - `logoService.js` - Multiple APIs

2. **Example Migration**:
   ```javascript
   // Before
   const axios = require('axios');
   const response = await axios.get(url);
   
   // After
   const { createTrackedAxios } = require('../services/general/apiTrackingService');
   const trackedAxios = createTrackedAxios('serviceName');
   const response = await trackedAxios.get(url);
   ```

## Quota Calculation

The system automatically calculates quota units based on:
- **YouTube API**: Search = 100 units, Videos = 1 unit
- **Other APIs**: Typically 1 unit per request
- Custom quota calculations can be added in `apiTrackingService.js`

## Notes

- Quota tracking resets automatically based on the quota period
- Failed API calls are still counted toward quota (as most APIs do)
- The system gracefully handles logging failures (won't break the app)
- All API calls are logged with timestamps for historical analysis

