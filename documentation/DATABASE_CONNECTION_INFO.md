# Database Connection Information

## PostgreSQL Connection Details

### Connection Parameters

```
Host: localhost
Port: 5432
Database: stockdb
Username: user
Password: password
```

### Connection String

```
postgresql://user:password@localhost:5432/stockdb
```

### Environment Variables

If using `.env` file in `backend/`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stockdb
DB_USER=user
DB_PASSWORD=password
```

### Docker Connection

If using `docker-compose.yml`:
- Same connection details as above
- Ports are mapped to localhost:5432

### Quick Connect Commands

**Using psql:**
```bash
psql -h localhost -p 5432 -U user -d stockdb
# Password: password
```

**Using connection string:**
```bash
psql postgresql://user:password@localhost:5432/stockdb
```

---

## Redis Connection Details

### Connection Parameters

```
Host: localhost
Port: 6379
Password: (none - no password by default)
Database: 0 (default)
```

### Connection String

```
redis://localhost:6379
```

### Docker Connection

If using `docker-compose.yml`:
- Same connection details as above
- Ports are mapped to localhost:6379

### Quick Connect Commands

**Using redis-cli:**
```bash
redis-cli -h localhost -p 6379
```

**Using connection string:**
```bash
redis-cli -u redis://localhost:6379
```

---

## Database Tools Setup

### Recommended Tools

1. **DBeaver** (Free) - For PostgreSQL
   - Download: https://dbeaver.io/download/
   - Supports both PostgreSQL and Redis (via extensions)

2. **pgAdmin** (Free) - For PostgreSQL
   - Download: https://www.pgadmin.org/download/

3. **RedisInsight** (Free) - For Redis
   - Download: https://redis.com/redis-enterprise/redis-insight/

4. **TablePlus** (Paid) - For both
   - Download: https://tableplus.com/

### DBeaver Setup

**PostgreSQL:**
1. New Database Connection → PostgreSQL
2. Host: `localhost`
3. Port: `5432`
4. Database: `stockdb`
5. Username: `user`
6. Password: `password`

**Redis:**
1. Install Redis extension in DBeaver
2. New Database Connection → Redis
3. Host: `localhost`
4. Port: `6379`

### pgAdmin Setup

1. Right-click "Servers" → Create → Server
2. Name: `Stock App DB`
3. Connection tab:
   - Host: `localhost`
   - Port: `5432`
   - Database: `stockdb`
   - Username: `user`
   - Password: `password`

### RedisInsight Setup

1. Download and install RedisInsight
2. Add Redis Database
3. Host: `localhost`
4. Port: `6379`
5. Database Alias: `Stock App Redis`

---

## Database Tables Overview

### PostgreSQL Tables

1. **users** - User accounts and authentication
2. **asset_info** - Asset metadata (symbols, names, exchanges)
3. **asset_data** - Historical price data (OHLCV) - TimescaleDB hypertable
4. **watchlist** - User watchlists

### Redis Keys

- `stock:{symbol}` - Cached stock data (TTL: 60 seconds)
- `news:{category}` - Cached news articles (TTL: 9000 seconds / 2.5 hours)
- `news:{category}:{country}` - Country-specific news
- `news:{category}:{query}` - Query-based news

---

## Verification

### Test PostgreSQL Connection

```bash
psql -h localhost -p 5432 -U user -d stockdb -c "SELECT version();"
```

### Test Redis Connection

```bash
redis-cli -h localhost -p 6379 ping
# Should return: PONG
```

### Check Docker Containers

```bash
docker ps
# Should show postgres and redis containers running
```

---

## Troubleshooting

### Cannot Connect to PostgreSQL

1. Check if Docker container is running:
   ```bash
   docker ps | grep postgres
   ```

2. Start containers:
   ```bash
   docker-compose up -d
   ```

3. Check logs:
   ```bash
   docker logs stock-pro-postgres-1
   ```

### Cannot Connect to Redis

1. Check if Docker container is running:
   ```bash
   docker ps | grep redis
   ```

2. Start containers:
   ```bash
   docker-compose up -d
   ```

3. Check logs:
   ```bash
   docker logs stock-pro-redis-1
   ```

### Connection Timeout

- Verify ports 5432 and 6379 are not blocked by firewall
- Check if other applications are using these ports
- Ensure Docker containers are running and ports are mapped correctly

