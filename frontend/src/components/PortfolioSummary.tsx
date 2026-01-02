'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  todayChange: number;
  todayChangePercent: number;
  holdings: number;
}

export default function PortfolioSummary() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
    
    // Listen for portfolio changes
    const handlePortfolioChange = () => {
      fetchPortfolio();
    };
    
    window.addEventListener('portfolio-changed', handlePortfolioChange);
    return () => {
      window.removeEventListener('portfolio-changed', handlePortfolioChange);
    };
  }, []);

  const fetchPortfolio = async () => {
    // Check if user is banned/restricted before fetching
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.is_banned || parsedUser.is_restricted) {
          setLoading(false);
          return; // Don't fetch data for banned/restricted users
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/portfolio/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        // User is banned/restricted, don't process response
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>💼</span> Portfolio
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No portfolio data. <Link href="/portfolio" className="text-blue-600 dark:text-blue-400 hover:underline">Start tracking your investments</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>💼</span> Portfolio Overview
        </h2>
        <Link
          href="/portfolio"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Full Portfolio →
        </Link>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-lg font-semibold ${
            portfolio.todayChange >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {portfolio.todayChange >= 0 ? '+' : ''}${portfolio.todayChange.toFixed(2)} 
            ({portfolio.todayChangePercent >= 0 ? '+' : ''}{portfolio.todayChangePercent.toFixed(2)}%) Today
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Gain/Loss</div>
            <div className={`text-lg font-semibold ${
              portfolio.totalGain >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {portfolio.totalGain >= 0 ? '+' : ''}${portfolio.totalGain.toFixed(2)} 
              ({portfolio.totalGainPercent >= 0 ? '+' : ''}{portfolio.totalGainPercent.toFixed(2)}%)
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Holdings</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {portfolio.holdings} {portfolio.holdings === 1 ? 'asset' : 'assets'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

