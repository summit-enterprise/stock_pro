/**
 * Populate Mock Dividends Script
 * Generates and stores mock dividend data for all assets in the database
 */

require('dotenv').config();
const { pool } = require('../db');
const { dividendService } = require('../services');

async function populateDividends() {
  console.log('\n🔄 Starting dividend population...\n');

  try {
    // Get all assets from asset_info (excluding crypto)
    const result = await pool.query(`
      SELECT DISTINCT symbol, type 
      FROM asset_info 
      WHERE type != 'crypto' AND type != 'cryptocurrency'
      ORDER BY symbol
    `);

    const assets = result.rows;
    console.log(`Found ${assets.length} assets to populate dividends for\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process assets in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (asset) => {
        try {
          const { symbol } = asset;
          
          // Check if dividends already exist
          const existingCheck = await pool.query(
            'SELECT COUNT(*) as count FROM dividends WHERE symbol = $1',
            [symbol]
          );

          if (parseInt(existingCheck.rows[0].count) > 0) {
            console.log(`⏭️  Skipping ${symbol} - dividends already exist`);
            skipCount++;
            return;
          }

          // Generate and store mock dividends using the dividend service
          console.log(`📊 Generating dividends for ${symbol}...`);
          const dividends = await dividendService.fetchAndSyncDividends(symbol);
          
          if (dividends && dividends.length > 0) {
            console.log(`✅ Stored ${dividends.length} dividends for ${symbol}`);
            successCount++;
          } else {
            console.log(`⚠️  No dividends generated for ${symbol} (may be crypto or non-dividend stock)`);
            skipCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing ${asset.symbol}:`, error.message);
          errorCount++;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Dividend Population Summary:');
    console.log(`✅ Success: ${successCount} assets`);
    console.log(`⏭️  Skipped: ${skipCount} assets`);
    console.log(`❌ Errors: ${errorCount} assets`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  populateDividends()
    .then(() => {
      console.log('✅ Dividend population completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Dividend population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDividends };
