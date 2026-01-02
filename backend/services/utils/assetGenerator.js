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

  // === STOCKS (900 assets - 200 real + 700 existing) ===
  
  // 200 Real Stocks with proper names
  const realStocks = [
    // Tech (50)
    { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' }, { symbol: 'GOOG', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' }, { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' }, { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' }, { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
    { symbol: 'INTC', name: 'Intel Corporation' }, { symbol: 'CRM', name: 'Salesforce Inc.' },
    { symbol: 'ORCL', name: 'Oracle Corporation' }, { symbol: 'ADBE', name: 'Adobe Inc.' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.' }, { symbol: 'AVGO', name: 'Broadcom Inc.' },
    { symbol: 'QCOM', name: 'QUALCOMM Incorporated' }, { symbol: 'TXN', name: 'Texas Instruments Incorporated' },
    { symbol: 'AMAT', name: 'Applied Materials Inc.' }, { symbol: 'LRCX', name: 'Lam Research Corporation' },
    { symbol: 'KLAC', name: 'KLA Corporation' }, { symbol: 'SNPS', name: 'Synopsys Inc.' },
    { symbol: 'CDNS', name: 'Cadence Design Systems Inc.' }, { symbol: 'ANSS', name: 'ANSYS Inc.' },
    { symbol: 'FTNT', name: 'Fortinet Inc.' }, { symbol: 'PANW', name: 'Palo Alto Networks Inc.' },
    { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.' }, { symbol: 'ZS', name: 'Zscaler Inc.' },
    { symbol: 'NET', name: 'Cloudflare Inc.' }, { symbol: 'DDOG', name: 'Datadog Inc.' },
    { symbol: 'DOCN', name: 'DigitalOcean Holdings Inc.' }, { symbol: 'MDB', name: 'MongoDB Inc.' },
    { symbol: 'NOW', name: 'ServiceNow Inc.' }, { symbol: 'TEAM', name: 'Atlassian Corporation' },
    { symbol: 'ZM', name: 'Zoom Video Communications Inc.' }, { symbol: 'DOCU', name: 'DocuSign Inc.' },
    { symbol: 'COUP', name: 'Coupa Software Incorporated' }, { symbol: 'BILL', name: 'Bill.com Holdings Inc.' },
    { symbol: 'SNOW', name: 'Snowflake Inc.' }, { symbol: 'PLTR', name: 'Palantir Technologies Inc.' },
    { symbol: 'RBLX', name: 'Roblox Corporation' }, { symbol: 'U', name: 'Unity Software Inc.' },
    { symbol: 'AI', name: 'C3.ai Inc.' }, { symbol: 'PATH', name: 'UiPath Inc.' },
    { symbol: 'ASAN', name: 'Asana Inc.' }, { symbol: 'FRSH', name: 'Freshworks Inc.' },
    { symbol: 'OKTA', name: 'Okta Inc.' }, { symbol: 'SPLK', name: 'Splunk Inc.' },
    { symbol: 'VRNS', name: 'Varonis Systems Inc.' }, { symbol: 'QLYS', name: 'Qualys Inc.' },
    { symbol: 'TENB', name: 'Tenable Holdings Inc.' }, { symbol: 'RDWR', name: 'Radware Ltd.' },
    { symbol: 'WDAY', name: 'Workday Inc.' }, { symbol: 'VEEV', name: 'Veeva Systems Inc.' },
    { symbol: 'PAYC', name: 'Paycom Software Inc.' },
    // Finance (40)
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' }, { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'WFC', name: 'Wells Fargo & Company' }, { symbol: 'C', name: 'Citigroup Inc.' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.' }, { symbol: 'MS', name: 'Morgan Stanley' },
    { symbol: 'BLK', name: 'BlackRock Inc.' }, { symbol: 'SCHW', name: 'Charles Schwab Corporation' },
    { symbol: 'COF', name: 'Capital One Financial Corporation' }, { symbol: 'AXP', name: 'American Express Company' },
    { symbol: 'V', name: 'Visa Inc.' }, { symbol: 'MA', name: 'Mastercard Incorporated' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.' }, { symbol: 'SQ', name: 'Block Inc.' },
    { symbol: 'FIS', name: 'Fidelity National Information Services Inc.' }, { symbol: 'FISV', name: 'Fiserv Inc.' },
    { symbol: 'ADP', name: 'Automatic Data Processing Inc.' }, { symbol: 'TROW', name: 'T. Rowe Price Group Inc.' },
    { symbol: 'BEN', name: 'Franklin Resources Inc.' }, { symbol: 'IVZ', name: 'Invesco Ltd.' },
    { symbol: 'HOOD', name: 'Robinhood Markets Inc.' }, { symbol: 'SOFI', name: 'SoFi Technologies Inc.' },
    { symbol: 'LC', name: 'LendingClub Corporation' }, { symbol: 'UPST', name: 'Upstart Holdings Inc.' },
    { symbol: 'AFRM', name: 'Affirm Holdings Inc.' }, { symbol: 'NU', name: 'Nu Holdings Ltd.' },
    { symbol: 'L', name: 'Loews Corporation' }, { symbol: 'ALL', name: 'Allstate Corporation' },
    { symbol: 'PRU', name: 'Prudential Financial Inc.' }, { symbol: 'MET', name: 'MetLife Inc.' },
    { symbol: 'AIG', name: 'American International Group Inc.' }, { symbol: 'TRV', name: 'Travelers Companies Inc.' },
    { symbol: 'CB', name: 'Chubb Limited' }, { symbol: 'AFL', name: 'Aflac Incorporated' },
    { symbol: 'HIG', name: 'Hartford Financial Services Group Inc.' }, { symbol: 'PFG', name: 'Principal Financial Group Inc.' },
    { symbol: 'BRO', name: 'Brown & Brown Inc.' }, { symbol: 'FAF', name: 'First American Financial Corporation' },
    { symbol: 'RLI', name: 'RLI Corp.' }, { symbol: 'WRB', name: 'W.R. Berkley Corporation' },
    // Healthcare (40)
    { symbol: 'JNJ', name: 'Johnson & Johnson' }, { symbol: 'PFE', name: 'Pfizer Inc.' },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated' }, { symbol: 'ABT', name: 'Abbott Laboratories' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.' }, { symbol: 'ABBV', name: 'AbbVie Inc.' },
    { symbol: 'MRK', name: 'Merck & Co. Inc.' }, { symbol: 'BMY', name: 'Bristol-Myers Squibb Company' },
    { symbol: 'AMGN', name: 'Amgen Inc.' }, { symbol: 'GILD', name: 'Gilead Sciences Inc.' },
    { symbol: 'REGN', name: 'Regeneron Pharmaceuticals Inc.' }, { symbol: 'VRTX', name: 'Vertex Pharmaceuticals Incorporated' },
    { symbol: 'BIIB', name: 'Biogen Inc.' }, { symbol: 'ILMN', name: 'Illumina Inc.' },
    { symbol: 'MRNA', name: 'Moderna Inc.' }, { symbol: 'BNTX', name: 'BioNTech SE' },
    { symbol: 'NVAX', name: 'Novavax Inc.' }, { symbol: 'BMRN', name: 'BioMarin Pharmaceutical Inc.' },
    { symbol: 'FOLD', name: 'Amicus Therapeutics Inc.' }, { symbol: 'ALKS', name: 'Alkermes plc' },
    { symbol: 'ALNY', name: 'Alnylam Pharmaceuticals Inc.' }, { symbol: 'ARWR', name: 'Arrowhead Pharmaceuticals Inc.' },
    { symbol: 'BEAM', name: 'Beam Therapeutics Inc.' }, { symbol: 'BLUE', name: 'bluebird bio Inc.' },
    { symbol: 'CRSP', name: 'CRISPR Therapeutics AG' }, { symbol: 'EDIT', name: 'Editas Medicine Inc.' },
    { symbol: 'FATE', name: 'Fate Therapeutics Inc.' }, { symbol: 'NTLA', name: 'Intellia Therapeutics Inc.' },
    { symbol: 'DHR', name: 'Danaher Corporation' }, { symbol: 'ISRG', name: 'Intuitive Surgical Inc.' },
    { symbol: 'SYK', name: 'Stryker Corporation' }, { symbol: 'BSX', name: 'Boston Scientific Corporation' },
    { symbol: 'ZBH', name: 'Zimmer Biomet Holdings Inc.' }, { symbol: 'EW', name: 'Edwards Lifesciences Corporation' },
    { symbol: 'HCA', name: 'HCA Healthcare Inc.' }, { symbol: 'CI', name: 'Cigna Corporation' },
    { symbol: 'HUM', name: 'Humana Inc.' }, { symbol: 'CNC', name: 'Centene Corporation' },
    { symbol: 'MOH', name: 'Molina Healthcare Inc.' }, { symbol: 'CVS', name: 'CVS Health Corporation' },
    { symbol: 'WBA', name: 'Walgreens Boots Alliance Inc.' },
    // Consumer (40)
    { symbol: 'WMT', name: 'Walmart Inc.' }, { symbol: 'TGT', name: 'Target Corporation' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation' }, { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'LOW', name: 'Lowe\'s Companies Inc.' }, { symbol: 'NKE', name: 'Nike Inc.' },
    { symbol: 'SBUX', name: 'Starbucks Corporation' }, { symbol: 'MCD', name: 'McDonald\'s Corporation' },
    { symbol: 'YUM', name: 'Yum! Brands Inc.' }, { symbol: 'CMG', name: 'Chipotle Mexican Grill Inc.' },
    { symbol: 'DPZ', name: 'Domino\'s Pizza Inc.' }, { symbol: 'WEN', name: 'Wendy\'s Company' },
    { symbol: 'JACK', name: 'Jack in the Box Inc.' }, { symbol: 'TJX', name: 'TJX Companies Inc.' },
    { symbol: 'ROST', name: 'Ross Stores Inc.' }, { symbol: 'DG', name: 'Dollar General Corporation' },
    { symbol: 'DLTR', name: 'Dollar Tree Inc.' }, { symbol: 'FIVE', name: 'Five Below Inc.' },
    { symbol: 'BBY', name: 'Best Buy Co. Inc.' }, { symbol: 'GME', name: 'GameStop Corp.' },
    { symbol: 'AMC', name: 'AMC Entertainment Holdings Inc.' }, { symbol: 'RH', name: 'RH' },
    { symbol: 'WSM', name: 'Williams-Sonoma Inc.' }, { symbol: 'W', name: 'Wayfair Inc.' },
    { symbol: 'ETSY', name: 'Etsy Inc.' }, { symbol: 'SHOP', name: 'Shopify Inc.' },
    { symbol: 'MELI', name: 'MercadoLibre Inc.' }, { symbol: 'EBAY', name: 'eBay Inc.' },
    { symbol: 'OSTK', name: 'Overstock.com Inc.' }, { symbol: 'RVLV', name: 'Revolve Group Inc.' },
    { symbol: 'FTCH', name: 'Farfetch Limited' }, { symbol: 'REAL', name: 'The RealReal Inc.' },
    { symbol: 'PINS', name: 'Pinterest Inc.' }, { symbol: 'SNAP', name: 'Snap Inc.' },
    { symbol: 'ROKU', name: 'Roku Inc.' }, { symbol: 'PTON', name: 'Peloton Interactive Inc.' },
    // Energy (30)
    { symbol: 'XOM', name: 'Exxon Mobil Corporation' }, { symbol: 'CVX', name: 'Chevron Corporation' },
    { symbol: 'COP', name: 'ConocoPhillips' }, { symbol: 'SLB', name: 'Schlumberger Limited' },
    { symbol: 'EOG', name: 'EOG Resources Inc.' }, { symbol: 'MPC', name: 'Marathon Petroleum Corporation' },
    { symbol: 'VLO', name: 'Valero Energy Corporation' }, { symbol: 'PSX', name: 'Phillips 66' },
    { symbol: 'HES', name: 'Hess Corporation' }, { symbol: 'MRO', name: 'Marathon Oil Corporation' },
    { symbol: 'FANG', name: 'Diamondback Energy Inc.' }, { symbol: 'OVV', name: 'Ovintiv Inc.' },
    { symbol: 'CTRA', name: 'Coterra Energy Inc.' }, { symbol: 'MTDR', name: 'Matador Resources Company' },
    { symbol: 'RRC', name: 'Range Resources Corporation' }, { symbol: 'APA', name: 'APA Corporation' },
    { symbol: 'DVN', name: 'Devon Energy Corporation' }, { symbol: 'SWN', name: 'Southwestern Energy Company' },
    { symbol: 'PDC', name: 'PDC Energy Inc.' }, { symbol: 'SM', name: 'SM Energy Company' },
    { symbol: 'GPOR', name: 'Gulfport Energy Corporation' }, { symbol: 'CRK', name: 'Comstock Resources Inc.' },
    { symbol: 'REI', name: 'Ring Energy Inc.' }, { symbol: 'MGY', name: 'Magnolia Oil & Gas Corporation' },
    { symbol: 'VTLE', name: 'Vital Energy Inc.' }, { symbol: 'NEXT', name: 'NextDecade Corporation' },
    { symbol: 'OXY', name: 'Occidental Petroleum Corporation' }, { symbol: 'HAL', name: 'Halliburton Company' },
    { symbol: 'BKR', name: 'Baker Hughes Company' }, { symbol: 'NOV', name: 'NOV Inc.' },
    { symbol: 'FTI', name: 'TechnipFMC plc' }, { symbol: 'WFT', name: 'Weatherford International plc' },
  ];
  
  // Add 200 real stocks first
  for (let i = 0; i < realStocks.length && i < 200; i++) {
    assets.push({
      symbol: realStocks[i].symbol,
      name: realStocks[i].name,
      type: 'stock',
      exchange: i < 100 ? 'NasdaqGS' : 'NYSE',
      basePrice: 10 + Math.random() * 500,
    });
  }
  
  // Continue with existing stock generation logic for remaining stocks
  // Tech Stocks (190 more) - Generate unique symbols
  for (let i = 0; i < 190; i++) {
    const prefix = String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
    assets.push({
      symbol: generateSymbol(prefix, Math.floor(i / 26)),
      name: `Tech Company ${i}`,
      type: 'stock',
      exchange: i % 2 === 0 ? 'NasdaqGS' : 'NYSE',
      basePrice: 50 + Math.random() * 450,
    });
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

  // === ETFs (343 ETFs - 200 real + 143 existing) ===
  const majorETFs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND',
                     'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'JNK', 'EMB', 'TIP', 'XLK', 'XLF',
                     'XLV', 'XLE', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE', 'XLC', 'GLD',
                     'SLV', 'GDX', 'GDXJ', 'SIL', 'EWJ', 'EWU', 'EWC', 'EWG', 'EWA', 'EWZ'];
  
  // Additional 200 real ETFs with proper names
  const additionalRealETFs = [
    // Vanguard ETFs
    { symbol: 'VUG', name: 'Vanguard Growth ETF' }, { symbol: 'VTV', name: 'Vanguard Value ETF' },
    { symbol: 'VXF', name: 'Vanguard Extended Market ETF' }, { symbol: 'VB', name: 'Vanguard Small-Cap ETF' },
    { symbol: 'VO', name: 'Vanguard Mid-Cap ETF' }, { symbol: 'VTHR', name: 'Vanguard Russell 3000 ETF' },
    { symbol: 'VONE', name: 'Vanguard Russell 1000 ETF' }, { symbol: 'VTWO', name: 'Vanguard Russell 2000 ETF' },
    { symbol: 'VBR', name: 'Vanguard Small-Cap Value ETF' }, { symbol: 'VOT', name: 'Vanguard Mid-Cap Growth ETF' },
    { symbol: 'VOE', name: 'Vanguard Mid-Cap Value ETF' }, { symbol: 'VBK', name: 'Vanguard Small-Cap Growth ETF' },
    { symbol: 'VGT', name: 'Vanguard Information Technology ETF' }, { symbol: 'VFH', name: 'Vanguard Financials ETF' },
    { symbol: 'VHT', name: 'Vanguard Health Care ETF' }, { symbol: 'VIS', name: 'Vanguard Industrials ETF' },
    { symbol: 'VDE', name: 'Vanguard Energy ETF' }, { symbol: 'VPU', name: 'Vanguard Utilities ETF' },
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF' }, { symbol: 'VAW', name: 'Vanguard Materials ETF' },
    { symbol: 'VCR', name: 'Vanguard Consumer Discretionary ETF' }, { symbol: 'VDC', name: 'Vanguard Consumer Staples ETF' },
    { symbol: 'VCSH', name: 'Vanguard Short-Term Corporate Bond ETF' }, { symbol: 'VCIT', name: 'Vanguard Intermediate-Term Corporate Bond ETF' },
    { symbol: 'VCLT', name: 'Vanguard Long-Term Corporate Bond ETF' }, { symbol: 'VGIT', name: 'Vanguard Intermediate-Term Treasury ETF' },
    { symbol: 'VGLT', name: 'Vanguard Long-Term Treasury ETF' }, { symbol: 'VGSH', name: 'Vanguard Short-Term Treasury ETF' },
    // iShares ETFs
    { symbol: 'IVV', name: 'iShares Core S&P 500 ETF' }, { symbol: 'IJH', name: 'iShares Core S&P Mid-Cap ETF' },
    { symbol: 'IJR', name: 'iShares Core S&P Small-Cap ETF' }, { symbol: 'ITOT', name: 'iShares Core S&P Total U.S. Stock Market ETF' },
    { symbol: 'IWF', name: 'iShares Russell 1000 Growth ETF' }, { symbol: 'IWD', name: 'iShares Russell 1000 Value ETF' },
    { symbol: 'IWO', name: 'iShares Russell 2000 Growth ETF' }, { symbol: 'IWN', name: 'iShares Russell 2000 Value ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF' }, { symbol: 'IWB', name: 'iShares Russell 1000 ETF' },
    { symbol: 'IWR', name: 'iShares Russell Mid-Cap ETF' }, { symbol: 'IWS', name: 'iShares Russell Mid-Cap Value ETF' },
    { symbol: 'IWP', name: 'iShares Russell Mid-Cap Growth ETF' }, { symbol: 'IWC', name: 'iShares Micro-Cap ETF' },
    { symbol: 'IUSG', name: 'iShares Core S&P U.S. Growth ETF' }, { symbol: 'IUSV', name: 'iShares Core S&P U.S. Value ETF' },
    { symbol: 'IYW', name: 'iShares U.S. Technology ETF' }, { symbol: 'IYF', name: 'iShares U.S. Financials ETF' },
    { symbol: 'IYH', name: 'iShares U.S. Healthcare ETF' }, { symbol: 'IYJ', name: 'iShares U.S. Industrials ETF' },
    { symbol: 'IYE', name: 'iShares U.S. Energy ETF' }, { symbol: 'IDU', name: 'iShares U.S. Utilities ETF' },
    { symbol: 'IYR', name: 'iShares U.S. Real Estate ETF' }, { symbol: 'IYM', name: 'iShares U.S. Basic Materials ETF' },
    { symbol: 'IYC', name: 'iShares U.S. Consumer Discretionary ETF' }, { symbol: 'IYK', name: 'iShares U.S. Consumer Staples ETF' },
    { symbol: 'IGSB', name: 'iShares Short-Term Corporate Bond ETF' }, { symbol: 'IG', name: 'iShares Intermediate-Term Corporate Bond ETF' },
    { symbol: 'IGIB', name: 'iShares Intermediate-Term Corporate Bond ETF' }, { symbol: 'IGLB', name: 'iShares Long-Term Corporate Bond ETF' },
    { symbol: 'IGSB', name: 'iShares Short-Term Corporate Bond ETF' }, { symbol: 'SHV', name: 'iShares Short Treasury Bond ETF' },
    { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF' }, { symbol: 'IEI', name: 'iShares 3-7 Year Treasury Bond ETF' },
    { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF' }, { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
    // SPDR ETFs
    { symbol: 'SPYG', name: 'SPDR Portfolio S&P 500 Growth ETF' }, { symbol: 'SPYV', name: 'SPDR Portfolio S&P 500 Value ETF' },
    { symbol: 'SPMD', name: 'SPDR Portfolio S&P 400 Mid Cap ETF' }, { symbol: 'SPSM', name: 'SPDR Portfolio S&P 600 Small Cap ETF' },
    { symbol: 'SPTM', name: 'SPDR Portfolio S&P 1500 Composite Stock Market ETF' }, { symbol: 'SPDW', name: 'SPDR Portfolio Developed World ex-US ETF' },
    { symbol: 'SPEM', name: 'SPDR Portfolio Emerging Markets ETF' }, { symbol: 'SPTS', name: 'SPDR Portfolio Short Term Treasury ETF' },
    { symbol: 'SPTI', name: 'SPDR Portfolio Intermediate Term Treasury ETF' }, { symbol: 'SPTL', name: 'SPDR Portfolio Long Term Treasury ETF' },
    // Invesco ETFs
    { symbol: 'IVW', name: 'iShares S&P 500 Growth ETF' }, { symbol: 'IVE', name: 'iShares S&P 500 Value ETF' },
    { symbol: 'IJJ', name: 'iShares S&P Mid-Cap 400 Value ETF' }, { symbol: 'IJK', name: 'iShares S&P Mid-Cap 400 Growth ETF' },
    { symbol: 'IJS', name: 'iShares S&P Small-Cap 600 Value ETF' }, { symbol: 'IJT', name: 'iShares S&P Small-Cap 600 Growth ETF' },
    { symbol: 'PGJ', name: 'Invesco Golden Dragon China ETF' }, { symbol: 'PJP', name: 'Invesco Dynamic Pharmaceuticals ETF' },
    { symbol: 'PKB', name: 'Invesco Dynamic Building & Construction ETF' }, { symbol: 'PBE', name: 'Invesco Dynamic Biotechnology & Genome ETF' },
    { symbol: 'PBS', name: 'Invesco Dynamic Media ETF' }, { symbol: 'PWC', name: 'Invesco Dynamic Market ETF' },
    { symbol: 'PZI', name: 'Invesco Zacks Mid-Cap ETF' }, { symbol: 'PWV', name: 'Invesco Dynamic Large Cap Value ETF' },
    { symbol: 'PWO', name: 'Invesco Dynamic Large Cap Growth ETF' }, { symbol: 'PXH', name: 'Invesco FTSE RAFI Emerging Markets ETF' },
    { symbol: 'PXE', name: 'Invesco Dynamic Energy Exploration & Production ETF' }, { symbol: 'PXI', name: 'Invesco DWA Energy Momentum ETF' },
    { symbol: 'PXJ', name: 'Invesco Dynamic Oil & Gas Services ETF' }, { symbol: 'PXN', name: 'Invesco Dynamic Networking ETF' },
    { symbol: 'PXQ', name: 'Invesco Dynamic Networking ETF' }, { symbol: 'PXZ', name: 'Invesco FTSE RAFI Developed Markets ex-U.S. ETF' },
    // ARK ETFs
    { symbol: 'ARKK', name: 'ARK Innovation ETF' }, { symbol: 'ARKQ', name: 'ARK Autonomous Technology & Robotics ETF' },
    { symbol: 'ARKW', name: 'ARK Next Generation Internet ETF' }, { symbol: 'ARKG', name: 'ARK Genomic Revolution ETF' },
    { symbol: 'ARKF', name: 'ARK Fintech Innovation ETF' }, { symbol: 'PRNT', name: '3D Printing ETF' },
    // Sector-specific ETFs
    { symbol: 'XRT', name: 'SPDR S&P Retail ETF' }, { symbol: 'XHB', name: 'SPDR S&P Homebuilders ETF' },
    { symbol: 'XOP', name: 'SPDR S&P Oil & Gas Exploration & Production ETF' }, { symbol: 'XES', name: 'SPDR S&P Oil & Gas Equipment & Services ETF' },
    { symbol: 'XME', name: 'SPDR S&P Metals & Mining ETF' }, { symbol: 'XPH', name: 'SPDR S&P Pharmaceuticals ETF' },
    { symbol: 'XBI', name: 'SPDR S&P Biotech ETF' }, { symbol: 'XHS', name: 'SPDR S&P Health Care Services ETF' },
    { symbol: 'XSW', name: 'SPDR S&P Software & Services ETF' }, { symbol: 'XSD', name: 'SPDR S&P Semiconductor ETF' },
    { symbol: 'XWEB', name: 'SPDR S&P Internet ETF' }, { symbol: 'XITK', name: 'SPDR FactSet Innovative Technology ETF' },
    { symbol: 'XHE', name: 'SPDR S&P Health Care Equipment ETF' }, { symbol: 'XAR', name: 'SPDR S&P Aerospace & Defense ETF' },
    { symbol: 'XTL', name: 'SPDR S&P Telecom ETF' }, { symbol: 'XES', name: 'SPDR S&P Oil & Gas Equipment & Services ETF' },
    // International ETFs
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF' }, { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF' },
    { symbol: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF' }, { symbol: 'IXUS', name: 'iShares Core MSCI Total International Stock ETF' },
    { symbol: 'ACWI', name: 'iShares MSCI ACWI ETF' }, { symbol: 'ACWX', name: 'iShares MSCI ACWI ex U.S. ETF' },
    { symbol: 'VEU', name: 'Vanguard FTSE All-World ex-US ETF' }, { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF' },
    { symbol: 'VGK', name: 'Vanguard FTSE Europe ETF' }, { symbol: 'VPL', name: 'Vanguard FTSE Pacific ETF' },
    { symbol: 'VSS', name: 'Vanguard FTSE All-World ex-US Small-Cap ETF' }, { symbol: 'VYMI', name: 'Vanguard International High Dividend Yield ETF' },
    { symbol: 'SCHF', name: 'Schwab International Equity ETF' }, { symbol: 'SCHY', name: 'Schwab International Dividend Equity ETF' },
    { symbol: 'SCHE', name: 'Schwab Emerging Markets Equity ETF' }, { symbol: 'SCHC', name: 'Schwab International Small-Cap Equity ETF' },
    // Dividend ETFs
    { symbol: 'DVY', name: 'iShares Select Dividend ETF' }, { symbol: 'VYM', name: 'Vanguard High Dividend Yield ETF' },
    { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF' }, { symbol: 'HDV', name: 'iShares Core High Dividend ETF' },
    { symbol: 'DGRO', name: 'iShares Core Dividend Growth ETF' }, { symbol: 'NOBL', name: 'ProShares S&P 500 Dividend Aristocrats ETF' },
    { symbol: 'SPHD', name: 'Invesco S&P 500 High Dividend Low Volatility ETF' }, { symbol: 'SPYD', name: 'SPDR Portfolio S&P 500 High Dividend ETF' },
    { symbol: 'FDL', name: 'First Trust Morningstar Dividend Leaders Index Fund' }, { symbol: 'RDVY', name: 'First Trust Rising Dividend Achievers ETF' },
    // Growth/Value ETFs
    { symbol: 'MGK', name: 'Vanguard Mega Cap Growth ETF' }, { symbol: 'MGV', name: 'Vanguard Mega Cap Value ETF' },
    { symbol: 'VUG', name: 'Vanguard Growth ETF' }, { symbol: 'VTV', name: 'Vanguard Value ETF' },
    { symbol: 'IWF', name: 'iShares Russell 1000 Growth ETF' }, { symbol: 'IWD', name: 'iShares Russell 1000 Value ETF' },
    { symbol: 'IWO', name: 'iShares Russell 2000 Growth ETF' }, { symbol: 'IWN', name: 'iShares Russell 2000 Value ETF' },
    { symbol: 'SPYG', name: 'SPDR Portfolio S&P 500 Growth ETF' }, { symbol: 'SPYV', name: 'SPDR Portfolio S&P 500 Value ETF' },
    // Bond ETFs
    { symbol: 'BNDX', name: 'Vanguard Total International Bond ETF' }, { symbol: 'BNDW', name: 'Vanguard Total World Bond ETF' },
    { symbol: 'BWX', name: 'SPDR Bloomberg International Treasury Bond ETF' }, { symbol: 'WIP', name: 'SPDR Bloomberg International Treasury Inflation Protected Bond ETF' },
    { symbol: 'CWB', name: 'SPDR Bloomberg Convertible Securities ETF' }, { symbol: 'JNK', name: 'SPDR Bloomberg High Yield Bond ETF' },
    { symbol: 'HYG', name: 'iShares iBoxx $ High Yield Corporate Bond ETF' }, { symbol: 'SJNK', name: 'SPDR Bloomberg Short Term High Yield Bond ETF' },
    { symbol: 'SHYG', name: 'iShares 0-5 Year High Yield Corporate Bond ETF' }, { symbol: 'HYMB', name: 'SPDR Nuveen Bloomberg High Yield Municipal Bond ETF' },
    // Commodity ETFs
    { symbol: 'DBA', name: 'Invesco DB Agriculture Fund' }, { symbol: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund' },
    { symbol: 'DBE', name: 'Invesco DB Energy Fund' }, { symbol: 'DJP', name: 'iPath Bloomberg Commodity Index Total Return ETN' },
    { symbol: 'GSG', name: 'iShares S&P GSCI Commodity-Indexed Trust' }, { symbol: 'PDBC', name: 'Invesco Optimum Yield Diversified Commodity Strategy No K-1 ETF' },
    { symbol: 'BCI', name: 'abrdn Bloomberg All Commodity Longer Dated Strategy K-1 Free ETF' }, { symbol: 'COMT', name: 'iShares GSCI Commodity Dynamic Roll Strategy ETF' },
    // REIT ETFs
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF' }, { symbol: 'SCHH', name: 'Schwab U.S. REIT ETF' },
    { symbol: 'RWR', name: 'SPDR Dow Jones REIT ETF' }, { symbol: 'IYR', name: 'iShares U.S. Real Estate ETF' },
    { symbol: 'USRT', name: 'iShares Core U.S. REIT ETF' }, { symbol: 'VNQI', name: 'Vanguard Global ex-U.S. Real Estate ETF' },
    { symbol: 'RWX', name: 'SPDR Dow Jones International Real Estate ETF' }, { symbol: 'WPS', name: 'iShares International Developed Property ETF' },
  ];
  
  // Combine all ETFs (40 existing + 200 new = 240 total, but we'll use 343 to match original count)
  const allETFs = [...majorETFs.map(s => ({ symbol: s, name: `${s} ETF` })), ...additionalRealETFs];
  
  for (let i = 0; i < 343; i++) {
    if (i < allETFs.length) {
      assets.push({
        symbol: allETFs[i].symbol,
        name: allETFs[i].name,
        type: 'etf',
        exchange: 'NYSE',
        basePrice: 30 + Math.random() * 450,
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
