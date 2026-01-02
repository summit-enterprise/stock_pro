/**
 * Update New Forex from Massive.com - Incremental Updates
 * 
 * This script efficiently finds NEW forex tickers from Massive.com API that don't exist
 * in our database yet, with minimum API hits.
 * 
 * Strategy:
 * 1. Get all existing tickers from forex_data table (single query)
 * 2. Fetch forex from Massive API in batches
 * 3. Filter out existing tickers (client-side, no extra API calls)
 * 4. Only insert new forex
 * 
 * Usage: node scripts/massive_api/updateNewForexFromMassive.js
 */

require('dotenv').config();
const { pool } = require('../../db');
const axios = require('axios');

const API_KEY = process.env.POLYGON_API_KEY || 'Z4COFa5AuGVchpp3IaPCZyW6pfDzCR1t';
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls
const LIMIT = 1000; // Maximum per page

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
 * Get all existing forex tickers from database
 * @returns {Promise<Set<string>>} Set of existing ticker symbols
 */
async function getExistingTickers() {
  try {
    const result = await pool.query('SELECT ticker FROM forex_data');
    const tickers = new Set(result.rows.map(row => row.ticker));
    console.log(`📊 Found ${tickers.size} existing forex tickers in database`);
    return tickers;
  } catch (error) {
    console.error('Error fetching existing forex tickers:', error.message);
    return new Set();
  }
}

/**
 * Fetch new forex from Massive.com API (only those not in database)
 * @param {Set<string>} existingTickers - Set of tickers we already have
 * @param {number} maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<{newForex: Array, totalFetched: number, apiCalls: number}>}
 */
async function fetchNewForexFromMassive(existingTickers, maxPages = null) {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let newForex = [];
  let allFetchedForex = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;
  let apiCalls = 0;

  console.log('🔍 Starting incremental update to find new forex...\n');
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
          market: 'fx',
          active: 'true',
          order: 'asc',
          limit: LIMIT.toString(),
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
          const forex = responseData.results;
          allFetchedForex = allFetchedForex.concat(forex);
          totalFetched += forex.length;
          
          // Filter out existing tickers (client-side, no extra API calls)
          const newForexInBatch = forex.filter(item => !existingTickers.has(item.ticker));
          newForex = newForex.concat(newForexInBatch);
          
          console.log(`   ✅ Fetched ${forex.length} forex tickers (Total: ${totalFetched})`);
          console.log(`   🆕 Found ${newForexInBatch.length} new forex in this batch (Total new: ${newForex.length})`);

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
    console.log(`   Total forex fetched: ${totalFetched}`);
    console.log(`   New forex found: ${newForex.length}`);
    console.log(`   Efficiency: ${totalFetched > 0 ? ((newForex.length / totalFetched) * 100).toFixed(2) : 0}% new forex\n`);

    return {
      newForex,
      totalFetched,
      apiCalls,
      pageCount
    };
  } catch (error) {
    console.error('❌ Error fetching new forex:', error);
    throw error;
  }
}

/**
 * Store new forex in database (only inserts, no updates)
 * @param {Array} forex - Array of new forex objects from API
 * @returns {Promise<Object>} Summary of insertions
 */
async function storeNewForexInDatabase(forex) {
  if (forex.length === 0) {
    console.log('ℹ️  No new forex to store.');
    return {
      inserted: 0,
      skipped: 0
    };
  }

  console.log(`💾 Storing ${forex.length} new forex in database...\n`);

  const client = await pool.connect();
  
  try {
    let inserted = 0;
    let skipped = 0;

    const batchSize = 100;
    for (let i = 0; i < forex.length; i += batchSize) {
      const batch = forex.slice(i, i + batchSize);
      
      await client.query('BEGIN');
      
      try {
        for (const item of batch) {
          try {
            const lastUpdatedUTC = item.last_updated_utc ? new Date(item.last_updated_utc) : null;
            const lastUpdated = new Date();
            
            // Check if it still doesn't exist (race condition protection)
            const exists = await client.query(
              'SELECT ticker FROM forex_data WHERE ticker = $1',
              [item.ticker]
            );

            if (exists.rows.length > 0) {
              // Already exists, skip
              skipped++;
              continue;
            }

            // Insert into forex_data
            await client.query(
              `INSERT INTO forex_data (
                ticker, name, market, locale, active,
                currency_symbol, currency_name,
                base_currency_symbol, base_currency_name,
                last_updated_utc, last_updated, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
              [
                item.ticker,
                item.name || null,
                item.market || null,
                item.locale || null,
                item.active === true || item.active === 'true' || item.active === 1 ? true : false,
                item.currency_symbol || null,
                item.currency_name || null,
                item.base_currency_symbol || null,
                item.base_currency_name || null,
                lastUpdatedUTC,
                lastUpdated
              ]
            );

            inserted++;
          } catch (error) {
            console.error(`   ⚠️  Error storing ${item.ticker}:`, error.message);
            skipped++;
          }
        }
        
        await client.query('COMMIT');
      } catch (batchError) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Error in batch ${i}-${i + batchSize}:`, batchError.message);
        skipped += batch.length;
      }

      if ((i + batchSize) % 500 === 0 || i + batchSize >= forex.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, forex.length)} / ${forex.length} new forex...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (already existed): ${skipped}\n`);

    return {
      inserted,
      skipped
    };

  } catch (error) {
    console.error('❌ Error storing new forex in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run incremental update to find and store new forex
 * @param {Object} options - Options for the update
 * @param {number} options.maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<Object>} Summary of the update operation
 */
async function updateNewForex(options = {}) {
  const { maxPages = null } = options;

  try {
    // Step 1: Get existing tickers (single database query)
    const existingTickers = await getExistingTickers();

    // Step 2: Fetch new forex from API (filtered client-side)
    const { newForex, totalFetched, apiCalls, pageCount } = await fetchNewForexFromMassive(
      existingTickers,
      maxPages
    );

    if (newForex.length === 0) {
      console.log('✅ No new forex found. Database is up to date!');
      return {
        success: true,
        newForexFound: 0,
        totalFetched,
        apiCalls,
        pageCount,
        message: 'No new forex found'
      };
    }

    // Step 3: Store only new forex
    const storageSummary = await storeNewForexInDatabase(newForex);

    return {
      success: true,
      newForexFound: newForex.length,
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

async function main() {
  try {
    const result = await updateNewForex();
    console.log('✅ Script completed!');
    if (result.success) {
      console.log(`   New forex found: ${result.newForexFound}`);
      console.log(`   API calls made: ${result.apiCalls}`);
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();


