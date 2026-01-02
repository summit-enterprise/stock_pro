/**
 * Upload Assets to GCP
 * Scans for image assets and uploads them to appropriate GCP folders
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { imageService } = require('../services');
const { getBucketName } = require('../utils/bucketConfig');

const BUCKET_NAME = getBucketName();

// Asset locations to scan
const ASSET_LOCATIONS = [
  {
    path: path.join(__dirname, '../../frontend/public'),
    folder: 'icons', // Default folder for public assets
    public: true, // Public assets can be directly accessed
  },
];

// File categorization rules
function categorizeFile(filename, filePath) {
  const lowerName = filename.toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  
  // Check for branding keywords
  if (lowerName.includes('stellar') || lowerName.includes('alpha') || 
      lowerName.includes('brand') || lowerName.includes('logo') ||
      dirName.includes('branding')) {
    return 'branding';
  }
  
  // Check for marketing keywords
  if (lowerName.includes('marketing') || lowerName.includes('promo') ||
      lowerName.includes('ad') || lowerName.includes('banner') ||
      dirName.includes('marketing')) {
    return 'marketing';
  }
  
  // Check for background keywords
  if (lowerName.includes('background') || lowerName.includes('bg') ||
      dirName.includes('background')) {
    return 'backgrounds';
  }
  
  // Check for icon keywords
  if (lowerName.includes('icon') || lowerName.includes('ico') ||
      dirName.includes('icon')) {
    return 'icons';
  }
  
  // Default to icons for public folder, general for others
  if (filePath.includes('/public/')) {
    return 'icons';
  }
  
  return 'general';
}

async function uploadAssets() {
  try {
    console.log('🚀 Starting asset upload to GCP...\n');

    // Ensure bucket exists
    await imageService.ensureAssetBucket();

    let totalUploaded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process each asset location
    for (const location of ASSET_LOCATIONS) {
      const locationPath = location.path;
      
      try {
        // Check if location exists
        await fs.access(locationPath);
      } catch (error) {
        console.log(`⚠️  Location not found: ${locationPath}`);
        continue;
      }

      console.log(`📁 Scanning: ${locationPath}\n`);

      // Find all image files
      const files = await findImageFiles(locationPath);
      
      if (files.length === 0) {
        console.log(`   No image files found in ${locationPath}\n`);
        continue;
      }

      console.log(`   Found ${files.length} image file(s)\n`);

      // Upload each file
      for (const filePath of files) {
        try {
          const filename = path.basename(filePath, path.extname(filePath));
          const ext = path.extname(filePath).toLowerCase();
          const category = categorizeFile(path.basename(filePath), filePath);
          
          console.log(`📤 Uploading: ${path.basename(filePath)} → ${category}/`);

          // Determine format
          let format = 'webp';
          if (ext === '.svg') {
            format = 'svg'; // Keep SVG as-is
          }

          // Upload using image service
          // Note: With uniform bucket-level access, we can't set individual file ACLs
          // Files will use bucket IAM policy. Set public: false and use signed URLs instead.
          const result = await imageService.uploadImageAsset(
            filePath,
            category,
            filename,
            {
              format: format === 'svg' ? 'auto' : 'webp',
              quality: 90,
              public: false, // Use signed URLs instead (works with uniform bucket-level access)
            }
          );

          console.log(`   ✅ Uploaded: ${result.publicUrl}`);
          totalUploaded++;

        } catch (error) {
          console.error(`   ❌ Error uploading ${path.basename(filePath)}:`, error.message);
          totalErrors++;
        }
      }
    }

    // Summary
    console.log(`\n📊 Upload Summary:`);
    console.log(`   ✅ Uploaded: ${totalUploaded}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log(`   📦 Total: ${totalUploaded + totalSkipped + totalErrors}\n`);

    if (totalUploaded > 0) {
      console.log('✅ Asset upload completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

/**
 * Recursively find all image files in a directory
 */
async function findImageFiles(dir, fileList = []) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, .git, etc.
      if (file.startsWith('.') || file === 'node_modules') {
        continue;
      }
      await findImageFiles(filePath, fileList);
    } else {
      // Check if it's an image file
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

// Run upload
if (require.main === module) {
  uploadAssets()
    .then(() => {
      console.log('✅ Upload script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Upload failed:', error.message);
      process.exit(1);
    });
}

module.exports = { uploadAssets };

