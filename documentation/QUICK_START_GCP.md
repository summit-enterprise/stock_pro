# Quick Start: Google Cloud Storage with ADC

## For Your Setup (admin@ma-summit-enterprise.com)

### Step 1: Install Google Cloud SDK

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Authenticate

```bash
# Login with your admin account
gcloud auth login admin@ma-summit-enterprise.com

# Set up Application Default Credentials
gcloud auth application-default login

# Set your project
gcloud config set project project-finance-482417
```

### Step 3: Grant Permissions (if needed)

```bash
# Grant Storage Admin role to your user account
gcloud projects add-iam-policy-binding project-finance-482417 \
  --member="user:admin@ma-summit-enterprise.com" \
  --role="roles/storage.admin"
```

### Step 4: Configure Environment

Add to `backend/.env`:

```env
GCP_PROJECT_ID=project-finance-482417
GCP_STORAGE_BUCKET=stock-app-assets
```

**That's it!** No service account keys needed.

### Step 5: Test

```bash
cd backend
node -e "
const { initializeGCP } = require('./services/googleCloudService');
initializeGCP()
  .then(() => console.log('✅ GCP initialized successfully!'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

---

## For Different Environments

### Local Development
- Use ADC: `gcloud auth application-default login`
- Credentials stored in `~/.config/gcloud/application_default_credentials.json`

### Dev Server
- Use ADC: Run `gcloud auth application-default login` on the server
- Or use service account impersonation (if available)

### Production (GCP Services)
- **Cloud Run / Compute Engine / App Engine:**
  - Credentials automatically provided by metadata server
  - No setup needed!
  - Just set `GCP_PROJECT_ID` and `GCP_STORAGE_BUCKET`

### Production (Non-GCP)
- Use ADC: `gcloud auth application-default login` on server
- Or set up Workload Identity Federation (future)

---

## Verify Setup

```bash
# Check current account
gcloud auth list

# Check ADC credentials
gcloud auth application-default print-access-token

# Test storage access
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

