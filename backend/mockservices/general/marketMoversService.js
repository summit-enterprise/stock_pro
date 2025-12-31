/**
 * Mock Market Movers Service
 * Generates mock top gainers and losers data
 */

const { pool } = require('../../db');
const mockData = require('../utils/mockData');

/**
 * Get mock market movers (top gainers and losers for stocks and crypto)
 * Uses database assets if available, otherwise generates from mock data
 */
async function getMarketMovers() {
  try {
    // Get stocks and crypto separately from database
    const { determineCategory, normalizeCategory } = require('../utils/categoryUtils');
    
    // Query all assets and filter by category
    const allAssetsResult = await pool.query(
      `SELECT symbol, name, type, category
       FROM asset_info 
       ORDER BY symbol 
       LIMIT 500`
    );
    
    // Separate by category
    const stocksResult = { rows: [] };
    const cryptoResult = { rows: [] };
    
    allAssetsResult.rows.forEach(row => {
      const category = normalizeCategory(row.category || determineCategory(row.symbol, row.type) || 'Unknown');
      if (category === 'Equity') {
        stocksResult.rows.push(row);
      } else if (category === 'Crypto') {
        cryptoResult.rows.push(row);
      }
    });

    const stockMovers = [];
    const cryptoMovers = [];

    // Process stocks
    if (stocksResult.rows.length > 0) {
      stocksResult.rows.forEach(row => {
        const priceData = mockData.getCurrentPrice(row.symbol);
        const previousCloseData = mockData.getPreviousClose(row.symbol);
        const previousPrice = previousCloseData.c || priceData.price * 0.95;
        const change = priceData.price - previousPrice;
        const changePercent = previousPrice !== 0 ? ((change / previousPrice) * 100) : 0;
        
        stockMovers.push({
          symbol: row.symbol,
          name: row.name || row.symbol,
          price: priceData.price,
          change: change,
          changePercent: changePercent,
        });
      });
    }

    // Process crypto
    if (cryptoResult.rows.length > 0) {
      cryptoResult.rows.forEach(row => {
        const priceData = mockData.getCurrentPrice(row.symbol);
        const previousCloseData = mockData.getPreviousClose(row.symbol);
        const previousPrice = previousCloseData.c || priceData.price * 0.95;
        const change = priceData.price - previousPrice;
        const changePercent = previousPrice !== 0 ? ((change / previousPrice) * 100) : 0;
        
        cryptoMovers.push({
          symbol: row.symbol,
          name: row.name || row.symbol,
          price: priceData.price,
          change: change,
          changePercent: changePercent,
        });
      });
    }

    // If we have data, return separated by category
    if (stockMovers.length > 0 || cryptoMovers.length > 0) {
      const stockGainers = stockMovers
        .filter(m => m.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 25);
      
      const stockLosers = stockMovers
        .filter(m => m.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 25);

      const cryptoGainers = cryptoMovers
        .filter(m => m.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 25);
      
      const cryptoLosers = cryptoMovers
        .filter(m => m.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 25);

      return { stockGainers, stockLosers, cryptoGainers, cryptoLosers };
    }
  } catch (error) {
    console.warn('Error fetching assets from database for movers:', error.message);
  }

  // Fallback to mock data generator
  const fallback = mockData.getMockMovers();
  // Use the new format if available, otherwise separate from old format
  if (fallback.stockGainers && fallback.cryptoGainers) {
    return {
      stockGainers: fallback.stockGainers.slice(0, 25),
      stockLosers: fallback.stockLosers.slice(0, 25),
      cryptoGainers: fallback.cryptoGainers.slice(0, 25),
      cryptoLosers: fallback.cryptoLosers.slice(0, 25),
    };
  }
  
  // Fallback to old format separation
  const stockGainers = fallback.gainers?.filter(g => !g.symbol.startsWith('X:')).slice(0, 25) || [];
  const stockLosers = fallback.losers?.filter(l => !l.symbol.startsWith('X:')).slice(0, 25) || [];
  const cryptoGainers = fallback.gainers?.filter(g => g.symbol.startsWith('X:')).slice(0, 25) || [];
  const cryptoLosers = fallback.losers?.filter(l => l.symbol.startsWith('X:')).slice(0, 25) || [];
  
  return { stockGainers, stockLosers, cryptoGainers, cryptoLosers };
}

module.exports = {
  getMarketMovers
};

