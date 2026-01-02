/**
 * Stock Data Service - Incremental Updates
 * 
 * This service efficiently finds NEW assets from Massive.com API that don't exist
 * in our database yet, with minimum API hits.
 * 
 * Strategy:
 * 1. Get all existing tickers from database (single query)
 * 2. Fetch stocks from Massive API in batches
 * 3. Filter out existing tickers (client-side, no extra API calls)
 * 4. Only insert new stocks
 * 
 * This minimizes API calls by:
 * - Using efficient pagination
 * - Filtering client-side instead of multiple API queries
 * - Only processing new assets
 */

require('dotenv').config();
const { pool } = require('../../db');
const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');
const axios = require('axios');

const API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls
const BATCH_SIZE = 1000; // Maximum per API call

/**
 * Exchange mapping: Primary Exchange (MIC Code) -> Acronym and Massive ID
 */
const EXCHANGE_MAPPING = {
  'XNAS': { acronym: 'NASDAQ', massive_id: 1 },
  'XNYS': { acronym: 'NYSE', massive_id: 11 },
  'ARCX': { acronym: 'ARCA', massive_id: 12 },
  'XASE': { acronym: 'AMEX', massive_id: 2 },
  'BATS': { acronym: 'BATS', massive_id: 3 },
  'BATY': { acronym: 'BYX', massive_id: 4 },
  'EDGA': { acronym: 'EDGA', massive_id: 5 },
  'EDGX': { acronym: 'EDGX', massive_id: 6 },
  'IEXG': { acronym: 'IEX', massive_id: 15 },
  'XPHL': { acronym: 'PHLX', massive_id: 10 },
  'XBOS': { acronym: 'BX', massive_id: 8 },
  'XPSX': { acronym: 'PSX', massive_id: 9 },
  'XCHI': { acronym: 'CHX', massive_id: 13 },
  'XCIS': { acronym: 'NSX', massive_id: 14 },
  'LTSE': { acronym: 'LTSE', massive_id: 16 },
  'MEMX': { acronym: 'MEMX', massive_id: 17 },
  'OTCM': { acronym: 'OTC', massive_id: 19 }
};

/**
 * Map primary exchange to acronym and Massive ID
 */
function mapExchange(primaryExchange) {
  if (!primaryExchange) {
    return { acronym: null, massive_id: null };
  }
  
  const mapping = EXCHANGE_MAPPING[primaryExchange.toUpperCase()];
  if (mapping) {
    return {
      acronym: mapping.acronym,
      massive_id: mapping.massive_id
    };
  }
  
  return { acronym: null, massive_id: null };
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract cursor from next_url
 */
function extractCursorFromUrl(nextUrl) {
  if (!nextUrl) return null;
  try {
    const url = new URL(nextUrl);
    return url.searchParams.get('cursor');
  } catch (e) {
    return nextUrl;
  }
}

/**
 * Get all existing tickers from database
 * @returns {Promise<Set<string>>} Set of existing ticker symbols
 */
async function getExistingTickers() {
  try {
    const result = await pool.query('SELECT ticker FROM stock_data');
    const tickers = new Set(result.rows.map(row => row.ticker));
    console.log(`📊 Found ${tickers.size} existing tickers in database`);
    return tickers;
  } catch (error) {
    console.error('Error fetching existing tickers:', error.message);
    return new Set();
  }
}

/**
 * Fetch new stocks from Massive.com API (only those not in database)
 * @param {Set<string>} existingTickers - Set of tickers we already have
 * @param {number} maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<{newStocks: Array, totalFetched: number, apiCalls: number}>}
 */
async function fetchNewStocksFromMassive(existingTickers, maxPages = null) {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let newStocks = [];
  let allFetchedStocks = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;
  let apiCalls = 0;

  console.log('🔍 Starting incremental update to find new stocks...\n');
  console.log(`   Existing tickers in DB: ${existingTickers.size}`);
  console.log(`   Max pages to fetch: ${maxPages || 'unlimited'}\n`);

  try {
    do {
      // Check if we've reached max pages
      if (maxPages && pageCount >= maxPages) {
        console.log(`   ⏸️  Reached max pages limit (${maxPages})`);
        break;
      }

      pageCount++;
      apiCalls++;
      console.log(`📄 Fetching page ${pageCount} (API call #${apiCalls})...`);

      try {
        const params = new URLSearchParams({
          market: 'stocks',
          active: 'true',
          order: 'asc',
          limit: BATCH_SIZE.toString(),
          sort: 'ticker',
          apiKey: API_KEY
        });

        if (cursor) {
          params.append('cursor', cursor);
        }

        const url = `${BASE_URL}?${params.toString()}`;
        const response = await axios.get(url, {
          timeout: 30000
        });

        const responseData = response.data;
        
        if (responseData && responseData.results) {
          const stocks = responseData.results;
          allFetchedStocks = allFetchedStocks.concat(stocks);
          totalFetched += stocks.length;
          
          // Filter out existing tickers (client-side, no extra API calls)
          const newStocksInBatch = stocks.filter(stock => !existingTickers.has(stock.ticker));
          newStocks = newStocks.concat(newStocksInBatch);
          
          console.log(`   ✅ Fetched ${stocks.length} stocks (Total: ${totalFetched})`);
          console.log(`   🆕 Found ${newStocksInBatch.length} new stocks in this batch (Total new: ${newStocks.length})`);

          // If we've found enough new stocks and want to stop early, we can
          // But for now, we'll continue to ensure we don't miss any

          if (responseData.next_url) {
            cursor = extractCursorFromUrl(responseData.next_url);
          } else if (responseData.cursor) {
            cursor = responseData.cursor;
          } else {
            cursor = null;
          }
          
          if (cursor) {
            console.log(`   ⏭️  Next page available, waiting ${RATE_LIMIT_DELAY / 1000}s...\n`);
            await delay(RATE_LIMIT_DELAY);
          } else {
            console.log(`   ✅ No more pages, completed!\n`);
          }
        } else {
          console.error('   ❌ Unexpected response format');
          break;
        }
      } catch (error) {
        console.error(`   ❌ Error:`, error.message || error);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
        }
        
        if (error.response && error.response.status === 429) {
          console.log('   ⏳ Rate limited, waiting 60 seconds...');
          await delay(60000);
          continue;
        } else if (error.response && error.response.status >= 500) {
          console.log('   ⏳ Server error, waiting 30 seconds before retry...');
          await delay(30000);
          continue;
        } else {
          break;
        }
      }
    } while (cursor);

    console.log(`\n📊 Incremental Update Summary:`);
    console.log(`   Total pages fetched: ${pageCount}`);
    console.log(`   Total API calls: ${apiCalls}`);
    console.log(`   Total stocks fetched: ${totalFetched}`);
    console.log(`   New stocks found: ${newStocks.length}`);
    console.log(`   Efficiency: ${((newStocks.length / totalFetched) * 100).toFixed(2)}% new stocks\n`);

    return {
      newStocks,
      totalFetched,
      apiCalls,
      pageCount
    };
  } catch (error) {
    console.error('❌ Error fetching new stocks:', error);
    throw error;
  }
}

/**
 * Store new stocks in database (only inserts, no updates)
 * @param {Array} stocks - Array of new stock objects from API
 * @returns {Promise<Object>} Summary of insertions
 */
async function storeNewStocksInDatabase(stocks) {
  if (stocks.length === 0) {
    console.log('ℹ️  No new stocks to store.');
    return {
      stockDataInserted: 0,
      assetInfoInserted: 0,
      skipped: 0
    };
  }

  console.log(`💾 Storing ${stocks.length} new stocks in database...\n`);

  const client = await pool.connect();
  
  try {
    let stockDataInserted = 0;
    let assetInfoInserted = 0;
    let skipped = 0;

    const batchSize = 100;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      await client.query('BEGIN');
      
      try {
        for (const stock of batch) {
          try {
            const lastUpdatedUTC = stock.last_updated_utc ? new Date(stock.last_updated_utc) : null;
            const lastUpdated = new Date();
            const exchangeMapping = mapExchange(stock.primary_exchange);
            
            // Check if it still doesn't exist (race condition protection)
            const stockDataExists = await client.query(
              'SELECT ticker FROM stock_data WHERE ticker = $1',
              [stock.ticker]
            );

            if (stockDataExists.rows.length > 0) {
              // Already exists, skip
              skipped++;
              continue;
            }

            // Insert into stock_data
            await client.query(
              `INSERT INTO stock_data (
                ticker, active, cik, composite_figi, currency_name,
                last_updated_utc, last_updated, locale, market, name, 
                primary_exchange, share_class_figi, type, acronym, massive_id, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)`,
              [
                stock.ticker,
                stock.active === true || stock.active === 'true' || stock.active === 1 ? true : false,
                stock.cik || null,
                stock.composite_figi || null,
                stock.currency_name || null,
                lastUpdatedUTC,
                lastUpdated,
                stock.locale || null,
                stock.market || null,
                stock.name || null,
                stock.primary_exchange || null,
                stock.share_class_figi || null,
                stock.type || null,
                exchangeMapping.acronym,
                exchangeMapping.massive_id
              ]
            );

            stockDataInserted++;

            // Also store in asset_info for backward compatibility
            const tickerSymbol = extractTickerSymbol(stock.ticker);
            const displayName = generateDisplayName(stock.ticker, stock.name);

            let category = 'Equity';
            if (stock.type === 'ETF' || stock.type === 'ETP') {
              category = 'ETF';
            } else if (stock.type === 'ADRC' || stock.type === 'ADRW' || stock.type === 'ADRR') {
              category = 'ADR';
            }

            // Check if asset_info already exists
            const assetInfoExists = await client.query(
              'SELECT symbol FROM asset_info WHERE symbol = $1',
              [stock.ticker]
            );

            if (assetInfoExists.rows.length === 0) {
              await client.query(
                `INSERT INTO asset_info (
                  symbol, name, type, exchange, currency, 
                  ticker_symbol, display_name, category, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
                [
                  stock.ticker,
                  stock.name || null,
                  stock.type || 'stock',
                  stock.primary_exchange || null,
                  stock.currency_name || 'USD',
                  tickerSymbol,
                  displayName,
                  category
                ]
              );

              assetInfoInserted++;
            }
          } catch (error) {
            console.error(`   ⚠️  Error storing ${stock.ticker}:`, error.message);
            skipped++;
          }
        }
        
        await client.query('COMMIT');
      } catch (batchError) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Error in batch ${i}-${i + batchSize}:`, batchError.message);
        skipped += batch.length;
      }

      if ((i + batchSize) % 500 === 0 || i + batchSize >= stocks.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, stocks.length)} / ${stocks.length} new stocks...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Stock Data - Inserted: ${stockDataInserted}`);
    console.log(`   Asset Info - Inserted: ${assetInfoInserted}`);
    console.log(`   Skipped (already existed): ${skipped}\n`);

    return {
      stockDataInserted,
      assetInfoInserted,
      skipped
    };

  } catch (error) {
    console.error('❌ Error storing new stocks in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run incremental update to find and store new stocks
 * @param {Object} options - Options for the update
 * @param {number} options.maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<Object>} Summary of the update operation
 */
async function updateNewStocks(options = {}) {
  const { maxPages = null } = options;

  try {
    // Step 1: Get existing tickers (single database query)
    const existingTickers = await getExistingTickers();

    // Step 2: Fetch new stocks from API (filtered client-side)
    const { newStocks, totalFetched, apiCalls, pageCount } = await fetchNewStocksFromMassive(
      existingTickers,
      maxPages
    );

    if (newStocks.length === 0) {
      console.log('✅ No new stocks found. Database is up to date!');
      return {
        success: true,
        newStocksFound: 0,
        totalFetched,
        apiCalls,
        pageCount,
        message: 'No new stocks found'
      };
    }

    // Step 3: Store only new stocks
    const storageSummary = await storeNewStocksInDatabase(newStocks);

    return {
      success: true,
      newStocksFound: newStocks.length,
      totalFetched,
      apiCalls,
      pageCount,
      ...storageSummary
    };
  } catch (error) {
    console.error('❌ Incremental update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getExistingTickers,
  fetchNewStocksFromMassive,
  storeNewStocksInDatabase,
  updateNewStocks,
  mapExchange
};


