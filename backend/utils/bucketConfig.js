/**
 * GCP Bucket Configuration
 * Determines the correct bucket name based on environment
 */

/**
 * Get the bucket name for the current environment
 * @returns {string} Bucket name
 */
function getBucketName() {
  // If explicitly set, use that
  if (process.env.GCP_STORAGE_BUCKET) {
    return process.env.GCP_STORAGE_BUCKET;
  }

  // Determine based on NODE_ENV
  const env = process.env.NODE_ENV || 'local';
  
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return 'stock-app-assets-prod';
    
    case 'development':
    case 'dev':
      return 'stock-app-assets-dev';
    
    case 'local':
    default:
      return 'stock-app-assets';
  }
}

/**
 * Get all bucket names for all environments
 * @returns {Object} Bucket names by environment
 */
function getAllBucketNames() {
  return {
    local: 'stock-app-assets',
    dev: 'stock-app-assets-dev',
    prod: 'stock-app-assets-prod',
  };
}

/**
 * Get current environment
 * @returns {string} Environment name
 */
function getCurrentEnvironment() {
  const env = process.env.NODE_ENV || 'local';
  
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return 'prod';
    
    case 'development':
    case 'dev':
      return 'dev';
    
    case 'local':
    default:
      return 'local';
  }
}

module.exports = {
  getBucketName,
  getAllBucketNames,
  getCurrentEnvironment,
};


