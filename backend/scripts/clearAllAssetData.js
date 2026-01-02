/**
 * Clear All Asset Data Script
 * 
 * This script clears all asset-related data from the database:
 * - asset_data (all price data)
 * - asset_info (asset names, tickers, metadata)
 * - crypto_coin_ids (crypto mappings)
 * - asset_search_tracking (search tracking)
 * 
 * WARNING: This will also cascade delete:
 * - watchlist entries (foreign key constraint)
 * - portfolio entries (foreign key constraint)
 * 
 * Usage: node scripts/clearAllAssetData.js
 */

require('dotenv').config();
const { pool } = require('../db');

async function clearAllAssetData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  Starting to clear all asset data...\n');
    
    // 1. Clear asset_data (all price data)
    console.log('1. Clearing asset_data (price data)...');
    const assetDataResult = await client.query('DELETE FROM asset_data');
    console.log(`   ✅ Deleted ${assetDataResult.rowCount} price records\n`);
    
    // 2. Clear crypto_coin_ids (crypto mappings)
    console.log('2. Clearing crypto_coin_ids...');
    const cryptoCoinIdsResult = await client.query('DELETE FROM crypto_coin_ids');
    console.log(`   ✅ Deleted ${cryptoCoinIdsResult.rowCount} crypto coin ID mappings\n`);
    
    // 3. Clear asset_search_tracking
    console.log('3. Clearing asset_search_tracking...');
    const searchTrackingResult = await client.query('DELETE FROM asset_search_tracking');
    console.log(`   ✅ Deleted ${searchTrackingResult.rowCount} search tracking records\n`);
    
    // 4. Clear asset_info (this will cascade delete watchlist and portfolio entries)
    console.log('4. Clearing asset_info (this will also delete watchlist and portfolio entries)...');
    const assetInfoResult = await client.query('DELETE FROM asset_info');
    console.log(`   ✅ Deleted ${assetInfoResult.rowCount} asset info records\n`);
    
    // 5. Verify watchlist and portfolio are empty (cascade delete should have cleared them)
    const watchlistCount = await client.query('SELECT COUNT(*) as count FROM watchlist');
    const portfolioCount = await client.query('SELECT COUNT(*) as count FROM portfolio');
    console.log(`   ℹ️  Watchlist entries remaining: ${watchlistCount.rows[0].count}`);
    console.log(`   ℹ️  Portfolio entries remaining: ${portfolioCount.rows[0].count}\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ Successfully cleared all asset data!');
    console.log('\n📊 Summary:');
    console.log(`   - Price records deleted: ${assetDataResult.rowCount}`);
    console.log(`   - Crypto mappings deleted: ${cryptoCoinIdsResult.rowCount}`);
    console.log(`   - Search tracking deleted: ${searchTrackingResult.rowCount}`);
    console.log(`   - Asset info deleted: ${assetInfoResult.rowCount}`);
    console.log(`   - Watchlist entries: ${watchlistCount.rows[0].count}`);
    console.log(`   - Portfolio entries: ${portfolioCount.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing asset data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
clearAllAssetData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


