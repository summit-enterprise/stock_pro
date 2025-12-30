const axios = require('axios');
const redis = require('redis');
const { pool } = require('../../db');

// Redis client for caching ratings
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Analyst Ratings Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('Analyst Ratings Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

const RATINGS_CACHE_TTL = 24 * 60 * 60; // 24 hours

// Analyst firm names for mock data
const ANALYST_FIRMS = [
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Citigroup',
  'Wells Fargo', 'Barclays', 'Deutsche Bank', 'UBS', 'Credit Suisse',
  'RBC Capital', 'TD Securities', 'BMO Capital', 'Jefferies', 'Piper Sandler',
  'Raymond James', 'Stifel', 'Wedbush', 'Oppenheimer', 'Cowen'
];

// Analyst names for mock data
const ANALYST_NAMES = [
  'John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim',
  'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez', 'James Wilson', 'Amanda Brown',
  'Christopher Lee', 'Jessica Davis', 'Matthew Garcia', 'Ashley Miller', 'Daniel Moore'
];

// Rating types
const RATINGS = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

/**
 * Generate mock individual analyst ratings
 */
function generateMockIndividualRatings(symbol) {
  const ratings = [];
  const today = new Date();
  const numAnalysts = 8 + Math.floor(Math.random() * 12); // 8-20 analysts

  for (let i = 0; i < numAnalysts; i++) {
    const analystName = ANALYST_NAMES[Math.floor(Math.random() * ANALYST_NAMES.length)];
    const firmName = ANALYST_FIRMS[Math.floor(Math.random() * ANALYST_FIRMS.length)];
    const rating = RATINGS[Math.floor(Math.random() * RATINGS.length)];
    
    // Generate rating date (within last 6 months)
    const ratingDate = new Date(today);
    ratingDate.setMonth(ratingDate.getMonth() - Math.floor(Math.random() * 6));
    ratingDate.setDate(Math.floor(Math.random() * 28) + 1);

    // Price target (80-120% of base price)
    const basePrice = 100;
    const priceTarget = basePrice * (0.8 + Math.random() * 0.4);

    // Previous rating (sometimes changed)
    const previousRating = Math.random() > 0.3 ? rating : RATINGS[Math.floor(Math.random() * RATINGS.length)];
    const action = previousRating !== rating ? 
      (RATINGS.indexOf(rating) < RATINGS.indexOf(previousRating) ? 'Upgrade' : 'Downgrade') : 
      'Maintain';

    ratings.push({
      analystName,
      firmName,
      rating,
      priceTarget: parseFloat(priceTarget.toFixed(2)),
      ratingDate: ratingDate.toISOString().split('T')[0],
      previousRating: previousRating !== rating ? previousRating : null,
      previousPriceTarget: previousRating !== rating ? parseFloat((priceTarget * (0.9 + Math.random() * 0.2)).toFixed(2)) : null,
      action,
    });
  }

  // Sort by date descending
  return ratings.sort((a, b) => new Date(b.ratingDate) - new Date(a.ratingDate));
}

/**
 * Generate mock consensus ratings
 */
function generateMockConsensus(symbol, individualRatings) {
  const ratingCounts = {
    'Strong Buy': 0,
    'Buy': 0,
    'Hold': 0,
    'Sell': 0,
    'Strong Sell': 0,
  };

  let totalPriceTarget = 0;
  let priceTargetCount = 0;

  individualRatings.forEach(rating => {
    ratingCounts[rating.rating] = (ratingCounts[rating.rating] || 0) + 1;
    if (rating.priceTarget) {
      totalPriceTarget += rating.priceTarget;
      priceTargetCount++;
    }
  });

  const total = individualRatings.length;
  const avgPriceTarget = priceTargetCount > 0 ? totalPriceTarget / priceTargetCount : 0;

  // Determine consensus rating
  let consensus = 'Hold';
  if (ratingCounts['Strong Buy'] + ratingCounts['Buy'] > total * 0.6) {
    consensus = 'Buy';
  } else if (ratingCounts['Strong Buy'] > total * 0.4) {
    consensus = 'Strong Buy';
  } else if (ratingCounts['Sell'] + ratingCounts['Strong Sell'] > total * 0.6) {
    consensus = 'Sell';
  } else if (ratingCounts['Strong Sell'] > total * 0.4) {
    consensus = 'Strong Sell';
  }

  return {
    totalAnalysts: total,
    strongBuy: ratingCounts['Strong Buy'],
    buy: ratingCounts['Buy'],
    hold: ratingCounts['Hold'],
    sell: ratingCounts['Sell'],
    strongSell: ratingCounts['Strong Sell'],
    averagePriceTarget: parseFloat(avgPriceTarget.toFixed(2)),
    consensusRating: consensus,
  };
}

/**
 * Fetch ratings from Finnhub API (or generate mock)
 */
async function fetchRatingsFromAPI(symbol) {
  // For now, return mock data
  // In production, this would call Finnhub API
  const individualRatings = generateMockIndividualRatings(symbol);
  const consensus = generateMockConsensus(symbol, individualRatings);
  
  return {
    symbol,
    individualRatings,
    consensus,
  };
}

/**
 * Store individual analyst ratings in database
 */
async function storeIndividualRatings(symbol, ratings) {
  if (!ratings || ratings.length === 0) return;

  try {
    for (const rating of ratings) {
      await pool.query(
        `INSERT INTO analyst_ratings (
          symbol, analyst_name, firm_name, rating, price_target, 
          rating_date, previous_rating, previous_price_target, action, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [
          symbol,
          rating.analystName || rating.analyst_name,
          rating.firmName || rating.firm_name,
          rating.rating,
          rating.priceTarget || rating.price_target || null,
          rating.ratingDate || rating.rating_date,
          rating.previousRating || rating.previous_rating || null,
          rating.previousPriceTarget || rating.previous_price_target || null,
          rating.action || null,
        ]
      );
    }
  } catch (error) {
    console.error(`Error storing individual ratings for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Store consensus ratings in database
 */
async function storeConsensus(symbol, consensus) {
  try {
    await pool.query(
      `INSERT INTO analyst_consensus (
        symbol, total_analysts, strong_buy, buy, hold, sell, strong_sell,
        average_price_target, consensus_rating, last_updated
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (symbol) DO UPDATE SET
         total_analysts = EXCLUDED.total_analysts,
         strong_buy = EXCLUDED.strong_buy,
         buy = EXCLUDED.buy,
         hold = EXCLUDED.hold,
         sell = EXCLUDED.sell,
         strong_sell = EXCLUDED.strong_sell,
         average_price_target = EXCLUDED.average_price_target,
         consensus_rating = EXCLUDED.consensus_rating,
         last_updated = CURRENT_TIMESTAMP`,
      [
        symbol,
        consensus.totalAnalysts || consensus.total_analysts,
        consensus.strongBuy || consensus.strong_buy,
        consensus.buy,
        consensus.hold,
        consensus.sell,
        consensus.strongSell || consensus.strong_sell,
        consensus.averagePriceTarget || consensus.average_price_target,
        consensus.consensusRating || consensus.consensus_rating,
      ]
    );
  } catch (error) {
    console.error(`Error storing consensus for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get individual ratings from database
 */
async function getIndividualRatingsFromDB(symbol, limit = null) {
  try {
    let query = `
      SELECT 
        id, symbol, analyst_name, firm_name, rating, price_target,
        rating_date, previous_rating, previous_price_target, action,
        created_at, updated_at
      FROM analyst_ratings
      WHERE symbol = $1
      ORDER BY rating_date DESC
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
      analystName: row.analyst_name,
      firmName: row.firm_name,
      rating: row.rating,
      priceTarget: row.price_target ? parseFloat(row.price_target) : null,
      ratingDate: row.rating_date,
      previousRating: row.previous_rating,
      previousPriceTarget: row.previous_price_target ? parseFloat(row.previous_price_target) : null,
      action: row.action,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error(`Error fetching individual ratings from DB for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get consensus from database
 */
async function getConsensusFromDB(symbol) {
  try {
    const result = await pool.query(
      `SELECT 
        symbol, total_analysts, strong_buy, buy, hold, sell, strong_sell,
        average_price_target, consensus_rating, last_updated
      FROM analyst_consensus
      WHERE symbol = $1`,
      [symbol]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      symbol: row.symbol,
      totalAnalysts: row.total_analysts,
      strongBuy: row.strong_buy,
      buy: row.buy,
      hold: row.hold,
      sell: row.sell,
      strongSell: row.strong_sell,
      averagePriceTarget: row.average_price_target ? parseFloat(row.average_price_target) : null,
      consensusRating: row.consensus_rating,
      lastUpdated: row.last_updated,
    };
  } catch (error) {
    console.error(`Error fetching consensus from DB for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Cache ratings in Redis
 */
async function cacheRatings(symbol, ratings) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `analyst_ratings:${symbol.toUpperCase()}`;
      await redisClient.setEx(cacheKey, RATINGS_CACHE_TTL, JSON.stringify(ratings));
    } catch (error) {
      console.warn(`Failed to cache ratings for ${symbol}:`, error.message);
    }
  }
}

/**
 * Get ratings from cache
 */
async function getRatingsFromCache(symbol) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `analyst_ratings:${symbol.toUpperCase()}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`Failed to get ratings from cache for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Fetch and sync ratings for a symbol
 */
async function fetchAndSyncRatings(symbol) {
  try {
    // Initialize Redis if needed
    await initRedis();

    // Check cache first
    const cached = await getRatingsFromCache(symbol);
    if (cached) {
      console.log(`Ratings cache hit for ${symbol}`);
      return cached;
    }

    // Check database
    const dbConsensus = await getConsensusFromDB(symbol);
    const dbIndividualRatings = await getIndividualRatingsFromDB(symbol);
    
    // If we have recent data (within last 7 days), use it
    if (dbConsensus && dbIndividualRatings.length > 0) {
      const mostRecent = new Date(dbConsensus.lastUpdated);
      const daysSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
      
      // If data is less than 7 days old, cache and return it
      if (daysSinceUpdate < 7) {
        const result = {
          symbol,
          individualRatings: dbIndividualRatings,
          consensus: dbConsensus,
        };
        await cacheRatings(symbol, result);
        return result;
      }
    }

    // Fetch from API (or generate mock)
    const apiRatings = await fetchRatingsFromAPI(symbol);

    // Store in database
    if (apiRatings.individualRatings && apiRatings.individualRatings.length > 0) {
      await storeIndividualRatings(symbol, apiRatings.individualRatings);
    }
    if (apiRatings.consensus) {
      await storeConsensus(symbol, apiRatings.consensus);
    }

    // Cache the results
    await cacheRatings(symbol, apiRatings);

    return apiRatings;
  } catch (error) {
    console.error(`Error in fetchAndSyncRatings for ${symbol}:`, error.message);
    // Fallback to database
    const dbConsensus = await getConsensusFromDB(symbol);
    const dbIndividualRatings = await getIndividualRatingsFromDB(symbol);
    return {
      symbol,
      individualRatings: dbIndividualRatings,
      consensus: dbConsensus,
    };
  }
}

module.exports = {
  fetchRatingsFromAPI,
  generateMockIndividualRatings,
  generateMockConsensus,
  storeIndividualRatings,
  storeConsensus,
  getIndividualRatingsFromDB,
  getConsensusFromDB,
  fetchAndSyncRatings,
  cacheRatings,
  getRatingsFromCache,
  initRedis,
  getRedisClient: () => redisClient,
};

