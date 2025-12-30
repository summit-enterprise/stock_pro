# YouTube Live Streams Setup Guide

## What You Need from YouTube

### 1. **YouTube Channel IDs**
For each channel, you need their **Channel ID** (not username). Format: `UCxxxxxxxxxxxxxxxxxxxxxxxxxx`

**How to get Channel ID:**
- Go to the YouTube channel
- View page source (Ctrl+U / Cmd+U)
- Search for `"channelId"` or `"externalId"`
- Or use: `https://www.youtube.com/channel/CHANNEL_ID` format

### 2. **YouTube Live Stream Embed URLs**
For live streams, you can embed using:
- **Channel Live Stream**: `https://www.youtube.com/embed/live_stream?channel=CHANNEL_ID`
- **Specific Video ID**: `https://www.youtube.com/embed/VIDEO_ID`

### 3. **YouTube Data API v3 (Optional)**
If you want to dynamically fetch live streams:
- Get API key from [Google Cloud Console](https://console.cloud.google.com/)
- Enable YouTube Data API v3
- Use endpoints:
  - `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=CHANNEL_ID&eventType=live&type=video&key=API_KEY`
  - `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=CHANNEL_ID&key=API_KEY`

### 4. **Embedding Method**
We'll use YouTube's iframe embed API:
```html
<iframe 
  src="https://www.youtube.com/embed/live_stream?channel=CHANNEL_ID&autoplay=1&mute=0"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
```

## Implementation Approach

### Option 1: Static Channel IDs (Recommended for MVP)
- Hardcode channel IDs in the frontend
- Embed using channel live stream URLs
- Simple, no API needed

### Option 2: Dynamic with YouTube API
- Store channel IDs in database
- Use YouTube Data API to check if channel is live
- Fetch current live stream video ID
- More complex but more accurate

### Option 3: Hybrid
- Store channel IDs in database
- Use static embed URLs (channel live stream)
- If not live, show "Offline" or last video
- Balance between simplicity and functionality

## Current Implementation

We'll use **Option 1 (Static)** for now:
- Hardcode top 25 fintech YouTubers
- Hardcode top 25 financial news channels
- Use channel live stream embed URLs
- Users can switch between categories
- If channel is offline, embed will show "This video is unavailable" or last video

## Channel Data Structure

```typescript
interface YouTubeChannel {
  id: string;              // Channel ID
  name: string;            // Channel name
  description?: string;    // Optional description
  category: 'fintech' | 'news';
  thumbnail?: string;      // Channel thumbnail URL
}
```

## Next Steps

1. ✅ Create the Live Streams page structure
2. ✅ Add to sidebar navigation
3. 🔍 Find top 25 fintech YouTubers (Amit Kukreja, etc.)
4. 🔍 Find top 25 financial news channels
5. 📝 Add channel IDs to the page
6. 🎨 Style the embed grid

