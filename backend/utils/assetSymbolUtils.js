/**
 * Asset Symbol Utilities
 * Helper functions for extracting ticker symbols and display names
 */

/**
 * Extract ticker symbol from database symbol
 * Examples:
 *   "X:BTCUSD" -> "BTC"
 *   "AAPL" -> "AAPL"
 *   "^GSPC" -> "^GSPC"
 */
function extractTickerSymbol(symbol) {
  if (!symbol) return null;
  
  // Crypto format: X:BTCUSD -> BTC
  if (symbol.startsWith('X:') && symbol.endsWith('USD')) {
    return symbol.replace('X:', '').replace('USD', '');
  }
  
  // Index format: ^GSPC -> ^GSPC (keep as is)
  if (symbol.startsWith('^')) {
    return symbol;
  }
  
  // Regular stock/ETF: AAPL -> AAPL (keep as is)
  return symbol;
}

/**
 * Generate display name from symbol and name
 * Examples:
 *   symbol: "X:BTCUSD", name: "Bitcoin" -> "Bitcoin"
 *   symbol: "AAPL", name: "Apple Inc." -> "Apple Inc."
 *   symbol: "X:BTCUSD", name: null -> "Bitcoin" (from ticker)
 */
function generateDisplayName(symbol, name) {
  if (name && name.trim()) {
    // Clean up name (remove common suffixes)
    return name
      .replace(/\s+Inc\.?$/i, '')
      .replace(/\s+Corp\.?$/i, '')
      .replace(/\s+Ltd\.?$/i, '')
      .replace(/\s+LLC\.?$/i, '')
      .replace(/\s+Co\.?$/i, '')
      .trim();
  }
  
  // Fallback: generate from ticker
  const ticker = extractTickerSymbol(symbol);
  if (ticker) {
    // For crypto, use common names
    const cryptoNames = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'ADA': 'Cardano',
      'SOL': 'Solana',
      'XRP': 'Ripple',
      'DOT': 'Polkadot',
      'DOGE': 'Dogecoin',
      'AVAX': 'Avalanche',
      'SHIB': 'Shiba Inu',
      'MATIC': 'Polygon',
      'UNI': 'Uniswap',
      'LTC': 'Litecoin',
      'ALGO': 'Algorand',
      'ATOM': 'Cosmos',
      'VET': 'VeChain',
      'ICP': 'Internet Computer',
      'THETA': 'Theta Network',
      'FIL': 'Filecoin',
      'TRX': 'TRON',
      'ETC': 'Ethereum Classic',
      'XLM': 'Stellar',
      'AAVE': 'Aave',
      'EOS': 'EOS',
      'MKR': 'Maker',
      'GRT': 'The Graph',
      'SNX': 'Synthetix',
      'COMP': 'Compound',
      'YFI': 'Yearn Finance',
      'SUSHI': 'SushiSwap',
    };
    
    if (cryptoNames[ticker]) {
      return cryptoNames[ticker];
    }
    
    // For indices
    if (ticker.startsWith('^')) {
      const indexNames = {
        '^GSPC': 'S&P 500',
        '^DJI': 'Dow Jones',
        '^IXIC': 'NASDAQ Composite',
        '^RUT': 'Russell 2000',
        '^FTSE': 'FTSE 100',
        '^N225': 'Nikkei 225',
        '^GSPTSE': 'S&P/TSX 60',
      };
      return indexNames[ticker] || ticker;
    }
  }
  
  return symbol;
}

/**
 * Generate search aliases for an asset
 * Returns array of alternative names/symbols that can be used for search
 */
function generateSearchAliases(symbol, name, ticker) {
  const aliases = new Set();
  
  // Add ticker symbol
  if (ticker) {
    aliases.add(ticker.toUpperCase());
    aliases.add(ticker.toLowerCase());
  }
  
  // Add full symbol
  aliases.add(symbol.toUpperCase());
  aliases.add(symbol.toLowerCase());
  
  // Add display name variations
  if (name) {
    const cleanName = name.trim();
    aliases.add(cleanName);
    aliases.add(cleanName.toLowerCase());
    aliases.add(cleanName.toUpperCase());
    
    // Add words from name
    const words = cleanName.split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) {
        aliases.add(word.toLowerCase());
      }
    });
  }
  
  return Array.from(aliases);
}

module.exports = {
  extractTickerSymbol,
  generateDisplayName,
  generateSearchAliases,
};


