'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PriceChart from '@/components/PriceChart';
import AssetNews from '@/components/AssetNews';
import AssetIcon from '@/components/AssetIcon';

interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AssetData {
  symbol: string;
  name: string;
  type: string;
  category?: string;
  exchange: string;
  currency: string;
  logoUrl?: string | null;
  currentPrice: number | null;
  priceChange: number;
  priceChangePercent: number;
  historicalData: HistoricalDataPoint[];
  metadata: {
    marketCap?: number;
    peRatio?: number;
    dividendYield?: number;
  };
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const symbol = params.symbol as string;
  
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [allHistoricalData, setAllHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('1M');
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [inPortfolio, setInPortfolio] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<{ sharesOwned: number; avgSharePrice: number } | null>(null);
  const [ratings, setRatings] = useState<{
    shortTerm?: { signal: string; strength: number };
    longTerm?: { signal: string; strength: number };
  } | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Fetch all 5 years of data on initial load
  useEffect(() => {
    if (symbol) {
      fetchAllAssetData();
      checkWatchlistStatus();
      checkPortfolioStatus();
    }
  }, [symbol]);

  // Fetch ratings after asset data is loaded (to check category)
  useEffect(() => {
    if (assetData) {
      fetchRatings();
    }
  }, [assetData]);

  const fetchRatings = async () => {
    // Only fetch ratings for equities
    if (!assetData || assetData.category?.toLowerCase() !== 'equities') {
      setRatingsLoading(false);
      return;
    }

    setRatingsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/ratings/${symbol}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Only set ratings if they exist (not null)
        if (data.shortTerm || data.longTerm) {
          setRatings({
            shortTerm: data.shortTerm,
            longTerm: data.longTerm,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setRatingsLoading(false);
    }
  };

  const checkWatchlistStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/watchlist/check/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInWatchlist(data.inWatchlist);
      }
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const checkPortfolioStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/portfolio/check/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInPortfolio(data.inPortfolio);
        if (data.inPortfolio) {
          setPortfolioData({
            sharesOwned: data.sharesOwned || 0,
            avgSharePrice: data.avgSharePrice || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error checking portfolio status:', error);
    }
  };

  const handleWatchlistToggle = async () => {
    setWatchlistLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to add assets to your watchlist');
        setWatchlistLoading(false);
        return;
      }

      if (inWatchlist) {
        // Remove from watchlist
        const response = await fetch(`http://localhost:3001/api/watchlist/${symbol}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Update state immediately
          setInWatchlist(false);
          setModalMessage(`${symbol} removed from watchlist`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 2000);
          // Dispatch event to update other components
          window.dispatchEvent(new Event('watchlist-changed'));
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(errorData.message || 'Failed to remove from watchlist');
        }
      } else {
        // Add to watchlist
        const response = await fetch('http://localhost:3001/api/watchlist', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol }),
        });

        if (response.ok) {
          // Update state immediately
          setInWatchlist(true);
          setModalMessage(`${symbol} added to watchlist`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 2000);
          // Dispatch event to update other components
          window.dispatchEvent(new Event('watchlist-changed'));
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(errorData.message || 'Failed to add to watchlist');
        }
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handlePortfolioClick = async () => {
    setPortfolioLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setModalMessage('Please log in to add assets to your portfolio');
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
        setPortfolioLoading(false);
        return;
      }

      if (inPortfolio) {
        // Remove from portfolio
        const response = await fetch(`http://localhost:3001/api/portfolio/${symbol}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Update state immediately
          setInPortfolio(false);
          setPortfolioData(null);
          setModalMessage(`${symbol} removed from portfolio`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 2000);
          // Dispatch event to update other components
          window.dispatchEvent(new Event('portfolio-changed'));
        } else {
          const errorData = await response.json().catch(() => ({}));
          setModalMessage(errorData.message || errorData.error || 'Failed to remove from portfolio');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 3000);
        }
      } else {
        // Add to portfolio with default values (0 shares, 0 avg price)
        const response = await fetch('http://localhost:3001/api/portfolio', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol,
            sharesOwned: 0,
            avgSharePrice: 0,
          }),
        });

        if (response.ok) {
          // Update state immediately
          setInPortfolio(true);
          setPortfolioData({ sharesOwned: 0, avgSharePrice: 0 });
          setModalMessage(`${symbol} added to portfolio`);
          setShowModal(true);
          setTimeout(() => setShowModal(false), 2000);
          // Dispatch event to update other components
          window.dispatchEvent(new Event('portfolio-changed'));
        } else {
          const errorData = await response.json().catch(() => ({}));
          setModalMessage(errorData.message || errorData.error || 'Failed to add to portfolio');
          setShowModal(true);
          setTimeout(() => setShowModal(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error toggling portfolio:', error);
      setModalMessage('An error occurred. Please try again.');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchAllAssetData = async () => {
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

      // Always fetch 5Y range to get all available data
      const encodedSymbol = encodeURIComponent(symbol);
      const response = await fetch(
        `http://localhost:3001/api/assets/${encodedSymbol}?range=5Y`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch asset data: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store all historical data - always pass ALL data to chart
      setAllHistoricalData(data.historicalData);
      
      // Set asset data with ALL historical data (chart will handle zooming)
      setAssetData({
        ...data,
        historicalData: data.historicalData // Always pass all data
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: '5Y', value: '5Y' },
  ];

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getRatingColor = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return 'text-green-600 dark:text-green-400';
      case 'Buy':
        return 'text-green-500 dark:text-green-500';
      case 'Hold':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Sell':
        return 'text-red-500 dark:text-red-500';
      case 'Strong Sell':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRatingIcon = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return '🟢';
      case 'Buy':
        return '🟢';
      case 'Hold':
        return '🟡';
      case 'Sell':
        return '🔴';
      case 'Strong Sell':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const handleTabClick = (tab: string) => {
    if (tab === 'News') {
      // Scroll to news section
      setTimeout(() => {
        const newsSection = document.getElementById('asset-news-section');
        if (newsSection) {
          const offset = 100; // Offset for fixed navbar
          const elementPosition = newsSection.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
      setActiveTab('News');
    } else if (tab === 'Dividends') {
      // Navigate to dividends page
      router.push(`/asset/${symbol}/dividends`);
    } else if (tab === 'Filings') {
      // Navigate to filings page
      router.push(`/asset/${symbol}/filings`);
    } else if (tab === 'Analysts') {
      // Navigate to analyst ratings page
      router.push(`/asset/${symbol}/ratings`);
    } else {
      // For other tabs, we'll implement content switching later
      setActiveTab(tab);
    }
  };

  // Define all possible tabs
  const allNavTabs = [
    { id: 'Filings', label: 'Filings', icon: '📄' },
    { id: 'Earnings', label: 'Earnings', icon: '💰' },
    { id: 'Financials', label: 'Financials', icon: '📈' },
    { id: 'News', label: 'News', icon: '📰' },
    { id: 'Analysts', label: 'Analysts', icon: '🎯' },
    { id: 'Holdings', label: 'Holdings', icon: '💼' },
    { id: 'Dividends', label: 'Dividends', icon: '💰' },
  ];

  // Filter tabs based on asset category
  // Filings, Earnings, Financials, and Dividends are only available for: Equity, ETF, Bond, MutualFund, InternationalStock
  // Remove these tabs for: Crypto, Commodity, Index
  const normalizeCategory = (cat: string | undefined): string => {
    if (!cat) return 'Unknown';
    return cat.toLowerCase().trim();
  };
  
  const category = normalizeCategory(assetData?.category);
  const categoriesWithoutFinancialData = ['crypto', 'cryptocurrency', 'cryptocurrencies', 'commodity', 'commodities', 'index', 'indices'];
  const shouldShowFinancialData = !categoriesWithoutFinancialData.includes(category);
  
  const navTabs = shouldShowFinancialData
    ? allNavTabs
    : allNavTabs.filter(tab => 
        !['Filings', 'Earnings', 'Financials', 'Dividends'].includes(tab.id)
      );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
            <div className="h-12 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-8"></div>
            <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assetData) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4">
            {error || 'Asset not found'}
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
          href="/dashboard" 
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        {/* Asset Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <AssetIcon
                    symbol={assetData.symbol}
                    name={assetData.name}
                    type={assetData.type}
                    category={assetData.category}
                    logoUrl={assetData.logoUrl}
                    size={64}
                    className="flex-shrink-0"
                  />
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    {assetData.name}
                  </h1>
                  {/* Rating Icons */}
                  {!ratingsLoading && (ratings?.shortTerm || ratings?.longTerm) && (
                    <div className="flex items-center gap-2 ml-2">
                      {/* Short-term rating */}
                      {ratings.shortTerm && (
                        <div 
                          className="flex items-center gap-1" 
                          title={`Short-term: ${ratings.shortTerm.signal}`}
                        >
                          <span className="text-xl">{getRatingIcon(ratings.shortTerm.signal)}</span>
                          <span className={`text-xs font-medium ${getRatingColor(ratings.shortTerm.signal)}`}>
                            ST
                          </span>
                        </div>
                      )}
                      {/* Long-term rating */}
                      {ratings.longTerm && (
                        <div 
                          className="flex items-center gap-1" 
                          title={`Long-term: ${ratings.longTerm.signal}`}
                        >
                          <span className="text-xl">{getRatingIcon(ratings.longTerm.signal)}</span>
                          <span className={`text-xs font-medium ${getRatingColor(ratings.longTerm.signal)}`}>
                            LT
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Rating Labels */}
                {!ratingsLoading && (ratings?.shortTerm || ratings?.longTerm) && (
                  <div className="flex items-center gap-4 text-sm">
                    {ratings.shortTerm && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Short Term:</span>
                        <span className="text-lg">{getRatingIcon(ratings.shortTerm.signal)}</span>
                        <span className={`font-semibold ${getRatingColor(ratings.shortTerm.signal)}`}>
                          {ratings.shortTerm.signal}
                        </span>
                      </div>
                    )}
                    {ratings.longTerm && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Long Term:</span>
                        <span className="text-lg">{getRatingIcon(ratings.longTerm.signal)}</span>
                        <span className={`font-semibold ${getRatingColor(ratings.longTerm.signal)}`}>
                          {ratings.longTerm.signal}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {assetData.exchange}:{assetData.symbol}
              </p>
            </div>
            {/* Watchlist and Portfolio Icons */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {/* Watchlist Icon */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleWatchlistToggle}
                    disabled={watchlistLoading}
                    className={`p-3 rounded-full transition-all ${
                      inWatchlist
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                    } ${watchlistLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {inWatchlist ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {inWatchlist ? 'In watchlist' : 'Add to watchlist'}
                  </span>
                </div>
                {/* Portfolio Icon */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handlePortfolioClick}
                    disabled={portfolioLoading || assetData.category?.toLowerCase() === 'index'}
                    className={`p-3 rounded-full transition-all ${
                      inPortfolio
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : assetData.category?.toLowerCase() === 'index'
                        ? 'bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                    } ${portfolioLoading || assetData.category?.toLowerCase() === 'index' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={assetData.category?.toLowerCase() === 'index' ? 'Indices cannot be added to portfolio' : (inPortfolio ? 'View in portfolio' : 'Add to portfolio')}
                  >
                    {inPortfolio ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {inPortfolio ? 'In portfolio' : 'Add to portfolio'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs - Pills Style (Option C) */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-zinc-700 pb-4">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Price Section */}
        <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-8">
          <div className="flex items-baseline gap-4 mb-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {formatPrice(assetData.currentPrice)}
            </span>
            <span className={`text-xl font-semibold ${
              assetData.priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {assetData.priceChange >= 0 ? '+' : ''}{assetData.priceChange.toFixed(2)} 
              ({assetData.priceChangePercent >= 0 ? '+' : ''}{assetData.priceChangePercent.toFixed(2)}%)
            </span>
          </div>
          {assetData.metadata.marketCap && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Market Cap: ${(assetData.metadata.marketCap / 1e9).toFixed(2)}B
            </p>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-8">
          <PriceChart 
            data={assetData.historicalData} 
            symbol={assetData.symbol}
            timeRange={timeRange}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {assetData.historicalData.length > 0 && (
            <>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Open</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatPrice(assetData.historicalData[assetData.historicalData.length - 1].open)}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">High</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatPrice(assetData.historicalData[assetData.historicalData.length - 1].high)}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Low</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatPrice(assetData.historicalData[assetData.historicalData.length - 1].low)}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Volume</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {assetData.historicalData[assetData.historicalData.length - 1].volume.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Historical Data Table */}
        {assetData.historicalData.length > 0 && (
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Historical Data
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Open</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">High</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Low</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Close</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {assetData.historicalData.slice(-10).reverse().map((point, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-zinc-800">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {new Date(point.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                        {formatPrice(point.open)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">
                        {formatPrice(point.high)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">
                        {formatPrice(point.low)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                        {formatPrice(point.close)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                        {point.volume.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Asset-Specific News Section */}
        <div className="mt-12">
          <AssetNews symbol={assetData.symbol} />
        </div>
      </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-gray-50 dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-center text-gray-900 dark:text-white text-lg font-medium">
              {modalMessage}
            </p>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

