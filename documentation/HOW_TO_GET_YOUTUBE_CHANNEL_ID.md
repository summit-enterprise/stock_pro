# How to Get YouTube Channel ID

## Method 1: From Channel URL (Easiest)

### If the URL looks like this:
```
https://www.youtube.com/channel/UC8f3S50G9U7V_m-Y1TfA0Xg
```
**The Channel ID is**: `UC8f3S50G9U7V_m-Y1TfA0Xg` (the part after `/channel/`)

### If the URL looks like this (custom URL):
```
https://www.youtube.com/@AmitInvesting
https://www.youtube.com/c/MeetKevin
https://www.youtube.com/user/GrahamStephan
```

**You need to use Method 2 or 3 below.**

## Method 2: View Page Source

1. Go to the YouTube channel page
2. Right-click and select "View Page Source" (or press `Ctrl+U` / `Cmd+U`)
3. Press `Ctrl+F` / `Cmd+F` to search
4. Search for: `"channelId"` or `"externalId"`
5. You'll see something like: `"channelId":"UC8f3S50G9U7V_m-Y1TfA0Xg"`
6. Copy the ID (the part in quotes after `channelId`)

## Method 3: Using YouTube Data API

If you have a YouTube API key, you can convert custom URLs to Channel IDs:

```javascript
// For @username format
GET https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=username&key=API_KEY

// For custom URL
GET https://www.googleapis.com/youtube/v3/search?part=snippet&q=channel_name&type=channel&key=API_KEY
```

## Method 4: Using Online Tools

Several free online tools can help:
- **Comment Picker**: https://commentpicker.com/youtube-channel-id.php
- **Streamweasels**: https://streamweasels.com/tools/youtube-channel-id-and-user-id-convertor/
- **RapidTables**: https://www.rapidtables.com/web/tools/youtube-channel-id.html

Just paste the channel URL and it will give you the Channel ID.

## Method 5: From Video Page

1. Go to any video from the channel
2. Click on the channel name below the video
3. Look at the URL - it should show the channel ID format
4. Or view page source of the video and search for `"channelId"`

## Method 6: Using Browser Console

1. Go to the YouTube channel page
2. Open Developer Tools (`F12` or `Cmd+Option+I`)
3. Go to Console tab
4. Paste this code:
```javascript
ytInitialData.metadata.channelMetadataRenderer.externalId
```
5. Press Enter - it will show the Channel ID

## Channel ID Format

YouTube Channel IDs always:
- Start with `UC` (User Channel)
- Are 24 characters long
- Example: `UC8f3S50G9U7V_m-Y1TfA0Xg`

## Common Channel URL Formats

| URL Format | How to Get ID |
|------------|---------------|
| `youtube.com/channel/UCxxxxx` | ID is after `/channel/` |
| `youtube.com/@username` | Use Method 2, 3, or 4 |
| `youtube.com/c/ChannelName` | Use Method 2, 3, or 4 |
| `youtube.com/user/username` | Use Method 2, 3, or 4 |

## Quick Reference for Current Channels

### Fintech Channels
- **Amit Investing**: `UC8f3S50G9U7V_m-Y1TfA0Xg`
- **Dumb Money Live**: `UCS01CiRDAiyhR_mTHXDW23A`
- **Chris Sain**: `UC7SRE6_G0vV94_G93m4uD0Q`
- **Meet Kevin**: `UC_86S3_KInp_9KAtKToL_8A`
- **Graham Stephan**: `UCV6KDgJskWaEckne5aPA0aQ`

### Financial News Channels
- **CNBC**: `UCvJJ_dzjViJCoLf5uKUTwoA`
- **Fox Business**: `UCCXoCcu9Rp7NPbTzIvogpZg`
- **Bloomberg Television**: `UCIALMKvObZNtJ6AmdCLP7Lg`
- **Yahoo Finance**: `UCEAZeUIeJs0IjQiqTCdVSIg`
- **Reuters**: `UChqUTb7kYRX8-EiaN3XFrSQ`

## Tips

1. **Easiest method**: If the URL has `/channel/UC...`, just copy that part
2. **For custom URLs**: Use Method 2 (View Page Source) - it's the most reliable
3. **Bulk lookup**: If you have many channels, use the YouTube Data API
4. **Verify**: Channel IDs always start with `UC` and are 24 characters

## Testing Channel ID

To verify a Channel ID is correct, visit:
```
https://www.youtube.com/channel/YOUR_CHANNEL_ID_HERE
```

If it loads the channel page, the ID is correct!

