# Logo Migration to GCP

## Overview

All asset logos (6794 total) are being migrated from external URLs to GCP Storage for:
- **Fast loading** - Served from GCP with proper caching
- **Consistency** - All assets use the same storage system
- **Reliability** - No dependency on external APIs

## Migration Process

### Current Status
- **Total logos**: 6794
- **In GCP**: 0
- **External URLs**: 6794

### Migration Script

Run the migration script:
```bash
cd backend
node scripts/migrateLogosToGCP.js
```

**Note**: This will take several hours to complete (processing 6794 logos with rate limiting).

### What the Script Does

1. **Downloads** logos from external URLs
2. **Optimizes** images:
   - Resizes to 256x256px (max)
   - Converts to WebP format (80% quality)
   - Preserves SVG format (no conversion)
3. **Uploads** to GCP: `logos/{SYMBOL}.webp`
4. **Updates** database with GCP URLs: `http://localhost:3001/api/image/gcp/logos/{SYMBOL}.webp`
5. **Caches** with 1-year expiry for fast loading

### Performance

- **Batch processing**: 100 logos per batch
- **Concurrency**: 5 logos at a time
- **Estimated time**: ~2-4 hours for 6794 logos

## Logo Storage Format

### File Naming
- **Format**: `{SYMBOL}.webp` (e.g., `AAPL.webp`, `BTC.webp`)
- **Location**: `gs://stock-app-assets/logos/`
- **Access**: Private (served via signed URLs)

### URL Format
- **Backend URL**: `http://localhost:3001/api/image/gcp/logos/{SYMBOL}.webp`
- **Frontend**: Uses Next.js Image component with `/api/image/gcp/[...path]` route

## Caching for Fast Loading

All logos are served with:
- **Cache-Control**: `public, max-age=31536000, immutable` (1 year)
- **CDN**: GCP Storage with global edge caching
- **Optimization**: WebP format for smaller file sizes

## Monitoring Progress

The script outputs progress every 10 logos:
```
✅ Migrated 10/6794 logos...
✅ Migrated 20/6794 logos...
```

## After Migration

Once complete:
1. All logos will be in GCP
2. All database URLs will point to GCP
3. Logos will load faster with proper caching
4. New logos will automatically upload to GCP

## Troubleshooting

### If migration fails partway:
- The script is idempotent - you can re-run it
- It skips logos already in GCP
- Only processes external URLs

### If some logos fail:
- Check logs for specific symbols
- Failed logos keep their original URLs
- Can be manually migrated later


