# Cost-Effective Storage Strategy for Historical Pricing Data

## Data Volume Analysis

### Storage Requirements per Asset:
- **1 hour**: ~4-12 data points (1min, 5min, 15min intervals)
- **1 day**: ~24-96 data points (hourly, 15min intervals)
- **1 week**: ~168-672 data points
- **1 month**: ~720-2,880 data points
- **1 year**: ~8,760-35,040 data points (hourly) or ~252 trading days (daily)
- **5 years**: ~43,800-175,200 data points (hourly) or ~1,260 trading days (daily)

### Per Data Point Size:
- Symbol: ~10 bytes
- Date: 8 bytes
- OHLC: 32 bytes (4 × 8 bytes)
- Volume: 8 bytes
- **Total: ~58 bytes per record**

### Total Storage Estimates:
- **Daily data (5 years)**: 1,260 days × 58 bytes = ~73 KB per asset
- **Hourly data (5 years)**: ~43,800 hours × 58 bytes = ~2.5 MB per asset
- **1-minute data (5 years)**: ~2.6M points × 58 bytes = ~150 MB per asset

**For 1,000 assets with daily data: ~73 MB total (very manageable!)**

## Recommended Solutions (Ranked by Cost-Effectiveness)

### 🏆 **Option 1: PostgreSQL with TimescaleDB Extension** (RECOMMENDED)

**Why it's best:**
- ✅ **Free** (open source)
- ✅ **90%+ compression** for time-series data
- ✅ **Fast queries** with automatic indexing
- ✅ **Built on PostgreSQL** (you're already using it)
- ✅ **Hypertables** for automatic partitioning
- ✅ **Continuous aggregates** for pre-computed views

**Storage Cost:**
- With compression: ~7-10 KB per asset (5 years daily)
- 1,000 assets: ~7-10 MB (essentially free)
- 10,000 assets: ~70-100 MB (still very cheap)

**Setup:**
```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert asset_data to hypertable
SELECT create_hypertable('asset_data', 'date', 
  chunk_time_interval => INTERVAL '30 days',
  if_not_exists => TRUE
);

-- Enable compression
ALTER TABLE asset_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol',
  timescaledb.compress_orderby = 'date'
);

-- Compress data older than 7 days
SELECT add_compression_policy('asset_data', INTERVAL '7 days');
```

**Query Performance:**
- 10-100x faster than regular PostgreSQL for time-series queries
- Automatic indexing on time and symbol
- Parallel query execution

---

### 🥈 **Option 2: PostgreSQL with Optimized Schema** (Current + Improvements)

**Improvements to current setup:**
- ✅ **Partitioning by date** (monthly/quarterly partitions)
- ✅ **Compression** (PostgreSQL native compression)
- ✅ **Proper indexing** (composite indexes)
- ✅ **Materialized views** for common queries

**Storage Cost:**
- Similar to TimescaleDB but requires manual optimization
- ~10-15 KB per asset (5 years daily)
- 1,000 assets: ~10-15 MB

**Optimizations:**
```sql
-- Partition by month
CREATE TABLE asset_data (
  id SERIAL,
  symbol VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(18, 8),
  high NUMERIC(18, 8),
  low NUMERIC(18, 8),
  close NUMERIC(18, 8),
  volume BIGINT,
  PRIMARY KEY (symbol, date)
) PARTITION BY RANGE (date);

-- Create monthly partitions
CREATE TABLE asset_data_2024_01 PARTITION OF asset_data
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes
CREATE INDEX idx_asset_data_symbol_date ON asset_data (symbol, date DESC);
CREATE INDEX idx_asset_data_date ON asset_data (date DESC);
```

---

### 🥉 **Option 3: Hybrid Approach (Recent + Archive)**

**Strategy:**
- **Recent data (last 30-90 days)**: PostgreSQL (fast access)
- **Older data (1-5 years)**: Compressed files (S3/File system)

**Storage Cost:**
- Recent: ~2-6 KB per asset in PostgreSQL
- Archive: ~60-70 KB per asset in compressed files
- **Total: Very cheap, fast for recent data**

**Implementation:**
```javascript
// Store recent data in DB
// Archive older data to compressed JSON/Parquet files
// Load from archive when needed for long-term charts
```

---

### 💰 **Option 4: Cloud Storage (S3/Backblaze B2)**

**For archival only:**
- **Backblaze B2**: $5/TB/month (~$0.005/GB)
- **AWS S3 Standard**: $0.023/GB/month
- **AWS S3 Glacier**: $0.004/GB/month (slow retrieval)

**Cost Example:**
- 1,000 assets × 73 KB = 73 MB = $0.0004/month (B2)
- **Extremely cheap but slower access**

---

## **Final Recommendation: TimescaleDB**

### Why TimescaleDB is the Best Choice:

1. **Cost**: FREE (open source)
2. **Performance**: 10-100x faster than regular PostgreSQL
3. **Compression**: 90%+ reduction in storage
4. **Easy Migration**: Works with existing PostgreSQL
5. **Automatic Management**: Handles partitioning, compression, retention
6. **Scalability**: Handles millions of data points efficiently

### Migration Steps:

1. **Install TimescaleDB**:
```bash
# Using Docker
docker run -d --name timescaledb \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg16
```

2. **Convert existing table**:
```sql
-- Your existing asset_data table works as-is
-- Just convert it to a hypertable
SELECT create_hypertable('asset_data', 'date');
```

3. **Enable compression**:
```sql
ALTER TABLE asset_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol'
);
```

4. **Set compression policy**:
```sql
-- Compress data older than 7 days
SELECT add_compression_policy('asset_data', INTERVAL '7 days');
```

### Storage Savings Example:

**Before (Regular PostgreSQL):**
- 1,000 assets × 5 years daily = ~73 MB
- Indexes = ~20 MB
- **Total: ~93 MB**

**After (TimescaleDB with compression):**
- Compressed data = ~7-10 MB
- Indexes = ~5 MB
- **Total: ~12-15 MB (85% reduction!)**

---

## Additional Optimizations

### 1. **Data Retention Policies**
```sql
-- Keep only necessary data
-- Delete data older than 5 years automatically
SELECT add_retention_policy('asset_data', INTERVAL '5 years');
```

### 2. **Continuous Aggregates** (Pre-computed views)
```sql
-- Pre-aggregate hourly data from 1-minute data
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
```

### 3. **Smart Caching Strategy**
- **Redis cache** for frequently accessed assets (last 30 days)
- **Database** for historical data
- **File cache** for 5-year views (pre-computed)

---

## Cost Comparison

| Solution | Setup Cost | Storage/1K Assets | Query Speed | Maintenance |
|---------|------------|-------------------|-------------|-------------|
| **TimescaleDB** | FREE | ~10 MB | ⚡⚡⚡ Very Fast | Low |
| **PostgreSQL Optimized** | FREE | ~15 MB | ⚡⚡ Fast | Medium |
| **Hybrid (DB + Files)** | FREE | ~10 MB | ⚡⚡ Fast | Medium |
| **S3 Glacier** | FREE | ~73 MB | 🐌 Slow | Low |
| **Regular PostgreSQL** | FREE | ~93 MB | ⚡ Moderate | Low |

---

## Implementation Recommendation

**For your use case, I recommend:**

1. **Use TimescaleDB** (free, fast, compressed)
2. **Store daily data** for 5 years (sufficient for most charts)
3. **Cache recent data** in Redis (last 30 days) for instant access
4. **Use compression** for data older than 7 days
5. **Implement data retention** to automatically clean old data

**Total Cost: $0** (all open source)
**Storage: ~10-15 MB for 1,000 assets**
**Performance: Sub-second queries even for 5-year ranges**

This gives you the best balance of cost, performance, and simplicity!

