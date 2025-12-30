/**
 * Batch script to fetch and store logos for all assets in the database
 * Processes assets in batches to respect API rate limits
 */

require('dotenv').config();
const { pool } = require('../db');
const logoService = require('../services/general/logoService');

// Configuration
const BATCH_SIZE = 3; // Process 3 assets at a time (reduced to respect rate limits)
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds between batches
const DELAY_BETWEEN_ITEMS = 1000; // 1 second between items in a batch

// List of known real asset symbols (to prioritize real assets over mock data)
const REAL_ASSETS = new Set([
  // Major stocks
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM',
  'INTC', 'CSCO', 'ORCL', 'IBM', 'TXN', 'AVGO', 'QCOM', 'AMD', 'MU', 'LRCX',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'VLO', 'PSX',
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW',
  // ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND',
  'XLB', 'XLC', 'XLE', 'XLF', 'XLI', 'XLK', 'XLP', 'XLRE', 'XLU', 'XLV', 'XLY',
  // Crypto (normalized)
  'BTC', 'ETH', 'DOGE', 'DOT', 'EOS', 'ETC', 'FIL', 'GRT', 'ICP', 'LTC', 'MATIC', 'MKR',
  'SHIB', 'SNX', 'SOL', 'SUSHI', 'THETA', 'TRX', 'UNI', 'VET', 'XLM', 'XRP', 'YFI',
  // Crypto with X: prefix
  'X:BTCUSD', 'X:ETHUSD', 'X:DOGEUSD', 'X:DOTUSD', 'X:EOSUSD', 'X:ETCUSD', 'X:FILUSD',
  'X:GRTUSD', 'X:ICPUSD', 'X:LTCUSD', 'X:MATICUSD', 'X:MKRUSD', 'X:SHIBUSD', 'X:SNXUSD',
  'X:SOLUSD', 'X:SUSHIUSD', 'X:THETAUSD', 'X:TRXUSD', 'X:UNIUSD', 'X:VETUSD', 'X:XLMUSD',
  'X:XRPUSD', 'X:YFIUSD',
]);

async function fetchAllLogos() {
  try {
    console.log('🚀 Starting logo fetch for all assets...\n');

    // Get all assets from database
    const result = await pool.query(
      `SELECT symbol, name, type, logo_url 
       FROM asset_info 
       ORDER BY symbol`
    );

    const assets = result.rows;
    console.log(`Found ${assets.length} assets to process\n`);

    // Filter out assets that already have logos (optional - set to false to re-fetch all)
    const SKIP_EXISTING = process.env.SKIP_EXISTING_LOGOS !== 'false';
    const ONLY_REAL_ASSETS = process.env.ONLY_REAL_ASSETS !== 'false'; // Only process known real assets
    
    let assetsToProcess = SKIP_EXISTING
      ? assets.filter(asset => !asset.logo_url)
      : assets;
    
    // Filter to only real assets if enabled
    if (ONLY_REAL_ASSETS) {
      assetsToProcess = assetsToProcess.filter(asset => {
        const symbol = asset.symbol.toUpperCase();
        const isCrypto = asset.type && (asset.type.toLowerCase() === 'crypto' || asset.type.toLowerCase() === 'cryptocurrency');
        return REAL_ASSETS.has(symbol) || 
               symbol.startsWith('X:') ||
               isCrypto; // Include all crypto assets
      });
      console.log(`Filtered to ${assetsToProcess.length} real assets (out of ${assets.length} total)\n`);
    }

    console.log(`${SKIP_EXISTING ? 'Skipping' : 'Including'} assets with existing logos`);
    console.log(`Processing ${assetsToProcess.length} assets\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let alreadyExistsCount = 0;

    // Process in batches
    for (let i = 0; i < assetsToProcess.length; i += BATCH_SIZE) {
      const batch = assetsToProcess.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(assetsToProcess.length / BATCH_SIZE)}`);
      console.log(`   Assets: ${batch.map(a => a.symbol).join(', ')}\n`);

      // Process batch items with delays
      for (let j = 0; j < batch.length; j++) {
        const asset = batch[j];
        
        // Add delay between items (except first)
        if (j > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
        }

        try {
          console.log(`   🔍 Fetching logo for ${asset.symbol} (${asset.name || 'N/A'})...`);

          // Check if logo already exists (double-check)
          if (SKIP_EXISTING && asset.logo_url) {
            console.log(`   ⏭️  ${asset.symbol}: Logo already exists, skipping`);
            alreadyExistsCount++;
            continue;
          }

          // Fetch and store logo
          const logoUrl = await logoService.getAssetLogo(
            asset.symbol,
            asset.type,
            asset.name
          );

          if (logoUrl) {
            console.log(`   ✅ ${asset.symbol}: Logo stored at ${logoUrl}`);
            successCount++;
          } else {
            console.log(`   ⚠️  ${asset.symbol}: No logo found (will use default icon)`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`   ❌ ${asset.symbol}: Error - ${error.message}`);
          errorCount++;
        }
      }

      // Progress update
      const processed = Math.min(i + BATCH_SIZE, assetsToProcess.length);
      const progress = ((processed / assetsToProcess.length) * 100).toFixed(1);
      console.log(`\n   📊 Progress: ${processed}/${assetsToProcess.length} (${progress}%)`);
      console.log(`   ✅ Success: ${successCount} | ⚠️  Skipped: ${skippedCount} | ❌ Errors: ${errorCount} | ⏭️  Already exists: ${alreadyExistsCount}`);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < assetsToProcess.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total assets processed: ${assetsToProcess.length}`);
    console.log(`✅ Successfully fetched: ${successCount}`);
    console.log(`⏭️  Already existed: ${alreadyExistsCount}`);
    console.log(`⚠️  No logo found: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Close database connection
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fetchAllLogos();
}

module.exports = { fetchAllLogos };

