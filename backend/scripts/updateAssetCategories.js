/**
 * Update Asset Categories Script
 * Updates all assets in the database with proper categories
 * 
 * Run: node backend/scripts/updateAssetCategories.js
 */

require('dotenv').config();
const { pool, initDb } = require('../db');
const { updateAllAssetCategories } = require('../utils/categoryUtils');

async function updateCategories() {
  try {
    console.log('🚀 Starting asset category update...\n');
    
    // Initialize database
    await initDb();
    
    // Update all categories
    console.log('Updating categories for all assets...');
    const result = await updateAllAssetCategories(pool);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 CATEGORY UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total assets: ${result.total}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Unchanged: ${result.unchanged}`);
    console.log('\nCategory distribution:');
    Object.entries(result.categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Category update completed successfully!\n');
  } catch (error) {
    console.error('❌ Error updating categories:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateCategories();

