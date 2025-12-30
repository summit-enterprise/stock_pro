// Mock data service for local development
// Generates realistic pricing data for stocks, crypto, and commodities

// Base prices for different asset types
const BASE_PRICES = {
  // Tech stocks
  'AAPL': 175.00,
  'MSFT': 380.00,
  'GOOGL': 140.00,
  'AMZN': 150.00,
  'TSLA': 250.00,
  'META': 300.00,
  'NVDA': 500.00,
  'NFLX': 400.00,
  'AMD': 120.00,
  'INTC': 45.00,
  // Finance
  'JPM': 150.00,
  'BAC': 35.00,
  'GS': 400.00,
  'V': 250.00,
  'MA': 400.00,
  // Healthcare
  'JNJ': 160.00,
  'PFE': 30.00,
  'UNH': 500.00,
  // Consumer
  'WMT': 160.00,
  'DIS': 100.00,
  // Indices (actual index symbols)
  '^GSPC': 4500.00,      // S&P 500
  '^DJI': 38000.00,      // Dow Jones
  '^IXIC': 14000.00,     // NASDAQ Composite
  '^RUT': 2000.00,       // Russell 2000
  '^FTSE': 7500.00,      // FTSE 100
  '^N225': 38000.00,     // Nikkei 225
  '^GSPTSE': 21000.00,   // S&P/TSX 60
  // Crypto
  'X:BTCUSD': 67000.00,
  'X:ETHUSD': 3400.00,
  // Commodities
  'XAUUSD': 2345.00,
  'XAGUSD': 28.50,
};

// Generate realistic price movement
function generatePriceChange(basePrice, volatility = 0.02) {
  // Random change between -volatility and +volatility
  const changePercent = (Math.random() * 2 - 1) * volatility;
  const newPrice = basePrice * (1 + changePercent);
  return {
    price: parseFloat(newPrice.toFixed(2)),
    change: parseFloat((newPrice - basePrice).toFixed(2)),
    changePercent: parseFloat((changePercent * 100).toFixed(2)),
  };
}

// Generate realistic volume
function generateVolume(symbol, basePrice) {
  // Higher volume for popular stocks
  const baseVolume = symbol.includes('BTC') || symbol.includes('ETH') 
    ? 50000000 
    : symbol.includes('^GSPC') || symbol.includes('^IXIC') || symbol.includes('^DJI')
    ? 80000000
    : 20000000;
  
  // Add some randomness
  const volume = baseVolume * (0.7 + Math.random() * 0.6);
  return Math.floor(volume);
}

// Generate historical OHLCV data
function generateHistoricalData(symbol, days = 30) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const data = [];
  let currentPrice = basePrice;
  
  // Start from today and go backwards
  // For trading days, we need to go back further to account for weekends
  // Approximately 1.4x calendar days to get the required trading days
  const calendarDays = Math.ceil(days * 1.4);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  let tradingDaysGenerated = 0;
  let i = 0;
  
  // Generate data going backwards until we have enough trading days
  while (tradingDaysGenerated < days && i < calendarDays * 2) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      i++;
      continue; // Skip weekends
    }
    
    // Generate daily price movement
    const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
    const dailyChange = (Math.random() * 2 - 1) * volatility;
    const open = currentPrice;
    const close = open * (1 + dailyChange);
    
    // Generate high and low
    const intradayVolatility = volatility * 0.5;
    const high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
    const low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
    
    const volume = generateVolume(symbol, close);
    
    data.push({
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume,
    });
    
    currentPrice = close;
    tradingDaysGenerated++;
    i++;
  }
  
  // Reverse to get chronological order (oldest first)
  return data.reverse();
}

// Get current price for a symbol
function getCurrentPrice(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.02 : 0.01;
  const priceData = generatePriceChange(basePrice, volatility);
  
  return {
    price: priceData.price,
    change: priceData.change,
    changePercent: priceData.changePercent,
    volume: generateVolume(symbol, priceData.price),
  };
}

// Get previous close price
function getPreviousClose(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.02 : 0.01;
  const priceData = generatePriceChange(basePrice, volatility);
  
  return {
    c: priceData.price, // close price
    o: priceData.price * (1 - priceData.changePercent / 100), // open
    h: priceData.price * 1.01, // high
    l: priceData.price * 0.99, // low
    v: generateVolume(symbol, priceData.price), // volume
  };
}

// Search/autocomplete mock data
function getMockSearchResults(query) {
  // Use asset generator for comprehensive list
  const { generateAssetList } = require('./assetGenerator');
  const allAssets = generateAssetList();
  
  const queryLower = query.toLowerCase();
  const filtered = allAssets.filter(asset => 
    asset.symbol.toLowerCase().includes(queryLower) ||
    asset.name.toLowerCase().includes(queryLower)
  ).slice(0, 10);
  
  // Format for API response
  return filtered.map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    market: asset.type === 'crypto' ? 'crypto' : asset.type === 'etf' ? 'stocks' : 'stocks',
    type: asset.type === 'crypto' ? 'crypto' : asset.type === 'etf' ? 'ETF' : 'CS',
    exchange: asset.exchange,
  }));
}

// Get asset info mock data
function getMockAssetInfo(symbol) {
  // Use asset generator for comprehensive list
  const { generateAssetList } = require('./assetGenerator');
  const allAssets = generateAssetList();
  const asset = allAssets.find(a => a.symbol === symbol);
  
  if (asset) {
    return {
      name: asset.name,
      type: asset.type === 'crypto' ? 'crypto' : asset.type === 'etf' ? 'ETF' : 'CS',
      primary_exchange: asset.exchange,
      currency_name: 'USD',
    };
  }
  
  // Fallback
  return {
    name: symbol,
    type: 'CS',
    primary_exchange: 'XNAS',
    currency_name: 'USD',
  };
}

// Initialize historical data for a symbol (ensures 30 days of data)
function initializeHistoricalData(symbol, pool) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if we already have data
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count FROM asset_data WHERE symbol = $1',
        [symbol]
      );
      
      const existingCount = parseInt(checkResult.rows[0].count);
      
      // If we have less than 30 days, generate more
      if (existingCount < 30) {
        const daysToGenerate = 30 - existingCount;
        const historicalData = generateHistoricalData(symbol, daysToGenerate);
        
        // Store in database
        for (const result of historicalData) {
          const date = new Date(result.timestamp);
          const dateStr = date.toISOString().split('T')[0];
          
          await pool.query(
            `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (symbol, date) DO NOTHING`,
            [
              symbol,
              dateStr,
              result.open,
              result.high,
              result.low,
              result.close,
              result.volume,
              result.close
            ]
          );
        }
        
        resolve(historicalData);
      } else {
        resolve([]);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Generate mock market movers (gainers and losers)
function getMockMovers() {
  // Get a list of popular stock symbols
  const symbols = Object.keys(BASE_PRICES).filter(s => !s.startsWith('X:') && !s.startsWith('^'));
  
  // Generate movers with random price changes
  const movers = symbols.map(symbol => {
    const basePrice = BASE_PRICES[symbol] || 100;
    const priceData = getCurrentPrice(symbol);
    const previousCloseData = getPreviousClose(symbol);
    const previousPrice = previousCloseData.c || basePrice;
    const change = priceData.price - previousPrice;
    const changePercent = previousPrice !== 0 ? ((change / previousPrice) * 100) : 0;
    
    return {
      symbol,
      name: getMockAssetInfo(symbol).name || symbol,
      price: priceData.price,
      change: change,
      changePercent: changePercent,
    };
  });
  
  // Sort and separate gainers and losers
  const gainers = movers
    .filter(m => m.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10);
  
  const losers = movers
    .filter(m => m.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10);
  
  return { gainers, losers };
}

module.exports = {
  getCurrentPrice,
  getPreviousClose,
  generateHistoricalData,
  getMockSearchResults,
  getMockAssetInfo,
  initializeHistoricalData,
  getMockMovers,
  BASE_PRICES,
};

