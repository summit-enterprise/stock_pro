# Quick Start: Google Cloud Storage with Service Account

## Service Account Setup

The application uses a dedicated service account for all GCP operations:
- **Service Account**: `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`
- **Project ID**: `project-finance-482417`

### Step 1: Configure Environment

Add to `backend/.env`:

```env
# GCP Service Account Configuration
GOOGLE_APPLICATION_CREDENTIALS=./.secrets/gcp-service-account-key.json
GCP_PROJECT_ID=project-finance-482417
GCP_STORAGE_BUCKET=stock-app-assets-local
```

**That's it!** The service account key file provides all necessary authentication.

### Step 2: Test

```bash
cd backend
node -e "
const { initializeGCP } = require('./services/infrastructure/googleCloudService');
initializeGCP()
  .then(() => console.log('✅ GCP initialized successfully with service account!'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

---

## For Different Environments

### Local Development
- ✅ Use service account key file: `GOOGLE_APPLICATION_CREDENTIALS=./.secrets/gcp-service-account-key.json`
- ✅ Service account: `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`

### Dev Server
- ✅ Use service account key file (same as local)
- ✅ Or attach service account to the server/VM

### Production (GCP Services - Cloud Run, GKE, etc.)
- ✅ **Attach service account to your service:**
  - Cloud Run: Service Settings → Service Account → `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`
  - GKE: Use Workload Identity
  - Compute Engine: Attach service account to VM
- ✅ No key file needed - metadata server provides credentials automatically
- ✅ Just set `GCP_PROJECT_ID` and `GCP_STORAGE_BUCKET`

### Production (Non-GCP)
- ✅ Use service account key file (stored securely in secrets manager)
- ✅ Or use Workload Identity Federation

---

## Verify Setup

```bash
# Test GCP initialization
cd backend
node -e "
const { initializeGCP } = require('./services/infrastructure/googleCloudService');
initializeGCP()
  .then(() => console.log('✅ Service account authenticated successfully!'))
  .catch(err => console.error('❌ Error:', err.message));
"

# Test storage access (if gcloud is installed)
gsutil ls gs://stock-app-assets-local/
gsutil ls gs://stock-app-assets
```

---

## Troubleshooting

### "Could not load the default credentials"

**Solution:**
```bash
gcloud auth application-default login
```

### "Permission denied"

**Solution:**
```bash
# Grant yourself Storage Admin role
gcloud projects add-iam-policy-binding project-finance-482417 \
  --member="user:admin@ma-summit-enterprise.com" \
  --role="roles/storage.admin"
```

### "Bucket not found"

**Solution:**
```bash
# Create bucket (if it doesn't exist)
gsutil mb -p project-finance-482417 gs://stock-app-assets

# Or the service will create it automatically on first upload
```

---

## Next Steps

1. ✅ Run authentication commands above
2. ✅ Add environment variables to `.env`
3. ✅ Test with the test command
4. ✅ Start uploading files via API!

