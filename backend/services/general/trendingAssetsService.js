const { pool } = require('../../db');
const { loadService } = require('../../services/index');

/**
 * Track a search for an asset
 */
async function trackAssetSearch(symbol) {
  try {
    if (!symbol || typeof symbol !== 'string') {
      return;
    }

    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // Upsert: increment search count or create new entry
    await pool.query(
      `INSERT INTO asset_search_tracking (symbol, search_count, last_searched_at)
       VALUES ($1, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (symbol)
       DO UPDATE SET 
         search_count = asset_search_tracking.search_count + 1,
         last_searched_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [normalizedSymbol]
    );
  } catch (error) {
    console.error('Error tracking asset search:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Get trending assets based on search counts
 * @param {number} limit - Number of trending assets to return (default: 10)
 * @param {string} timeRange - Time range for trending: '24h', '7d', '30d', 'all' (default: '7d')
 */
async function getTrendingAssets(limit = 10, timeRange = '7d') {
  try {
    let timeFilter = '';
    
    if (timeRange === '24h') {
      timeFilter = "WHERE last_searched_at >= NOW() - INTERVAL '24 hours'";
    } else if (timeRange === '7d') {
      timeFilter = "WHERE last_searched_at >= NOW() - INTERVAL '7 days'";
    } else if (timeRange === '30d') {
      timeFilter = "WHERE last_searched_at >= NOW() - INTERVAL '30 days'";
    } else if (timeRange === 'all') {
      timeFilter = '';
    }

    const query = `
      SELECT 
        ast.symbol,
        ast.search_count,
        ast.last_searched_at,
        ai.name,
        ai.category,
        ai.type,
        ai.exchange,
        ai.currency,
        ai.logo_url,
        COALESCE((
          SELECT close 
          FROM asset_data 
          WHERE symbol = ast.symbol 
          ORDER BY date DESC 
          LIMIT 1
        ), 0) as current_price,
        COALESCE((
          SELECT close 
          FROM asset_data 
          WHERE symbol = ast.symbol 
          ORDER BY date DESC 
          LIMIT 1 OFFSET 1
        ), 0) as previous_price
      FROM asset_search_tracking ast
      LEFT JOIN asset_info ai ON ast.symbol = ai.symbol
      ${timeFilter}
      ORDER BY ast.search_count DESC, ast.last_searched_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(row => {
      const currentPrice = parseFloat(row.current_price) || 0;
      const previousPrice = parseFloat(row.previous_close) || currentPrice;
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
      
      return {
        symbol: row.symbol,
        name: row.name || row.symbol,
        category: row.category || 'Unknown',
        type: row.type,
        exchange: row.exchange,
        currency: row.currency,
        logoUrl: row.logo_url,
        searchCount: parseInt(row.search_count) || 0,
        lastSearchedAt: row.last_searched_at,
        currentPrice: currentPrice,
        change: change,
        changePercent: changePercent,
      };
    });
  } catch (error) {
    console.error('Error getting trending assets:', error);
    throw error;
  }
}

module.exports = {
  trackAssetSearch,
  getTrendingAssets,
};

