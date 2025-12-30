/**
 * Mock Ratings Service
 * Generates random mock analyst ratings
 */

const { pool } = require('../../db');

const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

function generateDeterministicRatings(symbol) {
  // Deterministic based on symbol hash
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ratingIndex = hash % ratings.length;
  
  return {
    consensus: {
      rating: ratings[ratingIndex],
      targetPrice: 100 + (hash % 200),
      numberOfRatings: 10 + (hash % 20)
    }
  };
}

async function fetchRatingsFromAPI(symbol) {
  return generateDeterministicRatings(symbol);
}

async function fetchAndStoreRatings(symbol) {
  const ratings = await fetchRatingsFromAPI(symbol);
  // Store to DB if needed
  return ratings;
}

async function initRedis() {
  return false; // No Redis in mock mode
}

function startRatingsService() {
  console.log('[MOCK] Ratings service started (mock mode)');
}

function stopRatingsService() {
  console.log('[MOCK] Ratings service stopped');
}

function refreshAllRatings() {
  console.log('[MOCK] Would refresh all ratings');
}

function refreshRatingsBatch(symbols) {
  console.log(`[MOCK] Would refresh ratings for ${symbols.length} symbols`);
}

function getRedisClient() {
  return null;
}

module.exports = {
  initRedis,
  fetchRatingsFromAPI,
  fetchAndStoreRatings,
  refreshAllRatings,
  refreshRatingsBatch,
  startRatingsService,
  stopRatingsService,
  generateDeterministicRatings,
  getRedisClient
};

