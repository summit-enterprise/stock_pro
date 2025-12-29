'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MarketTile {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'index' | 'crypto' | 'commodity';
}

export default function MarketTiles() {
  const router = useRouter();
  const [tiles, setTiles] = useState<MarketTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/market/overview');
      if (response.ok) {
        const data = await response.json();
        setTiles(data.tiles || []);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, type: string) => {
    if (type === 'crypto') {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (type === 'commodity') {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const getAssetIcon = (symbol: string, type: string) => {
    if (symbol === 'BTC' || symbol.includes('BITCOIN')) return '₿';
    if (symbol === 'ETH' || symbol.includes('ETHEREUM')) return 'Ξ';
    if (symbol.includes('GOLD')) return '🥇';
    if (symbol.includes('SILVER')) return '🥈';
    return '📈';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="bg-gray-800 dark:bg-zinc-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.symbol}
          onClick={() => router.push(`/asset/${tile.symbol}`)}
          className="bg-gray-800 dark:bg-zinc-800 rounded-xl p-6 hover:bg-gray-700 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-gray-700 dark:border-zinc-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getAssetIcon(tile.symbol, tile.type)}</span>
              <div>
                <h3 className="text-white font-semibold text-sm">{tile.name}</h3>
                <p className="text-gray-400 text-xs">{tile.symbol}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              {formatPrice(tile.price, tile.type)}
            </p>
            <div className={`flex items-center gap-2 ${tile.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <span className="font-medium">
                {tile.change >= 0 ? '+' : ''}{tile.change.toFixed(2)}
              </span>
              <span className="text-sm">
                ({tile.changePercent >= 0 ? '+' : ''}{tile.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

