/**
 * Quick Hourly Data Generation for 1D
 * Generates hourly data for the last trading day for all assets
 */

require('dotenv').config();
const { pool } = require('../db');
const { generateHourlyData, BASE_PRICES, generateVolume } = require('../services/utils/mockData');

async function generateHourlyData1D() {
  try {
    console.log('🚀 Starting hourly data generation for 1D...\n');

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

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use today's date (generate hourly data for today)
    // If today is a weekend, use the most recent weekday
    let targetDate = new Date(today);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    console.log(`📅 Generating hourly data for ${dateStr} (today or most recent trading day)\n`);

    let totalHourlyRecords = 0;
    let assetsProcessed = 0;

    // Process assets in batches
    const batchSize = 50;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      // Get daily data for this date to use as base for hourly data
      const dailyDataResult = await pool.query(
        `SELECT open, high, low, close 
         FROM asset_data 
         WHERE symbol = $1 
           AND date = $2 
           AND timestamp IS NULL
         LIMIT 1`,
        [batch[0], dateStr]
      );

      for (const symbol of batch) {
        try {
          // Get daily data for this symbol and date
          const dailyResult = await pool.query(
            `SELECT open, high, low, close 
             FROM asset_data 
             WHERE symbol = $1 
               AND date = $2 
               AND timestamp IS NULL
             LIMIT 1`,
            [symbol, dateStr]
          );

          let daily;
          if (dailyResult.rows.length === 0) {
            // No daily data, generate it from base price
            const basePrice = BASE_PRICES[symbol] || 100.00;
            const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
            const dailyChange = (Math.random() * 2 - 1) * volatility;
            const open = basePrice;
            const close = open * (1 + dailyChange);
            const intradayVolatility = volatility * 0.5;
            const high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
            const low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
            
            daily = {
              open: parseFloat(open.toFixed(2)),
              high: parseFloat(high.toFixed(2)),
              low: parseFloat(low.toFixed(2)),
              close: parseFloat(close.toFixed(2))
            };
            
            // Insert daily data first
            await pool.query(
              `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $6)
               ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
               open = EXCLUDED.open,
               high = EXCLUDED.high,
               low = EXCLUDED.low,
               close = EXCLUDED.close,
               volume = EXCLUDED.volume,
               adjusted_close = EXCLUDED.adjusted_close`,
              [symbol, dateStr, daily.open, daily.high, daily.low, daily.close, generateVolume(symbol, daily.close)]
            );
          } else {
            daily = dailyResult.rows[0];
          }
          
          // Generate hourly data for this day
          const hourlyData = generateHourlyData(
            symbol,
            targetDate,
            parseFloat(daily.open),
            parseFloat(daily.high),
            parseFloat(daily.low),
            parseFloat(daily.close)
          );

          // Delete existing hourly data for this date
          await pool.query(
            `DELETE FROM asset_data 
            WHERE symbol = $1 
              AND date = $2 
              AND timestamp IS NOT NULL`,
            [symbol, dateStr]
          );

          // Insert hourly data in batches
          const hourlyBatchSize = 50;
          for (let j = 0; j < hourlyData.length; j += hourlyBatchSize) {
            const hourlyBatch = hourlyData.slice(j, j + hourlyBatchSize);
            const values = hourlyBatch.map((point) => {
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

    console.log('\n✅ Hourly data generation completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Assets processed: ${assetsProcessed}`);
    console.log(`   Hourly records inserted: ${totalHourlyRecords}`);
    console.log(`   Date: ${dateStr}\n`);

  } catch (error) {
    console.error('❌ Error generating hourly data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  generateHourlyData1D()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateHourlyData1D };

