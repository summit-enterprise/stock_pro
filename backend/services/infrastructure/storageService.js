/**
 * Google Cloud Storage Service
 * Handles file uploads, compression, and asset management
 */

const { getBucket, ensureBucket } = require('./googleCloudService');
const { getBucketName } = require('../../utils/bucketConfig');
const archiver = require('archiver');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { createReadStream, createWriteStream } = require('fs');

// Default bucket name from environment
const DEFAULT_BUCKET = getBucketName();

/**
 * Compression options
 */
const COMPRESSION_OPTIONS = {
  // Image compression
  image: {
    jpeg: { quality: 85, progressive: true },
    png: { quality: 85, compressionLevel: 9 },
    webp: { quality: 85 },
  },
  // Archive compression
  archive: {
    zip: { level: 9 },
    gzip: { level: 9 },
  },
};

/**
 * Compress an image file
 */
async function compressImage(inputPath, outputPath, options = {}) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    const format = ext.replace('.', '');

    let image = sharp(inputPath);

    // Resize if max dimensions provided
    if (options.maxWidth || options.maxHeight) {
      image = image.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific compression
    switch (format) {
      case 'jpg':
      case 'jpeg':
        await image
          .jpeg(COMPRESSION_OPTIONS.image.jpeg)
          .toFile(outputPath);
        break;
      case 'png':
        await image
          .png(COMPRESSION_OPTIONS.image.png)
          .toFile(outputPath);
        break;
      case 'webp':
        await image
          .webp(COMPRESSION_OPTIONS.image.webp)
          .toFile(outputPath);
        break;
      default:
        // For other formats, just copy with minimal processing
        await image.toFile(outputPath);
    }

    const originalSize = (await fs.stat(inputPath)).size;
    const compressedSize = (await fs.stat(outputPath)).size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

    console.log(`Image compressed: ${compressionRatio}% reduction (${originalSize} → ${compressedSize} bytes)`);

    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      outputPath,
    };
  } catch (error) {
    console.error('Image compression error:', error.message);
    throw error;
  }
}

/**
 * Compress files into a ZIP archive
 */
async function compressToZip(files, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: COMPRESSION_OPTIONS.archive.zip.level },
    });

    output.on('close', () => {
      resolve({
        success: true,
        size: archive.pointer(),
        outputPath,
      });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add files to archive
    files.forEach((file) => {
      if (typeof file === 'string') {
        // File path
        archive.file(file, { name: path.basename(file) });
      } else {
        // File object with path and name
        archive.file(file.path, { name: file.name || path.basename(file.path) });
      }
    });

    archive.finalize();
  });
}

/**
 * Compress a single file with gzip
 */
async function compressGzip(inputPath, outputPath) {
  const { createGzip } = require('zlib');
  const { createReadStream, createWriteStream } = require('fs');

  return new Promise((resolve, reject) => {
    const gzip = createGzip({ level: COMPRESSION_OPTIONS.archive.gzip.level });
    const source = createReadStream(inputPath);
    const destination = createWriteStream(outputPath);

    source
      .pipe(gzip)
      .pipe(destination)
      .on('finish', async () => {
        const originalSize = (await fs.stat(inputPath)).size;
        const compressedSize = (await fs.stat(outputPath)).size;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

        resolve({
          success: true,
          originalSize,
          compressedSize,
          compressionRatio: parseFloat(compressionRatio),
          outputPath,
        });
      })
      .on('error', reject);
  });
}

/**
 * Upload a file to Google Cloud Storage
 */
async function uploadFile(
  localFilePath,
  destinationPath,
  options = {}
) {
  try {
    const bucketName = options.bucket || DEFAULT_BUCKET;
    const bucket = await ensureBucket(bucketName);

    // Set metadata
    const metadata = {
      contentType: options.contentType || getContentType(localFilePath),
      cacheControl: options.cacheControl || 'public, max-age=3600',
      metadata: {
        uploadedAt: new Date().toISOString(),
        ...options.metadata,
      },
    };

    // Upload file
    await bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata,
      ...options.uploadOptions,
    });

    // Make file publicly accessible if requested
    // Note: If uniform bucket-level access is enabled, we can't set individual file ACLs
    if (options.public) {
      try {
        await bucket.file(destinationPath).makePublic();
      } catch (error) {
        // If uniform bucket-level access is enabled, this will fail
        // In that case, we'll use the bucket's IAM policy for public access
        if (error.message && error.message.includes('uniform bucket-level access')) {
          console.warn(`⚠️  Cannot set file ACL (uniform bucket-level access enabled). File will use bucket IAM policy.`);
        } else {
          throw error;
        }
      }
    }

    const publicUrl = options.public
      ? `https://storage.googleapis.com/${bucketName}/${destinationPath}`
      : null;

    console.log(`✅ Uploaded: ${destinationPath} to bucket: ${bucketName}`);

    return {
      success: true,
      bucket: bucketName,
      path: destinationPath,
      publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error.message);
    throw error;
  }
}

/**
 * Upload file with compression
 */
async function uploadFileCompressed(
  localFilePath,
  destinationPath,
  options = {}
) {
  try {
    const tempDir = options.tempDir || path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });

    const ext = path.extname(localFilePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    const compressType = options.compressType || (isImage ? 'image' : 'gzip');

    let compressedPath;
    let compressionResult;

    // Compress based on type
    if (compressType === 'image' && isImage) {
      const compressedName = `compressed_${Date.now()}${ext}`;
      compressedPath = path.join(tempDir, compressedName);
      compressionResult = await compressImage(localFilePath, compressedPath, options.imageOptions);
    } else if (compressType === 'gzip') {
      const compressedName = `${path.basename(localFilePath)}.gz`;
      compressedPath = path.join(tempDir, compressedName);
      compressionResult = await compressGzip(localFilePath, compressedPath);
      // Update destination path to include .gz extension
      destinationPath = `${destinationPath}.gz`;
    } else {
      // No compression, upload as-is
      return await uploadFile(localFilePath, destinationPath, options);
    }

    // Upload compressed file
    const uploadResult = await uploadFile(compressedPath, destinationPath, {
      ...options,
      contentType: compressType === 'gzip' ? 'application/gzip' : options.contentType,
    });

    // Clean up temporary file
    try {
      await fs.unlink(compressedPath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }

    return {
      ...uploadResult,
      compression: compressionResult,
    };
  } catch (error) {
    console.error('Compressed upload error:', error.message);
    throw error;
  }
}

/**
 * Upload multiple files as a ZIP archive
 */
async function uploadFilesAsZip(
  files,
  zipDestinationPath,
  options = {}
) {
  try {
    const tempDir = options.tempDir || path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, `archive_${Date.now()}.zip`);

    // Create ZIP archive
    const zipResult = await compressToZip(files, zipPath);

    // Upload ZIP file
    const uploadResult = await uploadFile(zipPath, zipDestinationPath, {
      ...options,
      contentType: 'application/zip',
    });

    // Clean up temporary ZIP file
    try {
      await fs.unlink(zipPath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp ZIP file:', cleanupError.message);
    }

    return {
      ...uploadResult,
      compression: zipResult,
    };
  } catch (error) {
    console.error('ZIP upload error:', error.message);
    throw error;
  }
}

/**
 * Upload from buffer/stream
 */
async function uploadFromBuffer(
  buffer,
  destinationPath,
  options = {}
) {
  try {
    const bucketName = options.bucket || DEFAULT_BUCKET;
    const bucket = await ensureBucket(bucketName);

    const file = bucket.file(destinationPath);

    const metadata = {
      contentType: options.contentType || 'application/octet-stream',
      cacheControl: options.cacheControl || 'public, max-age=3600',
      metadata: {
        uploadedAt: new Date().toISOString(),
        ...options.metadata,
      },
    };

    await file.save(buffer, { metadata });

    // Make file publicly accessible if requested
    // Note: If uniform bucket-level access is enabled, we can't set individual file ACLs
    // In that case, the bucket's IAM policy controls access
    if (options.public) {
      try {
        await file.makePublic();
      } catch (error) {
        // If uniform bucket-level access is enabled, this will fail
        // In that case, we'll use the bucket's IAM policy for public access
        if (error.message && error.message.includes('uniform bucket-level access')) {
          console.warn(`⚠️  Cannot set file ACL (uniform bucket-level access enabled). File will use bucket IAM policy.`);
        } else {
          throw error;
        }
      }
    }

    // For uniform bucket-level access, public files are accessible via direct URL
    // if the bucket has public IAM policy. Otherwise, use signed URLs.
    const publicUrl = options.public
      ? `https://storage.googleapis.com/${bucketName}/${destinationPath}`
      : null;

    console.log(`✅ Uploaded buffer to: ${destinationPath} in bucket: ${bucketName}`);

    return {
      success: true,
      bucket: bucketName,
      path: destinationPath,
      publicUrl,
    };
  } catch (error) {
    console.error('Buffer upload error:', error.message);
    throw error;
  }
}

/**
 * Delete a file from storage
 */
async function deleteFile(destinationPath, bucketName = DEFAULT_BUCKET) {
  try {
    const bucket = await getBucket(bucketName);
    await bucket.file(destinationPath).delete();
    console.log(`✅ Deleted: ${destinationPath} from bucket: ${bucketName}`);
    return { success: true, path: destinationPath };
  } catch (error) {
    console.error('Delete error:', error.message);
    throw error;
  }
}

/**
 * Get file metadata
 */
async function getFileMetadata(destinationPath, bucketName = DEFAULT_BUCKET) {
  try {
    const bucket = await getBucket(bucketName);
    const [metadata] = await bucket.file(destinationPath).getMetadata();
    return metadata;
  } catch (error) {
    console.error('Get metadata error:', error.message);
    throw error;
  }
}

/**
 * Generate signed URL for private file access
 */
async function getSignedUrl(
  destinationPath,
  options = {}
) {
  try {
    // Use environment-specific bucket (local/dev/prod)
    const bucketName = options.bucket || DEFAULT_BUCKET;
    const { getCurrentEnvironment } = require('../../utils/bucketConfig');
    const currentEnv = getCurrentEnvironment();
    
    console.log(`[STORAGE] Generating signed URL for ${currentEnv} environment, bucket: ${bucketName}, path: ${destinationPath}`);
    
    const bucket = await getBucket(bucketName);
    const file = bucket.file(destinationPath);

    const expiresIn = options.expires || Date.now() + 60 * 60 * 1000; // 1 hour default
    
    // Check if file exists first
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${destinationPath}`);
    }

    // Try to get signed URL
    // Note: Signed URLs require service account credentials with client_email
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresIn,
    });

    return { url, expires: expiresIn };
  } catch (error) {
    // If signing fails due to missing credentials, provide helpful error
    if (error.message && error.message.includes('client_email')) {
      const errorMsg = 'GCP authentication error: Cannot generate signed URLs without service account credentials. ' +
        'Please set up GCP credentials using one of these methods:\n' +
        '1. Set GOOGLE_APPLICATION_CREDENTIALS to path of service account key file (RECOMMENDED)\n' +
        '   Service Account: stock-pro-svc@project-finance-482417.iam.gserviceaccount.com\n' +
        '2. Set GCP_SERVICE_ACCOUNT_KEY to service account JSON string\n' +
        '3. For production on GCP, attach service account to Cloud Run/GKE/Compute Engine';
      console.error('Signed URL error:', errorMsg);
      throw new Error(errorMsg);
    }
    console.error('Signed URL error:', error.message);
    throw error;
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.gz': 'application/gzip',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

module.exports = {
  // Upload functions
  uploadFile,
  uploadFileCompressed,
  uploadFilesAsZip,
  uploadFromBuffer,

  // Compression functions
  compressImage,
  compressToZip,
  compressGzip,

  // File management
  deleteFile,
  getFileMetadata,
  getSignedUrl,

  // Utility
  getContentType,
  DEFAULT_BUCKET,
};

