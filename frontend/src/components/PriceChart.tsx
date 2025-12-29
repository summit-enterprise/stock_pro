'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  ColorType, 
  Time, 
  SeriesType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries
} from 'lightweight-charts';
import {
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  calculateSMA,
  calculateEMA,
  calculateStochastic,
  calculateATR,
  calculateWilliamsR,
  calculateCCI,
  calculateMFI,
  calculateROC,
  calculateTRIX,
  calculateMomentum,
  calculateAwesomeOscillator,
  calculateUltimateOscillator,
  calculateWMA,
  calculateDEMA,
  calculateTEMA,
  calculateADX,
  calculateKeltnerChannels,
  calculateDonchianChannels,
  calculateHMA,
  calculateZLEMA,
  calculateT3,
  calculateVIDYA,
  calculateCMF,
  calculateVolumeOscillator,
  calculateVolumeROC,
} from '@/utils/indicators';
import { INDICATORS, IndicatorConfig } from '@/utils/indicatorConfig';

interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  data: HistoricalDataPoint[];
  symbol: string;
  isDarkMode?: boolean;
  timeRange?: string; // Optional time range for filtering/zooming
}

type IndicatorType = string; // Now supports all 100 indicators
type DrawingTool = 'trendline' | 'horizontal' | 'none';
type LineStyle = 'solid' | 'dotted';

interface DrawnLine {
  id: string;
  type: 'trendline' | 'horizontal';
  points: Array<{ time: Time; value: number }>;
  style: LineStyle;
}

export default function PriceChart({ data, symbol, isDarkMode = false, timeRange }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  
  const candlestickSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  
  // Indicator series refs for overlay indicators
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const drawingLinesRefs = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  
  // Refs for momentum indicator charts (separate charts below main chart)
  const momentumChartRefs = useRef<Map<string, IChartApi>>(new Map());
  const momentumContainerRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  // Initialize dark mode from DOM or system preference
  const getInitialDarkMode = () => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return isDarkMode || true; // Default to dark mode
  };
  
  const [darkMode, setDarkMode] = useState(getInitialDarkMode());
  const [selectedIndicators, setSelectedIndicators] = useState<Set<IndicatorType>>(new Set());
  const [showIndicators, setShowIndicators] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none');
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number; time: Time; price: number }>>([]);
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const indicatorsDropdownRef = useRef<HTMLDivElement>(null);
  const [indicatorSearch, setIndicatorSearch] = useState('');

  // Close indicators dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (indicatorsDropdownRef.current && !indicatorsDropdownRef.current.contains(event.target as Node)) {
        setShowIndicators(false);
      }
    };

    if (showIndicators) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showIndicators]);

  // Helper function to safely apply options to a chart
  const safeApplyOptions = (chart: IChartApi | null, options: any) => {
    if (!chart) return;
    try {
      // Check if chart is still valid by trying to access a property
      if ((chart as any)._internal_state) {
        chart.applyOptions(options);
      }
    } catch (error) {
      // Chart is disposed - ignore
    }
  };

  // Detect dark mode and update charts
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(isDark);
        
        const chartOptions = {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919' },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          timeScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          rightPriceScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
        };

        safeApplyOptions(chartRef.current, chartOptions);
        safeApplyOptions(volumeChartRef.current, chartOptions);
        safeApplyOptions(rsiChartRef.current, chartOptions);
        safeApplyOptions(macdChartRef.current, chartOptions);
        momentumChartRefs.current.forEach(chart => safeApplyOptions(chart, chartOptions));
      }
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      const handleThemeChange = () => checkDarkMode();
      window.addEventListener('theme-change', handleThemeChange);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', checkDarkMode);

      return () => {
        observer.disconnect();
        window.removeEventListener('theme-change', handleThemeChange);
        mediaQuery.removeEventListener('change', checkDarkMode);
      };
    }
  }, []);


  // Handle time range changes - zoom to the selected time window centered around currently visible date
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0 || !timeRange) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    if (sortedData.length === 0) return;

    try {
      // Get the currently visible time range to find the center point
      let mainTimeScale;
      try {
        mainTimeScale = chartRef.current?.timeScale();
      } catch (error) {
        // Chart may be disposed
        return;
      }
      if (!mainTimeScale) return;
      if (!mainTimeScale) return;

      const currentVisibleRange = mainTimeScale.getVisibleRange();
      let centerTime: number;

      if (currentVisibleRange && currentVisibleRange.from && currentVisibleRange.to) {
        // Use the center of the currently visible range
        centerTime = ((currentVisibleRange.from as number) + (currentVisibleRange.to as number)) / 2;
      } else {
        // If no visible range, use the most recent data point
        centerTime = sortedData[sortedData.length - 1].timestamp / 1000;
      }

      // Calculate the time window based on the selected range
      let halfWindow: number;
      switch (timeRange) {
        case '1D':
          halfWindow = 12 * 60 * 60; // 12 hours on each side = 1 day total
          break;
        case '1W':
          halfWindow = 3.5 * 24 * 60 * 60; // 3.5 days on each side = 1 week total
          break;
        case '1M':
          halfWindow = 15 * 24 * 60 * 60; // 15 days on each side = 1 month total
          break;
        case '3M':
          halfWindow = 45 * 24 * 60 * 60; // 45 days on each side = 3 months total
          break;
        case '6M':
          halfWindow = 90 * 24 * 60 * 60; // 90 days on each side = 6 months total
          break;
        case '1Y':
          halfWindow = 182.5 * 24 * 60 * 60; // ~182.5 days on each side = 1 year total
          break;
        case '5Y':
          // Show all data
          const firstTime = (sortedData[0].timestamp / 1000) as Time;
          const lastTime = (sortedData[sortedData.length - 1].timestamp / 1000) as Time;
          const visibleRange = {
            from: firstTime,
            to: lastTime,
          };
          mainTimeScale.setVisibleRange(visibleRange);
          // Sync volume, RSI, and MACD charts
          if (volumeChartRef.current) {
            try {
              let volTimeScale;
              try {
                volTimeScale = volumeChartRef.current?.timeScale();
              } catch (error) {
                // Chart may be disposed
                return;
              }
              if (!volTimeScale) return;
              if (volTimeScale) {
                volTimeScale.setVisibleRange(visibleRange);
              }
            } catch (error) {
              // Chart may be disposed - ignore
            }
          }
          if (rsiChartRef.current) {
            try {
              const rsiTimeScale = rsiChartRef.current.timeScale();
              if (rsiTimeScale) {
                rsiTimeScale.setVisibleRange(visibleRange);
              }
            } catch (error) {
              // Chart may be disposed - ignore
            }
          }
          if (macdChartRef.current) {
            try {
              const macdTimeScale = macdChartRef.current.timeScale();
              if (macdTimeScale) {
                macdTimeScale.setVisibleRange(visibleRange);
              }
            } catch (error) {
              // Chart may be disposed - ignore
            }
          }
          // Sync momentum charts
          momentumChartRefs.current.forEach((momentumChart) => {
            if (momentumChart) {
              try {
                const timeScale = momentumChart.timeScale();
                if (timeScale) {
                  timeScale.setVisibleRange(visibleRange);
                }
              } catch (error) {
                // Chart may be disposed - ignore
              }
            }
          });
          return;
        default:
          halfWindow = 15 * 24 * 60 * 60; // Default to 1 month
      }

      // Calculate the new visible range centered around the current center point
      const fromTime = centerTime - halfWindow;
      const toTime = centerTime + halfWindow;

      // Ensure we don't go beyond available data
      const firstAvailableTime = sortedData[0].timestamp / 1000;
      const lastAvailableTime = sortedData[sortedData.length - 1].timestamp / 1000;

      const actualFromTime = Math.max(fromTime, firstAvailableTime) as Time;
      const actualToTime = Math.min(toTime, lastAvailableTime) as Time;

      const visibleRange = {
        from: actualFromTime,
        to: actualToTime,
      };

      // Zoom to the selected time range - sync all charts
      mainTimeScale.setVisibleRange(visibleRange);
      
      // Sync volume chart - ensure it matches exactly
      if (volumeChartRef.current) {
        try {
          let volTimeScale;
          try {
            volTimeScale = volumeChartRef.current?.timeScale();
          } catch (error) {
            // Chart may be disposed
            return;
          }
          if (!volTimeScale) return;
          if (volTimeScale) {
            volTimeScale.setVisibleRange(visibleRange);
          }
        } catch (error) {
          // Volume chart might not be ready
        }
      }
      
      // Sync RSI chart
      if (rsiChartRef.current) {
        try {
          const rsiTimeScale = rsiChartRef.current.timeScale();
          if (rsiTimeScale) {
            rsiTimeScale.setVisibleRange(visibleRange);
          }
        } catch (error) {
          // RSI chart might not be ready
        }
      }
      
      // Sync MACD chart
      if (macdChartRef.current) {
        try {
          const macdTimeScale = macdChartRef.current.timeScale();
          if (macdTimeScale) {
            macdTimeScale.setVisibleRange(visibleRange);
          }
        } catch (error) {
          // MACD chart might not be ready
        }
      }
      
      // Sync momentum indicator charts
      momentumChartRefs.current.forEach((momentumChart) => {
        if (momentumChart) {
          try {
            const timeScale = momentumChart.timeScale();
            if (timeScale) {
              timeScale.setVisibleRange(visibleRange);
            }
          } catch (error) {
            // Chart may be disposed - ignore
          }
        }
      });
    } catch (error) {
      // Chart may be disposed or not ready - ignore
    }
  }, [timeRange, data]);

  // Initialize main chart
  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    let chart: IChartApi | null = null;
    let handleResize: (() => void) | null = null;
    let timeScaleSyncUnsubscribe: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Helper to check if container is actually visible (not just has width)
    const isContainerVisible = (container: HTMLDivElement): boolean => {
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      return (
        rect.width > 0 && 
        rect.height > 0 && 
        style.display !== 'none' && 
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    // Don't destroy chart if it already exists - only recreate if truly needed
    const shouldRecreate = !chartRef.current;

    if (shouldRecreate && chartRef.current) {
      try {
        if (typeof chartRef.current.remove === 'function') {
          chartRef.current.remove();
        }
      } catch (error) {
        console.warn('Chart cleanup warning:', error);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      lineSeriesRef.current = null;
    }

    // Wait for container to be visible before initializing
    const checkAndInitialize = () => {
      if (!chartContainerRef.current) return;
      
      const isVisible = isContainerVisible(chartContainerRef.current);
      
      if (!isVisible && !chartRef.current) {
        // Container not visible yet, wait a bit and retry (max 10 times = 1 second)
        let retryCount = 0;
        const maxRetries = 10;
        const retry = () => {
          retryCount++;
          if (retryCount < maxRetries && chartContainerRef.current && !isContainerVisible(chartContainerRef.current)) {
            timeoutId = setTimeout(retry, 100);
          } else if (chartContainerRef.current && isContainerVisible(chartContainerRef.current) && !chartRef.current) {
            initializeMainChart();
          }
        };
        timeoutId = setTimeout(retry, 100);
        return;
      }

      // Container is visible, initialize or resize chart
      if (!chartRef.current) {
        initializeMainChart();
      } else if (chartContainerRef.current.clientWidth > 0) {
        // Chart exists, just resize it
        try {
          if (chartRef.current) {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth,
              height: 532
            });
          }
        } catch (error) {
          // Chart may be disposed - reinitialize
          initializeMainChart();
        }
      }
    };

    checkAndInitialize();

    function initializeMainChart() {
      if (!chartContainerRef.current) return;

      try {
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        // Main price chart - takes most of the space
        // Ensure we have the latest dark mode state
        const isDark = darkMode || (typeof window !== 'undefined' && 
          (document.documentElement.classList.contains('dark') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches));
        
        chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919',
          },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          width: chartContainerRef.current.clientWidth || 800,
          height: 532,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          rightPriceScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          crosshair: { mode: 0 },
        });

        if (!chart) return;
        chartRef.current = chart;

        // Set up time scale synchronization - this will sync volume, RSI, MACD, and all momentum indicator charts
        // This ensures all charts move together perfectly when panning/zooming
        if (chartRef.current) {
          try {
            const mainTimeScale = chartRef.current.timeScale();
            if (!mainTimeScale) return;
            timeScaleSyncUnsubscribe = mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
            if (timeRange) {
              // Sync volume chart - must be perfectly aligned with candlesticks
              if (volumeChartRef.current) {
                try {
                  // Check if chart is still valid before using
                  const volTimeScale = volumeChartRef.current.timeScale();
                  if (volTimeScale) {
                    volTimeScale.setVisibleRange(timeRange);
                  }
                } catch (error) {
                  // Chart may be disposed - ignore
                }
              }
              // Sync RSI chart
              if (rsiChartRef.current) {
                try {
                  const rsiTimeScale = rsiChartRef.current.timeScale();
                  if (rsiTimeScale) {
                    rsiTimeScale.setVisibleRange(timeRange);
                  }
                } catch (error) {
                  // Chart may be disposed - ignore
                }
              }
              // Sync MACD chart
              if (macdChartRef.current) {
                try {
                  const macdTimeScale = macdChartRef.current.timeScale();
                  if (macdTimeScale) {
                    macdTimeScale.setVisibleRange(timeRange);
                  }
                } catch (error) {
                  // Chart may be disposed - ignore
                }
              }
              // Sync all momentum indicator charts
              momentumChartRefs.current.forEach((momentumChart) => {
                if (momentumChart) {
                  try {
                    const timeScale = momentumChart.timeScale();
                    if (timeScale) {
                      timeScale.setVisibleRange(timeRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
            }
          });
          
          // Also sync on scroll/pan events for real-time synchronization
          const logicalUnsubscribe = mainTimeScale.subscribeVisibleLogicalRangeChange((logicalRange) => {
            if (logicalRange && volumeChartRef.current) {
              try {
                const volTimeScale = volumeChartRef.current.timeScale();
                if (volTimeScale) {
                  volTimeScale.setVisibleLogicalRange(logicalRange);
                }
              } catch (error) {
                // Chart may be disposed - ignore
              }
            }
            if (logicalRange && rsiChartRef.current) {
              try {
                const rsiTimeScale = rsiChartRef.current.timeScale();
                if (rsiTimeScale) {
                  rsiTimeScale.setVisibleLogicalRange(logicalRange);
                }
              } catch (error) {
                // Chart may be disposed - ignore
              }
            }
            if (logicalRange && macdChartRef.current) {
              try {
                const macdTimeScale = macdChartRef.current.timeScale();
                if (macdTimeScale) {
                  macdTimeScale.setVisibleLogicalRange(logicalRange);
                }
              } catch (error) {
                // Chart may be disposed - ignore
              }
            }
            // Sync all momentum indicator charts
            momentumChartRefs.current.forEach((momentumChart) => {
              if (momentumChart) {
                try {
                  const momentumTimeScale = momentumChart.timeScale();
                  if (momentumTimeScale) {
                    momentumTimeScale.setVisibleLogicalRange(logicalRange);
                  }
                } catch (error) {
                  // Chart may be disposed - ignore
                }
              }
            });
          });
          } catch (error) {
            // Main chart may be disposed - ignore
          }
        }

        // Add candlestick/line series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        candlestickSeriesRef.current = candlestickSeries;

        const lineSeries = chart.addSeries(LineSeries, {
          color: '#2196F3',
          lineWidth: 2,
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        lineSeriesRef.current = lineSeries;

        // Format data - ensure timestamps are exactly aligned
        // Use the exact same timestamp conversion for both candlesticks and volume
        // Convert milliseconds to seconds (Time format) - use exact same conversion for both
        const candlestickData = sortedData.map((point) => {
          // Use exact timestamp conversion - divide by 1000 to convert ms to seconds
          const time = (point.timestamp / 1000) as Time;
          return {
            time,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
          };
        });

        const lineData = sortedData.map((point) => {
          // Use exact same timestamp conversion
          const time = (point.timestamp / 1000) as Time;
          return {
            time,
            value: point.close,
          };
        });

        if (chartType === 'candlestick') {
          candlestickSeries.setData(candlestickData);
          lineSeries.setData([]);
        } else {
          lineSeries.setData(lineData);
          candlestickSeries.setData([]);
        }

        // Add overlay indicators (Bollinger, SMA, EMA, Stochastic, ATR)
        updateOverlayIndicators(chart, sortedData);

        // Add drawing lines
        updateDrawingLines(chart, sortedData);

        // Initial zoom based on timeRange (will be set by the timeRange effect if provided)
        // If no timeRange, show all data
        if (sortedData.length > 0) {
          if (timeRange) {
            // Time range effect will handle the zoom
            // Just set a default view for now
            const firstTime = (sortedData[0].timestamp / 1000) as Time;
            const lastTime = (sortedData[sortedData.length - 1].timestamp / 1000) as Time;
            chart.timeScale().setVisibleRange({
              from: firstTime,
              to: lastTime,
            });
          } else {
            // Show all data if no time range specified
            const firstTime = (sortedData[0].timestamp / 1000) as Time;
            const lastTime = (sortedData[sortedData.length - 1].timestamp / 1000) as Time;
            chart.timeScale().setVisibleRange({
              from: firstTime,
              to: lastTime,
            });
          }
        }

        handleResize = () => {
          if (chartContainerRef.current && chart && chartRef.current === chart) {
            try {
              // Verify chart is still valid before applying options
              if ((chart as any)._internal_state && chartContainerRef.current.clientWidth > 0) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
              }
            } catch (error) {
              // Chart may be disposed - cleanup
              if (handleResize) {
                window.removeEventListener('resize', handleResize);
              }
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('Error initializing main chart:', error);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      // Unsubscribe from time scale changes
      if (timeScaleSyncUnsubscribe) {
        timeScaleSyncUnsubscribe();
      }
      // Don't remove chart on unmount - preserve state for modal transitions
      // Chart will be cleaned up when component fully unmounts
    };
  }, [data, darkMode, chartType, selectedIndicators, drawnLines, timeRange]);

  // Update overlay indicators when selectedIndicators changes (without re-initializing chart)
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    updateOverlayIndicators(chartRef.current, sortedData);
  }, [selectedIndicators, data, darkMode]);

  // Update drawing lines when drawnLines state changes
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    updateDrawingLines(chartRef.current, sortedData);
  }, [drawnLines, data]);

  // Initialize volume chart (below main chart)
  useEffect(() => {
    if (!volumeContainerRef.current || !data || data.length === 0) return;

    let volumeChart: IChartApi | null = null;
    let handleResize: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Helper to check if container is actually visible
    const isContainerVisible = (container: HTMLDivElement): boolean => {
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      return (
        rect.width > 0 && 
        rect.height > 0 && 
        style.display !== 'none' && 
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    // If chart exists and container is visible, just resize
    if (volumeChartRef.current && isContainerVisible(volumeContainerRef.current)) {
      volumeChartRef.current.applyOptions({ 
        height: 100,
        width: volumeContainerRef.current.clientWidth 
      });
      return;
    }

    // Wait for container to be visible before initializing
    const checkAndInitialize = () => {
      if (!volumeContainerRef.current) return;
      
      const isVisible = isContainerVisible(volumeContainerRef.current);
      
      if (!isVisible && !volumeChartRef.current) {
        // Container not visible yet, wait a bit and retry (max 10 times = 1 second)
        let retryCount = 0;
        const maxRetries = 10;
        const retry = () => {
          retryCount++;
          if (retryCount < maxRetries && volumeContainerRef.current && !isContainerVisible(volumeContainerRef.current)) {
            timeoutId = setTimeout(retry, 100);
          } else if (volumeContainerRef.current && isContainerVisible(volumeContainerRef.current) && !volumeChartRef.current) {
            initializeVolumeChart();
          }
        };
        timeoutId = setTimeout(retry, 100);
        return;
      }

      // Container is visible, initialize chart
      if (!volumeChartRef.current) {
        initializeVolumeChart();
      }
    };

    checkAndInitialize();

    function initializeVolumeChart() {
      if (!volumeContainerRef.current) return;

      try {
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        // Force dark mode if dark class is present
        const isDark = darkMode || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
        volumeChart = createChart(volumeContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919' },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          width: volumeContainerRef.current.clientWidth || 800,
          height: 100,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
            rightOffset: -1, // Small negative offset to shift volume bars slightly left for alignment
            barSpacing: undefined, // Use default bar spacing to match main chart
          },
          rightPriceScale: {
            visible: false,
          },
          crosshair: { mode: 0 },
        });

        if (!volumeChart) return;
        volumeChartRef.current = volumeChart;

        const volumeSeries = volumeChart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          scaleMargins: { top: 0.1, bottom: 0 },
        });
        volumeSeriesRef.current = volumeSeries;

        // Ensure volume data uses EXACT same timestamps as candlestick data
        // This is critical - both must use the exact same sortedData array and timestamp conversion
        // Use the exact same timestamp conversion: point.timestamp / 1000
        const volumeData = sortedData.map((point) => {
          // CRITICAL: Use the exact same timestamp conversion as candlesticks
          // Both candlesticks and volume must use: (point.timestamp / 1000) as Time
          // This ensures perfect alignment by date
          const time = (point.timestamp / 1000) as Time;
          return {
            time, // Must match candlestick time exactly - same conversion, same data point
            value: point.volume,
            color: point.close >= point.open ? '#26a69a80' : '#ef535080',
          };
        });

        volumeSeries.setData(volumeData);

        // Apply a small left offset to volume chart to align with candlesticks
        // This compensates for any visual rendering differences
        try {
          const volumeTimeScale = volumeChart.timeScale();
          if (volumeTimeScale) {
            volumeTimeScale.applyOptions({
              rightOffset: -1, // Small negative offset shifts bars slightly left
            });
          }
        } catch (error) {
          // Chart may not be ready yet - ignore
        }

        // Ensure volume chart time scale is perfectly synchronized with main chart
        // This subscription ensures volume bars stay aligned with candlesticks when zooming/panning
        if (chartRef.current) {
          try {
            const mainTimeScale = chartRef.current.timeScale();
            if (mainTimeScale) {
              // Subscribe to main chart time scale changes for real-time sync
              mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                if (timeRange && volumeChartRef.current) {
                  try {
                    const volTimeScale = volumeChartRef.current.timeScale();
                    if (volTimeScale) {
                      volTimeScale.setVisibleRange(timeRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
              
              // Also sync on logical range changes for perfect alignment during panning
              mainTimeScale.subscribeVisibleLogicalRangeChange((logicalRange) => {
                if (logicalRange && volumeChartRef.current) {
                  try {
                    const volTimeScale = volumeChartRef.current.timeScale();
                    if (volTimeScale) {
                      volTimeScale.setVisibleLogicalRange(logicalRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
            }
          } catch (error) {
            // Main chart may be disposed - ignore
          }
          
          // Initial sync - ensure both charts show the same time range from the start
          setTimeout(() => {
            if (chartRef.current && volumeChartRef.current) {
              try {
                let mainTimeScale;
      try {
        mainTimeScale = chartRef.current?.timeScale();
      } catch (error) {
        // Chart may be disposed
        return;
      }
      if (!mainTimeScale) return;
                const volumeTimeScale = volumeChartRef.current.timeScale();
                if (mainTimeScale && volumeTimeScale) {
                  // Sync both time range and logical range for perfect alignment
                  const mainRange = mainTimeScale.getVisibleRange();
                  const mainLogicalRange = mainTimeScale.getVisibleLogicalRange();
                  if (mainRange) {
                    volumeTimeScale.setVisibleRange(mainRange);
                  }
                  if (mainLogicalRange) {
                    volumeTimeScale.setVisibleLogicalRange(mainLogicalRange);
                  }
                  // Apply small left offset to shift volume bars slightly left for alignment
                  volumeTimeScale.applyOptions({
                    rightOffset: -1, // Small negative offset shifts bars left
                  });
                }
              } catch (error) {
                // Chart may be disposed - ignore
              }
            }
          }, 150);
        }

        handleResize = () => {
          if (volumeContainerRef.current && volumeChart) {
            try {
              volumeChart.applyOptions({ width: volumeContainerRef.current.clientWidth });
            } catch (error) {
              // Chart may be disposed - ignore
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('Error initializing volume chart:', error);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      // Don't remove chart on unmount - preserve state for modal transitions
    };
  }, [data, darkMode]);

  // Initialize RSI chart (below volume) - ONLY if RSI indicator is explicitly selected
  useEffect(() => {
    const hasRSI = selectedIndicators.has('RSI') || selectedIndicators.has('RSI_14') || 
                   selectedIndicators.has('RSI_21') || selectedIndicators.has('RSI_9') || 
                   selectedIndicators.has('RSI_7') || selectedIndicators.has('RSI_5') || 
                   selectedIndicators.has('RSI_30');
    
    // If RSI is not selected, ensure chart is removed and container is hidden
    if (!hasRSI) {
      if (rsiChartRef.current) {
        try {
          rsiChartRef.current.remove();
        } catch (error) {
          // Ignore
        }
        rsiChartRef.current = null;
      }
      return;
    }
    
    if (!rsiContainerRef.current || !data || data.length === 0) {
      return;
    }

    let rsiChart: IChartApi | null = null;
    let handleResize: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let timeRangeUnsubscribe: (() => void) | null = null;

    // Helper to check if container is actually visible
    const isContainerVisible = (container: HTMLDivElement): boolean => {
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      return (
        rect.width > 0 && 
        rect.height > 0 && 
        style.display !== 'none' && 
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    // If chart exists and container is visible, re-initialize to show all selected RSI indicators
    // This ensures all selected RSI periods (RSI_7, RSI_9, RSI_14, RSI_21) are displayed
    if (rsiChartRef.current && isContainerVisible(rsiContainerRef.current)) {
      // Always re-initialize to ensure all selected RSI indicators are shown
      initializeRSIChart();
      return;
    }

    // Wait for container to be visible before initializing
    const checkAndInitialize = () => {
      if (!rsiContainerRef.current) return;
      
      const isVisible = isContainerVisible(rsiContainerRef.current);
      
      if (!isVisible && !rsiChartRef.current) {
        // Container not visible yet, wait a bit and retry (max 10 times = 1 second)
        let retryCount = 0;
        const maxRetries = 10;
        const retry = () => {
          retryCount++;
          if (retryCount < maxRetries && rsiContainerRef.current && !isContainerVisible(rsiContainerRef.current)) {
            timeoutId = setTimeout(retry, 100);
          } else if (rsiContainerRef.current && isContainerVisible(rsiContainerRef.current) && !rsiChartRef.current) {
            initializeRSIChart();
          }
        };
        timeoutId = setTimeout(retry, 100);
        return;
      }

      // Container is visible, initialize chart
      if (!rsiChartRef.current) {
        initializeRSIChart();
      }
    };

    checkAndInitialize();

    function initializeRSIChart() {
      if (!rsiContainerRef.current) return;

      try {
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
        const closes = sortedData.map(d => d.close);

        // Remove existing chart if it exists
        if (rsiChartRef.current) {
          try {
            rsiChartRef.current.remove();
          } catch (error) {
            // Ignore
          }
        }

        // Ensure we have the latest dark mode state
        const isDark = darkMode || (typeof window !== 'undefined' && 
          (document.documentElement.classList.contains('dark') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches));
        
        rsiChart = createChart(rsiContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919' },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          width: rsiContainerRef.current.clientWidth || 800,
          height: 120,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          rightPriceScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          crosshair: { mode: 0 },
        });

        if (!rsiChart) return;
        rsiChartRef.current = rsiChart;

        // Sync time scale with main chart
        if (chartRef.current) {
          try {
            let mainTimeScale;
      try {
        mainTimeScale = chartRef.current?.timeScale();
      } catch (error) {
        // Chart may be disposed
        return;
      }
      if (!mainTimeScale) return;
            if (mainTimeScale) {
              timeRangeUnsubscribe = mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                if (timeRange && rsiChart && rsiChartRef.current === rsiChart) {
                  try {
                    const rsiTimeScale = rsiChart.timeScale();
                    if (rsiTimeScale) {
                      rsiTimeScale.setVisibleRange(timeRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
            }
          } catch (error) {
            // Main chart may be disposed - ignore
          }
          
          // Initial sync
          try {
            let mainTimeScale;
      try {
        mainTimeScale = chartRef.current?.timeScale();
      } catch (error) {
        // Chart may be disposed
        return;
      }
      if (!mainTimeScale) return;
            const rsiTimeScale = rsiChart.timeScale();
            if (mainTimeScale && rsiTimeScale) {
              const mainRange = mainTimeScale.getVisibleRange();
              if (mainRange) {
                rsiTimeScale.setVisibleRange(mainRange);
              }
            }
          } catch (error) {
            // Ignore sync errors
          }
        }

        // RSI color mapping for different periods
        const rsiColors: Record<string, string> = {
          'RSI': '#4ECDC4',      // Teal (default)
          'RSI_5': '#FF1493',    // Deep Pink
          'RSI_7': '#FF6B6B',    // Red
          'RSI_9': '#FFA500',    // Orange
          'RSI_14': '#4ECDC4',   // Teal
          'RSI_21': '#9B59B6',   // Purple
          'RSI_30': '#3498DB',   // Blue
        };

        // Add series for each selected RSI indicator
        let firstRSISeries: ISeriesApi<SeriesType> | null = null;
        
        if (selectedIndicators.has('RSI')) {
          const rsiValues = calculateRSI(closes, 14);
          const rsiData = rsiValues.map((value, idx) => ({
            time: (sortedData[idx + 13]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && !isNaN(d.value));
          
          const rsiSeries = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI (14)',
          });
          rsiSeries.setData(rsiData);
          if (!firstRSISeries) firstRSISeries = rsiSeries;
        }
        
        if (selectedIndicators.has('RSI_5')) {
          const rsiValues = calculateRSI(closes, 5);
          const rsiData = rsiValues.map((value, idx) => ({
            time: (sortedData[idx + 4]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && !isNaN(d.value));
          
          const rsiSeries = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_5'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI (5)',
          });
          rsiSeries.setData(rsiData);
          if (!firstRSISeries) firstRSISeries = rsiSeries;
        }
        
        if (selectedIndicators.has('RSI_7')) {
          const rsi7Values = calculateRSI(closes, 7);
          const rsi7Series = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_7'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI 7',
          });
          const rsi7Data = rsi7Values.map((value, idx) => ({
            time: (sortedData[idx + 7]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          rsi7Series.setData(rsi7Data);
          if (!firstRSISeries) firstRSISeries = rsi7Series;
        }

        if (selectedIndicators.has('RSI_9')) {
          const rsi9Values = calculateRSI(closes, 9);
          const rsi9Series = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_9'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI 9',
          });
          const rsi9Data = rsi9Values.map((value, idx) => ({
            time: (sortedData[idx + 9]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          rsi9Series.setData(rsi9Data);
          if (!firstRSISeries) firstRSISeries = rsi9Series;
        }

        if (selectedIndicators.has('RSI_14')) {
          const rsi14Values = calculateRSI(closes, 14);
          const rsi14Series = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_14'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI 14',
          });
          const rsi14Data = rsi14Values.map((value, idx) => ({
            time: (sortedData[idx + 14]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          rsi14Series.setData(rsi14Data);
          if (!firstRSISeries) firstRSISeries = rsi14Series;
        }

        if (selectedIndicators.has('RSI_21')) {
          const rsi21Values = calculateRSI(closes, 21);
          const rsi21Series = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_21'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI 21',
          });
          const rsi21Data = rsi21Values.map((value, idx) => ({
            time: (sortedData[idx + 20]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && !isNaN(d.value));
          rsi21Series.setData(rsi21Data);
          if (!firstRSISeries) firstRSISeries = rsi21Series;
        }
        
        if (selectedIndicators.has('RSI_30')) {
          const rsi30Values = calculateRSI(closes, 30);
          const rsi30Series = rsiChart.addSeries(LineSeries, {
            color: rsiColors['RSI_30'],
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            title: 'RSI (30)',
          });
          const rsi30Data = rsi30Values.map((value, idx) => ({
            time: (sortedData[idx + 29]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && !isNaN(d.value));
          rsi30Series.setData(rsi30Data);
          if (!firstRSISeries) firstRSISeries = rsi30Series;
        }

        // Add RSI levels (70 overbought, 30 oversold) to the first series
        if (firstRSISeries) {
          firstRSISeries.createPriceLine({ price: 70, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
          firstRSISeries.createPriceLine({ price: 50, color: '#95A5A6', lineWidth: 1, lineStyle: 1, axisLabelVisible: false });
          firstRSISeries.createPriceLine({ price: 30, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
        }

        handleResize = () => {
          if (rsiContainerRef.current && rsiChart && rsiChartRef.current === rsiChart) {
            try {
              // Verify chart is still valid before applying options
              if ((rsiChart as any)._internal_state && rsiContainerRef.current.clientWidth > 0) {
                rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
              }
            } catch (error) {
              // Chart may be disposed - cleanup
              if (handleResize) {
                window.removeEventListener('resize', handleResize);
              }
              if (timeRangeUnsubscribe) {
                try {
                  timeRangeUnsubscribe();
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('Error initializing RSI chart:', error);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      // Don't remove chart on unmount - preserve state for modal transitions
    };
  }, [data, darkMode, selectedIndicators]);

  // Initialize MACD chart (below RSI) - ONLY if MACD indicator is explicitly selected
  useEffect(() => {
    const hasMACD = selectedIndicators.has('MACD') || selectedIndicators.has('MACD_12_26_9') || 
                    selectedIndicators.has('MACD_8_17_9') || selectedIndicators.has('MACD_5_13_9');
    
    // If MACD is not selected, ensure chart is removed and container is hidden
    if (!hasMACD) {
      if (macdChartRef.current) {
        try {
          macdChartRef.current.remove();
        } catch (error) {
          // Ignore
        }
        macdChartRef.current = null;
      }
      return;
    }
    
    if (!macdContainerRef.current || !data || data.length === 0) {
      return;
    }

    let macdChart: IChartApi | null = null;
    let handleResize: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let macdTimeRangeUnsubscribe: (() => void) | null = null;

    // Helper to check if container is actually visible
    const isContainerVisible = (container: HTMLDivElement): boolean => {
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      return (
        rect.width > 0 && 
        rect.height > 0 && 
        style.display !== 'none' && 
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    // If chart exists and container is visible, just resize
    if (macdChartRef.current && isContainerVisible(macdContainerRef.current)) {
      try {
        macdChartRef.current.applyOptions({ 
          height: 120,
          width: macdContainerRef.current.clientWidth 
        });
      } catch (error) {
        // Chart may be disposed - remove reference and reinitialize
        macdChartRef.current = null;
        checkAndInitialize();
      }
      return;
    }

    // Wait for container to be visible before initializing
    const checkAndInitialize = () => {
      if (!macdContainerRef.current) return;
      
      const isVisible = isContainerVisible(macdContainerRef.current);
      
      if (!isVisible && !macdChartRef.current) {
        // Container not visible yet, wait a bit and retry (max 10 times = 1 second)
        let retryCount = 0;
        const maxRetries = 10;
        const retry = () => {
          retryCount++;
          if (retryCount < maxRetries && macdContainerRef.current && !isContainerVisible(macdContainerRef.current)) {
            timeoutId = setTimeout(retry, 100);
          } else if (macdContainerRef.current && isContainerVisible(macdContainerRef.current) && !macdChartRef.current) {
            initializeMACDChart();
          }
        };
        timeoutId = setTimeout(retry, 100);
        return;
      }

      // Container is visible, initialize chart
      if (!macdChartRef.current) {
        initializeMACDChart();
      }
    };

    checkAndInitialize();

    function initializeMACDChart() {
      if (!macdContainerRef.current) return;

      try {
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
        const closes = sortedData.map(d => d.close);
        
        // Determine which MACD variation is selected and use appropriate parameters
        let fastPeriod = 12;
        let slowPeriod = 26;
        let signalPeriod = 9;
        
        if (selectedIndicators.has('MACD') || selectedIndicators.has('MACD_12_26_9')) {
          fastPeriod = 12;
          slowPeriod = 26;
          signalPeriod = 9;
        } else if (selectedIndicators.has('MACD_8_17_9')) {
          fastPeriod = 8;
          slowPeriod = 17;
          signalPeriod = 9;
        } else if (selectedIndicators.has('MACD_5_13_9')) {
          fastPeriod = 5;
          slowPeriod = 13;
          signalPeriod = 9;
        }
        
        const macdData = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);

        // Ensure we have the latest dark mode state
        const isDark = darkMode || (typeof window !== 'undefined' && 
          (document.documentElement.classList.contains('dark') ||
           window.matchMedia('(prefers-color-scheme: dark)').matches));
        
        macdChart = createChart(macdContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919' },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          width: macdContainerRef.current.clientWidth || 800,
          height: 120,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          rightPriceScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          crosshair: { mode: 0 },
        });

        if (!macdChart) return;
        macdChartRef.current = macdChart;

        // Sync time scale with main chart
        if (chartRef.current) {
          try {
            let mainTimeScale;
      try {
        mainTimeScale = chartRef.current?.timeScale();
      } catch (error) {
        // Chart may be disposed
        return;
      }
      if (!mainTimeScale) return;
            if (mainTimeScale) {
              macdTimeRangeUnsubscribe = mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                if (timeRange && macdChart && macdChartRef.current === macdChart) {
                  try {
                    const timeScale = macdChart.timeScale();
                    if (timeScale) {
                      timeScale.setVisibleRange(timeRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
            }
          } catch (error) {
            // Main chart may be disposed - ignore
          }
        }

        // MACD series with better colors for contrast
        const macdSeries = macdChart.addSeries(LineSeries, {
          color: darkMode ? '#60A5FA' : '#2563EB', // Bright blue
          lineWidth: 2,
        });
        const signalSeries = macdChart.addSeries(LineSeries, {
          color: darkMode ? '#F87171' : '#DC2626', // Bright red
          lineWidth: 2,
        });
        const histSeries = macdChart.addSeries(HistogramSeries, {
          color: darkMode ? '#9B59B6' : '#7C3AED', // Purple
        });

        // Calculate offset based on the slow period (need enough data for calculation)
        const offset = slowPeriod - 1;
        
        const macdLineData = macdData.map((macd, idx) => ({
          time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
          value: macd.MACD,
        })).filter(d => d.time && !isNaN(d.value));
        const signalLineData = macdData.map((macd, idx) => ({
          time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
          value: macd.signal,
        })).filter(d => d.time && !isNaN(d.value));
        const histData = macdData.map((macd, idx) => ({
          time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
          value: macd.histogram,
          color: macd.histogram >= 0 ? (darkMode ? '#26a69a80' : '#10b98180') : (darkMode ? '#ef535080' : '#dc262680'),
        })).filter(d => d.time && !isNaN(d.value));

        try {
        try {
          macdSeries.setData(macdLineData);
          signalSeries.setData(signalLineData);
          histSeries.setData(histData);

          // Add zero line - createPriceLine is a series method
          macdSeries.createPriceLine({ price: 0, color: '#95A5A6', lineWidth: 1, lineStyle: 1, axisLabelVisible: false });
        } catch (error) {
          console.error('Error setting MACD data:', error);
          // If chart was disposed during setup, clean up
          if (macdChart) {
            try {
              macdChart.remove();
            } catch (e) {
              // Ignore
            }
          }
          macdChartRef.current = null;
          return;
        }
        } catch (error) {
          console.error('Error setting MACD data:', error);
          // If chart was disposed during setup, clean up
          if (macdChart) {
            try {
              macdChart.remove();
            } catch (e) {
              // Ignore
            }
          }
          macdChartRef.current = null;
          return;
        }

        handleResize = () => {
          if (macdContainerRef.current && macdChart && macdChartRef.current === macdChart) {
            try {
              macdChart.applyOptions({ width: macdContainerRef.current.clientWidth });
            } catch (error) {
              // Chart may be disposed - cleanup
              if (handleResize) {
                window.removeEventListener('resize', handleResize);
              }
              if (macdTimeRangeUnsubscribe) {
                macdTimeRangeUnsubscribe();
              }
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('Error initializing MACD chart:', error);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      // Don't remove chart on unmount - preserve state for modal transitions
    };
  }, [data, darkMode, selectedIndicators]);

  // Manage momentum indicator charts (separate charts for Stochastic, Williams %R, CCI, MFI, ROC, Momentum, TRIX, Awesome Oscillator, Ultimate Oscillator)
  // RSI and MACD have their own dedicated charts above
  useEffect(() => {
    if (!data || data.length === 0) return;

    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const closes = sortedData.map(d => d.close);
    const highs = sortedData.map(d => d.high);
    const lows = sortedData.map(d => d.low);
    const volumes = sortedData.map(d => d.volume);

    // Momentum indicators that need separate charts (excluding RSI which has its own chart)
    const momentumIndicators = [
      { id: 'Stoch_5', period: 5, signalPeriod: 3, calc: () => calculateStochastic(highs, lows, closes, 5, 3), color: '#FF1493', label: 'Stochastic (5,3)' },
      { id: 'Stoch_9', period: 9, signalPeriod: 3, calc: () => calculateStochastic(highs, lows, closes, 9, 3), color: '#FF69B4', label: 'Stochastic (9,3)' },
      { id: 'Stoch_14', period: 14, signalPeriod: 3, calc: () => calculateStochastic(highs, lows, closes, 14, 3), color: '#9B59B6', label: 'Stochastic (14,3)' },
      { id: 'Stoch_21', period: 21, signalPeriod: 5, calc: () => calculateStochastic(highs, lows, closes, 21, 5), color: '#8E44AD', label: 'Stochastic (21,5)' },
      { id: 'WilliamsR_9', period: 9, calc: () => calculateWilliamsR(highs, lows, closes, 9), color: '#FF6B6B', label: 'Williams %R (9)' },
      { id: 'WilliamsR_14', period: 14, calc: () => calculateWilliamsR(highs, lows, closes, 14), color: '#E74C3C', label: 'Williams %R (14)' },
      { id: 'WilliamsR_21', period: 21, calc: () => calculateWilliamsR(highs, lows, closes, 21), color: '#C0392B', label: 'Williams %R (21)' },
      { id: 'CCI_10', period: 10, calc: () => calculateCCI(highs, lows, closes, 10), color: '#5DADE2', label: 'CCI (10)' },
      { id: 'CCI_14', period: 14, calc: () => calculateCCI(highs, lows, closes, 14), color: '#2980B9', label: 'CCI (14)' },
      { id: 'CCI_20', period: 20, calc: () => calculateCCI(highs, lows, closes, 20), color: '#3498DB', label: 'CCI (20)' },
      { id: 'CCI_30', period: 30, calc: () => calculateCCI(highs, lows, closes, 30), color: '#1F618D', label: 'CCI (30)' },
      { id: 'MFI_9', period: 9, calc: () => calculateMFI(highs, lows, closes, volumes, 9), color: '#48C9B0', label: 'MFI (9)' },
      { id: 'MFI_14', period: 14, calc: () => calculateMFI(highs, lows, closes, volumes, 14), color: '#16A085', label: 'MFI (14)' },
      { id: 'MFI_21', period: 21, calc: () => calculateMFI(highs, lows, closes, volumes, 21), color: '#138D75', label: 'MFI (21)' },
      { id: 'ROC_10', period: 10, calc: () => calculateROC(closes, 10), color: '#F7DC6F', label: 'ROC (10)' },
      { id: 'ROC_12', period: 12, calc: () => calculateROC(closes, 12), color: '#F39C12', label: 'ROC (12)' },
      { id: 'ROC_20', period: 20, calc: () => calculateROC(closes, 20), color: '#E67E22', label: 'ROC (20)' },
      { id: 'ROC_25', period: 25, calc: () => calculateROC(closes, 25), color: '#D35400', label: 'ROC (25)' },
      { id: 'Momentum_5', period: 5, calc: () => calculateMomentum(closes, 5), color: '#52BE80', label: 'Momentum (5)' },
      { id: 'Momentum_10', period: 10, calc: () => calculateMomentum(closes, 10), color: '#1ABC9C', label: 'Momentum (10)' },
      { id: 'Momentum_14', period: 14, calc: () => calculateMomentum(closes, 14), color: '#16A085', label: 'Momentum (14)' },
      { id: 'Momentum_20', period: 20, calc: () => calculateMomentum(closes, 20), color: '#138D75', label: 'Momentum (20)' },
      { id: 'TRIX_9', period: 9, calc: () => calculateTRIX(closes, 9), color: '#EC7063', label: 'TRIX (9)' },
      { id: 'TRIX_14', period: 14, calc: () => calculateTRIX(closes, 14), color: '#E91E63', label: 'TRIX (14)' },
      { id: 'TRIX_21', period: 21, calc: () => calculateTRIX(closes, 21), color: '#C2185B', label: 'TRIX (21)' },
      { id: 'TRIX_30', period: 30, calc: () => calculateTRIX(closes, 30), color: '#AD1457', label: 'TRIX (30)' },
      { id: 'AwesomeOsc', calc: () => calculateAwesomeOscillator(highs, lows), color: '#FF9800', label: 'Awesome Oscillator' },
      { id: 'UltimateOsc', calc: () => calculateUltimateOscillator(highs, lows, closes), color: '#FF5722', label: 'Ultimate Oscillator' },
    ];

    // Get or create container ref for each momentum indicator
    momentumIndicators.forEach((indicator) => {
      if (!momentumContainerRefs.current.has(indicator.id)) {
        momentumContainerRefs.current.set(indicator.id, { current: null });
      }
    });

    // Process each momentum indicator
    momentumIndicators.forEach((indicator) => {
      const isSelected = selectedIndicators.has(indicator.id);
      const containerRef = momentumContainerRefs.current.get(indicator.id);
      
      if (!isSelected) {
        // Remove chart if indicator is not selected
        const chart = momentumChartRefs.current.get(indicator.id);
        if (chart) {
          try {
            // Unsubscribe from time scale events before removing
            if ((chart as any)._timeRangeUnsub) {
              try {
                (chart as any)._timeRangeUnsub();
              } catch (e) {
                // Ignore
              }
            }
            if ((chart as any)._logicalRangeUnsub) {
              try {
                (chart as any)._logicalRangeUnsub();
              } catch (e) {
                // Ignore
              }
            }
            chart.remove();
          } catch (error) {
            // Ignore
          }
          momentumChartRefs.current.delete(indicator.id);
        }
        return;
      }

      // Indicator is selected - create or update chart
      if (!containerRef?.current) return;

      const existingChart = momentumChartRefs.current.get(indicator.id);
      
      if (existingChart && containerRef.current.clientWidth > 0) {
        // Chart exists, just resize if needed
        try {
          if ((existingChart as any)._internal_state && containerRef.current.clientWidth > 0) {
            existingChart.applyOptions({
              width: containerRef.current.clientWidth,
              height: 120,
            });
          }
        } catch (error) {
          // Chart may be disposed - remove and recreate
          try {
            existingChart.remove();
          } catch (e) {
            // Ignore
          }
          momentumChartRefs.current.delete(indicator.id);
        }
        return;
      }

      // Create new chart
      try {
        const isDark = darkMode || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
        const momentumChart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#18181b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#191919' },
          grid: {
            vertLines: { color: isDark ? '#27272a' : '#e4e4e7' },
            horzLines: { color: isDark ? '#27272a' : '#e4e4e7' },
          },
          width: containerRef.current.clientWidth || 800,
          height: 120,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          rightPriceScale: {
            borderColor: isDark ? '#3f3f46' : '#d4d4d8',
          },
          crosshair: { mode: 0 },
        });

        momentumChartRefs.current.set(indicator.id, momentumChart);

        // Sync time scale with main chart
        if (chartRef.current) {
          try {
            const mainTimeScale = chartRef.current?.timeScale();
            if (mainTimeScale) {
              const timeRangeUnsub = mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                if (timeRange && momentumChart && momentumChartRefs.current.get(indicator.id) === momentumChart) {
                  try {
                    const momentumTimeScale = momentumChart.timeScale();
                    if (momentumTimeScale) {
                      momentumTimeScale.setVisibleRange(timeRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
              const logicalRangeUnsub = mainTimeScale.subscribeVisibleLogicalRangeChange((logicalRange) => {
                if (logicalRange && momentumChart && momentumChartRefs.current.get(indicator.id) === momentumChart) {
                  try {
                    const momentumTimeScale = momentumChart.timeScale();
                    if (momentumTimeScale) {
                      momentumTimeScale.setVisibleLogicalRange(logicalRange);
                    }
                  } catch (error) {
                    // Chart may be disposed - ignore
                  }
                }
              });
              // Store unsubscribe functions for cleanup
              (momentumChart as any)._timeRangeUnsub = timeRangeUnsub;
              (momentumChart as any)._logicalRangeUnsub = logicalRangeUnsub;
            }
          } catch (error) {
            // Main chart may be disposed - ignore
          }
        }

        // Calculate indicator values
        const indicatorValues = indicator.calc();
        const period = indicator.period || 14;
        
        // Create series
        const series = momentumChart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: indicator.label,
        });

        // Map data to chart format - handle different indicator types with correct period offsets
        let indicatorData: Array<{ time: Time; value: number }> = [];
        
        if (indicator.id.includes('AwesomeOsc') || indicator.id.includes('UltimateOsc')) {
          // Awesome Oscillator and Ultimate Oscillator have different offsets
          const offset = indicator.id.includes('AwesomeOsc') ? 33 : 13; // Approximate offsets
          indicatorData = indicatorValues.map((value, idx) => ({
            time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && d.value !== undefined && !isNaN(d.value));
        } else {
          // Standard momentum indicators
          indicatorData = indicatorValues.map((value, idx) => ({
            time: (sortedData[Math.min(idx + (period - 1), sortedData.length - 1)]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time && d.value !== undefined && !isNaN(d.value));
        }

        // Sort by time and remove duplicates (keep first occurrence)
        // This ensures data is in ascending order as required by TradingView
        const seenTimes = new Set<number>();
        indicatorData = indicatorData
          .filter(d => {
            const timeNum = d.time as number;
            if (seenTimes.has(timeNum)) {
              return false; // Skip duplicate
            }
            seenTimes.add(timeNum);
            return true;
          })
          .sort((a, b) => (a.time as number) - (b.time as number));

        series.setData(indicatorData);

        // Add reference lines for oscillators (0 line for most, 50 for Stochastic, etc.)
        if (indicator.id.includes('Stoch') || indicator.id.includes('WilliamsR') || indicator.id.includes('CCI')) {
          // Oscillators with -100 to 100 or 0 to 100 range
          if (indicator.id.includes('Stoch') || indicator.id.includes('WilliamsR')) {
            series.createPriceLine({ price: 80, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
            series.createPriceLine({ price: 50, color: '#95A5A6', lineWidth: 1, lineStyle: 1, axisLabelVisible: false });
            series.createPriceLine({ price: 20, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
          } else if (indicator.id.includes('CCI')) {
            series.createPriceLine({ price: 100, color: '#ef5350', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
            series.createPriceLine({ price: 0, color: '#95A5A6', lineWidth: 1, lineStyle: 1, axisLabelVisible: false });
            series.createPriceLine({ price: -100, color: '#26a69a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
          }
        } else {
          // Other indicators - add zero line
          series.createPriceLine({ price: 0, color: '#95A5A6', lineWidth: 1, lineStyle: 1, axisLabelVisible: false });
        }

        // Handle resize
        const handleResize = () => {
          if (containerRef.current && momentumChart && momentumChartRefs.current.get(indicator.id) === momentumChart) {
            try {
              // Verify chart is still valid before applying options
              if ((momentumChart as any)._internal_state && containerRef.current.clientWidth > 0) {
                momentumChart.applyOptions({ width: containerRef.current.clientWidth });
              }
            } catch (error) {
              // Chart may be disposed - cleanup
              window.removeEventListener('resize', handleResize);
              if ((momentumChart as any)._timeRangeUnsub) {
                try {
                  (momentumChart as any)._timeRangeUnsub();
                } catch (e) {
                  // Ignore
                }
              }
              if ((momentumChart as any)._logicalRangeUnsub) {
                try {
                  (momentumChart as any)._logicalRangeUnsub();
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
        };
        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error(`Error initializing ${indicator.id} chart:`, error);
      }
    });

    return () => {
      // Cleanup is handled by individual chart removal above
    };
  }, [data, darkMode, selectedIndicators]);

  // Update overlay indicators (Bollinger, SMA, EMA, WMA, DEMA, TEMA, ADX, Keltner, Donchian, ATR, Stochastic)
  const updateOverlayIndicators = (chart: IChartApi, sortedData: HistoricalDataPoint[]) => {
    const isDark = darkMode || (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
    indicatorSeriesRefs.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (error) {
        // Ignore
      }
    });
    indicatorSeriesRefs.current.clear();

    if (sortedData.length < 5) return;

    const closes = sortedData.map(d => d.close);
    const highs = sortedData.map(d => d.high);
    const lows = sortedData.map(d => d.low);

    try {
      // Bollinger Bands - check all variations
      const bbIndicators = ['BB', 'BB_20_2', 'BB_20_1', 'BB_20_3', 'BB_50_2'];
      bbIndicators.forEach((bbId) => {
        if (selectedIndicators.has(bbId)) {
          const period = bbId === 'BB' || bbId.includes('20') ? 20 : 50;
          const stdDev = bbId === 'BB' || bbId.includes('_2') ? 2 : bbId.includes('_1') ? 1 : bbId.includes('_3') ? 3 : 2;
          const bbData = calculateBollingerBands(closes, period, stdDev);
          if (bbData.length > 0) {
            // Bollinger Bands - solid lines with better contrast colors
            const upperSeries = chart.addSeries(LineSeries, {
              color: isDark ? '#60A5FA' : '#2563EB', // Bright blue for better visibility
              lineWidth: 2,
              lineStyle: 0, // Solid line (0 = solid, 2 = dotted)
              title: `BB Upper (${period},${stdDev})`,
            });
            const middleSeries = chart.addSeries(LineSeries, {
              color: isDark ? '#A1A1AA' : '#6B7280', // Medium gray for middle band
              lineWidth: 1,
              lineStyle: 0, // Solid line
              title: `BB Middle (${period},${stdDev})`,
            });
            const lowerSeries = chart.addSeries(LineSeries, {
              color: isDark ? '#F87171' : '#DC2626', // Bright red for better visibility
              lineWidth: 2,
              lineStyle: 0, // Solid line
              title: `BB Lower (${period},${stdDev})`,
            });

            const offset = period - 1;
            const upperData = bbData.map((bb, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: bb.upper,
            })).filter(d => d.time);
            const middleData = bbData.map((bb, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: bb.middle,
            })).filter(d => d.time);
            const lowerData = bbData.map((bb, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: bb.lower,
            })).filter(d => d.time);

            upperSeries.setData(upperData);
            middleSeries.setData(middleData);
            lowerSeries.setData(lowerData);

            indicatorSeriesRefs.current.set(`${bbId}_Upper`, upperSeries);
            indicatorSeriesRefs.current.set(`${bbId}_Middle`, middleSeries);
            indicatorSeriesRefs.current.set(`${bbId}_Lower`, lowerSeries);
          }
        }
      });

      // SMA - check all variations (SMA_5, SMA_10, SMA_20, SMA_30, SMA_50, SMA_100, SMA_200)
      const smaPeriods = [5, 10, 20, 30, 50, 100, 200];
      smaPeriods.forEach((period) => {
        const smaId = `SMA_${period}`;
        if (selectedIndicators.has(smaId)) {
          const smaValues = calculateSMA(closes, period);
          if (smaValues.length > 0) {
            const colors = ['#FF6B6B', '#F39C12', '#E67E22', '#D35400', '#C0392B', '#A93226'];
            const smaSeries = chart.addSeries(LineSeries, {
              color: colors[smaPeriods.indexOf(period)] || '#F39C12',
              lineWidth: 2,
              title: `SMA (${period})`,
            });
            const offset = period - 1;
            const smaData = smaValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            smaSeries.setData(smaData);
            indicatorSeriesRefs.current.set(smaId, smaSeries);
          }
        }
      });

      // EMA - check all variations (EMA_5, EMA_10, EMA_12, EMA_20, EMA_26, EMA_30, EMA_50, EMA_100, EMA_200)
      const emaPeriods = [5, 10, 12, 20, 26, 30, 50, 100, 200];
      emaPeriods.forEach((period) => {
        const emaId = `EMA_${period}`;
        if (selectedIndicators.has(emaId)) {
          const emaValues = calculateEMA(closes, period);
          if (emaValues.length > 0) {
            const colors = ['#FF9800', '#E67E22', '#D35400', '#C0392B', '#A93226', '#8E44AD', '#7D3C98', '#6C3483'];
            const emaSeries = chart.addSeries(LineSeries, {
              color: colors[emaPeriods.indexOf(period)] || '#E67E22',
              lineWidth: 2,
              title: `EMA (${period})`,
            });
            const offset = period - 1;
            const emaData = emaValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            emaSeries.setData(emaData);
            indicatorSeriesRefs.current.set(emaId, emaSeries);
          }
        }
      });

      // WMA - check all variations
      const wmaPeriods = [20, 50];
      wmaPeriods.forEach((period) => {
        const wmaId = `WMA_${period}`;
        if (selectedIndicators.has(wmaId)) {
          const wmaValues = calculateWMA(closes, period);
          if (wmaValues.length > 0) {
            const wmaSeries = chart.addSeries(LineSeries, {
              color: '#9B59B6',
              lineWidth: 2,
              title: `WMA (${period})`,
            });
            const offset = period - 1;
            const wmaData = wmaValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            wmaSeries.setData(wmaData);
            indicatorSeriesRefs.current.set(wmaId, wmaSeries);
          }
        }
      });

      // DEMA - check all variations
      const demaPeriods = [20, 50];
      demaPeriods.forEach((period) => {
        const demaId = `DEMA_${period}`;
        if (selectedIndicators.has(demaId)) {
          const demaValues = calculateDEMA(closes, period);
          if (demaValues.length > 0) {
            const demaSeries = chart.addSeries(LineSeries, {
              color: '#3498DB',
              lineWidth: 2,
              title: `DEMA (${period})`,
            });
            const offset = (period * 2) - 1; // DEMA needs more offset
            const demaData = demaValues.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            demaSeries.setData(demaData);
            indicatorSeriesRefs.current.set(demaId, demaSeries);
          }
        }
      });

      // TEMA - check all variations
      const temaPeriods = [20, 50];
      temaPeriods.forEach((period) => {
        const temaId = `TEMA_${period}`;
        if (selectedIndicators.has(temaId)) {
          const temaValues = calculateTEMA(closes, period);
          if (temaValues.length > 0) {
            const temaSeries = chart.addSeries(LineSeries, {
              color: '#1ABC9C',
              lineWidth: 2,
              title: `TEMA (${period})`,
            });
            const offset = (period * 3) - 1; // TEMA needs more offset
            const temaData = temaValues.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            temaSeries.setData(temaData);
            indicatorSeriesRefs.current.set(temaId, temaSeries);
          }
        }
      });

      // ADX - check all variations
      const adxPeriods = [14, 21];
      adxPeriods.forEach((period) => {
        const adxId = `ADX_${period}`;
        if (selectedIndicators.has(adxId)) {
          const adxValues = calculateADX(highs, lows, closes, period);
          if (adxValues.length > 0) {
            const adxSeries = chart.addSeries(LineSeries, {
              color: '#E74C3C',
              lineWidth: 2,
              priceScaleId: `adx_${period}`,
              title: `ADX (${period})`,
            });
            const offset = period - 1;
            const adxData = adxValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            adxSeries.setData(adxData);
            chart.priceScale(`adx_${period}`).applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
            });
            indicatorSeriesRefs.current.set(adxId, adxSeries);
          }
        }
      });

      // Keltner Channels - check all variations
      const keltnerConfigs = [
        { id: 'Keltner_14_2', period: 14, multiplier: 2 },
        { id: 'Keltner_20_2', period: 20, multiplier: 2 },
        { id: 'Keltner_20_3', period: 20, multiplier: 3 },
      ];
      keltnerConfigs.forEach((config) => {
        if (selectedIndicators.has(config.id)) {
          const keltnerData = calculateKeltnerChannels(highs, lows, closes, config.period, config.multiplier);
          if (keltnerData.length > 0) {
            const upperSeries = chart.addSeries(LineSeries, {
              color: '#16A085',
              lineWidth: 1,
              lineStyle: 2,
              title: `KC Upper (${config.period},${config.multiplier})`,
            });
            const middleSeries = chart.addSeries(LineSeries, {
              color: '#95A5A6',
              lineWidth: 1,
              title: `KC Middle (${config.period},${config.multiplier})`,
            });
            const lowerSeries = chart.addSeries(LineSeries, {
              color: '#16A085',
              lineWidth: 1,
              lineStyle: 2,
              title: `KC Lower (${config.period},${config.multiplier})`,
            });

            const offset = config.period - 1;
            const upperData = keltnerData.map((kc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: kc.upper,
            })).filter(d => d.time);
            const middleData = keltnerData.map((kc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: kc.middle,
            })).filter(d => d.time);
            const lowerData = keltnerData.map((kc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: kc.lower,
            })).filter(d => d.time);

            upperSeries.setData(upperData);
            middleSeries.setData(middleData);
            lowerSeries.setData(lowerData);

            indicatorSeriesRefs.current.set(`${config.id}_Upper`, upperSeries);
            indicatorSeriesRefs.current.set(`${config.id}_Middle`, middleSeries);
            indicatorSeriesRefs.current.set(`${config.id}_Lower`, lowerSeries);
          }
        }
      });

      // Donchian Channels - check all variations
      const donchianPeriods = [10, 20, 30, 50];
      donchianPeriods.forEach((period) => {
        const donchianId = `Donchian_${period}`;
        if (selectedIndicators.has(donchianId)) {
          const donchianData = calculateDonchianChannels(highs, lows, period);
          if (donchianData.length > 0) {
            const upperSeries = chart.addSeries(LineSeries, {
              color: '#27AE60',
              lineWidth: 1,
              lineStyle: 2,
              title: `DC Upper (${period})`,
            });
            const middleSeries = chart.addSeries(LineSeries, {
              color: '#95A5A6',
              lineWidth: 1,
              title: `DC Middle (${period})`,
            });
            const lowerSeries = chart.addSeries(LineSeries, {
              color: '#27AE60',
              lineWidth: 1,
              lineStyle: 2,
              title: `DC Lower (${period})`,
            });

            const offset = period - 1;
            const upperData = donchianData.map((dc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: dc.upper,
            })).filter(d => d.time);
            const middleData = donchianData.map((dc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: dc.middle,
            })).filter(d => d.time);
            const lowerData = donchianData.map((dc, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: dc.lower,
            })).filter(d => d.time);

            upperSeries.setData(upperData);
            middleSeries.setData(middleData);
            lowerSeries.setData(lowerData);

            indicatorSeriesRefs.current.set(`${donchianId}_Upper`, upperSeries);
            indicatorSeriesRefs.current.set(`${donchianId}_Middle`, middleSeries);
            indicatorSeriesRefs.current.set(`${donchianId}_Lower`, lowerSeries);
          }
        }
      });

      // ATR - check all variations (ATR_7, ATR_14, ATR_21, ATR_28)
      const atrPeriods = [7, 14, 21, 28];
      atrPeriods.forEach((period) => {
        const atrId = `ATR_${period}`;
        if (selectedIndicators.has(atrId)) {
          const atrValues = calculateATR(highs, lows, closes, period);
          if (atrValues.length > 0) {
            const atrSeries = chart.addSeries(LineSeries, {
              color: '#16A085',
              lineWidth: 2,
              priceScaleId: `atr_${period}`,
              title: `ATR (${period})`,
            });
            const offset = period - 1;
            const atrData = atrValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            atrSeries.setData(atrData);
            chart.priceScale(`atr_${period}`).applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
            });
            indicatorSeriesRefs.current.set(atrId, atrSeries);
          }
        }
      });

      // HMA - check all variations
      const hmaPeriods = [14, 21];
      hmaPeriods.forEach((period) => {
        const hmaId = `HMA_${period}`;
        if (selectedIndicators.has(hmaId)) {
          const hmaValues = calculateHMA(closes, period);
          if (hmaValues.length > 0) {
            const hmaSeries = chart.addSeries(LineSeries, {
              color: '#8E44AD',
              lineWidth: 2,
              title: `HMA (${period})`,
            });
            const offset = Math.floor(Math.sqrt(period)) + period - 1;
            const hmaData = hmaValues.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            hmaSeries.setData(hmaData);
            indicatorSeriesRefs.current.set(hmaId, hmaSeries);
          }
        }
      });

      // ZLEMA - check all variations
      const zlemaPeriods = [14, 21];
      zlemaPeriods.forEach((period) => {
        const zlemaId = `ZLEMA_${period}`;
        if (selectedIndicators.has(zlemaId)) {
          const zlemaValues = calculateZLEMA(closes, period);
          if (zlemaValues.length > 0) {
            const zlemaSeries = chart.addSeries(LineSeries, {
              color: '#9B59B6',
              lineWidth: 2,
              title: `ZLEMA (${period})`,
            });
            const offset = Math.floor((period - 1) / 2) + period - 1;
            const zlemaData = zlemaValues.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            zlemaSeries.setData(zlemaData);
            indicatorSeriesRefs.current.set(zlemaId, zlemaSeries);
          }
        }
      });

      // T3 - check all variations
      const t3Periods = [14, 21];
      t3Periods.forEach((period) => {
        const t3Id = `T3_${period}`;
        if (selectedIndicators.has(t3Id)) {
          const t3Values = calculateT3(closes, period);
          if (t3Values.length > 0) {
            const t3Series = chart.addSeries(LineSeries, {
              color: '#7D3C98',
              lineWidth: 2,
              title: `T3 (${period})`,
            });
            const offset = (period * 6) - 1; // T3 needs significant offset
            const t3Data = t3Values.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            t3Series.setData(t3Data);
            indicatorSeriesRefs.current.set(t3Id, t3Series);
          }
        }
      });

      // VIDYA - check all variations
      const vidyaPeriods = [14, 21];
      vidyaPeriods.forEach((period) => {
        const vidyaId = `VIDYA_${period}`;
        if (selectedIndicators.has(vidyaId)) {
          const vidyaValues = calculateVIDYA(closes, period);
          if (vidyaValues.length > 0) {
            const vidyaSeries = chart.addSeries(LineSeries, {
              color: '#6C3483',
              lineWidth: 2,
              title: `VIDYA (${period})`,
            });
            const offset = period - 1;
            const vidyaData = vidyaValues.map((value, idx) => ({
              time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            vidyaSeries.setData(vidyaData);
            indicatorSeriesRefs.current.set(vidyaId, vidyaSeries);
          }
        }
      });

      // CMF - check all variations
      if (selectedIndicators.has('CMF_20')) {
        const volumes = sortedData.map(d => d.volume);
        const cmfValues = calculateCMF(highs, lows, closes, volumes, 20);
        if (cmfValues.length > 0) {
          const cmfSeries = chart.addSeries(LineSeries, {
            color: '#E67E22',
            lineWidth: 2,
            priceScaleId: 'cmf',
            title: 'CMF (20)',
          });
          const offset = 19;
          const cmfData = cmfValues.map((value, idx) => ({
            time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          
          // Sort by time and remove duplicates (keep first occurrence)
          const seenTimesCMF = new Set<number>();
          const uniqueCmfData = cmfData
            .filter(d => {
              const timeNum = d.time as number;
              if (seenTimesCMF.has(timeNum)) {
                return false; // Skip duplicate
              }
              seenTimesCMF.add(timeNum);
              return true;
            })
            .sort((a, b) => (a.time as number) - (b.time as number));
          
          cmfSeries.setData(uniqueCmfData);
          chart.priceScale('cmf').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
          });
          indicatorSeriesRefs.current.set('CMF_20', cmfSeries);
        }
      }

      // Volume Oscillator
      if (selectedIndicators.has('VolumeOsc')) {
        const volumes = sortedData.map(d => d.volume);
        const volOscValues = calculateVolumeOscillator(volumes, 5, 10);
        if (volOscValues.length > 0) {
          const volOscSeries = chart.addSeries(LineSeries, {
            color: '#F39C12',
            lineWidth: 2,
            priceScaleId: 'volosc',
            title: 'Volume Oscillator',
          });
          const offset = 9;
          const volOscData = volOscValues.map((value, idx) => ({
            time: (sortedData[Math.min(idx + offset, sortedData.length - 1)]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          
          // Sort by time and remove duplicates (keep first occurrence)
          const seenTimes = new Set<number>();
          const uniqueVolOscData = volOscData
            .filter(d => {
              const timeNum = d.time as number;
              if (seenTimes.has(timeNum)) {
                return false; // Skip duplicate
              }
              seenTimes.add(timeNum);
              return true;
            })
            .sort((a, b) => (a.time as number) - (b.time as number));
          
          volOscSeries.setData(uniqueVolOscData);
          chart.priceScale('volosc').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
          });
          indicatorSeriesRefs.current.set('VolumeOsc', volOscSeries);
        }
      }

      // Volume ROC - check all variations
      if (selectedIndicators.has('VolumeROC_14')) {
        const volumes = sortedData.map(d => d.volume);
        const volROCValues = calculateVolumeROC(volumes, 14);
        if (volROCValues.length > 0) {
          const volROCSeries = chart.addSeries(LineSeries, {
            color: '#D35400',
            lineWidth: 2,
            priceScaleId: 'volroc',
            title: 'Volume ROC (14)',
          });
          const offset = 14;
          const volROCData = volROCValues.map((value, idx) => ({
            time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
            value: value,
          })).filter(d => d.time);
          
          // Sort by time and remove duplicates (keep first occurrence)
          const seenTimesVolROC = new Set<number>();
          const uniqueVolROCData = volROCData
            .filter(d => {
              const timeNum = d.time as number;
              if (seenTimesVolROC.has(timeNum)) {
                return false; // Skip duplicate
              }
              seenTimesVolROC.add(timeNum);
              return true;
            })
            .sort((a, b) => (a.time as number) - (b.time as number));
          
          volROCSeries.setData(uniqueVolROCData);
          chart.priceScale('volroc').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
          });
          indicatorSeriesRefs.current.set('VolumeROC_14', volROCSeries);
        }
      }

      // Stochastic (overlay on main chart with separate scale) - check all variations
      const stochConfigs = [
        { id: 'Stoch_5', period: 5, signalPeriod: 3 },
        { id: 'Stoch_9', period: 9, signalPeriod: 3 },
        { id: 'Stoch_14', period: 14, signalPeriod: 3 },
        { id: 'Stoch_21', period: 21, signalPeriod: 5 },
      ];
      stochConfigs.forEach((config) => {
        if (selectedIndicators.has(config.id)) {
          const stochValues = calculateStochastic(highs, lows, closes, config.period, config.signalPeriod);
          if (stochValues.length > 0) {
            const stochSeries = chart.addSeries(LineSeries, {
              color: '#9B59B6',
              lineWidth: 2,
              priceScaleId: `stoch_${config.id}`,
              title: `Stochastic (${config.period},${config.signalPeriod})`,
            });
            const offset = config.period - 1;
            const stochData = stochValues.map((value, idx) => ({
              time: (sortedData[idx + offset]?.timestamp / 1000) as Time,
              value: value,
            })).filter(d => d.time);
            stochSeries.setData(stochData);
            chart.priceScale(`stoch_${config.id}`).applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
            });
            indicatorSeriesRefs.current.set(config.id, stochSeries);
          }
        }
      });
    } catch (error) {
      console.error('Error calculating overlay indicators:', error);
    }
  };

  // Update drawing lines
  const updateDrawingLines = (chart: IChartApi, sortedData: HistoricalDataPoint[]) => {
    // Remove all existing drawing lines
    drawingLinesRefs.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (error) {
        // Ignore - series may already be removed
      }
    });
    drawingLinesRefs.current.clear();

    // Add all current drawing lines
    drawnLines.forEach((line) => {
      try {
        // Ensure line has at least 2 points
        if (!line.points || line.points.length < 2) {
          console.warn(`Line ${line.id} has insufficient points`);
          return;
        }

        // Use more visible colors and thicker lines
        const lineColor = line.type === 'trendline' ? '#FFD700' : '#00FF00';
        const lineSeries = chart.addSeries(LineSeries, {
          color: lineColor,
          lineWidth: 3, // Increased from 2 to 3 for better visibility
          lineStyle: line.style === 'dotted' ? 2 : 0, // 0 = solid, 2 = dotted
          priceLineVisible: false,
          lastValueVisible: false,
          title: '', // Remove title to avoid blocking the chart
        });

        // Ensure points are sorted by time, valid, and have no duplicate timestamps
        const validPoints = line.points
          .filter(p => p.time && !isNaN(p.value))
          .sort((a, b) => (a.time as number) - (b.time as number))
          // Remove duplicate timestamps - keep the first occurrence
          .filter((point, index, array) => {
            if (index === 0) return true;
            const prevTime = array[index - 1].time as number;
            const currentTime = point.time as number;
            return currentTime !== prevTime;
          });

        if (validPoints.length >= 2) {
          lineSeries.setData(validPoints);
          drawingLinesRefs.current.set(line.id, lineSeries);
        } else {
          console.warn(`Line ${line.id} has invalid points`);
          // Clean up the series if we can't use it
          try {
            chart.removeSeries(lineSeries);
          } catch (e) {
            // Ignore
          }
        }
      } catch (error) {
        console.error('Error adding drawing line:', error);
      }
    });
  };

  // Remove a specific line
  const removeLine = (lineId: string) => {
    setDrawnLines(drawnLines.filter(line => line.id !== lineId));
    const series = drawingLinesRefs.current.get(lineId);
    if (series && chartRef.current) {
      try {
        chartRef.current.removeSeries(series);
      } catch (error) {
        // Ignore
      }
    }
    drawingLinesRefs.current.delete(lineId);
  };

  // Handle chart click for drawing - use chart's coordinate conversion for accuracy
  const handleChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (drawingTool === 'none' || !chartRef.current || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    if (!rect) return;

    // Get click coordinates relative to chart container
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    try {
      // Use chart's coordinate conversion methods for accurate point selection
      const timeScale = chartRef.current.timeScale();
      const priceScale = chartRef.current.priceScale('right');
      
      if (!timeScale || !priceScale) return;

      // Convert pixel coordinates to time using chart's API
      // This accounts for chart's internal layout and margins
      const time = timeScale.coordinateToTime(x) as Time;
      
      if (!time) return;

      // Use the series' coordinateToPrice method - this is the TradingView way!
      // It automatically handles all coordinate system conversions
      const series = chartType === 'candlestick' ? candlestickSeriesRef.current : lineSeriesRef.current;
      
      if (!series) return;
      
      // The coordinateToPrice method takes a Y coordinate and returns the price
      // It accounts for the chart's internal layout, margins, and coordinate system
      const price = series.coordinateToPrice(y);
      
      if (price === null || isNaN(price) || !isFinite(price)) return;

      if (price !== null && !isNaN(price) && isFinite(price)) {
        // Use the exact time and price from the click coordinates
        const exactTime = time;
        const exactPrice = price;

        const newPoint = { x, y, time: exactTime, price: exactPrice };

        if (drawingTool === 'trendline') {
          const updatedPoints = [...drawingPoints, newPoint];
          if (updatedPoints.length === 1) {
            // First point - just store it
            setDrawingPoints(updatedPoints);
          } else if (updatedPoints.length === 2) {
            // Second point - create the line
            // Ensure the two points have different times to avoid duplicate timestamp error
            let adjustedTime = exactTime;
            if ((updatedPoints[0].time as number) === (exactTime as number)) {
              // Add 1 second to make them different
              adjustedTime = ((exactTime as number) + 1) as Time;
            }
            
            const lineId = `trendline_${Date.now()}`;
            const newLine: DrawnLine = {
              id: lineId,
              type: 'trendline' as const,
              points: [
                { time: updatedPoints[0].time, value: updatedPoints[0].price },
                { time: adjustedTime, value: exactPrice },
              ],
              style: lineStyle,
            };
            setDrawnLines([...drawnLines, newLine]);
            setDrawingPoints([]);
            // Don't set drawingTool to 'none' - allow drawing multiple trendlines
            // User can manually turn off drawing tool if they want
          }
        } else if (drawingTool === 'horizontal') {
          // Get the full time range from the chart's time scale
          const visibleRange = timeScale.getVisibleRange();
          if (!visibleRange || !visibleRange.from || !visibleRange.to) return;
          
          // Use the visible time range for horizontal lines
          const firstTime = visibleRange.from as Time;
          const lastTime = visibleRange.to as Time;
          
          // Ensure times are different to avoid duplicate timestamp error
          // If they're the same, add a small offset to the last time
          let adjustedLastTime = lastTime;
          if ((firstTime as number) === (lastTime as number)) {
            // Add 1 second to make them different
            adjustedLastTime = ((lastTime as number) + 1) as Time;
          }
          
          const lineId = `horizontal_${Date.now()}`;
          const newLine: DrawnLine = {
            id: lineId,
            type: 'horizontal' as const,
            points: [
              { time: firstTime, value: exactPrice },
              { time: adjustedLastTime, value: exactPrice },
            ],
            style: lineStyle,
          };
          setDrawnLines([...drawnLines, newLine]);
          // Don't set drawingTool to 'none' - allow drawing multiple horizontal lines
          // User can manually turn off drawing tool if they want
        }
      }
    } catch (error) {
      console.error('Error handling chart click:', error);
    }
  };

  const toggleIndicator = (indicator: IndicatorType) => {
    const newIndicators = new Set(selectedIndicators);
    if (newIndicators.has(indicator)) {
      newIndicators.delete(indicator);
    } else {
      // Limit to 10 indicators max
      if (newIndicators.size >= 10) {
        alert('Maximum 10 indicators allowed. Please remove one before adding another.');
        return;
      }
      newIndicators.add(indicator);
    }
    setSelectedIndicators(newIndicators);
  };

  // Filter indicators by search
  const filteredIndicators = INDICATORS.filter(ind => 
    ind.label.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
    ind.id.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
    ind.category.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  // Group indicators by category
  const indicatorsByCategory = filteredIndicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = [];
    acc[ind.category].push(ind);
    return acc;
  }, {} as Record<string, IndicatorConfig[]>);

  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 rounded-xl">
        <p className="text-gray-600 dark:text-gray-400">No chart data available</p>
      </div>
    );
  }

  const chartContent = (
    <div className="w-full">
      {/* Chart Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {symbol} Price Chart
        </h3>
        <div className="flex flex-wrap gap-2">
          {/* Chart Type Toggle */}
          <div className="flex gap-2 border-r border-gray-300 dark:border-zinc-700 pr-2">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === 'candlestick'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
            >
              Candlestick
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
            >
              Line
            </button>
          </div>

          {/* Indicators Dropdown */}
          <div className="relative" ref={indicatorsDropdownRef}>
            <button
              onClick={() => setShowIndicators(!showIndicators)}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
            >
              📊 Indicators {selectedIndicators.size > 0 && `(${selectedIndicators.size}/10)`}
            </button>
            {showIndicators && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 z-20 max-h-[600px] overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Select Indicators ({selectedIndicators.size}/10)
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedIndicators.size >= 10 && (
                        <span className="text-xs text-red-500">Max reached</span>
                      )}
                      {selectedIndicators.size > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndicators(new Set());
                          }}
                          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline font-medium"
                          title="Clear all selected indicators"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search indicators..."
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {Object.entries(indicatorsByCategory).map(([category, indicators]) => (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-zinc-900">
                        {category}
                      </div>
                      {indicators.map((indicator) => (
                        <label
                          key={indicator.id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer ${
                            selectedIndicators.has(indicator.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIndicators.has(indicator.id)}
                            onChange={() => toggleIndicator(indicator.id)}
                            disabled={!selectedIndicators.has(indicator.id) && selectedIndicators.size >= 10}
                            className="rounded text-blue-600 focus:ring-blue-500 dark:bg-zinc-700 dark:border-zinc-600 disabled:opacity-50"
                          />
                          <span className="text-gray-700 dark:text-gray-300 flex-1">{indicator.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawing Tools */}
          <div className="flex gap-2 border-l border-gray-300 dark:border-zinc-700 pl-2">
            <button
              onClick={() => setDrawingTool(drawingTool === 'trendline' ? 'none' : 'trendline')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                drawingTool === 'trendline'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
              title="Draw Trend Line"
            >
              📈 Trend
            </button>
            <button
              onClick={() => setDrawingTool(drawingTool === 'horizontal' ? 'none' : 'horizontal')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                drawingTool === 'horizontal'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
              title="Draw Horizontal Line"
            >
              ➖ Horizontal
            </button>
            {drawingTool !== 'none' && (
              <div className="flex gap-1 border-l border-gray-300 dark:border-zinc-700 pl-2">
                <button
                  onClick={() => setLineStyle('solid')}
                  className={`px-2 py-1 rounded text-xs ${
                    lineStyle === 'solid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title="Solid Line"
                >
                  ─
                </button>
                <button
                  onClick={() => setLineStyle('dotted')}
                  className={`px-2 py-1 rounded text-xs ${
                    lineStyle === 'dotted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title="Dotted Line"
                >
                  ┄
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Price Chart */}
      <div 
        ref={chartContainerRef} 
        className="w-full relative border-b border-gray-200 dark:border-zinc-700" 
        style={{ height: '532px', minHeight: '532px' }}
        onClick={handleChartClick}
      >
        {drawingTool !== 'none' && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded text-sm z-10">
            {drawingTool === 'trendline' 
              ? `Click two points to draw a trend line (${drawingPoints.length}/2)` 
              : 'Click to draw a horizontal line'}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDrawingTool('none');
                setDrawingPoints([]);
              }}
              className="ml-2 text-xs underline"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Volume Chart (below main chart) */}
      <div 
        ref={volumeContainerRef} 
        className="w-full relative border-b border-gray-200 dark:border-zinc-700" 
        style={{ height: '100px' }}
      />

      {/* RSI Chart (below volume, only if selected) */}
      {(selectedIndicators.has('RSI') || selectedIndicators.has('RSI_14') || selectedIndicators.has('RSI_21') || selectedIndicators.has('RSI_9') || selectedIndicators.has('RSI_7') || selectedIndicators.has('RSI_5') || selectedIndicators.has('RSI_30')) && (
        <div 
          ref={rsiContainerRef} 
          className="w-full relative border-b border-gray-200 dark:border-zinc-700" 
          style={{ height: '120px' }}
        />
      )}

      {/* MACD Chart (below RSI, only if selected) */}
      {(selectedIndicators.has('MACD') || selectedIndicators.has('MACD_12_26_9') || selectedIndicators.has('MACD_8_17_9') || selectedIndicators.has('MACD_5_13_9')) && (
        <div 
          ref={macdContainerRef} 
          className="w-full relative border-b border-gray-200 dark:border-zinc-700" 
          style={{ height: '120px' }}
        />
      )}

      {/* Momentum Indicator Charts (separate charts for Stochastic, Williams %R, CCI, MFI, ROC, Momentum, TRIX, Awesome Oscillator, Ultimate Oscillator) */}
      {['Stoch_14', 'Stoch_21', 'WilliamsR_14', 'WilliamsR_21', 'CCI_20', 'CCI_14', 'MFI_14', 'ROC_12', 'ROC_25', 'Momentum_10', 'Momentum_14', 'TRIX_14', 'TRIX_21', 'AwesomeOsc', 'UltimateOsc'].map((indicatorId) => {
        if (!selectedIndicators.has(indicatorId)) return null;
        
        if (!momentumContainerRefs.current.has(indicatorId)) {
          momentumContainerRefs.current.set(indicatorId, { current: null });
        }
        const containerRef = momentumContainerRefs.current.get(indicatorId);
        
        return (
          <div
            key={indicatorId}
            ref={(el) => {
              if (containerRef) containerRef.current = el;
            }}
            className="w-full relative border-b border-gray-200 dark:border-zinc-700"
            style={{ height: '120px' }}
          />
        );
      })}

      {drawnLines.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-gray-800 dark:bg-zinc-800 text-white px-3 py-2 rounded text-sm z-10 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Drawn Lines ({drawnLines.length})</span>
            <button
              onClick={() => {
                // Remove all series from chart
                if (chartRef.current) {
                  drawingLinesRefs.current.forEach((series) => {
                    try {
                      chartRef.current?.removeSeries(series);
                    } catch (error) {
                      // Ignore - series may already be removed
                    }
                  });
                }
                // Clear refs and state
                drawingLinesRefs.current.clear();
                setDrawnLines([]);
              }}
              className="text-xs underline text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '56px' }}>
            {drawnLines.map((line, index) => (
              <div
                key={line.id}
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  selectedLineId === line.id ? 'bg-blue-600' : 'bg-gray-700 dark:bg-zinc-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{line.type === 'trendline' ? '📈' : '➖'}</span>
                  <span className="capitalize">{line.type}</span>
                  <span className="text-gray-400">({line.style})</span>
                </span>
                <button
                  onClick={() => removeLine(line.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
                  title="Remove line"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 relative">
      {chartContent}
    </div>
  );
}
