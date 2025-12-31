'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AssetIcon from './AssetIcon';

interface TrendingAsset {
  symbol: string;
  name: string;
  category: string;
  type?: string;
  exchange?: string;
  currency?: string;
  logoUrl?: string | null;
  searchCount: number;
  lastSearchedAt: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

interface TrendingAssetsProps {
  limit?: number;
  timeRange?: '24h' | '7d' | '30d' | 'all';
  showHeader?: boolean;
}

export default function TrendingAssets({ 
  limit = 10, 
  timeRange = '7d',
  showHeader = true 
}: TrendingAssetsProps) {
  const router = useRouter();
  const [trendingAssets, setTrendingAssets] = useState<TrendingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    fetchTrendingAssets();
  }, [limit, selectedTimeRange]);

  const fetchTrendingAssets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/trending?limit=${limit}&timeRange=${selectedTimeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrendingAssets(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch trending assets:', response.status, errorData);
        setTrendingAssets([]);
      }
    } catch (error) {
      console.error('Error fetching trending assets:', error);
      setTrendingAssets([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              🔥 Trending Assets
            </h2>
          </div>
        )}
        <div className="animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trendingAssets.length === 0) {
    return null; // Don't show section if no trending assets
  }

  return (
    <div className="mb-6 bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            🔥 Trending Assets
          </h2>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '24h' | '7d' | '30d' | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {trendingAssets.map((asset) => (
          <Link
            key={asset.symbol}
            href={`/asset/${asset.symbol}`}
            className="group bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AssetIcon 
                  symbol={asset.symbol} 
                  name={asset.name}
                  logoUrl={asset.logoUrl}
                  category={asset.category}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {asset.symbol}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {asset.name}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                ${asset.currentPrice.toFixed(2)}
              </div>
              <div className={`text-sm font-medium ${
                asset.change >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)} ({asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%)
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {asset.searchCount} searches
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {asset.category}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

