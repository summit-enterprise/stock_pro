/**
 * Populate Indices with Mock Historical Data (10 Years)
 * This script populates the mock database (stockdb_local) with 10 years of historical price data
 * for major market indices.
 * 
 * Run: NODE_ENV=local USE_MOCK_DATA=true node backend/scripts/populateIndices.js
 */

require('dotenv').config();

// Set environment to local/mock
process.env.NODE_ENV = 'local';
process.env.USE_MOCK_DATA = 'true';

const { pool, initDb } = require('../db');
const mockData = require('../mockservices/utils/mockData');

// Indices to populate (from market.js)
const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', basePrice: 4500.00 },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', basePrice: 38000.00 },
  { symbol: '^IXIC', name: 'NASDAQ Composite', basePrice: 14000.00 },
  { symbol: '^RUT', name: 'Russell 2000', basePrice: 2000.00 },
  { symbol: '^FTSE', name: 'FTSE 100', basePrice: 7500.00 },
  { symbol: '^N225', name: 'Nikkei 225', basePrice: 37000.00 },
  { symbol: '^GSPTSE', name: 'S&P/TSX 60', basePrice: 21000.00 },
];

// 10 years = approximately 252 trading days per year * 10 = 2520 trading days
const TRADING_DAYS_10_YEARS = 2520;

async function populateIndices() {
  try {
    // Test connection first
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected to database\n');
    } catch (connError) {
      if (connError.code === '3D000') {
        // Database doesn't exist - try to create it
        console.log('⚠️  Database does not exist. Attempting to create it...');
        
        const { getPostgresConfig } = require('../config/database');
        const pgConfig = getPostgresConfig();
        
        // Connect to postgres database to create the target database
        const { Pool: AdminPool } = require('pg');
        const adminPool = new AdminPool({
          user: pgConfig.user,
          host: pgConfig.host,
          port: pgConfig.port,
          password: process.env.DB_PASSWORD || 'password',
          database: 'postgres',
        });

        try {
          await adminPool.query(`CREATE DATABASE ${pgConfig.database}`);
          console.log(`✅ Created database "${pgConfig.database}"`);
          
          // Try to enable TimescaleDB
          try {
            const dbPool = new AdminPool({
              user: pgConfig.user,
              host: pgConfig.host,
              port: pgConfig.port,
              password: process.env.DB_PASSWORD || 'password',
              database: pgConfig.database,
            });
            await dbPool.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
            console.log('✅ TimescaleDB extension enabled');
            await dbPool.end();
          } catch (extError) {
            console.log('⚠️  Could not enable TimescaleDB (this is okay if not installed)');
          }
          
          await adminPool.end();
          
          // Wait a moment for database to be ready
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Retry connection
          await pool.query('SELECT 1');
          console.log('✅ Connected to newly created database\n');
        } catch (createError) {
          console.error('❌ Could not create database:', createError.message);
          console.error('   Please create it manually:');
          console.error(`   CREATE DATABASE ${pgConfig.database};`);
          throw new Error('Database does not exist and could not be created');
        }
      } else {
        throw connError;
      }
    }

    console.log('📊 Initializing database schema...');
    await initDb();
    console.log('✅ Database schema initialized\n');

    console.log(`🚀 Starting to populate ${INDICES.length} indices with 10 years of historical data...\n`);

    for (const index of INDICES) {
      console.log(`\n📈 Processing ${index.name} (${index.symbol})...`);

      // Check if we already have data
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date FROM asset_data WHERE symbol = $1',
        [index.symbol]
      );

      const existingCount = parseInt(checkResult.rows[0].count);
      const minDate = checkResult.rows[0].min_date;
      const maxDate = checkResult.rows[0].max_date;

      if (existingCount >= TRADING_DAYS_10_YEARS) {
        console.log(`  ✅ Already have ${existingCount} days of data (${minDate} to ${maxDate})`);
        console.log(`  ⏭️  Skipping ${index.symbol}`);
        continue;
      }

      // Calculate how many days we need
      const daysNeeded = TRADING_DAYS_10_YEARS - existingCount;
      console.log(`  📊 Need ${daysNeeded} more trading days (currently have ${existingCount})`);

      // Update BASE_PRICES for this index to ensure consistent generation
      if (!mockData.BASE_PRICES) {
        mockData.BASE_PRICES = {};
      }
      mockData.BASE_PRICES[index.symbol] = index.basePrice;

      // Generate historical data
      // For 10 years (2520 trading days), generate all at once
      // The generateHistoricalData function handles this efficiently
      console.log(`  🔄 Generating ${daysNeeded} trading days of data...`);
      const historicalData = mockData.generateHistoricalData(index.symbol, daysNeeded);

      if (historicalData.length === 0) {
        console.log(`  ⚠️  No data generated for ${index.symbol}`);
        continue;
      }

      // Insert asset info first
      await pool.query(
        `INSERT INTO asset_info (symbol, name, type, exchange, currency, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           exchange = EXCLUDED.exchange,
           currency = EXCLUDED.currency,
           updated_at = CURRENT_TIMESTAMP`,
        [index.symbol, index.name, 'index', 'Index', 'USD']
      );

      // Insert historical data in batches for better performance
      const batchSize = 100;
      let inserted = 0;
      let skipped = 0;

      console.log(`  💾 Inserting ${historicalData.length} data points in batches of ${batchSize}...`);

      for (let i = 0; i < historicalData.length; i += batchSize) {
        const batch = historicalData.slice(i, i + batchSize);
        
        // Use a transaction for each batch
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const dataPoint of batch) {
            const date = new Date(dataPoint.timestamp);
            const dateStr = date.toISOString().split('T')[0];

            const result = await client.query(
              `INSERT INTO asset_data (symbol, date, open, high, low, close, volume, adjusted_close)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (symbol, date) DO NOTHING
               RETURNING 1`,
              [
                index.symbol,
                dateStr,
                dataPoint.open,
                dataPoint.high,
                dataPoint.low,
                dataPoint.close,
                dataPoint.volume,
                dataPoint.close // adjusted_close = close for simplicity
              ]
            );

            if (result.rows.length > 0) {
              inserted++;
            } else {
              skipped++;
            }
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        // Progress indicator
        if ((i + batchSize) % 500 === 0 || i + batchSize >= historicalData.length) {
          const progress = Math.min(100, ((i + batchSize) / historicalData.length * 100).toFixed(1));
          process.stdout.write(`\r  📊 Progress: ${progress}% (${inserted} inserted, ${skipped} skipped)`);
        }
      }

      console.log(`\n  ✅ Completed ${index.symbol}: ${inserted} new records inserted, ${skipped} already existed`);

      // Verify final count
      const finalCheck = await pool.query(
        'SELECT COUNT(*) as count FROM asset_data WHERE symbol = $1',
        [index.symbol]
      );
      const finalCount = parseInt(finalCheck.rows[0].count);
      console.log(`  📊 Total records for ${index.symbol}: ${finalCount}`);
    }

    console.log('\n🎉 All indices populated successfully!');
    console.log('\n📊 Summary:');
    
    // Print summary
    for (const index of INDICES) {
      const summary = await pool.query(
        'SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date FROM asset_data WHERE symbol = $1',
        [index.symbol]
      );
      const count = parseInt(summary.rows[0].count);
      const minDate = summary.rows[0].min_date;
      const maxDate = summary.rows[0].max_date;
      console.log(`  ${index.symbol} (${index.name}): ${count} days (${minDate} to ${maxDate})`);
    }

  } catch (error) {
    console.error('❌ Error populating indices:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  populateIndices()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateIndices };

