/**
 * Populate 10 Years of Historical Data Script
 * Generates 10 years of daily pricing data for all existing assets
 * Also generates hourly data for the last 7 days
 */

require('dotenv').config();
const { pool } = require('../db');
const { generateExtendedHistoricalData, BASE_PRICES } = require('../services/utils/mockData');

async function populate10YearsData() {
  try {
    console.log('🚀 Starting 10-year historical data population...\n');

    // Get all existing assets from database
    const assetsResult = await pool.query(
      `SELECT DISTINCT symbol FROM asset_info ORDER BY symbol`
    );

    if (assetsResult.rows.length === 0) {
      console.log('⚠️  No assets found in database. Please populate assets first.\n');
      return;
    }

    const assets = assetsResult.rows.map(row => row.symbol);
    console.log(`📊 Found ${assets.length} assets to populate\n`);

    let totalDailyRecords = 0;
    let totalHourlyRecords = 0;
    let assetsProcessed = 0;

    // Process assets in batches
    const batchSize = 10;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      for (const symbol of batch) {
        try {
          console.log(`Processing ${symbol}...`);

          // Check existing data count
          const existingCount = await pool.query(
            'SELECT COUNT(*) as count FROM asset_data WHERE symbol = $1',
            [symbol]
          );
          const existingRecords = parseInt(existingCount.rows[0].count);

          // Generate 10 years of data (approximately 2520 trading days)
          const { daily, hourly } = generateExtendedHistoricalData(symbol, true);

          // Insert daily data in batches
          const dailyBatchSize = 100;
          for (let j = 0; j < daily.length; j += dailyBatchSize) {
            const dailyBatch = daily.slice(j, j + dailyBatchSize);
            const values = dailyBatch.map((point) => {
              const dateStr = point.date.toISOString().split('T')[0];
              return `('${symbol}', '${dateStr}', NULL, ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume}, ${point.close})`;
            }).join(',');

            try {
              await pool.query(
                `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
                 VALUES ${values}
                 ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
                 open = EXCLUDED.open,
                 high = EXCLUDED.high,
                 low = EXCLUDED.low,
                 close = EXCLUDED.close,
                 volume = EXCLUDED.volume,
                 adjusted_close = EXCLUDED.adjusted_close`
              );
              totalDailyRecords += dailyBatch.length;
            } catch (error) {
              console.error(`   ⚠️  Error inserting daily data for ${symbol}:`, error.message);
            }
          }

          // Insert hourly data
          if (hourly.length > 0) {
            const hourlyBatchSize = 50;
            for (let j = 0; j < hourly.length; j += hourlyBatchSize) {
              const hourlyBatch = hourly.slice(j, j + hourlyBatchSize);
              const values = hourlyBatch.map((point) => {
                const dateStr = point.date.toISOString().split('T')[0];
                const timestampStr = point.date.toISOString();
                return `('${symbol}', '${dateStr}', '${timestampStr}', ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume}, ${point.close})`;
              }).join(',');

              try {
                await pool.query(
                  `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
                   VALUES ${values}
                   ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
                   open = EXCLUDED.open,
                   high = EXCLUDED.high,
                   low = EXCLUDED.low,
                   close = EXCLUDED.close,
                   volume = EXCLUDED.volume,
                   adjusted_close = EXCLUDED.adjusted_close`
                );
                totalHourlyRecords += hourlyBatch.length;
              } catch (error) {
                console.error(`   ⚠️  Error inserting hourly data for ${symbol}:`, error.message);
              }
            }
          }

          assetsProcessed++;
          console.log(`   ✅ ${symbol}: ${daily.length} daily records, ${hourly.length} hourly records`);

        } catch (error) {
          console.error(`   ❌ Error processing ${symbol}:`, error.message);
        }
      }

      console.log(`\n   Progress: ${Math.min(i + batchSize, assets.length)}/${assets.length} assets processed\n`);
    }

    console.log('\n✅ 10-year data population completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Assets processed: ${assetsProcessed}`);
    console.log(`   Daily records inserted: ${totalDailyRecords}`);
    console.log(`   Hourly records inserted: ${totalHourlyRecords}`);
    console.log(`   Total records: ${totalDailyRecords + totalHourlyRecords}\n`);

  } catch (error) {
    console.error('❌ Error populating 10-year data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  populate10YearsData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populate10YearsData };


