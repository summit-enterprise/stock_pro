/**
 * Google Cloud Platform Service
 * Centralized service for connecting to and using Google Cloud services
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const sharp = require('sharp');

// Initialize Google Cloud Storage client
let storageClient = null;
let isInitialized = false;

/**
 * Initialize Google Cloud Storage client
 * Supports multiple authentication methods (in order of priority):
 * 1. Service account key file (GOOGLE_APPLICATION_CREDENTIALS) - RECOMMENDED
 *    - Service Account: stock-pro-svc@project-finance-482417.iam.gserviceaccount.com
 *    - Provides full access including signed URL generation
 * 2. Service account JSON in env variable (GCP_SERVICE_ACCOUNT_KEY)
 * 3. Application Default Credentials (ADC) - Fallback
 *    - Uses gcloud auth application-default login
 *    - Works with user accounts and service account impersonation
 *    - Automatically detected by Google Cloud SDK
 * 4. Default credentials (if running on GCP - Cloud Run, Compute Engine, etc.)
 *    - Uses attached service account automatically
 */
async function initializeGCP() {
  if (isInitialized && storageClient) {
    return storageClient;
  }

  try {
    let storageOptions = {};
    let authMethod = '';

    // Method 1: Service account key file path (RECOMMENDED)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const keyPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      storageOptions.keyFilename = keyPath;
      authMethod = 'Service Account Key File (stock-pro-svc@project-finance-482417.iam.gserviceaccount.com)';
      console.log(`GCP: Using ${authMethod}`);
      console.log(`  → Key file: ${keyPath}`);
    }
    // Method 2: Service account JSON from environment variable
    else if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const keyData = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
        storageOptions.credentials = keyData;
        authMethod = 'Service Account JSON (Environment Variable)';
        console.log(`GCP: Using ${authMethod}`);
      } catch (parseError) {
        console.error('GCP: Failed to parse GCP_SERVICE_ACCOUNT_KEY:', parseError.message);
        throw new Error('Invalid GCP_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
      }
    }
    // Method 3: Application Default Credentials (ADC) - Fallback
    // This will automatically use credentials from:
    // - Service account attached to Cloud Run/GKE/Compute Engine (metadata server)
    // - gcloud auth application-default login (for local dev without key file)
    // - GOOGLE_APPLICATION_CREDENTIALS environment variable
    else {
      authMethod = 'Application Default Credentials (ADC)';
      console.log(`GCP: Using ${authMethod}`);
      console.log('  → Will use credentials from:');
      console.log('    - GCP metadata server (if on GCP with attached service account)');
      console.log('    - gcloud auth application-default login (local dev fallback)');
      console.log('  ⚠️  Note: For signed URLs, use service account key file (Method 1)');
      // No explicit credentials needed - SDK will auto-detect
    }

    // Project ID from environment or credentials
    if (process.env.GCP_PROJECT_ID) {
      storageOptions.projectId = process.env.GCP_PROJECT_ID;
      console.log(`GCP: Project ID: ${process.env.GCP_PROJECT_ID}`);
    }

    storageClient = new Storage(storageOptions);
    isInitialized = true;
    
    console.log(`✅ Google Cloud Storage initialized successfully (${authMethod})`);
    return storageClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Cloud Storage:', error.message);
    console.error('💡 Tip: Set GOOGLE_APPLICATION_CREDENTIALS to service account key file path');
    console.error('   Service Account: stock-pro-svc@project-finance-482417.iam.gserviceaccount.com');
    throw error;
  }
}

/**
 * Get or initialize the storage client
 */
async function getStorageClient() {
  if (!storageClient || !isInitialized) {
    await initializeGCP();
  }
  return storageClient;
}

/**
 * Get a bucket reference
 */
async function getBucket(bucketName) {
  const storage = await getStorageClient();
  return storage.bucket(bucketName);
}

/**
 * Check if bucket exists
 */
async function bucketExists(bucketName) {
  try {
    const bucket = await getBucket(bucketName);
    const [exists] = await bucket.exists();
    return exists;
  } catch (error) {
    console.error(`Error checking bucket existence: ${bucketName}:`, error.message);
    return false;
  }
}

/**
 * Create a bucket if it doesn't exist
 */
async function ensureBucket(bucketName, options = {}) {
  try {
    const exists = await bucketExists(bucketName);
    if (exists) {
      console.log(`Bucket ${bucketName} already exists`);
      return await getBucket(bucketName);
    }

    const storage = await getStorageClient();
    const [bucket] = await storage.createBucket(bucketName, {
      location: options.location || 'US',
      storageClass: options.storageClass || 'STANDARD',
      ...options,
    });
    
    console.log(`✅ Created bucket: ${bucketName}`);
    return bucket;
  } catch (error) {
    console.error(`Error creating bucket ${bucketName}:`, error.message);
    throw error;
  }
}

module.exports = {
  initializeGCP,
  getStorageClient,
  getBucket,
  bucketExists,
  ensureBucket,
  // Export for other services to use
  Storage,
};

