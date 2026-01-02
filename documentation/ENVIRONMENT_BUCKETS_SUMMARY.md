# Environment-Specific Buckets - Setup Complete ✅

## Summary

Separate GCP Storage buckets have been created and configured for local, dev, and prod environments.

## ✅ Completed Setup

### 1. **Bucket Configuration Utility**
- ✅ Created `utils/bucketConfig.js`
- ✅ Automatic bucket selection based on `NODE_ENV`
- ✅ Manual override via `GCP_STORAGE_BUCKET` env var

### 2. **Buckets Created**
- ✅ **Local**: `stock-app-assets` (existing, verified)
- ✅ **Dev**: `stock-app-assets-dev` (newly created)
- ✅ **Prod**: `stock-app-assets-prod` (newly created)

### 3. **Services Updated**
All services now use environment-specific buckets:
- ✅ `storageService.js` - Uses `getBucketName()`
- ✅ `imageService.js` - Uses `getBucketName()`
- ✅ `logoService.js` - Uses `getBucketName()`

### 4. **Scripts Updated**
All scripts now use environment-specific buckets:
- ✅ `migrateAvatarsToGCP.js`
- ✅ `migrateOAuthAvatarsToGCP.js`
- ✅ `migrateLogosToGCP.js`
- ✅ `reformatAvatars.js`
- ✅ `uploadAssetsToGCP.js`
- ✅ `setupAssetBucket.js`
- ✅ `ensureBucketPrivate.js`

### 5. **Bucket Setup Script**
- ✅ `setupEnvironmentBuckets.js` - Creates and configures all buckets

## 📊 Bucket Configuration

| Environment | Bucket Name | Status |
|------------|-------------|--------|
| Local | `stock-app-assets` | ✅ Configured |
| Dev | `stock-app-assets-dev` | ✅ Created |
| Prod | `stock-app-assets-prod` | ✅ Created |

## 🔄 How It Works

### Automatic Bucket Selection

```javascript
// Based on NODE_ENV
NODE_ENV=local → stock-app-assets
NODE_ENV=dev → stock-app-assets-dev
NODE_ENV=prod → stock-app-assets-prod
```

### Manual Override

```bash
# Override in .env
GCP_STORAGE_BUCKET=custom-bucket-name
```

## 📁 Folder Structure

All buckets have the same structure:

```
{bucket-name}/
├── avatars/          ✅
├── logos/            ✅
├── backgrounds/      ✅
├── branding/         ✅
├── marketing/        ✅
├── icons/            ✅
└── images/           ✅
```

## 🔒 Security

All buckets are configured with:
- ✅ Private access (no public IAM bindings)
- ✅ Uniform bucket-level access enabled
- ✅ Signed URLs for file access
- ✅ Identical security settings

## 🚀 Usage

### Check Current Bucket

```bash
cd backend
node -e "const {getBucketName, getCurrentEnvironment} = require('./utils/bucketConfig'); console.log('Environment:', getCurrentEnvironment()); console.log('Bucket:', getBucketName());"
```

### Setup All Buckets

```bash
cd backend
node scripts/setupEnvironmentBuckets.js
```

### Verify Buckets

```bash
gsutil ls | grep stock-app-assets
```

## 📝 Environment Variables

### Local
```bash
NODE_ENV=local  # or leave unset
```

### Dev
```bash
NODE_ENV=dev
# or NODE_ENV=development
```

### Prod
```bash
NODE_ENV=prod
# or NODE_ENV=production
```

## ✅ Verification

All services and scripts now automatically use the correct bucket for their environment. No code changes needed when deploying to different environments - just set `NODE_ENV` appropriately.


