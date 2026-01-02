# GCP Billing Setup and Logo Storage Strategy

## Enabling GCP Billing

To enable billing for your Google Cloud Project and use GCP Storage for logo files:

### Step 1: Enable Billing Account

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Navigate to Billing**:
   - Click the hamburger menu (☰) → **Billing**
   - Or go directly to: https://console.cloud.google.com/billing

3. **Link a Billing Account**:
   - If you don't have a billing account, click **"Create Account"**
   - Enter your payment information (credit card)
   - Complete the billing account setup

4. **Link to Your Project**:
   - Select your project: `project-finance-482417`
   - Click **"Link a billing account"**
   - Select your billing account
   - Click **"Set account"**

### Step 2: Enable Required APIs

Enable the Cloud Storage API:

```bash
gcloud services enable storage-component.googleapis.com --project=project-finance-482417
```

Or via Console:
- Go to **APIs & Services** → **Library**
- Search for "Cloud Storage API"
- Click **Enable**

### Step 3: Create Storage Bucket

Once billing is enabled, create a bucket:

```bash
gsutil mb -p project-finance-482417 -c STANDARD -l us-central1 gs://stock-app-assets
```

Or via Console:
- Go to **Cloud Storage** → **Buckets**
- Click **"Create Bucket"**
- Name: `stock-app-assets`
- Location: `us-central1` (or your preferred region)
- Storage class: `Standard`
- Click **"Create"**

### Step 4: Set Bucket Permissions

Make the bucket publicly readable for logos:

```bash
gsutil iam ch allUsers:objectViewer gs://stock-app-assets
```

Or via Console:
- Select the bucket → **Permissions** tab
- Click **"Add Principal"**
- Principal: `allUsers`
- Role: `Storage Object Viewer`
- Click **"Save"**

## Logo Storage: Database vs Google Cloud Storage

### Comparison

| Factor | Database (PostgreSQL) | Google Cloud Storage |
|--------|----------------------|---------------------|
| **Storage Cost** | Higher (database storage is expensive) | Lower (object storage is cheap) |
| **Scalability** | Limited by database size | Highly scalable (unlimited) |
| **Performance** | Fast for small files, slower queries | Optimized for static assets |
| **Backup/Recovery** | Part of database backup | Separate backup strategy |
| **CDN Integration** | Not possible | Easy (Cloud CDN) |
| **Compression** | Limited | Excellent (can compress before upload) |
| **Bandwidth** | Uses database bandwidth | Separate, cheaper bandwidth |
| **File Size Limits** | Limited by TEXT field | Up to 5TB per object |
| **Caching** | Database-level caching | Browser/CDN caching |
| **Maintenance** | Database maintenance overhead | Minimal maintenance |

### Recommendation: **Google Cloud Storage (GCS)**

**Why GCS is Better:**

1. **Cost Efficiency**:
   - GCS Standard storage: ~$0.020 per GB/month
   - Database storage: More expensive, especially for binary data
   - For 1000 logos at ~50KB each = 50MB = ~$0.001/month vs database overhead

2. **Performance**:
   - GCS serves static assets directly via CDN
   - Database queries are slower for binary data
   - Browser caching works better with static URLs

3. **Scalability**:
   - Can store millions of logos without impacting database
   - Database stays lean and fast
   - Easy to add more storage

4. **Best Practices**:
   - Separation of concerns: data in DB, assets in storage
   - Industry standard approach
   - Better for production systems

### Current Implementation

The logo service currently:
- **Fetches logos** from APIs (Financial Modeling Prep, CoinGecko, etc.)
- **Stores URLs in database** (`asset_info.logo_url`)
- **Attempts GCP upload** (compressed to WebP, 256x256px)
- **Falls back to original URL** if GCP upload fails (billing disabled)

### Recommended Approach

Once GCP billing is enabled:

1. **Download logos** from APIs
2. **Compress to WebP** (256x256px, 80% quality)
3. **Upload to GCS** bucket: `gs://stock-app-assets/logos/{SYMBOL}.webp`
4. **Store GCS URL in database**: `https://storage.googleapis.com/stock-app-assets/logos/{SYMBOL}.webp`
5. **Make bucket publicly readable** for direct image access

### Cost Estimate

For 1000 logos:
- **Storage**: 50MB × $0.020/GB = **$0.001/month**
- **Bandwidth**: ~10GB/month × $0.12/GB = **$1.20/month**
- **Total**: **~$1.20/month** (very affordable)

### Migration Path

1. Enable GCP billing (follow steps above)
2. Run logo fetch script: `ONLY_REAL_ASSETS=true node scripts/fetchAllLogos.js`
3. Script will automatically:
   - Download logos
   - Compress to WebP
   - Upload to GCS
   - Update database with GCS URLs

### Benefits of Current Fallback

The current implementation stores original API URLs when GCP fails, which:
- ✅ Allows logos to work immediately
- ✅ No dependency on GCP billing
- ✅ Can migrate to GCS later
- ⚠️ Depends on external API availability
- ⚠️ No compression/optimization

## Summary

**For Production**: Use GCS for logo storage
- Lower cost
- Better performance
- Industry standard
- Scalable

**For Development**: Current fallback (API URLs) works fine
- No billing required
- Quick setup
- Can migrate later


