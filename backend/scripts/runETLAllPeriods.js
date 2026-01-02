/**
 * ETL Runner Script - All Time Periods
 * 
 * Runs historical data ingestion for all time periods:
 * 7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX
 * 
 * Usage:
 *   node scripts/runETLAllPeriods.js [symbols...]
 * 
 * Examples:
 *   node scripts/runETLAllPeriods.js              # All assets, all periods
 *   node scripts/runETLAllPeriods.js AAPL MSFT    # Specific symbols, all periods
 */

require('dotenv').config();
const dataIngestionService = require('../services/etl/dataIngestionService');
const { pool } = require('../db');

// All time periods to process
const TIME_PERIODS = ['7D', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

async function runETLAllPeriods() {
  const args = process.argv.slice(2);
  const symbols = args.length > 0 ? args : null;

  try {
    let assetSymbols;
    if (symbols && symbols.length > 0) {
      assetSymbols = symbols;
      console.log(`📊 Processing ${assetSymbols.length} specified symbols:`, assetSymbols.join(', '));
    } else {
      const result = await pool.query('SELECT DISTINCT symbol FROM asset_info ORDER BY symbol');
      assetSymbols = result.rows.map(row => row.symbol);
      console.log(`📊 Processing all ${assetSymbols.length} assets from database`);
    }

    console.log(`\n🚀 Starting ETL for all time periods...\n`);
    console.log(`📅 Time periods: ${TIME_PERIODS.join(', ')}\n`);

    const results = {};
    let totalRecords = 0;
    let totalErrors = 0;

    // Process each time period sequentially
    for (const timeRange of TIME_PERIODS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Processing ${timeRange}...`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        const result = await dataIngestionService.batchIngestHistoricalData(assetSymbols, timeRange);
        results[timeRange] = result;
        totalRecords += result.totalInserted;
        totalErrors += result.errors;

        console.log(`\n✅ ${timeRange} complete:`);
        console.log(`   Assets Processed: ${result.processed}`);
        console.log(`   Records Inserted: ${result.totalInserted}`);
        console.log(`   Errors: ${result.errors}`);
      } catch (error) {
        console.error(`❌ Error processing ${timeRange}:`, error.message);
        results[timeRange] = { error: error.message };
        totalErrors++;
      }

      // Small delay between time periods to avoid overwhelming the system
      if (timeRange !== TIME_PERIODS[TIME_PERIODS.length - 1]) {
        console.log('\n⏳ Waiting 2 seconds before next time period...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Time Periods Processed: ${TIME_PERIODS.length}`);
    console.log(`Assets Processed: ${assetSymbols.length}`);
    console.log(`Total Records Inserted: ${totalRecords.toLocaleString()}`);
    console.log(`Total Errors: ${totalErrors}\n`);

    console.log(`Detailed Results:`);
    TIME_PERIODS.forEach(timeRange => {
      const result = results[timeRange];
      if (result.error) {
        console.log(`  ${timeRange}: ❌ ${result.error}`);
      } else {
        console.log(`  ${timeRange}: ✅ ${result.totalInserted.toLocaleString()} records (${result.processed} assets, ${result.errors} errors)`);
      }
    });

    console.log(`\n✅ All time periods processed!\n`);

  } catch (error) {
    console.error('❌ ETL script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runETLAllPeriods()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runETLAllPeriods };


