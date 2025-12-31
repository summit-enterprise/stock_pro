/**
 * Services Index
 * Centralized service loader that can switch between real and mock services
 * based on environment variables
 * 
 * Organization:
 * - infrastructure/ - Storage, billing, cloud services
 * - general/ - News, logos (used by all asset types)
 * - stocks/ - Stock-specific services (dividends, filings, ratings)
 * - crypto/ - Crypto-specific services (crypto data, prices, metadata)
 * - utils/ - Utility services (asset generator, mock data)
 */

const USE_MOCK_SERVICES = process.env.USE_MOCK_SERVICES === 'true' || 
                          process.env.NODE_ENV === 'local';

// Service loader function
function loadService(servicePath) {
  if (USE_MOCK_SERVICES) {
    // Try to load from mockservices first
    try {
      return require(`../mockservices/${servicePath}`);
    } catch (error) {
      // Fallback to real service if mock doesn't exist
      console.warn(`Mock service not found for ${servicePath}, using real service`);
      return require(`./${servicePath}`);
    }
  }
  // Load real service
  return require(`./${servicePath}`);
}

// ============================================================================
// Infrastructure Services (Storage, Billing, Cloud)
// ============================================================================
const storageService = loadService('infrastructure/storageService');
const googleCloudService = loadService('infrastructure/googleCloudService');
const gcpBillingService = loadService('infrastructure/gcpBillingService');

// ============================================================================
// General Services (Used by all asset types)
// ============================================================================
const newsService = loadService('general/newsService');
const assetNewsService = loadService('general/assetNewsService');
const logoService = loadService('general/logoService');
const youtubeService = loadService('general/youtubeService');
const trendingAssetsService = loadService('general/trendingAssetsService');
const secFilingsService = loadService('general/secFilingsService');
const imageService = loadService('general/imageService');
// RSS News Service (may not exist in all environments)
let rssNewsService = null;
try {
  rssNewsService = loadService('general/rssNewsService');
} catch (error) {
  // RSS service is optional
}

// ============================================================================
// Stock-Specific Services
// ============================================================================
const dividendService = loadService('stocks/dividendService');
const filingsService = loadService('stocks/filingsService');
const ratingsService = loadService('stocks/ratingsService');
const analystRatingsService = loadService('stocks/analystRatingsService');

// ============================================================================
// Crypto-Specific Services
// ============================================================================
const cryptoService = loadService('crypto/cryptoService');
const cryptoPriceService = loadService('crypto/cryptoPriceService');
const cryptoMarketService = loadService('crypto/cryptoMarketService');

// ============================================================================
// Utility Services
// ============================================================================
const assetGenerator = loadService('utils/assetGenerator');
const mockData = loadService('utils/mockData');

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
  trendingAssetsService,
  secFilingsService,
  rssNewsService,
  imageService,
  
  // Stocks
  dividendService,
  filingsService,
  ratingsService,
  analystRatingsService,
  
  // Crypto
  cryptoService,
  cryptoPriceService,
  cryptoMarketService,
  
  // Utils
  assetGenerator,
  mockData,
  
  // Service loader
  loadService,
};
