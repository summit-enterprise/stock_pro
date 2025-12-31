/**
 * Master script to populate all database tables with mock data
 * Runs all populate scripts in the correct order
 * 
 * Run: node backend/scripts/populateAll.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');

const scriptsDir = __dirname;

async function runScript(scriptName, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${description}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    const scriptPath = path.join(scriptsDir, scriptName);
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      cwd: path.join(scriptsDir, '..'),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) console.error(stderr);
    
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${scriptName}:`, error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

async function populateAll() {
  console.log('\n🚀 Starting complete database population...\n');
  console.log('This will populate:');
  console.log('  - API providers and services');
  console.log('  - Assets (stocks, ETFs, commodities)');
  console.log('  - Indices (S&P 500, Dow, etc.)');
  console.log('  - Cryptocurrencies');
  console.log('  - Historical price data');
  console.log('  - Dividends');
  console.log('  - Filings');
  console.log('\n⏳ This may take several minutes...\n');

  const results = {
    apis: false,
    assets: false,
    indices: false,
    cryptos: false,
    dividends: false,
    filings: false,
    tickets: false,
  };

  // 1. Populate APIs and Services (required for tracking)
  results.apis = await runScript('populate-apis-and-services.js', 'Populating API Providers and Services');

  // 2. Populate Stocks, Indices, Crypto, Commodities (2000 stocks + indices + crypto + commodities with 3 years of data)
  // Note: This script already includes indices, cryptos, and commodities, so we skip separate scripts
  results.assets = await runScript('populateStocksIndicesCrypto.js', 'Populating Stocks, Indices, Crypto & Commodities (2000 stocks + indices + crypto + commodities with 3 years of data)');

  // Note: Indices and cryptos are already included in populateStocksIndicesCrypto.js
  // Uncomment below if you want to add additional historical data (10 years) for indices separately
  // results.indices = await runScript('populateIndices.js', 'Populating Indices (10 years of data)');
  
  // Note: Cryptos are already included in populateStocksIndicesCrypto.js (top 100)
  // Uncomment below if you want to add more cryptos or additional historical data
  // results.cryptos = await runScript('populateCryptos.js', 'Populating Cryptocurrencies');
  
  // Mark as successful since they're included in the main script
  results.indices = true;
  results.cryptos = true;

  // 5. Populate Dividends
  results.dividends = await runScript('populateDividends.js', 'Populating Dividend Data');

  // 6. Populate Filings
  results.filings = await runScript('populateFilings.js', 'Populating Filings Data');

  // 7. Populate Mock Tickets (optional, for testing support system)
  try {
    const { populateMockTickets } = require('./populateMockTickets');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Populating Mock Support Tickets`);
    console.log(`${'='.repeat(60)}\n`);
    await populateMockTickets();
    results.tickets = true;
  } catch (error) {
    console.error('❌ Error populating mock tickets:', error.message);
    results.tickets = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Population Summary');
  console.log('='.repeat(60));
  console.log(`API Providers & Services: ${results.apis ? '✅' : '❌'}`);
  console.log(`Assets: ${results.assets ? '✅' : '❌'}`);
  console.log(`Indices: ${results.indices ? '✅' : '❌'}`);
  console.log(`Cryptocurrencies: ${results.cryptos ? '✅' : '❌'}`);
  console.log(`Dividends: ${results.dividends ? '✅' : '❌'}`);
  console.log(`Filings: ${results.filings ? '✅' : '❌'}`);
  console.log(`Support Tickets: ${results.tickets ? '✅' : '❌'}`);
  console.log('='.repeat(60));

  const allSuccess = Object.values(results).every(r => r);
  
  if (allSuccess) {
    console.log('\n✅ All data populated successfully!');
    console.log('🎉 Your database is now ready to use.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some scripts failed. Check the errors above.');
    console.log('You can run individual scripts to retry failed operations.\n');
    process.exit(1);
  }
}

// Run the population
populateAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

