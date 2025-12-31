'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DividendChart from '@/components/DividendChart';

interface Dividend {
  exDate: string;
  paymentDate: string | null;
  recordDate: string | null;
  declaredDate: string | null;
  amount: number;
  currency: string;
  frequency: string | null;
}

interface DividendStats {
  totalDividends: number;
  totalPaid: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  firstDividend: string;
  lastDividend: string;
  frequency: string | null;
}

export default function DividendsPage() {
  const router = useRouter();
  const params = useParams();
  const symbol = params.symbol as string;
  
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stats, setStats] = useState<DividendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check dark mode
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (symbol) {
      fetchDividends();
    }
  }, [symbol]);

  const fetchDividends = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const encodedSymbol = encodeURIComponent(symbol);
      const response = await fetch(
        `http://localhost:3001/api/assets/${encodedSymbol}/dividends`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch dividend data: ${response.status}`);
      }
      
      const data = await response.json();
      setDividends(data.dividends || []);
      setStats(data.statistics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dividend data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href={`/asset/${symbol}`} className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
            ← Back to Asset
          </Link>
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href={`/asset/${symbol}`}
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Back to Asset
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Dividend History - {symbol}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Historical dividend payments and statistics
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Dividends</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDividends}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalPaid, 'USD')}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.avgAmount, 'USD')}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Frequency</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {stats.frequency || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Dividend Chart with integrated table */}
        <div className="mb-8">
          <DividendChart dividends={dividends} symbol={symbol} isDarkMode={isDarkMode} />
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

