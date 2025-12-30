# Routes Status Check

## ✅ All Routes Are Registered in server.js

Your `server.js` file has all routes properly registered:

```javascript
// Lines 17-20: Routes imported
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const assetRoutes = require('./routes/asset');
const watchlistRoutes = require('./routes/watchlist');

// Lines 23-26: Routes registered
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/watchlist', watchlistRoutes);
```

## Available Routes

### Backend API Routes (Port 3001)

1. **Authentication** (`/api/auth`)
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/auth/google`

2. **Admin** (`/api/admin`)
   - `POST /api/admin/login`
   - `POST /api/admin/verify-token`
   - `GET /api/admin/users`
   - `GET /api/admin/admins`
   - `PUT /api/admin/users/:id`
   - `DELETE /api/admin/users/:id`
   - `POST /api/admin/create-user` (superuser only)
   - `POST /api/admin/create-admin` (superuser only)
   - `POST /api/admin/create-superuser` (superuser only)

3. **Assets** (`/api/assets`)
   - `GET /api/assets/:symbol?range=1M`

4. **Watchlist** (`/api/watchlist`)
   - `GET /api/watchlist` (requires auth)
   - `POST /api/watchlist` (requires auth)
   - `DELETE /api/watchlist/:symbol` (requires auth)

5. **Legacy Stock** (`/api/stock`)
   - `GET /api/stock/:symbol`

### Frontend Pages (Port 3000)

1. **Home**: `http://localhost:3000/`
2. **Admin Panel**: `http://localhost:3000/admin`

## Troubleshooting

### If routes aren't working:

1. **Restart your backend server**:
   ```bash
   cd stock-pro/backend
   node server.js
   ```
   You should see: `Backend on port 3001`

2. **Check for errors** when the server starts - if routes fail to load, you'll see errors in the console

3. **Test a route**:
   ```bash
   curl http://localhost:3001/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test","password":"test"}'
   ```

4. **Verify route files exist**:
   - ✅ `backend/routes/auth.js`
   - ✅ `backend/routes/admin.js`
   - ✅ `backend/routes/asset.js`
   - ✅ `backend/routes/watchlist.js`

### Common Issues:

- **404 errors**: Make sure backend is running on port 3001
- **CORS errors**: CORS is enabled in server.js (line 10)
- **Route not found**: Check the URL - backend routes are at `/api/*`

## Quick Test

Test if your server is running and routes are working:

```bash
# Test auth route
curl http://localhost:3001/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Test assets route (should work even without auth)
curl http://localhost:3001/api/assets/AAPL?range=1M
```

If these return responses (even error responses), your routes are working!

