/**
 * Crypto Price Service
 * Handles cryptocurrency price data (historical and current prices)
 * Separated from cryptoService for better organization
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
 * Fetch historical price data for a cryptocurrency
 * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin')
 * @param {string} symbol - Crypto symbol (e.g., 'BTC')
 * @param {Date} startDate - Start date for historical data
 * @param {Date} endDate - End date for historical data
 * @returns {Promise<Array>} Array of price data points
 */
async function fetchHistoricalPrices(coinId, symbol, startDate, endDate) {
  try {
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    const url = buildApiUrl(`/coins/${coinId}/market_chart/range`, {
      vs_currency: 'usd',
      from: startTimestamp,
      to: endTimestamp
    });
    
    const response = await axios.get(url, { timeout: 30000 });
    
    if (response.data && response.data.prices) {
      // Convert to our format
      const priceData = response.data.prices.map(([timestamp, price]) => {
        const date = new Date(timestamp);
        return {
          timestamp: date,
          date: date.toISOString().split('T')[0],
          price: price
        };
      });
      
      // Also get high/low data if available
      const highLowData = response.data.total_volumes || [];
      const marketCapData = response.data.market_caps || [];
      
      // Combine data (CoinGecko doesn't provide OHLC, so we'll use price for all)
      const historicalData = priceData.map((point, index) => {
        const volume = highLowData[index] ? highLowData[index][1] : 0;
        const marketCap = marketCapData[index] ? marketCapData[index][1] : 0;
        
        // Estimate high/low as ±2% of price (CoinGecko doesn't provide OHLC)
        const volatility = 0.02;
        const high = point.price * (1 + volatility);
        const low = point.price * (1 - volatility);
        
        return {
          date: point.date,
          open: point.price,
          high: high,
          low: low,
          close: point.price,
          volume: Math.floor(volume),
          adjusted_close: point.price
        };
      });
      
      return historicalData;
    }
    
    return [];
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`Rate limited for ${symbol}, waiting 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Retry once
      return fetchHistoricalPrices(coinId, symbol, startDate, endDate);
    }
    console.error(`Error fetching historical prices for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Fetch current price for a cryptocurrency
 * @param {string} coinId - CoinGecko coin ID
 * @param {string} symbol - Crypto symbol
 * @returns {Promise<Object>} Current price data
 */
async function fetchCurrentPrice(coinId, symbol) {
  try {
    const url = buildApiUrl(`/simple/price`, {
      ids: coinId,
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_market_cap: true,
      include_24hr_vol: true
    });
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data[coinId]) {
      const data = response.data[coinId];
      return {
        symbol: symbol,
        price: data.usd || 0,
        priceChange24h: data.usd_24h_change || 0,
        marketCap: data.usd_market_cap || 0,
        volume24h: data.usd_24h_vol || 0,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching current price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Store historical price data in TimescaleDB
 * @param {string} symbol - Crypto symbol (e.g., 'X:BTCUSD')
 * @param {Array} priceData - Array of price data points
 */
async function storeHistoricalPrices(symbol, priceData) {
  try {
    if (!priceData || priceData.length === 0) {
      return { inserted: 0, updated: 0 };
    }
    
    let inserted = 0;
    let updated = 0;
    
    // Insert in batches for performance
    const batchSize = 100;
    for (let i = 0; i < priceData.length; i += batchSize) {
      const batch = priceData.slice(i, i + batchSize);
      
      for (const point of batch) {
        try {
          await pool.query(
            `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (symbol, date) 
             DO UPDATE SET 
               open = EXCLUDED.open,
               high = EXCLUDED.high,
               low = EXCLUDED.low,
               close = EXCLUDED.close,
               volume = EXCLUDED.volume,
               adjusted_close = EXCLUDED.adjusted_close`,
            [
              symbol,
              point.date,
              point.open,
              point.high,
              point.low,
              point.close,
              point.volume,
              point.adjusted_close
            ]
          );
          
          // Check if it was an insert or update
          const result = await pool.query(
            'SELECT COUNT(*) FROM asset_data WHERE symbol = $1 AND date = $2',
            [symbol, point.date]
          );
          
          if (result.rows[0].count === '1') {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`  Error storing price data for ${symbol} on ${point.date}:`, error.message);
        }
      }
    }
    
    return { inserted, updated };
  } catch (error) {
    console.error(`Error storing historical prices for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Sync historical prices for a crypto (back to 2011 or coin launch date)
 * @param {string} coinId - CoinGecko coin ID
 * @param {string} symbol - Crypto symbol (e.g., 'BTC')
 * @param {string} dbSymbol - Database symbol (e.g., 'X:BTCUSD')
 */
async function syncHistoricalPrices(coinId, symbol, dbSymbol) {
  try {
    // Check what data we already have
    const existingData = await pool.query(
      `SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
       FROM asset_data 
       WHERE symbol = $1`,
      [dbSymbol]
    );
    
    const hasData = existingData.rows[0].count > 0;
    const minDate = hasData ? new Date(existingData.rows[0].min_date) : null;
    const maxDate = hasData ? new Date(existingData.rows[0].max_date) : null;
    
    // Start from 2011-01-01 or coin launch, whichever is later
    const startDate = new Date('2011-01-01');
    const endDate = new Date();
    
    // If we have data, only fetch missing ranges
    let fetchStart = startDate;
    let fetchEnd = endDate;
    
    if (hasData) {
      // Fetch data before existing min date
      if (minDate > startDate) {
        fetchStart = startDate;
        fetchEnd = new Date(minDate);
        fetchEnd.setDate(fetchEnd.getDate() - 1);
        
        console.log(`  Fetching historical data from ${fetchStart.toISOString().split('T')[0]} to ${fetchEnd.toISOString().split('T')[0]}`);
        const earlyData = await fetchHistoricalPrices(coinId, symbol, fetchStart, fetchEnd);
        if (earlyData.length > 0) {
          const result = await storeHistoricalPrices(dbSymbol, earlyData);
          console.log(`    ✅ Stored ${result.inserted} new, ${result.updated} updated`);
        }
      }
      
      // Fetch data after existing max date
      if (maxDate < endDate) {
        fetchStart = new Date(maxDate);
        fetchStart.setDate(fetchStart.getDate() + 1);
        fetchEnd = endDate;
      } else {
        // All data is up to date
        console.log(`  ✅ ${symbol}: Historical data is up to date`);
        return { inserted: 0, updated: 0 };
      }
    }
    
    console.log(`  Fetching historical data from ${fetchStart.toISOString().split('T')[0]} to ${fetchEnd.toISOString().split('T')[0]}`);
    
    // CoinGecko has a limit on date range (90 days per request for free tier)
    // So we need to fetch in chunks
    const chunkSize = 90; // days
    let currentStart = fetchStart;
    let totalInserted = 0;
    let totalUpdated = 0;
    
    while (currentStart < fetchEnd) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + chunkSize);
      if (currentEnd > fetchEnd) {
        currentEnd.setTime(fetchEnd.getTime());
      }
      
      try {
        const chunkData = await fetchHistoricalPrices(coinId, symbol, currentStart, currentEnd);
        if (chunkData.length > 0) {
          const result = await storeHistoricalPrices(dbSymbol, chunkData);
          totalInserted += result.inserted;
          totalUpdated += result.updated;
          console.log(`    ✅ Chunk ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}: ${result.inserted} new, ${result.updated} updated`);
        }
        
        // Rate limiting: wait between chunks
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`    ❌ Error fetching chunk for ${symbol}:`, error.message);
      }
      
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }
    
    return { inserted: totalInserted, updated: totalUpdated };
  } catch (error) {
    console.error(`Error syncing historical prices for ${symbol}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchHistoricalPrices,
  fetchCurrentPrice,
  storeHistoricalPrices,
  syncHistoricalPrices
};

