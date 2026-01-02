/**
 * Update Ticker Symbols and Display Names
 * 
 * This script updates existing assets in the database to populate
 * ticker_symbol and display_name columns for better search functionality.
 * 
 * Usage:
 *   node scripts/updateTickerSymbols.js
 */

require('dotenv').config();
const { pool } = require('../db');
const { extractTickerSymbol, generateDisplayName } = require('../utils/assetSymbolUtils');

async function updateTickerSymbols() {
  try {
    console.log('🚀 Starting ticker symbol and display name update...\n');

    // Get all assets
    const assetsResult = await pool.query(
      `SELECT symbol, name, type, category, exchange 
       FROM asset_info 
       ORDER BY symbol`
    );

    if (assetsResult.rows.length === 0) {
      console.log('⚠️  No assets found in database');
      return;
    }

    const assets = assetsResult.rows;
    console.log(`📊 Processing ${assets.length} assets...\n`);

    let updated = 0;
    let errors = 0;

    for (const asset of assets) {
      try {
        const tickerSymbol = extractTickerSymbol(asset.symbol);
        const displayName = generateDisplayName(asset.symbol, asset.name);

        await pool.query(
          `UPDATE asset_info 
           SET ticker_symbol = $1, 
               display_name = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE symbol = $3`,
          [tickerSymbol, displayName, asset.symbol]
        );

        updated++;
        
        if (updated % 100 === 0) {
          console.log(`   Progress: ${updated}/${assets.length} assets updated`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating ${asset.symbol}:`, error.message);
        errors++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 UPDATE SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Assets Processed: ${assets.length}`);
    console.log(`Successfully Updated: ${updated}`);
    console.log(`Errors: ${errors}\n`);
    console.log('✅ Ticker symbol and display name update complete!\n');

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  updateTickerSymbols()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateTickerSymbols };


