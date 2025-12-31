/**
 * Storage API Routes
 * Handles file uploads to Google Cloud Storage
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const { storageService } = require('../services');

// Protect all storage routes
router.use(verifyToken);

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../temp/uploads'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp/uploads');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

/**
 * Upload a single file (with optional compression)
 * POST /api/storage/upload
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      destination = 'uploads',
      compress = 'false',
      compressType = 'auto',
      public: makePublic = 'false',
      maxWidth,
      maxHeight,
    } = req.body;

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const destinationPath = `${destination}/${timestamp}_${baseName}${ext}`;

    let result;

    if (compress === 'true') {
      // Upload with compression
      result = await storageService.uploadFileCompressed(filePath, destinationPath, {
        compressType: compressType === 'auto' ? undefined : compressType,
        public: makePublic === 'true',
        imageOptions: {
          maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
          maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
        },
      });
    } else {
      // Upload without compression
      result = await storageService.uploadFile(filePath, destinationPath, {
        public: makePublic === 'true',
      });
    }

    // Clean up uploaded temp file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }

    res.json({
      success: true,
      ...result,
      originalName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

/**
 * Upload multiple files as ZIP archive
 * POST /api/storage/upload-zip
 */
router.post('/upload-zip', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const {
      destination = 'uploads',
      zipName = `archive_${Date.now()}.zip`,
      public: makePublic = 'false',
    } = req.body;

    const files = req.files.map((file) => ({
      path: file.path,
      name: file.originalname,
    }));

    const destinationPath = `${destination}/${zipName}`;

    const result = await storageService.uploadFilesAsZip(files, destinationPath, {
      public: makePublic === 'true',
    });

    // Clean up uploaded temp files
    for (const file of req.files) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
      }
    }

    res.json({
      success: true,
      ...result,
      fileCount: files.length,
    });
  } catch (error) {
    console.error('ZIP upload error:', error);
    res.status(500).json({ error: 'ZIP upload failed', message: error.message });
  }
});

/**
 * Delete a file
 * DELETE /api/storage?path=file/path/to/delete
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    const filePath = req.query.path;
    const { bucket } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required (use ?path=...)' });
    }

    await storageService.deleteFile(filePath, bucket);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', message: error.message });
  }
});

/**
 * Get file metadata
 * GET /api/storage/metadata
 */
router.get('/metadata', verifyToken, async (req, res) => {
  try {
    const filePath = req.query.path;
    const { bucket } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const metadata = await storageService.getFileMetadata(filePath, bucket);

    res.json({ success: true, metadata });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ error: 'Failed to get metadata', message: error.message });
  }
});

/**
 * Get signed URL for private file
 * GET /api/storage/signed-url
 */
router.get('/signed-url', verifyToken, async (req, res) => {
  try {
    const filePath = req.query.path;
    const { bucket, expires } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const expiresTime = expires ? parseInt(expires) : Date.now() + 60 * 60 * 1000; // 1 hour default

    const result = await storageService.getSignedUrl(filePath, {
      bucket,
      expires: expiresTime,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL', message: error.message });
  }
});

module.exports = router;

