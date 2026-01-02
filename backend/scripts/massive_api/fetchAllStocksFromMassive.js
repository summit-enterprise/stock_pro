/**
 * Fetch All Stocks from Massive.com (formerly Polygon.io)
 * 
 * This script fetches all US stocks from Massive.com API using their client library
 * and stores them in the database. It also exports to CSV.
 * 
 * Usage: node scripts/massive_api/fetchAllStocksFromMassive.js
 */

require('dotenv').config();
const { pool } = require('../../db');
const { extractTickerSymbol, generateDisplayName } = require('../../utils/assetSymbolUtils');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.POLYGON_API_KEY || 'Z4COFa5AuGVchpp3IaPCZyW6pfDzCR1t';
const BASE_URL = 'https://api.massive.com/v3/reference/tickers';

// Rate limiting: Massive.com starter plan allows 5 calls per minute
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls

/**
 * Exchange mapping: Primary Exchange (MIC Code) -> Acronym and Massive ID
 * MIC	Massive ID	Exchange Name	Acronym
 * XNAS	1	NASDAQ	NASDAQ
 * XNYS	11	New York Stock Exchange	NYSE
 * ARCX	12	NYSE Arca	ARCA
 * XASE	2	NYSE American (AMEX)	AMEX
 * BATS	3	Cboe BZX Exchange	BATS
 * BATY	4	Cboe BYX Exchange	BYX
 * EDGA	5	Cboe EDGA Exchange	EDGA
 * EDGX	6	Cboe EDGX Exchange	EDGX
 * IEXG	15	Investors Exchange	IEX
 * XPHL	10	Nasdaq PHLX	PHLX
 * XBOS	8	Nasdaq BX	BX
 * XPSX	9	Nasdaq PSX	PSX
 * XCHI	13	NYSE Chicago	CHX
 * XCIS	14	NYSE National	NSX
 * LTSE	16	Long-Term Stock Exchange	LTSE
 * MEMX	17	Members Exchange	MEMX
 * OTCM	19	OTC Markets	OTC
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
 * @param {string} primaryExchange - The primary exchange MIC code (e.g., 'XNAS', 'XNYS')
 * @returns {Object} Object with acronym and massive_id, or null if not found
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
  
  // Return null if exchange not in mapping
  return { acronym: null, massive_id: null };
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllStocksFromMassive() {
  if (!API_KEY) {
    throw new Error('POLYGON_API_KEY is not set in environment variables');
  }

  let allStocks = [];
  let pageCount = 0;
  let totalFetched = 0;
  let cursor = null;
  const limit = 1000; // Maximum per page

  console.log('🚀 Starting to fetch all stocks from Massive.com...\n');
  console.log(`📊 API Key: ${API_KEY.substring(0, 10)}...\n`);

  try {
    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          market: 'stocks',
          active: 'true',
          order: 'asc',
          limit: limit.toString(),
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
          const stocks = responseData.results;
          allStocks = allStocks.concat(stocks);
          totalFetched += stocks.length;
          
          console.log(`   ✅ Fetched ${stocks.length} stocks (Total: ${totalFetched})`);

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
    console.log(`   Total stocks fetched: ${allStocks.length}\n`);

    return allStocks;
  } catch (error) {
    console.error('❌ Error fetching stocks:', error);
    throw error;
  }
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
    // If next_url is just a cursor string, return it
    return nextUrl;
  }
}

/**
 * Export stocks to CSV file
 */
function exportToCSV(stocks, filename = 'stocks_export.csv') {
  console.log(`📝 Exporting ${stocks.length} stocks to CSV...\n`);

  const csvDir = path.join(__dirname, '..', '..', 'exports');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  const filePath = path.join(csvDir, filename);

  // CSV Headers
  const headers = [
    'ticker',
    'name',
    'market',
    'locale',
    'primary_exchange',
    'acronym',
    'massive_id',
    'type',
    'active',
    'currency_name',
    'cik',
    'composite_figi',
    'share_class_figi',
    'last_updated_utc'
  ];

  // Create CSV content
  let csvContent = headers.join(',') + '\n';

  stocks.forEach(stock => {
    const exchangeMapping = mapExchange(stock.primary_exchange);
    const row = [
      stock.ticker || '',
      `"${(stock.name || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
      stock.market || '',
      stock.locale || '',
      stock.primary_exchange || '',
      exchangeMapping.acronym || '',
      exchangeMapping.massive_id || '',
      stock.type || '',
      stock.active || '',
      stock.currency_name || '',
      stock.cik || '',
      stock.composite_figi || '',
      stock.share_class_figi || '',
      stock.last_updated_utc || ''
    ];
    csvContent += row.join(',') + '\n';
  });

  // Write to file
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`✅ CSV file created: ${filePath}`);
  console.log(`   File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB\n`);

  return filePath;
}

async function storeStocksInDatabase(stocks) {
  console.log('💾 Storing stocks in database...\n');

  // Initialize database to ensure stock_data table exists
  const { initDb } = require('../../db');
  await initDb();

  const client = await pool.connect();
  
  try {
    let stockDataInserted = 0;
    let stockDataUpdated = 0;
    let assetInfoInserted = 0;
    let assetInfoUpdated = 0;
    let skipped = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      // Start transaction for each batch
      await client.query('BEGIN');
      
      try {
        for (const stock of batch) {
          try {
          // 1. Store raw data in stock_data table
          // Parse last_updated_utc from API response
          const lastUpdatedUTC = stock.last_updated_utc ? new Date(stock.last_updated_utc) : null;
          // last_updated is set to current timestamp when we update the record
          const lastUpdated = new Date();
          
          // Map primary exchange to acronym and Massive ID
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
              stock.active === true || stock.active === 'true' || stock.active === 1 ? true : false, // Ensure boolean
              stock.cik || null,
              stock.composite_figi || null,
              stock.currency_name || null,
              lastUpdatedUTC,
              lastUpdated, // Current timestamp when we update
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

          // 2. Also store in asset_info for backward compatibility
          const tickerSymbol = extractTickerSymbol(stock.ticker);
          const displayName = generateDisplayName(stock.ticker, stock.name);

          // Determine category (default to Equity for stocks)
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
        
        // Commit batch transaction
        await client.query('COMMIT');
      } catch (batchError) {
        // Rollback batch on error
        await client.query('ROLLBACK');
        console.error(`   ❌ Error in batch ${i}-${i + batchSize}:`, batchError.message);
        // Mark all in batch as skipped
        skipped += batch.length;
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= stocks.length) {
        console.log(`   📊 Processed ${Math.min(i + batchSize, stocks.length)} / ${stocks.length} stocks...`);
      }
    }

    console.log(`\n✅ Database storage complete!`);
    console.log(`   Stock Data - Inserted: ${stockDataInserted}, Updated: ${stockDataUpdated}`);
    console.log(`   Asset Info - Inserted: ${assetInfoInserted}, Updated: ${assetInfoUpdated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total processed: ${stockDataInserted + stockDataUpdated + skipped}\n`);

  } catch (error) {
    console.error('❌ Error storing stocks in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    // Fetch all stocks from Massive.com
    const stocks = await fetchAllStocksFromMassive();

    if (stocks.length === 0) {
      console.log('⚠️  No stocks fetched. Exiting.');
      return;
    }

    // Export to CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const csvFile = exportToCSV(stocks, `stocks_export_${timestamp}.csv`);

    // Store in database
    await storeStocksInDatabase(stocks);

    console.log('✅ Script completed successfully!');
    console.log(`\n📊 Final Summary:`);
    console.log(`   Total stocks fetched: ${stocks.length}`);
    console.log(`   CSV file: ${csvFile}`);
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

