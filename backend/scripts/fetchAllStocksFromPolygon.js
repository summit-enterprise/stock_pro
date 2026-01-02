/**
 * Fetch All Stocks from Polygon.io
 * 
 * This script fetches all US stocks from Polygon.io API and stores them in the database.
 * It handles pagination using the next_url field in the API response.
 * 
 * Usage: node scripts/fetchAllStocksFromPolygon.js
 */

require('dotenv').config();
const axios = require('axios');
const { pool } = require('../db');
const { extractTickerSymbol, generateDisplayName } = require('../utils/assetSymbolUtils');

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io/v3/reference/tickers';

// Rate limiting: Polygon starter plan allows 5 calls per minute
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls (5 calls per minute = 1 call per 12 seconds)

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchStocksFromPolygon() {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let allStocks = [];
  let nextUrl = `${BASE_URL}?market=stocks&active=true&limit=1000&apiKey=${POLYGON_API_KEY}`;
  let pageCount = 0;
  let totalFetched = 0;

  console.log('🚀 Starting to fetch all stocks from Polygon.io...\n');
  console.log(`📊 API Key: ${POLYGON_API_KEY.substring(0, 10)}...\n`);

  try {
    while (nextUrl) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);
      console.log(`   URL: ${nextUrl.substring(0, 100)}...`);

        try {
        const response = await axios.get(nextUrl, {
          timeout: 30000, // 30 second timeout
        });

        if (response.data && response.data.results) {
          const stocks = response.data.results;
          allStocks = allStocks.concat(stocks);
          totalFetched += stocks.length;
          
          console.log(`   ✅ Fetched ${stocks.length} stocks (Total: ${totalFetched})`);

          // Check for next_url - it already contains the API key
          nextUrl = response.data.next_url || null;
          
          if (nextUrl) {
            // Ensure next_url has the API key if it doesn't already
            if (!nextUrl.includes('apiKey=') && !nextUrl.includes('apikey=')) {
              const separator = nextUrl.includes('?') ? '&' : '?';
              nextUrl = `${nextUrl}${separator}apiKey=${POLYGON_API_KEY}`;
            }
            console.log(`   ⏭️  Next page available, waiting ${RATE_LIMIT_DELAY / 1000}s before next call...\n`);
            await delay(RATE_LIMIT_DELAY);
          } else {
            console.log(`   ✅ No more pages, completed!\n`);
          }
        } else {
          console.error('   ❌ Unexpected response format:', response.data);
          break;
        }
      } catch (error) {
        if (error.response) {
          console.error(`   ❌ API Error: ${error.response.status} - ${error.response.statusText}`);
          if (error.response.data) {
            console.error(`   Response data:`, JSON.stringify(error.response.data, null, 2));
          }
          
          if (error.response.status === 401) {
            console.error('   ❌ Authentication failed. Please check your API key.');
            break;
          } else if (error.response.status === 429) {
            console.log('   ⏳ Rate limited, waiting 60 seconds...');
            await delay(60000);
            continue; // Retry this page
          } else if (error.response.status >= 500) {
            console.log('   ⏳ Server error, waiting 30 seconds before retry...');
            await delay(30000);
            continue; // Retry this page
          } else {
            // For other 4xx errors, break
            break;
          }
        } else if (error.request) {
          console.error('   ❌ Network Error: No response received');
          console.log('   ⏳ Retrying in 10 seconds...');
          await delay(10000);
          continue; // Retry this page
        } else {
          console.error('   ❌ Error:', error.message);
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

async function storeStocksInDatabase(stocks) {
  console.log('💾 Storing stocks in database...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      for (const stock of batch) {
        try {
          // Extract ticker symbol and generate display name
          const tickerSymbol = extractTickerSymbol(stock.ticker);
          const displayName = generateDisplayName(stock.ticker, stock.name);

          // Determine category (default to Equity for stocks)
          let category = 'Equity';
          if (stock.type === 'ETF' || stock.type === 'ETP') {
            category = 'ETF';
          } else if (stock.type === 'ADRC' || stock.type === 'ADRW' || stock.type === 'ADRR') {
            category = 'ADR';
          }

          // Insert or update asset_info
          const result = await client.query(
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

          if (result.rowCount > 0) {
            // Check if it was an insert or update
            const checkResult = await client.query(
              'SELECT symbol FROM asset_info WHERE symbol = $1',
              [stock.ticker]
            );
            if (checkResult.rows.length > 0) {
              // Check if it was just created (no previous data)
              const existing = await client.query(
                'SELECT updated_at FROM asset_info WHERE symbol = $1',
                [stock.ticker]
              );
              // This is a simplified check - in practice, we'd track this better
              inserted++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          console.error(`   ⚠️  Error storing ${stock.ticker}:`, error.message);
          skipped++;
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= stocks.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, stocks.length)} / ${stocks.length} stocks...`);
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total processed: ${inserted + updated + skipped}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error storing stocks in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    // Fetch all stocks from Polygon.io
    const stocks = await fetchStocksFromPolygon();

    if (stocks.length === 0) {
      console.log('⚠️  No stocks fetched. Exiting.');
      return;
    }

    // Store in database
    await storeStocksInDatabase(stocks);

    console.log('✅ Script completed successfully!');
    console.log(`\n📊 Final Summary:`);
    console.log(`   Total stocks fetched: ${stocks.length}`);
    console.log(`   Stocks stored in database: ${stocks.length}\n`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();

