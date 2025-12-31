/**
 * Mock Dividend Service
 * Generates random mock dividend data for local development
 */

const { pool } = require('../../db');

/**
 * Check if asset category supports dividends
 * Dividends are only available for: Equity, ETF, Bond, MutualFund, InternationalStock
 * Not available for: Crypto, Commodity, Index
 */
async function isDividendSupported(symbol) {
  try {
    const result = await pool.query(
      'SELECT category FROM asset_info WHERE symbol = $1',
      [symbol]
    );
    
    if (result.rows.length === 0) {
      return true; // Default to true if asset not found (will fail gracefully)
    }
    
    const category = (result.rows[0].category || '').toLowerCase().trim();
    const unsupportedCategories = ['crypto', 'cryptocurrency', 'cryptocurrencies', 'commodity', 'commodities', 'index', 'indices'];
    
    return !unsupportedCategories.includes(category);
  } catch (error) {
    console.warn(`Error checking dividend support for ${symbol}:`, error.message);
    return true; // Default to true on error
  }
}

/**
 * Generate mock dividend data
 */
function generateMockDividends(symbol) {
  const dividends = [];
  const baseAmount = symbol.includes('BTC') || symbol.includes('ETH') || symbol.startsWith('X:') ? 0 : 
                    symbol.includes('JNJ') || symbol.includes('PFE') ? 1.5 :
                    symbol.includes('AAPL') || symbol.includes('MSFT') ? 0.5 : 0.25;
  
  if (baseAmount === 0) return []; // Crypto doesn't pay dividends

  // Generate quarterly dividends for the last 5 years
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 5, 0, 1);
  
  let currentDate = new Date(startDate);
  let quarter = 0;

  while (currentDate <= today) {
    const exDate = new Date(currentDate);
    exDate.setMonth(exDate.getMonth() + (quarter % 12 === 0 ? 0 : 3));
    
    const paymentDate = new Date(exDate);
    paymentDate.setDate(paymentDate.getDate() + 30);
    
    const recordDate = new Date(exDate);
    recordDate.setDate(recordDate.getDate() - 2);

    const variation = (Math.random() * 0.1 - 0.05);
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

  return dividends.reverse();
}

/**
 * Fetch dividends from API (mock)
 */
async function fetchDividendsFromAPI(symbol) {
  return generateMockDividends(symbol);
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
          div.frequency || 'quarterly',
        ]
      );
    }
  } catch (error) {
    console.error(`Error storing dividends for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get dividends from cache (mock - returns null)
 */
async function getDividendsFromCache(symbol) {
  return null; // No caching in mock mode
}

/**
 * Cache dividends (mock - no-op)
 */
async function cacheDividends(symbol, dividends) {
  // No caching in mock mode
}

/**
 * Fetch and sync dividends
 */
async function fetchAndSyncDividends(symbol) {
  // Check if this asset category supports dividends
  const supportsDividends = await isDividendSupported(symbol);
  if (!supportsDividends) {
    console.log(`Dividends not supported for ${symbol} (category: crypto/commodity/index)`);
    return [];
  }

  const dividends = await fetchDividendsFromAPI(symbol);
  await storeDividends(symbol, dividends);
  return dividends;
}

/**
 * Get dividend statistics
 */
async function getDividendStats(symbol) {
  try {
    // Check if this asset category supports dividends
    const supportsDividends = await isDividendSupported(symbol);
    if (!supportsDividends) {
      return null;
    }
    // Get dividends from database
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_dividends,
        SUM(amount) as total_paid,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        MIN(ex_date) as first_dividend,
        MAX(ex_date) as last_dividend
      FROM dividends
      WHERE symbol = $1`,
      [symbol]
    );

    // Get most common frequency separately
    const frequencyResult = await pool.query(
      `SELECT frequency, COUNT(*) as count
       FROM dividends
       WHERE symbol = $1 AND frequency IS NOT NULL
       GROUP BY frequency
       ORDER BY count DESC
       LIMIT 1`,
      [symbol]
    );

    if (result.rows.length === 0 || result.rows[0].total_dividends === '0') {
      // If no dividends in DB, try to fetch and sync
      const dividends = await fetchAndSyncDividends(symbol);
      
      if (!dividends || dividends.length === 0) {
        return {
          totalDividends: 0,
          totalPaid: 0,
          avgAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          firstDividend: null,
          lastDividend: null,
          frequency: null,
        };
      }

      // Calculate from dividends array
      const amounts = dividends.map(d => parseFloat(d.amount) || 0);
      const totalPaid = amounts.reduce((sum, amt) => sum + amt, 0);
      const avgAmount = totalPaid / dividends.length;
      
      return {
        totalDividends: dividends.length,
        totalPaid: totalPaid,
        avgAmount: avgAmount,
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        firstDividend: dividends[dividends.length - 1]?.exDate || null,
        lastDividend: dividends[0]?.exDate || null,
        frequency: dividends[0]?.frequency || 'quarterly',
      };
    }

    const stats = result.rows[0];
    const totalPaid = stats.total_paid ? parseFloat(stats.total_paid) : 0;
    const avgAmount = stats.avg_amount ? parseFloat(stats.avg_amount) : 0;
    const frequency = frequencyResult.rows.length > 0 ? frequencyResult.rows[0].frequency : null;
    
    return {
      totalDividends: parseInt(stats.total_dividends) || 0,
      totalPaid: totalPaid,
      avgAmount: avgAmount,
      minAmount: stats.min_amount ? parseFloat(stats.min_amount) : 0,
      maxAmount: stats.max_amount ? parseFloat(stats.max_amount) : 0,
      firstDividend: stats.first_dividend,
      lastDividend: stats.last_dividend,
      frequency: frequency,
    };
  } catch (error) {
    console.error(`Error getting dividend stats for ${symbol}:`, error.message);
    return {
      totalDividends: 0,
      totalPaid: 0,
      avgAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      firstDividend: null,
      lastDividend: null,
      frequency: null,
    };
  }
}

module.exports = {
  fetchDividendsFromAPI,
  storeDividends,
  getDividendsFromCache,
  cacheDividends,
  fetchAndSyncDividends,
  getDividendStats,
  isDividendSupported,
  generateMockDividends
};

