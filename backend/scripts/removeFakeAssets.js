/**
 * Remove Fake Assets Script
 * Removes mock/fake assets from the database, keeping only real assets
 * 
 * Fake assets are identified by:
 * - Names containing "Tech Company", "Finance Company", "Healthcare Company", etc.
 * - Names containing "ETF [0-9]" or similar patterns
 * - Names containing "CRYPTO[0-9]" or similar patterns
 * - Generated symbols that don't match real asset patterns
 */

const { pool } = require('../db');

// Patterns that identify fake assets
const FAKE_PATTERNS = [
  /Tech Company \d+/i,
  /Finance Company \d+/i,
  /Healthcare Company \d+/i,
  /Consumer Company \d+/i,
  /Industrial Company \d+/i,
  /Energy Company \d+/i,
  /ETF \d+/i,
  /^CRYPTO\d+/i,
  /^AI \d+ Inc\.?$/i,
  /^AI\d+$/i,
  /^AA\d+$/i,
  /^FN[A-Z]\d+$/i, // Finance generated symbols
  /^HC[A-Z]\d+$/i, // Healthcare generated symbols
  /^CS[A-Z]\d+$/i, // Consumer generated symbols
  /^IN[A-Z]\d+$/i, // Industrial generated symbols
  /^EN[A-Z]\d+$/i, // Energy generated symbols
  /^ETF[A-Z]\d+$/i, // ETF generated symbols
];

// Real asset names to keep (from assetGenerator.js)
const REAL_STOCK_NAMES = new Set([
  'Apple Inc.', 'Microsoft Corporation', 'Alphabet Inc.', 'Amazon.com Inc.',
  'Meta Platforms Inc.', 'NVIDIA Corporation', 'Tesla Inc.', 'Netflix Inc.',
  'Advanced Micro Devices Inc.', 'Intel Corporation', 'Salesforce Inc.',
  'Oracle Corporation', 'Adobe Inc.', 'Cisco Systems Inc.', 'Broadcom Inc.',
  'QUALCOMM Incorporated', 'Texas Instruments Incorporated', 'Applied Materials Inc.',
  'Lam Research Corporation', 'KLA Corporation', 'Synopsys Inc.',
  'Cadence Design Systems Inc.', 'ANSYS Inc.', 'Fortinet Inc.',
  'Palo Alto Networks Inc.', 'CrowdStrike Holdings Inc.', 'Zscaler Inc.',
  'Cloudflare Inc.', 'Datadog Inc.', 'DigitalOcean Holdings Inc.',
  'MongoDB Inc.', 'ServiceNow Inc.', 'Atlassian Corporation',
  'Zoom Video Communications Inc.', 'DocuSign Inc.', 'Coupa Software Incorporated',
  'Bill.com Holdings Inc.', 'Snowflake Inc.', 'Palantir Technologies Inc.',
  'Roblox Corporation', 'Unity Software Inc.', 'C3.ai Inc.', 'UiPath Inc.',
  'Asana Inc.', 'Freshworks Inc.', 'Okta Inc.', 'Splunk Inc.',
  'Varonis Systems Inc.', 'Qualys Inc.', 'Tenable Holdings Inc.', 'Radware Ltd.',
  'Workday Inc.', 'Veeva Systems Inc.', 'Paycom Software Inc.',
  'JPMorgan Chase & Co.', 'Bank of America Corp.', 'Wells Fargo & Company',
  'Citigroup Inc.', 'Goldman Sachs Group Inc.', 'Morgan Stanley',
  'BlackRock Inc.', 'Charles Schwab Corporation', 'Capital One Financial Corporation',
  'American Express Company', 'Visa Inc.', 'Mastercard Incorporated',
  'PayPal Holdings Inc.', 'Block Inc.', 'Fidelity National Information Services Inc.',
  'Fiserv Inc.', 'Automatic Data Processing Inc.', 'T. Rowe Price Group Inc.',
  'Franklin Resources Inc.', 'Invesco Ltd.', 'Robinhood Markets Inc.',
  'SoFi Technologies Inc.', 'LendingClub Corporation', 'Upstart Holdings Inc.',
  'Affirm Holdings Inc.', 'Nu Holdings Ltd.', 'Loews Corporation',
  'Allstate Corporation', 'Prudential Financial Inc.', 'MetLife Inc.',
  'American International Group Inc.', 'Travelers Companies Inc.', 'Chubb Limited',
  'Aflac Incorporated', 'Hartford Financial Services Group Inc.',
  'Principal Financial Group Inc.', 'Brown & Brown Inc.',
  'First American Financial Corporation', 'RLI Corp.', 'W.R. Berkley Corporation',
  'Johnson & Johnson', 'Pfizer Inc.', 'UnitedHealth Group Incorporated',
  'Abbott Laboratories', 'Thermo Fisher Scientific Inc.', 'AbbVie Inc.',
  'Merck & Co. Inc.', 'Bristol-Myers Squibb Company', 'Amgen Inc.',
  'Gilead Sciences Inc.', 'Regeneron Pharmaceuticals Inc.',
  'Vertex Pharmaceuticals Incorporated', 'Biogen Inc.', 'Illumina Inc.',
  'Moderna Inc.', 'BioNTech SE', 'Novavax Inc.', 'BioMarin Pharmaceutical Inc.',
  'Amicus Therapeutics Inc.', 'Alkermes plc', 'Alnylam Pharmaceuticals Inc.',
  'Arrowhead Pharmaceuticals Inc.', 'Beam Therapeutics Inc.', 'bluebird bio Inc.',
  'CRISPR Therapeutics AG', 'Editas Medicine Inc.', 'Fate Therapeutics Inc.',
  'Intellia Therapeutics Inc.', 'Danaher Corporation', 'Intuitive Surgical Inc.',
  'Stryker Corporation', 'Boston Scientific Corporation',
  'Zimmer Biomet Holdings Inc.', 'Edwards Lifesciences Corporation',
  'HCA Healthcare Inc.', 'Cigna Corporation', 'Humana Inc.',
  'Centene Corporation', 'Molina Healthcare Inc.', 'CVS Health Corporation',
  'Walgreens Boots Alliance Inc.', 'Walmart Inc.', 'Target Corporation',
  'Costco Wholesale Corporation', 'Home Depot Inc.', 'Lowe\'s Companies Inc.',
  'Nike Inc.', 'Starbucks Corporation', 'McDonald\'s Corporation',
  'Yum! Brands Inc.', 'Chipotle Mexican Grill Inc.', 'Domino\'s Pizza Inc.',
  'Wendy\'s Company', 'Jack in the Box Inc.', 'TJX Companies Inc.',
  'Ross Stores Inc.', 'Dollar General Corporation', 'Dollar Tree Inc.',
  'Five Below Inc.', 'Best Buy Co. Inc.', 'GameStop Corp.',
  'AMC Entertainment Holdings Inc.', 'RH', 'Williams-Sonoma Inc.',
  'Wayfair Inc.', 'Etsy Inc.', 'Shopify Inc.', 'MercadoLibre Inc.',
  'eBay Inc.', 'Overstock.com Inc.', 'Revolve Group Inc.', 'Farfetch Limited',
  'The RealReal Inc.', 'Pinterest Inc.', 'Snap Inc.', 'Roku Inc.',
  'Peloton Interactive Inc.', 'Exxon Mobil Corporation', 'Chevron Corporation',
  'ConocoPhillips', 'Schlumberger Limited', 'EOG Resources Inc.',
  'Marathon Petroleum Corporation', 'Valero Energy Corporation', 'Phillips 66',
  'Hess Corporation', 'Marathon Oil Corporation', 'Diamondback Energy Inc.',
  'Ovintiv Inc.', 'Coterra Energy Inc.', 'Matador Resources Company',
  'Range Resources Corporation', 'APA Corporation', 'Devon Energy Corporation',
  'Southwestern Energy Company', 'PDC Energy Inc.', 'SM Energy Company',
  'Gulfport Energy Corporation', 'Comstock Resources Inc.', 'Ring Energy Inc.',
  'Magnolia Oil & Gas Corporation', 'Vital Energy Inc.', 'NextDecade Corporation',
  'Occidental Petroleum Corporation', 'Halliburton Company', 'Baker Hughes Company',
  'NOV Inc.', 'TechnipFMC plc', 'Weatherford International plc',
]);

// Real ETF names to keep
const REAL_ETF_NAMES = new Set([
  'SPDR S&P 500 ETF Trust', 'Invesco QQQ Trust',
  'SPDR Dow Jones Industrial Average ETF Trust', 'iShares Russell 2000 ETF',
  'Vanguard Total Stock Market ETF', 'Vanguard S&P 500 ETF',
  'Vanguard FTSE Developed Markets ETF', 'Vanguard FTSE Emerging Markets ETF',
  'iShares Core U.S. Aggregate Bond ETF', 'Vanguard Total Bond Market ETF',
  'iShares 20+ Year Treasury Bond ETF', 'iShares 7-10 Year Treasury Bond ETF',
  'iShares 1-3 Year Treasury Bond ETF', 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
  'iShares iBoxx $ High Yield Corporate Bond ETF', 'iShares J.P. Morgan USD Emerging Markets Bond ETF',
  'iShares TIPS Bond ETF', 'Technology Select Sector SPDR Fund',
  'Financial Select Sector SPDR Fund', 'Health Care Select Sector SPDR Fund',
  'Energy Select Sector SPDR Fund', 'Industrial Select Sector SPDR Fund',
  'Consumer Staples Select Sector SPDR Fund', 'Consumer Discretionary Select Sector SPDR Fund',
  'Materials Select Sector SPDR Fund', 'Utilities Select Sector SPDR Fund',
  'Real Estate Select Sector SPDR Fund', 'Communication Services Select Sector SPDR Fund',
  'SPDR Gold Trust', 'iShares Silver Trust', 'VanEck Gold Miners ETF',
  'VanEck Junior Gold Miners ETF', 'ETFMG Prime Junior Silver Miners ETF',
  'iShares MSCI Japan ETF', 'iShares MSCI United Kingdom ETF',
  'iShares MSCI Canada ETF', 'iShares MSCI Germany ETF',
  'iShares MSCI Australia ETF', 'iShares MSCI Brazil ETF',
]);

// Real crypto names to keep (from CoinGecko)
const REAL_CRYPTO_NAMES = new Set([
  'Bitcoin', 'Ethereum', 'Binance Coin', 'Cardano', 'Solana', 'Ripple',
  'Polkadot', 'Dogecoin', 'Avalanche', 'Shiba Inu', 'Polygon', 'Uniswap',
  'Litecoin', 'Algorand', 'Cosmos', 'VeChain', 'Internet Computer',
  'Theta Network', 'Filecoin', 'Tron', 'Ethereum Classic', 'Stellar',
  'Aave', 'EOS', 'Maker', 'The Graph', 'Synthetix', 'Compound',
  'Yearn.finance', 'SushiSwap',
]);

function isFakeAsset(name, symbol) {
  if (!name) return true; // No name is suspicious
  
  // Check against real asset names
  if (REAL_STOCK_NAMES.has(name) || REAL_ETF_NAMES.has(name) || REAL_CRYPTO_NAMES.has(name)) {
    return false;
  }
  
  // Check if name matches fake patterns
  for (const pattern of FAKE_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Check for generated symbols (AA01, AI0, etc.)
  if (/^[A-Z]{2}\d+$/.test(symbol) && symbol.length <= 5) {
    // Could be real, but if name is generic, it's likely fake
    if (!name || name.length < 5 || /Company|Inc\.?|Corp\.?|Ltd\.?/.test(name) === false) {
      return true;
    }
  }
  
  // Check for very generic names
  if (name && name.length < 3) {
    return true;
  }
  
  return false;
}

async function removeFakeAssets() {
  try {
    console.log('🚀 Starting fake asset removal...\n');
    
    // 1. Find all fake assets
    console.log('1. Identifying fake assets...');
    const allAssets = await pool.query(`
      SELECT symbol, name, type, category 
      FROM asset_info
      ORDER BY symbol
    `);
    
    const fakeAssets = [];
    const realAssets = [];
    
    for (const asset of allAssets.rows) {
      if (isFakeAsset(asset.name, asset.symbol)) {
        fakeAssets.push(asset);
      } else {
        realAssets.push(asset);
      }
    }
    
    console.log(`   📊 Total assets: ${allAssets.rows.length}`);
    console.log(`   ✅ Real assets: ${realAssets.length}`);
    console.log(`   ❌ Fake assets: ${fakeAssets.length}\n`);
    
    if (fakeAssets.length === 0) {
      console.log('✅ No fake assets found. Database is clean!\n');
      await pool.end();
      process.exit(0);
    }
    
    // 2. Show preview of fake assets to be deleted
    console.log('2. Preview of fake assets to be deleted (first 20):');
    fakeAssets.slice(0, 20).forEach(asset => {
      console.log(`   - ${asset.symbol}: ${asset.name || '(no name)'}`);
    });
    if (fakeAssets.length > 20) {
      console.log(`   ... and ${fakeAssets.length - 20} more\n`);
    } else {
      console.log();
    }
    
    // 3. Delete price data for fake assets
    console.log('3. Deleting price data for fake assets...');
    const fakeSymbols = fakeAssets.map(a => a.symbol);
    
    if (fakeSymbols.length > 0) {
      // Delete in batches to avoid query size limits
      const batchSize = 100;
      let deletedRows = 0;
      
      for (let i = 0; i < fakeSymbols.length; i += batchSize) {
        const batch = fakeSymbols.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(', ');
        
        const deleteResult = await pool.query(
          `DELETE FROM asset_data WHERE symbol IN (${placeholders})`,
          batch
        );
        
        deletedRows += deleteResult.rowCount || 0;
        console.log(`   ✅ Deleted price data for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fakeSymbols.length / batchSize)}`);
      }
      
      console.log(`   ✅ Deleted ${deletedRows} price data rows\n`);
    }
    
    // 4. Delete fake assets from asset_info
    console.log('4. Deleting fake assets from asset_info...');
    if (fakeSymbols.length > 0) {
      const batchSize = 100;
      let deletedAssets = 0;
      
      for (let i = 0; i < fakeSymbols.length; i += batchSize) {
        const batch = fakeSymbols.slice(i, i + batchSize);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(', ');
        
        const deleteResult = await pool.query(
          `DELETE FROM asset_info WHERE symbol IN (${placeholders})`,
          batch
        );
        
        deletedAssets += deleteResult.rowCount || 0;
        console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fakeSymbols.length / batchSize)}`);
      }
      
      console.log(`   ✅ Deleted ${deletedAssets} fake assets\n`);
    }
    
    // 5. Summary
    console.log('='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Fake Assets Removed: ${fakeAssets.length}`);
    console.log(`Real Assets Remaining: ${realAssets.length}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Fake asset removal completed!\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing fake assets:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run cleanup
if (require.main === module) {
  removeFakeAssets();
}

module.exports = { removeFakeAssets, isFakeAsset };


