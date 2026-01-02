# Multiple YouTube API Keys Configuration

## Overview

The YouTube service now supports multiple API keys with automatic rotation when quota is exceeded. This allows you to use multiple YouTube API projects to increase your total quota.

## Configuration Options

You can configure multiple API keys in two ways:

### Option 1: Comma-Separated (Recommended)
Add all keys to a single environment variable, separated by commas:

```env
YOUTUBE_API_KEY=key1,key2,key3
```

### Option 2: Numbered Keys
Use separate environment variables for each key:

```env
YOUTUBE_API_KEY=key1
YOUTUBE_API_KEY_1=key1
YOUTUBE_API_KEY_2=key2
YOUTUBE_API_KEY_3=key3
```

**Note:** If both methods are used, all keys will be combined (no duplicates).

## How It Works

1. **Key Rotation**: When a quota exceeded error (403) is detected, the system automatically rotates to the next available API key.

2. **Quota Tracking**: Keys that have exceeded quota are temporarily disabled for 24 hours (until quota resets).

3. **Automatic Fallback**: If all keys are exhausted, the system falls back to:
   - Cached video IDs from database
   - Channel embed URLs (no API call needed)

4. **Transparent Operation**: The rotation happens automatically - no code changes needed in your application.

## Example Setup

### .env File
```env
# Primary key (backward compatible)
YOUTUBE_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6

# Additional keys for quota management
YOUTUBE_API_KEY_1=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6
YOUTUBE_API_KEY_2=AIzaSyX9Y8Z7W6V5U4T3S2R1Q0P9O8N7M6L5K4
YOUTUBE_API_KEY_3=AIzaSyZ1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6
```

Or using comma-separated format:
```env
YOUTUBE_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6,AIzaSyX9Y8Z7W6V5U4T3S2R1Q0P9O8N7M6L5K4,AIzaSyZ1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6
```

## Quota Management

### Daily Quota
- Each YouTube API project has a default quota of **10,000 units/day**
- With 3 API keys, you get **30,000 units/day** total

### Quota Costs
- **Live search**: 100 units per request (expensive!)
- **Channel info**: 1 unit per request
- **Playlist items**: 1 unit per request
- **Video details**: 1 unit per request

### Best Practices
1. **Use caching**: The system caches results for 15-30 minutes to reduce API calls
2. **Limit live checks**: Only check for live streams when necessary
3. **Monitor usage**: Check your Google Cloud Console for quota usage
4. **Add more keys**: If you need more quota, simply add more API keys

## Troubleshooting

### All Keys Exceeded
If all API keys have exceeded quota:
- The system will use cached video IDs from the database
- Channel embed URLs will be used (no API call needed)
- Quota resets daily at midnight Pacific Time

### Key Not Working
- Verify the API key is correct in your `.env` file
- Check that YouTube Data API v3 is enabled in Google Cloud Console
- Ensure the API key has proper permissions

### Rotation Not Working
- Check server logs for rotation messages
- Verify multiple keys are configured correctly
- Ensure keys are from different Google Cloud projects

## Monitoring

The system logs key rotation events:
```
⚠️  YouTube API key exceeded quota. Marked for rotation.
🔄 Rotating to next YouTube API key (attempt 2/3)
✅ YouTube API key quota reset. Re-enabled key.
```

Check your application logs to monitor key usage and rotation.


