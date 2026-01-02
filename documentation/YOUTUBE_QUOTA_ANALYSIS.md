# YouTube API Quota Analysis & Optimization

## Current Quota Usage

### API Costs per Operation
- **Search (live check)**: 100 units per request ⚠️ VERY EXPENSIVE
- **Channels (info)**: 1 unit per request
- **PlaylistItems**: 1 unit per request  
- **Videos (details)**: 1 unit per request

### Current Implementation Costs

**Per Channel Check (with `pullLivestreams=true`):**
- Live search: 100 units
- Channel info (if not cached): 1 unit
- Playlist items: 1 unit
- Video details: 1 unit
- **Total: ~103 units per channel**

**For 13 fintech channels:**
- 13 channels × 103 units = **1,339 units per refresh**

**Current Refresh Frequency:**
- Frontend refreshes every 10 minutes
- 6 refreshes per hour = **8,034 units/hour**
- 144 refreshes per day = **192,816 units/day** ❌

**Daily Quota Limit:** 10,000 units
**Current Usage:** ~192,816 units/day (19x over limit!)

## Problems Identified

1. **Too Frequent Refreshes**: 10 minutes is way too often
2. **Expensive Live Search**: 100 units per channel is the main cost
3. **No Result Caching**: We check even if nothing changed
4. **Client-Side Refresh**: Each user triggers their own refresh
5. **No Smart Scheduling**: We check all channels even if they rarely go live
6. **No Rate Limiting**: Multiple users = multiple simultaneous refreshes

## Optimization Strategy

### 1. Server-Side Caching (HIGH PRIORITY)
- Cache results in Redis/database with TTL
- Store: `{ channelId, isLive, videoId, lastChecked, expiresAt }`
- TTL: 15-30 minutes for live checks, 1 hour for video-only checks

### 2. Increase Refresh Interval
- Change from 10 minutes → 30-60 minutes
- Reduces daily refreshes from 144 → 24-48

### 3. Smart Refresh Logic
- **Skip live search if recently checked**: If checked 15 min ago and wasn't live, skip expensive search
- **Use cached video ID**: If we have a recent cached video ID, use it instead of API call
- **Priority-based checking**: Check channels that are more likely to be live first

### 4. Background Job (RECOMMENDED)
- Move refresh to server-side background job
- Single refresh for all users
- Prevents multiple simultaneous refreshes
- Can schedule based on channel activity patterns

### 5. Optimize Live Search
- Only check live status if:
  - Channel hasn't been checked in last 15 minutes
  - Channel is known to go live (based on history)
  - User explicitly requests refresh
- Otherwise, use cached video ID or latest video from playlist

### 6. Use Cached Video IDs More Aggressively
- When quota is low, prioritize cached video IDs
- Only make API calls when absolutely necessary
- Fall back to channel embed URL when quota exhausted

## Recommended Implementation

### Phase 1: Immediate Fixes (Reduce usage by ~90%)
1. **Increase refresh interval**: 10 min → 60 minutes
2. **Add server-side caching**: Cache results for 30 minutes
3. **Skip live search if recently checked**: If checked < 15 min ago and wasn't live, skip

**Expected reduction:**
- 144 refreshes/day → 24 refreshes/day
- 192,816 units/day → ~32,000 units/day
- Still over limit, but much better

### Phase 2: Smart Caching (Reduce usage by ~95%)
1. **Cache video IDs**: Store last video ID per channel
2. **Smart refresh**: Only check live if channel might be live
3. **Use cached IDs**: When quota low, use cached video IDs

**Expected reduction:**
- ~32,000 units/day → ~10,000 units/day
- Within quota limit!

### Phase 3: Background Job (Optimal)
1. **Server-side background job**: Single refresh for all users
2. **Scheduled refresh**: Based on channel activity patterns
3. **WebSocket updates**: Push updates to clients when status changes

**Expected reduction:**
- ~10,000 units/day → ~5,000-7,000 units/day
- Well within quota with room for growth

## Implementation Priority

1. ✅ **Immediate**: Increase refresh interval to 60 minutes
2. ✅ **Immediate**: Add server-side result caching (Redis)
3. ✅ **High**: Skip live search if recently checked
4. ✅ **High**: Use cached video IDs more aggressively
5. ⚠️ **Medium**: Background job for server-side refresh
6. ⚠️ **Low**: WebSocket updates for real-time status


