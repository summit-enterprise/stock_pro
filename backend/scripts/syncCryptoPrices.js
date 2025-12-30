/**
 * Sync Crypto Prices Script
 * Fetches and syncs historical price data for cryptocurrencies
 * Can sync all cryptos or specific ones
 */

require('dotenv').config();
const { pool } = require('../db');
const cryptoPriceService = require('../services/crypto/cryptoPriceService');

async function syncCryptoPrices(symbols = null, limit = null) {
  try {
    console.log('🚀 Starting crypto price sync...\n');
    
    // Get cryptos to sync
    let query = `SELECT symbol, name, type FROM asset_info WHERE type = 'crypto' ORDER BY market_cap DESC NULLS LAST`;
    const params = [];
    
    if (limit) {
      query += ` LIMIT $1`;
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    let cryptos = result.rows;
    
    // Filter by specific symbols if provided
    if (symbols && Array.isArray(symbols)) {
      cryptos = cryptos.filter(c => symbols.includes(c.symbol));
    }
    
    console.log(`Found ${cryptos.length} cryptocurrencies to sync\n`);
    
    let synced = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let errors = 0;
    
    for (const crypto of cryptos) {
      try {
        // Extract coin ID and symbol from database symbol (X:BTCUSD -> BTC, bitcoin)
        const dbSymbol = crypto.symbol;
        const symbolMatch = dbSymbol.match(/^X:(\w+)USD$/);
        
        if (!symbolMatch) {
          console.log(`⚠️  Skipping ${dbSymbol}: Invalid format`);
          continue;
        }
        
        const symbol = symbolMatch[1];
        
        // Get coin ID from crypto_coin_ids table
        let coinId = null;
        try {
          const coinIdResult = await pool.query(
            'SELECT coin_id FROM crypto_coin_ids WHERE symbol = $1',
            [dbSymbol]
          );
          
          if (coinIdResult.rows.length > 0) {
            coinId = coinIdResult.rows[0].coin_id;
          } else {
            // Fallback: try symbol as coin ID (CoinGecko uses lowercase)
            coinId = symbol.toLowerCase();
            console.log(`  ⚠️  No coin ID mapping found for ${dbSymbol}, using ${coinId}`);
          }
        } catch (error) {
          // Fallback if table doesn't exist
          coinId = symbol.toLowerCase();
        }
        
        console.log(`\n📊 Syncing ${symbol} (${crypto.name})...`);
        
        const result = await cryptoPriceService.syncHistoricalPrices(
          coinId,
          symbol,
          dbSymbol
        );
        
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        synced++;
        
        console.log(`✅ ${symbol}: ${result.inserted} new, ${result.updated} updated`);
        
        // Progress update
        if (synced % 10 === 0) {
          console.log(`\n📈 Progress: ${synced}/${cryptos.length} cryptos synced`);
          console.log(`   Total: ${totalInserted} inserted, ${totalUpdated} updated`);
          console.log(`   Errors: ${errors}\n`);
        }
        
        // Rate limiting: wait 3 seconds between cryptos
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`❌ Error syncing ${crypto.symbol}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Cryptos synced: ${synced}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total updated: ${totalUpdated}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Allow command line arguments
const args = process.argv.slice(2);
let symbols = null;
let limit = null;

if (args.length > 0) {
  if (args[0] === '--limit' && args[1]) {
    limit = parseInt(args[1]);
  } else if (args[0] === '--symbols' && args[1]) {
    symbols = args[1].split(',').map(s => s.trim());
  }
}

if (require.main === module) {
  syncCryptoPrices(symbols, limit);
}

module.exports = { syncCryptoPrices };

