# How to Increase YouTube API Quota

## Current Default Quota

**Free Tier Default:**
- **10,000 units per day**
- Resets at midnight Pacific Time

## How to Request a Quota Increase

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (the one with your YouTube API key)

### Step 2: Navigate to YouTube Data API v3

1. Go to **APIs & Services** > **Library**
2. Search for "YouTube Data API v3"
3. Click on it
4. Click on **"Quotas"** tab (in the left sidebar)

### Step 3: Check Current Quota Usage

1. In the Quotas page, you'll see:
   - **Queries per day**: Current limit (default: 10,000)
   - **Queries per 100 seconds per user**: Rate limit
   - Your current usage

### Step 4: Request Quota Increase

**Option A: Through Google Cloud Console (Recommended)**

1. In the **Quotas** page, find the quota you want to increase
2. Click on the quota name (e.g., "Queries per day")
3. Click **"EDIT QUOTAS"** button at the top
4. Enter your requested quota amount (e.g., 50,000, 100,000, or 1,000,000)
5. Fill out the form:
   - **Reason for increase**: Explain your use case
   - **Expected usage**: Estimate your daily usage
   - **Application details**: Describe what your app does
6. Click **"Submit"**

**Option B: Through YouTube API Services Form (For Larger Increases)**

1. Visit: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
2. Fill out the **"YouTube API Services - Audit and Quota Extension Form"**
3. You'll need to provide:
   - Project details
   - Use case description
   - Expected daily/monthly usage
   - Compliance with YouTube's Terms of Service
   - How your app benefits users

### Step 5: Wait for Approval

- **Small increases** (up to 50,000 units/day): Usually approved within 24-48 hours
- **Large increases** (100,000+ units/day): May take 1-2 weeks
- **Very large increases** (1M+ units/day): May require compliance audit

## Recommended Quota Amounts

Based on your use case (14 channels, checking every 10 minutes):

### Current Usage (Optimized):
- **Channels with livestreams enabled**: ~7 channels × 100 units = 700 units per check
- **Channels with livestreams disabled**: ~7 channels × 2 units = 14 units per check
- **Total per check**: ~714 units
- **Checks per day** (every 10 min): 144 checks
- **Total daily usage**: ~102,816 units/day

### Recommended Quota:
- **Minimum**: 200,000 units/day (2x your current usage for safety margin)
- **Recommended**: 500,000 units/day (allows for growth and spikes)
- **Ideal**: 1,000,000 units/day (if you plan to add more channels)

## Alternative: Use Multiple API Keys

If quota increase is slow, you can use multiple API keys:

1. Create multiple Google Cloud projects
2. Each project gets 10,000 units/day
3. Rotate between keys in your application
4. **Note**: This requires code changes to implement key rotation

## Monitoring Your Quota

### Check Quota Usage:

1. Go to **APIs & Services** > **Dashboard**
2. Click on **"YouTube Data API v3"**
3. View **"Queries per day"** chart
4. Set up alerts for when you reach 80% of quota

### Set Up Alerts:

1. Go to **Monitoring** > **Alerting**
2. Create a new alert policy
3. Set condition: "Queries per day" > 8,000 (80% of 10,000)
4. Add notification channel (email)

## Best Practices to Stay Within Quota

1. **Use the optimizations we implemented:**
   - Set `pull_livestreams = false` for channels that rarely go live
   - This saves 100 units per channel per check

2. **Increase refresh interval:**
   - Current: 10 minutes
   - Consider: 15-30 minutes for non-critical channels

3. **Implement smart caching:**
   - Cache results for 1 hour (already implemented)
   - Only refresh when user actively viewing

4. **Batch operations:**
   - Already implemented: Channel info batching
   - Already implemented: Video details batching

## Quick Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **YouTube API Quotas**: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
- **Quota Extension Form**: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- **YouTube API Documentation**: https://developers.google.com/youtube/v3

## Troubleshooting

### "Quota increase request denied"
- Provide more detailed use case information
- Explain how your app complies with YouTube's Terms of Service
- Show that you've optimized your API usage

### "Request pending for weeks"
- Follow up via Google Cloud Support
- Consider using multiple API keys as temporary solution

### "Need immediate increase"
- Use multiple API keys (create 2-3 projects)
- Implement key rotation in code
- Request quota increase for long-term solution


