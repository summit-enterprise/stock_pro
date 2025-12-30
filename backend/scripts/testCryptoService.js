/**
 * Test Crypto Service
 * Quick test to verify crypto service integration
 */

require('dotenv').config();
const cryptoService = require('../services/crypto/cryptoService');
const cryptoPriceService = require('../services/crypto/cryptoPriceService');

async function testCryptoService() {
  try {
    console.log('🧪 Testing Crypto Service...\n');
    
    // Test 1: Fetch crypto list (small sample)
    console.log('Test 1: Fetching top 5 cryptocurrencies...');
    const cryptos = await cryptoService.fetchCryptoList(5);
    console.log(`✅ Fetched ${cryptos.length} cryptos`);
    cryptos.forEach(c => {
      console.log(`   - ${c.symbol}: ${c.name} ($${c.currentPrice?.toFixed(2) || 'N/A'})`);
    });
    console.log();
    
    // Test 2: Fetch current price for Bitcoin
    console.log('Test 2: Fetching current price for Bitcoin...');
    const btcPrice = await cryptoPriceService.fetchCurrentPrice('bitcoin', 'BTC');
    if (btcPrice) {
      console.log(`✅ BTC Price: $${btcPrice.price.toFixed(2)}`);
      console.log(`   24h Change: ${btcPrice.priceChange24h.toFixed(2)}%`);
      console.log(`   Market Cap: $${(btcPrice.marketCap / 1e9).toFixed(2)}B`);
    } else {
      console.log('⚠️  Could not fetch BTC price');
    }
    console.log();
    
    // Test 3: Fetch historical prices (last 7 days)
    console.log('Test 3: Fetching historical prices for Bitcoin (last 7 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const historical = await cryptoPriceService.fetchHistoricalPrices(
      'bitcoin',
      'BTC',
      startDate,
      endDate
    );
    
    if (historical && historical.length > 0) {
      console.log(`✅ Fetched ${historical.length} data points`);
      console.log(`   First: ${historical[0].date} - $${historical[0].close.toFixed(2)}`);
      console.log(`   Last: ${historical[historical.length - 1].date} - $${historical[historical.length - 1].close.toFixed(2)}`);
    } else {
      console.log('⚠️  Could not fetch historical data');
    }
    
    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCryptoService();

