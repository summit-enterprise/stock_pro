/**
 * Update New Indices from Massive.com - Incremental Updates
 * 
 * This script efficiently finds NEW index tickers from Massive.com API that don't exist
 * in our database yet, with minimum API hits.
 * 
 * Strategy:
 * 1. Get all existing tickers from indices_data table (single query)
 * 2. Fetch indices from Massive API in batches
 * 3. Filter out existing tickers (client-side, no extra API calls)
 * 4. Only insert new indices
 * 
 * Usage: node scripts/massive_api/updateNewIndicesFromMassive.js
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
 * Get all existing index tickers from database
 * @returns {Promise<Set<string>>} Set of existing ticker symbols
 */
async function getExistingTickers() {
  try {
    const result = await pool.query('SELECT ticker FROM indices_data');
    const tickers = new Set(result.rows.map(row => row.ticker));
    console.log(`📊 Found ${tickers.size} existing index tickers in database`);
    return tickers;
  } catch (error) {
    console.error('Error fetching existing index tickers:', error.message);
    return new Set();
  }
}

/**
 * Fetch new indices from Massive.com API (only those not in database)
 * @param {Set<string>} existingTickers - Set of tickers we already have
 * @param {number} maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<{newIndices: Array, totalFetched: number, apiCalls: number}>}
 */
async function fetchNewIndicesFromMassive(existingTickers, maxPages = null) {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let newIndices = [];
  let allFetchedIndices = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;
  let apiCalls = 0;

  console.log('🔍 Starting incremental update to find new indices...\n');
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
          market: 'indices',
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
          const indices = responseData.results;
          allFetchedIndices = allFetchedIndices.concat(indices);
          totalFetched += indices.length;
          
          // Filter out existing tickers (client-side, no extra API calls)
          const newIndicesInBatch = indices.filter(item => !existingTickers.has(item.ticker));
          newIndices = newIndices.concat(newIndicesInBatch);
          
          console.log(`   ✅ Fetched ${indices.length} index tickers (Total: ${totalFetched})`);
          console.log(`   🆕 Found ${newIndicesInBatch.length} new indices in this batch (Total new: ${newIndices.length})`);

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
    console.log(`   Total indices fetched: ${totalFetched}`);
    console.log(`   New indices found: ${newIndices.length}`);
    console.log(`   Efficiency: ${totalFetched > 0 ? ((newIndices.length / totalFetched) * 100).toFixed(2) : 0}% new indices\n`);

    return {
      newIndices,
      totalFetched,
      apiCalls,
      pageCount
    };
  } catch (error) {
    console.error('❌ Error fetching new indices:', error);
    throw error;
  }
}

/**
 * Store new indices in database (only inserts, no updates)
 * @param {Array} indices - Array of new index objects from API
 * @returns {Promise<Object>} Summary of insertions
 */
async function storeNewIndicesInDatabase(indices) {
  if (indices.length === 0) {
    console.log('ℹ️  No new indices to store.');
    return {
      inserted: 0,
      skipped: 0
    };
  }

  console.log(`💾 Storing ${indices.length} new indices in database...\n`);

  const client = await pool.connect();
  
  try {
    let inserted = 0;
    let skipped = 0;

    const batchSize = 100;
    for (let i = 0; i < indices.length; i += batchSize) {
      const batch = indices.slice(i, i + batchSize);
      
      await client.query('BEGIN');
      
      try {
        for (const item of batch) {
          try {
            const lastUpdatedUTC = item.last_updated_utc ? new Date(item.last_updated_utc) : null;
            const lastUpdated = new Date();
            
            // Check if it still doesn't exist (race condition protection)
            const exists = await client.query(
              'SELECT ticker FROM indices_data WHERE ticker = $1',
              [item.ticker]
            );

            if (exists.rows.length > 0) {
              // Already exists, skip
              skipped++;
              continue;
            }

            // Insert into indices_data
            await client.query(
              `INSERT INTO indices_data (
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

      if ((i + batchSize) % 500 === 0 || i + batchSize >= indices.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, indices.length)} / ${indices.length} new indices...`);
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
    console.error('❌ Error storing new indices in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run incremental update to find and store new indices
 * @param {Object} options - Options for the update
 * @param {number} options.maxPages - Maximum number of pages to fetch (default: unlimited)
 * @returns {Promise<Object>} Summary of the update operation
 */
async function updateNewIndices(options = {}) {
  const { maxPages = null } = options;

  try {
    // Step 1: Get existing tickers (single database query)
    const existingTickers = await getExistingTickers();

    // Step 2: Fetch new indices from API (filtered client-side)
    const { newIndices, totalFetched, apiCalls, pageCount } = await fetchNewIndicesFromMassive(
      existingTickers,
      maxPages
    );

    if (newIndices.length === 0) {
      console.log('✅ No new indices found. Database is up to date!');
      return {
        success: true,
        newIndicesFound: 0,
        totalFetched,
        apiCalls,
        pageCount,
        message: 'No new indices found'
      };
    }

    // Step 3: Store only new indices
    const storageSummary = await storeNewIndicesInDatabase(newIndices);

    return {
      success: true,
      newIndicesFound: newIndices.length,
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
    const result = await updateNewIndices();
    console.log('✅ Script completed!');
    if (result.success) {
      console.log(`   New indices found: ${result.newIndicesFound}`);
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


