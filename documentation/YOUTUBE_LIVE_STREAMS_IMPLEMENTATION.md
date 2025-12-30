# YouTube Live Streams Implementation

## Overview

The live streams feature allows users to watch fintech and financial news YouTube channels directly on the platform, with automatic detection of live streams and fallback to latest videos.

## Architecture

### Backend Service (`services/general/youtubeService.js`)

**Purpose**: Check if YouTube channels are currently live and fetch video IDs

**Functions**:
- `checkChannelLiveStatus(channelId)` - Check single channel
- `checkMultipleChannelsLiveStatus(channelIds)` - Batch check multiple channels

**How it works**:
1. Uses YouTube Data API v3 to search for live streams
2. If live stream found, returns live video ID
3. If not live, fetches latest video from channel's uploads playlist
4. Returns video ID, title, thumbnail, and live status

### API Routes (`routes/youtube.js`)

- `GET /api/youtube/channel/:channelId/status` - Check single channel
- `POST /api/youtube/channels/status` - Batch check multiple channels

### Frontend (`app/live-streams/page.tsx`)

**Features**:
- 4x3 grid layout (12 channels per page)
- Pagination (up to 25 channels per category)
- Live status indicator (red "LIVE" badge)
- Automatic refresh every 30 seconds
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

**Estimated usage per check**:
- Live check: ~101 units per channel
- Batch of 25 channels: ~2,525 units
- Can check ~3-4 times per day with default quota

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

## Future Enhancements

1. Cache live statuses in Redis (reduce API calls)
2. WebSocket updates for real-time live status
3. User preferences for favorite channels
4. Notifications when channels go live
5. Schedule/upcoming streams display

