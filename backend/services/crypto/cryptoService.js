/**
 * Crypto Service
 * Fetches cryptocurrency data from CoinGecko API
 * Handles crypto asset list and metadata
 * 
 * For price data, use cryptoPriceService.js
 */

const axios = require('axios');
const { pool } = require('../../db');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * Build API URL with optional API key
 */
function buildApiUrl(endpoint, params = {}) {
  let url = `${COINGECKO_BASE_URL}${endpoint}`;
  const queryParams = new URLSearchParams();
  
  // Add API key if available
  if (COINGECKO_API_KEY) {
    queryParams.append('x_cg_demo_api_key', COINGECKO_API_KEY);
  }
  
  // Add other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value);
    }
  });
  
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }
  
  return url;
}

/**
 * Fetch list of all cryptocurrencies from CoinGecko
 * @param {number} limit - Maximum number of cryptos to fetch (default: 8000)
 * @returns {Promise<Array>} Array of crypto objects
 */
async function fetchCryptoList(limit = 8000) {
  try {
    console.log(`Fetching top ${limit} cryptocurrencies from CoinGecko...`);
    
    // CoinGecko returns up to 250 per page, so we need multiple requests
    const perPage = 250;
    const totalPages = Math.ceil(limit / perPage);
    const allCryptos = [];
    
    for (let page = 1; page <= totalPages && allCryptos.length < limit; page++) {
      const url = buildApiUrl('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page: page,
        sparkline: false,
        price_change_percentage: '24h'
      });
      
      try {
        const response = await axios.get(url, { timeout: 30000 });
        
        if (response.data && Array.isArray(response.data)) {
          const cryptos = response.data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            marketCap: coin.market_cap || 0,
            currentPrice: coin.current_price || 0,
            priceChange24h: coin.price_change_percentage_24h || 0,
            image: coin.image || null,
            lastUpdated: coin.last_updated || new Date().toISOString()
          }));
          
          allCryptos.push(...cryptos);
          console.log(`  Fetched page ${page}/${totalPages}: ${cryptos.length} cryptos (total: ${allCryptos.length})`);
          
          // Rate limiting: wait 1.5 seconds between requests
          if (page < totalPages && allCryptos.length < limit) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } else {
          console.warn(`  Unexpected response format on page ${page}`);
          break;
        }
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  Rate limited on page ${page}, waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          page--; // Retry this page
          continue;
        }
        console.error(`  Error fetching page ${page}:`, error.message);
        break;
      }
    }
    
    console.log(`✅ Fetched ${allCryptos.length} cryptocurrencies`);
    return allCryptos.slice(0, limit);
  } catch (error) {
    console.error('Error fetching crypto list:', error.message);
    throw error;
  }
}

/**
 * Store crypto assets in asset_info table
 * @param {Array} cryptos - Array of crypto objects from fetchCryptoList
 */
async function storeCryptoAssets(cryptos) {
  try {
    console.log(`\nStoring ${cryptos.length} crypto assets in database...`);
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    // Store coin ID mapping for later use
    const coinIdMap = new Map();
    
    for (const crypto of cryptos) {
      try {
        // Create symbol in format: X:{SYMBOL}USD (e.g., X:BTCUSD)
        const symbol = `X:${crypto.symbol}USD`;
        
        // Store coin ID mapping (we'll need this for historical data)
        coinIdMap.set(symbol, crypto.id);
        
        // Check if asset already exists
        const existing = await pool.query(
          'SELECT symbol FROM asset_info WHERE symbol = $1',
          [symbol]
        );
        
        // Extract ticker symbol (e.g., "X:BTCUSD" -> "BTC")
        const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');
        const tickerSymbol = extractTickerSymbol(symbol);
        const displayName = generateDisplayName(symbol, crypto.name);
        
        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE asset_info 
             SET name = $1, 
                 ticker_symbol = $2,
                 display_name = $3,
                 type = 'crypto', 
                 market_cap = $4, 
                 updated_at = CURRENT_TIMESTAMP,
                 logo_url = COALESCE(logo_url, $5)
             WHERE symbol = $6`,
            [crypto.name, tickerSymbol, displayName, crypto.marketCap, crypto.image, symbol]
          );
          updated++;
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO asset_info (symbol, name, ticker_symbol, display_name, type, exchange, currency, market_cap, logo_url, updated_at)
             VALUES ($1, $2, $3, $4, 'crypto', 'CoinGecko', 'USD', $5, $6, CURRENT_TIMESTAMP)`,
            [symbol, crypto.name, tickerSymbol, displayName, crypto.marketCap, crypto.image]
          );
          inserted++;
        }
        
        if ((inserted + updated) % 100 === 0) {
          process.stdout.write(`  Progress: ${inserted + updated}/${cryptos.length}\r`);
        }
      } catch (error) {
        console.error(`  Error storing ${crypto.symbol}:`, error.message);
        errors++;
      }
    }
    
    // Store coin ID mapping in a simple table for lookup
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crypto_coin_ids (
          symbol VARCHAR(50) PRIMARY KEY,
          coin_id VARCHAR(100) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert/update coin IDs
      for (const [symbol, coinId] of coinIdMap.entries()) {
        await pool.query(
          `INSERT INTO crypto_coin_ids (symbol, coin_id, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (symbol) DO UPDATE SET
           coin_id = EXCLUDED.coin_id,
           updated_at = CURRENT_TIMESTAMP`,
          [symbol, coinId]
        );
      }
    } catch (error) {
      console.warn('Could not store coin ID mapping:', error.message);
    }
    
    console.log(`\n✅ Stored cryptos: ${inserted} inserted, ${updated} updated, ${errors} errors\n`);
    return { inserted, updated, errors };
  } catch (error) {
    console.error('Error storing crypto assets:', error.message);
    throw error;
  }
}

// Price functions moved to cryptoPriceService.js
// Import and re-export for backward compatibility
const cryptoPriceService = require('./cryptoPriceService');
const fetchHistoricalPrices = cryptoPriceService.fetchHistoricalPrices;
const fetchCurrentPrice = cryptoPriceService.fetchCurrentPrice;
const storeHistoricalPrices = cryptoPriceService.storeHistoricalPrices;
const syncHistoricalPrices = cryptoPriceService.syncHistoricalPrices;

module.exports = {
  // Main crypto data functions
  fetchCryptoList,
  storeCryptoAssets,
  buildApiUrl,
  
  // Price functions (delegated to cryptoPriceService)
  fetchHistoricalPrices,
  fetchCurrentPrice,
  storeHistoricalPrices,
  syncHistoricalPrices,
};

