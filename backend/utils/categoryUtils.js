/**
 * Category Utility Functions
 * Determines asset category based on symbol and type
 * 
 * Categories: Unknown, Equity, ETF, Index, Crypto, Commodity, Predictions, 
 *             Forex, MutualFund, InternationalStock, Bond
 */

// Known ETF symbols (major ETFs)
const KNOWN_ETFS = new Set([
  // Major Market ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO',
  // Bond ETFs
  'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'TIP',
  // Sector ETFs (SPDR)
  'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE', 'XLC',
  // Commodity ETFs
  'GLD', 'SLV', 'GDX', 'GDXJ', 'SIL',
  // International ETFs
  'EWJ', 'EWU', 'EWC', 'EWG', 'EWA', 'EWZ', 'EWY', 'EWH', 'EWT', 'EWS',
  // Vanguard ETFs
  'VUG', 'VTV', 'VXF', 'VB', 'VS', 'VBR', 'VTHR', 'VTHR', 'VYM', 'VXUS',
  // iShares ETFs
  'IVV', 'IJH', 'IJR', 'IWF', 'IWD', 'IWN', 'IWO', 'IWB', 'IWM', 'IWV',
  // Other popular ETFs
  'ARKK', 'ARKQ', 'ARKW', 'ARKG', 'ARKF', 'TQQQ', 'SQQQ', 'SPXL', 'SPXS',
  'FXI', 'ASHR', 'MCHI', 'KWEB', 'EFA', 'EEM', 'IEFA', 'IEMG',
]);

// Bond ETF symbols (these are ETFs, not direct bonds)
const BOND_ETFS = new Set([
  'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'TIP',
  'SCHZ', 'VGIT', 'VGSH', 'VGLT', 'VCIT', 'VCSH', 'VCLT', 'VWOB',
  'IGSB', 'IG', 'IGIB', 'IGLB', 'IGEB', 'IGSB', 'IG', 'IGIB',
]);

// Commodity symbols and patterns
const COMMODITY_SYMBOLS = new Set([
  'XAUUSD', 'XAGUSD', 'CL', 'NG', 'GC', 'SI', 'HG', 'ZC', 'ZS', 'ZW',
  'KC', 'CT', 'SB', 'CC', 'LB', 'OJ', 'LE', 'HE', 'GF', 'GX',
]);

// Index symbols (starting with ^)
const INDEX_PATTERN = /^\^[A-Z0-9]+$/;

// Forex currency pairs
const FOREX_PATTERNS = [
  /^[A-Z]{3}\/[A-Z]{3}$/,  // EUR/USD
  /^[A-Z]{6}$/,            // EURUSD
];

// International stock exchanges
const INTERNATIONAL_EXCHANGES = new Set([
  'lse', 'tse', 'hkex', 'sse', 'szse', 'asx', 'tsx', 'euronext',
  'xetra', 'six', 'bse', 'nse', 'kospi', 'tase', 'jse', 'b3',
  'london', 'tokyo', 'hong kong', 'shanghai', 'shenzhen', 'sydney',
  'toronto', 'frankfurt', 'zurich', 'mumbai', 'seoul', 'tel aviv',
  'johannesburg', 'sao paulo', 'paris', 'amsterdam', 'brussels',
]);

// US exchanges
const US_EXCHANGES = new Set([
  'nyse', 'nasdaq', 'amex', 'otc', 'otcbb', 'pink', 'new york',
]);

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
  
  // 1. Index: Symbols starting with ^
  if (upperSymbol.startsWith('^') || INDEX_PATTERN.test(upperSymbol)) {
    return 'Index';
  }
  
  // 2. Crypto: Symbols starting with X: or type is crypto
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
  
  // 3. Commodity: Specific commodity symbols or type
  if (COMMODITY_SYMBOLS.has(upperSymbol) ||
      lowerType === 'commodity' || 
      upperSymbol.includes('GOLD') || upperSymbol.includes('SILVER') ||
      upperSymbol.includes('OIL') || upperSymbol.includes('GAS') ||
      upperSymbol === 'XAUUSD' || upperSymbol === 'XAGUSD' ||
      /^(CL|NG|GC|SI|HG|ZC|ZS|ZW|KC|CT|SB|CC|LB|OJ|LE|HE|GF|GX)\d{2}$/.test(upperSymbol)) {
    return 'Commodity';
  }
  
  // 4. ETF: Check known ETFs first (before bond check, as bond ETFs are ETFs)
  if (KNOWN_ETFS.has(upperSymbol) || 
      lowerType === 'etf' || lowerType === 'exchange traded fund' ||
      lowerType === 'exchange-traded fund') {
    return 'ETF';
  }
  
  // 5. Bond ETFs: These are ETFs, but if not in known ETFs list, check bond patterns
  if (BOND_ETFS.has(upperSymbol)) {
    return 'ETF'; // Bond ETFs are still ETFs
  }
  
  // 6. Direct Bonds: Type is bond (but not bond ETF)
  if ((lowerType === 'bond' || lowerType === 'treasury' || lowerType === 'corporate bond') &&
      !KNOWN_ETFS.has(upperSymbol) && !BOND_ETFS.has(upperSymbol)) {
    // Check for treasury note/bond patterns (T10, T20, etc.)
    if (/^T\d{1,2}$/.test(upperSymbol) || /^[A-Z]{1,2}\d{2,4}$/.test(upperSymbol) && 
        (upperSymbol.startsWith('T') || upperSymbol.startsWith('B')) &&
        !upperSymbol.startsWith('TLT') && !upperSymbol.startsWith('IEF') && !upperSymbol.startsWith('SHY')) {
      return 'Bond';
    }
    if (upperSymbol.includes('BOND') || upperSymbol.includes('TREASURY')) {
      return 'Bond';
    }
  }
  
  // 7. Forex: Currency pairs (EUR/USD, GBP/USD, etc.) or symbols with currency codes
  if (lowerType === 'forex' || lowerType === 'fx' || 
      FOREX_PATTERNS.some(pattern => pattern.test(upperSymbol)) ||
      (upperSymbol.includes('USD') && (upperSymbol.includes('EUR') || upperSymbol.includes('GBP') || 
       upperSymbol.includes('JPY') || upperSymbol.includes('CHF') || upperSymbol.includes('AUD') ||
       upperSymbol.includes('CAD') || upperSymbol.includes('NZD')))) {
    // Make sure it's not a crypto (X:BTCUSD) or commodity (XAUUSD)
    if (!upperSymbol.startsWith('X:') && !upperSymbol.includes('XAU') && !upperSymbol.includes('XAG') &&
        !upperSymbol.startsWith('XAU') && !upperSymbol.startsWith('XAG')) {
      return 'Forex';
    }
  }
  
  // 8. Mutual Fund: Type is mutual fund (but not ETF)
  if ((lowerType === 'mutual fund' || lowerType === 'mutualfund') &&
      lowerType !== 'etf' && !KNOWN_ETFS.has(upperSymbol)) {
    return 'MutualFund';
  }
  
  // 9. Predictions: Symbols or types indicating predictions
  if (lowerType === 'prediction' || lowerType === 'predictions' ||
      upperSymbol.includes('PRED') || upperSymbol.includes('FORECAST')) {
    return 'Predictions';
  }
  
  // 10. Index: Type is index (if not already caught by ^ pattern)
  if (lowerType === 'index' || lowerType === 'indices') {
    return 'Index';
  }
  
  // 11. Stocks/Equities: Determine if US or International
  if (lowerType === 'stock' || lowerType === 'equity' || lowerType === 'equities' || !lowerType) {
    // Check exchange first
    if (lowerExchange) {
      // Check if it's an international exchange
      const isInternational = Array.from(INTERNATIONAL_EXCHANGES).some(ex => 
        lowerExchange.includes(ex)
      );
      
      if (isInternational) {
        return 'InternationalStock';
      }
      
      // Check if it's a US exchange
      const isUS = Array.from(US_EXCHANGES).some(ex => 
        lowerExchange.includes(ex)
      );
      
      if (isUS) {
        return 'Equity';
      }
    }
    
    // If no exchange info, check symbol patterns for international stocks
    // Some international stocks have suffixes like .L (London), .T (Tokyo), etc.
    if (/^[A-Z]+\.[A-Z]{1,2}$/.test(upperSymbol)) {
      return 'InternationalStock';
    }
    
    // Default to Equity for US stocks (or unknown)
    return 'Equity';
  }
  
  // 12. Default: Unknown
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

