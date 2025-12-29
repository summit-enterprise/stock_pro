/**
 * Populate database with 1000 assets and 5 years of historical data
 * Uses TimescaleDB for efficient storage
 * 
 * Run: node backend/scripts/populateAssets.js
 */

require('dotenv').config();
const { pool } = require('../db');
const { generateAssetList } = require('../services/assetGenerator');
const { generateHistoricalData, BASE_PRICES } = require('../services/mockData');

async function populateAssets() {
  try {
    console.log('🚀 Starting asset population...\n');

    // 1. Generate asset list
    console.log('1. Generating 1000 assets...');
    const assets = generateAssetList();
    console.log(`   ✅ Generated ${assets.length} assets\n`);

    // 2. Insert asset_info
    console.log('2. Inserting asset metadata...');
    let insertedCount = 0;
    for (const asset of assets) {
      try {
        await pool.query(
          `INSERT INTO asset_info (symbol, name, type, exchange, currency, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (symbol) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
          [asset.symbol, asset.name, asset.type, asset.exchange, 'USD']
        );
        insertedCount++;
        if (insertedCount % 100 === 0) {
          process.stdout.write(`   Progress: ${insertedCount}/${assets.length}\r`);
        }
      } catch (error) {
        console.error(`   ⚠️  Error inserting ${asset.symbol}:`, error.message);
      }
    }
    console.log(`\n   ✅ Inserted ${insertedCount} assets\n`);

    // 3. Generate and insert historical data (5 years = ~1260 trading days)
    console.log('3. Generating 5 years of historical data for each asset...');
    console.log('   This may take a while...\n');
    
    const tradingDays = 1260; // 5 years of trading days
    let dataInserted = 0;
    const totalRecords = assets.length * tradingDays;
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      // Use asset's basePrice directly
      const basePrice = asset.basePrice;
      
      // Temporarily add to BASE_PRICES for historical data generation
      const originalPrice = BASE_PRICES[asset.symbol];
      BASE_PRICES[asset.symbol] = basePrice;
      
      // Generate historical data
      const historicalData = generateHistoricalData(asset.symbol, tradingDays);
      
      // Restore original price if it existed
      if (originalPrice !== undefined) {
        BASE_PRICES[asset.symbol] = originalPrice;
      } else {
        delete BASE_PRICES[asset.symbol];
      }
      
      // Insert in batches for performance
      const batchSize = 100;
      for (let j = 0; j < historicalData.length; j += batchSize) {
        const batch = historicalData.slice(j, j + batchSize);
        const values = batch.map((point, idx) => {
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
      
      if ((i + 1) % 10 === 0) {
        const progress = ((i + 1) / assets.length * 100).toFixed(1);
        const recordsProgress = ((dataInserted / totalRecords) * 100).toFixed(1);
        process.stdout.write(`   Progress: ${i + 1}/${assets.length} assets (${progress}%) | ${dataInserted.toLocaleString()}/${totalRecords.toLocaleString()} records (${recordsProgress}%)\r`);
      }
    }
    
    console.log(`\n   ✅ Inserted ${dataInserted.toLocaleString()} historical data points\n`);

    // 4. Show statistics
    console.log('4. Database Statistics:\n');
    
    const assetCount = await pool.query('SELECT COUNT(*) FROM asset_info');
    const dataCount = await pool.query('SELECT COUNT(*) FROM asset_data');
    const uniqueSymbols = await pool.query('SELECT COUNT(DISTINCT symbol) FROM asset_data');
    
    console.log(`   Assets: ${assetCount.rows[0].count}`);
    console.log(`   Historical records: ${dataCount.rows[0].count.toLocaleString()}`);
    console.log(`   Unique symbols: ${uniqueSymbols.rows[0].count}\n`);

    // Check if TimescaleDB is enabled
    try {
      const hypertableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM timescaledb_information.hypertables 
          WHERE hypertable_name = 'asset_data'
        );
      `);
      
      if (hypertableCheck.rows[0].exists) {
        const sizeQuery = await pool.query(`
          SELECT 
            pg_size_pretty(pg_total_relation_size('asset_data')) AS total_size,
            pg_size_pretty(pg_relation_size('asset_data')) AS table_size;
        `);
        console.log(`   Storage (TimescaleDB):`);
        console.log(`   - Total: ${sizeQuery.rows[0].total_size}`);
        console.log(`   - Table: ${sizeQuery.rows[0].table_size}\n`);
      }
    } catch (error) {
      // TimescaleDB not enabled, show regular size
      const sizeQuery = await pool.query(`
        SELECT pg_size_pretty(pg_total_relation_size('asset_data')) AS total_size;
      `);
      console.log(`   Storage: ${sizeQuery.rows[0].total_size}\n`);
    }

    console.log('✅ Population completed successfully!\n');
    console.log('📊 Next steps:');
    console.log('   1. Run TimescaleDB migration: node backend/scripts/migrateToTimescaleDB.js');
    console.log('   2. Enable compression for old data');
    console.log('   3. Test queries with your application\n');

  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run population
populateAssets();

