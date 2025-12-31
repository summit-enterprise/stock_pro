const { pool } = require('../../db');

/**
 * Get the top 50 most recent SEC filings across all assets
 * @param {number} limit - Number of filings to return (default: 50)
 * @param {string} filingType - Optional filter by filing type
 * @param {string} searchQuery - Optional search by asset name or symbol
 * @param {string} sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
 */
async function getRecentFilings(limit = 50, filingType = null, searchQuery = null, sortOrder = 'desc') {
  try {
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
  } catch (error) {
    console.error('Error fetching recent SEC filings:', error);
    throw error;
  }
}

/**
 * Get filing statistics (counts by type)
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
    
    return result.rows.map(row => ({
      filingType: row.filingType,
      count: parseInt(row.count),
      lastFiling: row.lastFiling,
    }));
  } catch (error) {
    console.error('Error fetching filing statistics:', error);
    throw error;
  }
}

/**
 * Get filing counts over time for charting
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
    
    // Group by month and filing type
    const chartData = {};
    result.rows.forEach(row => {
      const month = row.month.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      if (!chartData[month]) {
        chartData[month] = {};
      }
      chartData[month][row.filingType] = parseInt(row.count);
    });
    
    return chartData;
  } catch (error) {
    console.error('Error fetching filing counts over time:', error);
    throw error;
  }
}

module.exports = {
  getRecentFilings,
  getFilingStatistics,
  getFilingCountsOverTime,
};

