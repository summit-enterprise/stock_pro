/**
 * Mock Dividend Service
 * Generates random mock dividend data for local development
 */

const { pool } = require('../../db');

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
  const dividends = await fetchDividendsFromAPI(symbol);
  await storeDividends(symbol, dividends);
  return dividends;
}

/**
 * Get dividend statistics
 */
async function getDividendStats(symbol) {
  const dividends = await fetchAndSyncDividends(symbol);
  
  if (!dividends || dividends.length === 0) {
    return {
      totalDividends: 0,
      averageAmount: 0,
      lastDividend: null,
      nextDividend: null,
      frequency: null,
      annualYield: 0
    };
  }

  const total = dividends.reduce((sum, div) => sum + div.amount, 0);
  const average = total / dividends.length;
  const lastDividend = dividends[0];
  const nextDividend = dividends.length > 1 ? dividends[1] : null;

  return {
    totalDividends: dividends.length,
    averageAmount: average,
    lastDividend,
    nextDividend,
    frequency: lastDividend.frequency || 'quarterly',
    annualYield: (average * 4) / 100 // Rough estimate
  };
}

module.exports = {
  fetchDividendsFromAPI,
  storeDividends,
  getDividendsFromCache,
  cacheDividends,
  fetchAndSyncDividends,
  getDividendStats,
  generateMockDividends
};

