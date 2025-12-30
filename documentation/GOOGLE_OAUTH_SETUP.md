# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter project name: "StockPro" (or your preferred name)
5. Click "Create"

## Step 2: Configure OAuth Consent Screen

1. In your project, go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Click **Create**
4. Fill in the required information:
   - **App name**: StockPro (or your app name)
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload a logo
   - **Application home page**: `http://localhost:3000` (for development)
   - **Application privacy policy link**: (Optional for development)
   - **Application terms of service link**: (Optional for development)
   - **Authorized domains**: Leave empty for localhost development
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On **Scopes** page, click **Add or Remove Scopes**
   - Add: `email`, `profile`, `openid`
   - Click **Update**, then **Save and Continue**
7. On **Test users** page (if in Testing mode):
   - Add your email address as a test user
   - Click **Save and Continue**
8. Click **Back to Dashboard**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application** as the application type
4. Fill in:
   - **Name**: StockPro Web Client (or your preferred name)
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - (Add your production URL when deploying)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback`
     - (Add your production callback URL when deploying)
5. Click **Create**
6. **IMPORTANT**: Copy your **Client ID** and **Client Secret**
   - You'll need these in your `.env` files
   - The Client Secret will only be shown once!

## Step 4: Add Credentials to Your App

### Backend `.env` file:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Frontend `.env.local` file (create this file):
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
```

**Note**: Frontend environment variables must start with `NEXT_PUBLIC_` to be accessible in the browser.

## Step 5: Install Required Packages

### Frontend:
```bash
cd frontend
npm install @react-oauth/google
```

### Backend:
```bash
cd backend
npm install google-auth-library
```

## Step 6: Test Your Setup

1. Start your backend server
2. Start your frontend server
3. Click "Login" or "Register" in the navbar
4. Click "Continue with Google"
5. You should see the Google sign-in popup
6. After signing in, you'll be redirected back to your app

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure your redirect URI in Google Console exactly matches: `http://localhost:3000/auth/google/callback`
- Check for trailing slashes or http vs https

### "Error 403: access_denied"
- Your app might be in Testing mode
- Add your email as a test user in OAuth consent screen
- Or publish your app (requires verification for production)

### "Invalid client"
- Double-check your Client ID is correct
- Make sure you're using the right Client ID (Web application, not iOS/Android)

## Production Deployment

When deploying to production:
1. Update **Authorized JavaScript origins** with your production domain
2. Update **Authorized redirect URIs** with your production callback URL
3. Update your `.env` files with production URLs
4. Consider publishing your OAuth app (requires verification for public use)

