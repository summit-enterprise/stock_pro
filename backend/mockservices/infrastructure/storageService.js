/**
 * Mock Storage Service
 * Simulates file storage operations
 */

async function uploadFile(localFilePath, destinationPath, options = {}) {
  console.log(`[MOCK] Would upload ${localFilePath} to ${destinationPath}`);
  return {
    success: true,
    bucket: options.bucket || 'mock-bucket',
    path: destinationPath,
    publicUrl: `https://mock-storage.example.com/${destinationPath}`
  };
}

async function uploadFileCompressed(localFilePath, destinationPath, options = {}) {
  return uploadFile(localFilePath, destinationPath, options);
}

async function uploadFilesAsZip(files, zipDestinationPath, options = {}) {
  console.log(`[MOCK] Would upload ${files.length} files as ZIP to ${zipDestinationPath}`);
  return {
    success: true,
    bucket: options.bucket || 'mock-bucket',
    path: zipDestinationPath,
    publicUrl: `https://mock-storage.example.com/${zipDestinationPath}`
  };
}

async function uploadFromBuffer(buffer, destinationPath, options = {}) {
  console.log(`[MOCK] Would upload buffer to ${destinationPath}`);
  return {
    success: true,
    bucket: options.bucket || 'mock-bucket',
    path: destinationPath,
    publicUrl: `https://mock-storage.example.com/${destinationPath}`
  };
}

async function deleteFile(destinationPath, bucketName) {
  console.log(`[MOCK] Would delete ${destinationPath}`);
  return { success: true };
}

async function getFileMetadata(destinationPath, bucketName) {
  return {
    size: 1024,
    contentType: 'image/png',
    updated: new Date().toISOString()
  };
}

async function getSignedUrl(destinationPath, options = {}) {
  return {
    url: `https://mock-storage.example.com/${destinationPath}?signed=true`,
    expires: Date.now() + 3600000
  };
}

function compressImage(inputPath, outputPath, options = {}) {
  console.log(`[MOCK] Would compress ${inputPath} to ${outputPath}`);
  return {
    success: true,
    originalSize: 1024,
    compressedSize: 512,
    compressionRatio: 50,
    outputPath
  };
}

function compressToZip(files, outputPath) {
  console.log(`[MOCK] Would compress ${files.length} files to ${outputPath}`);
  return Promise.resolve({
    success: true,
    size: 1024,
    outputPath
  });
}

function compressGzip(inputPath, outputPath) {
  console.log(`[MOCK] Would gzip ${inputPath} to ${outputPath}`);
  return Promise.resolve({
    success: true,
    originalSize: 1024,
    compressedSize: 512,
    compressionRatio: 50,
    outputPath
  });
}

function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'json': 'application/json',
    'txt': 'text/plain',
    'csv': 'text/csv'
  };
  return types[ext] || 'application/octet-stream';
}

const DEFAULT_BUCKET = 'mock-bucket';

module.exports = {
  uploadFile,
  uploadFileCompressed,
  uploadFilesAsZip,
  uploadFromBuffer,
  compressImage,
  compressToZip,
  compressGzip,
  deleteFile,
  getFileMetadata,
  getSignedUrl,
  getContentType,
  DEFAULT_BUCKET
};

