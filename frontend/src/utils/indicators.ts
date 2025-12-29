// Technical indicators calculations using technicalindicators library
// Only import what's actually available in the library
import { 
  RSI,
  BollingerBands,
  MACD,
  SMA,
  EMA,
  Stochastic,
  ATR,
  ADX,
  WilliamsR,
  CCI,
  MFI,
  OBV,
} from 'technicalindicators';

export interface IndicatorData {
  time: number;
  value: number;
}

export interface BollingerBandsData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

// Helper: Calculate typical price
function calculateTypicalPrice(highs: number[], lows: number[], closes: number[]): number[] {
  return highs.map((h, i) => (h + lows[i] + closes[i]) / 3);
}

// === CORE INDICATORS ===

// RSI variations
export function calculateRSI(closes: number[], period: number = 14): number[] {
  return RSI.calculate({ values: closes, period });
}

// Bollinger Bands variations
export function calculateBollingerBands(
  closes: number[], 
  period: number = 20, 
  stdDev: number = 2
): Array<{ upper: number; middle: number; lower: number }> {
  return BollingerBands.calculate({ values: closes, period, stdDev });
}

// MACD variations
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Array<{ MACD: number; signal: number; histogram: number }> {
  return MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).map((macd) => ({
    MACD: macd.MACD || 0,
    signal: macd.signal || 0,
    histogram: (macd.MACD || 0) - (macd.signal || 0),
  }));
}

// SMA variations
export function calculateSMA(closes: number[], period: number = 20): number[] {
  return SMA.calculate({ values: closes, period });
}

// EMA variations
export function calculateEMA(closes: number[], period: number = 20): number[] {
  return EMA.calculate({ values: closes, period });
}

// Stochastic variations
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
  signalPeriod: number = 3
): number[] {
  const stochValues = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
    signalPeriod,
  });
  return stochValues.map((stoch) => stoch.k || 0);
}

// ATR variations
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  return ATR.calculate({ high: highs, low: lows, close: closes, period });
}

// ADX
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  return ADX.calculate({ high: highs, low: lows, close: closes, period });
}

// Williams %R
export function calculateWilliamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  return WilliamsR.calculate({ high: highs, low: lows, close: closes, period });
}

// CCI (Commodity Channel Index)
export function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 20
): number[] {
  return CCI.calculate({ high: highs, low: lows, close: closes, period });
}

// MFI (Money Flow Index)
export function calculateMFI(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number = 14
): number[] {
  return MFI.calculate({ high: highs, low: lows, close: closes, volume: volumes, period });
}

// OBV (On Balance Volume)
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  return OBV.calculate({ close: closes, volume: volumes });
}

// === MANUALLY IMPLEMENTED INDICATORS ===

// WMA (Weighted Moving Average)
export function calculateWMA(closes: number[], period: number = 20): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    let weightSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;
      sum += closes[i - j] * weight;
      weightSum += weight;
    }
    result.push(sum / weightSum);
  }
  return result;
}

// DEMA (Double Exponential Moving Average)
export function calculateDEMA(closes: number[], period: number = 20): number[] {
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1, period);
  const result: number[] = [];
  for (let i = 0; i < ema1.length; i++) {
    result.push(2 * ema1[i] - ema2[i]);
  }
  return result;
}

// TEMA (Triple Exponential Moving Average)
export function calculateTEMA(closes: number[], period: number = 20): number[] {
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1, period);
  const ema3 = calculateEMA(ema2, period);
  const result: number[] = [];
  for (let i = 0; i < ema1.length; i++) {
    result.push(3 * ema1[i] - 3 * ema2[i] + ema3[i]);
  }
  return result;
}

// Keltner Channels
export function calculateKeltnerChannels(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): Array<{ upper: number; middle: number; lower: number }> {
  const ema = calculateEMA(closes, period);
  const atr = calculateATR(highs, lows, closes, period);
  const result: Array<{ upper: number; middle: number; lower: number }> = [];
  
  for (let i = 0; i < ema.length; i++) {
    const middle = ema[i];
    const band = atr[i] * multiplier;
    result.push({
      upper: middle + band,
      middle: middle,
      lower: middle - band,
    });
  }
  return result;
}

// Donchian Channels
export function calculateDonchianChannels(
  highs: number[],
  lows: number[],
  period: number = 20
): Array<{ upper: number; middle: number; lower: number }> {
  const result: Array<{ upper: number; middle: number; lower: number }> = [];
  
  for (let i = period - 1; i < highs.length; i++) {
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const upper = Math.max(...highSlice);
    const lower = Math.min(...lowSlice);
    result.push({
      upper,
      middle: (upper + lower) / 2,
      lower,
    });
  }
  return result;
}

// TRIX
export function calculateTRIX(closes: number[], period: number = 14): number[] {
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1, period);
  const ema3 = calculateEMA(ema2, period);
  const result: number[] = [];
  
  for (let i = 1; i < ema3.length; i++) {
    const change = ((ema3[i] - ema3[i - 1]) / ema3[i - 1]) * 100;
    result.push(change);
  }
  return result;
}

// ROC (Rate of Change)
export function calculateROC(closes: number[], period: number = 12): number[] {
  const result: number[] = [];
  for (let i = period; i < closes.length; i++) {
    const change = ((closes[i] - closes[i - period]) / closes[i - period]) * 100;
    result.push(change);
  }
  return result;
}

// Momentum
export function calculateMomentum(closes: number[], period: number = 10): number[] {
  const result: number[] = [];
  for (let i = period; i < closes.length; i++) {
    result.push(closes[i] - closes[i - period]);
  }
  return result;
}

// VWAP (Volume Weighted Average Price) - simplified
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const typicalPrices = calculateTypicalPrice(highs, lows, closes);
  const result: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < typicalPrices.length; i++) {
    cumulativeTPV += typicalPrices[i] * volumes[i];
    cumulativeVolume += volumes[i];
    result.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrices[i]);
  }
  
  return result;
}

// Stochastic RSI
export function calculateStochasticRSI(closes: number[], period: number = 14): number[] {
  const rsi = calculateRSI(closes, period);
  // Use RSI values as high/low/close for stochastic calculation
  return Stochastic.calculate({
    high: rsi,
    low: rsi,
    close: rsi,
    period,
    signalPeriod: 3,
  }).map((stoch) => stoch.k || 0);
}

// Awesome Oscillator (simplified - uses 5 and 34 period SMAs)
export function calculateAwesomeOscillator(highs: number[], lows: number[]): number[] {
  const typicalPrices = calculateTypicalPrice(highs, lows, highs.map((_, i) => (highs[i] + lows[i]) / 2));
  const sma5 = calculateSMA(typicalPrices, 5);
  const sma34 = calculateSMA(typicalPrices, 34);
  const result: number[] = [];
  
  const offset = sma34.length - sma5.length;
  for (let i = 0; i < sma5.length; i++) {
    result.push(sma5[i] - sma34[i + offset]);
  }
  return result;
}

// Ultimate Oscillator (simplified)
export function calculateUltimateOscillator(
  highs: number[],
  lows: number[],
  closes: number[]
): number[] {
  const result: number[] = [];
  const typicalPrices = calculateTypicalPrice(highs, lows, closes);
  
  for (let i = 14; i < typicalPrices.length; i++) {
    const bp7: number[] = [];
    const tr7: number[] = [];
    const bp14: number[] = [];
    const tr14: number[] = [];
    const bp28: number[] = [];
    const tr28: number[] = [];
    
    for (let j = i - 6; j <= i; j++) {
      bp7.push(typicalPrices[j] - Math.min(lows[j], closes[j - 1] || closes[j]));
      tr7.push(Math.max(highs[j], closes[j - 1] || closes[j]) - Math.min(lows[j], closes[j - 1] || closes[j]));
    }
    
    for (let j = i - 13; j <= i; j++) {
      bp14.push(typicalPrices[j] - Math.min(lows[j], closes[j - 1] || closes[j]));
      tr14.push(Math.max(highs[j], closes[j - 1] || closes[j]) - Math.min(lows[j], closes[j - 1] || closes[j]));
    }
    
    for (let j = i - 27; j <= i; j++) {
      bp28.push(typicalPrices[j] - Math.min(lows[j], closes[j - 1] || closes[j]));
      tr28.push(Math.max(highs[j], closes[j - 1] || closes[j]) - Math.min(lows[j], closes[j - 1] || closes[j]));
    }
    
    const avg7 = bp7.reduce((a, b) => a + b, 0) / tr7.reduce((a, b) => a + b, 0);
    const avg14 = bp14.reduce((a, b) => a + b, 0) / tr14.reduce((a, b) => a + b, 0);
    const avg28 = bp28.reduce((a, b) => a + b, 0) / tr28.reduce((a, b) => a + b, 0);
    
    result.push((4 * avg7 + 2 * avg14 + avg28) / 7 * 100);
  }
  
  return result;
}

// Hull Moving Average (HMA)
export function calculateHMA(closes: number[], period: number = 14): number[] {
  const wmaHalf = calculateWMA(closes, Math.floor(period / 2));
  const wmaFull = calculateWMA(closes, period);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  
  const result: number[] = [];
  const diff: number[] = [];
  
  for (let i = 0; i < wmaHalf.length; i++) {
    diff.push(2 * wmaHalf[i] - wmaFull[i]);
  }
  
  return calculateWMA(diff, sqrtPeriod);
}

// Zero Lag EMA (ZLEMA)
export function calculateZLEMA(closes: number[], period: number = 14): number[] {
  const lag = Math.floor((period - 1) / 2);
  const result: number[] = [];
  
  for (let i = lag; i < closes.length; i++) {
    const zlema = closes[i] + (closes[i] - closes[i - lag]);
    result.push(zlema);
  }
  
  // Apply EMA to the zero-lag values
  return calculateEMA(result, period);
}

// T3 Moving Average
export function calculateT3(closes: number[], period: number = 14, volumeFactor: number = 0.7): number[] {
  const ema1 = calculateEMA(closes, period);
  const ema2 = calculateEMA(ema1, period);
  const ema3 = calculateEMA(ema2, period);
  const ema4 = calculateEMA(ema3, period);
  const ema5 = calculateEMA(ema4, period);
  const ema6 = calculateEMA(ema5, period);
  
  const c1 = -volumeFactor * volumeFactor * volumeFactor;
  const c2 = 3 * volumeFactor * volumeFactor + 3 * volumeFactor * volumeFactor * volumeFactor;
  const c3 = -6 * volumeFactor * volumeFactor - 3 * volumeFactor - 3 * volumeFactor * volumeFactor * volumeFactor;
  const c4 = 1 + 3 * volumeFactor + volumeFactor * volumeFactor * volumeFactor + 3 * volumeFactor * volumeFactor;
  
  const result: number[] = [];
  const minLen = Math.min(ema1.length, ema2.length, ema3.length, ema4.length, ema5.length, ema6.length);
  
  for (let i = 0; i < minLen; i++) {
    const t3 = c1 * ema6[i] + c2 * ema5[i] + c3 * ema4[i] + c4 * ema3[i];
    result.push(t3);
  }
  
  return result;
}

// VIDYA (Variable Index Dynamic Average)
export function calculateVIDYA(closes: number[], period: number = 14, alpha: number = 0.2): number[] {
  const result: number[] = [];
  const cmo = calculateCMO(closes, period);
  
  if (cmo.length === 0) return result;
  
  result.push(closes[period - 1]);
  
  for (let i = period; i < closes.length; i++) {
    const cmoValue = Math.abs(cmo[i - period] || 0) / 100;
    const k = alpha * cmoValue;
    const vidya = k * closes[i] + (1 - k) * result[result.length - 1];
    result.push(vidya);
  }
  
  return result;
}

// CMO (Chande Momentum Oscillator) - helper for VIDYA
function calculateCMO(closes: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = period; i < closes.length; i++) {
    let sumUp = 0;
    let sumDown = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) {
        sumUp += change;
      } else {
        sumDown += Math.abs(change);
      }
    }
    
    const total = sumUp + sumDown;
    const cmo = total !== 0 ? ((sumUp - sumDown) / total) * 100 : 0;
    result.push(cmo);
  }
  
  return result;
}

// Chaikin Money Flow
export function calculateCMF(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 20): number[] {
  const result: number[] = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    let moneyFlowVolume = 0;
    let totalVolume = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const range = highs[j] - lows[j];
      if (range !== 0) {
        const mfv = ((closes[j] - lows[j]) - (highs[j] - closes[j])) / range * volumes[j];
        moneyFlowVolume += mfv;
      }
      totalVolume += volumes[j];
    }
    
    result.push(totalVolume !== 0 ? moneyFlowVolume / totalVolume : 0);
  }
  
  return result;
}

// Volume Oscillator
export function calculateVolumeOscillator(volumes: number[], shortPeriod: number = 5, longPeriod: number = 10): number[] {
  const shortMA = calculateSMA(volumes, shortPeriod);
  const longMA = calculateSMA(volumes, longPeriod);
  const result: number[] = [];
  
  const offset = longMA.length - shortMA.length;
  for (let i = 0; i < shortMA.length; i++) {
    const osc = longMA[i + offset] !== 0 
      ? ((shortMA[i] - longMA[i + offset]) / longMA[i + offset]) * 100 
      : 0;
    result.push(osc);
  }
  
  return result;
}

// Volume Rate of Change
export function calculateVolumeROC(volumes: number[], period: number = 14): number[] {
  const result: number[] = [];
  
  for (let i = period; i < volumes.length; i++) {
    const roc = volumes[i - period] !== 0 
      ? ((volumes[i] - volumes[i - period]) / volumes[i - period]) * 100 
      : 0;
    result.push(roc);
  }
  
  return result;
}
