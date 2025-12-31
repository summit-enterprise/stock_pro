/**
 * Mock Filings Service
 * Generates random mock SEC filings data
 */

const { pool } = require('../../db');

const filingTypes = ['10-K', '10-Q', '8-K', '13F', 'DEF 14A', 'S-1', 'S-3'];

/**
 * Check if asset category supports filings
 * Filings are only available for: Equity, ETF, Bond, MutualFund, InternationalStock
 * Not available for: Crypto, Commodity, Index
 */
async function isFilingSupported(symbol) {
  try {
    const result = await pool.query(
      'SELECT category FROM asset_info WHERE symbol = $1',
      [symbol]
    );
    
    if (result.rows.length === 0) {
      return true; // Default to true if asset not found (will fail gracefully)
    }
    
    const category = (result.rows[0].category || '').toLowerCase().trim();
    const unsupportedCategories = ['crypto', 'cryptocurrency', 'cryptocurrencies', 'commodity', 'commodities', 'index', 'indices'];
    
    return !unsupportedCategories.includes(category);
  } catch (error) {
    console.warn(`Error checking filing support for ${symbol}:`, error.message);
    return true; // Default to true on error
  }
}

function generateMockFilings(symbol) {
  const filings = [];
  const today = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i * 2);
    
    filings.push({
      filingType: filingTypes[Math.floor(Math.random() * filingTypes.length)],
      filingDate: date.toISOString().split('T')[0],
      reportDate: date.toISOString().split('T')[0],
      acceptanceDate: date.toISOString().split('T')[0],
      accessionNumber: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentUrl: `https://example.com/filing/${symbol}`,
      description: `Mock filing for ${symbol}`,
    });
  }
  
  return filings;
}

async function fetchFilingsFromAPI(symbol) {
  return generateMockFilings(symbol);
}

async function storeFilings(symbol, filings) {
  if (!filings || filings.length === 0) return;
  
  try {
    for (const filing of filings) {
      await pool.query(
        `INSERT INTO filings (symbol, filing_type, filing_date, report_date, acceptance_date, accession_number, document_url, description, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol, accession_number) 
         DO UPDATE SET 
           filing_type = EXCLUDED.filing_type,
           filing_date = EXCLUDED.filing_date,
           report_date = EXCLUDED.report_date,
           acceptance_date = EXCLUDED.acceptance_date,
           document_url = EXCLUDED.document_url,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          filing.filingType || filing.filing_type,
          filing.filingDate || filing.filing_date,
          filing.reportDate || filing.report_date,
          filing.acceptanceDate || filing.acceptance_date,
          filing.accessionNumber || filing.accession_number,
          filing.documentUrl || filing.document_url,
          filing.description || ''
        ]
      );
    }
  } catch (error) {
    console.error(`Error storing filings for ${symbol}:`, error.message);
  }
}

async function fetchAndSyncFilings(symbol) {
  // Check if this asset category supports filings
  const supportsFilings = await isFilingSupported(symbol);
  if (!supportsFilings) {
    console.log(`Filings not supported for ${symbol} (category: crypto/commodity/index)`);
    return [];
  }

  const filings = await fetchFilingsFromAPI(symbol);
  await storeFilings(symbol, filings);
  return filings;
}

async function getFilingsStats(symbol) {
  try {
    // Check if this asset category supports filings
    const supportsFilings = await isFilingSupported(symbol);
    if (!supportsFilings) {
      return null;
    }
    const result = await pool.query(
      `SELECT filing_type, COUNT(*) as count, MAX(filing_date) as last_filing
       FROM filings
       WHERE symbol = $1
       GROUP BY filing_type
       ORDER BY filing_type`,
      [symbol]
    );

    return result.rows.map(row => ({
      filingType: row.filing_type,
      count: parseInt(row.count),
      lastFiling: row.last_filing,
    }));
  } catch (error) {
    return [];
  }
}

module.exports = {
  fetchFilingsFromAPI,
  generateMockFilings,
  storeFilings,
  fetchAndSyncFilings,
  getFilingsStats,
  isFilingSupported
};

