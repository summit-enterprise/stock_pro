/**
 * Mock Logo Service
 * Returns null logos (uses default icons)
 */

async function fetchLogoUrl(symbol, assetType, assetName) {
  return null; // No logos in mock mode
}

async function getAssetLogo(symbol, assetType, assetName) {
  return null; // No logos in mock mode
}

async function getLogoUrl(symbol) {
  return null;
}

module.exports = {
  getAssetLogo,
  getLogoUrl,
  fetchLogoUrl
};

