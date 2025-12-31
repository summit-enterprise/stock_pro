const { pool } = require('../../db');

/**
 * Get the top 50 most recent SEC filings across all assets (mock)
 * @param {number} limit - Number of filings to return (default: 50)
 * @param {string} filingType - Optional filter by filing type
 * @param {string} searchQuery - Optional search by asset name or symbol
 * @param {string} sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
 */
async function getRecentFilings(limit = 50, filingType = null, searchQuery = null, sortOrder = 'desc') {
  try {
    // Try to get real data first
    let query = `
      SELECT 
        f.id,
        f.symbol,
        f.filing_type as "filingType",
        f.filing_date as "filingDate",
        f.report_date as "reportDate",
        f.accession_number as "accessionNumber",
        f.document_url as "documentUrl",
        f.description,
        f.form_type as "formType",
        f.period_end as "periodEnd",
        ai.name as "companyName",
        ai.category,
        ai.exchange
      FROM filings f
      LEFT JOIN asset_info ai ON f.symbol = ai.symbol
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filingType) {
      query += ` AND f.filing_type = $${params.length + 1}`;
      params.push(filingType);
    }
    
    if (searchQuery) {
      query += ` AND (
        ai.name ILIKE $${params.length + 1} OR 
        f.symbol ILIKE $${params.length + 1} OR
        f.filing_type ILIKE $${params.length + 1}
      )`;
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern);
      params.push(searchPattern);
      params.push(searchPattern);
    }
    
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += `
      ORDER BY f.filing_date ${orderDirection}, f.id ${orderDirection}
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    // If we have real data, return it
    if (result.rows.length > 0) {
      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        companyName: row.companyName || row.symbol,
        category: row.category || 'Unknown',
        exchange: row.exchange,
        filingType: row.filingType,
        filingDate: row.filingDate,
        reportDate: row.reportDate,
        accessionNumber: row.accessionNumber,
        documentUrl: row.documentUrl,
        description: row.description,
        formType: row.formType,
        periodEnd: row.periodEnd,
      }));
    }
    
    // Otherwise return mock data
    const mockFilings = [];
    const today = new Date();
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ'];
    const filingTypes = ['10-K', '10-Q', '8-K', '13F', 'DEF 14A'];
    
    for (let i = 0; i < limit * 2; i++) { // Generate more to allow filtering
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const filingType = filingTypes[Math.floor(Math.random() * filingTypes.length)];
      const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
      const filingDate = new Date(today);
      filingDate.setDate(filingDate.getDate() - daysAgo);
      
      mockFilings.push({
        id: i + 1,
        symbol: symbol,
        companyName: `${symbol} Inc.`,
        category: 'Equity',
        exchange: 'NASDAQ',
        filingType: filingType,
        filingDate: filingDate.toISOString().split('T')[0],
        reportDate: new Date(filingDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        accessionNumber: `000${Math.floor(Math.random() * 1000000000)}-${filingDate.toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100)}`,
        documentUrl: `https://www.sec.gov/Archives/edgar/data/${Math.floor(Math.random() * 100000)}/${filingDate.toISOString().split('T')[0].replace(/-/g, '')}/xbrl.zip`,
        description: `${filingType} Filing`,
        formType: filingType,
        periodEnd: new Date(filingDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
    
    // Filter by type if specified
    let filtered = filingType 
      ? mockFilings.filter(f => f.filingType === filingType)
      : mockFilings;
    
    // Filter by search query if specified
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.symbol.toLowerCase().includes(searchLower) ||
        f.companyName.toLowerCase().includes(searchLower) ||
        f.filingType.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.filingDate).getTime();
      const dateB = new Date(b.filingDate).getTime();
      return sortOrder.toLowerCase() === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return filtered.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent SEC filings (mock):', error);
    // Return minimal mock data on error
    return [];
  }
}

/**
 * Get filing statistics (counts by type) - mock
 */
async function getFilingStatistics() {
  try {
    const result = await pool.query(`
      SELECT 
        filing_type as "filingType",
        COUNT(*) as count,
        MAX(filing_date) as "lastFiling"
      FROM filings
      GROUP BY filing_type
      ORDER BY count DESC
    `);
    
    if (result.rows.length > 0) {
      return result.rows.map(row => ({
        filingType: row.filingType,
        count: parseInt(row.count),
        lastFiling: row.lastFiling,
      }));
    }
    
    // Return mock statistics
    return [
      { filingType: '10-Q', count: 1250, lastFiling: new Date().toISOString().split('T')[0] },
      { filingType: '10-K', count: 850, lastFiling: new Date().toISOString().split('T')[0] },
      { filingType: '8-K', count: 620, lastFiling: new Date().toISOString().split('T')[0] },
      { filingType: '13F', count: 480, lastFiling: new Date().toISOString().split('T')[0] },
      { filingType: 'DEF 14A', count: 320, lastFiling: new Date().toISOString().split('T')[0] },
    ];
  } catch (error) {
    console.error('Error fetching filing statistics (mock):', error);
    return [];
  }
}

/**
 * Get filing counts over time for charting - mock
 */
async function getFilingCountsOverTime(timeRange = '1Y') {
  try {
    let dateFilter = '';
    const now = new Date();
    
    switch (timeRange) {
      case '1M':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0]}'`;
        break;
      case '3M':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0]}'`;
        break;
      case '6M':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0]}'`;
        break;
      case '1Y':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]}'`;
        break;
      case '3Y':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().split('T')[0]}'`;
        break;
      case '5Y':
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).toISOString().split('T')[0]}'`;
        break;
      default:
        dateFilter = `WHERE filing_date >= '${new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]}'`;
    }
    
    const query = `
      SELECT 
        DATE_TRUNC('month', filing_date) as month,
        filing_type as "filingType",
        COUNT(*) as count
      FROM filings
      ${dateFilter}
      GROUP BY DATE_TRUNC('month', filing_date), filing_type
      ORDER BY month DESC, filing_type
    `;
    
    const result = await pool.query(query);
    
    // If we have real data, return it
    if (result.rows.length > 0) {
      const chartData = {};
      result.rows.forEach(row => {
        const month = row.month.toISOString().split('T')[0].substring(0, 7);
        if (!chartData[month]) {
          chartData[month] = {};
        }
        chartData[month][row.filingType] = parseInt(row.count);
      });
      return chartData;
    }
    
    // Return mock chart data
    const chartData = {};
    const months = 12;
    const filingTypes = ['10-K', '10-Q', '8-K', '13F', 'DEF 14A'];
    
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - i - 1), 1);
      const month = date.toISOString().split('T')[0].substring(0, 7);
      chartData[month] = {};
      
      filingTypes.forEach(type => {
        chartData[month][type] = Math.floor(Math.random() * 50) + 10;
      });
    }
    
    return chartData;
  } catch (error) {
    console.error('Error fetching filing counts over time (mock):', error);
    return {};
  }
}

module.exports = {
  getRecentFilings,
  getFilingStatistics,
  getFilingCountsOverTime,
};

