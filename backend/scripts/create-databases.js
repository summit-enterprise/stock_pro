/**
 * Create Databases Script
 * Creates PostgreSQL databases for local, dev, and prod if they don't exist
 * 
 * Run: node backend/scripts/create-databases.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';

const DATABASES = [
  { name: process.env.DB_NAME_LOCAL || 'stockdb_local', env: 'local/mock' },
  { name: process.env.DB_NAME_DEV || 'stockdb_dev', env: 'development' },
  { name: process.env.DB_NAME_PROD || 'stockdb_prod', env: 'production' },
];

async function createDatabases() {
  // Connect to postgres database to create other databases
  const adminPool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    port: DB_PORT,
    password: DB_PASSWORD,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    console.log('📊 Creating databases...\n');

    for (const db of DATABASES) {
      try {
        // Check if database exists
        const checkResult = await adminPool.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [db.name]
        );

        if (checkResult.rows.length > 0) {
          console.log(`✅ Database "${db.name}" already exists (${db.env})`);
        } else {
          // Create database
          await adminPool.query(`CREATE DATABASE ${db.name}`);
          console.log(`✅ Created database "${db.name}" (${db.env})`);
        }

        // Connect to the new database and enable TimescaleDB
        const dbPool = new Pool({
          user: DB_USER,
          host: DB_HOST,
          port: DB_PORT,
          password: DB_PASSWORD,
          database: db.name,
        });

        try {
          await dbPool.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
          console.log(`  ✅ TimescaleDB extension enabled for "${db.name}"`);
        } catch (extError) {
          console.log(`  ⚠️  Could not enable TimescaleDB for "${db.name}": ${extError.message}`);
          console.log(`     (This is okay if TimescaleDB is not installed - regular PostgreSQL will work)`);
        }

        await dbPool.end();
      } catch (error) {
        console.error(`❌ Error with database "${db.name}":`, error.message);
      }
    }

    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error creating databases:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createDatabases()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createDatabases };

