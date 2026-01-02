# YouTube Live Streams Implementation

## Overview

The live streams feature allows users to watch fintech and financial news YouTube channels directly on the platform, with automatic detection of live streams and fallback to latest videos.

## Architecture

### Backend Service (`services/general/youtubeService.js`)

**Purpose**: Check if YouTube channels are currently live and fetch video IDs

**Functions**:
- `checkChannelLiveStatus(channelId)` - Check single channel
- `checkMultipleChannelsLiveStatus(channelIds)` - Batch check multiple channels

**How it works** (Optimized for minimal API usage):
1. **Batch fetches channel info** (uploads playlist IDs) for all channels in one API call (up to 50 channels = 1 unit)
2. **Caches channel info** in memory for 1 hour to avoid repeated API calls
3. For each channel:
   - Checks if live using search API (100 units) - if live, returns immediately
   - If not live, uses cached uploads playlist ID to get latest video (1 unit)
   - Falls back to channel embed URL if no videos found (0 units)
4. Returns video ID, title, thumbnail, and live status

### API Routes (`routes/youtube.js`)

- `GET /api/youtube/channel/:channelId/status` - Check single channel
- `POST /api/youtube/channels/status` - Batch check multiple channels

### Frontend (`app/live-streams/page.tsx`)

**Features**:
- 4x3 grid layout (12 channels per page)
- Pagination (up to 25 channels per category)
- Live status indicator (red "LIVE" badge)
- Automatic refresh every 10 minutes (reduced from 5 minutes to minimize API usage)
- Clickable overlay to open on YouTube
- Uses video ID when available, falls back to channel live stream URL

## YouTube API Requirements

### Environment Variable

Add to `.env`:
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Getting YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Add to `.env` file

### API Quotas

- Default: 10,000 units per day
- Each `search` request: 100 units
- Each `channels` request: 1 unit
- Each `playlistItems` request: 1 unit

**Estimated usage per check** (Optimized):
- **Before optimization**: ~205 units per channel (multiple API calls with fallbacks)
- **After optimization**: ~101-102 units per channel
  - 1 unit for batch channel info (shared across all channels)
  - 100 units for live search check
  - 1 unit for latest video from playlist (if not live)
- **Batch of 25 channels**: ~2,525 units (1 + 25×101)
- **With caching**: Subsequent checks within 1 hour use ~2,525 units (channel info cached)
- Can check ~3-4 times per day with default quota (10,000 units/day)

## Embed URLs

### Live Stream
```
https://www.youtube.com/embed/{videoId}?autoplay=0&mute=0
```

### Channel Live Stream (Fallback)
```
https://www.youtube.com/embed/live_stream?channel={channelId}&autoplay=0&mute=0
```

### Latest Video
```
https://www.youtube.com/embed/{videoId}?autoplay=0&mute=0
```

## Current Channels

### Fintech (5 channels)
- Amit Investing (Amit Kukreja)
- Dumb Money Live (Chris Camillo)
- Chris Sain
- Meet Kevin
- Graham Stephan

### Financial News (5 channels)
- CNBC
- Fox Business
- Bloomberg Television
- Yahoo Finance
- Reuters

## Features

### Live Status Detection
- Automatically checks if channels are live
- Shows red "LIVE" badge next to channel name
- Updates every 30 seconds

### Video Fallback
- If channel is live: Shows live stream
- If not live: Shows latest uploaded video
- If API unavailable: Falls back to channel live stream URL

### User Experience
- Click anywhere on video to open YouTube in new tab
- Channel name is clickable link
- Hover overlay shows "Open on YouTube" button
- Responsive grid layout (1-4 columns based on screen size)

## Mock Service

In local mode (`NODE_ENV=local`), uses mock service that:
- Randomly determines live status (30% chance)
- Generates mock video IDs
- No API calls needed

## Optimizations Implemented

### 1. Batch Channel Info Fetching
- Fetches uploads playlist IDs for all channels in one API call (up to 50 channels)
- Reduces from N API calls to 1 API call for channel info

### 2. In-Memory Caching
- Caches channel info (uploads playlist IDs) for 1 hour
- Avoids repeated API calls for the same channel within cache period
- Significantly reduces quota usage for frequent checks

### 3. Optimized API Call Flow
- Checks live status first (most important)
- Uses pre-fetched uploads playlist IDs to get latest video
- Eliminates unnecessary fallback API calls
- Falls back to channel embed URL (no API call needed)

### 4. Reduced Refresh Frequency
- Frontend refresh interval increased from 5 minutes to 10 minutes
- Reduces API calls by 50% while still maintaining reasonable update frequency

## Future Enhancements

1. ✅ **Batch channel info fetching** - Implemented
2. ✅ **In-memory caching** - Implemented
3. Redis caching for live statuses (reduce API calls further)
4. WebSocket updates for real-time live status
5. User preferences for favorite channels
6. Notifications when channels go live
7. Schedule/upcoming streams display


