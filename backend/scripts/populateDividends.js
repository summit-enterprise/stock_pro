/**
 * Populate dividends for all equities in the database
 * Fetches dividend data from Polygon.io API and stores in PostgreSQL
 * 
 * Run: node backend/scripts/populateDividends.js
 */

require('dotenv').config();
const { pool } = require('../db');
const dividendService = require('../services/stocks/dividendService');

async function populateDividends() {
  try {
    console.log('🚀 Starting dividend population...\n');

    // Get all equity symbols from asset_info
    const result = await pool.query(
      `SELECT symbol FROM asset_info 
       WHERE type = 'stock' OR type = 'CS' OR type = 'ETF'
       ORDER BY symbol`
    );

    const symbols = result.rows.map(row => row.symbol);
    console.log(`Found ${symbols.length} equities to process\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            console.log(`Processing ${symbol}...`);
            
            // Fetch and sync dividends
            const dividends = await dividendService.fetchAndSyncDividends(symbol);
            
            if (dividends.length > 0) {
              console.log(`  ✅ ${symbol}: ${dividends.length} dividends`);
              successCount++;
            } else {
              console.log(`  ⚠️  ${symbol}: No dividends found`);
              skippedCount++;
            }

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`  ❌ ${symbol}: ${error.message}`);
            errorCount++;
          }
        })
      );

      // Progress update
      const progress = ((i + batch.length) / symbols.length * 100).toFixed(1);
      console.log(`\nProgress: ${i + batch.length}/${symbols.length} (${progress}%)\n`);

      // Delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        console.log('Waiting 2 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n✅ Dividend population completed!\n');
    console.log('Summary:');
    console.log(`  - Success: ${successCount}`);
    console.log(`  - Skipped (no dividends): ${skippedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Total: ${symbols.length}\n`);

    // Show statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT symbol) as symbols_with_dividends,
        COUNT(*) as total_dividends,
        SUM(amount) as total_amount
      FROM dividends`
    );

    if (statsResult.rows[0]) {
      const stats = statsResult.rows[0];
      console.log('Database Statistics:');
      console.log(`  - Symbols with dividends: ${stats.symbols_with_dividends}`);
      console.log(`  - Total dividend records: ${stats.total_dividends}`);
      console.log(`  - Total amount: $${parseFloat(stats.total_amount || 0).toFixed(2)}\n`);
    }

  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run population
populateDividends();

