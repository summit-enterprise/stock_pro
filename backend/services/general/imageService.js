/**
 * Image Service
 * Handles image upload, compression, optimization, and storage
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const storageService = require('../infrastructure/storageService');

const AVATAR_FOLDER = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_AVATAR_DIMENSIONS = { width: 400, height: 400 };
const AVATAR_QUALITY = 85;

/**
 * Process and upload avatar image
 * @param {string} filePath - Local file path
 * @param {number} userId - User ID
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Upload result with publicUrl
 */
async function processAndUploadAvatar(filePath, userId, options = {}) {
  try {
    const {
      maxWidth = DEFAULT_AVATAR_DIMENSIONS.width,
      maxHeight = DEFAULT_AVATAR_DIMENSIONS.height,
      quality = AVATAR_QUALITY,
    } = options;

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const timestamp = Date.now();
    const destinationPath = `${AVATAR_FOLDER}/${userId}_${timestamp}.webp`;

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
        public: false, // Keep files private
        contentType: 'image/webp',
      }
    );

    // Return path that will be served via authenticated route
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
    const imageUrl = `${BACKEND_URL}/api/image/gcp/${destinationPath}`;

    return {
      success: true,
      publicUrl: imageUrl, // This is actually a private URL served via our API
      path: destinationPath,
      size: processedBuffer.length,
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

module.exports = {
  processAndUploadAvatar,
  validateImage,
  compressImage,
  getImageMetadata,
  AVATAR_FOLDER,
  MAX_AVATAR_SIZE,
  DEFAULT_AVATAR_DIMENSIONS,
};

