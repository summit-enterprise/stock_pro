# News Live Streams Implementation

## Overview
This implementation fetches live stream URLs directly from major financial news networks' websites, bypassing YouTube where possible for more reliable streaming.

## Networks Supported

### Direct Stream Networks (No API Key Required)
1. **Bloomberg** - Direct embed URL
2. **CNBC** - YouTube API (preferred) or direct embed
3. **CNBC International** - Direct embed URL
4. **Fox Business** - YouTube API (preferred) or direct embed
5. **Yahoo Finance** - YouTube API (preferred) or direct embed
6. **Cheddar** - Direct embed URL
7. **CBS News 24/7** - Direct embed URL

## API Keys Status

### ✅ Already Configured
- **YouTube API Key** - Used for CNBC, Fox Business, Yahoo Finance (fallback)

### ❌ Not Required
- **Bloomberg** - Public embed URLs available
- **CNBC International** - Public embed URLs
- **Cheddar** - Public embed URLs
- **CBS News** - Public embed URLs

### ⚠️ May Need (Optional)
- **Yahoo Finance API** - Only if using their official API (not required for scraping)
- **CBS News API** - Only if using their official API (not required for scraping)

## Implementation Details

### Backend Service (`services/general/newsStreamService.js`)

**Functions:**
- `getNewsStreamUrl(networkKey)` - Get stream URL for a specific network
- `getAllNewsStreams()` - Get all network stream URLs
- `scrapeStreamUrl(url)` - Scrape embed URL from website (fallback)
- `verifyAndUpdateEmbedUrls()` - Periodically verify URLs are still valid

**Strategy:**
1. **Primary**: Use YouTube API for networks that stream on YouTube (CNBC, Fox Business, Yahoo Finance)
2. **Fallback**: Use direct embed URLs from network websites
3. **Scraping**: If embed URL fails, scrape the website for current embed URL

### API Routes (`routes/newsStreams.js`)

- `GET /api/news-streams` - Get all news network streams
- `GET /api/news-streams/:network` - Get stream for specific network
- `POST /api/news-streams/verify` - Verify and update embed URLs (admin)

### Frontend Integration

The frontend now supports two types of channels:
1. **YouTube Channels** (`streamType: 'youtube'`) - Uses YouTube API
2. **Direct Stream Channels** (`streamType: 'direct'`) - Uses news-streams API

## Network Configuration

Each network is configured in `NEWS_NETWORKS` object with:
- `name` - Display name
- `embedUrl` - Direct embed URL pattern
- `directUrl` - Website URL for scraping
- `youtubeChannelId` - YouTube channel ID (if available)
- `type` - 'youtube' (prefer YouTube) or 'embed' (use direct embed)

## Embed URL Discovery

To find the correct embed URLs, you can:

1. **Visit the network's live stream page**
2. **Open browser DevTools (F12)**
3. **Look for iframe tags** in the HTML
4. **Check Network tab** for media requests (m3u8, mpd files)
5. **View page source** and search for "embed", "iframe", "stream"

## Testing

### Test Individual Network
```bash
curl http://localhost:3001/api/news-streams/cnbc
```

### Test All Networks
```bash
curl http://localhost:3001/api/news-streams
```

### Verify Embed URLs
```bash
curl -X POST http://localhost:3001/api/news-streams/verify
```

## Next Steps

1. **Verify Embed URLs**: Visit each network's website and verify the embed URLs work
2. **Update URLs**: If any URLs don't work, update them in `newsStreamService.js`
3. **Add More Networks**: Add additional networks to `NEWS_NETWORKS` object
4. **Periodic Verification**: Set up a cron job to verify URLs periodically

## Notes

- Embed URLs may change over time, so periodic verification is recommended
- Some networks may require authentication or have geographic restrictions
- YouTube API is preferred for networks that stream there (more reliable)
- Direct embed URLs are fallback for networks without YouTube presence



