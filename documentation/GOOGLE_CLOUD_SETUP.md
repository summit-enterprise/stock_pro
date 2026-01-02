# Google Cloud Storage Setup Guide

## Overview

Complete Google Cloud Storage integration with compression support for uploading assets to GCP buckets.

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud Project** created
3. **Service Account** with Storage Admin role
4. **Storage Bucket** created (or will be created automatically)

---

## Installation

All required packages are already installed:
- ✅ `@google-cloud/storage` - Google Cloud Storage SDK
- ✅ `archiver` - ZIP compression
- ✅ `sharp` - Image compression
- ✅ `multer` - File upload handling

---

## Authentication Setup

### Option 1: Service Account Key File - **RECOMMENDED** ⭐

**Best for:** All environments (local, dev, production). Provides full functionality including signed URLs.

**Service Account**: `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`

#### Setup Steps:

1. **Service account key file is already set up** in `.secrets/gcp-service-account-key.json`

2. **Add to `backend/.env`:**
   ```env
   # GCP Service Account Configuration
   GOOGLE_APPLICATION_CREDENTIALS=./.secrets/gcp-service-account-key.json
   GCP_PROJECT_ID=project-finance-482417
   GCP_STORAGE_BUCKET=stock-app-assets-local
   ```

#### How It Works:

- ✅ Full service account access
- ✅ Signed URL generation works
- ✅ All GCP operations authenticated
- ✅ Secure key file (not in git)

### Option 2: Application Default Credentials (ADC) - Fallback

**Best for:** When service account keys are not available (organization policy blocks keys).

This method uses your user account credentials or service account impersonation.

#### Setup Steps:

1. **Set up Application Default Credentials:**
   ```bash
   gcloud auth application-default login
   ```

2. **Set your project:**
   ```bash
   gcloud config set project project-finance-482417
   ```

#### For Service Account Impersonation (Optional):

If you want to use the service account permissions but with your user account:

```bash
gcloud auth application-default login \
  --impersonate-service-account=stock-pro-svc@project-finance-482417.iam.gserviceaccount.com
```

**Note:** Your user account needs the "Service Account User" role on the service account.

#### Environment Variables:

Add to `backend/.env`:
```env
# Only need project ID and bucket name - no credentials needed!
GCP_PROJECT_ID=project-finance-482417
GCP_STORAGE_BUCKET=stock-app-assets
```

#### How It Works:

- ✅ No service account keys needed
- ✅ Credentials stored securely by gcloud CLI
- ✅ Automatically detected by Google Cloud SDK
- ✅ Works for local, dev, and can be configured for production
- ✅ Tokens are automatically refreshed

#### Production Deployment:

For production environments:

**Option A: Use ADC on Server**
```bash
# On your production server
gcloud auth application-default login
```

**Option B: Use Service Account (if keys become available)**
- Follow Option 2 or 3 below

**Option C: Use GCP Metadata Server (if running on GCP)**
- If deploying to Cloud Run, Compute Engine, etc.
- Credentials are automatically provided by the metadata server
- No setup needed!

---

### Option 2: Service Account Key File (If Keys Are Available)

1. **Create Service Account:**
   ```bash
   # Using gcloud CLI
   gcloud iam service-accounts create stock-app-storage \
     --display-name="Stock App Storage Service Account"
   ```

2. **Grant Storage Admin Role:**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:stock-app-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

3. **Create and Download Key:**
   ```bash
   gcloud iam service-accounts keys create ~/stock-app-key.json \
     --iam-account=stock-app-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Add to `.env`:**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/stock-app-key.json
   GCP_PROJECT_ID=your-project-id
   GCP_STORAGE_BUCKET=stock-app-assets
   ```

### Option 3: Service Account JSON in Environment Variable

1. **Get Service Account JSON** (same as Option 1, step 3)

2. **Add to `.env` as JSON string:**
   ```env
   GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   GCP_PROJECT_ID=your-project-id
   GCP_STORAGE_BUCKET=stock-app-assets
   ```

   **Or as base64 encoded:**
   ```bash
   # Encode the JSON file
   cat ~/stock-app-key.json | base64
   ```
   ```env
   GCP_SERVICE_ACCOUNT_KEY_BASE64=<base64_encoded_json>
   ```

### Option 4: Default Credentials (For GCP Environments - Automatic)

If running on Google Cloud (Cloud Run, Compute Engine, etc.), credentials are automatically detected.

```env
GCP_PROJECT_ID=your-project-id
GCP_STORAGE_BUCKET=stock-app-assets
```

---

## Environment Variables

Add to `backend/.env`:

```env
# Google Cloud Platform Configuration

# For ADC (Application Default Credentials) - RECOMMENDED
# No credentials needed! Just set project and bucket:
GCP_PROJECT_ID=project-finance-482417
GCP_STORAGE_BUCKET=stock-app-assets

# Alternative: Service account key file (if keys are available)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative: Service account JSON as environment variable
# GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**For ADC (Recommended):** You only need `GCP_PROJECT_ID` and `GCP_STORAGE_BUCKET`. No credentials in the `.env` file!

---

## Services Overview

### 1. Google Cloud Service (`services/googleCloudService.js`)

**Core GCP connection service:**
- Initializes Google Cloud Storage client
- Handles authentication (multiple methods)
- Manages bucket operations
- Reusable for other GCP services

**Functions:**
- `initializeGCP()` - Initialize GCP connection
- `getStorageClient()` - Get storage client instance
- `getBucket(bucketName)` - Get bucket reference
- `bucketExists(bucketName)` - Check if bucket exists
- `ensureBucket(bucketName, options)` - Create bucket if needed

### 2. Storage Service (`services/storageService.js`)

**File upload and compression service:**
- Upload files to GCP Storage
- Compress images (JPEG, PNG, WebP)
- Compress files (GZIP, ZIP)
- Upload multiple files as ZIP
- Generate signed URLs
- File management (delete, metadata)

**Functions:**
- `uploadFile(localPath, destination, options)` - Upload single file
- `uploadFileCompressed(localPath, destination, options)` - Upload with compression
- `uploadFilesAsZip(files, destination, options)` - Upload as ZIP archive
- `uploadFromBuffer(buffer, destination, options)` - Upload from buffer
- `compressImage(inputPath, outputPath, options)` - Compress image
- `compressToZip(files, outputPath)` - Create ZIP archive
- `compressGzip(inputPath, outputPath)` - GZIP compression
- `deleteFile(destination, bucket)` - Delete file
- `getFileMetadata(destination, bucket)` - Get file metadata
- `getSignedUrl(destination, options)` - Generate signed URL

---

## API Endpoints

### Upload Single File
**POST** `/api/storage/upload`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `file` - File to upload
- `destination` - Destination path (default: `uploads`)
- `compress` - `true`/`false` (default: `false`)
- `compressType` - `image`/`gzip`/`auto` (default: `auto`)
- `public` - `true`/`false` (default: `false`)
- `maxWidth` - Max image width (optional)
- `maxHeight` - Max image height (optional)

**Response:**
```json
{
  "success": true,
  "bucket": "stock-app-assets",
  "path": "uploads/1234567890_file.jpg",
  "publicUrl": "https://storage.googleapis.com/...",
  "compression": {
    "originalSize": 1024000,
    "compressedSize": 512000,
    "compressionRatio": 50.0
  },
  "originalName": "file.jpg"
}
```

### Upload Multiple Files as ZIP
**POST** `/api/storage/upload-zip`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `files[]` - Array of files
- `destination` - Destination path (default: `uploads`)
- `zipName` - ZIP filename (default: `archive_<timestamp>.zip`)
- `public` - `true`/`false` (default: `false`)

**Response:**
```json
{
  "success": true,
  "bucket": "stock-app-assets",
  "path": "uploads/archive_1234567890.zip",
  "publicUrl": "https://storage.googleapis.com/...",
  "compression": {
    "size": 2048000
  },
  "fileCount": 5
}
```

### Delete File
**DELETE** `/api/storage/:path`

**Query Params:**
- `bucket` - Bucket name (optional, uses default)

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Get File Metadata
**GET** `/api/storage/:path/metadata`

**Query Params:**
- `bucket` - Bucket name (optional)

**Response:**
```json
{
  "success": true,
  "metadata": {
    "name": "uploads/file.jpg",
    "bucket": "stock-app-assets",
    "size": "1024000",
    "contentType": "image/jpeg",
    "timeCreated": "2024-01-01T00:00:00.000Z",
    ...
  }
}
```

### Get Signed URL
**GET** `/api/storage/:path/signed-url`

**Query Params:**
- `bucket` - Bucket name (optional)
- `expires` - Expiration timestamp (optional, default: 1 hour)

**Response:**
```json
{
  "success": true,
  "url": "https://storage.googleapis.com/...?X-Goog-Signature=...",
  "expires": 1234567890000
}
```

---

## Usage Examples

### Backend Service Usage

```javascript
const storageService = require('./services/storageService');

// Upload file with image compression
const result = await storageService.uploadFileCompressed(
  '/path/to/image.jpg',
  'images/compressed-image.jpg',
  {
    compressType: 'image',
    public: true,
    imageOptions: {
      maxWidth: 1920,
      maxHeight: 1080,
    },
  }
);

// Upload multiple files as ZIP
const zipResult = await storageService.uploadFilesAsZip(
  [
    { path: '/path/to/file1.pdf', name: 'document1.pdf' },
    { path: '/path/to/file2.pdf', name: 'document2.pdf' },
  ],
  'archives/documents.zip',
  { public: false }
);

// Upload from buffer
const buffer = Buffer.from('file content');
await storageService.uploadFromBuffer(
  buffer,
  'data/file.txt',
  { contentType: 'text/plain', public: true }
);

// Get signed URL for private file
const { url } = await storageService.getSignedUrl('private/file.pdf', {
  expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
});
```

### Frontend API Usage

```typescript
// Upload file with compression
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('destination', 'user-uploads');
formData.append('compress', 'true');
formData.append('compressType', 'image');
formData.append('public', 'true');
formData.append('maxWidth', '1920');
formData.append('maxHeight', '1080');

const response = await fetch('http://localhost:3001/api/storage/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log('Uploaded:', result.publicUrl);
```

---

## Compression Details

### Image Compression
- **Formats:** JPEG, PNG, WebP
- **JPEG:** Quality 85%, progressive
- **PNG:** Quality 85%, compression level 9
- **WebP:** Quality 85%
- **Resize:** Optional max width/height with aspect ratio preservation

### Archive Compression
- **ZIP:** Level 9 compression
- **GZIP:** Level 9 compression

### Compression Ratios
- **Images:** Typically 30-70% size reduction
- **Text/JSON:** Typically 60-80% size reduction with GZIP
- **ZIP Archives:** Varies by content type

---

## File Structure

```
backend/
├── services/
│   ├── googleCloudService.js    # Core GCP connection
│   └── storageService.js        # Storage operations
├── routes/
│   └── storage.js               # API endpoints
└── temp/                        # Temporary files (gitignored)
    └── uploads/                 # Upload temp directory
```

---

## Security Best Practices

1. ✅ **Service Account Permissions:**
   - Use least privilege principle
   - Only grant `storage.admin` or specific bucket permissions

2. ✅ **Private Files:**
   - Don't set `public: true` for sensitive files
   - Use signed URLs for temporary access

3. ✅ **Authentication:**
   - All endpoints require JWT token (`verifyToken`)
   - Validate file types and sizes

4. ✅ **Cleanup:**
   - Temporary files are automatically cleaned up
   - Monitor storage usage

5. ✅ **Environment Variables:**
   - Never commit service account keys
   - Use secure secret management in production

---

## Troubleshooting

### Authentication Errors

**Error:** `Could not load the default credentials`

**Solution:**
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Verify service account key file exists and is valid
- Ensure `GCP_SERVICE_ACCOUNT_KEY` is valid JSON if using env variable

### Bucket Not Found

**Error:** `Bucket not found`

**Solution:**
- Check bucket name in `GCP_STORAGE_BUCKET`
- Ensure bucket exists or service has permission to create buckets
- Verify project ID is correct

### Permission Denied

**Error:** `Permission denied`

**Solution:**
- Verify service account has `storage.admin` role
- Check bucket IAM permissions
- Ensure project billing is enabled

---

## Next Steps

1. **Set up authentication** (choose one method above)
2. **Configure environment variables** in `backend/.env`
3. **Test upload** using API endpoint or service directly
4. **Monitor usage** in Google Cloud Console
5. **Set up lifecycle policies** for automatic cleanup
6. **Configure CORS** if serving files to web frontend

---

## Additional GCP Services

The `googleCloudService.js` module can be extended for other GCP services:

- **Cloud Functions** - Serverless functions
- **Cloud Pub/Sub** - Messaging
- **Cloud SQL** - Managed databases
- **Cloud BigQuery** - Data analytics
- **Cloud AI/ML** - Machine learning services

Simply import and extend the service as needed!

