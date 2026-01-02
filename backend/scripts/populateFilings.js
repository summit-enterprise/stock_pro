/**
 * Populate Mock Filings Data
 * Generates and stores mock SEC filings for all stock assets
 * 
 * Run: node backend/scripts/populateFilings.js
 */

require('dotenv').config();
const { pool, initDb } = require('../db');
const filingsService = require('../mockservices/stocks/filingsService');

async function populateFilings() {
  try {
    console.log('🚀 Starting filings population...\n');

    // Initialize database
    await initDb();

    // Get all stock symbols from asset_info
    console.log('1. Fetching stock symbols from database...');
    const result = await pool.query(
      `SELECT symbol, name 
       FROM asset_info 
       WHERE type = 'stock' 
       ORDER BY symbol`
    );

    const stocks = result.rows;
    console.log(`   ✅ Found ${stocks.length} stocks\n`);

    if (stocks.length === 0) {
      console.log('⚠️  No stocks found. Please populate assets first.\n');
      await pool.end();
      process.exit(0);
    }

    // Generate and store filings for each stock
    console.log('2. Generating and storing mock filings...');
    let totalFilings = 0;
    let processed = 0;

    for (const stock of stocks) {
      try {
        // Generate mock filings
        const filings = filingsService.generateMockFilings(stock.symbol);
        
        // Store in database
        await filingsService.storeFilings(stock.symbol, filings);
        
        totalFilings += filings.length;
        processed++;

        if (processed % 100 === 0) {
          process.stdout.write(`   Progress: ${processed}/${stocks.length} stocks (${totalFilings} filings)\r`);
        }
      } catch (error) {
        console.error(`   ⚠️  Error processing ${stock.symbol}:`, error.message);
      }
    }

    console.log(`\n   ✅ Processed ${processed} stocks with ${totalFilings} total filings\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 FILINGS POPULATION SUMMARY');
    console.log('='.repeat(60));
    
    const filingsCount = await pool.query('SELECT COUNT(*) FROM filings');
    const uniqueSymbols = await pool.query('SELECT COUNT(DISTINCT symbol) FROM filings');
    const filingTypes = await pool.query(
      `SELECT filing_type, COUNT(*) as count 
       FROM filings 
       GROUP BY filing_type 
       ORDER BY count DESC`
    );
    
    console.log(`Total Filings: ${filingsCount.rows[0].count}`);
    console.log(`Unique Symbols: ${uniqueSymbols.rows[0].count}`);
    console.log('\nFiling Types:');
    filingTypes.rows.forEach(row => {
      console.log(`  - ${row.filing_type}: ${row.count}`);
    });
    console.log('='.repeat(60) + '\n');

    console.log('✅ Filings population completed successfully!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Filings population failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run population
if (require.main === module) {
  populateFilings();
}

module.exports = { populateFilings };



