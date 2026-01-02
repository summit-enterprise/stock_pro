# GCP Avatar Loading Fix

## Issue
Avatars are not loading from GCP bucket due to missing service account credentials for signed URL generation.

## Solution Implemented

The code now has a fallback mechanism:
1. **First attempt**: Try to generate signed URL (requires service account credentials)
2. **Fallback**: If signed URL fails, try direct file download (works with ADC)

## Setup Options

### Option 1: Use Service Account Key File (Recommended for Signed URLs)

1. **Create or download service account key:**
   ```bash
   # If you have a service account, download the key
   gcloud iam service-accounts keys create ~/gcp-key.json \
     --iam-account=YOUR_SERVICE_ACCOUNT@project-finance-482417.iam.gserviceaccount.com
   ```

2. **Update `.env`:**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-key.json
   GCP_PROJECT_ID=project-finance-482417
   ```

### Option 2: Use Application Default Credentials (ADC)

For direct file download (fallback method), ADC works:

```bash
# Set up ADC
gcloud auth application-default login

# Set project
gcloud config set project project-finance-482417
```

Then in `.env`:
```env
GCP_PROJECT_ID=project-finance-482417
# Leave GOOGLE_APPLICATION_CREDENTIALS empty or unset
```

**Note**: ADC works for direct file downloads but may not work for signed URLs. The code will automatically fall back to direct download if signed URL generation fails.

### Option 3: Make Avatar Folder Public (Quick Fix, Less Secure)

If you want to avoid signed URLs entirely:

1. Make the `avatars/` folder in your bucket publicly readable
2. Update the code to use public URLs instead of signed URLs

## Current Status

- ✅ Code updated with fallback mechanism
- ✅ Better error messages
- ⚠️  Need to set up proper GCP credentials

## Testing

After setting up credentials, test with:
```bash
# Test avatar loading
curl http://localhost:3001/api/image/gcp/avatars/1.webp
```

If you see the image data, it's working!

