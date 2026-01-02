/**
 * Populate 7 Days of Data (Including Weekends)
 * Generates 7 days of daily data including weekends with flat prices
 */

require('dotenv').config();
const { pool } = require('../db');
const { generate7DaysData, BASE_PRICES } = require('../services/utils/mockData');

async function populate7DaysData() {
  try {
    console.log('🚀 Starting 7-day data population (including weekends)...\n');

    // Get all existing assets from database
    const assetsResult = await pool.query(
      `SELECT DISTINCT symbol FROM asset_info ORDER BY symbol`
    );

    if (assetsResult.rows.length === 0) {
      console.log('⚠️  No assets found in database. Please populate assets first.\n');
      return;
    }

    const assets = assetsResult.rows.map(row => row.symbol);
    console.log(`📊 Found ${assets.length} assets to process\n`);

    let totalRecords = 0;
    let assetsProcessed = 0;

    // Process assets in batches
    const batchSize = 50;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      for (const symbol of batch) {
        try {
          // Generate 7 days of data (including weekends)
          const sevenDaysData = generate7DaysData(symbol);

          // Insert data in batches
          const batchSize = 50;
          for (let j = 0; j < sevenDaysData.length; j += batchSize) {
            const dataBatch = sevenDaysData.slice(j, j + batchSize);
            const values = dataBatch.map((point) => {
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
              totalRecords += dataBatch.length;
            } catch (error) {
              console.error(`   ⚠️  Error inserting data for ${symbol}:`, error.message);
            }
          }

          assetsProcessed++;
          if (assetsProcessed % 100 === 0) {
            console.log(`   Progress: ${assetsProcessed}/${assets.length} assets processed`);
          }

        } catch (error) {
          console.error(`   ❌ Error processing ${symbol}:`, error.message);
        }
      }

      if ((i + batchSize) % 500 === 0) {
        console.log(`\n   Batch progress: ${Math.min(i + batchSize, assets.length)}/${assets.length} assets processed\n`);
      }
    }

    console.log('\n✅ 7-day data population completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Assets processed: ${assetsProcessed}`);
    console.log(`   Records inserted: ${totalRecords}`);
    console.log(`   (7 days per asset, including weekends with flat prices)\n`);

  } catch (error) {
    console.error('❌ Error populating 7-day data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  populate7DaysData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populate7DaysData };


