/**
 * Fetch All Indices from Massive.com (formerly Polygon.io)
 * 
 * This script fetches all index tickers from Massive.com API
 * and stores them in the indices_data table.
 * 
 * Usage: node scripts/massive_api/fetchAllIndicesFromMassive.js
 */

require('dotenv').config();
const { pool } = require('../../db');
const axios = require('axios');

const API_KEY = process.env.POLYGON_API_KEY || 'Z4COFa5AuGVchpp3IaPCZyW6pfDzCR1t';
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';

// Rate limiting: Massive.com starter plan allows 5 calls per minute
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

async function fetchAllIndicesFromMassive() {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let allIndices = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;

  console.log('🚀 Starting to fetch all indices from Massive.com...\n');
  console.log(`📊 API Key: ${API_KEY.substring(0, 10)}...\n`);

  try {
    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          market: 'indices',
          active: 'true',
          order: 'asc',
          limit: LIMIT.toString(),
          sort: 'ticker',
          apiKey: API_KEY
        });

        // Add cursor for pagination if available
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
          allIndices = allIndices.concat(indices);
          totalFetched += indices.length;
          
          console.log(`   ✅ Fetched ${indices.length} index tickers (Total: ${totalFetched})`);

          // Check for next cursor - could be in next_url or cursor field
          if (responseData.next_url) {
            cursor = extractCursorFromUrl(responseData.next_url);
          } else if (responseData.cursor) {
            cursor = responseData.cursor;
          } else {
            cursor = null;
          }
          
          if (cursor) {
            console.log(`   ⏭️  Next page available (cursor: ${cursor.substring(0, 20)}...), waiting ${RATE_LIMIT_DELAY / 1000}s before next call...\n`);
            await delay(RATE_LIMIT_DELAY);
          } else {
            console.log(`   ✅ No more pages, completed!\n`);
          }
        } else {
          console.error('   ❌ Unexpected response format:', JSON.stringify(responseData, null, 2));
          break;
        }
      } catch (error) {
        console.error(`   ❌ Error:`, error.message || error);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data:`, error.response.data);
        }
        
        if (error.response && error.response.status === 429) {
          console.log('   ⏳ Rate limited, waiting 60 seconds...');
          await delay(60000);
          continue; // Retry this page
        } else if (error.response && error.response.status >= 500) {
          console.log('   ⏳ Server error, waiting 30 seconds before retry...');
          await delay(30000);
          continue; // Retry this page
        } else {
          break;
        }
      }
    } while (cursor);

    console.log(`\n📊 Fetch Summary:`);
    console.log(`   Total pages fetched: ${pageCount}`);
    console.log(`   Total index tickers fetched: ${allIndices.length}\n`);

    return allIndices;
  } catch (error) {
    console.error('❌ Error fetching indices:', error);
    throw error;
  }
}

async function storeIndicesInDatabase(indices) {
  console.log('💾 Storing indices in database...\n');

  // Initialize database to ensure indices_data table exists
  const { initDb } = require('../../db');
  await initDb();

  const client = await pool.connect();
  
  try {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < indices.length; i += batchSize) {
      const batch = indices.slice(i, i + batchSize);
      
      // Start transaction for each batch
      await client.query('BEGIN');
      
      try {
        for (const item of batch) {
          try {
            // Parse last_updated_utc from API response
            const lastUpdatedUTC = item.last_updated_utc ? new Date(item.last_updated_utc) : null;
            // last_updated is set to current timestamp when we update the record
            const lastUpdated = new Date();
            
            const exists = await client.query(
              'SELECT ticker FROM indices_data WHERE ticker = $1',
              [item.ticker]
            );

            await client.query(
              `INSERT INTO indices_data (
                ticker, name, market, locale, active,
                currency_symbol, currency_name,
                base_currency_symbol, base_currency_name,
                last_updated_utc, last_updated, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
              ON CONFLICT (ticker) DO UPDATE SET
                name = EXCLUDED.name,
                market = EXCLUDED.market,
                locale = EXCLUDED.locale,
                active = EXCLUDED.active::BOOLEAN,
                currency_symbol = EXCLUDED.currency_symbol,
                currency_name = EXCLUDED.currency_name,
                base_currency_symbol = EXCLUDED.base_currency_symbol,
                base_currency_name = EXCLUDED.base_currency_name,
                last_updated_utc = EXCLUDED.last_updated_utc,
                last_updated = EXCLUDED.last_updated,
                updated_at = CURRENT_TIMESTAMP`,
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

            if (exists.rows.length > 0) {
              updated++;
            } else {
              inserted++;
            }
          } catch (error) {
            console.error(`   ⚠️  Error storing ${item.ticker}:`, error.message);
            skipped++;
          }
        }
        
        // Commit batch transaction
        await client.query('COMMIT');
      } catch (batchError) {
        // Rollback batch on error
        await client.query('ROLLBACK');
        console.error(`   ❌ Error in batch ${i}-${i + batchSize}:`, batchError.message);
        // Mark all in batch as skipped
        skipped += batch.length;
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= indices.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, indices.length)} / ${indices.length} index tickers...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
    console.log(`   Total processed: ${inserted + updated + skipped}\n`);

  } catch (error) {
    console.error('❌ Error storing indices in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    // Fetch all indices from Massive.com
    const indices = await fetchAllIndicesFromMassive();

    if (indices.length === 0) {
      console.log('⚠️  No indices fetched. Exiting.');
      return;
    }

    // Store in database
    await storeIndicesInDatabase(indices);

    console.log('✅ Script completed successfully!');
    console.log(`\n📊 Final Summary:`);
    console.log(`   Total index tickers fetched: ${indices.length}`);
    console.log(`   Index tickers stored in database: ${indices.length}\n`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();

