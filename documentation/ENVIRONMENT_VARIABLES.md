# Environment Variables Reference

## Required Environment Variables

### Database Configuration

```bash
# Environment
NODE_ENV=local                    # Options: local, development/dev, production/prod
USE_MOCK_DATA=true                # Set to true for local/mock data, false for real APIs

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password

# Optional - Database Names (defaults provided)
DB_NAME_LOCAL=stockdb_local
DB_NAME_DEV=stockdb_dev
DB_NAME_PROD=stockdb_prod

# Redis
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional - Redis Database Indices (defaults provided)
REDIS_DB_LOCAL=0
REDIS_DB_DEV=1
REDIS_DB_PROD=2
```

## Quick Setup

1. Copy the example below to your `.env` file
2. Update the values for your environment
3. Run the database setup script: `./backend/scripts/setup-databases.sh`
4. Start your application

## Example .env File

```bash
NODE_ENV=local
USE_MOCK_DATA=true

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_URL=redis://localhost:6379

POLYGON_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
# ... other API keys
```

