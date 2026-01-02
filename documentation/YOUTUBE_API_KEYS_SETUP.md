# YouTube API Keys Setup Guide

## Important: API Keys vs Projects

### ❌ Multiple API Keys in Same Project
- **Same quota limit**: All API keys in the same Google Cloud project share the same quota
- **No benefit**: Creating multiple keys in the same project does NOT increase your quota
- **Example**: If Project A has 10,000 units/day, all keys from Project A share that 10,000 units

### ✅ Multiple Projects (Recommended)
- **Separate quota**: Each Google Cloud project has its own quota limit
- **Increased quota**: 3 projects = 3x the quota (30,000 units/day total)
- **Example**: Project A (10,000), Project B (10,000), Project C (10,000) = 30,000 units/day

## How to Get Multiple API Keys with Increased Quota

### Step 1: Create Multiple Google Cloud Projects

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it (e.g., "YouTube API Project 2")
   - Click "Create"

3. Repeat for as many projects as you need (each gets 10,000 units/day)

### Step 2: Enable YouTube Data API v3 in Each Project

For each project:
1. Select the project from the dropdown
2. Go to "APIs & Services" > "Library"
3. Search for "YouTube Data API v3"
4. Click "Enable"

### Step 3: Create API Key in Each Project

For each project:
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. (Optional) Restrict the key to YouTube Data API v3 for security

### Step 4: Add All Keys to Your .env File

```env
# Option 1: Comma-separated (easiest)
YOUTUBE_API_KEY=key_from_project_1,key_from_project_2,key_from_project_3

# Option 2: Numbered keys
YOUTUBE_API_KEY=key_from_project_1
YOUTUBE_API_KEY_1=key_from_project_1
YOUTUBE_API_KEY_2=key_from_project_2
YOUTUBE_API_KEY_3=key_from_project_3
```

## Quota Limits

### Default Quota (Free Tier)
- **Per Project**: 10,000 units/day
- **Per Key**: Same as project (keys share project quota)

### With Multiple Projects
- **1 Project**: 10,000 units/day
- **2 Projects**: 20,000 units/day
- **3 Projects**: 30,000 units/day
- **N Projects**: N × 10,000 units/day

## Best Practices

1. **Use separate projects**: Each project gets its own quota
2. **Name projects clearly**: "YouTube API - Project 1", "YouTube API - Project 2", etc.
3. **Restrict API keys**: Limit each key to YouTube Data API v3 only
4. **Monitor usage**: Check quota usage in each project's dashboard
5. **Set up billing alerts**: Get notified when approaching limits

## Cost

- **Free tier**: 10,000 units/day per project (no cost)
- **Paid tier**: If you need more, you can request a quota increase (may have costs)

## Verification

After adding multiple keys, check your server logs:
- You should see: "Using YouTube API key rotation"
- When quota is exceeded: "Rotating to next YouTube API key"
- All keys should be detected on server startup

## Troubleshooting

### Keys Not Rotating
- Verify keys are from different projects (not just different keys in same project)
- Check that all projects have YouTube Data API v3 enabled
- Ensure keys are correctly formatted in .env (no extra spaces)

### Still Hitting Quota
- Verify you're using keys from separate projects
- Check quota usage in each project's Google Cloud Console
- Consider adding more projects if needed

### Key Not Working
- Verify the API key is correct
- Check that YouTube Data API v3 is enabled in that project
- Ensure the key hasn't been restricted incorrectly


