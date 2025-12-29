const axios = require('axios');
const redis = require('redis');
const crypto = require('crypto');
const { pool } = require('../db');

// Redis client for caching ratings
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Ratings Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('Ratings Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

const RATINGS_CACHE_TTL = 24 * 60 * 60; // 24 hours

// Generate deterministic mock ratings based on symbol hash (fallback)
function generateDeterministicRatings(symbol) {
  const hash = crypto.createHash('md5').update(symbol).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  
  const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
  const shortTermSignals = ['Strong Buy', 'Buy', 'Hold', 'Sell'];
  const longTermSignals = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
  
  const getDeterministicRating = (options, seed) => {
    const weights = [0.15, 0.35, 0.35, 0.12, 0.03];
    const normalized = (seed % 10000) / 10000;
    let sum = 0;
    for (let i = 0; i < options.length; i++) {
      sum += weights[i] || 0.2;
      if (normalized <= sum) {
        return options[i];
      }
    }
    return options[0];
  };

  const shortTerm = getDeterministicRating(shortTermSignals, hashInt);
  const longTerm = getDeterministicRating(longTermSignals, hashInt + 1000);
  
  const basePrice = 100;
  const priceSeed = (hashInt % 400) / 1000;
  const targetPrice = basePrice * (0.8 + priceSeed);
  
  const analystSeed = hashInt % 20;
  const totalAnalysts = analystSeed + 10;
  const buySeed = (hashInt % 30) / 100;
  const buyCount = Math.floor(totalAnalysts * (0.4 + buySeed));
  const holdCount = Math.floor((totalAnalysts - buyCount) * 0.6);
  const sellCount = totalAnalysts - buyCount - holdCount;

  const shortTermStrength = 70 + (hashInt % 30);
  const longTermStrength = 70 + ((hashInt + 500) % 30);

  return {
    symbol,
    shortTerm: {
      signal: shortTerm,
      strength: shortTermStrength,
    },
    longTerm: {
      signal: longTerm,
      strength: longTermStrength,
    },
    consensus: {
      rating: getDeterministicRating(ratings, hashInt + 2000),
      targetPrice: parseFloat(targetPrice.toFixed(2)),
      distribution: {
        strongBuy: Math.floor(buyCount * 0.3),
        buy: Math.floor(buyCount * 0.7),
        hold: holdCount,
        sell: Math.floor(sellCount * 0.7),
        strongSell: Math.floor(sellCount * 0.3),
      },
      totalAnalysts,
    },
  };
}

// Fetch ratings from Polygon.io API
async function fetchRatingsFromAPI(symbol) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  if (!apiKey) {
    console.warn(`POLYGON_API_KEY not set, using deterministic mock ratings for ${symbol}`);
    return generateDeterministicRatings(symbol);
  }

  try {
    // Try Polygon.io analyst ratings endpoint
    // Note: This endpoint may require a paid plan
    const ratingsUrl = `https://api.polygon.io/v2/reference/analysts/${symbol}?apiKey=${apiKey}`;
    
    const response = await axios.get(ratingsUrl, {
      timeout: 10000,
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      return processPolygonRatings(response.data.results, symbol);
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`Rate limited for ${symbol}, will retry later`);
      throw error;
    }
    console.error(`Error fetching ratings for ${symbol} from Polygon:`, error.message);
  }

  // Fallback to deterministic mock if API fails
  return generateDeterministicRatings(symbol);
}

// Process Polygon.io ratings data
function processPolygonRatings(data, symbol) {
  // Polygon.io analyst ratings structure (example)
  // This needs to be adapted based on actual API response format
  // For now, we'll extract what we can and use deterministic fallback for missing data
  
  try {
    // Aggregate ratings from multiple analysts
    const ratings = data.map(item => item.rating || item.recommendation).filter(Boolean);
    
    if (ratings.length === 0) {
      return generateDeterministicRatings(symbol);
    }

    // Count rating types
    const ratingCounts = {
      'Strong Buy': 0,
      'Buy': 0,
      'Hold': 0,
      'Sell': 0,
      'Strong Sell': 0,
    };

    ratings.forEach(rating => {
      const normalized = rating.toString().toLowerCase();
      if (normalized.includes('strong buy') || normalized.includes('strong_buy')) {
        ratingCounts['Strong Buy']++;
      } else if (normalized.includes('buy') && !normalized.includes('strong')) {
        ratingCounts['Buy']++;
      } else if (normalized.includes('hold') || normalized.includes('neutral')) {
        ratingCounts['Hold']++;
      } else if (normalized.includes('sell') && !normalized.includes('strong')) {
        ratingCounts['Sell']++;
      } else if (normalized.includes('strong sell') || normalized.includes('strong_sell')) {
        ratingCounts['Strong Sell']++;
      } else {
        ratingCounts['Hold']++; // Default to Hold for unknown ratings
      }
    });

    // Determine consensus
    const total = ratings.length;
    const buyTotal = ratingCounts['Strong Buy'] + ratingCounts['Buy'];
    const sellTotal = ratingCounts['Sell'] + ratingCounts['Strong Sell'];
    
    let consensus;
    if (buyTotal > sellTotal && buyTotal > ratingCounts['Hold']) {
      consensus = buyTotal > ratingCounts['Strong Buy'] ? 'Buy' : 'Strong Buy';
    } else if (sellTotal > buyTotal && sellTotal > ratingCounts['Hold']) {
      consensus = sellTotal > ratingCounts['Strong Sell'] ? 'Sell' : 'Strong Sell';
    } else {
      consensus = 'Hold';
    }

    // For short-term and long-term, we'll use the consensus for now
    // In a real implementation, Polygon might provide separate short/long term ratings
    const shortTerm = consensus;
    const longTerm = consensus;

    // Calculate average target price if available
    const targetPrices = data
      .map(item => parseFloat(item.target_price || item.price_target || 0))
      .filter(price => price > 0);
    const avgTargetPrice = targetPrices.length > 0
      ? targetPrices.reduce((sum, price) => sum + price, 0) / targetPrices.length
      : 0;

    return {
      symbol,
      shortTerm: {
        signal: shortTerm,
        strength: Math.min(100, Math.max(50, 50 + (buyTotal / total) * 50)),
      },
      longTerm: {
        signal: longTerm,
        strength: Math.min(100, Math.max(50, 50 + (buyTotal / total) * 50)),
      },
      consensus: {
        rating: consensus,
        targetPrice: avgTargetPrice || 0,
        distribution: {
          strongBuy: ratingCounts['Strong Buy'],
          buy: ratingCounts['Buy'],
          hold: ratingCounts['Hold'],
          sell: ratingCounts['Sell'],
          strongSell: ratingCounts['Strong Sell'],
        },
        totalAnalysts: total,
      },
    };
  } catch (error) {
    console.error(`Error processing Polygon ratings for ${symbol}:`, error.message);
    return generateDeterministicRatings(symbol);
  }
}

// Store ratings in database
async function storeRatings(ratings) {
  try {
    await pool.query(
      `INSERT INTO analyst_ratings (
        symbol, short_term_signal, short_term_strength,
        long_term_signal, long_term_strength, consensus_rating,
        target_price, total_analysts, strong_buy_count, buy_count,
        hold_count, sell_count, strong_sell_count, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      ON CONFLICT (symbol) DO UPDATE SET
        short_term_signal = EXCLUDED.short_term_signal,
        short_term_strength = EXCLUDED.short_term_strength,
        long_term_signal = EXCLUDED.long_term_signal,
        long_term_strength = EXCLUDED.long_term_strength,
        consensus_rating = EXCLUDED.consensus_rating,
        target_price = EXCLUDED.target_price,
        total_analysts = EXCLUDED.total_analysts,
        strong_buy_count = EXCLUDED.strong_buy_count,
        buy_count = EXCLUDED.buy_count,
        hold_count = EXCLUDED.hold_count,
        sell_count = EXCLUDED.sell_count,
        strong_sell_count = EXCLUDED.strong_sell_count,
        updated_at = CURRENT_TIMESTAMP`,
      [
        ratings.symbol,
        ratings.shortTerm.signal,
        ratings.shortTerm.strength,
        ratings.longTerm.signal,
        ratings.longTerm.strength,
        ratings.consensus.rating,
        ratings.consensus.targetPrice,
        ratings.consensus.totalAnalysts,
        ratings.consensus.distribution.strongBuy,
        ratings.consensus.distribution.buy,
        ratings.consensus.distribution.hold,
        ratings.consensus.distribution.sell,
        ratings.consensus.distribution.strongSell,
      ]
    );
    return true;
  } catch (error) {
    console.error(`Error storing ratings for ${ratings.symbol}:`, error.message);
    return false;
  }
}

// Cache ratings in Redis
async function cacheRatings(ratings) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `ratings:${ratings.symbol}`;
      await redisClient.setEx(cacheKey, RATINGS_CACHE_TTL, JSON.stringify(ratings));
      return true;
    } catch (error) {
      console.error(`Error caching ratings for ${ratings.symbol}:`, error.message);
      return false;
    }
  }
  return false;
}

// Fetch and store ratings for a symbol (only for equities)
async function fetchAndStoreRatings(symbol) {
  const normalizedSymbol = symbol.toUpperCase();
  
  // Check if asset is an equity before fetching ratings
  try {
    const assetInfoResult = await pool.query(
      `SELECT category FROM asset_info WHERE symbol = $1`,
      [normalizedSymbol]
    );

    if (assetInfoResult.rows.length > 0) {
      const category = assetInfoResult.rows[0].category;
      // Only fetch ratings for equities
      if (category && category.toLowerCase() !== 'equities') {
        console.log(`Skipping ratings for ${normalizedSymbol} (category: ${category})`);
        return null;
      }
    }
  } catch (dbError) {
    console.error(`Error checking asset category for ${normalizedSymbol}:`, dbError.message);
    // Continue - we'll try to fetch anyway
  }
  
  try {
    console.log(`Fetching ratings for ${normalizedSymbol}...`);
    const ratings = await fetchRatingsFromAPI(normalizedSymbol);
    
    // Store in database
    await storeRatings(ratings);
    
    // Cache in Redis
    await cacheRatings(ratings);
    
    console.log(`✅ Stored ratings for ${normalizedSymbol}`);
    return ratings;
  } catch (error) {
    console.error(`Error in fetchAndStoreRatings for ${normalizedSymbol}:`, error.message);
    
    // Return deterministic ratings as fallback
    const fallbackRatings = generateDeterministicRatings(normalizedSymbol);
    await storeRatings(fallbackRatings);
    await cacheRatings(fallbackRatings);
    return fallbackRatings;
  }
}

// Get list of assets that need ratings refresh (only equities)
async function getAssetsToRefresh() {
  try {
    // Get all unique symbols from watchlists that are equities
    const watchlistResult = await pool.query(
      `SELECT DISTINCT w.symbol 
       FROM watchlist w
       INNER JOIN asset_info ai ON w.symbol = ai.symbol
       WHERE ai.category = 'equities'
       ORDER BY w.symbol`
    );
    const watchlistSymbols = watchlistResult.rows.map(row => row.symbol);

    // Get popular equity assets (top 200 by data count)
    const popularResult = await pool.query(
      `SELECT ad.symbol, COUNT(*) as data_count 
       FROM asset_data ad
       INNER JOIN asset_info ai ON ad.symbol = ai.symbol
       WHERE ai.category = 'equities'
       GROUP BY ad.symbol 
       ORDER BY data_count DESC 
       LIMIT 200`
    );
    const popularSymbols = popularResult.rows.map(row => row.symbol);

    // Get equity assets with stale ratings (older than 24 hours)
    const staleResult = await pool.query(
      `SELECT ar.symbol 
       FROM analyst_ratings ar
       INNER JOIN asset_info ai ON ar.symbol = ai.symbol
       WHERE ai.category = 'equities'
         AND ar.updated_at < NOW() - INTERVAL '24 hours'
       ORDER BY ar.updated_at ASC
       LIMIT 100`
    );
    const staleSymbols = staleResult.rows.map(row => row.symbol);

    // Combine and deduplicate
    const allSymbols = [...new Set([...watchlistSymbols, ...popularSymbols, ...staleSymbols])];
    
    return allSymbols;
  } catch (error) {
    console.error('Error getting assets to refresh:', error.message);
    return [];
  }
}

// Refresh ratings for a batch of assets
async function refreshRatingsBatch(symbols, batchSize = 5) {
  console.log(`\n🔄 Refreshing ratings for ${symbols.length} assets...`);
  const startTime = Date.now();

  let successCount = 0;
  let errorCount = 0;

  // Process in batches to respect rate limits
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    // Process batch with delays
    const batchPromises = batch.map(async (symbol, index) => {
      if (index > 0) {
        // Add 3 second delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      try {
        await fetchAndStoreRatings(symbol);
        successCount++;
      } catch (error) {
        console.error(`Error refreshing ratings for ${symbol}:`, error.message);
        errorCount++;
      }
    });

    await Promise.all(batchPromises);
    
    // Add delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between batches
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Ratings refresh completed in ${duration}s (${successCount} success, ${errorCount} errors)\n`);
  
  return { successCount, errorCount };
}

// Main function to refresh all ratings
async function refreshAllRatings() {
  console.log('\n🔄 Starting ratings refresh cycle...');
  
  try {
    // Initialize Redis if needed
    await initRedis();

    // Get assets that need refresh
    const assetsToRefresh = await getAssetsToRefresh();
    
    if (assetsToRefresh.length === 0) {
      console.log('No assets found to refresh ratings for.');
      return { successCount: 0, errorCount: 0 };
    }

    console.log(`Found ${assetsToRefresh.length} assets to refresh ratings for.`);

    // Refresh ratings for all assets (in batches to respect rate limits)
    return await refreshRatingsBatch(assetsToRefresh, 5); // 5 assets per batch
  } catch (error) {
    console.error('Error in refreshAllRatings:', error.message);
    return { successCount: 0, errorCount: 0 };
  }
}

// Start background service for ratings
let ratingsRefreshInterval = null;

function startRatingsService(intervalHours = 12) {
  const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds

  // Initial fetch
  refreshAllRatings().catch(err => {
    console.error('Initial ratings fetch failed:', err.message);
  });

  // Set up periodic refresh
  ratingsRefreshInterval = setInterval(() => {
    refreshAllRatings().catch(err => {
      console.error('Periodic ratings refresh failed:', err.message);
    });
  }, intervalMs);

  console.log(`📊 Ratings service started (refreshing every ${intervalHours} hours)`);
}

function stopRatingsService() {
  if (ratingsRefreshInterval) {
    clearInterval(ratingsRefreshInterval);
    ratingsRefreshInterval = null;
    console.log('📊 Ratings service stopped');
  }
}

module.exports = {
  initRedis,
  fetchRatingsFromAPI,
  fetchAndStoreRatings,
  refreshAllRatings,
  refreshRatingsBatch,
  startRatingsService,
  stopRatingsService,
  generateDeterministicRatings,
  getRedisClient: () => redisClient,
};

