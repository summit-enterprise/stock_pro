/**
 * Asset Generator - Generates comprehensive list of 1000 assets
 * Includes: Stocks, ETFs, Crypto, Indices, Commodities, Forex
 */

// Generate 1000 diverse assets with realistic names and prices
function generateAssetList() {
  const assets = [];
  let symbolCounter = 1;

  // Helper to generate unique symbol
  const generateSymbol = (prefix, index) => {
    if (prefix.length === 1) {
      return `${prefix}${String(index).padStart(3, '0')}`;
    } else if (prefix.length === 2) {
      return `${prefix}${String(index).padStart(2, '0')}`;
    } else {
      return `${prefix}${index}`;
    }
  };

  // === STOCKS (700 assets) ===
  
  // Tech Stocks (200) - Generate unique symbols
  for (let i = 0; i < 200; i++) {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC'];
    const names = ['Apple Inc.', 'Microsoft Corp.', 'Alphabet Inc.', 'Amazon.com Inc.', 'Meta Platforms', 
                   'NVIDIA Corp.', 'Tesla Inc.', 'Netflix Inc.', 'AMD Inc.', 'Intel Corp.'];
    const basePrices = [175, 380, 140, 150, 300, 500, 250, 400, 120, 45];
    
    if (i < 10) {
      assets.push({
        symbol: symbols[i],
        name: names[i],
        type: 'stock',
        exchange: i < 5 ? 'NasdaqGS' : 'NYSE',
        basePrice: basePrices[i],
      });
    } else {
      const prefix = String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Tech Company ${i}`,
        type: 'stock',
        exchange: i % 2 === 0 ? 'NasdaqGS' : 'NYSE',
        basePrice: 50 + Math.random() * 450,
      });
    }
  }
  
  // Finance (150)
  for (let i = 0; i < 150; i++) {
    const financeSymbols = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'COF', 'AXP'];
    const financeNames = ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs',
                         'Morgan Stanley', 'BlackRock', 'Charles Schwab', 'Capital One', 'American Express'];
    const financePrices = [150, 35, 45, 55, 400, 95, 800, 65, 120, 180];
    
    if (i < 10) {
      assets.push({
        symbol: financeSymbols[i],
        name: financeNames[i],
        type: 'stock',
        exchange: 'NYSE',
        basePrice: financePrices[i],
      });
    } else {
      const prefix = 'FN' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Finance Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 30 + Math.random() * 200,
      });
    }
  }
  
  // Healthcare (100)
  for (let i = 0; i < 100; i++) {
    const healthSymbols = ['JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD'];
    const healthNames = ['Johnson & Johnson', 'Pfizer', 'UnitedHealth', 'AbbVie', 'Thermo Fisher',
                        'Abbott Labs', 'Danaher', 'Bristol Myers', 'Amgen', 'Gilead'];
    const healthPrices = [160, 30, 500, 150, 550, 110, 280, 60, 250, 80];
    
    if (i < 10) {
      assets.push({
        symbol: healthSymbols[i],
        name: healthNames[i],
        type: 'stock',
        exchange: 'NYSE',
        basePrice: healthPrices[i],
      });
    } else {
      const prefix = 'HC' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Healthcare Company ${i}`,
        type: 'stock',
        exchange: i % 2 === 0 ? 'NYSE' : 'NasdaqGS',
        basePrice: 25 + Math.random() * 300,
      });
    }
  }
  
  // Consumer (100)
  for (let i = 0; i < 100; i++) {
    const consumerSymbols = ['WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'YUM', 'CMG'];
    const consumerNames = ['Walmart', 'Target', 'Costco', 'Home Depot', 'Lowe\'s', 'Nike', 'Starbucks',
                          'McDonald\'s', 'Yum Brands', 'Chipotle'];
    const consumerPrices = [160, 150, 550, 350, 220, 100, 95, 280, 130, 2500];
    
    if (i < 10) {
      assets.push({
        symbol: consumerSymbols[i],
        name: consumerNames[i],
        type: 'stock',
        exchange: 'NYSE',
        basePrice: consumerPrices[i],
      });
    } else {
      const prefix = 'CS' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Consumer Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 50 + Math.random() * 200,
      });
    }
  }
  
  // Industrial (100)
  for (let i = 0; i < 100; i++) {
    const industrialSymbols = ['BA', 'CAT', 'DE', 'GE', 'HON', 'RTX', 'LMT', 'NOC', 'GD', 'TXT'];
    if (i < 10) {
      assets.push({
        symbol: industrialSymbols[i],
        name: `Industrial Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 100 + Math.random() * 300,
      });
    } else {
      const prefix = 'IN' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Industrial Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 80 + Math.random() * 250,
      });
    }
  }
  
  // Energy (50)
  for (let i = 0; i < 50; i++) {
    const energySymbols = ['XOM', 'CVX', 'COP', 'SLB', 'EOG'];
    if (i < 5) {
      assets.push({
        symbol: energySymbols[i],
        name: `Energy Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 60 + Math.random() * 100,
      });
    } else {
      const prefix = 'EN' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Energy Company ${i}`,
        type: 'stock',
        exchange: 'NYSE',
        basePrice: 40 + Math.random() * 80,
      });
    }
  }

  // === INDICES (7 major indices) ===
  const majorIndices = [
    { symbol: '^GSPC', name: 'S&P 500', basePrice: 4500 },
    { symbol: '^DJI', name: 'Dow Jones Industrial Average', basePrice: 38000 },
    { symbol: '^IXIC', name: 'NASDAQ Composite', basePrice: 14000 },
    { symbol: '^RUT', name: 'Russell 2000', basePrice: 2000 },
    { symbol: '^FTSE', name: 'FTSE 100', basePrice: 7500 },
    { symbol: '^N225', name: 'Nikkei 225', basePrice: 38000 },
    { symbol: '^GSPTSE', name: 'S&P/TSX 60', basePrice: 21000 },
  ];
  
  for (let i = 0; i < majorIndices.length; i++) {
    assets.push({
      symbol: majorIndices[i].symbol,
      name: majorIndices[i].name,
      type: 'index',
      category: 'index',
      exchange: 'Index',
      basePrice: majorIndices[i].basePrice,
    });
  }

  // === ETFs (143 ETFs, separate from indices) ===
  const majorETFs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND',
                     'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'TIP', 'XLK', 'XLF',
                     'XLV', 'XLE', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE', 'XLC', 'GLD',
                     'SLV', 'GDX', 'GDXJ', 'SIL', 'EWJ', 'EWU', 'EWC', 'EWG', 'EWA', 'EWZ'];
  
  for (let i = 0; i < 143; i++) {
    if (i < majorETFs.length) {
      assets.push({
        symbol: majorETFs[i],
        name: `${majorETFs[i]} ETF`,
        type: 'etf',
        exchange: 'NYSE',
        basePrice: 50 + Math.random() * 450,
      });
    } else {
      const prefix = 'ETF' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `ETF ${i}`,
        type: 'etf',
        exchange: 'NYSE',
        basePrice: 30 + Math.random() * 200,
      });
    }
  }

  // === CRYPTO (100) ===
  const majorCryptos = [
    'X:BTCUSD', 'X:ETHUSD', 'X:BNBUSD', 'X:ADAUSD', 'X:SOLUSD', 'X:XRPUSD', 'X:DOTUSD', 'X:DOGEUSD', 'X:AVAXUSD', 'X:SHIBUSD',
    'X:MATICUSD', 'X:UNIUSD', 'X:LTCUSD', 'X:ALGOUSD', 'X:ATOMUSD', 'X:VETUSD', 'X:ICPUSD', 'X:THETAUSD', 'X:FILUSD', 'X:TRXUSD',
    'X:ETCUSD', 'X:XLMUSD', 'X:AAVEUSD', 'X:EOSUSD', 'X:MKRUSD', 'X:GRTUSD', 'X:SNXUSD', 'X:COMPUSD', 'X:YFIUSD', 'X:SUSHIUSD',
  ];
  
  const cryptoPrices = {
    'X:BTCUSD': 67000, 'X:ETHUSD': 3400, 'X:BNBUSD': 600, 'X:ADAUSD': 0.5, 'X:SOLUSD': 100,
    'X:XRPUSD': 0.6, 'X:DOTUSD': 7, 'X:DOGEUSD': 0.08, 'X:AVAXUSD': 35, 'X:SHIBUSD': 0.00001,
  };
  
  for (let i = 0; i < 100; i++) {
    if (i < majorCryptos.length) {
      assets.push({
        symbol: majorCryptos[i],
        name: majorCryptos[i].replace('X:', '') + ' (Crypto)',
        type: 'crypto',
        exchange: 'CRYPTO',
        basePrice: cryptoPrices[majorCryptos[i]] || (10 + Math.random() * 500),
      });
    } else {
      const cryptoName = `CRYPTO${i}`;
      assets.push({
        symbol: `X:${cryptoName}USD`,
        name: `${cryptoName} (Crypto)`,
        type: 'crypto',
        exchange: 'CRYPTO',
        basePrice: 0.01 + Math.random() * 1000,
      });
    }
  }

  // === COMMODITIES & FOREX (50) ===
  const commodities = [
    { symbol: 'XAUUSD', name: 'Gold', price: 2345 },
    { symbol: 'XAGUSD', name: 'Silver', price: 28.5 },
    { symbol: 'XPTUSD', name: 'Platinum', price: 950 },
    { symbol: 'XPDUSD', name: 'Palladium', price: 1200 },
    { symbol: 'X:CLUSD', name: 'Crude Oil', price: 75 },
    { symbol: 'X:NGUSD', name: 'Natural Gas', price: 3.5 },
    { symbol: 'X:HOUSD', name: 'Heating Oil', price: 2.8 },
    { symbol: 'X:RBUSD', name: 'Gasoline', price: 2.5 },
  ];
  
  const forexPairs = [
    { symbol: 'EURUSD', name: 'Euro/USD', price: 1.08 },
    { symbol: 'GBPUSD', name: 'British Pound/USD', price: 1.27 },
    { symbol: 'USDJPY', name: 'USD/Japanese Yen', price: 150 },
    { symbol: 'USDCHF', name: 'USD/Swiss Franc', price: 0.88 },
    { symbol: 'AUDUSD', name: 'Australian Dollar/USD', price: 0.65 },
    { symbol: 'USDCAD', name: 'USD/Canadian Dollar', price: 1.35 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar/USD', price: 0.60 },
  ];
  
  for (let i = 0; i < 50; i++) {
    if (i < commodities.length) {
      assets.push({
        symbol: commodities[i].symbol,
        name: commodities[i].name + ' (Commodity)',
        type: 'commodity',
        exchange: 'FOREX',
        basePrice: commodities[i].price,
      });
    } else if (i < commodities.length + forexPairs.length) {
      const forex = forexPairs[i - commodities.length];
      assets.push({
        symbol: forex.symbol,
        name: forex.name + ' (Forex)',
        type: 'forex',
        exchange: 'FOREX',
        basePrice: forex.price,
      });
    } else {
      const prefix = 'FX' + String.fromCharCode(65 + (i % 26));
      assets.push({
        symbol: generateSymbol(prefix, Math.floor(i / 26)),
        name: `Forex Pair ${i}`,
        type: 'forex',
        exchange: 'FOREX',
        basePrice: 0.5 + Math.random() * 1.5,
      });
    }
  }

  return assets.slice(0, 1000); // Ensure exactly 1000 assets
}

module.exports = {
  generateAssetList,
};
