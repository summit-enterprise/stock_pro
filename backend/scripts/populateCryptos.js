/**
 * Populate Cryptocurrencies Script
 * Fetches top 100 cryptocurrencies from CoinGecko and stores them in the database
 * Then fetches historical price data back to 2011
 */

require('dotenv').config();
const { pool } = require('../db');
const cryptoService = require('../services/crypto/cryptoService');
const cryptoPriceService = require('../services/crypto/cryptoPriceService');

async function populateCryptos() {
  try {
    console.log('🚀 Starting cryptocurrency population...\n');
    
    // Step 1: Fetch crypto list
    console.log('Step 1: Fetching top 100 cryptocurrencies from CoinGecko...');
    const cryptos = await cryptoService.fetchCryptoList(100);
    console.log(`✅ Fetched ${cryptos.length} cryptocurrencies\n`);
    
    // Step 2: Store in asset_info table
    console.log('Step 2: Storing crypto assets in database...');
    const storeResult = await cryptoService.storeCryptoAssets(cryptos);
    console.log(`✅ Stored: ${storeResult.inserted} inserted, ${storeResult.updated} updated\n`);
    
    // Step 3: Fetch and store historical prices (optional, can be done separately)
    const FETCH_HISTORICAL = process.env.FETCH_CRYPTO_HISTORICAL !== 'false';
    
    if (FETCH_HISTORICAL) {
      console.log('Step 3: Fetching historical price data...');
      console.log('⚠️  This will take some time for 100 cryptos!');
      console.log('⚠️  Consider running this separately with: node scripts/syncCryptoPrices.js\n');
      
      // Sync all 100 cryptos
      const topCryptos = cryptos;
      let synced = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      
      for (const crypto of topCryptos) {
        try {
          const dbSymbol = `X:${crypto.symbol}USD`;
          console.log(`\n📊 Syncing ${crypto.symbol} (${crypto.name})...`);
          
          const result = await cryptoPriceService.syncHistoricalPrices(
            crypto.id,
            crypto.symbol,
            dbSymbol
          );
          
          totalInserted += result.inserted;
          totalUpdated += result.updated;
          synced++;
          
          console.log(`✅ ${crypto.symbol}: ${result.inserted} new, ${result.updated} updated`);
          
          // Progress update
          if (synced % 10 === 0) {
            console.log(`\n📈 Progress: ${synced}/${topCryptos.length} cryptos synced`);
            console.log(`   Total: ${totalInserted} inserted, ${totalUpdated} updated\n`);
          }
          
          // Rate limiting: wait 3 seconds between cryptos
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`❌ Error syncing ${crypto.symbol}:`, error.message);
        }
      }
      
      console.log(`\n✅ Historical data sync complete: ${synced} cryptos synced`);
      console.log(`   Total: ${totalInserted} inserted, ${totalUpdated} updated`);
    } else {
      console.log('Step 3: Skipped (set FETCH_CRYPTO_HISTORICAL=true to enable)');
      console.log('   Run separately: node scripts/syncCryptoPrices.js');
    }
    
    // Summary
    const assetCount = await pool.query('SELECT COUNT(*) FROM asset_info WHERE type = $1', ['crypto']);
    const dataCount = await pool.query(
      'SELECT COUNT(*) FROM asset_data WHERE symbol LIKE $1',
      ['X:%USD']
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Crypto assets in database: ${assetCount.rows[0].count}`);
    console.log(`Crypto price data points: ${dataCount.rows[0].count}`);
    console.log('='.repeat(60) + '\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

if (require.main === module) {
  populateCryptos();
}

module.exports = { populateCryptos };

