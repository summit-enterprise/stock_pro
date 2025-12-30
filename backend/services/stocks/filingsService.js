const axios = require('axios');
const redis = require('redis');
const { pool } = require('../../db');

// Redis client for caching filings
let redisClient = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redisClient) {
    try {
      redisClient = redis.createClient({ url: 'redis://localhost:6379' });
      await redisClient.connect();
      console.log('Filings Service: Redis connected');
      return true;
    } catch (error) {
      console.warn('Filings Service: Redis not available');
      redisClient = null;
      return false;
    }
  }
  return redisClient && redisClient.isOpen;
};

const FILINGS_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days (filings don't change often)

// Filing types and their typical frequencies
const FILING_TYPES = {
  '13F': { frequency: 'quarterly', description: 'Institutional Investment Manager Holdings' },
  '10-K': { frequency: 'annual', description: 'Annual Report' },
  '10-Q': { frequency: 'quarterly', description: 'Quarterly Report' },
  '8-K': { frequency: 'as-needed', description: 'Current Report' },
  'DEF 14A': { frequency: 'annual', description: 'Proxy Statement' },
  'S-1': { frequency: 'as-needed', description: 'Registration Statement' },
  '424B2': { frequency: 'as-needed', description: 'Prospectus' },
};

/**
 * Generate mock filings data for development
 */
function generateMockFilings(symbol) {
  const filings = [];
  const today = new Date();
  
  // Generate 13F filings (quarterly)
  for (let i = 0; i < 8; i++) {
    const filingDate = new Date(today);
    filingDate.setMonth(filingDate.getMonth() - (i * 3));
    filingDate.setDate(15); // Mid-month
    
    filings.push({
      filingType: '13F',
      filingDate: filingDate.toISOString().split('T')[0],
      reportDate: new Date(filingDate.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      accessionNumber: `000${Math.floor(Math.random() * 1000000000)}-${filingDate.toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100)}`,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 100000)}/${filingDate.toISOString().split('T')[0].replace(/-/g, '')}/xbrl.zip`,
      description: 'Institutional Investment Manager Holdings',
      formType: '13F-HR',
      periodEnd: new Date(filingDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }

  // Generate 10-K filings (annual)
  for (let i = 0; i < 5; i++) {
    const filingDate = new Date(today.getFullYear() - i, 2, 15); // March 15th
    
    filings.push({
      filingType: '10-K',
      filingDate: filingDate.toISOString().split('T')[0],
      reportDate: new Date(filingDate.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
      accessionNumber: `000${Math.floor(Math.random() * 1000000000)}-${filingDate.toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100)}`,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 100000)}/${filingDate.toISOString().split('T')[0].replace(/-/g, '')}/xbrl.zip`,
      description: 'Annual Report',
      formType: '10-K',
      periodEnd: new Date(filingDate.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
    });
  }

  // Generate 10-Q filings (quarterly)
  for (let i = 0; i < 12; i++) {
    const filingDate = new Date(today);
    filingDate.setMonth(filingDate.getMonth() - i);
    filingDate.setDate(10); // Early month
    
    filings.push({
      filingType: '10-Q',
      filingDate: filingDate.toISOString().split('T')[0],
      reportDate: new Date(filingDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      accessionNumber: `000${Math.floor(Math.random() * 1000000000)}-${filingDate.toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100)}`,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 100000)}/${filingDate.toISOString().split('T')[0].replace(/-/g, '')}/xbrl.zip`,
      description: 'Quarterly Report',
      formType: '10-Q',
      periodEnd: new Date(filingDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  }

  // Generate some 8-K filings (as-needed)
  for (let i = 0; i < 5; i++) {
    const filingDate = new Date(today);
    filingDate.setMonth(filingDate.getMonth() - Math.floor(Math.random() * 12));
    filingDate.setDate(Math.floor(Math.random() * 28) + 1);
    
    filings.push({
      filingType: '8-K',
      filingDate: filingDate.toISOString().split('T')[0],
      reportDate: filingDate.toISOString().split('T')[0],
      accessionNumber: `000${Math.floor(Math.random() * 1000000000)}-${filingDate.toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100)}`,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 100000)}/${filingDate.toISOString().split('T')[0].replace(/-/g, '')}/xbrl.zip`,
      description: 'Current Report',
      formType: '8-K',
      periodEnd: null,
    });
  }

  // Sort by filing date descending
  return filings.sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate));
}

/**
 * Fetch filings from SEC EDGAR API (mock for now)
 */
async function fetchFilingsFromAPI(symbol) {
  // For now, return mock data
  // In production, this would call SEC EDGAR API or sec-api.io
  return generateMockFilings(symbol);
}

/**
 * Store filings in database
 */
async function storeFilings(symbol, filings) {
  if (!filings || filings.length === 0) return;

  try {
    for (const filing of filings) {
      await pool.query(
        `INSERT INTO filings (symbol, filing_type, filing_date, report_date, accession_number, document_url, description, form_type, period_end, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (symbol, filing_type, filing_date, accession_number) 
         DO UPDATE SET 
           report_date = EXCLUDED.report_date,
           document_url = EXCLUDED.document_url,
           description = EXCLUDED.description,
           form_type = EXCLUDED.form_type,
           period_end = EXCLUDED.period_end,
           updated_at = CURRENT_TIMESTAMP`,
        [
          symbol,
          filing.filingType || filing.filing_type,
          filing.filingDate || filing.filing_date,
          filing.reportDate || filing.report_date || null,
          filing.accessionNumber || filing.accession_number || `MOCK-${Date.now()}-${Math.random()}`,
          filing.documentUrl || filing.document_url || null,
          filing.description || null,
          filing.formType || filing.form_type || null,
          filing.periodEnd || filing.period_end || null,
        ]
      );
    }
  } catch (error) {
    console.error(`Error storing filings for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get filings from database
 */
async function getFilingsFromDB(symbol, filingType = null, limit = null) {
  try {
    let query = `
      SELECT 
        id,
        symbol,
        cik,
        filing_type,
        filing_date,
        report_date,
        accession_number,
        document_url,
        description,
        period_end,
        form_type,
        created_at,
        updated_at
      FROM filings
      WHERE symbol = $1
    `;

    const params = [symbol];
    
    if (filingType) {
      query += ` AND filing_type = $2`;
      params.push(filingType);
    }
    
    query += ` ORDER BY filing_date DESC`;
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      cik: row.cik,
      filingType: row.filing_type,
      filingDate: row.filing_date,
      reportDate: row.report_date,
      accessionNumber: row.accession_number,
      documentUrl: row.document_url,
      description: row.description,
      periodEnd: row.period_end,
      formType: row.form_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error(`Error fetching filings from DB for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Cache filings in Redis
 */
async function cacheFilings(symbol, filings) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `filings:${symbol.toUpperCase()}`;
      await redisClient.setEx(cacheKey, FILINGS_CACHE_TTL, JSON.stringify(filings));
    } catch (error) {
      console.warn(`Failed to cache filings for ${symbol}:`, error.message);
    }
  }
}

/**
 * Get filings from cache
 */
async function getFilingsFromCache(symbol) {
  if (redisClient && redisClient.isOpen) {
    try {
      const cacheKey = `filings:${symbol.toUpperCase()}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`Failed to get filings from cache for ${symbol}:`, error.message);
    }
  }
  return null;
}

/**
 * Fetch and sync filings for a symbol
 */
async function fetchAndSyncFilings(symbol) {
  try {
    // Initialize Redis if needed
    await initRedis();

    // Check cache first
    const cached = await getFilingsFromCache(symbol);
    if (cached) {
      console.log(`Filings cache hit for ${symbol}`);
      return cached;
    }

    // Check database
    const dbFilings = await getFilingsFromDB(symbol);
    
    // If we have recent data (within last 7 days), use it
    if (dbFilings.length > 0) {
      const mostRecent = new Date(dbFilings[0].filingDate);
      const daysSinceUpdate = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
      
      // If data is less than 7 days old, cache and return it
      if (daysSinceUpdate < 7) {
        await cacheFilings(symbol, dbFilings);
        return dbFilings;
      }
    }

    // Fetch from API (or generate mock)
    const apiFilings = await fetchFilingsFromAPI(symbol);

    // Store in database
    if (apiFilings.length > 0) {
      await storeFilings(symbol, apiFilings);
    }

    // Cache the results
    const finalFilings = apiFilings.length > 0 ? apiFilings.map(f => ({
      filingType: f.filingType,
      filingDate: f.filingDate,
      reportDate: f.reportDate,
      accessionNumber: f.accessionNumber,
      documentUrl: f.documentUrl,
      description: f.description,
      formType: f.formType,
      periodEnd: f.periodEnd,
    })) : dbFilings;

    await cacheFilings(symbol, finalFilings);

    return finalFilings;
  } catch (error) {
    console.error(`Error in fetchAndSyncFilings for ${symbol}:`, error.message);
    // Fallback to database
    return await getFilingsFromDB(symbol);
  }
}

/**
 * Get filings statistics for a symbol
 */
async function getFilingsStats(symbol) {
  try {
    const result = await pool.query(
      `SELECT 
        filing_type,
        COUNT(*) as count,
        MAX(filing_date) as last_filing
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
    console.error(`Error getting filings stats for ${symbol}:`, error.message);
    return [];
  }
}

module.exports = {
  fetchFilingsFromAPI,
  generateMockFilings,
  storeFilings,
  getFilingsFromDB,
  fetchAndSyncFilings,
  getFilingsStats,
  cacheFilings,
  getFilingsFromCache,
  initRedis,
  getRedisClient: () => redisClient,
};

