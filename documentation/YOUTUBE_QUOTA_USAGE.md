# YouTube API Quota Usage Per Query

## Current Implementation

## Single Channel Check (`checkChannelLiveStatus`)

### With `pullLivestreams = true` (default):
1. **Live search** (if not cached): **100 units** ⚠️ VERY EXPENSIVE
2. **Channel info** (if not cached): **1 unit**
3. **Playlist items**: **1 unit**
4. **Video details**: **1 unit**

**Total: 103 units per channel** (if not cached)

### With `pullLivestreams = false`:
1. **Channel info** (if not cached): **1 unit**
2. **Playlist items**: **1 unit**
3. **Video details**: **1 unit**

**Total: 3 units per channel** (if not cached)

### With Redis Cache (optimized):
- **If cached and recent**: **0 units** (no API calls)
- **If cache expired**: Full cost above

## Batch Channel Check (`checkMultipleChannelsLiveStatus`)

### Step 1: Batch Channel Info
- **1 unit** for up to 50 channels (shared across all channels)
- Cached for 1 hour

### Step 2: Per Channel Processing

**For channels with `pullLivestreams = true`:**
- Live search: **100 units**
- Playlist items: **1 unit**
- Video details: **1 unit**
- **Total: 102 units per channel**

**For channels with `pullLivestreams = false`:**
- Playlist items: **1 unit**
- Video details: **1 unit**
- **Total: 2 units per channel**

### Example: 13 channels with `pullLivestreams = true`
- Batch channel info: **1 unit** (shared)
- 13 channels × 102 units = **1,326 units**
- **Total: 1,327 units**

### Example: 13 channels with `pullLivestreams = false`
- Batch channel info: **1 unit** (shared)
- 13 channels × 2 units = **26 units**
- **Total: 27 units**

## Current Optimizations

1. **Redis Caching**: 
   - Live status: 15 minutes TTL
   - Video status: 30 minutes TTL
   - Channel info: 1 hour TTL (in-memory)
   - **Saves 100+ units if cached**

2. **Refresh Interval**: 60 minutes (was 10 minutes)
   - Reduces daily refreshes from 144 → 24

3. **Smart Cache Usage**:
   - Skips live search if recently checked and not live
   - Uses cached video IDs when quota exceeded

## Daily Usage Estimate

### Scenario 1: 13 channels, all `pullLivestreams = true`, no cache
- Per refresh: 1,327 units
- 24 refreshes/day: **31,848 units/day** ❌ (3x over 10,000 limit)

### Scenario 2: 13 channels, all `pullLivestreams = true`, with 50% cache hit
- Per refresh: ~664 units (50% cached)
- 24 refreshes/day: **15,936 units/day** ❌ (still over limit)

### Scenario 3: 13 channels, all `pullLivestreams = false`, no cache
- Per refresh: 27 units
- 24 refreshes/day: **648 units/day** ✅ (well within limit)

### Scenario 4: 13 channels, all `pullLivestreams = false`, with cache
- Per refresh: ~14 units (50% cached)
- 24 refreshes/day: **336 units/day** ✅ (well within limit)

## Recommendations

1. **Set `pullLivestreams = false`** for channels that rarely go live
2. **Increase cache TTL** for non-live channels (currently 30 minutes)
3. **Use cached video IDs** more aggressively when quota is low
4. **Request quota increase** from Google if needed


