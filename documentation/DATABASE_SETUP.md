# Database Setup Guide

This guide explains how to set up separate databases for local/mock, development, and production environments.

## Overview

The application uses environment-based database selection:
- **Local/Mock**: `stockdb_local` (PostgreSQL) + Redis DB `0`
- **Development**: `stockdb_dev` (PostgreSQL) + Redis DB `1`
- **Production**: `stockdb_prod` (PostgreSQL) + Redis DB `2`

## Database Configuration

The database configuration is centralized in `backend/config/database.js` and automatically selects the correct database based on:

1. `NODE_ENV` environment variable
2. `USE_MOCK_DATA` environment variable

### Environment Variables

Add these to your `.env` file:

```bash
# Environment
NODE_ENV=local          # Options: local, development/dev, production/prod
USE_MOCK_DATA=true      # Set to true for local/mock data, false for real APIs

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password

# Database Names (optional - defaults provided)
DB_NAME_LOCAL=stockdb_local    # Default for local/mock
DB_NAME_DEV=stockdb_dev        # Default for development
DB_NAME_PROD=stockdb_prod      # Default for production

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Redis Database Indices (optional - defaults provided)
REDIS_DB_LOCAL=0    # Default for local/mock
REDIS_DB_DEV=1      # Default for development
REDIS_DB_PROD=2     # Default for production
```

## Setting Up Databases

### 1. Create PostgreSQL Databases

Run these commands in PostgreSQL:

```sql
-- Create databases
CREATE DATABASE stockdb_local;
CREATE DATABASE stockdb_dev;
CREATE DATABASE stockdb_prod;

-- Grant permissions (replace 'your_user' with your PostgreSQL user)
GRANT ALL PRIVILEGES ON DATABASE stockdb_local TO your_user;
GRANT ALL PRIVILEGES ON DATABASE stockdb_dev TO your_user;
GRANT ALL PRIVILEGES ON DATABASE stockdb_prod TO your_user;
```

### 2. Enable TimescaleDB Extension

For each database, enable the TimescaleDB extension:

```sql
-- Connect to each database and run:
\c stockdb_local
CREATE EXTENSION IF NOT EXISTS timescaledb;

\c stockdb_dev
CREATE EXTENSION IF NOT EXISTS timescaledb;

\c stockdb_prod
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 3. Initialize Schema

The schema will be automatically created when you start the application. The `initDb()` function in `backend/db.js` will:

- Create all necessary tables
- Set up TimescaleDB hypertables for `asset_data`
- Create indexes for optimal performance
- Run migrations for existing tables

### 4. Redis Setup

Redis uses database indices (0-15) to separate data:

- **Database 0**: Local/Mock data
- **Database 1**: Development data
- **Database 2**: Production data

No additional setup is required - Redis will automatically use the correct database index based on your environment.

## Environment-Specific Setup

### Local/Mock Development

```bash
# .env file
NODE_ENV=local
USE_MOCK_DATA=true
DB_NAME=stockdb_local
REDIS_DB=0
```

This will:
- Use `stockdb_local` PostgreSQL database
- Use Redis database index `0`
- Use mock data services instead of real APIs

### Development Environment

```bash
# .env file
NODE_ENV=development
USE_MOCK_DATA=false
DB_NAME=stockdb_dev
REDIS_DB=1
```

This will:
- Use `stockdb_dev` PostgreSQL database
- Use Redis database index `1`
- Use real API services

### Production Environment

```bash
# .env file
NODE_ENV=production
USE_MOCK_DATA=false
DB_NAME=stockdb_prod
REDIS_DB=2
```

This will:
- Use `stockdb_prod` PostgreSQL database
- Use Redis database index `2`
- Use real API services

## Using the Configuration

### In Your Code

The database configuration is automatically used:

```javascript
// PostgreSQL - automatically uses correct database
const { pool } = require('./db');

// Redis - automatically uses correct database index
const { getRedisClient } = require('./config/redis');
const redisClient = await getRedisClient();
```

### Manual Database Selection

If you need to manually select a database:

```javascript
const { getPostgresConfig, getRedisConfig } = require('./config/database');

const pgConfig = getPostgresConfig();
const redisConfig = getRedisConfig();
```

## Migration Between Environments

### Copying Data Between Databases

To copy data from one environment to another:

```bash
# Export from source database
pg_dump -U username -d stockdb_local > local_backup.sql

# Import to target database
psql -U username -d stockdb_dev < local_backup.sql
```

### Redis Data Migration

Redis data is stored in separate database indices, so no migration is needed. Each environment uses its own index automatically.

## Troubleshooting

### Database Connection Issues

1. **Check environment variables**: Ensure `NODE_ENV` and database credentials are set correctly
2. **Verify database exists**: Make sure the database has been created
3. **Check permissions**: Ensure your PostgreSQL user has access to the database
4. **Check connection string**: Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` are correct

### Redis Connection Issues

1. **Check Redis is running**: `redis-cli ping` should return `PONG`
2. **Verify Redis URL**: Check `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`
3. **Check database index**: Verify the correct database index is being used (check logs)

### TimescaleDB Issues

1. **Extension not installed**: Run `CREATE EXTENSION timescaledb;` in your database
2. **Hypertable not created**: The `initDb()` function should create hypertables automatically
3. **Check logs**: Look for TimescaleDB-specific error messages

## Best Practices

1. **Never mix environments**: Always use separate databases for local, dev, and prod
2. **Use environment variables**: Never hardcode database names or credentials
3. **Backup regularly**: Set up automated backups for production database
4. **Monitor connections**: Keep an eye on connection pool usage
5. **Test migrations**: Always test schema changes in local/dev before production

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Redis Documentation](https://redis.io/documentation)



