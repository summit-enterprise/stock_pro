/**
 * Crypto Market Service
 * Fetches comprehensive cryptocurrency market data from CoinGecko API
 * Includes: rank, price, 1h%, 24h%, 7d%, market cap, volume, circulating supply
 * Optimized to minimize API calls using single endpoint with all required data
 */

const axios = require('axios');
const { pool } = require('../../db');
const { getRedisClient } = require('../../config/redis');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 300; // 5 minutes cache

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
 * Fetch comprehensive crypto market data from CoinGecko
 * Single API call to get all required data: rank, price, 1h%, 24h%, 7d%, market cap, volume, circulating supply
 * @param {number} limit - Maximum number of cryptos to fetch (default: 250, max per page)
 * @returns {Promise<Array>} Array of crypto market data objects
 */
async function fetchCryptoMarketData(limit = 250) {
  try {
    const cacheKey = `crypto:market:all:${limit}`;
    
    // Check Redis cache first
    const redisClient = await getRedisClient();
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          console.log('Crypto market data: Cache hit');
          return JSON.parse(cachedData);
        }
      } catch (redisError) {
        console.warn('Crypto market data: Redis cache read failed');
      }
    }
    
    console.log(`Fetching crypto market data from CoinGecko (limit: ${limit})...`);
    
    // Single API call to get all required data
    // price_change_percentage includes: 1h, 24h, 7d
    const url = buildApiUrl('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: Math.min(limit, 250), // CoinGecko max per page is 250
      page: 1,
      sparkline: false,
      price_change_percentage: '1h,24h,7d' // Get 1h, 24h, and 7d changes in one call
    });
    
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from CoinGecko');
    }
    
    // Transform data to match our requirements
    const marketData = response.data.map((coin, index) => ({
      rank: coin.market_cap_rank || index + 1,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price || 0,
      priceChange1h: coin.price_change_percentage_1h_in_currency || 0,
      priceChange24h: coin.price_change_percentage_24h_in_currency || 0,
      priceChange7d: coin.price_change_percentage_7d_in_currency || 0,
      marketCap: coin.market_cap || 0,
      volume24h: coin.total_volume || 0,
      circulatingSupply: coin.circulating_supply || 0,
      totalSupply: coin.total_supply || null,
      maxSupply: coin.max_supply || null,
      logoUrl: coin.image || null,
      lastUpdated: coin.last_updated || new Date().toISOString(),
      // Store coin ID for future reference
      coinId: coin.id
    }));
    
    console.log(`✅ Fetched ${marketData.length} crypto market data entries`);
    
    // Cache in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(marketData));
        console.log('Crypto market data: Stored in Redis cache');
      } catch (redisError) {
        console.warn('Crypto market data: Failed to store in Redis cache');
      }
    }
    
    return marketData;
  } catch (error) {
    console.error('Error fetching crypto market data:', error.message);
    if (error.response) {
      console.error('CoinGecko API response:', error.response.status, error.response.statusText);
      if (error.response.status === 429) {
        throw new Error('CoinGecko API rate limit exceeded. Please try again later.');
      }
    }
    throw error;
  }
}

/**
 * Store crypto market data in database
 * Updates asset_info table with latest market data
 * @param {Array} marketData - Array of crypto market data objects
 */
async function storeCryptoMarketData(marketData) {
  try {
    console.log(`\nStoring ${marketData.length} crypto market data entries in database...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const crypto of marketData) {
      try {
        // Create symbol in format: X:{SYMBOL}USD (e.g., X:BTCUSD)
        const symbol = `X:${crypto.symbol}USD`;
        
        // Update asset_info with latest market data
        const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');
        const tickerSymbol = extractTickerSymbol(symbol);
        const displayName = generateDisplayName(symbol, crypto.name);
        
        await pool.query(
          `UPDATE asset_info 
           SET name = $1, 
               ticker_symbol = $2,
               display_name = $3,
               market_cap = $4, 
               logo_url = COALESCE(logo_url, $5),
               updated_at = CURRENT_TIMESTAMP
           WHERE symbol = $6`,
          [crypto.name, tickerSymbol, displayName, crypto.marketCap, crypto.logoUrl, symbol]
        );
        
        // Store coin ID mapping if not exists
        await pool.query(
          `INSERT INTO crypto_coin_ids (symbol, coin_id, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (symbol) DO UPDATE SET
           coin_id = EXCLUDED.coin_id,
           updated_at = CURRENT_TIMESTAMP`,
          [symbol, crypto.coinId]
        );
        
        // Store current price in asset_data (for charting)
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
           VALUES ($1, $2, NULL, $3, $3, $3, $3, $4, $3)
           ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
           close = EXCLUDED.close,
           open = EXCLUDED.open,
           high = EXCLUDED.high,
           low = EXCLUDED.low,
           volume = EXCLUDED.volume,
           adjusted_close = EXCLUDED.close`,
          [symbol, today, crypto.price, crypto.volume24h]
        );
        
        updated++;
        
        if (updated % 50 === 0) {
          process.stdout.write(`  Progress: ${updated}/${marketData.length}\r`);
        }
      } catch (error) {
        console.error(`  Error storing ${crypto.symbol}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Stored crypto market data: ${updated} updated, ${errors} errors\n`);
    return { updated, errors };
  } catch (error) {
    console.error('Error storing crypto market data:', error.message);
    throw error;
  }
}

/**
 * Get crypto market data (with caching)
 * Fetches from cache, database, or API in that order
 * @param {number} limit - Maximum number of cryptos to fetch
 * @returns {Promise<Array>} Array of crypto market data objects
 */
async function getCryptoMarketData(limit = 250) {
  try {
    // Try Redis cache first
    const cacheKey = `crypto:market:all:${limit}`;
    const redisClient = await getRedisClient();
    
    if (redisClient && redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (redisError) {
        console.warn('Crypto market data: Redis cache read failed');
      }
    }
    
    // Try database (get latest prices from asset_data)
    try {
      const dbResult = await pool.query(
        `SELECT 
          ai.symbol,
          ai.name,
          ai.market_cap,
          ai.logo_url,
          ad.close as price,
          ad.volume,
          ROW_NUMBER() OVER (ORDER BY ai.market_cap DESC NULLS LAST) as rank
        FROM asset_info ai
        LEFT JOIN LATERAL (
          SELECT close, volume
          FROM asset_data
          WHERE symbol = ai.symbol
          ORDER BY date DESC
          LIMIT 1
        ) ad ON true
        WHERE ai.category = 'Crypto' OR ai.type = 'crypto'
        ORDER BY ai.market_cap DESC NULLS LAST
        LIMIT $1`,
        [limit]
      );
      
      if (dbResult.rows.length > 0) {
        // Transform database data to match API format
        const marketData = dbResult.rows.map(row => ({
          rank: parseInt(row.rank) || 0,
          symbol: row.symbol.replace(/^X:/, '').replace(/USD$/, ''),
          name: row.name || row.symbol,
          price: parseFloat(row.price) || 0,
          priceChange1h: 0, // Not stored in DB, would need separate calculation
          priceChange24h: 0, // Not stored in DB, would need separate calculation
          priceChange7d: 0, // Not stored in DB, would need separate calculation
          marketCap: parseFloat(row.market_cap) || 0,
          volume24h: parseFloat(row.volume) || 0,
          circulatingSupply: 0, // Not stored in asset_info
          totalSupply: null,
          maxSupply: null,
          logoUrl: row.logo_url,
          lastUpdated: new Date().toISOString(),
          coinId: null
        }));
        
        // Cache in Redis
        if (redisClient && redisClient.isOpen) {
          try {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(marketData));
          } catch (redisError) {
            console.warn('Failed to cache market data in Redis');
          }
        }
        
        return marketData;
      }
    } catch (dbError) {
      console.warn('Error fetching from database:', dbError.message);
    }
    
    // Fallback to API
    return await fetchCryptoMarketData(limit);
  } catch (error) {
    console.error('Error getting crypto market data:', error.message);
    throw error;
  }
}

module.exports = {
  fetchCryptoMarketData,
  storeCryptoMarketData,
  getCryptoMarketData,
  buildApiUrl
};


