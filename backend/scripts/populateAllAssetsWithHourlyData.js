/**
 * Populate All Assets with Hourly and Daily Data
 * Ensures every asset has both hourly data (for 1D and 7D) and daily data (for longer ranges)
 */

require('dotenv').config();
const { pool } = require('../db');
const { generateExtendedHistoricalData, BASE_PRICES } = require('../services/utils/mockData');

async function populateAllAssetsWithHourlyData() {
  try {
    console.log('🚀 Starting comprehensive data population for all assets...\n');

    // First, ensure timestamp column exists
    console.log('1. Ensuring timestamp column exists...');
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'asset_data' 
          AND column_name = 'timestamp';
      `);

      if (columnCheck.rows.length === 0) {
        await pool.query(`
          ALTER TABLE asset_data ADD COLUMN timestamp TIMESTAMP DEFAULT NULL;
        `);
        console.log('   ✅ Timestamp column added\n');
      } else {
        console.log('   ✅ Timestamp column already exists\n');
      }
    } catch (error) {
      console.error('   ⚠️  Error checking/adding timestamp column:', error.message);
    }

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
    let assetsSkipped = 0;

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

          // Generate 10 years of data (approximately 2520 trading days) with hourly data for last 7 days
          const { daily, hourly } = generateExtendedHistoricalData(symbol, true);

          // Insert daily data in batches (timestamp = NULL for daily records)
          const dailyBatchSize = 100;
          for (let j = 0; j < daily.length; j += dailyBatchSize) {
            const dailyBatch = daily.slice(j, j + dailyBatchSize);
            
            // Use parameterized queries for safety
            for (const point of dailyBatch) {
              const dateStr = point.date.toISOString().split('T')[0];
              try {
                await pool.query(
                  `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
                   VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
                   open = EXCLUDED.open,
                   high = EXCLUDED.high,
                   low = EXCLUDED.low,
                   close = EXCLUDED.close,
                   volume = EXCLUDED.volume,
                   adjusted_close = EXCLUDED.adjusted_close`,
                  [
                    symbol,
                    dateStr,
                    point.open,
                    point.high,
                    point.low,
                    point.close,
                    point.volume,
                    point.close
                  ]
                );
                totalDailyRecords++;
              } catch (error) {
                // Ignore duplicate key errors, but log others
                if (!error.message.includes('duplicate key') && !error.message.includes('unique constraint')) {
                  console.error(`   ⚠️  Error inserting daily data for ${symbol} on ${dateStr}:`, error.message);
                }
              }
            }
          }

          // Insert hourly data (timestamp IS NOT NULL for hourly records)
          if (hourly.length > 0) {
            const hourlyBatchSize = 50;
            for (let j = 0; j < hourly.length; j += hourlyBatchSize) {
              const hourlyBatch = hourly.slice(j, j + hourlyBatchSize);
              
              // Use parameterized queries for safety
              for (const point of hourlyBatch) {
                const dateStr = point.date.toISOString().split('T')[0];
                const timestampStr = point.date.toISOString();
                try {
                  await pool.query(
                    `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
                     open = EXCLUDED.open,
                     high = EXCLUDED.high,
                     low = EXCLUDED.low,
                     close = EXCLUDED.close,
                     volume = EXCLUDED.volume,
                     adjusted_close = EXCLUDED.adjusted_close`,
                    [
                      symbol,
                      dateStr,
                      timestampStr,
                      point.open,
                      point.high,
                      point.low,
                      point.close,
                      point.volume,
                      point.close
                    ]
                  );
                  totalHourlyRecords++;
                } catch (error) {
                  // Ignore duplicate key errors, but log others
                  if (!error.message.includes('duplicate key') && !error.message.includes('unique constraint')) {
                    console.error(`   ⚠️  Error inserting hourly data for ${symbol} at ${timestampStr}:`, error.message);
                  }
                }
              }
            }
          }

          assetsProcessed++;
          console.log(`   ✅ ${symbol}: ${daily.length} daily records, ${hourly.length} hourly records`);

        } catch (error) {
          console.error(`   ❌ Error processing ${symbol}:`, error.message);
          assetsSkipped++;
        }
      }

      console.log(`\n   Progress: ${Math.min(i + batchSize, assets.length)}/${assets.length} assets processed\n`);
    }

    console.log('\n✅ Comprehensive data population completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Assets processed: ${assetsProcessed}`);
    console.log(`   Assets skipped: ${assetsSkipped}`);
    console.log(`   Daily records inserted: ${totalDailyRecords}`);
    console.log(`   Hourly records inserted: ${totalHourlyRecords}`);
    console.log(`   Total records: ${totalDailyRecords + totalHourlyRecords}\n`);

    // Verify data
    console.log('🔍 Verifying data...');
    const verifyResult = await pool.query(`
      SELECT 
        symbol,
        COUNT(*) FILTER (WHERE timestamp IS NULL) as daily_count,
        COUNT(*) FILTER (WHERE timestamp IS NOT NULL) as hourly_count,
        COUNT(*) as total_count
      FROM asset_data
      GROUP BY symbol
      ORDER BY symbol
      LIMIT 10
    `);
    
    console.log('\n📋 Sample verification (first 10 assets):');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.symbol}: ${row.daily_count} daily, ${row.hourly_count} hourly, ${row.total_count} total`);
    });

  } catch (error) {
    console.error('❌ Error populating data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  populateAllAssetsWithHourlyData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateAllAssetsWithHourlyData };

