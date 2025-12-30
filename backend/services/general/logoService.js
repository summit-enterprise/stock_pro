/**
 * Asset Logo Service
 * Fetches logos from various APIs and stores them in GCP Storage
 */

const axios = require('axios');
const { pool } = require('../../db');
const storageService = require('../infrastructure/storageService');
const path = require('path');
const fs = require('fs').promises;
const { createWriteStream } = require('fs');
const sharp = require('sharp');

const LOGO_BUCKET = process.env.GCP_STORAGE_BUCKET || 'stock-app-assets';
const LOGO_FOLDER = 'logos';

/**
 * Get logo URL from various APIs based on asset type
 */
async function fetchLogoUrl(symbol, assetType, assetName) {
  const normalizedSymbol = symbol.toUpperCase();
  const type = (assetType || '').toLowerCase();

  try {
    // For crypto: Use CoinGecko API
    if (type === 'crypto' || type === 'cryptocurrency') {
      return await fetchCryptoLogo(normalizedSymbol);
    }

    // For stocks/ETFs: Try multiple sources
    if (type === 'stock' || type === 'equity' || type === 'etf' || !type) {
      // Try Financial Modeling Prep (free, no API key needed) - First priority
      try {
        const fmpUrl = await fetchFinancialModelingPrepLogo(normalizedSymbol);
        if (fmpUrl) return fmpUrl;
      } catch (e) {
        console.log(`Financial Modeling Prep logo fetch failed for ${normalizedSymbol}:`, e.message);
      }

      // Try Finnhub (if API key available)
      if (process.env.FINNHUB_API_KEY) {
        try {
          const finnhubUrl = await fetchFinnhubLogo(normalizedSymbol);
          if (finnhubUrl) return finnhubUrl;
        } catch (e) {
          console.log(`Finnhub logo fetch failed for ${normalizedSymbol}:`, e.message);
        }
      }

      // Try Polygon.io ticker details
      if (process.env.POLYGON_API_KEY) {
        try {
          const polygonUrl = await fetchPolygonLogo(normalizedSymbol);
          if (polygonUrl) return polygonUrl;
        } catch (e) {
          console.log(`Polygon logo fetch failed for ${normalizedSymbol}:`, e.message);
        }
      }

      // Try Clearbit Logo API (free, no API key needed)
      try {
        const clearbitUrl = await fetchClearbitLogo(normalizedSymbol, assetName);
        if (clearbitUrl) return clearbitUrl;
      } catch (e) {
        console.log(`Clearbit logo fetch failed for ${normalizedSymbol}:`, e.message);
      }
    }
  } catch (error) {
    console.error(`Error fetching logo for ${normalizedSymbol}:`, error.message);
  }

  return null;
}

/**
 * Fetch crypto logo from CoinGecko
 */
async function fetchCryptoLogo(symbol) {
  try {
    // Normalize crypto symbol for CoinGecko
    // Remove "X:" prefix and "USD" suffix if present
    let normalizedSymbol = symbol.toUpperCase();
    if (normalizedSymbol.startsWith('X:')) {
      normalizedSymbol = normalizedSymbol.substring(2);
    }
    if (normalizedSymbol.endsWith('USD')) {
      normalizedSymbol = normalizedSymbol.substring(0, normalizedSymbol.length - 3);
    }

    // CoinGecko symbol mapping for common cryptos
    const coinGeckoMapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'EOS': 'eos',
      'ETC': 'ethereum-classic',
      'FIL': 'filecoin',
      'GRT': 'the-graph',
      'ICP': 'internet-computer',
      'LTC': 'litecoin',
      'MATIC': 'matic-network',
      'MKR': 'maker',
      'SHIB': 'shiba-inu',
      'SNX': 'havven',
      'SOL': 'solana',
      'SUSHI': 'sushi',
      'THETA': 'theta-token',
      'TRX': 'tron',
      'UNI': 'uniswap',
      'VET': 'vechain',
      'XLM': 'stellar',
      'XRP': 'ripple',
      'YFI': 'yearn-finance',
      'ADA': 'cardano',
      'ALGO': 'algorand',
      'ATOM': 'cosmos',
      'AVAX': 'avalanche-2',
      'BNB': 'binancecoin',
      'COMP': 'compound-governance-token',
    };

    // Try mapping first, then fallback to direct symbol
    const coinId = coinGeckoMapping[normalizedSymbol] || normalizedSymbol.toLowerCase();

    // Skip mock crypto symbols (they don't exist in CoinGecko)
    if (normalizedSymbol.startsWith('CRYPTO') || normalizedSymbol.includes('CRYPTO')) {
      return null;
    }

    // Build API URL with optional API key
    let apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}`;
    if (process.env.COINGECKO_API_KEY) {
      apiUrl += `?x_cg_demo_api_key=${process.env.COINGECKO_API_KEY}`;
    }

    const response = await axios.get(apiUrl, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.image) {
      // Prefer large image, fallback to small
      return response.data.image.large || response.data.image.small || null;
    }
  } catch (error) {
    // CoinGecko might not have this symbol, try alternative
    if (error.response?.status !== 404) {
      console.log(`CoinGecko logo fetch error for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Fetch logo from Financial Modeling Prep (free, no API key)
 * URL pattern: https://financialmodelingprep.com/image-stock/{SYMBOL}.png
 */
async function fetchFinancialModelingPrepLogo(symbol) {
  try {
    const url = `https://financialmodelingprep.com/image-stock/${symbol}.png`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus: (status) => status === 200 // Only accept 200
    });

    // Check if it's actually an image (PNG)
    if (response.status === 200 && 
        (response.headers['content-type']?.includes('image') || 
         response.data && response.data.length > 0)) {
      // Return the URL since we'll download it later
      return url;
    }
  } catch (error) {
    // 404 is expected for symbols that don't exist
    if (error.response?.status !== 404) {
      console.log(`Financial Modeling Prep logo fetch error for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Fetch logo from Finnhub
 */
async function fetchFinnhubLogo(symbol) {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
      { timeout: 5000 }
    );

    if (response.data && response.data.logo) {
      return response.data.logo;
    }
  } catch (error) {
    console.log(`Finnhub logo fetch error for ${symbol}:`, error.message);
  }
  return null;
}

/**
 * Fetch logo from Polygon.io ticker details
 */
async function fetchPolygonLogo(symbol) {
  try {
    const response = await axios.get(
      `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${process.env.POLYGON_API_KEY}`,
      { timeout: 5000 }
    );

    if (response.data && response.data.results && response.data.results.branding) {
      if (response.data.results.branding.logo_url) {
        return response.data.results.branding.logo_url;
      }
      if (response.data.results.branding.icon_url) {
        return response.data.results.branding.icon_url;
      }
    }
  } catch (error) {
    console.log(`Polygon logo fetch error for ${symbol}:`, error.message);
  }
  return null;
}

/**
 * Fetch logo from Clearbit Logo API (free, no API key)
 */
async function fetchClearbitLogo(symbol, assetName) {
  try {
    // Clearbit uses domain names, so we need to extract domain from company name
    // For now, try common patterns
    const domain = extractDomainFromName(assetName || symbol);
    if (!domain) return null;

    const response = await axios.get(
      `https://logo.clearbit.com/${domain}`,
      { 
        timeout: 5000,
        validateStatus: (status) => status === 200 // Only accept 200
      }
    );

    if (response.status === 200 && response.headers['content-type']?.includes('image')) {
      return `https://logo.clearbit.com/${domain}`;
    }
  } catch (error) {
    // 404 is expected for many companies
    if (error.response?.status !== 404) {
      console.log(`Clearbit logo fetch error for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Extract domain from company name (heuristic)
 */
function extractDomainFromName(name) {
  if (!name) return null;

  // Remove common suffixes and clean up
  let domain = name
    .toLowerCase()
    .replace(/\s+(inc|corp|corporation|llc|ltd|limited|co|company|group|holdings|technologies|tech|systems|solutions|services|industries|international|global|partners|capital|financial|bank|funds|trust|realty|properties|energy|resources|mining|pharmaceuticals|pharma|healthcare|medical|biotech|biotechnology)\s*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  // Add .com
  if (domain.length > 0) {
    return `${domain}.com`;
  }

  return null;
}

/**
 * Download and compress logo, then upload to GCP Storage
 */
async function downloadAndStoreLogo(logoUrl, symbol) {
  try {
    // Download the logo
    const response = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    if (!response.data || response.headers['content-type']?.indexOf('image') === -1) {
      throw new Error('Not an image');
    }

    // Determine file extension from content-type or URL
    const contentType = response.headers['content-type'] || '';
    let ext = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      ext = 'jpg';
    } else if (contentType.includes('webp')) {
      ext = 'webp';
    } else if (contentType.includes('svg')) {
      ext = 'svg';
    }

    // Create temp file
    const tempDir = path.join(__dirname, '../temp/logos');
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `${symbol}.${ext}`);

    // Write to temp file
    await fs.writeFile(tempPath, response.data);

    // Compress and optimize image (convert to webp for better compression, except SVG)
    let finalPath = tempPath;
    let finalExt = ext;
    if (ext !== 'svg') {
      // Convert to webp for better compression
      const compressedPath = path.join(tempDir, `${symbol}_compressed.webp`);
      await sharp(tempPath)
        .resize(256, 256, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(compressedPath);
      finalPath = compressedPath;
      finalExt = 'webp';
    }

    // Upload to GCP Storage (make public for direct access)
    const gcpPath = `${LOGO_FOLDER}/${symbol}.${finalExt}`;
    const finalContentType = finalExt === 'webp' ? 'image/webp' : contentType;
    const uploadResult = await storageService.uploadFile(finalPath, gcpPath, {
      bucket: LOGO_BUCKET,
      contentType: finalContentType,
      public: true, // Make logos publicly accessible
      metadata: {
        symbol: symbol,
        source: 'logo-service',
      },
    });

    const gcpUrl = uploadResult.publicUrl || `https://storage.googleapis.com/${LOGO_BUCKET}/${gcpPath}`;

    // Clean up temp files
    try {
      await fs.unlink(tempPath);
      if (finalPath !== tempPath) {
        await fs.unlink(finalPath);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up temp logo files:', cleanupError.message);
    }

    return gcpUrl;
  } catch (error) {
    console.error(`Error downloading/storing logo for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get or fetch logo for an asset
 */
async function getAssetLogo(symbol, assetType, assetName) {
  const normalizedSymbol = symbol.toUpperCase();

  try {
    // Check if logo already exists in database
    const result = await pool.query(
      'SELECT logo_url FROM asset_info WHERE symbol = $1',
      [normalizedSymbol]
    );

    if (result.rows.length > 0 && result.rows[0].logo_url) {
      return result.rows[0].logo_url;
    }

    // Fetch logo from APIs
    const logoUrl = await fetchLogoUrl(normalizedSymbol, assetType, assetName);
    if (!logoUrl) {
      return null; // No logo found, will use default
    }

    // Try to download and store in GCP
    let finalLogoUrl = null;
    try {
      const gcpUrl = await downloadAndStoreLogo(logoUrl, normalizedSymbol);
      finalLogoUrl = gcpUrl;
    } catch (error) {
      // If GCP upload fails (e.g., billing disabled), store the original URL
      console.warn(`GCP upload failed for ${normalizedSymbol}, storing original URL: ${error.message}`);
      finalLogoUrl = logoUrl; // Use the original URL from the API
    }

    // Update database with logo URL (either GCP URL or original API URL)
    await pool.query(
      'UPDATE asset_info SET logo_url = $1 WHERE symbol = $2',
      [finalLogoUrl, normalizedSymbol]
    );

    return finalLogoUrl;
  } catch (error) {
    console.error(`Error getting logo for ${normalizedSymbol}:`, error.message);
    return null;
  }
}

/**
 * Get logo URL (from DB or return null for default icon)
 */
async function getLogoUrl(symbol) {
  try {
    const result = await pool.query(
      'SELECT logo_url FROM asset_info WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    if (result.rows.length > 0 && result.rows[0].logo_url) {
      return result.rows[0].logo_url;
    }
  } catch (error) {
    console.error(`Error getting logo URL for ${symbol}:`, error.message);
  }

  return null;
}

module.exports = {
  getAssetLogo,
  getLogoUrl,
  fetchLogoUrl,
};

