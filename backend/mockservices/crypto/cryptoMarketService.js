/**
 * Mock Crypto Market Service
 * Generates mock cryptocurrency market data for local development
 * Includes: rank, price, 1h%, 24h%, 7d%, market cap, volume, circulating supply
 */

const { pool } = require('../../db');
const { getRedisClient } = require('../../config/redis');

const CACHE_TTL = 300; // 5 minutes cache

// Base prices and market caps for common cryptos
const BASE_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', basePrice: 67000, baseMarketCap: 1300000000000 },
  { symbol: 'ETH', name: 'Ethereum', basePrice: 3400, baseMarketCap: 410000000000 },
  { symbol: 'USDT', name: 'Tether', basePrice: 1.00, baseMarketCap: 95000000000 },
  { symbol: 'BNB', name: 'BNB', basePrice: 600, baseMarketCap: 90000000000 },
  { symbol: 'SOL', name: 'Solana', basePrice: 150, baseMarketCap: 68000000000 },
  { symbol: 'XRP', name: 'XRP', basePrice: 0.6, baseMarketCap: 33000000000 },
  { symbol: 'USDC', name: 'USD Coin', basePrice: 1.00, baseMarketCap: 28000000000 },
  { symbol: 'DOGE', name: 'Dogecoin', basePrice: 0.08, baseMarketCap: 11000000000 },
  { symbol: 'ADA', name: 'Cardano', basePrice: 0.5, baseMarketCap: 18000000000 },
  { symbol: 'TRX', name: 'TRON', basePrice: 0.12, baseMarketCap: 10000000000 },
  { symbol: 'AVAX', name: 'Avalanche', basePrice: 40, baseMarketCap: 15000000000 },
  { symbol: 'SHIB', name: 'Shiba Inu', basePrice: 0.000008, baseMarketCap: 4700000000 },
  { symbol: 'DOT', name: 'Polkadot', basePrice: 7, baseMarketCap: 9000000000 },
  { symbol: 'MATIC', name: 'Polygon', basePrice: 0.9, baseMarketCap: 8000000000 },
  { symbol: 'LTC', name: 'Litecoin', basePrice: 95, baseMarketCap: 7000000000 },
  { symbol: 'LINK', name: 'Chainlink', basePrice: 15, baseMarketCap: 8500000000 },
  { symbol: 'UNI', name: 'Uniswap', basePrice: 7.5, baseMarketCap: 4500000000 },
  { symbol: 'ATOM', name: 'Cosmos', basePrice: 10, baseMarketCap: 3800000000 },
  { symbol: 'ETC', name: 'Ethereum Classic', basePrice: 25, baseMarketCap: 3500000000 },
  { symbol: 'XLM', name: 'Stellar', basePrice: 0.12, baseMarketCap: 3200000000 },
];

/**
 * Generate random price change percentage
 */
function generatePriceChange() {
  return (Math.random() * 20 - 10); // -10% to +10%
}

/**
 * Generate mock crypto market data
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
          console.log('Crypto market data (mock): Cache hit');
          return JSON.parse(cachedData);
        }
      } catch (redisError) {
        console.warn('Crypto market data (mock): Redis cache read failed');
      }
    }
    
    console.log(`Generating mock crypto market data (limit: ${limit})...`);
    
    const marketData = [];
    
    // Generate data for base cryptos
    for (let i = 0; i < Math.min(limit, BASE_CRYPTOS.length + 50); i++) {
      let crypto;
      
      if (i < BASE_CRYPTOS.length) {
        crypto = BASE_CRYPTOS[i];
      } else {
        // Generate random crypto for remaining slots
        const randomPrice = Math.random() * 1000;
        crypto = {
          symbol: `CRYPTO${i}`,
          name: `Crypto Coin ${i}`,
          basePrice: randomPrice,
          baseMarketCap: randomPrice * (1000000 + Math.random() * 10000000)
        };
      }
      
      // Generate realistic price variations
      const volatility = 0.05; // 5% volatility
      const priceChange = (Math.random() * 2 - 1) * volatility;
      const price = crypto.basePrice * (1 + priceChange);
      
      // Generate price changes
      const change1h = generatePriceChange();
      const change24h = generatePriceChange();
      const change7d = generatePriceChange();
      
      // Calculate market cap based on price and supply
      const supplyVariation = 0.1; // 10% supply variation
      const supplyMultiplier = 1 + (Math.random() * 2 - 1) * supplyVariation;
      const marketCap = crypto.baseMarketCap * supplyMultiplier;
      
      // Calculate circulating supply (market cap / price)
      const circulatingSupply = marketCap / price;
      
      // Generate volume (typically 5-15% of market cap)
      const volumePercent = 0.05 + Math.random() * 0.10;
      const volume24h = marketCap * volumePercent;
      
      marketData.push({
        rank: i + 1,
        symbol: crypto.symbol,
        name: crypto.name,
        price: price,
        priceChange1h: change1h,
        priceChange24h: change24h,
        priceChange7d: change7d,
        marketCap: marketCap,
        volume24h: volume24h,
        circulatingSupply: circulatingSupply,
        totalSupply: circulatingSupply * (1.1 + Math.random() * 0.2), // 10-30% more than circulating
        maxSupply: Math.random() > 0.5 ? circulatingSupply * (1.5 + Math.random() * 1.0) : null,
        logoUrl: null,
        lastUpdated: new Date().toISOString(),
        coinId: crypto.symbol.toLowerCase()
      });
    }
    
    // Sort by market cap (descending)
    marketData.sort((a, b) => b.marketCap - a.marketCap);
    
    // Update ranks after sorting
    marketData.forEach((crypto, index) => {
      crypto.rank = index + 1;
    });
    
    console.log(`✅ Generated ${marketData.length} mock crypto market data entries`);
    
    // Cache in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(marketData));
        console.log('Crypto market data (mock): Stored in Redis cache');
      } catch (redisError) {
        console.warn('Crypto market data (mock): Failed to store in Redis cache');
      }
    }
    
    return marketData;
  } catch (error) {
    console.error('Error generating mock crypto market data:', error.message);
    throw error;
  }
}

/**
 * Store crypto market data in database (mock - can still store for testing)
 */
async function storeCryptoMarketData(marketData) {
  try {
    console.log(`\nStoring ${marketData.length} mock crypto market data entries in database...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const crypto of marketData) {
      try {
        // Create symbol in format: X:{SYMBOL}USD (e.g., X:BTCUSD)
        const symbol = `X:${crypto.symbol}USD`;
        
        // Update asset_info with latest market data
        await pool.query(
          `UPDATE asset_info 
           SET name = $1, 
               market_cap = $2, 
               logo_url = COALESCE(logo_url, $3),
               updated_at = CURRENT_TIMESTAMP
           WHERE symbol = $4`,
          [crypto.name, crypto.marketCap, crypto.logoUrl, symbol]
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
          `INSERT INTO asset_data (symbol, date, open, high, low, close, volume)
           VALUES ($1, $2, $3, $3, $3, $3, $4)
           ON CONFLICT (symbol, date) DO UPDATE SET
           close = EXCLUDED.close,
           open = EXCLUDED.open,
           high = EXCLUDED.high,
           low = EXCLUDED.low,
           volume = EXCLUDED.volume,
           updated_at = CURRENT_TIMESTAMP`,
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
    
    console.log(`\n✅ Stored mock crypto market data: ${updated} updated, ${errors} errors\n`);
    return { updated, errors };
  } catch (error) {
    console.error('Error storing mock crypto market data:', error.message);
    throw error;
  }
}

/**
 * Get crypto market data (with caching)
 * Fetches from cache or generates mock data
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
        console.warn('Crypto market data (mock): Redis cache read failed');
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
        const marketData = dbResult.rows.map((row, index) => {
          const symbol = row.symbol.replace(/^X:/, '').replace(/USD$/, '');
          const price = parseFloat(row.price) || 0;
          const marketCap = parseFloat(row.market_cap) || 0;
          
          return {
            rank: parseInt(row.rank) || index + 1,
            symbol: symbol,
            name: row.name || row.symbol,
            price: price,
            priceChange1h: generatePriceChange(),
            priceChange24h: generatePriceChange(),
            priceChange7d: generatePriceChange(),
            marketCap: marketCap,
            volume24h: parseFloat(row.volume) || 0,
            circulatingSupply: marketCap > 0 && price > 0 ? marketCap / price : 0,
            totalSupply: null,
            maxSupply: null,
            logoUrl: row.logo_url,
            lastUpdated: new Date().toISOString(),
            coinId: symbol.toLowerCase()
          };
        });
        
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
    
    // Fallback to generating mock data
    return await fetchCryptoMarketData(limit);
  } catch (error) {
    console.error('Error getting mock crypto market data:', error.message);
    throw error;
  }
}

/**
 * Build API URL (mock - returns null)
 */
function buildApiUrl(endpoint, params = {}) {
  return null; // Not used in mock
}

module.exports = {
  fetchCryptoMarketData,
  storeCryptoMarketData,
  getCryptoMarketData,
  buildApiUrl
};

