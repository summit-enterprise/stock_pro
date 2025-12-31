const { pool } = require('../../db');

/**
 * Track a search for an asset (mock - just logs)
 */
async function trackAssetSearch(symbol) {
  try {
    if (!symbol || typeof symbol !== 'string') {
      return;
    }

    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // In mock mode, still track to database but with lower priority
    try {
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
      // Silently fail in mock mode
      console.log(`Mock: Would track search for ${normalizedSymbol}`);
    }
  } catch (error) {
    // Silently fail in mock mode
  }
}

/**
 * Get trending assets based on search counts (mock - returns mock data if DB is empty)
 */
async function getTrendingAssets(limit = 10, timeRange = '7d') {
  try {
    // Try to get real data first
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
    
    // If we have real data, return it
    if (result.rows.length > 0) {
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
    }

    // Otherwise, return mock trending assets
    const mockTrendingAssets = [
      { symbol: 'AAPL', name: 'Apple Inc.', category: 'Equity', searchCount: 1250, change: 2.45, changePercent: 1.23 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Equity', searchCount: 980, change: -1.20, changePercent: -0.45 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Equity', searchCount: 875, change: 5.30, changePercent: 2.15 },
      { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'Equity', searchCount: 720, change: -8.50, changePercent: -3.20 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'Equity', searchCount: 650, change: 12.75, changePercent: 4.85 },
      { symbol: 'BTC', name: 'Bitcoin', category: 'Crypto', searchCount: 580, change: 450.00, changePercent: 1.85 },
      { symbol: 'ETH', name: 'Ethereum', category: 'Crypto', searchCount: 520, change: 25.30, changePercent: 1.25 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'Equity', searchCount: 480, change: 3.20, changePercent: 0.95 },
      { symbol: 'META', name: 'Meta Platforms Inc.', category: 'Equity', searchCount: 420, change: -2.10, changePercent: -0.75 },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'ETF', searchCount: 380, change: 1.50, changePercent: 0.35 },
    ];

    // Get asset info for mock symbols
    const assetInfoQuery = await pool.query(
      `SELECT symbol, name, category, type, exchange, currency, logo_url
       FROM asset_info
       WHERE symbol = ANY($1)`,
      [mockTrendingAssets.map(a => a.symbol)]
    );

    const assetInfoMap = {};
    assetInfoQuery.rows.forEach(row => {
      assetInfoMap[row.symbol] = row;
    });

    // Get latest prices for mock symbols (calculate change from previous day)
    const priceQuery = await pool.query(
      `WITH ranked_prices AS (
         SELECT 
           symbol,
           close,
           ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
         FROM asset_data
         WHERE symbol = ANY($1)
       )
       SELECT 
         symbol,
         MAX(CASE WHEN rn = 1 THEN close END) as current_price,
         MAX(CASE WHEN rn = 2 THEN close END) as previous_price
       FROM ranked_prices
       GROUP BY symbol`,
      [mockTrendingAssets.map(a => a.symbol)]
    );

    const priceMap = {};
    priceQuery.rows.forEach(row => {
      const currentPrice = parseFloat(row.current_price) || 0;
      const previousPrice = parseFloat(row.previous_price) || currentPrice;
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
      
      priceMap[row.symbol] = {
        currentPrice: currentPrice,
        change: change,
        changePercent: changePercent,
      };
    });

    return mockTrendingAssets.slice(0, limit).map(asset => {
      const info = assetInfoMap[asset.symbol] || {};
      const price = priceMap[asset.symbol] || { currentPrice: 0, change: asset.change, changePercent: asset.changePercent };
      
      return {
        symbol: asset.symbol,
        name: info.name || asset.name,
        category: info.category || asset.category,
        type: info.type,
        exchange: info.exchange,
        currency: info.currency,
        logoUrl: info.logo_url,
        searchCount: asset.searchCount,
        lastSearchedAt: new Date(),
        currentPrice: price.currentPrice || 0,
        change: price.change || asset.change,
        changePercent: price.changePercent || asset.changePercent,
      };
    });
  } catch (error) {
    console.error('Error getting trending assets (mock):', error);
    // Return minimal mock data on error
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', category: 'Equity', searchCount: 1250, currentPrice: 175.50, change: 2.45, changePercent: 1.23 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Equity', searchCount: 980, currentPrice: 380.20, change: -1.20, changePercent: -0.45 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Equity', searchCount: 875, currentPrice: 145.80, change: 5.30, changePercent: 2.15 },
    ].slice(0, limit);
  }
}

module.exports = {
  trackAssetSearch,
  getTrendingAssets,
};

