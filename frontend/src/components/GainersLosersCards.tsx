'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MoverAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: 'stocks' | 'crypto';
}

export default function GainersLosersCards() {
  const router = useRouter();
  const [allGainers, setAllGainers] = useState<MoverAsset[]>([]);
  const [allLosers, setAllLosers] = useState<MoverAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const assetsPerPage = 5;
  const totalPages = 3; // 15 total assets / 5 per page

  useEffect(() => {
    fetch1DMovers();
  }, []);

  const fetch1DMovers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/market/movers-1d', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Combine stocks and crypto, get top 15
        const allGainersCombined = [
          ...(data.stockGainers || []).map((g: any) => ({ ...g, category: 'stocks' as const })),
          ...(data.cryptoGainers || []).map((g: any) => ({ ...g, category: 'crypto' as const }))
        ]
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 15);
        
        const allLosersCombined = [
          ...(data.stockLosers || []).map((l: any) => ({ ...l, category: 'stocks' as const })),
          ...(data.cryptoLosers || []).map((l: any) => ({ ...l, category: 'crypto' as const }))
        ]
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 15);

        setAllGainers(allGainersCombined);
        setAllLosers(allLosersCombined);
      }
    } catch (error) {
      console.error('Error fetching 1D movers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toFixed(0)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
  };

  const formatChangePercent = (percent: number) => {
    return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
  };

  // Get paginated assets
  const getPaginatedGainers = () => {
    const start = (currentPage - 1) * assetsPerPage;
    const end = start + assetsPerPage;
    return allGainers.slice(start, end);
  };

  const getPaginatedLosers = () => {
    const start = (currentPage - 1) * assetsPerPage;
    const end = start + assetsPerPage;
    return allLosers.slice(start, end);
  };

  const AssetRow = ({ asset, isGainer }: { asset: MoverAsset; isGainer: boolean }) => (
    <div
      onClick={() => router.push(`/asset/${asset.symbol}`)}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors border border-gray-200 dark:border-zinc-700"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900 dark:text-white truncate">
            {asset.symbol}
          </div>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            asset.category === 'crypto' 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
          }`}>
            {asset.category === 'crypto' ? 'C' : 'S'}
          </span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {asset.name}
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="text-sm font-bold text-gray-900 dark:text-white">
          {formatPrice(asset.price)}
        </div>
        <div className={`text-xs font-medium ${isGainer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatChange(asset.change)} ({formatChangePercent(asset.changePercent)})
        </div>
      </div>
    </div>
  );

  const PaginationControls = () => {
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    return (
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={!hasPrev}
          className={`px-4 py-2 text-sm rounded ${
            hasPrev
              ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          Previous
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={!hasNext}
          className={`px-4 py-2 text-sm rounded ${
            hasNext
              ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>🚀</span>
        Top Gainers & Losers (1D)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gainers Column */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400">📈</span>
            Top Gainers
          </h3>
          <div className="space-y-2">
            {getPaginatedGainers().length > 0 ? (
              getPaginatedGainers().map((asset) => (
                <AssetRow key={asset.symbol} asset={asset} isGainer={true} />
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No gainers data available
              </p>
            )}
          </div>
        </div>

        {/* Losers Column */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400">📉</span>
            Top Losers
          </h3>
          <div className="space-y-2">
            {getPaginatedLosers().length > 0 ? (
              getPaginatedLosers().map((asset) => (
                <AssetRow key={asset.symbol} asset={asset} isGainer={false} />
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No losers data available
              </p>
            )}
          </div>
        </div>
      </div>

      <PaginationControls />
    </div>
  );
}
