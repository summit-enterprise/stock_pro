# Asset Storage Setup - Summary

## ✅ What Was Set Up

### 1. GCP Bucket Structure
- **Bucket Name**: `stock-app-assets` (configurable via `GCP_STORAGE_BUCKET`)
- **Folder Structure**:
  - `avatars/` - User profile pictures
  - `logos/` - Company/asset logos
  - `backgrounds/` - Background images
  - `branding/` - Branding assets (STELLARALPHA.AI, etc.)
  - `marketing/` - Marketing materials
  - `icons/` - Icon assets
  - `images/` - General images

### 2. Image Service Updates
- **File**: `backend/services/general/imageService.js`
- **Changes**:
  - Always uses GCP Storage (no mock mode)
  - Works for local, dev, and prod environments
  - Added `ensureAssetBucket()` to auto-create bucket
  - Added `uploadImageAsset()` for general image uploads
  - Exports `ASSET_FOLDERS` constant

### 3. Migration Scripts
- **`backend/scripts/migrateAvatarsToGCP.js`**:
  - Migrates existing avatars from `temp/avatars_stored/` to GCP
  - Updates user `avatar_url` in database
  - Handles authentication errors gracefully

- **`backend/scripts/setupAssetBucket.js`**:
  - Creates the GCP bucket if it doesn't exist
  - Initializes folder structure
  - Can be run independently

### 4. Service Loader Update
- **File**: `backend/services/index.js`
- **Change**: Image service always uses GCP (bypasses mock mode)

## 📋 Next Steps

### 1. Authenticate with GCP

**For Local Development:**
```bash
gcloud auth application-default login
gcloud config set project your-project-id
```

**For Production/Dev:**
- Create a service account in Google Cloud Console
- Download the JSON key file
- Set `GOOGLE_APPLICATION_CREDENTIALS` or `GCP_SERVICE_ACCOUNT_KEY` in `.env`

### 2. Set Up Bucket

```bash
cd backend
node scripts/setupAssetBucket.js
```

This will:
- Create the `stock-app-assets` bucket (if it doesn't exist)
- Initialize all folder structures

### 3. Migrate Existing Avatars

```bash
cd backend
node scripts/migrateAvatarsToGCP.js
```

This will:
- Find all avatars in `temp/avatars_stored/`
- Upload them to GCP `avatars/` folder
- Update user `avatar_url` in database to point to GCP URLs

### 4. Environment Variables

Add to `backend/.env`:

```bash
# GCP Storage Configuration
GCP_STORAGE_BUCKET=stock-app-assets
GCP_PROJECT_ID=your-project-id

# GCP Authentication (choose one)
# Option 1: Service account key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: Service account JSON in env var
# GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Option 3: Application Default Credentials (run: gcloud auth application-default login)
# No env var needed
```

## 🔄 How It Works

### Avatar Upload Flow

1. **User uploads avatar** → Frontend sends to `/api/user/avatar`
2. **Backend processes** → `imageService.processAndUploadAvatar()`
3. **Image processing**:
   - Resize to 400x400px
   - Convert to WebP format
   - Compress with 85% quality
4. **Upload to GCP** → `avatars/{userId}_{timestamp}.webp`
5. **Store URL in DB** → `http://localhost:3001/api/image/gcp/avatars/{userId}_{timestamp}.webp`
6. **Frontend displays** → Next.js Image component proxies through `/api/image/gcp/[...path]`
7. **Backend serves** → Generates signed URL and returns image

### General Image Upload Flow

1. **Upload image** → `imageService.uploadImageAsset(filePath, folder, filename, options)`
2. **Process & upload** → Same as avatar flow
3. **Return URL** → Private (signed URL) or public (direct GCP URL)

## 📁 Directory Structure

```
stock-pro/
├── backend/
│   ├── services/
│   │   ├── general/
│   │   │   └── imageService.js      # Updated: Always uses GCP
│   │   └── infrastructure/
│   │       ├── storageService.js    # GCP upload utilities
│   │       └── googleCloudService.js # GCP client initialization
│   ├── scripts/
│   │   ├── migrateAvatarsToGCP.js   # NEW: Migrate existing avatars
│   │   └── setupAssetBucket.js      # NEW: Initialize bucket
│   └── temp/
│       └── avatars_stored/          # OLD: Local storage (to be migrated)
└── documentation/
    ├── ASSET_STORAGE_SETUP.md       # NEW: Detailed setup guide
    └── ASSET_STORAGE_SUMMARY.md     # NEW: This file
```

## 🎯 Benefits

1. **Consistent across environments** - Same behavior in local, dev, and prod
2. **Scalable** - No local file storage limitations
3. **Secure** - Private files served via signed URLs
4. **Cost-effective** - GCP Storage is very affordable (~$0.01/month for typical usage)
5. **Organized** - Clear folder structure for different asset types
6. **Optimized** - Automatic compression and WebP conversion

## ⚠️ Important Notes

1. **All avatars now go to GCP** - No more local storage fallback
2. **Authentication required** - Must have valid GCP credentials
3. **Bucket auto-creation** - Bucket is created automatically on first use
4. **Signed URLs** - Private images expire after 1 hour (configurable)
5. **Migration is one-time** - Run migration script once to move existing avatars

## 🔍 Troubleshooting

See `ASSET_STORAGE_SETUP.md` for detailed troubleshooting guide.

Common issues:
- **"invalid_grant" error** → Re-authenticate: `gcloud auth application-default login`
- **Bucket not found** → Run `setupAssetBucket.js` first
- **Images not loading** → Check signed URL generation in backend logs


