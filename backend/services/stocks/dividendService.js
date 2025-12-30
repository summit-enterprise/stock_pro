const axios = require('axios');
const redis = require('redis');
const { pool } = require('../../db');

// Redis client for caching dividends
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Dividend Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('Dividend Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

const DIVIDENDS_CACHE_TTL = 24 * 60 * 60; // 24 hours

// Check if we should use mock data
const USE_MOCK_DATA = process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_DATA !== 'false';

/**
 * Fetch dividends from Polygon.io API
 */
async function fetchDividendsFromAPI(symbol) {
  if (!process.env.POLYGON_API_KEY) {
    console.warn('POLYGON_API_KEY not set, using mock dividend data');
    return generateMockDividends(symbol);
  }

  try {
    const url = `https://api.polygon.io/v2/reference/dividends/${symbol}?apiKey=${process.env.POLYGON_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.results) {
      return response.data.results.map(div => ({
        exDate: div.exDate,
        paymentDate: div.paymentDate,
        recordDate: div.recordDate,
        declaredDate: div.declaredDate,
        amount: div.amount,
        currency: div.currency || 'USD',
        frequency: div.frequency || null,
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching dividends for ${symbol}:`, error.message);
    return generateMockDividends(symbol);
  }
}

/**
 * Generate mock dividend data for development
 */
function generateMockDividends(symbol) {
  const dividends = [];
  const baseAmount = symbol.includes('BTC') || symbol.includes('ETH') ? 0 : 
                    symbol.includes('JNJ') || symbol.includes('PFE') ? 1.5 :
                    symbol.includes('AAPL') || symbol.includes('MSFT') ? 0.5 : 0.25;
  
  if (baseAmount === 0) return []; // Crypto doesn't pay dividends

  // Generate quarterly dividends for the last 5 years
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 5, 0, 1);
  
  let currentDate = new Date(startDate);
  let quarter = 0;

  while (currentDate <= today) {
    // Quarterly dividends (every ~90 days)
    const exDate = new Date(currentDate);
    exDate.setMonth(exDate.getMonth() + (quarter % 12 === 0 ? 0 : 3));
    
    const paymentDate = new Date(exDate);
    paymentDate.setDate(paymentDate.getDate() + 30); // Payment ~30 days after ex-date
    
    const recordDate = new Date(exDate);
    recordDate.setDate(recordDate.getDate() - 2); // Record date ~2 days before ex-date

    // Add some variation to amounts
    const variation = (Math.random() * 0.1 - 0.05); // ±5% variation
    const amount = baseAmount * (1 + variation);

    dividends.push({
      exDate: exDate.toISOString().split('T')[0],
      paymentDate: paymentDate.toISOString().split('T')[0],
      recordDate: recordDate.toISOString().split('T')[0],
      declaredDate: null,
      amount: parseFloat(amount.toFixed(4)),
      currency: 'USD',
      frequency: 'quarterly',
    });

    quarter += 3;
    currentDate = new Date(exDate);
    currentDate.setMonth(currentDate.getMonth() + 3);
  }

  return dividends.reverse(); // Most recent first
}

/**
 * Store dividends in database
 */
async function storeDividends(symbol, dividends) {
  if (!dividends || dividends.length === 0) return;

  try {
    for (const div of dividends) {
      await pool.query(
        `INSERT INTO dividends (symbol, ex_date, payment_date, record_date, declared_date, amount, currency, frequency, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol, ex_date, amount) 
         DO UPDATE SET 
           payment_date = EXCLUDED.payment_date,
           record_date = EXCLUDED.record_date,
           declared_date = EXCLUDED.declared_date,
           currency = EXCLUDED.currency,
           frequency = EXCLUDED.frequency,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          div.exDate || div.ex_date,
          div.paymentDate || div.payment_date || null,
          div.recordDate || div.record_date || null,
          div.declaredDate || div.declared_date || null,
          div.amount,
          div.currency || 'USD',
          div.frequency || null,
        ]
      );
    }
  } catch (error) {
    console.error(`Error storing dividends for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get dividends from database
 */
async function getDividendsFromDB(symbol, limit = null) {
  try {
    let query = `
      SELECT 
        id,
        symbol,
        ex_date,
        payment_date,
        record_date,
        declared_date,
        amount,
        currency,
        frequency,
        created_at,
        updated_at
      FROM dividends
      WHERE symbol = $1
      ORDER BY ex_date DESC
    `;

    const params = [symbol];
    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      exDate: row.ex_date,
      paymentDate: row.payment_date,
      recordDate: row.record_date,
      declaredDate: row.declared_date,
      amount: parseFloat(row.amount),
      currency: row.currency,
      frequency: row.frequency,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error(`Error fetching dividends from DB for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Cache dividends in Redis
 */
async function cacheDividends(symbol, dividends) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `dividends:${symbol.toUpperCase()}`;
      await redisClient.setEx(cacheKey, DIVIDENDS_CACHE_TTL, JSON.stringify(dividends));
    } catch (error) {
      console.warn(`Failed to cache dividends for ${symbol}:`, error.message);
    }
  }
}

/**
 * Get dividends from cache
 */
async function getDividendsFromCache(symbol) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `dividends:${symbol.toUpperCase()}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`Failed to get dividends from cache for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Fetch and sync dividends for a symbol
 */
async function fetchAndSyncDividends(symbol) {
  try {
    // Initialize Redis if needed
    await initRedis();

    // Check cache first
    const cached = await getDividendsFromCache(symbol);
    if (cached) {
      console.log(`Dividends cache hit for ${symbol}`);
      return cached;
    }

    // First check database
    const dbDividends = await getDividendsFromDB(symbol);
    
    // If we have recent data (within last 30 days), use it
    if (dbDividends.length > 0) {
      const mostRecent = new Date(dbDividends[0].exDate);
      const daysSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
      
      // If data is less than 30 days old, cache and return it
      if (daysSinceUpdate < 30) {
        await cacheDividends(symbol, dbDividends);
        return dbDividends;
      }
    }

    // Fetch from API
    const apiDividends = USE_MOCK_DATA 
      ? generateMockDividends(symbol)
      : await fetchDividendsFromAPI(symbol);

    // Store in database
    if (apiDividends.length > 0) {
      await storeDividends(symbol, apiDividends);
    }

    // Return combined data (prefer API, fallback to DB)
    const finalDividends = apiDividends.length > 0 ? apiDividends.map(div => ({
      exDate: div.exDate,
      paymentDate: div.paymentDate,
      recordDate: div.recordDate,
      declaredDate: div.declaredDate,
      amount: div.amount,
      currency: div.currency,
      frequency: div.frequency,
    })) : dbDividends;

    // Cache the results
    await cacheDividends(symbol, finalDividends);

    return finalDividends;
  } catch (error) {
    console.error(`Error in fetchAndSyncDividends for ${symbol}:`, error.message);
    // Fallback to database
    return await getDividendsFromDB(symbol);
  }
}

/**
 * Get dividend statistics for a symbol
 */
async function getDividendStats(symbol) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_dividends,
        SUM(amount) as total_paid,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        MIN(ex_date) as first_dividend,
        MAX(ex_date) as last_dividend,
        frequency
      FROM dividends
      WHERE symbol = $1
      GROUP BY frequency`,
      [symbol]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const stats = result.rows[0];
    return {
      totalDividends: parseInt(stats.total_dividends),
      totalPaid: parseFloat(stats.total_paid),
      avgAmount: parseFloat(stats.avg_amount),
      minAmount: parseFloat(stats.min_amount),
      maxAmount: parseFloat(stats.max_amount),
      firstDividend: stats.first_dividend,
      lastDividend: stats.last_dividend,
      frequency: stats.frequency,
    };
  } catch (error) {
    console.error(`Error getting dividend stats for ${symbol}:`, error.message);
    return null;
  }
}

module.exports = {
  fetchDividendsFromAPI,
  generateMockDividends,
  storeDividends,
  getDividendsFromDB,
  fetchAndSyncDividends,
  getDividendStats,
  cacheDividends,
  getDividendsFromCache,
  initRedis,
  getRedisClient: () => redisClient,
};

