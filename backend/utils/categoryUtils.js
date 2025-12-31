/**
 * Category Utility Functions
 * Determines asset category based on symbol and type
 * 
 * Categories: Unknown, Equity, ETF, Index, Crypto, Commodity, Predictions, 
 *             Forex, MutualFund, InternationalStock, Bond
 */

/**
 * Determine category from symbol and type
 * @param {string} symbol - Asset symbol
 * @param {string} type - Asset type (stock, crypto, index, commodity, etc.)
 * @param {string} exchange - Exchange name (optional, helps identify international stocks)
 * @returns {string} Category: Unknown, Equity, ETF, Index, Crypto, Commodity, Predictions, Forex, MutualFund, InternationalStock, Bond
 */
function determineCategory(symbol, type, exchange = null) {
  if (!symbol) return 'Unknown';
  
  const upperSymbol = symbol.toUpperCase();
  const lowerType = (type || '').toLowerCase();
  const lowerExchange = (exchange || '').toLowerCase();
  
  // Index: Symbols starting with ^
  if (upperSymbol.startsWith('^')) {
    return 'Index';
  }
  
  // Forex: Currency pairs (EUR/USD, GBP/USD, etc.) or symbols with currency codes
  if (lowerType === 'forex' || lowerType === 'fx' || 
      upperSymbol.includes('USD') && (upperSymbol.includes('EUR') || upperSymbol.includes('GBP') || 
      upperSymbol.includes('JPY') || upperSymbol.includes('CHF') || upperSymbol.includes('AUD') ||
      upperSymbol.includes('CAD') || upperSymbol.includes('NZD')) ||
      /^[A-Z]{3}\/[A-Z]{3}$/.test(upperSymbol) || /^[A-Z]{6}$/.test(upperSymbol)) {
    // Make sure it's not a crypto (X:BTCUSD) or commodity (XAUUSD)
    if (!upperSymbol.startsWith('X:') && !upperSymbol.includes('XAU') && !upperSymbol.includes('XAG')) {
      return 'Forex';
    }
  }
  
  // Crypto: Symbols starting with X: or type is crypto
  if (upperSymbol.startsWith('X:') || lowerType === 'crypto' || lowerType === 'cryptocurrency') {
    // Check if it's a commodity (XAU, XAG, etc.)
    if (upperSymbol.includes('XAU') || upperSymbol.includes('XAG') || 
        upperSymbol.includes('OIL') || upperSymbol.includes('GAS') ||
        upperSymbol === 'XAUUSD' || upperSymbol === 'XAGUSD') {
      return 'Commodity';
    }
    // Otherwise it's crypto
    return 'Crypto';
  }
  
  // Commodity: Specific commodity symbols or type
  if (lowerType === 'commodity' || 
      upperSymbol.includes('GOLD') || upperSymbol.includes('SILVER') ||
      upperSymbol.includes('OIL') || upperSymbol.includes('GAS') ||
      upperSymbol === 'XAUUSD' || upperSymbol === 'XAGUSD') {
    return 'Commodity';
  }
  
  // Bond: Type is bond or symbol patterns
  if (lowerType === 'bond' || lowerType === 'treasury' || lowerType === 'corporate bond' ||
      upperSymbol.includes('BOND') || upperSymbol.includes('TREASURY') ||
      /^[A-Z]{1,2}\d{2,4}$/.test(upperSymbol) && (upperSymbol.startsWith('T') || upperSymbol.startsWith('B'))) {
    return 'Bond';
  }
  
  // Mutual Fund: Type is mutual fund
  if (lowerType === 'mutual fund' || lowerType === 'mutualfund' || 
      lowerType === 'fund' && !lowerType.includes('etf')) {
    return 'MutualFund';
  }
  
  // ETF: Type is ETF
  if (lowerType === 'etf' || lowerType === 'exchange traded fund') {
    return 'ETF';
  }
  
  // International Stock: Exchange indicates international market
  if (lowerType === 'stock' || lowerType === 'equity' || lowerType === 'equities') {
    // US exchanges
    const usExchanges = ['nyse', 'nasdaq', 'amex', 'otc', 'otcbb', 'pink'];
    // International exchanges
    const intlExchanges = ['lse', 'tse', 'hkex', 'sse', 'szse', 'asx', 'tsx', 'euronext', 
                          'xetra', 'six', 'bse', 'nse', 'kospi', 'tase', 'jse', 'b3'];
    
    if (lowerExchange && intlExchanges.some(ex => lowerExchange.includes(ex))) {
      return 'InternationalStock';
    }
    
    // If exchange is not US, assume international
    if (lowerExchange && !usExchanges.some(ex => lowerExchange.includes(ex))) {
      return 'InternationalStock';
    }
    
    // Default to Equity for US stocks
    return 'Equity';
  }
  
  // Predictions: Symbols or types indicating predictions
  if (lowerType === 'prediction' || lowerType === 'predictions' ||
      upperSymbol.includes('PRED') || upperSymbol.includes('FORECAST')) {
    return 'Predictions';
  }
  
  // Index: Type is index
  if (lowerType === 'index' || lowerType === 'indices') {
    return 'Index';
  }
  
  // Default: Unknown
  return 'Unknown';
}

/**
 * Normalize category name to standard format
 * @param {string} category - Category name (may be in various formats)
 * @returns {string} Normalized category
 */
function normalizeCategory(category) {
  if (!category) return 'Unknown';
  
  const normalized = category.trim();
  const lower = normalized.toLowerCase();
  
  // Map various formats to standard categories
  const categoryMap = {
    'equity': 'Equity',
    'equities': 'Equity',
    'stock': 'Equity',
    'stocks': 'Equity',
    'etf': 'ETF',
    'exchange traded fund': 'ETF',
    'index': 'Index',
    'indices': 'Index',
    'crypto': 'Crypto',
    'cryptocurrency': 'Crypto',
    'cryptocurrencies': 'Crypto',
    'commodity': 'Commodity',
    'commodities': 'Commodity',
    'forex': 'Forex',
    'fx': 'Forex',
    'currency': 'Forex',
    'currencies': 'Forex',
    'mutual fund': 'MutualFund',
    'mutualfund': 'MutualFund',
    'fund': 'MutualFund',
    'international stock': 'InternationalStock',
    'internationalstock': 'InternationalStock',
    'intl stock': 'InternationalStock',
    'bond': 'Bond',
    'bonds': 'Bond',
    'treasury': 'Bond',
    'corporate bond': 'Bond',
    'prediction': 'Predictions',
    'predictions': 'Predictions',
    'unknown': 'Unknown',
  };
  
  return categoryMap[lower] || normalized;
}

/**
 * Update category for an asset in the database
 * @param {object} pool - PostgreSQL pool
 * @param {string} symbol - Asset symbol
 * @param {string} type - Asset type
 * @param {string} exchange - Exchange name (optional)
 * @returns {Promise<string>} The determined category
 */
async function updateAssetCategory(pool, symbol, type, exchange = null) {
  const category = determineCategory(symbol, type, exchange);
  const normalizedCategory = normalizeCategory(category);
  
  try {
    await pool.query(
      `UPDATE asset_info 
       SET category = $1 
       WHERE symbol = $2`,
      [normalizedCategory, symbol]
    );
  } catch (error) {
    console.warn(`Failed to update category for ${symbol}:`, error.message);
  }
  
  return normalizedCategory;
}

/**
 * Batch update categories for all assets
 * @param {object} pool - PostgreSQL pool
 * @returns {Promise<object>} Summary of updates
 */
async function updateAllAssetCategories(pool) {
  try {
    // Get all assets
    const result = await pool.query(
      `SELECT symbol, type, category, exchange FROM asset_info`
    );
    
    let updated = 0;
    let unchanged = 0;
    const categoryCounts = {
      Unknown: 0,
      Equity: 0,
      ETF: 0,
      Index: 0,
      Crypto: 0,
      Commodity: 0,
      Predictions: 0,
      Forex: 0,
      MutualFund: 0,
      InternationalStock: 0,
      Bond: 0,
    };
    
    for (const row of result.rows) {
      const determinedCategory = determineCategory(row.symbol, row.type, row.exchange || null);
      const normalizedCategory = normalizeCategory(determinedCategory);
      
      if (row.category !== normalizedCategory) {
        await pool.query(
          `UPDATE asset_info SET category = $1 WHERE symbol = $2`,
          [normalizedCategory, row.symbol]
        );
        updated++;
      } else {
        unchanged++;
      }
      
      categoryCounts[normalizedCategory] = (categoryCounts[normalizedCategory] || 0) + 1;
    }
    
    return {
      updated,
      unchanged,
      total: result.rows.length,
      categoryCounts,
    };
  } catch (error) {
    console.error('Error updating asset categories:', error);
    throw error;
  }
}

module.exports = {
  determineCategory,
  normalizeCategory,
  updateAssetCategory,
  updateAllAssetCategories,
};

