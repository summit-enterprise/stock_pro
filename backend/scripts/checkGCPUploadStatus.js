/**
 * Check GCP Upload Status
 * Verifies which avatars and logos are uploaded to GCP vs still using external URLs
 * 
 * Run: node backend/scripts/checkGCPUploadStatus.js
 */

require('dotenv').config();
const { pool } = require('../db');

async function checkGCPUploadStatus() {
  try {
    console.log('🔍 Checking GCP Upload Status...\n');

    // Check avatars
    console.log('📸 AVATAR STATUS:');
    console.log('='.repeat(60));
    
    const avatarResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN avatar_url IS NULL THEN 1 END) as no_avatar,
        COUNT(CASE WHEN avatar_url LIKE '/api/image/gcp/%' THEN 1 END) as in_gcp,
        COUNT(CASE WHEN avatar_url LIKE 'http://localhost:3001/api/image/gcp/%' THEN 1 END) as in_gcp_full_url,
        COUNT(CASE WHEN avatar_url LIKE '%storage.googleapis.com%' THEN 1 END) as in_gcp_storage,
        COUNT(CASE WHEN avatar_url LIKE '%lh3.googleusercontent.com%' THEN 1 END) as oauth_google,
        COUNT(CASE WHEN avatar_url LIKE '%mock-storage.example.com%' THEN 1 END) as mock_storage,
        COUNT(CASE WHEN avatar_url NOT LIKE '/api/image/gcp/%' 
                   AND avatar_url NOT LIKE 'http://localhost:3001/api/image/gcp/%'
                   AND avatar_url NOT LIKE '%storage.googleapis.com%'
                   AND avatar_url NOT LIKE '%lh3.googleusercontent.com%'
                   AND avatar_url NOT LIKE '%mock-storage.example.com%'
                   AND avatar_url IS NOT NULL THEN 1 END) as other
      FROM users`
    );

    const avatars = avatarResult.rows[0];
    console.log(`Total Users: ${avatars.total}`);
    console.log(`  ✅ In GCP (relative path): ${avatars.in_gcp}`);
    console.log(`  ✅ In GCP (full URL): ${avatars.in_gcp_full_url}`);
    console.log(`  ✅ In GCP (storage.googleapis.com): ${avatars.in_gcp_storage}`);
    console.log(`  ⚠️  OAuth Google (needs migration): ${avatars.oauth_google}`);
    console.log(`  ⚠️  Mock Storage (needs migration): ${avatars.mock_storage}`);
    console.log(`  ❌ No Avatar: ${avatars.no_avatar}`);
    console.log(`  ❓ Other/Unknown: ${avatars.other}`);
    
    const avatarsInGCP = parseInt(avatars.in_gcp) + parseInt(avatars.in_gcp_full_url) + parseInt(avatars.in_gcp_storage);
    const avatarsNeedingMigration = parseInt(avatars.oauth_google) + parseInt(avatars.mock_storage) + parseInt(avatars.other);
    
    console.log(`\n  📊 Summary:`);
    console.log(`     ✅ In GCP: ${avatarsInGCP}/${avatars.total} (${((avatarsInGCP/avatars.total)*100).toFixed(1)}%)`);
    console.log(`     ⚠️  Need Migration: ${avatarsNeedingMigration}`);
    console.log(`     ❌ No Avatar: ${avatars.no_avatar}\n`);

    // Check logos
    console.log('🖼️  LOGO STATUS:');
    console.log('='.repeat(60));
    
    const logoResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN logo_url IS NULL THEN 1 END) as no_logo,
        COUNT(CASE WHEN logo_url LIKE '/api/image/gcp/%' THEN 1 END) as in_gcp,
        COUNT(CASE WHEN logo_url LIKE 'http://localhost:3001/api/image/gcp/%' THEN 1 END) as in_gcp_full_url,
        COUNT(CASE WHEN logo_url LIKE '%storage.googleapis.com%' THEN 1 END) as in_gcp_storage,
        COUNT(CASE WHEN logo_url LIKE 'http://%' OR logo_url LIKE 'https://%' THEN 1 END) as external_url,
        COUNT(CASE WHEN logo_url NOT LIKE '/api/image/gcp/%' 
                   AND logo_url NOT LIKE 'http://localhost:3001/api/image/gcp/%'
                   AND logo_url NOT LIKE '%storage.googleapis.com%'
                   AND logo_url NOT LIKE 'http://%'
                   AND logo_url NOT LIKE 'https://%'
                   AND logo_url IS NOT NULL THEN 1 END) as other
      FROM asset_info`
    );

    const logos = logoResult.rows[0];
    console.log(`Total Assets: ${logos.total}`);
    console.log(`  ✅ In GCP (relative path): ${logos.in_gcp}`);
    console.log(`  ✅ In GCP (full URL): ${logos.in_gcp_full_url}`);
    console.log(`  ✅ In GCP (storage.googleapis.com): ${logos.in_gcp_storage}`);
    console.log(`  ⚠️  External URL (needs migration): ${logos.external_url}`);
    console.log(`  ❌ No Logo: ${logos.no_logo}`);
    console.log(`  ❓ Other/Unknown: ${logos.other}`);
    
    const logosInGCP = parseInt(logos.in_gcp) + parseInt(logos.in_gcp_full_url) + parseInt(logos.in_gcp_storage);
    const logosNeedingMigration = parseInt(logos.external_url) + parseInt(logos.other);
    
    console.log(`\n  📊 Summary:`);
    console.log(`     ✅ In GCP: ${logosInGCP}/${logos.total} (${((logosInGCP/logos.total)*100).toFixed(1)}%)`);
    console.log(`     ⚠️  Need Migration: ${logosNeedingMigration}`);
    console.log(`     ❌ No Logo: ${logos.no_logo}\n`);

    // Show examples of items needing migration
    if (avatarsNeedingMigration > 0) {
      console.log('📋 AVATARS NEEDING MIGRATION (sample):');
      console.log('='.repeat(60));
      const sampleResult = await pool.query(
        `SELECT id, email, avatar_url 
         FROM users 
         WHERE avatar_url NOT LIKE '/api/image/gcp/%' 
           AND avatar_url NOT LIKE 'http://localhost:3001/api/image/gcp/%'
           AND avatar_url NOT LIKE '%storage.googleapis.com%'
           AND avatar_url IS NOT NULL
         LIMIT 5`
      );
      sampleResult.rows.forEach(user => {
        console.log(`  User ${user.id} (${user.email}): ${user.avatar_url?.substring(0, 80)}...`);
      });
      console.log('');
    }

    if (logosNeedingMigration > 0) {
      console.log('📋 LOGOS NEEDING MIGRATION (sample):');
      console.log('='.repeat(60));
      const sampleResult = await pool.query(
        `SELECT symbol, name, logo_url 
         FROM asset_info 
         WHERE logo_url NOT LIKE '/api/image/gcp/%' 
           AND logo_url NOT LIKE 'http://localhost:3001/api/image/gcp/%'
           AND logo_url NOT LIKE '%storage.googleapis.com%'
           AND logo_url IS NOT NULL
         LIMIT 10`
      );
      sampleResult.rows.forEach(asset => {
        console.log(`  ${asset.symbol} (${asset.name}): ${asset.logo_url?.substring(0, 80)}...`);
      });
      console.log('');
    }

    // Overall summary
    console.log('='.repeat(60));
    console.log('📊 OVERALL SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Avatars in GCP: ${avatarsInGCP}/${avatars.total} (${((avatarsInGCP/avatars.total)*100).toFixed(1)}%)`);
    console.log(`Logos in GCP: ${logosInGCP}/${logos.total} (${((logosInGCP/logos.total)*100).toFixed(1)}%)`);
    console.log(`\n✅ Status: ${avatarsNeedingMigration === 0 && logosNeedingMigration === 0 ? 'All uploaded!' : 'Migration needed'}\n`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run check
if (require.main === module) {
  checkGCPUploadStatus();
}

module.exports = { checkGCPUploadStatus };


