# API Routes Reference

All API routes are available at `http://localhost:3001`

## Authentication Routes (`/api/auth`)

### POST `/api/auth/register`
Register a new user account
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### POST `/api/auth/login`
Login with email and password
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/auth/google`
Login/Register with Google OAuth
```json
{
  "googleId": "google_user_id",
  "email": "user@gmail.com",
  "name": "John Doe"
}
```

---

## Admin Routes (`/api/admin`)

**Note**: All admin routes require authentication with an admin JWT token

### POST `/api/admin/login`
Admin login (returns admin token)
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### POST `/api/admin/verify-token`
Verify and refresh admin token

### GET `/api/admin/users`
Get all regular users (admin only)

### GET `/api/admin/admins`
Get all admin users (admin only)

### PUT `/api/admin/users/:id`
Update user (admin only)
```json
{
  "email": "newemail@example.com",
  "name": "New Name",
  "is_admin": false
}
```

### DELETE `/api/admin/users/:id`
Delete user (admin only)

### POST `/api/admin/create-user`
Create new user (superuser only)
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "optional_password"
}
```

### POST `/api/admin/create-admin`
Create new admin (superuser only)
```json
{
  "email": "admin@example.com",
  "name": "Admin User"
}
```

### POST `/api/admin/create-superuser`
Create new superuser (superuser only)
```json
{
  "email": "superuser@example.com",
  "name": "Super User",
  "password": "optional_password"
}
```

---

## Asset Routes (`/api/assets`)

### GET `/api/assets/:symbol`
Get asset details and historical data
- Query params: `?range=1M` (1D, 1W, 1M, 3M, 6M, 1Y, 5Y)

Example: `GET /api/assets/AAPL?range=1M`

---

## Watchlist Routes (`/api/watchlist`)

**Note**: All watchlist routes require authentication

### GET `/api/watchlist`
Get user's watchlist

### POST `/api/watchlist`
Add symbol to watchlist
```json
{
  "symbol": "AAPL"
}
```

### DELETE `/api/watchlist/:symbol`
Remove symbol from watchlist

---

## Legacy Stock Route

### GET `/api/stock/:symbol`
Legacy stock data endpoint (uses Polygon.io API)

---

## Testing Routes

You can test routes using:

1. **cURL**:
```bash
# Test auth login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Test asset endpoint
curl http://localhost:3001/api/assets/AAPL?range=1M
```

2. **Postman** or **Insomnia**:
   - Import the routes above
   - Set base URL to `http://localhost:3001`

3. **Browser** (for GET requests):
   - `http://localhost:3001/api/assets/AAPL?range=1M`

---

## Authentication

Most routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Get a token by:
1. Registering: `POST /api/auth/register`
2. Logging in: `POST /api/auth/login` or `POST /api/admin/login`

---

## Frontend Pages

The frontend (Next.js) runs on `http://localhost:3000`

Currently available pages:
- `/` - Home page
- Other pages need to be created in `frontend/src/app/`

To create a new page, add a folder in `frontend/src/app/` with a `page.tsx` file.

