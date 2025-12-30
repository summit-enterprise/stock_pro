# API Keys Configuration

## Overview

API keys have been securely stored in environment files for both backend and frontend.

---

## Backend API Keys

**Location:** `backend/.env`

### Added Keys:
- ✅ **COINMARKETCAP_API_KEY**: `f57f47a7cf8a4be29c69d1285b3b453e`
- ✅ **ALPHA_VANTAGE_API_KEY**: `R07Z4MXUJOXSA6NE`

### Usage in Backend:
```javascript
// Access in Node.js/Express
const coinmarketcapKey = process.env.COINMARKETCAP_API_KEY;
const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
```

---

## Frontend API Keys

**Location:** `frontend/.env.local`

### Added Keys:
- ✅ **COINMARKETCAP_API_KEY**: `f57f47a7cf8a4be29c69d1285b3b453e`
- ✅ **ALPHA_VANTAGE_API_KEY**: `R07Z4MXUJOXSA6NE`

### ✅ Security Note

**These keys are server-side only** - They do NOT have the `NEXT_PUBLIC_` prefix, which means they are:
- ✅ **Safe:** Only accessible in Next.js API routes (server-side)
- ✅ **Secure:** Never exposed to the browser
- ✅ **Protected:** Cannot be accessed from client-side components

### Recommended Usage:

1. **Server-Side Only (Next.js API Routes):**
   - Use these keys only in Next.js API routes (`/api/*`)
   - Never use them in client-side components
   - Access via: `process.env.COINMARKETCAP_API_KEY` or `process.env.ALPHA_VANTAGE_API_KEY`

2. **If You Need Client-Side Access:**
   - Consider creating backend proxy endpoints instead
   - Backend endpoints can securely use the keys without exposing them

### Example: Next.js API Route (Server-Side)
```typescript
// frontend/src/app/api/crypto/route.ts
export async function GET() {
  const apiKey = process.env.COINMARKETCAP_API_KEY; // No NEXT_PUBLIC_ prefix = server-side only
  // Use API key here - this runs server-side only
  const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?CMC_PRO_API_KEY=${apiKey}`);
  return Response.json(await response.json());
}
```

---

## API Documentation

### CoinMarketCap API
- **Documentation:** https://coinmarketcap.com/api/documentation/v1/
- **Base URL:** `https://pro-api.coinmarketcap.com/v1/`
- **Header:** `X-CMC_PRO_API_KEY: {your_api_key}`
- **Or Query Param:** `?CMC_PRO_API_KEY={your_api_key}`

### Alpha Vantage API
- **Documentation:** https://www.alphavantage.co/documentation/
- **Base URL:** `https://www.alphavantage.co/query`
- **Query Param:** `?apikey={your_api_key}`

---

## Security Best Practices

1. ✅ **Never commit `.env` files to git** (already in `.gitignore`)
2. ✅ **Use backend endpoints** for API calls when possible
3. ✅ **Rotate keys** if they're ever exposed
4. ✅ **Use environment-specific keys** for production vs development
5. ⚠️ **Avoid `NEXT_PUBLIC_` prefix** for sensitive keys unless absolutely necessary

---

## Environment Files Structure

### Backend (`backend/.env`)
```
PORT=3001
POLYGON_API_KEY=...
COINMARKETCAP_API_KEY=f57f47a7cf8a4be29c69d1285b3b453e
ALPHA_VANTAGE_API_KEY=R07Z4MXUJOXSA6NE
REDIS_URL=redis://localhost:6379
...
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
COINMARKETCAP_API_KEY=f57f47a7cf8a4be29c69d1285b3b453e
ALPHA_VANTAGE_API_KEY=R07Z4MXUJOXSA6NE
...
```

---

## Next Steps

1. **For CoinMarketCap:**
   - Create backend service: `backend/services/coinmarketcapService.js`
   - Add API route: `backend/routes/crypto.js`
   - Use key from `process.env.COINMARKETCAP_API_KEY`

2. **For Alpha Vantage:**
   - Create backend service: `backend/services/alphaVantageService.js`
   - Add API route: `backend/routes/alphaVantage.js`
   - Use key from `process.env.ALPHA_VANTAGE_API_KEY`

3. **Frontend Integration:**
   - Call backend API endpoints (recommended)
   - Or use Next.js API routes for server-side calls
   - Never expose keys in client-side components

---

## Verification

To verify the keys are loaded correctly:

### Backend:
```bash
cd backend
node -e "require('dotenv').config(); console.log('CoinMarketCap:', process.env.COINMARKETCAP_API_KEY ? '✅ Loaded' : '❌ Missing'); console.log('Alpha Vantage:', process.env.ALPHA_VANTAGE_API_KEY ? '✅ Loaded' : '❌ Missing');"
```

### Frontend (Next.js API Routes):
```bash
cd frontend
node -e "require('dotenv').config({ path: '.env.local' }); console.log('CoinMarketCap:', process.env.COINMARKETCAP_API_KEY ? '✅ Loaded' : '❌ Missing'); console.log('Alpha Vantage:', process.env.ALPHA_VANTAGE_API_KEY ? '✅ Loaded' : '❌ Missing');"
```

---

## Support

If you need to:
- **Rotate keys:** Update both `.env` files
- **Remove keys:** Delete the lines from `.env` files
- **Add new keys:** Follow the same pattern and update this documentation

