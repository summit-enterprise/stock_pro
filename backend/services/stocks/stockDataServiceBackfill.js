/**
 * Stock Data Service - Backfill
 * 
 * This service performs a full backfill of all stocks from Massive.com API.
 * It fetches ALL stocks and stores them in the database.
 * 
 * Use this for initial data population or periodic full refreshes.
 * 
 * For incremental updates of new assets only, use stockDataService.js
 */

require('dotenv').config();
const { pool } = require('../../db');
const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');
const axios = require('axios');

const API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls

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
 * Fetch all stocks from Massive.com API (full backfill)
 * @returns {Promise<Array>} Array of all stocks
 */
async function fetchAllStocksFromMassive() {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let allStocks = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;
  const limit = 1000; // Maximum per page

  console.log('🚀 Starting full backfill of all stocks from Massive.com...\n');

  try {
    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      try {
        const params = new URLSearchParams({
          market: 'stocks',
          active: 'true',
          order: 'asc',
          limit: limit.toString(),
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
          allStocks = allStocks.concat(stocks);
          totalFetched += stocks.length;
          
          console.log(`   ✅ Fetched ${stocks.length} stocks (Total: ${totalFetched})`);

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

    console.log(`\n📊 Backfill Summary:`);
    console.log(`   Total pages fetched: ${pageCount}`);
    console.log(`   Total stocks fetched: ${allStocks.length}\n`);

    return allStocks;
  } catch (error) {
    console.error('❌ Error fetching stocks:', error);
    throw error;
  }
}

/**
 * Store stocks in database
 * @param {Array} stocks - Array of stock objects from API
 * @returns {Promise<Object>} Summary of insertions/updates
 */
async function storeStocksInDatabase(stocks) {
  console.log('💾 Storing stocks in database...\n');

  const client = await pool.connect();
  
  try {
    let stockDataInserted = 0;
    let stockDataUpdated = 0;
    let assetInfoInserted = 0;
    let assetInfoUpdated = 0;
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
            
            const stockDataExists = await client.query(
              'SELECT ticker FROM stock_data WHERE ticker = $1',
              [stock.ticker]
            );

            await client.query(
              `INSERT INTO stock_data (
                ticker, active, cik, composite_figi, currency_name,
                last_updated_utc, last_updated, locale, market, name, 
                primary_exchange, share_class_figi, type, acronym, massive_id, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
              ON CONFLICT (ticker) DO UPDATE SET
                active = EXCLUDED.active::BOOLEAN,
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
                acronym = EXCLUDED.acronym,
                massive_id = EXCLUDED.massive_id,
                updated_at = CURRENT_TIMESTAMP`,
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

            if (stockDataExists.rows.length > 0) {
              stockDataUpdated++;
            } else {
              stockDataInserted++;
            }

            // Also store in asset_info for backward compatibility
            const tickerSymbol = extractTickerSymbol(stock.ticker);
            const displayName = generateDisplayName(stock.ticker, stock.name);

            let category = 'Equity';
            if (stock.type === 'ETF' || stock.type === 'ETP') {
              category = 'ETF';
            } else if (stock.type === 'ADRC' || stock.type === 'ADRW' || stock.type === 'ADRR') {
              category = 'ADR';
            }

            const assetInfoExists = await client.query(
              'SELECT symbol FROM asset_info WHERE symbol = $1',
              [stock.ticker]
            );

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

            if (assetInfoExists.rows.length > 0) {
              assetInfoUpdated++;
            } else {
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

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= stocks.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, stocks.length)} / ${stocks.length} stocks...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Stock Data - Inserted: ${stockDataInserted}, Updated: ${stockDataUpdated}`);
    console.log(`   Asset Info - Inserted: ${assetInfoInserted}, Updated: ${assetInfoUpdated}`);
    console.log(`   Skipped: ${skipped}\n`);

    return {
      stockDataInserted,
      stockDataUpdated,
      assetInfoInserted,
      assetInfoUpdated,
      skipped
    };

  } catch (error) {
    console.error('❌ Error storing stocks in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run full backfill
 * @returns {Promise<Object>} Summary of the backfill operation
 */
async function runBackfill() {
  try {
    const stocks = await fetchAllStocksFromMassive();

    if (stocks.length === 0) {
      console.log('⚠️  No stocks fetched. Exiting.');
      return { success: false, message: 'No stocks fetched' };
    }

    const summary = await storeStocksInDatabase(stocks);

    return {
      success: true,
      totalFetched: stocks.length,
      ...summary
    };
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fetchAllStocksFromMassive,
  storeStocksInDatabase,
  runBackfill,
  mapExchange
};


