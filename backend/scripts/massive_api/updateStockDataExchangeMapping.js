/**
 * Update stock_data table with exchange acronym and Massive ID mapping
 * 
 * This script updates existing records in stock_data table by mapping
 * primary_exchange (MIC code) to acronym and massive_id based on the
 * exchange mapping table.
 * 
 * Usage: node scripts/updateStockDataExchangeMapping.js
 */

require('dotenv').config();
const { pool } = require('../../db');

/**
 * Exchange mapping: Primary Exchange (MIC Code) -> Acronym and Massive ID
 * MIC	Massive ID	Exchange Name	Acronym
 * XNAS	1	NASDAQ	NASDAQ
 * XNYS	11	New York Stock Exchange	NYSE
 * ARCX	12	NYSE Arca	ARCA
 * XASE	2	NYSE American (AMEX)	AMEX
 * BATS	3	Cboe BZX Exchange	BATS
 * BATY	4	Cboe BYX Exchange	BYX
 * EDGA	5	Cboe EDGA Exchange	EDGA
 * EDGX	6	Cboe EDGX Exchange	EDGX
 * IEXG	15	Investors Exchange	IEX
 * XPHL	10	Nasdaq PHLX	PHLX
 * XBOS	8	Nasdaq BX	BX
 * XPSX	9	Nasdaq PSX	PSX
 * XCHI	13	NYSE Chicago	CHX
 * XCIS	14	NYSE National	NSX
 * LTSE	16	Long-Term Stock Exchange	LTSE
 * MEMX	17	Members Exchange	MEMX
 * OTCM	19	OTC Markets	OTC
 */
const EXCHANGE_MAPPING = {
  'XNAS': { acronym: 'NASDAQ', massive_id: 1 },
  'XNYS': { acronym: 'NYSE', massive_id: 11 },
  'ARCX': { acronym: 'ARCA', massive_id: 12 },
  'XASE': { acronym: 'AMEX', massive_id: 2 },
  'BATS': { acronym: 'BATS', massive_id: 3 },
  'BATY': { acronym: 'BYX', massive_id: 4 },
  'EDGA': { acronym: 'EDGA', massive_id: 5 },
  'EDGX': { acronym: 'EDGX', massive_id: 6 },
  'IEXG': { acronym: 'IEX', massive_id: 15 },
  'XPHL': { acronym: 'PHLX', massive_id: 10 },
  'XBOS': { acronym: 'BX', massive_id: 8 },
  'XPSX': { acronym: 'PSX', massive_id: 9 },
  'XCHI': { acronym: 'CHX', massive_id: 13 },
  'XCIS': { acronym: 'NSX', massive_id: 14 },
  'LTSE': { acronym: 'LTSE', massive_id: 16 },
  'MEMX': { acronym: 'MEMX', massive_id: 17 },
  'OTCM': { acronym: 'OTC', massive_id: 19 }
};

async function updateExchangeMapping() {
  console.log('🔄 Starting exchange mapping update...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // First, ensure columns exist
    console.log('1. Ensuring acronym, massive_id columns exist and active is boolean...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'stock_data' AND column_name = 'acronym'
        ) THEN
          ALTER TABLE stock_data ADD COLUMN acronym VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'stock_data' AND column_name = 'massive_id'
        ) THEN
          ALTER TABLE stock_data ADD COLUMN massive_id INTEGER;
        END IF;
        
        -- Ensure active column is boolean type
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'stock_data' 
          AND column_name = 'active'
          AND data_type != 'boolean'
        ) THEN
          ALTER TABLE stock_data ALTER COLUMN active TYPE BOOLEAN USING active::boolean;
        END IF;
      END $$;
    `);
    console.log('   ✅ Columns verified\n');

    // Get count of records to update
    const exchangeList = Object.keys(EXCHANGE_MAPPING);
    const exchangeListSQL = exchangeList.map(e => `'${e}'`).join(',');
    const countResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN primary_exchange IS NOT NULL THEN 1 END) as with_exchange,
             COUNT(CASE WHEN primary_exchange IN (${exchangeListSQL}) THEN 1 END) as mappable
      FROM stock_data
    `);
    
    const { total, with_exchange, mappable } = countResult.rows[0];
    console.log('📊 Current stock_data statistics:');
    console.log(`   Total records: ${total}`);
    console.log(`   Records with primary_exchange: ${with_exchange}`);
    console.log(`   Records with mappable exchanges: ${mappable}\n`);

    // Update records for each exchange
    let totalUpdated = 0;
    
    for (const [micCode, mapping] of Object.entries(EXCHANGE_MAPPING)) {
      const result = await client.query(
        `UPDATE stock_data 
         SET acronym = $1, massive_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE primary_exchange = $3 
           AND (acronym IS NULL OR massive_id IS NULL OR acronym != $1 OR massive_id != $2)`,
        [mapping.acronym, mapping.massive_id, micCode]
      );
      
      if (result.rowCount > 0) {
        console.log(`   ✅ Updated ${result.rowCount} records for ${micCode} → ${mapping.acronym} (ID: ${mapping.massive_id})`);
        totalUpdated += result.rowCount;
      }
    }

    // Also handle case-insensitive matching
    for (const [micCode, mapping] of Object.entries(EXCHANGE_MAPPING)) {
      const result = await client.query(
        `UPDATE stock_data 
         SET acronym = $1, massive_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE UPPER(primary_exchange) = $3 
           AND (acronym IS NULL OR massive_id IS NULL OR acronym != $1 OR massive_id != $2)
           AND primary_exchange != $3`,
        [mapping.acronym, mapping.massive_id, micCode]
      );
      
      if (result.rowCount > 0) {
        console.log(`   ✅ Updated ${result.rowCount} additional records (case-insensitive) for ${micCode}`);
        totalUpdated += result.rowCount;
      }
    }

    // Update active field to ensure it's boolean
    console.log('\n2. Ensuring active field is properly set as boolean...');
    const activeUpdateResult = await client.query(`
      UPDATE stock_data 
      SET active = CASE 
        WHEN active IS NULL THEN false
        WHEN active::text IN ('true', 't', '1', 'yes') THEN true
        WHEN active::text IN ('false', 'f', '0', 'no', '') THEN false
        ELSE active::boolean
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE active IS NULL 
         OR active::text NOT IN ('true', 'false', 't', 'f')
    `);
    
    if (activeUpdateResult.rowCount > 0) {
      console.log(`   ✅ Updated ${activeUpdateResult.rowCount} records to ensure active is boolean`);
    } else {
      console.log('   ✅ All active fields are already boolean');
    }

    await client.query('COMMIT');

    console.log(`\n✅ Exchange mapping update complete!`);
    console.log(`   Total records updated: ${totalUpdated}\n`);

    // Show summary by exchange
    console.log('📈 Summary by exchange:');
    const summaryResult = await client.query(`
      SELECT 
        primary_exchange,
        acronym,
        massive_id,
        COUNT(*) as count
      FROM stock_data
      WHERE acronym IS NOT NULL AND massive_id IS NOT NULL
      GROUP BY primary_exchange, acronym, massive_id
      ORDER BY count DESC
    `);
    
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.primary_exchange.padEnd(10)} → ${row.acronym.padEnd(10)} (ID: ${row.massive_id.toString().padStart(2)}) : ${row.count} records`);
    });

    // Show unmapped exchanges
    const unmappedResult = await client.query(`
      SELECT primary_exchange, COUNT(*) as count
      FROM stock_data
      WHERE primary_exchange IS NOT NULL
        AND primary_exchange NOT IN (${exchangeListSQL})
        AND UPPER(primary_exchange) NOT IN (${exchangeListSQL})
      GROUP BY primary_exchange
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (unmappedResult.rows.length > 0) {
      console.log(`\n⚠️  Unmapped exchanges (top 10):`);
      unmappedResult.rows.forEach(row => {
        console.log(`   ${row.primary_exchange.padEnd(10)} : ${row.count} records`);
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating exchange mapping:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await updateExchangeMapping();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();

