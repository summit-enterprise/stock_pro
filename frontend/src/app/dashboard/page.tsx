'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import SearchBar from '@/components/SearchBar';
import MarketTiles from '@/components/MarketTiles';
import UnifiedPriceChart from '@/components/UnifiedPriceChart';
import WatchlistSection from '@/components/WatchlistSection';
import MarketMovers from '@/components/MarketMovers';
import PortfolioSummary from '@/components/PortfolioSummary';
import MarketNews from '@/components/MarketNews';
import TrendingAssets from '@/components/TrendingAssets';
import GainersLosersCards from '@/components/GainersLosersCards';

interface User {
  id: number;
  email: string;
  name: string | null;
  auth_type: string;
}

interface SelectedMarketTile {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'index' | 'crypto' | 'commodity';
  category?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTile, setSelectedTile] = useState<SelectedMarketTile | null>(null);
  const [marketTiles, setMarketTiles] = useState<SelectedMarketTile[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and verify status with backend
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // Not logged in, redirect to home
      router.replace('/');
      return;
    }

    const checkUserStatus = async () => {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Verify user status with backend to get latest status
        try {
          const response = await fetch('http://localhost:3001/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(data.user));
              
              // Check if user is banned or restricted - redirect immediately before rendering
              if (data.user.is_banned || data.user.is_restricted) {
                // Redirect to restricted page immediately
                router.replace('/restricted');
                return;
              }
              
              setUser(data.user);
              setLoading(false);
              return;
            }
          } else if (response.status === 403) {
            // User is banned/restricted
            router.replace('/restricted');
            return;
          }
        } catch (fetchError) {
          console.error('Error fetching user profile:', fetchError);
          // Fall through to use cached data
        }
        
        // Fallback to cached data if API call fails
        // Check if user is banned or restricted - redirect immediately before rendering
        if (parsedUser.is_banned || parsedUser.is_restricted) {
          // Redirect to restricted page immediately
          router.replace('/restricted');
          return;
        }
        
        setUser(parsedUser);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.replace('/');
      }
    };

    checkUserStatus();
  }, [router]);

  // Fetch market tiles and set default selection (S&P 500)
  useEffect(() => {
    // Don't fetch if user is banned/restricted
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
      if (parsedUser.is_banned || parsedUser.is_restricted) {
          return; // Don't fetch data for banned/restricted users
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }

    const fetchMarketData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('http://localhost:3001/api/market/overview', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        
        if (response.status === 403) {
          // User is banned/restricted, redirect
          router.push('/restricted');
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          const tiles = data.tiles || [];
          setMarketTiles(tiles);
          
          // Set S&P 500 as default selection if not already selected
          if (!selectedTile && tiles.length > 0) {
            const sp500 = tiles.find((t: SelectedMarketTile) => t.symbol === '^GSPC' || t.name.includes('S&P 500'));
            if (sp500) {
              setSelectedTile(sp500);
            } else {
              // Fallback to first tile
              setSelectedTile(tiles[0]);
            }
          }
        } else {
          console.error('Error fetching market data:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    fetchMarketData();
  }, [router, selectedTile]);

  const handleTileSelect = (tile: SelectedMarketTile) => {
    setSelectedTile(tile);
  };

  // Show loading state while checking user status
  // Don't render anything until we confirm user is not banned/restricted
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back{user.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track markets, analyze trends, and make informed decisions.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <SearchBar />
          </div>

          {/* Market Chart and Tiles */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Market Overview
            </h2>
            
            {/* Market Chart - shown above tiles */}
            {selectedTile && (
              <div className="mb-6">
                <UnifiedPriceChart
                  symbol={selectedTile.symbol}
                  name={selectedTile.name}
                  currentPrice={selectedTile.price}
                  change={selectedTile.change}
                  changePercent={selectedTile.changePercent}
                  isDarkMode={typeof window !== 'undefined' && document.documentElement.classList.contains('dark')}
                  showTimeRangeSelector={true}
                  showPriceInfo={true}
                  height={400}
                />
              </div>
            )}

            {/* Market Tiles */}
            <MarketTiles
              selectedSymbol={selectedTile?.symbol}
              onTileSelect={handleTileSelect}
            />
          </div>

          {/* Watchlist and Portfolio Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <WatchlistSection />
            <PortfolioSummary />
          </div>

          {/* Gainers & Losers Cards */}
          <div className="mb-6">
            <GainersLosersCards />
          </div>

          {/* Market Movers */}
          <div className="mb-6">
            <MarketMovers />
          </div>

          {/* Trending Assets */}
          <div className="mb-6">
            <TrendingAssets limit={10} timeRange="7d" />
          </div>

          {/* Market News */}
          <div className="mb-6">
            <MarketNews />
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

