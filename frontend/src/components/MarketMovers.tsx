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

export default function MarketMovers() {
  const router = useRouter();
  const [gainers, setGainers] = useState<Mover[]>([]);
  const [losers, setLosers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketMovers();
  }, []);

  const fetchMarketMovers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/market/movers');
      if (response.ok) {
        const data = await response.json();
        setGainers(data.gainers || []);
        setLosers(data.losers || []);
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
      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-zinc-700"
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
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
      {/* Top Gainers */}
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📈 Top Gainers
        </h2>
        <div className="space-y-2">
          {gainers.length > 0 ? (
            gainers.slice(0, 10).map((gainer) => (
              <MoverCard key={gainer.symbol} mover={gainer} isGainer={true} />
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* Top Losers */}
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📉 Top Losers
        </h2>
        <div className="space-y-2">
          {losers.length > 0 ? (
            losers.slice(0, 10).map((loser) => (
              <MoverCard key={loser.symbol} mover={loser} isGainer={false} />
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

