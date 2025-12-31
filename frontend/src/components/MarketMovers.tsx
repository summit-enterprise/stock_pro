'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MoversData {
  stockGainers: Mover[];
  stockLosers: Mover[];
  cryptoGainers: Mover[];
  cryptoLosers: Mover[];
}

export default function MarketMovers() {
  const router = useRouter();
  const [data, setData] = useState<MoversData>({
    stockGainers: [],
    stockLosers: [],
    cryptoGainers: [],
    cryptoLosers: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentPages, setCurrentPages] = useState({
    stockGainers: 1,
    stockLosers: 1,
    cryptoGainers: 1,
    cryptoLosers: 1,
  });

  const itemsPerPage = 5;
  const maxPages = 5;

  useEffect(() => {
    fetchMarketMovers();
  }, []);

  const fetchMarketMovers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/market/movers', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        // Handle both old format (gainers/losers) and new format (stockGainers, etc.)
        if (responseData.stockGainers) {
          setData({
            stockGainers: responseData.stockGainers || [],
            stockLosers: responseData.stockLosers || [],
            cryptoGainers: responseData.cryptoGainers || [],
            cryptoLosers: responseData.cryptoLosers || [],
          });
        } else {
          // Fallback to old format
          const gainers = responseData.gainers || [];
          const losers = responseData.losers || [];
          setData({
            stockGainers: gainers.filter((g: Mover) => !g.symbol.startsWith('X:')),
            stockLosers: losers.filter((l: Mover) => !l.symbol.startsWith('X:')),
            cryptoGainers: gainers.filter((g: Mover) => g.symbol.startsWith('X:')),
            cryptoLosers: losers.filter((l: Mover) => l.symbol.startsWith('X:')),
          });
        }
      } else {
        console.error('Error fetching market movers:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching market movers:', error);
    } finally {
      setLoading(false);
    }
  };

  const MoverCard = ({ mover, isGainer }: { mover: Mover; isGainer: boolean }) => (
    <div
      onClick={() => router.push(`/asset/${mover.symbol}`)}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-zinc-700"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-white truncate">
          {mover.symbol}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {mover.name}
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="font-semibold text-gray-900 dark:text-white">
          ${mover.price.toFixed(2)}
        </div>
        <div
          className={`text-sm font-medium ${
            isGainer
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isGainer ? '+' : ''}
          {mover.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );

  const MoversCard = ({
    title,
    icon,
    movers,
    isGainer,
    category,
  }: {
    title: string;
    icon: string;
    movers: Mover[];
    isGainer: boolean;
    category: 'stockGainers' | 'stockLosers' | 'cryptoGainers' | 'cryptoLosers';
  }) => {
    const currentPage = currentPages[category];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMovers = movers.slice(startIndex, endIndex);
    const totalPages = Math.min(maxPages, Math.ceil(movers.length / itemsPerPage));

    const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPages((prev) => ({ ...prev, [category]: newPage }));
      }
    };

    return (
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {icon} {title}
        </h2>
        <div className="space-y-2 mb-4">
          {currentMovers.length > 0 ? (
            currentMovers.map((mover) => (
              <MoverCard key={mover.symbol} mover={mover} isGainer={isGainer} />
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No data available
            </p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-700">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <MoversCard
        title="Top Stock Gainers"
        icon="📈"
        movers={data.stockGainers}
        isGainer={true}
        category="stockGainers"
      />
      <MoversCard
        title="Top Stock Losers"
        icon="📉"
        movers={data.stockLosers}
        isGainer={false}
        category="stockLosers"
      />
      <MoversCard
        title="Top Crypto Gainers"
        icon="₿📈"
        movers={data.cryptoGainers}
        isGainer={true}
        category="cryptoGainers"
      />
      <MoversCard
        title="Top Crypto Losers"
        icon="₿📉"
        movers={data.cryptoLosers}
        isGainer={false}
        category="cryptoLosers"
      />
    </div>
  );
}
