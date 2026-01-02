/**
 * Mock Google Cloud Service
 * Simulates GCP service initialization
 */

async function getBucket(bucketName) {
  console.log(`[MOCK] Would get bucket: ${bucketName}`);
  return {
    name: bucketName,
    exists: async () => [true],
    create: async () => ({ success: true }),
    makePublic: async () => ({ success: true })
  };
}

async function ensureBucket(bucketName) {
  console.log(`[MOCK] Would ensure bucket exists: ${bucketName}`);
  return await getBucket(bucketName);
}

function getStorageClient() {
  console.log('[MOCK] Would create GCP Storage client');
  return {
    bucket: async (name) => await getBucket(name)
  };
}

module.exports = {
  getBucket,
  ensureBucket,
  getStorageClient
};



