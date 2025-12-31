/**
 * Test GCP Upload Script
 * Tests uploading an avatar image to a private GCP bucket
 */

require('dotenv').config();
const { imageService } = require('../services');
const path = require('path');
const fs = require('fs').promises;

async function testGCPUpload() {
  try {
    console.log('🧪 Testing GCP Upload to Private Bucket...\n');

    // Check if we're in mock mode
    // Allow override via TEST_GCP env variable
    const TEST_GCP = process.env.TEST_GCP === 'true';
    const USE_MOCK_SERVICES = (process.env.USE_MOCK_SERVICES === 'true' || 
                              process.env.NODE_ENV === 'local') && !TEST_GCP;
    
    if (USE_MOCK_SERVICES) {
      console.log('⚠️  Running in MOCK mode - GCP upload will be simulated');
      console.log('   Set TEST_GCP=true to test real GCP upload');
      console.log('   Or set NODE_ENV=development or NODE_ENV=production\n');
    } else {
      console.log('✅ Testing REAL GCP upload to private bucket\n');
    }

    // Create a test image file
    const testImagePath = path.join(__dirname, '../temp/test-avatar.jpg');
    const testImageDir = path.dirname(testImagePath);
    
    // Ensure temp directory exists
    await fs.mkdir(testImageDir, { recursive: true });

    // Create a simple test image using sharp
    const sharp = require('sharp');
    const testImageBuffer = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .jpeg({ quality: 90 })
    .toBuffer();

    await fs.writeFile(testImagePath, testImageBuffer);
    console.log(`✅ Created test image: ${testImagePath}`);

    // Test upload
    console.log('\n📤 Uploading to GCP...');
    const result = await imageService.processAndUploadAvatar(testImagePath, 999, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 85,
    });

    console.log('\n✅ Upload Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Public URL: ${result.publicUrl}`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Size: ${result.size} bytes`);

    // Clean up test file
    await fs.unlink(testImagePath);
    console.log(`\n🧹 Cleaned up test file: ${testImagePath}`);

    // Test accessing the image via the proxy route
    if (result.publicUrl && !USE_MOCK_SERVICES) {
      console.log('\n🔗 Testing image access via proxy route...');
      console.log(`   URL: ${result.publicUrl}`);
      console.log('   You can test this URL in your browser or with curl');
    }

    console.log('\n✅ GCP Upload Test Complete!');
  } catch (error) {
    console.error('\n❌ GCP Upload Test Failed:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testGCPUpload();

