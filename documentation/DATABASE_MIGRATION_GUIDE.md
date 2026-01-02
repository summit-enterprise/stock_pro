# Database Migration Guide

This guide explains how to migrate existing code to use the new centralized database configuration.

## What's Been Implemented

### ✅ Centralized Configuration

1. **`backend/config/database.js`**: Centralized database configuration module
   - Automatically selects PostgreSQL database based on `NODE_ENV`
   - Automatically selects Redis database index based on `NODE_ENV`
   - Provides helper functions for creating connections

2. **`backend/config/redis.js`**: Centralized Redis client module
   - Singleton Redis client instance
   - Automatically connects to correct database index
   - Provides `getRedisClient()`, `initRedis()`, `isRedisAvailable()`, `closeRedis()`

3. **Updated Files**:
   - `backend/db.js`: Now uses centralized PostgreSQL config
   - `backend/server.js`: Uses centralized Redis initialization
   - `backend/routes/news.js`: Updated to use centralized Redis
   - `backend/routes/market.js`: Updated to use centralized Redis

## Migration Steps for Remaining Files

### For Routes (e.g., `routes/*.js`)

**Before:**
```javascript
const redis = require('redis');
let redisClient = null;
const initRedis = async () => {
  if (!redisClient) {
    redisClient = redis.createClient({ url: 'redis://localhost:6379' });
    await redisClient.connect();
  }
};
initRedis().catch(() => {});
```

**After:**
```javascript
const { getRedisClient } = require('../config/redis');

// In your route handlers:
const redisClient = await getRedisClient();
if (redisClient && redisClient.isOpen) {
  // Use redisClient
}
```

### For Services (e.g., `services/**/*.js`)

**Before:**
```javascript
const redis = require('redis');
let redisClient = null;
const initRedis = async () => {
  if (!redisClient) {
    redisClient = redis.createClient({ url: 'redis://localhost:6379' });
    await redisClient.connect();
  }
};
```

**After:**
```javascript
const { getRedisClient } = require('../../config/redis');

// In your functions:
const redisClient = await getRedisClient();
if (redisClient && redisClient.isOpen) {
  // Use redisClient
}
```

## Files That Need Migration

### Routes
- [ ] `backend/routes/ratings.js` - Already uses service, may need update
- [ ] Any other routes with direct Redis connections

### Services
- [ ] `backend/services/stocks/dividendService.js`
- [ ] `backend/services/stocks/filingsService.js`
- [ ] `backend/services/stocks/analystRatingsService.js`
- [ ] `backend/services/general/assetNewsService.js`
- [ ] `backend/services/infrastructure/gcpBillingService.js`

## Testing the Migration

1. **Set environment variables**:
   ```bash
   NODE_ENV=local
   USE_MOCK_DATA=true
   ```

2. **Check logs** on startup:
   - Should see: `📊 PostgreSQL: Connecting to database "stockdb_local"`
   - Should see: `✅ Redis: Connected to database 0 (local environment)`

3. **Verify database selection**:
   - Change `NODE_ENV=development` and restart
   - Should see: `📊 PostgreSQL: Connecting to database "stockdb_dev"`
   - Should see: `✅ Redis: Connected to database 1 (development environment)`

## Benefits

1. **Environment Isolation**: Each environment uses its own database
2. **Easy Switching**: Just change `NODE_ENV` to switch environments
3. **No Code Changes**: Database selection is automatic
4. **Centralized Config**: All database settings in one place
5. **Better Logging**: Clear indication of which database is being used

## Next Steps

1. Update remaining services to use centralized Redis client
2. Test in all environments (local, dev, prod)
3. Set up production database credentials
4. Document production deployment process



