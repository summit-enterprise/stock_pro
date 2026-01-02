/**
 * Check if hourly data exists for market overview symbols
 */

require('dotenv').config();
const { pool } = require('../db');

async function checkHourlyData() {
  try {
    const symbols = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^FTSE', '^N225', '^GSPTSE', 'X:BTCUSD', 'X:ETHUSD', 'XAUUSD', 'XAGUSD'];
    
    console.log('Checking hourly data for market overview symbols...\n');
    
    for (const symbol of symbols) {
      const result = await pool.query(
        `SELECT COUNT(*) as count 
         FROM asset_data 
         WHERE symbol = $1 
           AND timestamp IS NOT NULL 
           AND date = '2025-12-31'`,
        [symbol]
      );
      
      const count = parseInt(result.rows[0].count);
      console.log(`${symbol}: ${count} hourly records`);
    }
    
    // Also check the most recent date with hourly data
    const recentDateResult = await pool.query(
      `SELECT MAX(date) as max_date 
       FROM asset_data 
       WHERE timestamp IS NOT NULL 
         AND symbol = ANY($1)`,
      [symbols]
    );
    
    console.log(`\nMost recent date with hourly data: ${recentDateResult.rows[0]?.max_date}`);
    
  } catch (error) {
    console.error('Error checking hourly data:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  checkHourlyData()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkHourlyData };


