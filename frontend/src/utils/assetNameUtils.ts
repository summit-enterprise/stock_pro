/**
 * Asset Name Normalization Utilities
 * Normalizes asset names for consistent display across the UI
 */

/**
 * Normalize asset name for display
 * Removes common suffixes, normalizes capitalization, and cleans up formatting
 */
export function normalizeAssetName(name: string | null | undefined): string {
  if (!name) return 'Unknown Asset';
  
  let normalized = name.trim();
  
  // Remove common suffixes (case-insensitive)
  const suffixes = [
    ' Inc.',
    ' Inc',
    ' Incorporated',
    ' Corp.',
    ' Corp',
    ' Corporation',
    ' Ltd.',
    ' Ltd',
    ' Limited',
    ' LLC',
    ' L.L.C.',
    ' LP',
    ' L.P.',
    ' PLC',
    ' P.L.C.',
    ' AG',
    ' A.G.',
    ' SA',
    ' S.A.',
    ' NV',
    ' N.V.',
    ' Co.',
    ' Company',
    ' Group',
    ' Holdings',
    ' Technologies',
    ' Technology',
    ' Systems',
    ' Services',
    ' Solutions',
  ];
  
  for (const suffix of suffixes) {
    const regex = new RegExp(`\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    normalized = normalized.replace(regex, '');
  }
  
  // Normalize capitalization (Title Case for most words, but preserve acronyms)
  normalized = normalized
    .split(' ')
    .map((word, index) => {
      // Preserve all-caps words (likely acronyms) if they're 2-4 characters
      if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase()) {
        return word;
      }
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  // Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Handle special cases
  if (normalized.toLowerCase().includes('etf')) {
    // Preserve ETF in uppercase
    normalized = normalized.replace(/Etf/gi, 'ETF');
  }
  
  if (normalized.toLowerCase().includes('spdr')) {
    normalized = normalized.replace(/Spdr/gi, 'SPDR');
  }
  
  if (normalized.toLowerCase().includes('ishares')) {
    normalized = normalized.replace(/Ishares/gi, 'iShares');
  }
  
  if (normalized.toLowerCase().includes('vanguard')) {
    normalized = normalized.replace(/Vanguard/gi, 'Vanguard');
  }
  
  return normalized || name; // Fallback to original if normalization results in empty string
}

/**
 * Get display name for an asset
 * Uses normalized name if available, otherwise falls back to symbol
 */
export function getAssetDisplayName(
  name: string | null | undefined,
  symbol: string | null | undefined
): string {
  if (name) {
    return normalizeAssetName(name);
  }
  return symbol || 'Unknown Asset';
}

/**
 * Format asset name with symbol
 * Returns "Name (SYMBOL)" format
 */
export function formatAssetNameWithSymbol(
  name: string | null | undefined,
  symbol: string | null | undefined
): string {
  const displayName = getAssetDisplayName(name, symbol);
  if (symbol && displayName !== symbol) {
    return `${displayName} (${symbol})`;
  }
  return displayName;
}


