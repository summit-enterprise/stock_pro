/**
 * Generate 10 Years of Mock Data for All Assets
 * 
 * This script generates 10 years of historical daily data for all assets
 * using the mock data service, following the ETL architecture.
 * 
 * Usage:
 *   node scripts/generate10YearsMockData.js [symbols...]
 * 
 * Examples:
 *   node scripts/generate10YearsMockData.js              # All assets
 *   node scripts/generate10YearsMockData.js AAPL MSFT     # Specific symbols
 */

require('dotenv').config();
const { pool } = require('../db');
const { generateExtendedHistoricalData, BASE_PRICES } = require('../services/utils/mockData');

async function generate10YearsMockData() {
  const args = process.argv.slice(2);
  const symbols = args.length > 0 ? args : null;

  try {
    console.log('🚀 Starting 10-year mock data generation...\n');

    // Get assets to process (only real assets, exclude fake/mock assets)
    let assetSymbols;
    if (symbols && symbols.length > 0) {
      assetSymbols = symbols;
      console.log(`📊 Processing ${assetSymbols.length} specified symbols:`, assetSymbols.join(', '));
    } else {
      // Filter out fake/mock assets using the same patterns as search route
      const result = await pool.query(`
        SELECT DISTINCT symbol 
        FROM asset_info 
        WHERE 
          -- Exclude fake/mock assets
          (name IS NULL OR (
            name !~* 'Tech Company \\d+'
            AND name !~* 'Finance Company \\d+'
            AND name !~* 'Healthcare Company \\d+'
            AND name !~* 'Consumer Company \\d+'
            AND name !~* 'Industrial Company \\d+'
            AND name !~* 'Energy Company \\d+'
            AND name !~* '^ETF \\d+'
            AND name !~* '^CRYPTO\\d+'
            AND name !~* '^AI \\d+ Inc\\.?$'
            AND name !~* '^AI\\d+$'
            AND name !~* '^AA\\d+$'
          ))
          AND (symbol IS NULL OR (
            symbol !~* '^FN[A-Z]\\d+$'
            AND symbol !~* '^HC[A-Z]\\d+$'
            AND symbol !~* '^CS[A-Z]\\d+$'
            AND symbol !~* '^IN[A-Z]\\d+$'
            AND symbol !~* '^EN[A-Z]\\d+$'
            AND symbol !~* '^ETF[A-Z]\\d+$'
          ))
        ORDER BY symbol
      `);
      assetSymbols = result.rows.map(row => row.symbol);
      console.log(`📊 Processing ${assetSymbols.length} real assets from database (fake/mock assets excluded)`);
    }

    if (assetSymbols.length === 0) {
      console.log('⚠️  No assets found. Please populate assets first.');
      return;
    }

    console.log(`\n📅 Generating 10 years of daily data for each asset...\n`);

    let totalRecords = 0;
    let processed = 0;
    let errors = 0;
    const batchSize = 50;

    // Process assets in batches
    for (let i = 0; i < assetSymbols.length; i += batchSize) {
      const batch = assetSymbols.slice(i, i + batchSize);
      
      for (const symbol of batch) {
        try {
          console.log(`📊 Processing ${symbol}...`);

          // Generate 10 years of historical data (daily only, no hourly)
          const historicalData = generateExtendedHistoricalData(symbol, false); // false = no hourly data
          const dailyData = historicalData.daily;
          
          // Delete existing daily data for this symbol to prevent duplicates
          await pool.query(
            `DELETE FROM asset_data 
             WHERE symbol = $1 AND timestamp IS NULL`,
            [symbol]
          );

          if (dailyData.length === 0) {
            console.log(`   ⚠️  No data generated for ${symbol}`);
            continue;
          }

          // Store in database in batches
          const dbBatchSize = 100;
          let inserted = 0;

          for (let j = 0; j < dailyData.length; j += dbBatchSize) {
            const dataBatch = dailyData.slice(j, j + dbBatchSize);
            const values = dataBatch.map(point => {
              const date = point.date instanceof Date ? point.date : new Date(point.date);
              const dateStr = date.toISOString().split('T')[0];
              return `('${symbol}', '${dateStr}', NULL, ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume || 0}, ${point.close})`;
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
              inserted += dataBatch.length;
            } catch (dbError) {
              console.error(`   ❌ Database error for ${symbol}:`, dbError.message);
            }
          }

          totalRecords += inserted;
          processed++;
          console.log(`   ✅ ${symbol}: ${inserted} daily records inserted`);

        } catch (error) {
          console.error(`   ❌ Error processing ${symbol}:`, error.message);
          errors++;
        }
      }

      console.log(`\n📊 Batch progress: ${Math.min(i + batchSize, assetSymbols.length)}/${assetSymbols.length} assets processed\n`);
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 GENERATION SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Assets Processed: ${processed}`);
    console.log(`Total Records Inserted: ${totalRecords.toLocaleString()}`);
    console.log(`Errors: ${errors}`);
    console.log(`\n✅ 10-year mock data generation complete!\n`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  generate10YearsMockData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generate10YearsMockData };

