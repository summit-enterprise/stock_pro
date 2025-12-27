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
    
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initDb };

