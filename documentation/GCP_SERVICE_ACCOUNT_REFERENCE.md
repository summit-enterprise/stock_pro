# GCP Service Account Reference

## Service Account Details

- **Service Account Email**: `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`
- **Project ID**: `project-finance-482417`
- **Key File Location**: `backend/.secrets/gcp-service-account-key.json`

## All GCP Operations Use This Service Account

All GCP operations in this application use the service account:
- ✅ Google Cloud Storage (file uploads/downloads)
- ✅ Signed URL generation
- ✅ Bucket management
- ✅ Asset storage (avatars, logos, etc.)

## Configuration

### Local/Dev Environment

Set in `backend/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=./.secrets/gcp-service-account-key.json
GCP_PROJECT_ID=project-finance-482417
GCP_STORAGE_BUCKET=stock-app-assets-local
```

### Production (GCP Services)

Attach the service account to your service:
- **Cloud Run**: Service Settings → Service Account → `stock-pro-svc@project-finance-482417.iam.gserviceaccount.com`
- **GKE**: Use Workload Identity
- **Compute Engine**: Attach service account to VM

No key file needed in production - metadata server provides credentials automatically.

## No User Account References

All GCP authentication now uses the service account. No user account credentials are needed for GCP operations.

