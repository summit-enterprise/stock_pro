# YouTube API Key Setup Guide

## Step-by-Step Instructions

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Select or Create a Project
- If you have an existing project, select it from the dropdown at the top
- If you need a new project:
  - Click the project dropdown
  - Click "New Project"
  - Enter a project name (e.g., "Stock App")
  - Click "Create"

### 3. Enable YouTube Data API v3
1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "YouTube Data API v3"
3. Click on "YouTube Data API v3"
4. Click the **"Enable"** button

### 4. Create API Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API Key"**
4. A dialog will appear with your new API key
5. **Copy the API key** (you'll need it in the next step)

### 5. (Optional) Restrict the API Key
For better security, you can restrict the key:
1. Click on the API key you just created
2. Under **"API restrictions"**, select **"Restrict key"**
3. Choose **"YouTube Data API v3"** from the list
4. Click **"Save"**

### 6. Add API Key to Your Project

#### For Backend (.env file):
1. Open `backend/.env` (create it if it doesn't exist)
2. Add the following line:
   ```
   YOUTUBE_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with the actual API key you copied

#### For Frontend (if needed):
If you need the API key in the frontend (not recommended for security), add to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_api_key_here
   ```

### 7. Restart Your Server
After adding the API key:
```bash
# Stop your backend server (Ctrl+C)
# Then restart it
cd backend
npm run dev
```

## Verification

After setting up the API key, you should see:
- ✅ No more "YOUTUBE_API_KEY not set" warnings
- ✅ Live stream status checks working
- ✅ Video IDs being fetched correctly

## API Quota Limits

**Free Tier Limits:**
- 10,000 units per day
- Each API call costs units:
  - Search: 100 units
  - Videos: 1 unit
  - Channels: 1 unit

**For your use case:**
- Checking 25 channels every 30 seconds
- ~50 API calls per check
- ~2,880 checks per day = ~144,000 units/day

**⚠️ You may need to:**
1. Reduce refresh frequency (e.g., every 60 seconds instead of 30)
2. Cache results longer
3. Upgrade to a paid plan if needed

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key
- Check that YouTube Data API v3 is enabled
- Verify the key hasn't expired or been deleted

### "Quota exceeded"
- You've hit the daily limit
- Wait 24 hours or upgrade your quota
- Consider implementing better caching

### "Forbidden" errors
- Check API restrictions on your key
- Make sure YouTube Data API v3 is enabled for the project

## Security Best Practices

1. **Never commit API keys to Git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Restrict API keys**
   - Limit to specific APIs (YouTube Data API v3)
   - Restrict by IP if possible (for server-side use)

3. **Rotate keys regularly**
   - Generate new keys periodically
   - Revoke old keys that are no longer needed

## Quick Reference

- **Google Cloud Console**: https://console.cloud.google.com/
- **API Library**: https://console.cloud.google.com/apis/library
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **YouTube Data API v3 Docs**: https://developers.google.com/youtube/v3



