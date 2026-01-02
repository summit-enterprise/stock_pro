# Asset Storage Setup - GCP Bucket

## Overview

All image assets (avatars, logos, backgrounds, branding, marketing materials, icons) are stored in Google Cloud Storage (GCP) for **local, dev, and prod** environments. This ensures consistent behavior across all environments and eliminates the need for local file storage.

## Bucket Configuration

- **Bucket Name**: `stock-app-assets` (configurable via `GCP_STORAGE_BUCKET` env var)
- **Location**: US
- **Storage Class**: STANDARD
- **Access**: Private (served via signed URLs through API routes)

## Asset Folder Structure

Assets are organized in the following folder structure within the GCP bucket:

```
stock-app-assets/
├── avatars/          # User profile pictures
├── logos/            # Company/asset logos
├── backgrounds/      # Background images
├── branding/        # Branding assets (STELLARALPHA.AI, etc.)
├── marketing/       # Marketing materials
├── icons/           # Icon assets
└── images/          # General images
```

## Environment Variables

Add to `.env`:

```bash
# GCP Storage Configuration
GCP_STORAGE_BUCKET=stock-app-assets
GCP_PROJECT_ID=your-project-id

# GCP Authentication (choose one method)
# Method 1: Service account key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Method 2: Service account JSON in env var
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Method 3: Application Default Credentials (recommended for local/dev)
# Run: gcloud auth application-default login
```

## Authentication Setup

### For Local Development

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   brew install google-cloud-sdk  # macOS
   ```

2. **Authenticate using Application Default Credentials**:
   ```bash
   gcloud auth application-default login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project your-project-id
   ```

### For Production/Dev

Use a **service account** with the following permissions:
- `Storage Admin` or `Storage Object Admin` role
- Create the service account in Google Cloud Console
- Download the JSON key file
- Set `GOOGLE_APPLICATION_CREDENTIALS` or `GCP_SERVICE_ACCOUNT_KEY`

## Migration Script

To migrate existing avatars from local storage to GCP:

```bash
cd backend
node scripts/migrateAvatarsToGCP.js
```

This script will:
1. Ensure the GCP bucket exists
2. Find all avatars in `temp/avatars_stored/`
3. Upload them to GCP
4. Update user `avatar_url` in the database

## Image Service API

### Upload Avatar

```javascript
const { imageService } = require('./services');

const result = await imageService.processAndUploadAvatar(
  '/path/to/image.jpg',
  userId,
  {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
  }
);

// Returns:
// {
//   success: true,
//   publicUrl: 'http://localhost:3001/api/image/gcp/avatars/123_1234567890.webp',
//   path: 'avatars/123_1234567890.webp',
//   size: 45678,
//   gcpPath: 'avatars/123_1234567890.webp'
// }
```

### Upload General Image Asset

```javascript
const result = await imageService.uploadImageAsset(
  '/path/to/image.png',
  'branding',  // folder: avatars, logos, backgrounds, branding, marketing, icons, general
  'stellar-alpha-logo',  // filename (without extension)
  {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 90,
    format: 'webp',
    public: false,  // false = private (signed URLs), true = public
  }
);
```

## Image Serving

### Private Images (Default)

Private images are served via signed URLs through the API:

- **Backend Route**: `/api/image/gcp/*`
- **Frontend Route**: `/api/image/gcp/[...path]`
- **URL Format**: `http://localhost:3001/api/image/gcp/avatars/user_123.webp`
- **Signed URL Expiry**: 1 hour (configurable)

### Public Images

If `public: true` is set during upload, images are publicly accessible:

- **URL Format**: `https://storage.googleapis.com/stock-app-assets/avatars/user_123.webp`
- **No authentication required**

## Image Processing

All images are automatically:
- **Compressed** to WebP format (unless specified otherwise)
- **Resized** to specified dimensions (if provided)
- **Optimized** for web delivery
- **Cached** with appropriate headers

## Next.js Image Component

The frontend uses Next.js Image component with the following configuration:

```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '3001',
      pathname: '/api/image/**',
    },
    {
      protocol: 'https',
      hostname: 'storage.googleapis.com',
      pathname: '/**',
    },
  ],
}
```

## Troubleshooting

### "invalid_grant" or "reauth related error"

Your GCP credentials have expired. Re-authenticate:

```bash
gcloud auth application-default login
```

### "Bucket does not exist"

The bucket will be created automatically on first use. Ensure you have:
- Proper GCP authentication
- `Storage Admin` or bucket creation permissions
- Correct `GCP_PROJECT_ID` set

### Images not loading

1. Check that the image exists in GCP:
   ```bash
   gsutil ls gs://stock-app-assets/avatars/
   ```

2. Verify the signed URL is valid (check backend logs)

3. Ensure the frontend is using the correct API route format

## Cost Considerations

GCP Storage pricing (approximate):
- **Storage**: $0.020 per GB/month
- **Operations**: $0.05 per 10,000 operations
- **Bandwidth**: $0.12 per GB (first 10TB)

For typical usage:
- 1,000 avatars (400x400 WebP): ~50MB storage
- Monthly cost: **~$0.01** (very affordable)

## Best Practices

1. **Always use WebP format** for better compression
2. **Set appropriate dimensions** to avoid storing oversized images
3. **Use private storage** for user-uploaded content (avatars)
4. **Use public storage** for static assets (logos, branding)
5. **Implement image caching** on the frontend
6. **Clean up old avatars** when users upload new ones


