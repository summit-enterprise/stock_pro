/**
 * Populate database with 2000 stocks, major indices, cryptos, and commodities
 * Generates 3 years of historical mock data
 * 
 * Run: node backend/scripts/populateStocksIndicesCrypto.js
 */

require('dotenv').config();
const { pool, initDb } = require('../db');
const { generateHistoricalData, BASE_PRICES } = require('../services/utils/mockData');
const cryptoService = require('../services/crypto/cryptoService');
const { determineCategory, normalizeCategory } = require('../utils/categoryUtils');

// Major indices from market overview
const MAJOR_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', basePrice: 4500.00, type: 'index' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', basePrice: 38000.00, type: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', basePrice: 14000.00, type: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', basePrice: 2000.00, type: 'index' },
  { symbol: '^FTSE', name: 'FTSE 100', basePrice: 7500.00, type: 'index' },
  { symbol: '^N225', name: 'Nikkei 225', basePrice: 38000.00, type: 'index' },
  { symbol: '^GSPTSE', name: 'S&P/TSX 60', basePrice: 21000.00, type: 'index' },
];

// Commodities
const COMMODITIES = [
  { symbol: 'XAUUSD', name: 'Gold', basePrice: 2345.00, type: 'commodity' },
  { symbol: 'XAGUSD', name: 'Silver', basePrice: 28.50, type: 'commodity' },
];

// Comprehensive list of major stocks (2000 stocks)
// This includes S&P 500, NASDAQ 100, Dow 30, and other major stocks
function getMajorStocks() {
  // Major stock symbols from various sectors (curated list of ~500 major stocks)
  const majorStocks = [
    // Tech (300) - Major tech companies
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'CSCO',
    'AVGO', 'QCOM', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'ANSS', 'FTNT', 'PANW', 'CRWD', 'ZS', 'NET', 'DDOG',
    'DOCN', 'FROG', 'ESTC', 'MDB', 'NOW', 'TEAM', 'ZM', 'DOCU', 'COUP', 'BILL', 'SNOW', 'PLTR', 'RBLX', 'U', 'RPD',
    'AI', 'PATH', 'ASAN', 'FRSH', 'OKTA', 'SPLK', 'VRNS', 'QLYS', 'TENB', 'RDWR', 'WDAY', 'VEEV', 'PAYC', 'FROG', 'ESTC',
    // Finance (200)
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'COF', 'AXP', 'V', 'MA', 'PYPL', 'SQ', 'FIS', 'FISV', 'ADP',
    'TROW', 'BEN', 'IVZ', 'HOOD', 'SOFI', 'LC', 'UPST', 'AFRM', 'NU', 'PAG', 'L', 'ALL', 'PRU', 'MET', 'AIG', 'TRV',
    'CB', 'AFL', 'HIG', 'PFG', 'BRO', 'FAF', 'RLI', 'WRB', 'ACGL', 'AXS', 'RE', 'RDN', 'MTG', 'ESNT', 'RKT', 'UWMC',
    // Healthcare (250)
    'JNJ', 'PFE', 'UNH', 'ABT', 'TMO', 'ABBV', 'MRK', 'BMY', 'AMGN', 'GILD', 'REGN', 'VRTX', 'BIIB', 'ILMN', 'MRNA',
    'BNTX', 'NVAX', 'CELG', 'BMRN', 'FOLD', 'ALKS', 'ALNY', 'ARWR', 'BEAM', 'BLUE', 'CRSP', 'EDIT', 'FATE', 'NTLA',
    // Consumer (200)
    'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'YUM', 'CMG', 'DPZ', 'WEN', 'JACK', 'BOJA', 'CAKE',
    'TJX', 'ROST', 'DG', 'DLTR', 'FIVE', 'BBY', 'GME', 'AMC', 'BBBY', 'RH', 'WSM', 'W', 'ETSY', 'SHOP', 'MELI',
    // Energy (150)
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'VLO', 'PSX', 'HES', 'MRO', 'FANG', 'OVV', 'CTRA', 'MTDR', 'RRC',
    'APA', 'DVN', 'SWN', 'PDC', 'SM', 'GPOR', 'CRK', 'REI', 'MGY', 'VTLE', 'NEXT', 'REI', 'MGY', 'VTLE', 'NEXT',
    // Industrial (200)
    'BA', 'CAT', 'DE', 'GE', 'HON', 'RTX', 'LMT', 'NOC', 'GD', 'TXT', 'EMR', 'ETN', 'PH', 'AME', 'ROK', 'FTV',
    'ITW', 'DOV', 'GGG', 'PNR', 'FLS', 'AOS', 'ATI', 'AXON', 'AYI', 'AZEK', 'B', 'BCC', 'BDC', 'BECN', 'BELFB',
    // Materials (150)
    'LIN', 'APD', 'ECL', 'SHW', 'PPG', 'DD', 'DOW', 'FCX', 'NEM', 'GOLD', 'AA', 'X', 'CLF', 'STLD', 'CMC',
    'NUE', 'RS', 'VMC', 'MLM', 'EXP', 'USCR', 'SUM', 'SMID', 'SXC', 'SCL', 'RBC', 'PCT', 'OC', 'MTX', 'MTRX',
    // Real Estate (150)
    'AMT', 'PLD', 'EQIX', 'PSA', 'WELL', 'VTR', 'PEAK', 'VICI', 'SPG', 'O', 'DLR', 'EXPI', 'RDFN', 'OPEN', 'Z',
    // Utilities (100)
    'NEE', 'DUK', 'SO', 'AEP', 'SRE', 'XEL', 'ES', 'ED', 'EIX', 'PEG', 'ETR', 'FE', 'CMS', 'CNP', 'ATO',
    // Communication (100)
    'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'LUMN', 'USM', 'SHEN', 'CNSL', 'LILA', 'ATUS', 'CABO', 'CCOI', 'CHTR', 'COMM',
    // International ADRs (200)
    'ASML', 'TSM', 'NVO', 'NVS', 'UL', 'RHHBY', 'BP', 'SHEL', 'GSK', 'AZN', 'DEO', 'BHP', 'RIO', 'VALE', 'TOT',
    'NTT', 'TM', 'HMC', 'SONY', 'MUFG', 'SMFG', 'MFG', 'HDB', 'IBN', 'INFY', 'WIT', 'TCS',
    // Small/Mid cap growth (200)
    'ROKU', 'PTON', 'PINS', 'SNAP', 'SPOT', 'SHOP', 'ETSY', 'MELI', 'SE', 'GRAB', 'BABA', 'JD', 'PDD', 'TME', 'WB',
  ];

  // Remove duplicates
  const uniqueStocks = [...new Set(majorStocks)];
  
  // Generate additional stocks to reach 2000 total
  const additionalStocks = [];
  const existingSymbols = new Set(uniqueStocks);
  
  // Generate more stocks with realistic symbols (max 5 characters)
  const prefixes = ['TECH', 'DATA', 'CLOUD', 'AI', 'CYBER', 'SOFT', 'APP', 'WEB', 'DIGI', 'NET', 'BIO', 'MED', 'HEALTH',
                   'FIN', 'BANK', 'INV', 'TRADE', 'ENERGY', 'OIL', 'GAS', 'MINING', 'METAL', 'AUTO', 'CAR', 'RETAIL',
                   'SHOP', 'STORE', 'FOOD', 'REST', 'HOTEL', 'TRAVEL', 'AIR', 'SHIP', 'LOG', 'TRANS', 'BUILD', 'CONST',
                   'REAL', 'PROP', 'UTIL', 'POWER', 'WATER', 'COMM', 'TEL', 'MEDIA', 'ENT', 'GAME', 'SPORT', 'FIT'];
  
  let counter = 0;
  while (uniqueStocks.length + additionalStocks.length < 2000) {
    const prefix = prefixes[counter % prefixes.length];
    const num = Math.floor(counter / prefixes.length);
    // Create 4-5 character symbols
    const symbol = num < 10 
      ? `${prefix.slice(0, 3)}${num}` 
      : `${prefix.slice(0, 2)}${num.toString().padStart(2, '0')}`;
    
    if (!existingSymbols.has(symbol) && symbol.length <= 5) {
      additionalStocks.push({
        symbol,
        name: `${prefix} ${num} Inc.`,
        type: 'stock',
        category: 'equities',
        exchange: num % 2 === 0 ? 'NYSE' : 'NASDAQ',
        basePrice: 10 + Math.random() * 500
      });
      existingSymbols.add(symbol);
    }
    counter++;
    if (counter > 10000) break; // Safety limit
  }

  // Convert stock symbols to objects with realistic names
  const stockObjects = uniqueStocks.map((symbol, idx) => ({
    symbol,
    name: `${symbol} Corporation`,
    type: 'stock',
    category: 'equities',
    exchange: idx % 2 === 0 ? 'NYSE' : 'NASDAQ',
    basePrice: 10 + Math.random() * 500
  }));

  return [...stockObjects, ...additionalStocks].slice(0, 2000);
}

async function populateStocksIndicesCrypto() {
  try {
    console.log('🚀 Starting comprehensive asset population...\n');
    console.log('📊 This will populate:');
    console.log('   - 2000 stocks');
    console.log('   - 7 major indices');
    console.log('   - 100 cryptocurrencies');
    console.log('   - 2 commodities');
    console.log('   - 3 years of historical data\n');

    // Initialize database
    await initDb();

    const allAssets = [];
    const tradingDays = 756; // 3 years of trading days (252 days/year * 3)

    // 1. Add major indices
    console.log('1. Adding major indices...');
    for (const index of MAJOR_INDICES) {
      const category = normalizeCategory(determineCategory(index.symbol, index.type));
      allAssets.push({ ...index, category });
      BASE_PRICES[index.symbol] = index.basePrice;
    }
    console.log(`   ✅ Added ${MAJOR_INDICES.length} indices\n`);

    // 2. Add commodities
    console.log('2. Adding commodities...');
    for (const commodity of COMMODITIES) {
      const category = normalizeCategory(determineCategory(commodity.symbol, commodity.type));
      allAssets.push({ ...commodity, category });
      BASE_PRICES[commodity.symbol] = commodity.basePrice;
    }
    console.log(`   ✅ Added ${COMMODITIES.length} commodities\n`);

    // 3. Fetch and add cryptocurrencies (top 100)
    console.log('3. Fetching cryptocurrencies from CoinGecko...');
    try {
      const cryptos = await cryptoService.fetchCryptoList(100);
      console.log(`   ✅ Fetched ${cryptos.length} cryptocurrencies`);
      
      for (const crypto of cryptos) {
        const dbSymbol = `X:${crypto.symbol.toUpperCase()}USD`;
        const category = normalizeCategory(determineCategory(dbSymbol, 'crypto'));
        allAssets.push({
          symbol: dbSymbol,
          name: crypto.name,
          type: 'crypto',
          category: category,
          exchange: 'Crypto',
          basePrice: crypto.current_price || 100
        });
        BASE_PRICES[dbSymbol] = crypto.current_price || 100;
      }
      console.log(`   ✅ Added ${cryptos.length} cryptocurrencies\n`);
    } catch (error) {
      console.error(`   ⚠️  Error fetching cryptos: ${error.message}`);
      console.log('   Using fallback crypto list...\n');
      // Fallback: Add major cryptos manually
      const fallbackCryptos = [
        { symbol: 'X:BTCUSD', name: 'Bitcoin', basePrice: 67000 },
        { symbol: 'X:ETHUSD', name: 'Ethereum', basePrice: 3400 },
        { symbol: 'X:BNBUSD', name: 'Binance Coin', basePrice: 600 },
        { symbol: 'X:ADAUSD', name: 'Cardano', basePrice: 0.5 },
        { symbol: 'X:SOLUSD', name: 'Solana', basePrice: 150 },
      ];
      for (const crypto of fallbackCryptos) {
        const category = normalizeCategory(determineCategory(crypto.symbol, 'crypto'));
        allAssets.push({
          symbol: crypto.symbol,
          name: crypto.name,
          type: 'crypto',
          category: category,
          exchange: 'Crypto',
          basePrice: crypto.basePrice
        });
        BASE_PRICES[crypto.symbol] = crypto.basePrice;
      }
    }

    // 4. Add 2000 stocks
    console.log('4. Generating 2000 stock symbols...');
    const stocks = getMajorStocks();
    console.log(`   ✅ Generated ${stocks.length} stocks\n`);
    
    for (const stock of stocks) {
      const category = normalizeCategory(determineCategory(stock.symbol, stock.type || 'stock'));
      allAssets.push({ ...stock, category });
      if (!BASE_PRICES[stock.symbol]) {
        BASE_PRICES[stock.symbol] = stock.basePrice;
      }
    }

    // 5. Insert all assets into asset_info
    console.log('5. Inserting asset metadata into database...');
    let insertedCount = 0;
    for (const asset of allAssets) {
      try {
        const category = normalizeCategory(determineCategory(asset.symbol, asset.type, asset.exchange));
        await pool.query(
          `INSERT INTO asset_info (symbol, name, type, category, exchange, currency, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (symbol) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
          [
            asset.symbol,
            asset.name,
            asset.type,
            category,
            asset.exchange || 'NYSE',
            'USD'
          ]
        );
        insertedCount++;
        if (insertedCount % 500 === 0) {
          process.stdout.write(`   Progress: ${insertedCount}/${allAssets.length}\r`);
        }
      } catch (error) {
        console.error(`   ⚠️  Error inserting ${asset.symbol}:`, error.message);
      }
    }
    console.log(`\n   ✅ Inserted ${insertedCount} assets\n`);

    // 6. Generate and insert 3 years of historical data
    console.log('6. Generating 3 years of historical data...');
    console.log(`   This will create ${(allAssets.length * tradingDays).toLocaleString()} data points\n`);
    
    let dataInserted = 0;
    const totalRecords = allAssets.length * tradingDays;
    
    for (let i = 0; i < allAssets.length; i++) {
      const asset = allAssets[i];
      const basePrice = BASE_PRICES[asset.symbol] || asset.basePrice || 100;
      
      // Temporarily set BASE_PRICES for this asset
      const originalPrice = BASE_PRICES[asset.symbol];
      BASE_PRICES[asset.symbol] = basePrice;
      
      // Generate historical data
      const historicalData = generateHistoricalData(asset.symbol, tradingDays);
      
      // Restore original price
      if (originalPrice !== undefined) {
        BASE_PRICES[asset.symbol] = originalPrice;
      }
      
      // Insert in batches for performance
      const batchSize = 100;
      for (let j = 0; j < historicalData.length; j += batchSize) {
        const batch = historicalData.slice(j, j + batchSize);
        const values = batch.map((point) => {
          const date = new Date(point.timestamp);
          const dateStr = date.toISOString().split('T')[0];
          return `('${asset.symbol}', '${dateStr}', ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume}, ${point.close})`;
        }).join(',');
        
        try {
          await pool.query(
            `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
             VALUES ${values}
             ON CONFLICT (symbol, date) DO UPDATE SET
             open = EXCLUDED.open,
             high = EXCLUDED.high,
             low = EXCLUDED.low,
             close = EXCLUDED.close,
             volume = EXCLUDED.volume,
             adjusted_close = EXCLUDED.adjusted_close`
          );
          dataInserted += batch.length;
        } catch (error) {
          console.error(`   ⚠️  Error inserting data for ${asset.symbol}:`, error.message);
        }
      }
      
      if ((i + 1) % 100 === 0) {
        const progress = ((i + 1) / allAssets.length * 100).toFixed(1);
        const recordsProgress = ((dataInserted / totalRecords) * 100).toFixed(1);
        process.stdout.write(`   Progress: ${i + 1}/${allAssets.length} assets (${progress}%) | ${dataInserted.toLocaleString()}/${totalRecords.toLocaleString()} records (${recordsProgress}%)\r`);
      }
    }
    
    console.log(`\n   ✅ Inserted ${dataInserted.toLocaleString()} historical data points\n`);

    // 7. Summary
    console.log('='.repeat(60));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(60));
    
    const assetCount = await pool.query('SELECT COUNT(*) FROM asset_info');
    const dataCount = await pool.query('SELECT COUNT(*) FROM asset_data');
    const stocksCount = await pool.query("SELECT COUNT(*) FROM asset_info WHERE type = 'stock'");
    const indicesCount = await pool.query("SELECT COUNT(*) FROM asset_info WHERE type = 'index'");
    const cryptosCount = await pool.query("SELECT COUNT(*) FROM asset_info WHERE type = 'crypto'");
    const commoditiesCount = await pool.query("SELECT COUNT(*) FROM asset_info WHERE type = 'commodity'");
    
    console.log(`Total Assets: ${assetCount.rows[0].count}`);
    console.log(`  - Stocks: ${stocksCount.rows[0].count}`);
    console.log(`  - Indices: ${indicesCount.rows[0].count}`);
    console.log(`  - Cryptocurrencies: ${cryptosCount.rows[0].count}`);
    console.log(`  - Commodities: ${commoditiesCount.rows[0].count}`);
    console.log(`Historical Data Points: ${dataCount.rows[0].count.toLocaleString()}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Population completed successfully!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Population failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run population
if (require.main === module) {
  populateStocksIndicesCrypto();
}

module.exports = { populateStocksIndicesCrypto };

