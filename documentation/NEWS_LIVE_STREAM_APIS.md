# Financial News Live Stream APIs

## Overview
This document outlines the APIs and methods available for fetching live stream URLs from major financial news networks.

## News Networks & Their Live Stream APIs

### 1. **Bloomberg**
- **Live Stream URL**: `https://www.bloomberg.com/live`
- **API**: Bloomberg Terminal API (requires subscription)
- **Alternative**: Scrape embed URL from their website
- **Embed URL Pattern**: `https://www.bloomberg.com/embed/live`
- **API Key Required**: ❌ No (for public streams)
- **Notes**: Public live stream available, but API access requires Bloomberg Terminal subscription

### 2. **CNBC**
- **Live Stream URL**: `https://www.cnbc.com/live-tv/`
- **API**: CNBC doesn't have a public API
- **Alternative**: Use YouTube channel or scrape embed URL
- **YouTube Channel**: `UCvJJ_dzjViJCoLf5uKUTwoA`
- **Embed URL Pattern**: `https://www.cnbc.com/live-tv/embed/`
- **API Key Required**: ❌ No
- **Notes**: Can use YouTube API or scrape their website

### 3. **CNBC International**
- **Live Stream URL**: `https://www.cnbc.com/cnbc-international/`
- **API**: Same as CNBC (no public API)
- **Alternative**: YouTube channel or website scraping
- **YouTube Channel**: May have separate channel
- **API Key Required**: ❌ No
- **Notes**: Similar to CNBC, may need to check for separate stream

### 4. **Fox Business**
- **Live Stream URL**: `https://www.foxbusiness.com/live`
- **API**: No public API
- **Alternative**: YouTube channel or embed URL
- **YouTube Channel**: `UCCXoCcu9Rp7NPbTzIvogpZg`
- **Embed URL Pattern**: `https://www.foxbusiness.com/embed/live`
- **API Key Required**: ❌ No
- **Notes**: Can use YouTube API or scrape

### 5. **Yahoo Finance**
- **Live Stream URL**: `https://finance.yahoo.com/live/`
- **API**: Yahoo Finance API (limited, may require key)
- **Alternative**: YouTube channel or embed URL
- **YouTube Channel**: `UCEAZeUIeJs0IjQiqTCdVSIg`
- **Embed URL Pattern**: `https://finance.yahoo.com/embed/live`
- **API Key Required**: ⚠️ Possibly (for API access)
- **Notes**: Yahoo Finance API is limited, scraping may be needed

### 6. **Cheddar**
- **Live Stream URL**: `https://cheddar.com/live`
- **API**: No public API
- **Alternative**: Scrape embed URL
- **Embed URL Pattern**: `https://cheddar.com/embed/live`
- **API Key Required**: ❌ No
- **Notes**: May need to scrape their website for embed URL

### 7. **CBS News 24/7**
- **Live Stream URL**: `https://www.cbsnews.com/live/`
- **API**: CBS News API (may require key)
- **Alternative**: YouTube channel or embed URL
- **YouTube Channel**: May have dedicated channel
- **Embed URL Pattern**: `https://www.cbsnews.com/embed/live`
- **API Key Required**: ⚠️ Possibly (for API access)
- **Notes**: Check for YouTube channel or use embed URL

## Implementation Strategy

### Option 1: Direct Embed URLs (Recommended)
- Scrape or hardcode embed URLs from each network's website
- No API keys needed
- Simple and reliable
- May need periodic updates if URLs change

### Option 2: YouTube API (Fallback)
- Use existing YouTube service for channels that have YouTube streams
- Already implemented
- Requires YouTube API key (already have)

### Option 3: Network-Specific APIs
- Bloomberg Terminal API (requires subscription - expensive)
- CBS News API (may require key)
- Yahoo Finance API (limited access)

### Recommended Approach: Hybrid
1. **Primary**: Direct embed URLs (scraped or hardcoded)
2. **Fallback**: YouTube API for channels that stream on YouTube
3. **Update Service**: Periodic script to verify/update embed URLs

## Embed URL Discovery Methods

### Method 1: Browser Inspection
1. Visit the network's live stream page
2. Open browser DevTools (F12)
3. Look for `<iframe>` tags with `src` attributes
4. Copy the embed URL

### Method 2: Network Tab
1. Open DevTools > Network tab
2. Visit the live stream page
3. Filter by "media" or "m3u8" or "mpd"
4. Find the stream URL

### Method 3: Page Source
1. View page source (Ctrl+U)
2. Search for "embed", "iframe", "stream", "m3u8", "mpd"
3. Extract the URL

## Stream URL Formats

Common formats you might find:
- **HLS (m3u8)**: `https://example.com/stream.m3u8`
- **DASH (mpd)**: `https://example.com/stream.mpd`
- **Embed URL**: `https://example.com/embed/live`
- **YouTube**: `https://www.youtube.com/embed/VIDEO_ID`

## API Keys Needed

### Currently Required:
- ✅ **YouTube API Key** - Already configured

### May Need:
- ⚠️ **Yahoo Finance API Key** - If using their API (not required for scraping)
- ⚠️ **CBS News API Key** - If using their API (not required for scraping)

### Not Needed:
- ❌ **Bloomberg** - Public streams available
- ❌ **CNBC** - Use YouTube or scraping
- ❌ **Fox Business** - Use YouTube or scraping
- ❌ **Cheddar** - Scraping only

## Next Steps

1. Create a service to fetch/validate live stream URLs
2. Implement scraping for networks without APIs
3. Add fallback to YouTube for networks that stream there
4. Create a database table to store stream URLs
5. Add periodic update job to refresh URLs



