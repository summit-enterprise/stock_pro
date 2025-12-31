/**
 * Image Proxy Routes
 * Serves avatar images for mock mode, GCP private images, and placeholder images
 */

const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { storageService } = require('../services');

const MOCK_AVATAR_DIR = path.join(__dirname, '../temp/avatars_stored');
const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES === 'true' || 
                          process.env.NODE_ENV === 'local';

/**
 * Serve avatar image (mock mode) or generate placeholder
 * GET /api/image/avatar/:filename
 */
router.get('/avatar/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const width = parseInt(req.query.w) || undefined;
    const height = parseInt(req.query.h) || undefined;
    const format = req.query.format || 'webp';
    
    console.log(`[IMAGE] Serving avatar: ${filename}, width: ${width}, height: ${height}, format: ${format}`);
    
    // In mock mode, try to serve stored image first
    if (USE_MOCK_SERVICES) {
      const storedPath = path.join(MOCK_AVATAR_DIR, filename);
      try {
        await fs.access(storedPath);
        console.log(`[MOCK] Found avatar file: ${storedPath}`);
        // File exists, serve it
        let image = sharp(storedPath);
        
        // Resize if requested
        if (width || height) {
          image = image.resize(width, height, {
            fit: 'cover',
            position: 'center',
            withoutEnlargement: true,
          });
        }
        
        // Convert to requested format
        const buffer = await image.toFormat(format).toBuffer();
        
        res.setHeader('Content-Type', `image/${format}`);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(buffer);
        return;
      } catch (fileError) {
        // File doesn't exist, fall through to generate placeholder
        console.log(`[MOCK] Avatar file not found: ${storedPath}, error: ${fileError.message}, generating placeholder`);
      }
    }
    
    // Generate placeholder avatar
    const userId = filename.split('_')[0];
    const placeholderWidth = width || 400;
    const placeholderHeight = height || 400;
    
    // Create a simple colored circle with user ID
    const svg = `
      <svg width="${placeholderWidth}" height="${placeholderHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="${placeholderWidth/2}" cy="${placeholderHeight/2}" r="${Math.min(placeholderWidth, placeholderHeight)/2 - 2}" fill="url(#grad)" />
        <text x="${placeholderWidth/2}" y="${placeholderHeight/2}" font-family="Arial, sans-serif" font-size="${placeholderWidth/3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${userId}</text>
      </svg>
    `;
    
    // Convert SVG to requested format
    const buffer = await sharp(Buffer.from(svg))
      .resize(placeholderWidth, placeholderHeight)
      .toFormat(format)
      .toBuffer();
    
    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Shorter cache for placeholders
    res.send(buffer);
  } catch (error) {
    console.error('Error serving avatar image:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    // Return a proper error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve image', message: error.message });
    }
  }
});

/**
 * Serve private GCP images (public route, but GCP bucket is private)
 * This route is public because Next.js Image component cannot send auth headers.
 * The GCP bucket itself remains private - we generate signed URLs server-side.
 * GET /api/image/gcp/*
 * 
 * Note: Using regex pattern for Express 5.x compatibility
 * Express 5.x path-to-regexp doesn't support wildcard syntax, so we use regex
 */
router.get(/^\/gcp\/(.+)$/, async (req, res) => {
  try {
    // Extract file path from regex match
    // The regex captures everything after /gcp/
    const match = req.path.match(/^\/gcp\/(.+)$/);
    const filePath = match ? match[1] : '';
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const width = parseInt(req.query.w) || undefined;
    const height = parseInt(req.query.h) || undefined;
    const format = req.query.format || 'webp';

    // Get signed URL for private file (valid for 1 hour)
    const signedUrlResult = await storageService.getSignedUrl(filePath, {
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Fetch the image from GCP using signed URL
    const imageResponse = await axios.get(signedUrlResult.url, {
      responseType: 'arraybuffer',
    });
    
    const imageBuffer = Buffer.from(imageResponse.data);

    // Resize if requested
    let processedBuffer = imageBuffer;
    if (width || height) {
      let image = sharp(imageBuffer);
      processedBuffer = await image
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true,
        })
        .toFormat(format)
        .toBuffer();
    } else if (format !== 'webp') {
      // Convert format if needed
      processedBuffer = await sharp(imageBuffer)
        .toFormat(format)
        .toBuffer();
    }

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(processedBuffer);
  } catch (error) {
    console.error('Error serving GCP image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

module.exports = router;

