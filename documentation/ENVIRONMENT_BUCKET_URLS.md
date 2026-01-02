# Environment-Specific Buckets and URLs

## Overview

The application uses environment-specific GCP buckets and ensures URLs are appropriate for each environment.

## Bucket Configuration

### Bucket Names by Environment

| Environment | Bucket Name | NODE_ENV Value |
|------------|-------------|----------------|
| **Local** | `stock-app-assets` | `local` or unset |
| **Dev** | `stock-app-assets-dev` | `dev` or `development` |
| **Prod** | `stock-app-assets-prod` | `prod` or `production` |

### Automatic Selection

The system automatically selects the correct bucket based on `NODE_ENV`:

```javascript
const { getBucketName, getCurrentEnvironment } = require('./utils/bucketConfig');
const bucketName = getBucketName(); // Automatically gets correct bucket
const env = getCurrentEnvironment(); // Returns 'local', 'dev', or 'prod'
```

## URL Format

### Database Storage (Environment-Agnostic)

All image URLs stored in the database use **relative paths** that work across all environments:

- **Avatars**: `/api/image/gcp/avatars/{userId}.webp`
- **Logos**: `/api/image/gcp/logos/{SYMBOL}.webp`

These relative paths are:
- ✅ Environment-agnostic (work in local/dev/prod)
- ✅ Frontend-friendly (Next.js API routes)
- ✅ Backend-aware (backend uses correct bucket based on NODE_ENV)

### How It Works

1. **Backend Storage**:
   - When uploading, backend uses `getBucketName()` to get environment-specific bucket
   - Stores relative path in database: `/api/image/gcp/avatars/1.webp`

2. **Backend Serving**:
   - When serving images via `/api/image/gcp/...`, backend:
     - Reads relative path from request
     - Uses `getBucketName()` to get correct bucket for current environment
     - Fetches from environment-specific bucket

3. **Frontend Display**:
   - Frontend receives relative path from backend
   - Uses Next.js API route: `/api/image/gcp/avatars/1.webp`
   - Next.js API route proxies to backend with correct `NEXT_PUBLIC_BACKEND_URL`

## Environment Variables

### Backend (.env)

```env
# Environment
NODE_ENV=local  # or 'dev' or 'prod'

# GCP Configuration
GCP_PROJECT_ID=project-finance-482417
GOOGLE_APPLICATION_CREDENTIALS=./.secrets/gcp-service-account-key.json

# Optional: Override bucket name
# GCP_STORAGE_BUCKET=stock-app-assets-custom
```

### Frontend (.env.local)

```env
# Backend URL (environment-specific)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # Local
# NEXT_PUBLIC_BACKEND_URL=https://api-dev.yourdomain.com  # Dev
# NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com  # Prod
```

## Verification

### Check Current Configuration

```bash
cd backend
node -e "
const {getBucketName, getCurrentEnvironment} = require('./utils/bucketConfig');
console.log('Environment:', getCurrentEnvironment());
console.log('Bucket:', getBucketName());
"
```

### Test Image Serving

```bash
# Test avatar serving (uses current environment's bucket)
curl http://localhost:3001/api/image/gcp/avatars/1.webp

# Test logo serving (uses current environment's bucket)
curl http://localhost:3001/api/image/gcp/logos/AAPL.webp
```

## Key Points

1. ✅ **Database URLs are environment-agnostic** - Relative paths work everywhere
2. ✅ **Backend uses environment-specific buckets** - Automatically selected based on NODE_ENV
3. ✅ **Frontend URLs work in all environments** - Next.js API routes handle backend URL
4. ✅ **No hardcoded bucket names** - All services use `getBucketName()`
5. ✅ **Consistent across services** - imageService, logoService, storageService all use same bucket

## Migration Between Environments

When moving between environments:

1. **Database URLs stay the same** - Relative paths work everywhere
2. **Bucket contents are separate** - Each environment has its own bucket
3. **No URL updates needed** - Same relative paths work in all environments

## Example Flow

### Local Environment
1. Upload avatar → Stored in `stock-app-assets/avatars/1.webp`
2. Database stores: `/api/image/gcp/avatars/1.webp`
3. Frontend requests: `/api/image/gcp/avatars/1.webp`
4. Backend serves from: `stock-app-assets` bucket

### Dev Environment
1. Upload avatar → Stored in `stock-app-assets-dev/avatars/1.webp`
2. Database stores: `/api/image/gcp/avatars/1.webp` (same path!)
3. Frontend requests: `/api/image/gcp/avatars/1.webp`
4. Backend serves from: `stock-app-assets-dev` bucket

### Prod Environment
1. Upload avatar → Stored in `stock-app-assets-prod/avatars/1.webp`
2. Database stores: `/api/image/gcp/avatars/1.webp` (same path!)
3. Frontend requests: `/api/image/gcp/avatars/1.webp`
4. Backend serves from: `stock-app-assets-prod` bucket

**The same URL works in all environments because the backend automatically uses the correct bucket!**

