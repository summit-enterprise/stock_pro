/**
 * Centralized Redis Client Module
 * Provides a singleton Redis client that automatically connects to the correct database
 * based on environment (local/mock, dev, prod)
 */

const { createRedisClient, redisDatabase, NODE_ENV } = require('./database');

// Singleton Redis client instance
let redisClient = null;

/**
 * Get or create the Redis client
 * @returns {Promise<RedisClient>} Redis client instance
 */
const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createRedisClient();
    
    try {
      await redisClient.connect();
      console.log(`✅ Redis: Connected to database ${redisDatabase} (${NODE_ENV} environment)`);
    } catch (error) {
      console.error(`❌ Redis: Failed to connect to database ${redisDatabase}:`, error.message);
      console.warn('⚠️  Continuing without Redis cache...');
      redisClient = null;
      return null;
    }
  }
  
  return redisClient;
};

/**
 * Initialize Redis connection (call this at app startup)
 */
const initRedis = async () => {
  return await getRedisClient();
};

/**
 * Check if Redis is available and connected
 */
const isRedisAvailable = () => {
  return redisClient && redisClient.isOpen;
};

/**
 * Close Redis connection (call this on app shutdown)
 */
const closeRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

module.exports = {
  getRedisClient,
  initRedis,
  isRedisAvailable,
  closeRedis,
  // Export the client directly for backward compatibility (but prefer getRedisClient)
  get client() {
    return redisClient;
  },
};



