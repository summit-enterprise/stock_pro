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
  category?: string;
}

interface MarketTilesProps {
  selectedSymbol?: string;
  onTileSelect?: (tile: MarketTile) => void;
}

export default function MarketTiles({ selectedSymbol, onTileSelect }: MarketTilesProps) {
  const router = useRouter();
  const [tiles, setTiles] = useState<MarketTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch immediately on mount
    fetchMarketData();
    // Refresh every 5 minutes (cache is 5 minutes on backend)
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
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
      const response = await fetch('http://localhost:3001/api/market/overview', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.status === 403) {
        // User is banned/restricted, don't process response
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setTiles(data.tiles || []);
      } else {
        console.error('Error fetching market data:', response.status, response.statusText);
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

  const handleTileClick = (tile: MarketTile, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call onTileSelect if provided (for chart selection)
    if (onTileSelect) {
      onTileSelect(tile);
    } else {
      // Default behavior: navigate to asset page
      router.push(`/asset/${tile.symbol}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tiles.map((tile) => {
        const isSelected = selectedSymbol === tile.symbol;
        return (
          <div
            key={tile.symbol}
            onClick={(e) => handleTileClick(tile, e)}
            className={`rounded-xl p-6 transition-all cursor-pointer border ${
              isSelected
                ? 'bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600 shadow-lg scale-105'
                : 'bg-gray-800 dark:bg-zinc-800 border-gray-700 dark:border-zinc-700 hover:bg-gray-700 dark:hover:bg-zinc-700'
            }`}
          >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getAssetIcon(tile.symbol, tile.type)}</span>
              <div>
                <h3 
                  className="text-white font-semibold text-sm hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/asset/${tile.symbol}`);
                  }}
                >
                  {tile.name}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-gray-400 text-xs">{tile.symbol}</p>
                  {tile.category && (
                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-600/20 text-blue-300">
                      {tile.category}
                    </span>
                  )}
                </div>
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
        );
      })}
    </div>
  );
}

