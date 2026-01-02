/**
 * ETL Runner Script
 * 
 * Manual script to run ETL jobs:
 * - Historical data ingestion
 * - Hourly data ingestion
 * - Latest price updates
 * 
 * Usage:
 *   node scripts/runETL.js [job-type] [time-range] [symbols...]
 * 
 * Examples:
 *   node scripts/runETL.js historical 1Y
 *   node scripts/runETL.js hourly
 *   node scripts/runETL.js latest AAPL MSFT GOOGL
 *   node scripts/runETL.js historical MAX
 */

require('dotenv').config();
const dataIngestionService = require('../services/etl/dataIngestionService');
const { pool } = require('../db');

async function runETL() {
  const args = process.argv.slice(2);
  const jobType = args[0] || 'help';

  try {
    switch (jobType) {
      case 'historical':
        await runHistoricalIngestion(args);
        break;
      case 'hourly':
        await runHourlyIngestion(args);
        break;
      case 'latest':
        await runLatestPriceUpdate(args);
        break;
      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error('❌ ETL script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runHistoricalIngestion(args) {
  const timeRange = args[1] || '1Y';
  const symbols = args.slice(2);

  console.log(`🚀 Starting historical data ingestion (${timeRange})...\n`);

  let assetSymbols;
  if (symbols.length > 0) {
    assetSymbols = symbols;
    console.log(`📊 Processing ${assetSymbols.length} specified symbols:`, assetSymbols.join(', '));
  } else {
    const result = await pool.query('SELECT DISTINCT symbol FROM asset_info ORDER BY symbol');
    assetSymbols = result.rows.map(row => row.symbol);
    console.log(`📊 Processing all ${assetSymbols.length} assets from database`);
  }

  const result = await dataIngestionService.batchIngestHistoricalData(assetSymbols, timeRange);
  
  console.log('\n✅ Historical data ingestion complete!');
  console.log(`📊 Summary:`);
  console.log(`   Time Range: ${timeRange}`);
  console.log(`   Assets Processed: ${result.processed}`);
  console.log(`   Records Inserted: ${result.totalInserted}`);
  console.log(`   Errors: ${result.errors}\n`);
}

async function runHourlyIngestion(args) {
  const symbols = args.slice(1);

  console.log(`🚀 Starting hourly data ingestion (1D)...\n`);

  let assetSymbols;
  if (symbols.length > 0) {
    assetSymbols = symbols;
    console.log(`📊 Processing ${assetSymbols.length} specified symbols:`, assetSymbols.join(', '));
  } else {
    const result = await pool.query('SELECT DISTINCT symbol FROM asset_info ORDER BY symbol');
    assetSymbols = result.rows.map(row => row.symbol);
    console.log(`📊 Processing all ${assetSymbols.length} assets from database`);
  }

  const result = await dataIngestionService.batchIngestHourlyData(assetSymbols);
  
  console.log('\n✅ Hourly data ingestion complete!');
  console.log(`📊 Summary:`);
  console.log(`   Assets Processed: ${result.processed}`);
  console.log(`   Records Inserted: ${result.totalInserted}`);
  console.log(`   Errors: ${result.errors}\n`);
}

async function runLatestPriceUpdate(args) {
  const symbols = args.slice(1);

  console.log(`🚀 Starting latest price update...\n`);

  let assetSymbols;
  if (symbols.length > 0) {
    assetSymbols = symbols;
    console.log(`📊 Updating ${assetSymbols.length} specified symbols:`, assetSymbols.join(', '));
  } else {
    // Get active symbols (from watchlists and market overview)
    const watchlistResult = await pool.query('SELECT DISTINCT symbol FROM watchlist');
    const marketResult = await pool.query(
      `SELECT DISTINCT symbol FROM asset_info 
       WHERE type IN ('stock', 'etf', 'crypto', 'index')
       ORDER BY market_cap DESC NULLS LAST
       LIMIT 100`
    );
    assetSymbols = [...new Set([
      ...watchlistResult.rows.map(row => row.symbol),
      ...marketResult.rows.map(row => row.symbol)
    ])];
    console.log(`📊 Updating ${assetSymbols.length} active symbols`);
  }

  const updated = await dataIngestionService.updateLatestPrices(assetSymbols);
  
  console.log('\n✅ Latest price update complete!');
  console.log(`📊 Prices Updated: ${updated}\n`);
}

function printHelp() {
  console.log(`
📊 ETL Runner Script

Usage:
  node scripts/runETL.js [job-type] [options...]

Job Types:
  historical [time-range] [symbols...]
    - Ingest historical daily data
    - Time ranges: 7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX
    - Example: node scripts/runETL.js historical 1Y AAPL MSFT

  hourly [symbols...]
    - Ingest hourly data for today/last market day (1D)
    - Example: node scripts/runETL.js hourly AAPL MSFT

  latest [symbols...]
    - Update latest prices in cache
    - Example: node scripts/runETL.js latest AAPL MSFT GOOGL

Examples:
  node scripts/runETL.js historical 1Y
  node scripts/runETL.js hourly
  node scripts/runETL.js latest AAPL MSFT
  node scripts/runETL.js historical MAX
`);
}

if (require.main === module) {
  runETL()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runETL };


