/**
 * Data Ingestion Service (ETL)
 * 
 * Responsibilities:
 * 1. Batch upload historical daily data to DB (7D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX)
 * 
 * NOTE: Hourly data and latest prices are now handled by the Real-Time Data Service.
 * This ETL service focuses ONLY on historical batch processing.
 * 
 * Data Flow:
 * - Historical Daily Data: API → DB (TimescaleDB)
 */

const axios = require('axios');
const { pool } = require('../../db');
const { getRedisClient } = require('../../config/redis');
const { determineCategory } = require('../../utils/categoryUtils');

class DataIngestionService {
  constructor() {
    this.polygonApiKey = process.env.POLYGON_API_KEY;
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;
    this.useMockData = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
    this.batchSize = 50; // Process assets in batches
    this.requestDelay = 200; // Delay between API requests (ms) to respect rate limits
  }

  /**
   * Fetch historical daily data for a symbol and store in DB
   * @param {string} symbol - Asset symbol
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {boolean} isCrypto - Whether this is a crypto asset
   * @returns {Promise<number>} Number of records inserted
   */
  async fetchAndStoreDailyData(symbol, startDate, endDate, isCrypto = false) {
    try {
      let priceData = [];

      if (this.useMockData) {
        // Use mock data service
        const mockData = require('../utils/mockData');
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // For MAX range or large date ranges (>10 years), use extended historical data
        if (timeRange === 'MAX' || daysDiff > 3650) {
          const extendedData = mockData.generateExtendedHistoricalData(symbol, false); // No hourly for batch
          // Filter to the requested date range
          priceData = extendedData.daily
            .filter(point => {
              const pointDate = point.date instanceof Date ? point.date : new Date(point.date);
              return pointDate >= startDate && pointDate <= endDate;
            })
            .map(point => ({
              date: point.date,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
            }));
        } else {
          // Check if asset is crypto (crypto trades on weekends)
          const isCryptoAsset = symbol.startsWith('X:') && !symbol.includes('XAU') && 
                                !symbol.includes('XAG') && !symbol.includes('OIL') && 
                                !symbol.includes('GAS');
          const historicalData = mockData.generateHistoricalData(symbol, daysDiff, isCryptoAsset); // Only include weekends for crypto
          priceData = historicalData.map(point => ({
            date: point.date,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume,
          }));
        }
      } else if (isCrypto) {
        // Fetch from CoinGecko
        priceData = await this.fetchCryptoDailyData(symbol, startDate, endDate);
      } else {
        // Fetch from Polygon
        priceData = await this.fetchPolygonDailyData(symbol, startDate, endDate);
      }

      if (priceData.length === 0) {
        console.log(`⚠️  No daily data fetched for ${symbol}`);
        return 0;
      }

      // Store in database
      const inserted = await this.storeDailyDataInDB(symbol, priceData);
      console.log(`✅ Stored ${inserted} daily records for ${symbol}`);
      return inserted;
    } catch (error) {
      console.error(`❌ Error fetching/storing daily data for ${symbol}:`, error.message);
      return 0;
    }
  }

  /**
   * Fetch hourly data for today/last market day and store in DB + cache
   * @param {string} symbol - Asset symbol
   * @param {boolean} isCrypto - Whether this is a crypto asset
   * @returns {Promise<number>} Number of hourly records inserted
   */
  async fetchAndStoreHourlyData(symbol, isCrypto = false) {
    try {
      // Determine the target date (today or last trading day)
      const targetDate = this.getLastTradingDay();
      let hourlyData = [];

      if (this.useMockData) {
        // Use mock data service
        const mockData = require('../utils/mockData');
        const { BASE_PRICES } = mockData;
        const basePrice = BASE_PRICES[symbol] || 100.00;
        
        // Get daily data for the target date
        const dailyResult = await pool.query(
          `SELECT open, high, low, close 
           FROM asset_data 
           WHERE symbol = $1 
             AND date = $2 
             AND timestamp IS NULL
           LIMIT 1`,
          [symbol, targetDate.toISOString().split('T')[0]]
        );

        let dailyOpen, dailyHigh, dailyLow, dailyClose;
        if (dailyResult.rows.length > 0) {
          dailyOpen = parseFloat(dailyResult.rows[0].open);
          dailyHigh = parseFloat(dailyResult.rows[0].high);
          dailyLow = parseFloat(dailyResult.rows[0].low);
          dailyClose = parseFloat(dailyResult.rows[0].close);
        } else {
          // Generate daily data first
          const dailyData = mockData.generateHistoricalData(symbol, 1, false)[0];
          dailyOpen = dailyData.open;
          dailyHigh = dailyData.high;
          dailyLow = dailyData.low;
          dailyClose = dailyData.close;
        }

        hourlyData = mockData.generateHourlyData(symbol, targetDate, dailyOpen, dailyHigh, dailyLow, dailyClose);
      } else if (isCrypto) {
        // Fetch hourly data from CoinGecko
        hourlyData = await this.fetchCryptoHourlyData(symbol, targetDate);
      } else {
        // Fetch hourly data from Polygon
        hourlyData = await this.fetchPolygonHourlyData(symbol, targetDate);
      }

      if (hourlyData.length === 0) {
        console.log(`⚠️  No hourly data fetched for ${symbol}`);
        return 0;
      }

      // Store in database
      const inserted = await this.storeHourlyDataInDB(symbol, hourlyData, targetDate);
      
      // Store in Redis cache
      await this.cacheHourlyData(symbol, hourlyData);

      console.log(`✅ Stored ${inserted} hourly records for ${symbol} (${targetDate.toISOString().split('T')[0]})`);
      return inserted;
    } catch (error) {
      console.error(`❌ Error fetching/storing hourly data for ${symbol}:`, error.message);
      return 0;
    }
  }

  /**
   * Update latest prices in cache for market overview
   * @param {string[]} symbols - Array of symbols to update
   * @returns {Promise<number>} Number of prices updated
   */
  async updateLatestPrices(symbols) {
    try {
      const redisClient = await getRedisClient();
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not available, skipping latest price cache update');
        return 0;
      }

      let updated = 0;
      const batchSize = 20; // Process in smaller batches for latest prices

      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const pricePromises = batch.map(symbol => this.fetchLatestPrice(symbol));
        const prices = await Promise.all(pricePromises);

        for (let j = 0; j < batch.length; j++) {
          const symbol = batch[j];
          const priceData = prices[j];
          
          if (priceData) {
            const cacheKey = `latest_price:${symbol}`;
            await redisClient.setEx(cacheKey, 60, JSON.stringify(priceData)); // TTL: 1 minute
            updated++;
          }
        }

        // Delay between batches
        if (i + batchSize < symbols.length) {
          await this.delay(this.requestDelay);
        }
      }

      console.log(`✅ Updated ${updated} latest prices in cache`);
      return updated;
    } catch (error) {
      console.error(`❌ Error updating latest prices:`, error.message);
      return 0;
    }
  }

  /**
   * Batch ingest historical data for all assets
   * @param {string[]} symbols - Array of symbols to process
   * @param {string} timeRange - Time range ('7D', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX')
   * @returns {Promise<Object>} Summary of ingestion
   */
  async batchIngestHistoricalData(symbols, timeRange = '1Y') {
    console.log(`🚀 Starting batch historical data ingestion for ${symbols.length} assets (${timeRange})...`);

    const dateRange = this.calculateDateRange(timeRange);
    const isCryptoMap = new Map(); // Cache crypto detection

    let totalInserted = 0;
    let processed = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);
      
      for (const symbol of batch) {
        try {
          // Determine if crypto (cache result)
          if (!isCryptoMap.has(symbol)) {
            isCryptoMap.set(symbol, symbol.startsWith('X:') && symbol.endsWith('USD'));
          }
          const isCrypto = isCryptoMap.get(symbol);

          const inserted = await this.fetchAndStoreDailyData(symbol, dateRange.start, dateRange.end, isCrypto, timeRange);
          totalInserted += inserted;
          processed++;

          // Delay between requests
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error.message);
          errors++;
        }
      }

      console.log(`📊 Progress: ${Math.min(i + this.batchSize, symbols.length)}/${symbols.length} assets processed`);
    }

    return {
      totalInserted,
      processed,
      errors,
      timeRange,
    };
  }

  /**
   * Batch ingest hourly data for all assets (1D)
   * @param {string[]} symbols - Array of symbols to process
   * @returns {Promise<Object>} Summary of ingestion
   */
  async batchIngestHourlyData(symbols) {
    console.log(`🚀 Starting batch hourly data ingestion for ${symbols.length} assets (1D)...`);

    let totalInserted = 0;
    let processed = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);
      
      for (const symbol of batch) {
        try {
          const isCrypto = symbol.startsWith('X:') && symbol.endsWith('USD');
          const inserted = await this.fetchAndStoreHourlyData(symbol, isCrypto);
          totalInserted += inserted;
          processed++;

          // Delay between requests
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error.message);
          errors++;
        }
      }

      console.log(`📊 Progress: ${Math.min(i + this.batchSize, symbols.length)}/${symbols.length} assets processed`);
    }

    return {
      totalInserted,
      processed,
      errors,
    };
  }

  // ============================================================================
  // Helper Methods - Polygon API
  // ============================================================================

  async fetchPolygonDailyData(symbol, startDate, endDate) {
    if (!this.polygonApiKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${start}/${end}?apiKey=${this.polygonApiKey}&adjusted=true&sort=asc`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data && response.data.results) {
        return response.data.results.map(result => ({
          date: new Date(result.t),
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v,
        }));
      }
      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Polygon API rate limit exceeded');
      }
      throw error;
    }
  }

  async fetchPolygonHourlyData(symbol, targetDate) {
    if (!this.polygonApiKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/hour/${dateStr}/${dateStr}?apiKey=${this.polygonApiKey}&adjusted=true&sort=asc`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data && response.data.results) {
        return response.data.results.map(result => ({
          timestamp: new Date(result.t),
          open: result.o,
          high: result.h,
          low: result.l,
          close: result.c,
          volume: result.v,
        }));
      }
      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Polygon API rate limit exceeded');
      }
      throw error;
    }
  }

  async fetchLatestPrice(symbol) {
    if (this.useMockData) {
      const mockData = require('../utils/mockData');
      const price = mockData.getCurrentPrice(symbol);
      const prevClose = mockData.getPreviousClose(symbol);
      return {
        symbol,
        price,
        change: price - prevClose,
        changePercent: prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0,
        timestamp: new Date().toISOString(),
      };
    }

    const isCrypto = symbol.startsWith('X:') && symbol.endsWith('USD');
    
    if (isCrypto) {
      return await this.fetchCryptoLatestPrice(symbol);
    } else {
      return await this.fetchPolygonLatestPrice(symbol);
    }
  }

  async fetchPolygonLatestPrice(symbol) {
    if (!this.polygonApiKey) {
      return null;
    }

    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${this.polygonApiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data.results && response.data.results.length > 0) {
        const data = response.data.results[0];
        const currentPrice = data.c;
        
        // Get previous close from DB
        const dbResult = await pool.query(
          'SELECT close FROM asset_data WHERE symbol = $1 AND timestamp IS NULL ORDER BY date DESC LIMIT 1',
          [symbol]
        );
        const previousClose = dbResult.rows[0]?.close || currentPrice;
        
        return {
          symbol,
          price: currentPrice,
          change: currentPrice - previousClose,
          changePercent: previousClose !== 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
          timestamp: new Date().toISOString(),
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error.message);
      return null;
    }
  }

  // ============================================================================
  // Helper Methods - CoinGecko API
  // ============================================================================

  async fetchCryptoDailyData(symbol, startDate, endDate) {
    // Extract coin ID from symbol (e.g., X:BTCUSD -> btc)
    const coinId = this.getCoinGeckoId(symbol);
    if (!coinId) {
      throw new Error(`No CoinGecko ID found for ${symbol}`);
    }

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data && response.data.prices) {
        // CoinGecko returns prices array, need to convert to OHLCV
        // For simplicity, we'll use price as close and estimate OHLC
        return response.data.prices.map(([timestamp, price], index, array) => {
          const prevPrice = index > 0 ? array[index - 1][1] : price;
          const volatility = 0.02; // 2% volatility estimate
          const change = (Math.random() * 2 - 1) * volatility;
          
          return {
            date: new Date(timestamp),
            open: prevPrice,
            high: price * (1 + Math.abs(change) * 0.5),
            low: price * (1 - Math.abs(change) * 0.5),
            close: price,
            volume: 0, // CoinGecko doesn't provide volume in this endpoint
          };
        });
      }
      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('CoinGecko API rate limit exceeded');
      }
      throw error;
    }
  }

  async fetchCryptoHourlyData(symbol, targetDate) {
    // CoinGecko doesn't have a direct hourly endpoint
    // We'll fetch daily data and interpolate, or use a different approach
    // For now, return empty array and let the system handle it
    return [];
  }

  async fetchCryptoLatestPrice(symbol) {
    const coinId = this.getCoinGeckoId(symbol);
    if (!coinId) {
      return null;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data[coinId]) {
        const data = response.data[coinId];
        return {
          symbol,
          price: data.usd || 0,
          change: (data.usd_24h_change || 0) * (data.usd || 0) / 100,
          changePercent: data.usd_24h_change || 0,
          timestamp: new Date().toISOString(),
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching crypto latest price for ${symbol}:`, error.message);
      return null;
    }
  }

  // ============================================================================
  // Database Storage Methods
  // ============================================================================

  async storeDailyDataInDB(symbol, priceData) {
    let inserted = 0;
    const batchSize = 100;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let todayRecord = null;

    for (let i = 0; i < priceData.length; i += batchSize) {
      const batch = priceData.slice(i, i + batchSize);
      const values = batch.map(point => {
        const dateStr = point.date.toISOString().split('T')[0];
        return `('${symbol}', '${dateStr}', NULL, ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume || 0}, ${point.close})`;
      }).join(',');

      try {
        await pool.query(
          `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
           VALUES ${values}
           ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
           open = EXCLUDED.open,
           high = EXCLUDED.high,
           low = EXCLUDED.low,
           close = EXCLUDED.close,
           volume = EXCLUDED.volume,
           adjusted_close = EXCLUDED.adjusted_close`
        );
        inserted += batch.length;
        
        // Check if this batch contains today's record
        if (!todayRecord) {
          const todayPoint = batch.find(point => {
            const dateStr = point.date.toISOString().split('T')[0];
            return dateStr === todayStr;
          });
          if (todayPoint) {
            todayRecord = {
              date: todayStr,
              open: parseFloat(todayPoint.open),
              high: parseFloat(todayPoint.high),
              low: parseFloat(todayPoint.low),
              close: parseFloat(todayPoint.close),
              volume: parseFloat(todayPoint.volume) || 0,
            };
          }
        }
      } catch (error) {
        console.error(`Error inserting daily data batch for ${symbol}:`, error.message);
      }
    }

    // Cache today's daily record in Redis for 1D chart access
    if (todayRecord) {
      try {
        const redisClient = await getRedisClient();
        if (redisClient && redisClient.isOpen) {
          const dailyCacheKey = `daily_data:${symbol}:${todayStr}`;
          await redisClient.setEx(dailyCacheKey, 24 * 60 * 60, JSON.stringify(todayRecord)); // 24 hour TTL
          console.log(`✅ Cached today's daily record for ${symbol} (1D)`);
        }
      } catch (cacheError) {
        console.warn(`⚠️  Failed to cache daily record for ${symbol}:`, cacheError.message);
      }
    }

    return inserted;
  }

  async storeHourlyDataInDB(symbol, hourlyData, targetDate) {
    let inserted = 0;
    const dateStr = targetDate.toISOString().split('T')[0];
    const batchSize = 50;

    // Delete existing hourly data for this date
    await pool.query(
      `DELETE FROM asset_data 
       WHERE symbol = $1 
         AND date = $2 
         AND timestamp IS NOT NULL`,
      [symbol, dateStr]
    );

    for (let i = 0; i < hourlyData.length; i += batchSize) {
      const batch = hourlyData.slice(i, i + batchSize);
      const values = batch.map(point => {
        // Handle timestamp - could be Date object, timestamp number, or date object
        let timestamp;
        if (point.timestamp instanceof Date) {
          timestamp = point.timestamp.toISOString();
        } else if (point.date instanceof Date) {
          timestamp = point.date.toISOString();
        } else if (typeof point.timestamp === 'number') {
          timestamp = new Date(point.timestamp).toISOString();
        } else {
          // Fallback: use the targetDate
          timestamp = targetDate.toISOString();
        }
        return `('${symbol}', '${dateStr}', '${timestamp}', ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume || 0}, ${point.close})`;
      }).join(',');

      try {
        await pool.query(
          `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
           VALUES ${values}
           ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
           open = EXCLUDED.open,
           high = EXCLUDED.high,
           low = EXCLUDED.low,
           close = EXCLUDED.close,
           volume = EXCLUDED.volume,
           adjusted_close = EXCLUDED.adjusted_close`
        );
        inserted += batch.length;
      } catch (error) {
        console.error(`Error inserting hourly data batch for ${symbol}:`, error.message);
      }
    }

    return inserted;
  }

  // ============================================================================
  // Cache Methods
  // ============================================================================

  async cacheHourlyData(symbol, hourlyData) {
    try {
      const redisClient = await getRedisClient();
      if (!redisClient || !redisClient.isOpen) {
        return;
      }

      const cacheKey = `hourly_data:${symbol}:1D`;
      await redisClient.setEx(cacheKey, 2 * 60, JSON.stringify(hourlyData)); // TTL: 2 minutes
    } catch (error) {
      console.warn(`Failed to cache hourly data for ${symbol}:`, error.message);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  calculateDateRange(timeRange) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    switch (timeRange) {
      case '7D':
        start.setDate(start.getDate() - 6);
        break;
      case '1M':
        start.setUTCMonth(start.getUTCMonth() - 1);
        break;
      case '3M':
        start.setUTCMonth(start.getUTCMonth() - 3);
        break;
      case '6M':
        start.setUTCMonth(start.getUTCMonth() - 6);
        break;
      case 'YTD':
        start.setUTCMonth(0, 1);
        break;
      case '1Y':
        start.setUTCFullYear(start.getUTCFullYear() - 1);
        break;
      case '3Y':
        start.setUTCFullYear(start.getUTCFullYear() - 3);
        break;
      case '5Y':
        start.setUTCFullYear(start.getUTCFullYear() - 5);
        break;
      case 'MAX':
        // 10 years of historical data
        start.setUTCFullYear(start.getUTCFullYear() - 10);
        break;
      default:
        start.setUTCFullYear(start.getUTCFullYear() - 1);
    }

    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  getLastTradingDay() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // If today is Saturday (6) or Sunday (0), go back to Friday
    if (dayOfWeek === 0) {
      today.setDate(today.getDate() - 2);
    } else if (dayOfWeek === 6) {
      today.setDate(today.getDate() - 1);
    }
    
    today.setHours(0, 0, 0, 0);
    return today;
  }

  getCoinGeckoId(symbol) {
    // Map crypto symbols to CoinGecko IDs
    const symbolMap = {
      'X:BTCUSD': 'bitcoin',
      'X:ETHUSD': 'ethereum',
      'X:ADAUSD': 'cardano',
      'X:DOTUSD': 'polkadot',
      'X:LINKUSD': 'chainlink',
      'X:LTCUSD': 'litecoin',
      'X:XRPUSD': 'ripple',
      'X:BNBUSD': 'binancecoin',
      'X:SOLUSD': 'solana',
      'X:DOGEUSD': 'dogecoin',
    };
    
    return symbolMap[symbol] || null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new DataIngestionService();

