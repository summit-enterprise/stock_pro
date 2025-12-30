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
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('custom', 'google')),
        google_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Asset info table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_info (
        symbol VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(50),
        exchange VARCHAR(100),
        currency VARCHAR(10) DEFAULT 'USD',
        market_cap NUMERIC,
        pe_ratio NUMERIC,
        dividend_yield NUMERIC,
        logo_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add logo_url column if it doesn't exist (migration)
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='asset_info' AND column_name='logo_url') THEN
            ALTER TABLE asset_info ADD COLUMN logo_url TEXT;
          END IF;
        END $$;
      `);
    } catch (alterError) {
      console.warn('Could not add logo_url column (may already exist):', alterError.message);
    }

    // Crypto coin IDs table (maps database symbols to CoinGecko coin IDs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_coin_ids (
        symbol VARCHAR(50) PRIMARY KEY,
        coin_id VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (symbol) REFERENCES asset_info(symbol) ON DELETE CASCADE
      );
    `);

    // Asset data table (TimescaleDB hypertable)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_data (
        symbol VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        open NUMERIC(18,8),
        high NUMERIC(18,8),
        low NUMERIC(18,8),
        close NUMERIC(18,8),
        volume BIGINT,
        adjusted_close NUMERIC(18,8),
        PRIMARY KEY (symbol, date)
      );
    `);

    // Watchlist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        user_id INTEGER NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, symbol),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (symbol) REFERENCES asset_info(symbol) ON DELETE CASCADE
      );
    `);

    // Portfolio table - User's portfolio holdings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        user_id INTEGER NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        shares_owned NUMERIC(18,8) DEFAULT 0,
        avg_share_price NUMERIC(18,8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, symbol),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (symbol) REFERENCES asset_info(symbol) ON DELETE CASCADE
      );
    `);

    // Migrate portfolio table if it has old schema (quantity, purchase_price)
    try {
      const client = await pool.connect();
      try {
        const columns = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'portfolio' AND table_schema = current_schema();
        `);
        const columnNames = columns.rows.map(row => row.column_name);

        // Check if old columns exist
        const hasQuantity = columnNames.includes('quantity');
        const hasPurchasePrice = columnNames.includes('purchase_price');
        const hasSharesOwned = columnNames.includes('shares_owned');
        const hasAvgSharePrice = columnNames.includes('avg_share_price');

        // Migrate from old schema to new schema
        if (hasQuantity && hasSharesOwned) {
          // Both exist, copy data from old to new if new is 0
          await client.query(`UPDATE portfolio SET shares_owned = quantity WHERE shares_owned = 0 OR shares_owned IS NULL`);
        } else if (hasQuantity && !hasSharesOwned) {
          await client.query(`ALTER TABLE portfolio ADD COLUMN shares_owned NUMERIC(18,8) DEFAULT 0`);
          await client.query(`UPDATE portfolio SET shares_owned = quantity WHERE shares_owned = 0`);
        } else if (!hasSharesOwned) {
          await client.query(`ALTER TABLE portfolio ADD COLUMN shares_owned NUMERIC(18,8) DEFAULT 0`);
        }

        if (hasPurchasePrice && hasAvgSharePrice) {
          // Both exist, copy data from old to new if new is 0
          await client.query(`UPDATE portfolio SET avg_share_price = purchase_price WHERE avg_share_price = 0 OR avg_share_price IS NULL`);
        } else if (hasPurchasePrice && !hasAvgSharePrice) {
          await client.query(`ALTER TABLE portfolio ADD COLUMN avg_share_price NUMERIC(18,8) DEFAULT 0`);
          await client.query(`UPDATE portfolio SET avg_share_price = purchase_price WHERE avg_share_price = 0`);
        } else if (!hasAvgSharePrice) {
          await client.query(`ALTER TABLE portfolio ADD COLUMN avg_share_price NUMERIC(18,8) DEFAULT 0`);
        }

        // Make old columns nullable if they exist (to allow inserts without them)
        if (hasQuantity) {
          try {
            await client.query(`ALTER TABLE portfolio ALTER COLUMN quantity DROP NOT NULL`);
          } catch (alterError) {
            // Ignore if already nullable or constraint doesn't exist
          }
        }
        if (hasPurchasePrice) {
          try {
            await client.query(`ALTER TABLE portfolio ALTER COLUMN purchase_price DROP NOT NULL`);
          } catch (alterError) {
            // Ignore if already nullable or constraint doesn't exist
          }
        }
        
        // Check for purchase_date column and make it nullable
        const hasPurchaseDate = columnNames.includes('purchase_date');
        if (hasPurchaseDate) {
          try {
            await client.query(`ALTER TABLE portfolio ALTER COLUMN purchase_date DROP NOT NULL`);
          } catch (alterError) {
            // Ignore if already nullable or constraint doesn't exist
          }
        }

        // Add updated_at if it doesn't exist
        if (!columnNames.includes('updated_at')) {
          await client.query(`ALTER TABLE portfolio ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        }
      } finally {
        client.release();
      }
    } catch (alterError) {
      console.warn('Could not migrate portfolio table (may not exist yet):', alterError.message);
    }

    // Create unique constraint on (user_id, symbol) if it doesn't exist
    try {
      const constraintCheck = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'portfolio' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id%symbol%'
      `);
      
      if (constraintCheck.rows.length === 0) {
        // Check if unique constraint exists with different name
        const allConstraints = await pool.query(`
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'portfolio' AND constraint_type = 'UNIQUE'
        `);
        
        // Try to create unique constraint, ignore if it already exists in a different form
        try {
          await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS portfolio_user_symbol_unique 
            ON portfolio(user_id, symbol)
          `);
        } catch (uniqueError) {
          // If unique constraint already exists in different form, that's okay
          console.log('Unique constraint on (user_id, symbol) may already exist');
        }
      }
    } catch (constraintError) {
      console.warn('Could not create unique constraint on portfolio:', constraintError.message);
    }

    // Create index for portfolio table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
    `);

    // Dividends table - Efficient storage for historical dividends
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dividends (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        ex_date DATE NOT NULL,
        payment_date DATE,
        record_date DATE,
        declared_date DATE,
        amount NUMERIC(10,4) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        frequency VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, ex_date, amount)
      );
    `);

    // Create indexes for dividends table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dividends_symbol ON dividends(symbol);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dividends_ex_date ON dividends(ex_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dividends_symbol_date ON dividends(symbol, ex_date DESC);
    `);

    // Filings table - SEC filings (13F, 10-K, 10-Q, 8-K, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS filings (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        cik VARCHAR(20),
        filing_type VARCHAR(20) NOT NULL,
        filing_date DATE NOT NULL,
        report_date DATE,
        accession_number VARCHAR(50) UNIQUE,
        document_url TEXT,
        description TEXT,
        period_end DATE,
        form_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, filing_type, filing_date, accession_number)
      );
    `);

    // Create indexes for filings table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_filings_symbol ON filings(symbol);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_filings_type ON filings(filing_type);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_filings_date ON filings(filing_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_filings_symbol_type_date ON filings(symbol, filing_type, filing_date DESC);
    `);

    // Analyst ratings table - Store individual analyst ratings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analyst_ratings (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        analyst_name VARCHAR(255),
        firm_name VARCHAR(255),
        rating VARCHAR(50) NOT NULL,
        price_target NUMERIC(10,2),
        rating_date DATE NOT NULL,
        previous_rating VARCHAR(50),
        previous_price_target NUMERIC(10,2),
        action VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns if table already exists with old schema
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='rating_date') THEN
            ALTER TABLE analyst_ratings ADD COLUMN rating_date DATE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='analyst_name') THEN
            ALTER TABLE analyst_ratings ADD COLUMN analyst_name VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='price_target') THEN
            ALTER TABLE analyst_ratings ADD COLUMN price_target NUMERIC(10,2);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='previous_price_target') THEN
            ALTER TABLE analyst_ratings ADD COLUMN previous_price_target NUMERIC(10,2);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='firm_name') THEN
            ALTER TABLE analyst_ratings ADD COLUMN firm_name VARCHAR(255);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='rating') THEN
            ALTER TABLE analyst_ratings ADD COLUMN rating VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='previous_rating') THEN
            ALTER TABLE analyst_ratings ADD COLUMN previous_rating VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='analyst_ratings' AND column_name='action') THEN
            ALTER TABLE analyst_ratings ADD COLUMN action VARCHAR(50);
          END IF;
        END $$;
      `);
    } catch (alterError) {
      console.warn('Could not alter analyst_ratings table (may not exist yet):', alterError.message);
    }

    // Create indexes for analyst_ratings table (only if columns exist)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_analyst_ratings_symbol ON analyst_ratings(symbol);
      `);
      // Only create index on rating_date if column exists
      const dateColCheck = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='analyst_ratings' AND column_name='rating_date'
      `);
      if (dateColCheck.rows.length > 0) {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analyst_ratings_date ON analyst_ratings(rating_date DESC);
        `);
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analyst_ratings_symbol_date ON analyst_ratings(symbol, rating_date DESC);
        `);
      }
      // Only create index on rating if column exists
      const ratingColCheck = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='analyst_ratings' AND column_name='rating'
      `);
      if (ratingColCheck.rows.length > 0) {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analyst_ratings_rating ON analyst_ratings(rating);
        `);
      }
    } catch (indexError) {
      console.warn('Could not create some indexes for analyst_ratings:', indexError.message);
    }

    // Analyst consensus table - Aggregated ratings per symbol
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analyst_consensus (
        symbol VARCHAR(50) PRIMARY KEY,
        total_analysts INTEGER DEFAULT 0,
        strong_buy INTEGER DEFAULT 0,
        buy INTEGER DEFAULT 0,
        hold INTEGER DEFAULT 0,
        sell INTEGER DEFAULT 0,
        strong_sell INTEGER DEFAULT 0,
        average_price_target NUMERIC(10,2),
        consensus_rating VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (symbol) REFERENCES asset_info(symbol) ON DELETE CASCADE
      );
    `);

    // GCP Billing Usage table - Store service usage and billing data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gcp_billing_usage (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        service_id VARCHAR(255),
        usage_date DATE NOT NULL,
        usage_amount NUMERIC(18,6),
        usage_unit VARCHAR(50),
        cost_amount NUMERIC(18,6),
        cost_currency VARCHAR(10) DEFAULT 'USD',
        location VARCHAR(100),
        project_id VARCHAR(255),
        sku_id VARCHAR(255),
        sku_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_name, service_id, usage_date, sku_id)
      );
    `);

    // Create indexes for billing usage table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_service ON gcp_billing_usage(service_name);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_date ON gcp_billing_usage(usage_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_service_date ON gcp_billing_usage(service_name, usage_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_project ON gcp_billing_usage(project_id);
    `);

    // GCP Billing Aggregates table - Pre-aggregated data for faster queries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gcp_billing_aggregates (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        aggregation_date DATE NOT NULL,
        total_cost NUMERIC(18,6),
        total_usage NUMERIC(18,6),
        usage_unit VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'USD',
        project_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_name, aggregation_date, project_id)
      );
    `);

    // Create indexes for aggregates table
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_aggregates_service ON gcp_billing_aggregates(service_name);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_aggregates_date ON gcp_billing_aggregates(aggregation_date DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_aggregates_service_date ON gcp_billing_aggregates(service_name, aggregation_date DESC);
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initDb };

