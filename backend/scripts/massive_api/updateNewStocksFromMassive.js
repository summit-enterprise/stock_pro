/**
 * Update New Stocks from Massive.com
 * 
 * This script queries the Massive.com API to find new ticker symbols
 * that don't exist in our stock_data table and adds them.
 * 
 * It compares the API response with existing records and only inserts new ones.
 * 
 * Usage: node scripts/updateNewStocksFromMassive.js
 */

require('dotenv').config();
const axios = require('axios');
const { pool } = require('../../db');
const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');

const API_KEY = process.env.POLYGON_API_KEY || 'Z4COFa5AuGVchpp3IaPCZyW6pfDzCR1t';
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';

// Rate limiting: Massive.com starter plan allows 5 calls per minute
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls

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
 * Fetch all stocks from Massive.com API
 */
async function fetchAllStocksFromMassive() {
  let allStocks = [];
  let nextUrl = `${BASE_URL}?market=stocks&active=true&limit=1000&apiKey=${API_KEY}`;
  let pageCount = 0;
  let totalFetched = 0;

  console.log('🚀 Fetching all stocks from Massive.com API...\n');

  try {
    while (nextUrl) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      try {
        const params = new URLSearchParams({
          market: 'stocks',
          active: 'true',
          order: 'asc',
          limit: '1000',
          sort: 'ticker',
          apiKey: API_KEY
        });

        // Add cursor for pagination if available
        const cursor = extractCursorFromUrl(nextUrl);
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
          allStocks = allStocks.concat(stocks);
          totalFetched += stocks.length;
          
          console.log(`   ✅ Fetched ${stocks.length} stocks (Total: ${totalFetched})`);

          // Check for next cursor
          if (responseData.next_url) {
            nextUrl = responseData.next_url;
            // Ensure next_url has the API key if it doesn't already
            if (!nextUrl.includes('apiKey=') && !nextUrl.includes('apikey=')) {
              const separator = nextUrl.includes('?') ? '&' : '?';
              nextUrl = `${nextUrl}${separator}apiKey=${API_KEY}`;
            }
            console.log(`   ⏭️  Next page available, waiting ${RATE_LIMIT_DELAY / 1000}s...\n`);
            await delay(RATE_LIMIT_DELAY);
          } else {
            nextUrl = null;
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
          continue;
        } else if (error.response && error.response.status >= 500) {
          console.log('   ⏳ Server error, waiting 30 seconds before retry...');
          await delay(30000);
          continue;
        } else {
          break;
        }
      }
    }

    console.log(`\n📊 Fetch Summary:`);
    console.log(`   Total pages fetched: ${pageCount}`);
    console.log(`   Total stocks fetched: ${allStocks.length}\n`);

    return allStocks;
  } catch (error) {
    console.error('❌ Error fetching stocks:', error);
    throw error;
  }
}

/**
 * Get existing tickers from database
 */
async function getExistingTickers() {
  const result = await pool.query('SELECT ticker FROM stock_data');
  return new Set(result.rows.map(row => row.ticker));
}

/**
 * Store new stocks in database
 */
async function storeNewStocks(newStocks) {
  if (newStocks.length === 0) {
    console.log('✅ No new stocks to add.\n');
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  console.log(`💾 Storing ${newStocks.length} new stocks in database...\n`);

  const client = await pool.connect();
  
  try {
    let stockDataInserted = 0;
    let assetInfoInserted = 0;
    let skipped = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < newStocks.length; i += batchSize) {
      const batch = newStocks.slice(i, i + batchSize);
      
      // Start transaction for each batch
      await client.query('BEGIN');
      
      try {
        for (const stock of batch) {
          try {
            // Parse last_updated_utc from API response
            const lastUpdatedUTC = stock.last_updated_utc ? new Date(stock.last_updated_utc) : null;
            const lastUpdated = new Date();

            // 1. Store in stock_data table
            await client.query(
              `INSERT INTO stock_data (
                ticker, active, cik, composite_figi, currency_name,
                last_updated_utc, last_updated, locale, market, name, 
                primary_exchange, share_class_figi, type, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
              ON CONFLICT (ticker) DO UPDATE SET
                active = EXCLUDED.active,
                cik = EXCLUDED.cik,
                composite_figi = EXCLUDED.composite_figi,
                currency_name = EXCLUDED.currency_name,
                last_updated_utc = EXCLUDED.last_updated_utc,
                last_updated = EXCLUDED.last_updated,
                locale = EXCLUDED.locale,
                market = EXCLUDED.market,
                name = EXCLUDED.name,
                primary_exchange = EXCLUDED.primary_exchange,
                share_class_figi = EXCLUDED.share_class_figi,
                type = EXCLUDED.type,
                updated_at = CURRENT_TIMESTAMP`,
              [
                stock.ticker,
                stock.active !== undefined ? stock.active : true,
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
                stock.type || null
              ]
            );

            stockDataInserted++;

            // 2. Also store in asset_info for backward compatibility
            const tickerSymbol = extractTickerSymbol(stock.ticker);
            const displayName = generateDisplayName(stock.ticker, stock.name);

            let category = 'Equity';
            if (stock.type === 'ETF' || stock.type === 'ETP') {
              category = 'ETF';
            } else if (stock.type === 'ADRC' || stock.type === 'ADRW' || stock.type === 'ADRR') {
              category = 'ADR';
            }

            await client.query(
              `INSERT INTO asset_info (
                symbol, name, type, exchange, currency, 
                ticker_symbol, display_name, category, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
              ON CONFLICT (symbol) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                exchange = EXCLUDED.exchange,
                currency = EXCLUDED.currency,
                ticker_symbol = EXCLUDED.ticker_symbol,
                display_name = EXCLUDED.display_name,
                category = EXCLUDED.category,
                updated_at = CURRENT_TIMESTAMP`,
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

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= newStocks.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, newStocks.length)} / ${newStocks.length} new stocks...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Stock Data - Inserted: ${stockDataInserted}`);
    console.log(`   Asset Info - Inserted: ${assetInfoInserted}`);
    console.log(`   Skipped: ${skipped}\n`);

    return { inserted: stockDataInserted, updated: 0, skipped };
  } catch (error) {
    console.error('❌ Error storing stocks in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    // Initialize database to ensure table exists
    const { initDb } = require('../../db');
    await initDb();

    // 1. Get existing tickers from database
    console.log('📊 Getting existing tickers from database...\n');
    const existingTickers = await getExistingTickers();
    console.log(`   Found ${existingTickers.size} existing tickers in database\n`);

    // 2. Fetch all stocks from Massive.com API
    const allStocks = await fetchAllStocksFromMassive();

    if (allStocks.length === 0) {
      console.log('⚠️  No stocks fetched from API. Exiting.');
      return;
    }

    // 3. Find new tickers (not in database)
    const newStocks = allStocks.filter(stock => !existingTickers.has(stock.ticker));

    console.log(`\n🔍 Comparison Results:`);
    console.log(`   Total stocks from API: ${allStocks.length}`);
    console.log(`   Existing in database: ${existingTickers.size}`);
    console.log(`   New stocks to add: ${newStocks.length}\n`);

    if (newStocks.length === 0) {
      console.log('✅ All stocks are already in the database. No updates needed.\n');
      return;
    }

    // 4. Store new stocks
    const result = await storeNewStocks(newStocks);

    console.log('✅ Script completed successfully!');
    console.log(`\n📊 Final Summary:`);
    console.log(`   New stocks found: ${newStocks.length}`);
    console.log(`   Stocks inserted: ${result.inserted}`);
    console.log(`   Stocks skipped: ${result.skipped}\n`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();

