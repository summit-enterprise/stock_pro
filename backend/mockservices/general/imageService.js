/**
 * Mock Image Service
 * Provides mock image processing for local development
 * Stores compressed images locally and serves via API proxy
 */

const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const AVATAR_FOLDER = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_AVATAR_DIMENSIONS = { width: 400, height: 400 };
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const MOCK_AVATAR_DIR = path.join(__dirname, '../../temp/avatars_stored');

/**
 * Process and upload avatar image (mock)
 * Stores compressed images locally and serves via API proxy
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
      quality = 85,
    } = options;

    // Ensure storage directory exists
    await fs.mkdir(MOCK_AVATAR_DIR, { recursive: true });

    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.webp`;
    const storedPath = path.join(MOCK_AVATAR_DIR, filename);

    // Process and compress image with sharp
    try {
      await sharp(filePath)
        .resize(maxWidth, maxHeight, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toFile(storedPath);
    } catch (sharpError) {
      console.error('Mock image processing error:', sharpError);
      throw new Error('Failed to process image. Please ensure the file is a valid image.');
    }

    // Return URL pointing to backend image proxy (port 3001)
    const mockUrl = `${BACKEND_URL}/api/image/avatar/${filename}`;
    
    console.log(`[MOCK] Avatar uploaded and stored: ${storedPath}`);
    console.log(`[MOCK] Avatar URL: ${mockUrl}`);
    
    const stats = await fs.stat(storedPath);
    
    return {
      success: true,
      publicUrl: mockUrl,
      path: storedPath,
      size: stats.size,
    };
  } catch (error) {
    console.error('Mock avatar processing error:', error);
    throw error;
  }
}

/**
 * Validate image file (mock)
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

    // Use sharp to validate it's a real image
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
 * Compress and optimize image (mock)
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
    console.error('Mock image compression error:', error);
    throw error;
  }
}

/**
 * Get image metadata (mock)
 * @param {string} filePath - File path or buffer
 * @returns {Promise<Object>} Image metadata
 */
async function getImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const stats = await fs.stat(filePath);
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
    };
  } catch (error) {
    console.error('Error getting mock image metadata:', error);
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
