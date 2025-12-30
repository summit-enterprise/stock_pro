# Database Tools & Connection Information

## Recommended Database Management Tools

### Option 1: DBeaver (Recommended - Free, Open Source)
**Best for: PostgreSQL and Redis (via extensions)**

- **Download**: https://dbeaver.io/download/
- **Features**:
  - Free and open source
  - Supports PostgreSQL natively
  - Redis support via extensions
  - Cross-platform (Windows, Mac, Linux)
  - SQL editor with syntax highlighting
  - Data visualization and export

**Installation**:
1. Download DBeaver Community Edition (free)
2. Install and launch
3. Use connection details below

---

### Option 2: pgAdmin (PostgreSQL) + RedisInsight (Redis)
**Best for: Separate specialized tools**

**PostgreSQL - pgAdmin**:
- **Download**: https://www.pgadmin.org/download/
- **Features**: Official PostgreSQL administration tool
- **Installation**: Download and install pgAdmin 4

**Redis - RedisInsight**:
- **Download**: https://redis.com/redis-enterprise/redis-insight/
- **Features**: Official Redis GUI tool
- **Installation**: Download RedisInsight desktop app

---

### Option 3: TablePlus (Paid, but excellent UI)
**Best for: Both PostgreSQL and Redis in one tool**

- **Download**: https://tableplus.com/
- **Features**:
  - Beautiful, modern interface
  - Supports both PostgreSQL and Redis
  - Free trial, then paid ($89 one-time)
  - Mac, Windows, Linux

---

### Option 4: DataGrip (JetBrains - Paid)
**Best for: Professional developers**

- **Download**: https://www.jetbrains.com/datagrip/
- **Features**:
  - Professional IDE for databases
  - Supports PostgreSQL and Redis
  - Paid subscription ($199/year)
  - Excellent SQL editor and debugging

---

## Connection Information

### PostgreSQL Connection Details

```
Host: localhost
Port: 5432
Database: stockdb
Username: user
Password: password
```

**Connection String**:
```
postgresql://user:password@localhost:5432/stockdb
```

**Environment Variables** (if using .env file):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stockdb
DB_USER=user
DB_PASSWORD=password
```

**Docker Connection** (if using docker-compose):
- Same as above (ports are mapped to localhost)

---

### Redis Connection Details

```
Host: localhost
Port: 6379
Password: (none - no password by default)
```

**Connection String**:
```
redis://localhost:6379
```

**Docker Connection** (if using docker-compose):
- Same as above (ports are mapped to localhost)

---

## Quick Setup Instructions

### For DBeaver:

1. **PostgreSQL Connection**:
   - Open DBeaver
   - Click "New Database Connection"
   - Select "PostgreSQL"
   - Enter:
     - Host: `localhost`
     - Port: `5432`
     - Database: `stockdb`
     - Username: `user`
     - Password: `password`
   - Click "Test Connection"
   - Click "Finish"

2. **Redis Connection** (requires Redis extension):
   - Install Redis extension in DBeaver (if available)
   - Or use RedisInsight separately (see Option 2)

### For pgAdmin:

1. Open pgAdmin
2. Right-click "Servers" → "Create" → "Server"
3. General tab:
   - Name: `Stock App DB`
4. Connection tab:
   - Host: `localhost`
   - Port: `5432`
   - Database: `stockdb`
   - Username: `user`
   - Password: `password`
5. Click "Save"

### For RedisInsight:

1. Download and install RedisInsight
2. Click "Add Redis Database"
3. Enter:
   - Host: `localhost`
   - Port: `6379`
   - Database Alias: `Stock App Redis`
4. Click "Add Redis Database"

---

## Database Tables (PostgreSQL)

Your database contains the following tables:

1. **users** - User accounts and authentication
2. **asset_info** - Asset metadata (symbols, names, exchanges)
3. **asset_data** - Historical price data (OHLCV)
4. **watchlist** - User watchlists

See `DATABASE_VISUALIZATION.md` for detailed schema information.

---

## Redis Keys Structure

Redis is used for caching with the following key patterns:

- `stock:{symbol}` - Cached stock data (TTL: 60 seconds)
- `news:{category}` - Cached news articles (TTL: 9000 seconds)
- `news:{category}:{country}` - Country-specific news
- `news:{category}:{query}` - Query-based news

---

## Troubleshooting

### Cannot connect to PostgreSQL:
1. Check if Docker container is running: `docker ps`
2. Start containers: `docker-compose up -d`
3. Verify port 5432 is not blocked

### Cannot connect to Redis:
1. Check if Redis container is running: `docker ps`
2. Start containers: `docker-compose up -d`
3. Verify port 6379 is not blocked

### Connection timeout:
- Make sure Docker containers are running
- Check firewall settings
- Verify ports are correctly mapped in docker-compose.yml

---

## My Recommendation

**For beginners**: Use **DBeaver** for PostgreSQL and **RedisInsight** for Redis (both free)

**For professionals**: Use **TablePlus** (paid but excellent) or **DataGrip** (if you have JetBrains subscription)

