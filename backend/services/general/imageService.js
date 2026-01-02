/**
 * Image Service
 * Handles image upload, compression, optimization, and storage
 * All images are stored in GCP Storage for local, dev, and prod environments
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const storageService = require('../infrastructure/storageService');
const { ensureBucket } = require('../infrastructure/googleCloudService');

// Asset folder structure in GCP bucket
const ASSET_FOLDERS = {
  avatars: 'avatars',
  logos: 'logos',
  backgrounds: 'backgrounds',
  branding: 'branding',
  marketing: 'marketing',
  icons: 'icons',
  general: 'images',
};

const { getBucketName } = require('../../utils/bucketConfig');

const AVATAR_FOLDER = ASSET_FOLDERS.avatars;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_AVATAR_DIMENSIONS = { width: 400, height: 400 };
const AVATAR_QUALITY = 85;
const BUCKET_NAME = getBucketName();

/**
 * Ensure GCP bucket exists and is configured
 */
async function ensureAssetBucket() {
  try {
    await ensureBucket(BUCKET_NAME, {
      location: 'US',
      storageClass: 'STANDARD',
    });
    console.log(`✅ Asset bucket ready: ${BUCKET_NAME}`);
  } catch (error) {
    console.error(`❌ Failed to ensure bucket ${BUCKET_NAME}:`, error.message);
    throw error;
  }
}

/**
 * Process and upload avatar image to GCP
 * Works for local, dev, and prod environments
 * @param {string} filePath - Local file path
 * @param {number} userId - User ID
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Upload result with publicUrl
 */
async function processAndUploadAvatar(filePath, userId, options = {}) {
  try {
    // Ensure bucket exists
    await ensureAssetBucket();

    const {
      maxWidth = DEFAULT_AVATAR_DIMENSIONS.width,
      maxHeight = DEFAULT_AVATAR_DIMENSIONS.height,
      quality = AVATAR_QUALITY,
    } = options;

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    // Use user ID as filename (no timestamp - one avatar per user)
    const destinationPath = `${AVATAR_FOLDER}/${userId}.webp`;

    // Process image with sharp
    let processedBuffer;
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Resize and optimize
      processedBuffer = await image
        .resize(maxWidth, maxHeight, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();
    } catch (sharpError) {
      console.error('Image processing error:', sharpError);
      throw new Error('Failed to process image. Please ensure the file is a valid image.');
    }

    // Upload to GCP Storage as private file
    const uploadResult = await storageService.uploadFromBuffer(
      processedBuffer,
      destinationPath,
      {
        bucket: BUCKET_NAME,
        public: false, // Keep files private, serve via signed URLs
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      }
    );

    // Return path that will be served via authenticated route
    // Format: /api/image/gcp/avatars/{userId}.webp (relative path for frontend)
    // Frontend will handle the backend URL prefix via Next.js API route
    // This path is environment-agnostic - the backend will use the correct bucket based on NODE_ENV
    const imageUrl = `/api/image/gcp/${destinationPath}`;

    const { getCurrentEnvironment } = require('../../utils/bucketConfig');
    const currentEnv = getCurrentEnvironment();
    console.log(`✅ Avatar uploaded to GCP (${currentEnv}): ${BUCKET_NAME}/${destinationPath} (${(processedBuffer.length / 1024).toFixed(2)}KB)`);

    return {
      success: true,
      publicUrl: imageUrl, // This is actually a private URL served via our API
      path: destinationPath,
      size: processedBuffer.length,
      gcpPath: destinationPath,
    };
  } catch (error) {
    console.error('Avatar processing error:', error);
    throw error;
  }
}

/**
 * Validate image file
 * @param {string} filePath - File path
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Promise<Object>} Validation result
 */
async function validateImage(filePath, maxSize = MAX_AVATAR_SIZE) {
  try {
    const stats = await fs.stat(filePath);
    
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      };
    }

    // Check if it's a valid image
    const metadata = await sharp(filePath).metadata();
    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        error: 'File is not a valid image',
      };
    }

    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate image: ' + error.message,
    };
  }
}

/**
 * Compress and optimize image
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Output file path
 */
async function compressImage(inputPath, outputPath, options = {}) {
  const {
    maxWidth,
    maxHeight,
    quality = 85,
    format = 'webp',
  } = options;

  try {
    let image = sharp(inputPath);

    if (maxWidth || maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to specified format
    if (format === 'webp') {
      await image.webp({ quality }).toFile(outputPath);
    } else if (format === 'jpeg' || format === 'jpg') {
      await image.jpeg({ quality }).toFile(outputPath);
    } else if (format === 'png') {
      await image.png({ quality }).toFile(outputPath);
    } else {
      await image.toFile(outputPath);
    }

    return outputPath;
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}

/**
 * Get image metadata
 * @param {string} filePath - File path or buffer
 * @returns {Promise<Object>} Image metadata
 */
async function getImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw error;
  }
}

/**
 * Upload general image asset to GCP
 * @param {string} filePath - Local file path
 * @param {string} folder - Asset folder (avatars, logos, backgrounds, branding, marketing, icons, general)
 * @param {string} filename - Filename (without extension)
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Upload result
 */
async function uploadImageAsset(filePath, folder, filename, options = {}) {
  try {
    await ensureAssetBucket();

    const {
      maxWidth,
      maxHeight,
      quality = 85,
      format = 'webp',
      public: isPublic = false,
    } = options;

    const folderPath = ASSET_FOLDERS[folder] || ASSET_FOLDERS.general;
    const ext = path.extname(filePath).toLowerCase();
    const finalFormat = format === 'auto' ? (ext.replace('.', '') || 'webp') : format;
    const destinationPath = `${folderPath}/${filename}.${finalFormat}`;

    // Process image if needed
    let processedBuffer;
    if (maxWidth || maxHeight || format !== 'auto') {
      let image = sharp(filePath);
      
      if (maxWidth || maxHeight) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (finalFormat === 'webp') {
        processedBuffer = await image.webp({ quality }).toBuffer();
      } else if (finalFormat === 'jpeg' || finalFormat === 'jpg') {
        processedBuffer = await image.jpeg({ quality }).toBuffer();
      } else if (finalFormat === 'png') {
        processedBuffer = await image.png({ quality }).toBuffer();
      } else {
        processedBuffer = await image.toBuffer();
      }
    } else {
      // Read file as-is
      processedBuffer = await fs.readFile(filePath);
    }

    // Upload to GCP
    const uploadResult = await storageService.uploadFromBuffer(
      processedBuffer,
      destinationPath,
      {
        bucket: BUCKET_NAME,
        public: isPublic,
        contentType: `image/${finalFormat}`,
        cacheControl: 'public, max-age=31536000, immutable',
      }
    );

    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
    const imageUrl = isPublic
      ? uploadResult.publicUrl
      : `${BACKEND_URL}/api/image/gcp/${destinationPath}`;

    return {
      success: true,
      publicUrl: imageUrl,
      path: destinationPath,
      size: processedBuffer.length,
      gcpPath: destinationPath,
    };
  } catch (error) {
    console.error('Image asset upload error:', error);
    throw error;
  }
}

module.exports = {
  processAndUploadAvatar,
  uploadImageAsset,
  validateImage,
  compressImage,
  getImageMetadata,
  ensureAssetBucket,
  AVATAR_FOLDER,
  ASSET_FOLDERS,
  MAX_AVATAR_SIZE,
  DEFAULT_AVATAR_DIMENSIONS,
  BUCKET_NAME,
};

