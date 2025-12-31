/**
 * Populate API Providers and Application Services
 * This script scans the codebase and populates tables with all APIs and services used
 */

require('dotenv').config();
const { pool, initDb } = require('../db');

// All API providers used in the application
const API_PROVIDERS = [
  {
    provider_key: 'polygon',
    provider_name: 'Polygon.io',
    base_url: 'https://api.polygon.io',
    api_key_env_var: 'POLYGON_API_KEY',
    quota_limit: 5000000,
    quota_period: 'monthly',
    quota_units_per_call: 1,
    documentation_url: 'https://polygon.io/docs',
    description: 'Stock market data, dividends, filings, analyst ratings',
    status: 'active',
  },
  {
    provider_key: 'newsapi',
    provider_name: 'NewsAPI',
    base_url: 'https://newsapi.org',
    api_key_env_var: 'NEWS_API_KEY',
    quota_limit: 100,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://newsapi.org/docs',
    description: 'Financial news articles',
    status: 'active',
  },
  {
    provider_key: 'finnhub',
    provider_name: 'Finnhub',
    base_url: 'https://finnhub.io',
    api_key_env_var: 'FINNHUB_API_KEY',
    quota_limit: 60,
    quota_period: 'minute',
    quota_units_per_call: 1,
    documentation_url: 'https://finnhub.io/docs',
    description: 'Stock logos, company data',
    status: 'active',
  },
  {
    provider_key: 'coingecko',
    provider_name: 'CoinGecko',
    base_url: 'https://api.coingecko.com',
    api_key_env_var: 'COINGECKO_API_KEY',
    quota_limit: 50,
    quota_period: 'minute',
    quota_units_per_call: 1,
    documentation_url: 'https://www.coingecko.com/api/documentation',
    description: 'Cryptocurrency data, prices, logos',
    status: 'active',
  },
  {
    provider_key: 'youtube',
    provider_name: 'YouTube Data API',
    base_url: 'https://www.googleapis.com/youtube/v3',
    api_key_env_var: 'YOUTUBE_API_KEY',
    quota_limit: 10000,
    quota_period: 'daily',
    quota_units_per_call: 100,
    documentation_url: 'https://developers.google.com/youtube/v3',
    description: 'YouTube live stream status and video data',
    status: 'active',
  },
  {
    provider_key: 'alphavantage',
    provider_name: 'Alpha Vantage',
    base_url: 'https://www.alphavantage.co',
    api_key_env_var: 'ALPHA_VANTAGE_API_KEY',
    quota_limit: 25,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://www.alphavantage.co/documentation',
    description: 'Stock data, dividends, analyst ratings',
    status: 'active',
  },
  {
    provider_key: 'coinmarketcap',
    provider_name: 'CoinMarketCap',
    base_url: 'https://pro-api.coinmarketcap.com',
    api_key_env_var: 'COINMARKETCAP_API_KEY',
    quota_limit: 333,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://coinmarketcap.com/api/documentation',
    description: 'Cryptocurrency market data',
    status: 'active',
  },
  {
    provider_key: 'financialmodelingprep',
    provider_name: 'Financial Modeling Prep',
    base_url: 'https://financialmodelingprep.com',
    api_key_env_var: 'FINANCIAL_MODELING_PREP_API_KEY',
    quota_limit: 250,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://site.financialmodelingprep.com/developer/docs',
    description: 'Stock logos and company data',
    status: 'active',
  },
  {
    provider_key: 'sec',
    provider_name: 'SEC EDGAR',
    base_url: 'https://www.sec.gov',
    api_key_env_var: null,
    quota_limit: 10,
    quota_period: 'second',
    quota_units_per_call: 1,
    documentation_url: 'https://www.sec.gov/edgar/sec-api-documentation',
    description: 'SEC filings (13F, 10-K, 10-Q, etc.)',
    status: 'active',
  },
  {
    provider_key: 'clearbit',
    provider_name: 'Clearbit Logo API',
    base_url: 'https://logo.clearbit.com',
    api_key_env_var: null,
    quota_limit: null,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://clearbit.com/docs#logo-api',
    description: 'Company logos by domain',
    status: 'active',
  },
  {
    provider_key: 'googlecloud',
    provider_name: 'Google Cloud Platform',
    base_url: 'https://cloud.google.com',
    api_key_env_var: 'GOOGLE_APPLICATION_CREDENTIALS',
    quota_limit: null,
    quota_period: 'daily',
    quota_units_per_call: 1,
    documentation_url: 'https://cloud.google.com/docs',
    description: 'Cloud Storage, Billing API',
    status: 'active',
  },
];

// All application services
const APPLICATION_SERVICES = [
  // Infrastructure Services
  {
    service_key: 'storageService',
    service_name: 'Storage Service',
    service_type: 'infrastructure',
    service_category: 'storage',
    description: 'Google Cloud Storage operations for asset uploads and logo storage',
    file_path: 'services/infrastructure/storageService.js',
    status: 'active',
  },
  {
    service_key: 'googleCloudService',
    service_name: 'Google Cloud Service',
    service_type: 'infrastructure',
    service_category: 'cloud',
    description: 'Google Cloud Platform integration and authentication',
    file_path: 'services/infrastructure/googleCloudService.js',
    status: 'active',
  },
  {
    service_key: 'gcpBillingService',
    service_name: 'GCP Billing Service',
    service_type: 'infrastructure',
    service_category: 'billing',
    description: 'Google Cloud billing data sync and usage tracking',
    file_path: 'services/infrastructure/gcpBillingService.js',
    status: 'active',
  },
  // General Services
  {
    service_key: 'newsService',
    service_name: 'News Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches financial news from NewsAPI',
    file_path: 'services/general/newsService.js',
    status: 'active',
  },
  {
    service_key: 'assetNewsService',
    service_name: 'Asset News Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches news specific to assets (stocks, crypto)',
    file_path: 'services/general/assetNewsService.js',
    status: 'active',
  },
  {
    service_key: 'logoService',
    service_name: 'Logo Service',
    service_type: 'general',
    service_category: 'asset_processing',
    description: 'Fetches and stores asset logos from multiple APIs',
    file_path: 'services/general/logoService.js',
    status: 'active',
  },
  {
    service_key: 'youtubeService',
    service_name: 'YouTube Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches YouTube live stream status and video data',
    file_path: 'services/general/youtubeService.js',
    status: 'active',
  },
  {
    service_key: 'newsStreamService',
    service_name: 'News Stream Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches live stream URLs from news networks',
    file_path: 'services/general/newsStreamService.js',
    status: 'active',
  },
  {
    service_key: 'apiTrackingService',
    service_name: 'API Tracking Service',
    service_type: 'general',
    service_category: 'monitoring',
    description: 'Tracks API calls and quota usage',
    file_path: 'services/general/apiTrackingService.js',
    status: 'active',
  },
  {
    service_key: 'serviceHealthService',
    service_name: 'Service Health Service',
    service_type: 'general',
    service_category: 'monitoring',
    description: 'Monitors health and status of application services',
    file_path: 'services/general/serviceHealthService.js',
    status: 'active',
  },
  // Stock Services
  {
    service_key: 'dividendService',
    service_name: 'Dividend Service',
    service_type: 'stocks',
    service_category: 'data_fetching',
    description: 'Fetches dividend data from Polygon.io',
    file_path: 'services/stocks/dividendService.js',
    status: 'active',
  },
  {
    service_key: 'filingsService',
    service_name: 'Filings Service',
    service_type: 'stocks',
    service_category: 'data_fetching',
    description: 'Fetches SEC filings data',
    file_path: 'services/stocks/filingsService.js',
    status: 'active',
  },
  {
    service_key: 'ratingsService',
    service_name: 'Ratings Service',
    service_type: 'stocks',
    service_category: 'data_fetching',
    description: 'Fetches analyst ratings from Polygon.io',
    file_path: 'services/stocks/ratingsService.js',
    status: 'active',
  },
  {
    service_key: 'analystRatingsService',
    service_name: 'Analyst Ratings Service',
    service_type: 'stocks',
    service_category: 'data_fetching',
    description: 'Fetches detailed analyst ratings and consensus',
    file_path: 'services/stocks/analystRatingsService.js',
    status: 'active',
  },
  // Crypto Services
  {
    service_key: 'cryptoService',
    service_name: 'Crypto Service',
    service_type: 'crypto',
    service_category: 'data_fetching',
    description: 'Fetches cryptocurrency data from CoinGecko',
    file_path: 'services/crypto/cryptoService.js',
    status: 'active',
  },
  {
    service_key: 'cryptoPriceService',
    service_name: 'Crypto Price Service',
    service_type: 'crypto',
    service_category: 'data_fetching',
    description: 'Fetches historical and current crypto prices from CoinGecko',
    file_path: 'services/crypto/cryptoPriceService.js',
    status: 'active',
  },
  {
    service_key: 'marketMoversService',
    service_name: 'Market Movers Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches top gainers and losers data',
    file_path: 'services/general/marketMoversService.js',
    status: 'active',
  },
  {
    service_key: 'trendingAssetsService',
    service_name: 'Trending Assets Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Tracks and provides trending assets based on user searches',
    file_path: 'services/general/trendingAssetsService.js',
    status: 'active',
  },
  {
    service_key: 'secFilingsService',
    service_name: 'SEC Filings Service (General)',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches general SEC filings data across all assets',
    file_path: 'services/general/secFilingsService.js',
    status: 'active',
  },
  {
    service_key: 'cryptoMarketService',
    service_name: 'Crypto Market Service',
    service_type: 'crypto',
    service_category: 'data_fetching',
    description: 'Fetches comprehensive crypto market data (rank, price changes, market cap, volume)',
    file_path: 'services/crypto/cryptoMarketService.js',
    status: 'active',
  },
  {
    service_key: 'rssNewsService',
    service_name: 'RSS News Service',
    service_type: 'general',
    service_category: 'data_fetching',
    description: 'Fetches news from RSS feeds as a free alternative to paid news APIs',
    file_path: 'services/general/rssNewsService.js',
    status: 'active',
  },
  {
    service_key: 'emailService',
    service_name: 'Email Service',
    service_type: 'general',
    service_category: 'communication',
    description: 'Sends emails for user welcome, password resets, and notifications',
    file_path: 'services/general/emailService.js',
    status: 'active',
  },
  {
    service_key: 'imageService',
    service_name: 'Image Service',
    service_type: 'general',
    service_category: 'asset_processing',
    description: 'Handles image upload, compression, optimization, and storage for avatars and other images',
    file_path: 'services/general/imageService.js',
    status: 'active',
  },
];

// Service-API Mappings
const SERVICE_API_MAPPINGS = [
  // Infrastructure
  { service_key: 'storageService', api_provider_key: 'googlecloud', usage_type: 'primary', is_required: true },
  { service_key: 'googleCloudService', api_provider_key: 'googlecloud', usage_type: 'primary', is_required: true },
  { service_key: 'gcpBillingService', api_provider_key: 'googlecloud', usage_type: 'primary', is_required: true },
  // General
  { service_key: 'newsService', api_provider_key: 'newsapi', usage_type: 'primary', is_required: true },
  { service_key: 'assetNewsService', api_provider_key: 'newsapi', usage_type: 'primary', is_required: true },
  { service_key: 'logoService', api_provider_key: 'finnhub', usage_type: 'primary', is_required: false },
  { service_key: 'logoService', api_provider_key: 'polygon', usage_type: 'fallback', is_required: false },
  { service_key: 'logoService', api_provider_key: 'financialmodelingprep', usage_type: 'fallback', is_required: false },
  { service_key: 'logoService', api_provider_key: 'clearbit', usage_type: 'fallback', is_required: false },
  { service_key: 'youtubeService', api_provider_key: 'youtube', usage_type: 'primary', is_required: true },
  // Stocks
  { service_key: 'dividendService', api_provider_key: 'polygon', usage_type: 'primary', is_required: true },
  { service_key: 'filingsService', api_provider_key: 'sec', usage_type: 'primary', is_required: true },
  { service_key: 'filingsService', api_provider_key: 'polygon', usage_type: 'fallback', is_required: false },
  { service_key: 'ratingsService', api_provider_key: 'polygon', usage_type: 'primary', is_required: true },
  { service_key: 'analystRatingsService', api_provider_key: 'polygon', usage_type: 'primary', is_required: true },
  { service_key: 'analystRatingsService', api_provider_key: 'alphavantage', usage_type: 'fallback', is_required: false },
  // Crypto
  { service_key: 'cryptoService', api_provider_key: 'coingecko', usage_type: 'primary', is_required: true },
  { service_key: 'cryptoPriceService', api_provider_key: 'coingecko', usage_type: 'primary', is_required: true },
  // General
  { service_key: 'marketMoversService', api_provider_key: 'polygon', usage_type: 'primary', is_required: false },
  { service_key: 'assetNewsService', api_provider_key: 'newsapi', usage_type: 'primary', is_required: true },
  { service_key: 'newsStreamService', api_provider_key: 'youtube', usage_type: 'fallback', is_required: false },
  { service_key: 'secFilingsService', api_provider_key: 'sec', usage_type: 'primary', is_required: true },
  { service_key: 'secFilingsService', api_provider_key: 'polygon', usage_type: 'fallback', is_required: false },
  { service_key: 'cryptoMarketService', api_provider_key: 'coingecko', usage_type: 'primary', is_required: true },
];

async function populateApisAndServices() {
  try {
    console.log('📊 Initializing database schema...');
    await initDb();
    console.log('✅ Database schema initialized\n');

    console.log('📊 Populating API providers and application services...\n');

    // Populate API Providers
    console.log('1. Populating API providers...');
    for (const api of API_PROVIDERS) {
      await pool.query(
        `INSERT INTO api_providers 
         (provider_key, provider_name, base_url, api_key_env_var, quota_limit, quota_period, 
          quota_units_per_call, documentation_url, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (provider_key) 
         DO UPDATE SET
           provider_name = EXCLUDED.provider_name,
           base_url = EXCLUDED.base_url,
           api_key_env_var = EXCLUDED.api_key_env_var,
           quota_limit = EXCLUDED.quota_limit,
           quota_period = EXCLUDED.quota_period,
           quota_units_per_call = EXCLUDED.quota_units_per_call,
           documentation_url = EXCLUDED.documentation_url,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [
          api.provider_key,
          api.provider_name,
          api.base_url,
          api.api_key_env_var,
          api.quota_limit,
          api.quota_period,
          api.quota_units_per_call,
          api.documentation_url,
          api.description,
          api.status,
        ]
      );
      console.log(`   ✅ ${api.provider_name}`);
    }

    // Populate Application Services
    console.log('\n2. Populating application services...');
    for (const service of APPLICATION_SERVICES) {
      await pool.query(
        `INSERT INTO application_services 
         (service_key, service_name, service_type, service_category, description, file_path, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (service_key) 
         DO UPDATE SET
           service_name = EXCLUDED.service_name,
           service_type = EXCLUDED.service_type,
           service_category = EXCLUDED.service_category,
           description = EXCLUDED.description,
           file_path = EXCLUDED.file_path,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [
          service.service_key,
          service.service_name,
          service.service_type,
          service.service_category,
          service.description,
          service.file_path,
          service.status,
        ]
      );
      console.log(`   ✅ ${service.service_name}`);
    }

    // Populate Service-API Mappings
    console.log('\n3. Populating service-API mappings...');
    for (const mapping of SERVICE_API_MAPPINGS) {
      // Skip mappings with null api_provider_key (internal services)
      if (!mapping.api_provider_key) {
        continue;
      }
      await pool.query(
        `INSERT INTO service_api_mappings 
         (service_key, api_provider_key, usage_type, is_required)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (service_key, api_provider_key) 
         DO UPDATE SET
           usage_type = EXCLUDED.usage_type,
           is_required = EXCLUDED.is_required,
           updated_at = CURRENT_TIMESTAMP`,
        [
          mapping.service_key,
          mapping.api_provider_key,
          mapping.usage_type,
          mapping.is_required,
        ]
      );
    }
    const validMappings = SERVICE_API_MAPPINGS.filter(m => m.api_provider_key);
    console.log(`   ✅ ${validMappings.length} mappings created`);

    console.log('\n✅ Successfully populated all APIs and services!');
    console.log(`\nSummary:`);
    console.log(`   - API Providers: ${API_PROVIDERS.length}`);
    console.log(`   - Application Services: ${APPLICATION_SERVICES.length}`);
    console.log(`   - Service-API Mappings: ${SERVICE_API_MAPPINGS.length}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating APIs and services:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
populateApisAndServices();

