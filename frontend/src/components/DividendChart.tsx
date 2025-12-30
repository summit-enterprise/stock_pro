'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, Time } from 'lightweight-charts';

interface Dividend {
  exDate: string;
  paymentDate: string | null;
  recordDate: string | null;
  declaredDate: string | null;
  amount: number;
  currency: string;
  frequency: string | null;
}

interface DividendChartProps {
  dividends: Dividend[];
  symbol: string;
  isDarkMode?: boolean;
}

export default function DividendChart({ dividends, symbol, isDarkMode = false }: DividendChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || dividends.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDarkMode ? '#000000' : '#ffffff' },
        textColor: isDarkMode ? '#ffffff' : '#191919',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: isDarkMode ? '#333333' : '#e0e0e0' },
        horzLines: { color: isDarkMode ? '#333333' : '#e0e0e0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDarkMode ? '#333333' : '#e0e0e0',
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#333333' : '#e0e0e0',
      },
    });

    chartRef.current = chart;

    // Prepare data - cumulative dividends over time
    const sortedDividends = [...dividends].sort((a, b) => 
      new Date(a.exDate).getTime() - new Date(b.exDate).getTime()
    );

    let cumulativeAmount = 0;
    const chartData = sortedDividends.map(div => {
      cumulativeAmount += div.amount;
      return {
        time: new Date(div.exDate).getTime() / 1000 as Time,
        value: cumulativeAmount,
      };
    });

    // Add line series
    const lineSeries = chart.addLineSeries({
      color: '#3B82F6',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      title: 'Cumulative Dividends',
    });

    lineSeries.setData(chartData);
    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [dividends, isDarkMode]);

  if (dividends.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          No dividend data available for {symbol}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Cumulative Dividend History
      </h3>
      <div ref={chartContainerRef} className="w-full" style={{ height: '400px' }} />
    </div>
  );
}

