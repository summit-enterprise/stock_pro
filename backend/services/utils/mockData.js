// Mock data service for local development
// Generates realistic pricing data for stocks, crypto, and commodities

// Helper function to check if symbol is crypto
function isCrypto(symbol) {
  if (!symbol) return false;
  return symbol.startsWith('X:') && !symbol.includes('XAU') && !symbol.includes('XAG') && 
         !symbol.includes('OIL') && !symbol.includes('GAS');
}

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
  // ETFs (major ETFs)
  'SPY': 450.00,         // SPDR S&P 500 ETF
  'QQQ': 380.00,         // Invesco QQQ Trust
  'DIA': 380.00,         // SPDR Dow Jones Industrial Average ETF
  'IWM': 200.00,         // iShares Russell 2000 ETF
  'VTI': 240.00,         // Vanguard Total Stock Market ETF
  'VOO': 450.00,         // Vanguard S&P 500 ETF
  'VEA': 50.00,          // Vanguard FTSE Developed Markets ETF
  'VWO': 45.00,          // Vanguard FTSE Emerging Markets ETF
  'AGG': 100.00,         // iShares Core U.S. Aggregate Bond ETF
  'BND': 80.00,          // Vanguard Total Bond Market ETF
  'TLT': 95.00,          // iShares 20+ Year Treasury Bond ETF
  'IEF': 105.00,         // iShares 7-10 Year Treasury Bond ETF
  'SHY': 82.00,          // iShares 1-3 Year Treasury Bond ETF
  'LQD': 120.00,         // iShares iBoxx $ Investment Grade Corporate Bond ETF
  'HYG': 75.00,          // iShares iBoxx $ High Yield Corporate Bond ETF
  'JNK': 100.00,         // SPDR Bloomberg High Yield Bond ETF
  'EMB': 90.00,          // iShares J.P. Morgan USD Emerging Markets Bond ETF
  'TIP': 110.00,         // iShares TIPS Bond ETF
  'XLK': 200.00,         // Technology Select Sector SPDR Fund
  'XLF': 40.00,          // Financial Select Sector SPDR Fund
  'XLV': 150.00,         // Health Care Select Sector SPDR Fund
  'XLE': 85.00,          // Energy Select Sector SPDR Fund
  'XLI': 120.00,         // Industrial Select Sector SPDR Fund
  'XLP': 75.00,          // Consumer Staples Select Sector SPDR Fund
  'XLY': 180.00,         // Consumer Discretionary Select Sector SPDR Fund
  'XLB': 80.00,          // Materials Select Sector SPDR Fund
  'XLU': 65.00,          // Utilities Select Sector SPDR Fund
  'XLRE': 45.00,         // Real Estate Select Sector SPDR Fund
  'XLC': 70.00,          // Communication Services Select Sector SPDR Fund
  'GLD': 200.00,         // SPDR Gold Trust
  'SLV': 22.00,          // iShares Silver Trust
  'GDX': 30.00,          // VanEck Gold Miners ETF
  'GDXJ': 40.00,         // VanEck Junior Gold Miners ETF
  'SIL': 25.00,          // Global X Silver Miners ETF
  'EWJ': 70.00,          // iShares MSCI Japan ETF
  'EWU': 35.00,          // iShares MSCI United Kingdom ETF
  'EWC': 35.00,          // iShares MSCI Canada ETF
  'EWG': 30.00,          // iShares MSCI Germany ETF
  'EWA': 25.00,          // iShares MSCI Australia ETF
  'EWZ': 28.00,          // iShares MSCI Brazil ETF
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
  // Higher volume for popular stocks and major ETFs
  const baseVolume = symbol.includes('BTC') || symbol.includes('ETH') 
    ? 50000000 
    : symbol.includes('^GSPC') || symbol.includes('^IXIC') || symbol.includes('^DJI')
    ? 80000000
    : ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO'].includes(symbol)
    ? 60000000  // Major ETFs have high volume
    : symbol.includes('SPY') || symbol.includes('QQQ') || symbol.includes('VTI')
    ? 50000000  // Other popular ETFs
    : 20000000;
  
  // Add some randomness
  const volume = baseVolume * (0.7 + Math.random() * 0.6);
  return Math.floor(volume);
}

// Generate historical OHLCV data (daily) - includes weekends with flat prices
function generateHistoricalData(symbol, days = 30, includeWeekends = false) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const data = [];
  let currentPrice = basePrice;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let daysGenerated = 0;
  let i = 0;
  let lastTradingDayPrice = basePrice;
  
  // Generate data going backwards
  while (daysGenerated < days && i < days * 2) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const assetIsCrypto = isCrypto(symbol);
    
    // Skip weekends for non-crypto assets (unless explicitly included)
    if (!assetIsCrypto && isWeekend && !includeWeekends) {
      i++;
      continue; // Skip this day
    }
    
    if (includeWeekends || !isWeekend || assetIsCrypto) {
      let open, high, low, close, volume;
      
      if (isWeekend && !assetIsCrypto) {
        // Weekend for non-crypto: flat price (same as last trading day's close)
        open = lastTradingDayPrice;
        high = lastTradingDayPrice;
        low = lastTradingDayPrice;
        close = lastTradingDayPrice;
        volume = 0; // No volume on weekends for non-crypto
      } else {
        // Trading day: generate price movement
        const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
        const dailyChange = (Math.random() * 2 - 1) * volatility;
        open = currentPrice;
        close = open * (1 + dailyChange);
        
        const intradayVolatility = volatility * 0.5;
        high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
        low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
        
        volume = generateVolume(symbol, close);
        lastTradingDayPrice = close; // Update last trading day price
        currentPrice = close;
      }
      
      data.push({
        timestamp: date.getTime(),
        date: date,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume,
      });
      
      daysGenerated++;
    }
    i++;
  }
  
  // Reverse to get chronological order (oldest first)
  return data.reverse();
}

// Generate 7 days of data including weekends (for 7D chart)
function generate7DaysData(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const data = [];
  let currentPrice = basePrice;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let lastTradingDayPrice = basePrice;
  
  const assetIsCrypto = isCrypto(symbol);
  
  // Generate 7 days going backwards (today + 6 previous days)
  // For non-crypto, only generate trading days (skip weekends)
  let daysGenerated = 0;
  let i = 0;
  while (daysGenerated < 7) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Skip weekends for non-crypto assets
    if (!assetIsCrypto && isWeekend) {
      i++;
      continue;
    }
    
    let open, high, low, close, volume;
    
    if (isWeekend && assetIsCrypto) {
      // Weekend for crypto: continue trading with price movement
      const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
      const dailyChange = (Math.random() * 2 - 1) * volatility;
      open = currentPrice;
      close = open * (1 + dailyChange);
      
      const intradayVolatility = volatility * 0.5;
      high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
      low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
      
      volume = generateVolume(symbol, close);
      lastTradingDayPrice = close;
      currentPrice = close;
    } else {
      // Trading day: generate price movement
      const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
      const dailyChange = (Math.random() * 2 - 1) * volatility;
      open = currentPrice;
      close = open * (1 + dailyChange);
      
      const intradayVolatility = volatility * 0.5;
      high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
      low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
      
      volume = generateVolume(symbol, close);
      lastTradingDayPrice = close; // Update last trading day price
      currentPrice = close;
    }
    
    data.push({
      timestamp: date.getTime(),
      date: date,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume,
    });
    
    daysGenerated++;
    i++;
  }
  
  // Reverse to get chronological order (oldest first)
  return data.reverse();
}

// Generate hourly OHLCV data for a specific day
// Generates 24 hours of data from 12:00 AM to 11:00 PM
function generateHourlyData(symbol, date, dailyOpen, dailyHigh, dailyLow, dailyClose) {
  const hourlyData = [];
  let currentPrice = dailyOpen;
  
  // Generate 24 hours of data (12:00 AM to 11:00 PM)
  const totalHours = 24;
  
  // Determine if this is a trading day (Monday-Friday)
  const dayOfWeek = date.getDay();
  const isTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
  
  // Trading hours are 9:30 AM to 4:00 PM (hours 9-16, with 9:30 start)
  const marketOpenHour = 9;
  const marketOpenMinute = 30;
  const marketCloseHour = 16;
  const marketCloseMinute = 0;
  
  for (let hour = 0; hour < totalHours; hour++) {
    const hourDate = new Date(date);
    hourDate.setHours(hour, 0, 0, 0);
    
    // Determine if this hour is during trading hours
    const isTradingHour = isTradingDay && (
      (hour > marketOpenHour && hour < marketCloseHour) ||
      (hour === marketOpenHour) || // 9 AM (includes 9:30)
      (hour === marketCloseHour)   // 4 PM
    );
    
    // Generate hourly price movement
    // During trading hours: normal volatility
    // Outside trading hours: minimal movement (overnight/pre-market)
    const volatility = isTradingHour 
      ? (symbol.includes('BTC') || symbol.includes('ETH') ? 0.005 : 0.002)
      : (symbol.includes('BTC') || symbol.includes('ETH') ? 0.001 : 0.0005); // Lower volatility outside trading hours
    
    const hourlyChange = (Math.random() * 2 - 1) * volatility;
    const open = currentPrice;
    const close = open * (1 + hourlyChange);
    
    // Ensure hourly prices stay within daily high/low bounds
    const high = Math.min(Math.max(open, close) * (1 + Math.random() * volatility * 0.3), dailyHigh);
    const low = Math.max(Math.min(open, close) * (1 - Math.random() * volatility * 0.3), dailyLow);
    
    // Hourly volume: higher during trading hours, minimal outside
    const baseVolume = generateVolume(symbol, close);
    const hourlyVolume = isTradingHour
      ? Math.floor(baseVolume / 8 * (0.8 + Math.random() * 0.4)) // Distribute trading volume over 8 trading hours
      : Math.floor(baseVolume * 0.01 * (0.5 + Math.random() * 0.5)); // Minimal volume outside trading hours
    
    hourlyData.push({
      timestamp: hourDate.getTime(),
      date: hourDate,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: hourlyVolume,
    });
    
    currentPrice = close;
  }
  
  return hourlyData;
}

// Generate 10 years of historical data with hourly data for recent days
function generateExtendedHistoricalData(symbol, includeHourly = true) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const dailyData = [];
  const hourlyData = [];
  let currentPrice = basePrice;
  
  const assetIsCrypto = isCrypto(symbol);
  
  // Generate 10 years of daily data
  // For crypto: all calendar days (3650 days)
  // For non-crypto: only trading days (approximately 2520 trading days over 10 years)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Go back 10 years
  const totalDays = 3650; // 10 years of calendar days (we'll filter weekends for non-crypto)
  let lastTradingDayPrice = basePrice;
  let daysGenerated = 0;
  let i = 0;
  
  // Generate daily data going backwards
  // For crypto: include all days (weekends continue trading)
  // For non-crypto: skip weekends (only trading days)
  while (i < totalDays) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Skip weekends for non-crypto assets
    if (!assetIsCrypto && isWeekend) {
      i++;
      continue;
    }
    
    let open, high, low, close, volume;
    
    if (isWeekend && assetIsCrypto) {
      // Weekend for crypto: continue trading with price movement
      const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
      const dailyChange = (Math.random() * 2 - 1) * volatility;
      open = currentPrice;
      close = open * (1 + dailyChange);
      
      const intradayVolatility = volatility * 0.5;
      high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
      low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
      
      volume = generateVolume(symbol, close);
      lastTradingDayPrice = close;
      currentPrice = close;
    } else {
      // Trading day: generate price movement
      const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.03 : 0.015;
      const dailyChange = (Math.random() * 2 - 1) * volatility;
      open = currentPrice;
      close = open * (1 + dailyChange);
      
      const intradayVolatility = volatility * 0.5;
      high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
      low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
      
      volume = generateVolume(symbol, close);
      lastTradingDayPrice = close; // Update last trading day price
      currentPrice = close;
    }
    
    const dayData = {
      timestamp: date.getTime(),
      date: new Date(date),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume,
    };
    
    dailyData.push(dayData);
    daysGenerated++;
    
    // Generate hourly data for recent days (last 7 trading days) if includeHourly is true
    if (includeHourly && (!isWeekend || assetIsCrypto) && daysGenerated <= 7) {
      const hourly = generateHourlyData(symbol, date, open, high, low, close);
      hourlyData.push(...hourly);
    }
    
    i++;
  }
  
  // Reverse to get chronological order (oldest first)
  return {
    daily: dailyData.reverse(),
    hourly: hourlyData.reverse(),
  };
}

// Get current price for a symbol
function getCurrentPrice(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.02 : 0.01;
  const priceData = generatePriceChange(basePrice, volatility);
  return priceData.price;
}

// Get previous close price
function getPreviousClose(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  // Return a price slightly different from current to simulate change
  const change = (Math.random() * 2 - 1) * 0.01; // ±1% change
  return parseFloat((basePrice * (1 + change)).toFixed(2));
}

// Generate mock search results
function getMockSearchResults(query) {
  const queryUpper = query.toUpperCase();
  const results = [];
  
  // Check if query matches any base price symbols
  for (const [symbol, price] of Object.entries(BASE_PRICES)) {
    if (symbol.includes(queryUpper) || queryUpper.includes(symbol)) {
      const currentPrice = getCurrentPrice(symbol);
      const change = currentPrice - price;
      const changePercent = (change / price) * 100;
      
      results.push({
        symbol: symbol,
        name: `${symbol} Asset`,
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: generateVolume(symbol, currentPrice),
        marketCap: currentPrice * 1000000, // Mock market cap
      });
    }
  }
  
  return results.slice(0, 10); // Return top 10 results
}

// Get mock asset info
function getMockAssetInfo(symbol) {
  const basePrice = BASE_PRICES[symbol] || 100.00;
  const currentPrice = getCurrentPrice(symbol);
  const change = currentPrice - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: symbol,
    name: `${symbol} Asset`,
    price: currentPrice,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: generateVolume(symbol, currentPrice),
    marketCap: currentPrice * 1000000,
    high52Week: basePrice * 1.5,
    low52Week: basePrice * 0.7,
    peRatio: 25.5,
    dividendYield: 2.5,
    eps: currentPrice / 25.5,
    beta: 1.2,
    sector: 'Technology',
    industry: 'Software',
    exchange: 'NASDAQ',
    currency: 'USD',
    country: 'United States',
    website: `https://example.com/${symbol.toLowerCase()}`,
    description: `Mock description for ${symbol}`,
    ceo: 'John Doe',
    employees: 10000,
    headquarters: 'San Francisco, CA',
    founded: 2000,
    ipo_date: '2000-01-01',
    market_cap: currentPrice * 1000000,
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
  const symbols = Object.keys(BASE_PRICES).filter(s => !s.startsWith('^') && !s.startsWith('X:'));
  
  const movers = symbols.slice(0, 20).map(symbol => {
    const basePrice = BASE_PRICES[symbol] || 100.00;
    const priceData = generatePriceChange(basePrice, 0.05); // Higher volatility for movers
    
    return {
      symbol: symbol,
      name: `${symbol} Asset`,
      price: priceData.price,
      change: priceData.change,
      changePercent: priceData.changePercent,
      volume: generateVolume(symbol, priceData.price),
    };
  });
  
  // Sort by change percent
  movers.sort((a, b) => b.changePercent - a.changePercent);
  
  return {
    gainers: movers.slice(0, 10),
    losers: movers.slice(-10).reverse(),
  };
}

module.exports = {
  getCurrentPrice,
  getPreviousClose,
  generateHistoricalData,
  generateHourlyData,
  generateExtendedHistoricalData,
  generate7DaysData,
  generateVolume,
  getMockSearchResults,
  getMockAssetInfo,
  initializeHistoricalData,
  getMockMovers,
  BASE_PRICES,
};
