/**
 * Mock Crypto Service
 * Generates random mock cryptocurrency data for local development
 */

const { pool } = require('../../db');

// Base prices for common cryptos
const BASE_PRICES = {
  'BTC': 67000,
  'ETH': 3400,
  'SOL': 150,
  'XRP': 0.6,
  'ADA': 0.5,
  'DOGE': 0.08,
  'DOT': 7,
  'AVAX': 40,
  'MATIC': 0.9,
  'LTC': 95,
};

/**
 * Generate random crypto price
 */
function generatePrice(symbol, basePrice = null) {
  const normalizedSymbol = symbol.replace(/^X:/, '').replace(/USD$/, '');
  const price = basePrice || BASE_PRICES[normalizedSymbol] || 100;
  const volatility = 0.05; // 5% volatility
  const change = (Math.random() * 2 - 1) * volatility;
  return price * (1 + change);
}

/**
 * Fetch list of cryptocurrencies (mock)
 */
async function fetchCryptoList(limit = 8000) {
  const cryptos = [];
  const symbols = Object.keys(BASE_PRICES);
  
  // Generate mock cryptos
  for (let i = 0; i < Math.min(limit, 100); i++) {
    const symbol = i < symbols.length ? symbols[i] : `CRYPTO${i}`;
    const basePrice = BASE_PRICES[symbol] || Math.random() * 1000;
    const price = generatePrice(symbol, basePrice);
    
    cryptos.push({
      id: symbol.toLowerCase(),
      symbol: symbol,
      name: `${symbol} Coin`,
      marketCap: price * (1000000 + Math.random() * 10000000),
      currentPrice: price,
      priceChange24h: (Math.random() * 20 - 10), // -10% to +10%
      image: null,
      lastUpdated: new Date().toISOString()
    });
  }
  
  return cryptos;
}

/**
 * Store crypto assets (mock - just returns success)
 */
async function storeCryptoAssets(cryptos) {
  // In mock mode, we could still store to DB for testing
  // But for pure mock, we'll just return success
  return {
    inserted: cryptos.length,
    updated: 0,
    errors: 0
  };
}

/**
 * Fetch historical prices (mock)
 */
async function fetchHistoricalPrices(coinId, symbol, startDate, endDate) {
  const normalizedSymbol = symbol.replace(/^X:/, '').replace(/USD$/, '');
  const basePrice = BASE_PRICES[normalizedSymbol] || 100;
  
  const data = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  let price = basePrice;
  
  while (currentDate <= end) {
    // Generate price with random walk
    const change = (Math.random() * 0.1 - 0.05); // ±5% daily change
    price = price * (1 + change);
    
    const high = price * (1 + Math.abs(change) * 0.5);
    const low = price * (1 - Math.abs(change) * 0.5);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      open: price,
      high: high,
      low: low,
      close: price,
      volume: Math.floor(Math.random() * 1000000000),
      adjusted_close: price
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * Fetch current price (mock)
 */
async function fetchCurrentPrice(coinId, symbol) {
  const normalizedSymbol = symbol.replace(/^X:/, '').replace(/USD$/, '');
  const price = generatePrice(symbol);
  
  return {
    symbol: symbol,
    price: price,
    priceChange24h: (Math.random() * 20 - 10),
    marketCap: price * (1000000 + Math.random() * 10000000),
    volume24h: Math.floor(Math.random() * 1000000000),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Store historical prices (mock - can still store to DB)
 */
async function storeHistoricalPrices(symbol, priceData) {
  // In mock mode, optionally store to DB for testing
  if (process.env.MOCK_STORE_TO_DB === 'true') {
    // Store to DB (same as real service)
    // ... implementation
  }
  
  return {
    inserted: priceData.length,
    updated: 0
  };
}

/**
 * Sync historical prices (mock)
 */
async function syncHistoricalPrices(coinId, symbol, dbSymbol) {
  const startDate = new Date('2011-01-01');
  const endDate = new Date();
  
  const priceData = await fetchHistoricalPrices(coinId, symbol, startDate, endDate);
  const result = await storeHistoricalPrices(dbSymbol, priceData);
  
  return result;
}

/**
 * Build API URL (mock - returns null)
 */
function buildApiUrl(endpoint, params = {}) {
  return null; // Not used in mock
}

module.exports = {
  fetchCryptoList,
  storeCryptoAssets,
  fetchHistoricalPrices,
  fetchCurrentPrice,
  storeHistoricalPrices,
  syncHistoricalPrices,
  buildApiUrl
};

