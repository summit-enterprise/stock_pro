/**
 * Populate Redis Cache with Daily Records
 * 
 * This script caches today's daily record for all assets in Redis.
 * This is used for fast 1D chart access.
 * 
 * Usage:
 *   node scripts/populateRedisDailyCache.js
 */

require('dotenv').config();
const { pool } = require('../db');
const { getRedisClient } = require('../config/redis');

async function populateRedisDailyCache() {
  try {
    console.log('🚀 Starting Redis daily cache population...\n');

    const redisClient = await getRedisClient();
    if (!redisClient || !redisClient.isOpen) {
      console.error('❌ Redis client not available');
      return;
    }

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all asset symbols
    const symbolsResult = await pool.query(
      `SELECT DISTINCT symbol FROM asset_info ORDER BY symbol`
    );

    if (symbolsResult.rows.length === 0) {
      console.log('⚠️  No assets found in database');
      return;
    }

    const symbols = symbolsResult.rows.map(row => row.symbol);
    console.log(`📊 Processing ${symbols.length} assets...\n`);

    let cached = 0;
    let notFound = 0;
    let errors = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      for (const symbol of batch) {
        try {
          // Get today's daily record (or most recent if today doesn't exist)
          const result = await pool.query(
            `SELECT date, open, high, low, close, volume
             FROM asset_data
             WHERE symbol = $1
               AND timestamp IS NULL
             ORDER BY date DESC
             LIMIT 1`,
            [symbol]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            const dailyRecord = {
              date: row.date instanceof Date 
                ? row.date.toISOString().split('T')[0] 
                : row.date,
              open: parseFloat(row.open),
              high: parseFloat(row.high),
              low: parseFloat(row.low),
              close: parseFloat(row.close),
              volume: parseFloat(row.volume) || 0,
            };

            // Cache in Redis with date-specific key
            const cacheKey = `daily_data:${symbol}:${dailyRecord.date}`;
            await redisClient.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(dailyRecord)); // 24 hour TTL
            cached++;
          } else {
            notFound++;
          }
        } catch (error) {
          console.error(`   ❌ Error caching ${symbol}:`, error.message);
          errors++;
        }
      }

      console.log(`📊 Progress: ${Math.min(i + batchSize, symbols.length)}/${symbols.length} assets processed`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 CACHE POPULATION SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Assets Processed: ${symbols.length}`);
    console.log(`Daily Records Cached: ${cached}`);
    console.log(`No Data Found: ${notFound}`);
    console.log(`Errors: ${errors}\n`);
    console.log('✅ Redis daily cache population complete!\n');

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  populateRedisDailyCache()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateRedisDailyCache };


