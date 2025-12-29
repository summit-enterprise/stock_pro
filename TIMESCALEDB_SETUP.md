# TimescaleDB Setup Guide - Ultra-Cheap Time-Series Storage

## Quick Start (5 minutes)

### Step 1: Update Docker Compose

Replace your PostgreSQL service with TimescaleDB:

```yaml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: stockdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Step 2: Run Migration Script

After starting the database, run this SQL script:

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert asset_data to hypertable (automatic partitioning)
SELECT create_hypertable(
  'asset_data', 
  'date',
  chunk_time_interval => INTERVAL '30 days',
  if_not_exists => TRUE
);

-- Enable compression (90%+ storage reduction!)
ALTER TABLE asset_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol',
  timescaledb.compress_orderby = 'date'
);

-- Compress data older than 7 days automatically
SELECT add_compression_policy('asset_data', INTERVAL '7 days');

-- Optional: Add retention policy (auto-delete data older than 5 years)
-- SELECT add_retention_policy('asset_data', INTERVAL '5 years');
```

### Step 3: Verify Setup

```sql
-- Check hypertable status
SELECT * FROM timescaledb_information.hypertables;

-- Check compression status
SELECT * FROM timescaledb_information.compressed_hypertable_stats;

-- Check chunk information
SELECT * FROM timescaledb_information.chunks;
```

## Storage Savings

### Before (Regular PostgreSQL):
- 1,000 assets × 5 years = ~73 MB
- Indexes = ~20 MB
- **Total: ~93 MB**

### After (TimescaleDB):
- Compressed data = ~7-10 MB (90% reduction!)
- Indexes = ~5 MB
- **Total: ~12-15 MB**

**Savings: ~85% storage reduction!**

## Performance Improvements

### Query Speed:
- **Regular PostgreSQL**: 50-200ms for 5-year range
- **TimescaleDB**: 5-20ms for 5-year range
- **10-100x faster!**

### Example Queries:

```sql
-- Get 5 years of data (super fast!)
SELECT date, open, high, low, close, volume
FROM asset_data
WHERE symbol = 'AAPL'
  AND date >= NOW() - INTERVAL '5 years'
ORDER BY date ASC;

-- Get last 30 days (instant with compression)
SELECT date, close
FROM asset_data
WHERE symbol = 'AAPL'
  AND date >= NOW() - INTERVAL '30 days'
ORDER BY date DESC;
```

## Advanced Features

### 1. Continuous Aggregates (Pre-computed Views)

For even faster queries, create materialized views:

```sql
-- Hourly aggregates from daily data
CREATE MATERIALIZED VIEW asset_data_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', date) AS hour,
  symbol,
  first(open, date) AS open,
  max(high) AS high,
  min(low) AS low,
  last(close, date) AS close,
  sum(volume) AS volume
FROM asset_data
GROUP BY hour, symbol;

-- Auto-refresh every hour
SELECT add_continuous_aggregate_policy(
  'asset_data_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

### 2. Data Retention (Auto-cleanup)

```sql
-- Keep only last 5 years, delete older data
SELECT add_retention_policy('asset_data', INTERVAL '5 years');
```

### 3. Compression Policies

```sql
-- Compress data older than 7 days
SELECT add_compression_policy('asset_data', INTERVAL '7 days');

-- Check compression ratio
SELECT 
  pg_size_pretty(before_compression_total_bytes) AS before,
  pg_size_pretty(after_compression_total_bytes) AS after,
  ROUND(100.0 * (1 - after_compression_total_bytes::numeric / before_compression_total_bytes), 2) AS compression_ratio
FROM timescaledb_information.job_stats
WHERE hypertable_name = 'asset_data';
```

## Migration from Existing PostgreSQL

If you already have data in PostgreSQL:

1. **Backup your data**:
```bash
pg_dump -U user -d stockdb -t asset_data > asset_data_backup.sql
```

2. **Update docker-compose.yml** to use TimescaleDB image

3. **Restore data**:
```bash
psql -U user -d stockdb < asset_data_backup.sql
```

4. **Run migration script** (convert to hypertable)

5. **Enable compression** (will compress existing data)

## Cost Analysis

### Storage Costs:
- **TimescaleDB**: FREE (open source)
- **Storage**: ~10-15 MB for 1,000 assets (5 years)
- **Cloud hosting**: $0-5/month for small databases
- **Total: Essentially FREE!**

### Comparison:
| Solution | Cost/Month | Storage | Speed |
|----------|-----------|---------|-------|
| TimescaleDB | $0 | 10-15 MB | ⚡⚡⚡ Very Fast |
| Regular PostgreSQL | $0 | 93 MB | ⚡ Moderate |
| AWS RDS | $15-50 | 93 MB | ⚡⚡ Fast |
| S3 Glacier | $0.004/GB | 73 MB | 🐌 Slow |

## Monitoring

### Check Storage Usage:
```sql
-- Total table size
SELECT 
  pg_size_pretty(pg_total_relation_size('asset_data')) AS total_size,
  pg_size_pretty(pg_relation_size('asset_data')) AS table_size,
  pg_size_pretty(pg_indexes_size('asset_data')) AS indexes_size;

-- Compression stats
SELECT 
  hypertable_name,
  pg_size_pretty(before_compression_total_bytes) AS before,
  pg_size_pretty(after_compression_total_bytes) AS after,
  ROUND(100.0 * (1 - after_compression_total_bytes::numeric / before_compression_total_bytes), 2) AS compression_pct
FROM timescaledb_information.compressed_hypertable_stats;
```

### Check Query Performance:
```sql
-- Enable query timing
\timing

-- Test query
SELECT COUNT(*) FROM asset_data WHERE symbol = 'AAPL';
```

## Troubleshooting

### Issue: "Extension timescaledb does not exist"
**Solution**: Make sure you're using the TimescaleDB Docker image, not regular PostgreSQL.

### Issue: "Cannot create hypertable on non-empty table"
**Solution**: The table must be empty or you need to use `migrate_data => true`:
```sql
SELECT create_hypertable('asset_data', 'date', migrate_data => true);
```

### Issue: Compression not working
**Solution**: Check if compression is enabled:
```sql
SELECT * FROM timescaledb_information.compressed_hypertable_stats;
```

## Best Practices

1. **Use daily data** for 5-year charts (sufficient resolution)
2. **Compress data older than 7 days** (balance between speed and storage)
3. **Keep indexes on (symbol, date)** for fast lookups
4. **Use continuous aggregates** for common time ranges (hourly, weekly)
5. **Set retention policies** to auto-delete very old data

## Next Steps

1. Update `docker-compose.yml` to use TimescaleDB
2. Run the migration script
3. Test queries with your existing data
4. Monitor compression ratios
5. Set up continuous aggregates if needed

**Total setup time: ~10 minutes**
**Storage savings: 85%+**
**Query speed: 10-100x faster**
**Cost: FREE!**

