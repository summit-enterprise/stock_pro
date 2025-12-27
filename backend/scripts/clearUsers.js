require('dotenv').config();
const { pool } = require('../db');

async function clearUsers() {
  try {
    // Delete all users from the database
    const result = await pool.query('DELETE FROM users');
    
    console.log(`✅ Successfully deleted ${result.rowCount} user(s) from the database.`);
    console.log('Database is now empty and ready for fresh testing.');
  } catch (error) {
    console.error('Error clearing users:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearUsers();

