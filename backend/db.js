const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stockdb',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Initialize database schema
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('custom', 'google', 'both')),
        google_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        is_admin BOOLEAN DEFAULT FALSE,
        is_superuser BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Update existing users to support both auth types if needed
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_auth_type_check;
    `).catch(() => {}); // Ignore if constraint doesn't exist
    
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_auth_type_check 
      CHECK (auth_type IN ('custom', 'google', 'both'));
    `).catch(() => {}); // Ignore if constraint already exists
    
    // Add admin columns if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `).catch(() => {});
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE;
    `).catch(() => {});

    // Create asset_data table for historical price data
    // Using composite primary key (symbol, date) for TimescaleDB compatibility
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_data (
        symbol VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        open DECIMAL(15, 4),
        high DECIMAL(15, 4),
        low DECIMAL(15, 4),
        close DECIMAL(15, 4),
        volume BIGINT,
        adjusted_close DECIMAL(15, 4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (symbol, date)
      );
    `).catch(() => {});
    
    // Drop id column if it exists (for TimescaleDB compatibility)
    await pool.query(`
      ALTER TABLE asset_data DROP COLUMN IF EXISTS id;
    `).catch(() => {});

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_data_symbol_date 
      ON asset_data(symbol, date DESC);
    `).catch(() => {});

    // Create asset_info table for current asset metadata
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_info (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255),
        type VARCHAR(50),
        category VARCHAR(50),
        exchange VARCHAR(50),
        currency VARCHAR(10),
        market_cap BIGINT,
        pe_ratio DECIMAL(10, 2),
        dividend_yield DECIMAL(5, 2),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Add category column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE asset_info 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    `).catch(() => {});

    // Create watchlist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, symbol)
      );
    `).catch(() => {});

    // Create portfolio table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        quantity DECIMAL(15, 4) NOT NULL,
        purchase_price DECIMAL(15, 4) NOT NULL,
        purchase_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Create price_alerts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol VARCHAR(50) NOT NULL,
        target_price DECIMAL(15, 4) NOT NULL,
        alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('above', 'below')),
        is_active BOOLEAN DEFAULT TRUE,
        triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Create user_preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sidebar_collapsed BOOLEAN DEFAULT FALSE,
        theme VARCHAR(20) DEFAULT 'dark',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Create analyst_ratings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analyst_ratings (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) UNIQUE NOT NULL,
        short_term_signal VARCHAR(50),
        short_term_strength INTEGER,
        long_term_signal VARCHAR(50),
        long_term_strength INTEGER,
        consensus_rating VARCHAR(50),
        target_price DECIMAL(15, 4),
        total_analysts INTEGER,
        strong_buy_count INTEGER DEFAULT 0,
        buy_count INTEGER DEFAULT 0,
        hold_count INTEGER DEFAULT 0,
        sell_count INTEGER DEFAULT 0,
        strong_sell_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analyst_ratings_symbol 
      ON analyst_ratings(symbol);
    `).catch(() => {});
    
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initDb };

