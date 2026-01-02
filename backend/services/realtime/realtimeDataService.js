/**
 * Real-Time Data Service
 * 
 * Responsibilities:
 * 1. Fetch hourly data for today/last market day (1D) - runs every 5-15 minutes
 * 2. Update latest prices in cache - runs every 1 minute
 * 
 * This service focuses on CURRENT/LIVE data, not historical batch processing.
 * Historical data is handled by the ETL service.
 * 
 * Data Flow:
 * - Hourly Data: API → DB + Redis Cache (for 1D charts)
 * - Latest Prices: API → Redis Cache (for market overview)
 */

const axios = require('axios');
const { pool } = require('../../db');
const { getRedisClient } = require('../../config/redis');
const { determineCategory } = require('../../utils/categoryUtils');

class RealtimeDataService {
  constructor() {
    this.polygonApiKey = process.env.POLYGON_API_KEY;
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;
    this.useMockData = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';
    this.batchSize = 50; // Process assets in batches
    this.requestDelay = 200; // Delay between API requests (ms) to respect rate limits
  }

  /**
   * Fetch hourly data for today/last market day and store in DB + cache
   * This runs frequently (every 5-15 minutes) to keep 1D charts up to date
   * @param {string[]} symbols - Array of symbols to update
   * @returns {Promise<{processed: number, inserted: number, errors: number}>}
   */
  async updateHourlyData(symbols) {
    console.log(`🔄 Starting hourly data update for ${symbols.length} assets...`);

    let processed = 0;
    let totalInserted = 0;
    let errors = 0;

    for (let i = 0; i < symbols.length; i += this.batchSize) {
      const batch = symbols.slice(i, i + this.batchSize);
      
      for (const symbol of batch) {
        try {
          const isCrypto = symbol.startsWith('X:') && symbol.endsWith('USD');
          const inserted = await this.fetchAndStoreHourlyData(symbol, isCrypto);
          totalInserted += inserted;
          processed++;
        } catch (error) {
          console.error(`❌ Error updating hourly data for ${symbol}:`, error.message);
          errors++;
        }
      }

      // Delay between batches to respect rate limits
      if (i + this.batchSize < symbols.length) {
        await this.delay(this.requestDelay);
      }
    }

    console.log(`✅ Hourly data update complete: ${processed} processed, ${totalInserted} records inserted, ${errors} errors`);
    return { processed, inserted: totalInserted, errors };
  }

  /**
   * Fetch hourly data for a single symbol
   * @param {string} symbol - Asset symbol
   * @param {boolean} isCrypto - Whether this is a crypto asset
   * @returns {Promise<number>} Number of records inserted
   */
  async fetchAndStoreHourlyData(symbol, isCrypto = false) {
    try {
      // Determine target date (today or last trading day)
      const targetDate = await this.getLastTradingDay();
      const dateStr = targetDate.toISOString().split('T')[0];

      let hourlyData = [];

      if (this.useMockData) {
        // Use mock data service
        const mockData = require('../utils/mockData');
        
        // Get daily data for this date to base hourly data on
        const dailyResult = await pool.query(
          `SELECT open, high, low, close 
           FROM asset_data 
           WHERE symbol = $1 
             AND date = $2 
             AND timestamp IS NULL
           LIMIT 1`,
          [symbol, dateStr]
        );

        if (dailyResult.rows.length === 0) {
          // Generate daily data first
          const basePrice = mockData.BASE_PRICES[symbol] || 100.00;
          const { price } = mockData.generatePriceChange(basePrice);
          const open = price * 0.99;
          const high = price * 1.01;
          const low = price * 0.98;
          const close = price;
          const volume = mockData.generateVolume(symbol, close);

          await pool.query(
            `INSERT INTO asset_data (symbol, date, timestamp, open, high, low, close, volume, adjusted_close)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (symbol, date, COALESCE(timestamp, '1970-01-01 00:00:00'::timestamp)) DO UPDATE SET
            open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, 
            close = EXCLUDED.close, volume = EXCLUDED.volume, adjusted_close = EXCLUDED.adjusted_close`,
            [symbol, dateStr, open, high, low, close, volume, close]
          );
        }

        const daily = dailyResult.rows[0] || { open: 100, high: 105, low: 95, close: 100 };
        hourlyData = mockData.generateHourlyData(
          symbol,
          targetDate,
          parseFloat(daily.open),
          parseFloat(daily.high),
          parseFloat(daily.low),
          parseFloat(daily.close)
        );
      } else if (isCrypto) {
        // Fetch hourly data from CoinGecko
        hourlyData = await this.fetchCryptoHourlyData(symbol, targetDate);
      } else {
        // Fetch hourly data from Polygon
        hourlyData = await this.fetchPolygonHourlyData(symbol, targetDate);
      }

      if (hourlyData.length === 0) {
        return 0;
      }

      // Store in database
      const inserted = await this.storeHourlyDataInDB(symbol, hourlyData, targetDate);
      
      // Store in Redis cache
      await this.cacheHourlyData(symbol, hourlyData);

      return inserted;
    } catch (error) {
      console.error(`❌ Error fetching/storing hourly data for ${symbol}:`, error.message);
      return 0;
    }
  }

  /**
   * Update latest prices in cache for market overview
   * This runs frequently (every 1 minute) to keep prices current
   * @param {string[]} symbols - Array of symbols to update
   * @returns {Promise<number>} Number of prices updated
   */
  async updateLatestPrices(symbols) {
    if (symbols.length === 0) return 0;

    const redisClient = await getRedisClient();
    if (!redisClient || !redisClient.isOpen) {
      console.warn('⚠️  Redis not available for latest price updates');
      return 0;
    }

    let updated = 0;

    for (const symbol of symbols) {
      try {
        const isCrypto = symbol.startsWith('X:') && symbol.endsWith('USD');
        const latestPrice = await this.fetchLatestPrice(symbol, isCrypto);
        
        if (latestPrice) {
          const cacheKey = `latest_price:${symbol}`;
          await redisClient.setEx(cacheKey, 60, JSON.stringify(latestPrice)); // 1 minute TTL
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating latest price for ${symbol}:`, error.message);
      }
    }

    return updated;
  }

  /**
   * Fetch latest price for a symbol
   * @param {string} symbol - Asset symbol
   * @param {boolean} isCrypto - Whether this is a crypto asset
   * @returns {Promise<object|null>} Latest price data
   */
  async fetchLatestPrice(symbol, isCrypto = false) {
    try {
      if (this.useMockData) {
        const mockData = require('../utils/mockData');
        const basePrice = mockData.BASE_PRICES[symbol] || 100.00;
        const { price, change, changePercent } = mockData.generatePriceChange(basePrice);
        return {
          symbol,
          price,
          change,
          changePercent,
          timestamp: Date.now(),
        };
      }

      if (isCrypto) {
        // Fetch from CoinGecko
        const coinId = this.getCoinGeckoId(symbol);
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
          { timeout: 5000 }
        );
        
        if (response.data && response.data[coinId]) {
          const data = response.data[coinId];
          return {
            symbol,
            price: data.usd,
            change: data.usd_24h_change || 0,
            changePercent: data.usd_24h_change || 0,
            timestamp: Date.now(),
          };
        }
      } else {
        // Fetch from Polygon
        const normalizedSymbol = symbol.replace('^', 'I:');
        const response = await axios.get(
          `https://api.polygon.io/v2/last/nbbo/${normalizedSymbol}?apikey=${this.polygonApiKey}`,
          { timeout: 5000 }
        );
        
        if (response.data && response.data.results) {
          const result = response.data.results;
          const price = result.price || 0;
          // Calculate change from previous close (would need to fetch from DB)
          return {
            symbol,
            price,
            change: 0, // Would need to calculate from previous close
            changePercent: 0,
            timestamp: Date.now(),
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error.message);
    }
    
    return null;
  }

  /**
   * Store hourly data in database
   */
  async storeHourlyDataInDB(symbol, hourlyData, targetDate) {
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // Delete existing hourly data for this date
    await pool.query(
      `DELETE FROM asset_data 
       WHERE symbol = $1 
         AND date = $2 
         AND timestamp IS NOT NULL`,
      [symbol, dateStr]
    );

    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < hourlyData.length; i += batchSize) {
      const batch = hourlyData.slice(i, i + batchSize);
      const values = batch.map(point => {
        const timestamp = point.timestamp instanceof Date 
          ? point.timestamp.toISOString() 
          : new Date(point.timestamp || point.date).toISOString();
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
        totalInserted += batch.length;
      } catch (error) {
        console.error(`Error inserting hourly data batch for ${symbol}:`, error.message);
      }
    }

    return totalInserted;
  }

  /**
   * Cache hourly data in Redis
   */
  async cacheHourlyData(symbol, hourlyData) {
    const redisClient = await getRedisClient();
    if (!redisClient || !redisClient.isOpen) return;

    try {
      // Use date-based cache key to match backend route expectations
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const cacheKey = `hourly_data:${symbol}:${todayStr}`;
      
      const formatted = hourlyData.map(point => ({
        timestamp: point.timestamp instanceof Date 
          ? point.timestamp.toISOString() 
          : new Date(point.timestamp || point.date).toISOString(),
        date: point.date instanceof Date 
          ? point.date.toISOString().split('T')[0] 
          : new Date(point.date || point.timestamp).toISOString().split('T')[0],
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume || 0,
      }));
      
      await redisClient.setEx(cacheKey, 2 * 60, JSON.stringify(formatted)); // TTL: 2 minutes
    } catch (error) {
      console.error(`Error caching hourly data for ${symbol}:`, error.message);
    }
  }

  /**
   * Get last trading day (today if weekday, or last Friday if weekend)
   */
  async getLastTradingDay() {
    const now = new Date();
    const day = now.getDay();
    
    // If it's Saturday (6) or Sunday (0), go back to Friday
    if (day === 0) {
      now.setDate(now.getDate() - 2);
    } else if (day === 6) {
      now.setDate(now.getDate() - 1);
    }
    
    return now;
  }

  /**
   * Get CoinGecko ID from symbol
   */
  getCoinGeckoId(symbol) {
    const mapping = {
      'X:BTCUSD': 'bitcoin',
      'X:ETHUSD': 'ethereum',
      'X:ADAUSD': 'cardano',
      'X:DOGEUSD': 'dogecoin',
    };
    return mapping[symbol] || symbol.toLowerCase().replace('x:', '').replace('usd', '');
  }

  /**
   * Fetch crypto hourly data from CoinGecko
   */
  async fetchCryptoHourlyData(symbol, targetDate) {
    // Implementation would fetch from CoinGecko hourly API
    // For now, return empty array (would need CoinGecko Pro API)
    return [];
  }

  /**
   * Fetch hourly data from Polygon
   */
  async fetchPolygonHourlyData(symbol, targetDate) {
    // Implementation would fetch from Polygon aggregates API
    // For now, return empty array
    return [];
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new RealtimeDataService();

