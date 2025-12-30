/**
 * Mock Crypto Price Service
 * Generates random mock cryptocurrency price data
 */

const { pool } = require('../../db');

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

function generatePrice(symbol, basePrice = null) {
  const normalizedSymbol = symbol.replace(/^X:/, '').replace(/USD$/, '');
  const price = basePrice || BASE_PRICES[normalizedSymbol] || 100;
  const volatility = 0.05;
  const change = (Math.random() * 2 - 1) * volatility;
  return price * (1 + change);
}

async function fetchHistoricalPrices(coinId, symbol, startDate, endDate) {
  const normalizedSymbol = symbol.replace(/^X:/, '').replace(/USD$/, '');
  const basePrice = BASE_PRICES[normalizedSymbol] || 100;
  
  const data = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  let price = basePrice;
  
  while (currentDate <= end) {
    const change = (Math.random() * 0.1 - 0.05);
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

async function storeHistoricalPrices(symbol, priceData) {
  if (process.env.MOCK_STORE_TO_DB === 'true') {
    // Store to DB if enabled
    // ... implementation
  }
  
  return {
    inserted: priceData.length,
    updated: 0
  };
}

async function syncHistoricalPrices(coinId, symbol, dbSymbol) {
  const startDate = new Date('2011-01-01');
  const endDate = new Date();
  
  const priceData = await fetchHistoricalPrices(coinId, symbol, startDate, endDate);
  const result = await storeHistoricalPrices(dbSymbol, priceData);
  
  return result;
}

module.exports = {
  fetchHistoricalPrices,
  fetchCurrentPrice,
  storeHistoricalPrices,
  syncHistoricalPrices
};

