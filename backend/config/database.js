/**
 * Database Configuration Module
 * Centralized configuration for PostgreSQL, Redis, and TimescaleDB
 * Automatically selects the correct database based on environment
 */

require('dotenv').config();

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'local';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || NODE_ENV === 'local';

// Database name mapping based on environment
const getDatabaseName = () => {
  if (USE_MOCK_DATA || NODE_ENV === 'local') {
    return process.env.DB_NAME_LOCAL || 'stockdb_local';
  } else if (NODE_ENV === 'development' || NODE_ENV === 'dev') {
    return process.env.DB_NAME_DEV || 'stockdb_dev';
  } else if (NODE_ENV === 'production' || NODE_ENV === 'prod') {
    return process.env.DB_NAME_PROD || 'stockdb_prod';
  }
  // Default fallback
  return process.env.DB_NAME || 'stockdb';
};

// Redis database index mapping (Redis uses numeric database indices 0-15)
const getRedisDatabase = () => {
  if (USE_MOCK_DATA || NODE_ENV === 'local') {
    return parseInt(process.env.REDIS_DB_LOCAL || '0', 10); // Database 0 for local/mock
  } else if (NODE_ENV === 'development' || NODE_ENV === 'dev') {
    return parseInt(process.env.REDIS_DB_DEV || '1', 10); // Database 1 for dev
  } else if (NODE_ENV === 'production' || NODE_ENV === 'prod') {
    return parseInt(process.env.REDIS_DB_PROD || '2', 10); // Database 2 for prod
  }
  return parseInt(process.env.REDIS_DB || '0', 10);
};

// PostgreSQL Configuration
const getPostgresConfig = () => {
  const dbName = getDatabaseName();
  
  return {
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: dbName,
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10),
  };
};

// Redis Configuration
const getRedisConfig = () => {
  const redisDb = getRedisDatabase();
  const baseUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Parse the base URL and add database index
  let url;
  try {
    url = new URL(baseUrl);
    url.searchParams.set('db', redisDb.toString());
  } catch (error) {
    // If URL parsing fails, construct from components
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT || '6379';
    url = new URL(`redis://${host}:${port}`);
    url.searchParams.set('db', redisDb.toString());
  }
  
  return {
    url: url.toString(),
    socket: {
      host: process.env.REDIS_HOST || url.hostname || 'localhost',
      port: parseInt(process.env.REDIS_PORT || url.port || '6379', 10),
    },
    database: redisDb,
    // Connection options
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };
};

// Export configuration
module.exports = {
  // Environment info
  NODE_ENV,
  USE_MOCK_DATA,
  isLocal: USE_MOCK_DATA || NODE_ENV === 'local',
  isDev: NODE_ENV === 'development' || NODE_ENV === 'dev',
  isProd: NODE_ENV === 'production' || NODE_ENV === 'prod',
  
  // Database names
  databaseName: getDatabaseName(),
  redisDatabase: getRedisDatabase(),
  
  // Configuration getters
  getPostgresConfig,
  getRedisConfig,
  getDatabaseName,
  getRedisDatabase,
  
  // Helper to create Redis client
  createRedisClient: () => {
    const redis = require('redis');
    const config = getRedisConfig();
    const client = redis.createClient(config);
    
    // Add error handlers
    client.on('error', (err) => {
      console.error(`Redis (${config.database}) connection error:`, err.message);
    });
    
    client.on('connect', () => {
      console.log(`✅ Redis connected to database ${config.database} (${NODE_ENV} environment)`);
    });
    
    return client;
  },
};

