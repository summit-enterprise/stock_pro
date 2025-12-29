/**
 * Configuration for technical indicators
 * Only includes indicators that are actually implemented
 */

export interface IndicatorConfig {
  id: string;
  label: string;
  category: 'momentum' | 'trend' | 'volatility' | 'volume' | 'overlay';
  requiresVolume?: boolean;
  requiresHighLow?: boolean;
  defaultPeriod?: number;
}

export const INDICATORS: IndicatorConfig[] = [
  // === MOMENTUM INDICATORS ===
  { id: 'RSI', label: 'RSI', category: 'momentum', defaultPeriod: 14 }, // Regular RSI (default 14)
  { id: 'RSI_14', label: 'RSI (14)', category: 'momentum', defaultPeriod: 14 },
  { id: 'RSI_21', label: 'RSI (21)', category: 'momentum', defaultPeriod: 21 },
  { id: 'RSI_9', label: 'RSI (9)', category: 'momentum', defaultPeriod: 9 },
  { id: 'RSI_7', label: 'RSI (7)', category: 'momentum', defaultPeriod: 7 },
  { id: 'Stoch_14', label: 'Stochastic (14,3)', category: 'momentum', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'Stoch_21', label: 'Stochastic (21,5)', category: 'momentum', requiresHighLow: true, defaultPeriod: 21 },
  { id: 'StochRSI_14', label: 'Stochastic RSI (14)', category: 'momentum', defaultPeriod: 14 },
  { id: 'WilliamsR_14', label: 'Williams %R (14)', category: 'momentum', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'WilliamsR_21', label: 'Williams %R (21)', category: 'momentum', requiresHighLow: true, defaultPeriod: 21 },
  { id: 'CCI_20', label: 'CCI (20)', category: 'momentum', requiresHighLow: true, defaultPeriod: 20 },
  { id: 'CCI_14', label: 'CCI (14)', category: 'momentum', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'MFI_14', label: 'MFI (14)', category: 'momentum', requiresVolume: true, requiresHighLow: true, defaultPeriod: 14 },
  { id: 'ROC_12', label: 'ROC (12)', category: 'momentum', defaultPeriod: 12 },
  { id: 'ROC_25', label: 'ROC (25)', category: 'momentum', defaultPeriod: 25 },
  { id: 'Momentum_10', label: 'Momentum (10)', category: 'momentum', defaultPeriod: 10 },
  { id: 'Momentum_14', label: 'Momentum (14)', category: 'momentum', defaultPeriod: 14 },
  { id: 'TRIX_14', label: 'TRIX (14)', category: 'momentum', defaultPeriod: 14 },
  { id: 'TRIX_21', label: 'TRIX (21)', category: 'momentum', defaultPeriod: 21 },
  { id: 'AwesomeOsc', label: 'Awesome Oscillator', category: 'momentum', requiresHighLow: true },
  { id: 'UltimateOsc', label: 'Ultimate Oscillator', category: 'momentum', requiresHighLow: true },

  // === TREND INDICATORS ===
  { id: 'SMA_5', label: 'SMA (5)', category: 'trend', defaultPeriod: 5 },
  { id: 'SMA_10', label: 'SMA (10)', category: 'trend', defaultPeriod: 10 },
  { id: 'SMA_20', label: 'SMA (20)', category: 'trend', defaultPeriod: 20 },
  { id: 'SMA_50', label: 'SMA (50)', category: 'trend', defaultPeriod: 50 },
  { id: 'SMA_100', label: 'SMA (100)', category: 'trend', defaultPeriod: 100 },
  { id: 'SMA_200', label: 'SMA (200)', category: 'trend', defaultPeriod: 200 },
  { id: 'EMA_5', label: 'EMA (5)', category: 'trend', defaultPeriod: 5 },
  { id: 'EMA_10', label: 'EMA (10)', category: 'trend', defaultPeriod: 10 },
  { id: 'EMA_12', label: 'EMA (12)', category: 'trend', defaultPeriod: 12 },
  { id: 'EMA_20', label: 'EMA (20)', category: 'trend', defaultPeriod: 20 },
  { id: 'EMA_26', label: 'EMA (26)', category: 'trend', defaultPeriod: 26 },
  { id: 'EMA_50', label: 'EMA (50)', category: 'trend', defaultPeriod: 50 },
  { id: 'EMA_100', label: 'EMA (100)', category: 'trend', defaultPeriod: 100 },
  { id: 'EMA_200', label: 'EMA (200)', category: 'trend', defaultPeriod: 200 },
  { id: 'WMA_20', label: 'WMA (20)', category: 'trend', defaultPeriod: 20 },
  { id: 'WMA_50', label: 'WMA (50)', category: 'trend', defaultPeriod: 50 },
  { id: 'DEMA_20', label: 'DEMA (20)', category: 'trend', defaultPeriod: 20 },
  { id: 'DEMA_50', label: 'DEMA (50)', category: 'trend', defaultPeriod: 50 },
  { id: 'TEMA_20', label: 'TEMA (20)', category: 'trend', defaultPeriod: 20 },
  { id: 'TEMA_50', label: 'TEMA (50)', category: 'trend', defaultPeriod: 50 },
  { id: 'ADX_14', label: 'ADX (14)', category: 'trend', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'ADX_21', label: 'ADX (21)', category: 'trend', requiresHighLow: true, defaultPeriod: 21 },

  // === VOLATILITY INDICATORS ===
  { id: 'BB', label: 'Bollinger Bands', category: 'volatility', defaultPeriod: 20 }, // Regular BB (default 20,2)
  { id: 'BB_20_2', label: 'Bollinger Bands (20,2)', category: 'volatility', defaultPeriod: 20 },
  { id: 'BB_20_1', label: 'Bollinger Bands (20,1)', category: 'volatility', defaultPeriod: 20 },
  { id: 'BB_20_3', label: 'Bollinger Bands (20,3)', category: 'volatility', defaultPeriod: 20 },
  { id: 'BB_50_2', label: 'Bollinger Bands (50,2)', category: 'volatility', defaultPeriod: 50 },
  { id: 'Keltner_20_2', label: 'Keltner Channels (20,2)', category: 'volatility', requiresHighLow: true, defaultPeriod: 20 },
  { id: 'Keltner_20_3', label: 'Keltner Channels (20,3)', category: 'volatility', requiresHighLow: true, defaultPeriod: 20 },
  { id: 'Donchian_20', label: 'Donchian Channels (20)', category: 'volatility', requiresHighLow: true, defaultPeriod: 20 },
  { id: 'Donchian_50', label: 'Donchian Channels (50)', category: 'volatility', requiresHighLow: true, defaultPeriod: 50 },
  { id: 'ATR_14', label: 'ATR (14)', category: 'volatility', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'ATR_21', label: 'ATR (21)', category: 'volatility', requiresHighLow: true, defaultPeriod: 21 },

  // === VOLUME INDICATORS ===
  { id: 'OBV', label: 'On Balance Volume', category: 'volume', requiresVolume: true },
  { id: 'VWAP', label: 'VWAP', category: 'volume', requiresVolume: true, requiresHighLow: true },

  // === OVERLAY INDICATORS ===
  { id: 'MACD', label: 'MACD', category: 'overlay', defaultPeriod: 12 }, // Regular MACD (default 12,26,9)
  { id: 'MACD_12_26_9', label: 'MACD (12,26,9)', category: 'overlay', defaultPeriod: 12 },
  { id: 'MACD_8_17_9', label: 'MACD (8,17,9)', category: 'overlay', defaultPeriod: 8 },
  { id: 'MACD_5_13_9', label: 'MACD (5,13,9)', category: 'overlay', defaultPeriod: 5 },
  
  // === ADDITIONAL INDICATORS (25 more) ===
  // Trend Indicators
  { id: 'SMA_30', label: 'SMA (30)', category: 'trend', defaultPeriod: 30 },
  { id: 'EMA_30', label: 'EMA (30)', category: 'trend', defaultPeriod: 30 },
  { id: 'HMA_14', label: 'Hull MA (14)', category: 'trend', defaultPeriod: 14 },
  { id: 'HMA_21', label: 'Hull MA (21)', category: 'trend', defaultPeriod: 21 },
  { id: 'ZLEMA_14', label: 'ZLEMA (14)', category: 'trend', defaultPeriod: 14 },
  { id: 'ZLEMA_21', label: 'ZLEMA (21)', category: 'trend', defaultPeriod: 21 },
  { id: 'T3_14', label: 'T3 MA (14)', category: 'trend', defaultPeriod: 14 },
  { id: 'T3_21', label: 'T3 MA (21)', category: 'trend', defaultPeriod: 21 },
  { id: 'VIDYA_14', label: 'VIDYA (14)', category: 'trend', defaultPeriod: 14 },
  { id: 'VIDYA_21', label: 'VIDYA (21)', category: 'trend', defaultPeriod: 21 },
  
  // Momentum Indicators
  { id: 'RSI_5', label: 'RSI (5)', category: 'momentum', defaultPeriod: 5 },
  { id: 'RSI_30', label: 'RSI (30)', category: 'momentum', defaultPeriod: 30 },
  { id: 'Stoch_9', label: 'Stochastic (9,3)', category: 'momentum', requiresHighLow: true, defaultPeriod: 9 },
  { id: 'Stoch_5', label: 'Stochastic (5,3)', category: 'momentum', requiresHighLow: true, defaultPeriod: 5 },
  { id: 'WilliamsR_9', label: 'Williams %R (9)', category: 'momentum', requiresHighLow: true, defaultPeriod: 9 },
  { id: 'CCI_10', label: 'CCI (10)', category: 'momentum', requiresHighLow: true, defaultPeriod: 10 },
  { id: 'CCI_30', label: 'CCI (30)', category: 'momentum', requiresHighLow: true, defaultPeriod: 30 },
  { id: 'MFI_9', label: 'MFI (9)', category: 'momentum', requiresVolume: true, requiresHighLow: true, defaultPeriod: 9 },
  { id: 'MFI_21', label: 'MFI (21)', category: 'momentum', requiresVolume: true, requiresHighLow: true, defaultPeriod: 21 },
  { id: 'ROC_10', label: 'ROC (10)', category: 'momentum', defaultPeriod: 10 },
  { id: 'ROC_20', label: 'ROC (20)', category: 'momentum', defaultPeriod: 20 },
  { id: 'Momentum_5', label: 'Momentum (5)', category: 'momentum', defaultPeriod: 5 },
  { id: 'Momentum_20', label: 'Momentum (20)', category: 'momentum', defaultPeriod: 20 },
  { id: 'TRIX_9', label: 'TRIX (9)', category: 'momentum', defaultPeriod: 9 },
  { id: 'TRIX_30', label: 'TRIX (30)', category: 'momentum', defaultPeriod: 30 },
  
  // Volatility Indicators
  { id: 'ATR_7', label: 'ATR (7)', category: 'volatility', requiresHighLow: true, defaultPeriod: 7 },
  { id: 'ATR_28', label: 'ATR (28)', category: 'volatility', requiresHighLow: true, defaultPeriod: 28 },
  { id: 'Keltner_14_2', label: 'Keltner Channels (14,2)', category: 'volatility', requiresHighLow: true, defaultPeriod: 14 },
  { id: 'Donchian_10', label: 'Donchian Channels (10)', category: 'volatility', requiresHighLow: true, defaultPeriod: 10 },
  { id: 'Donchian_30', label: 'Donchian Channels (30)', category: 'volatility', requiresHighLow: true, defaultPeriod: 30 },
  
  // Volume Indicators
  { id: 'CMF_20', label: 'Chaikin Money Flow (20)', category: 'volume', requiresVolume: true, requiresHighLow: true, defaultPeriod: 20 },
  { id: 'VolumeOsc', label: 'Volume Oscillator', category: 'volume', requiresVolume: true },
  { id: 'VolumeROC_14', label: 'Volume ROC (14)', category: 'volume', requiresVolume: true, defaultPeriod: 14 },
];

export function getIndicatorById(id: string): IndicatorConfig | undefined {
  return INDICATORS.find(ind => ind.id === id);
}

export function getIndicatorsByCategory(category: IndicatorConfig['category']): IndicatorConfig[] {
  return INDICATORS.filter(ind => ind.category === category);
}
