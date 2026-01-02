# Environment-Specific GCP Buckets

## Overview

Separate GCP Storage buckets are configured for each environment (local, dev, prod) to ensure data isolation and proper environment management.

## Bucket Names

| Environment | Bucket Name |
|------------|-------------|
| **Local** | `stock-app-assets` |
| **Dev** | `stock-app-assets-dev` |
| **Prod** | `stock-app-assets-prod` |

## Configuration

### Automatic Bucket Selection

The system automatically selects the correct bucket based on `NODE_ENV`:

- `NODE_ENV=local` or unset → `stock-app-assets`
- `NODE_ENV=dev` or `development` → `stock-app-assets-dev`
- `NODE_ENV=prod` or `production` → `stock-app-assets-prod`

### Manual Override

You can override the bucket name by setting `GCP_STORAGE_BUCKET` in your `.env`:

```bash
# Override bucket name
GCP_STORAGE_BUCKET=my-custom-bucket
```

## Setup

### Initial Setup

Run the setup script to create all buckets:

```bash
cd backend
node scripts/setupEnvironmentBuckets.js
```

This will:
- Create all three buckets (if they don't exist)
- Initialize folder structure in each bucket
- Ensure buckets are private (no public access)
- Configure uniform bucket-level access

### Bucket Structure

Each bucket has the same folder structure:

```
{bucket-name}/
├── avatars/          # User profile pictures
├── logos/            # Company/asset logos
├── backgrounds/      # Background images
├── branding/         # Branding assets
├── marketing/        # Marketing materials
├── icons/            # Icon assets
└── images/           # General images
```

## Environment Variables

### Local Development

```bash
# .env (local)
NODE_ENV=local
# or leave unset (defaults to local)

GCP_PROJECT_ID=project-finance-482417
# GCP_STORAGE_BUCKET is optional - defaults to stock-app-assets
```

### Development

```bash
# .env (dev)
NODE_ENV=dev
# or NODE_ENV=development

GCP_PROJECT_ID=project-finance-482417
# GCP_STORAGE_BUCKET is optional - defaults to stock-app-assets-dev
```

### Production

```bash
# .env (prod)
NODE_ENV=prod
# or NODE_ENV=production

GCP_PROJECT_ID=project-finance-482417
# GCP_STORAGE_BUCKET is optional - defaults to stock-app-assets-prod
```

## Code Usage

### Services

All services automatically use the correct bucket:

```javascript
const { getBucketName } = require('../utils/bucketConfig');

// Automatically gets the right bucket for current environment
const bucketName = getBucketName();
```

### Scripts

All scripts use the bucket configuration:

```javascript
const { getBucketName } = require('../utils/bucketConfig');
const BUCKET_NAME = getBucketName();
```

## Verification

### Check Current Bucket

```bash
cd backend
node -e "const {getBucketName, getCurrentEnvironment} = require('./utils/bucketConfig'); console.log('Environment:', getCurrentEnvironment()); console.log('Bucket:', getBucketName());"
```

### List All Buckets

```bash
gsutil ls | grep stock-app-assets
```

### Verify Bucket Contents

```bash
# Local
gsutil ls gs://stock-app-assets/

# Dev
gsutil ls gs://stock-app-assets-dev/

# Prod
gsutil ls gs://stock-app-assets-prod/
```

## Migration Between Environments

### Copying Assets

To copy assets between environments:

```bash
# Copy from local to dev
gsutil -m cp -r gs://stock-app-assets/* gs://stock-app-assets-dev/

# Copy from dev to prod (after testing)
gsutil -m cp -r gs://stock-app-assets-dev/* gs://stock-app-assets-prod/
```

**⚠️ Warning**: Only copy assets, not user data (avatars). User data should be environment-specific.

## Security

All buckets are configured with:
- ✅ **Private access** - No public IAM bindings
- ✅ **Uniform bucket-level access** - Consistent security model
- ✅ **Signed URLs** - All files served via authenticated routes
- ✅ **Same configuration** - Identical security settings across environments

## Best Practices

1. **Never mix environments** - Each environment has its own bucket
2. **Test in dev first** - Always test changes in dev before prod
3. **Backup before migration** - Always backup before copying between environments
4. **Monitor usage** - Track storage and bandwidth per environment
5. **Use environment variables** - Never hardcode bucket names

## Troubleshooting

### Wrong Bucket Being Used

Check your `NODE_ENV`:
```bash
echo $NODE_ENV
```

Or check in code:
```bash
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
```

### Bucket Not Found

Ensure the bucket exists:
```bash
node scripts/setupEnvironmentBuckets.js
```

### Permission Errors

Ensure GCP authentication is set up:
```bash
gcloud auth application-default login
```

## Related Documentation

- `ASSET_STORAGE_SETUP.md` - Detailed storage setup
- `GCP_ASSETS_COMPLETE.md` - Complete asset storage status
- `bucketConfig.js` - Bucket configuration utility


