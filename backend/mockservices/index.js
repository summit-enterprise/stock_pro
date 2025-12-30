/**
 * Mock Services Index
 * Centralized mock service loader
 * 
 * Organization matches services/ structure:
 * - infrastructure/ - Mock storage, billing, cloud services
 * - general/ - Mock news, logos
 * - stocks/ - Mock stock-specific services
 * - crypto/ - Mock crypto-specific services
 * - utils/ - Mock utility services
 */

// ============================================================================
// Infrastructure Services (Mock)
// ============================================================================
const storageService = require('./infrastructure/storageService');
const googleCloudService = require('./infrastructure/googleCloudService');
const gcpBillingService = require('./infrastructure/gcpBillingService');

// ============================================================================
// General Services (Mock)
// ============================================================================
const newsService = require('./general/newsService');
const assetNewsService = require('./general/assetNewsService');
const logoService = require('./general/logoService');
const youtubeService = require('./general/youtubeService');

// ============================================================================
// Stock-Specific Services (Mock)
// ============================================================================
const dividendService = require('./stocks/dividendService');
const filingsService = require('./stocks/filingsService');
const ratingsService = require('./stocks/ratingsService');
const analystRatingsService = require('./stocks/analystRatingsService');

// ============================================================================
// Crypto-Specific Services (Mock)
// ============================================================================
const cryptoService = require('./crypto/cryptoService');
const cryptoPriceService = require('./crypto/cryptoPriceService');

// ============================================================================
// Utility Services (Mock)
// ============================================================================
const assetGenerator = require('./utils/assetGenerator');
const mockData = require('./utils/mockData');

module.exports = {
  // Infrastructure
  storageService,
  googleCloudService,
  gcpBillingService,
  
  // General
  newsService,
  assetNewsService,
  logoService,
  youtubeService,
  
  // Stocks
  dividendService,
  filingsService,
  ratingsService,
  analystRatingsService,
  
  // Crypto
  cryptoService,
  cryptoPriceService,
  
  // Utils
  assetGenerator,
  mockData,
};
