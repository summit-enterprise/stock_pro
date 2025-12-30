/**
 * Mock Analyst Ratings Service
 * Generates random mock individual analyst ratings
 */

const { pool } = require('../../db');

const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];
const firms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Wells Fargo'];
const analysts = ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];

function generateMockIndividualRatings(symbol) {
  return Array.from({ length: 10 }, () => ({
    analyst: analysts[Math.floor(Math.random() * analysts.length)],
    firm: firms[Math.floor(Math.random() * firms.length)],
    rating: ratings[Math.floor(Math.random() * ratings.length)],
    targetPrice: Math.random() * 200 + 50,
    date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
  }));
}

function generateMockConsensus(symbol, individualRatings) {
  const ratingCounts = individualRatings.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {});
  
  const topRating = Object.keys(ratingCounts).reduce((a, b) => 
    ratingCounts[a] > ratingCounts[b] ? a : b
  );
  
  return {
    rating: topRating,
    targetPrice: individualRatings.reduce((sum, r) => sum + r.targetPrice, 0) / individualRatings.length,
    numberOfRatings: individualRatings.length
  };
}

async function fetchAndSyncRatings(symbol) {
  const individual = generateMockIndividualRatings(symbol);
  const consensus = generateMockConsensus(symbol, individual);
  return { individual, consensus };
}

module.exports = {
  generateMockIndividualRatings,
  generateMockConsensus,
  fetchAndSyncRatings
};

