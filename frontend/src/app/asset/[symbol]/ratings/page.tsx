'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface IndividualRating {
  id?: number;
  analystName: string;
  firmName: string;
  rating: string;
  priceTarget: number | null;
  ratingDate: string;
  previousRating: string | null;
  previousPriceTarget: number | null;
  action: string | null;
}

interface Consensus {
  totalAnalysts: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  averagePriceTarget: number | null;
  consensusRating: string;
}

export default function RatingsPage() {
  const router = useRouter();
  const params = useParams();
  const symbol = params.symbol as string;
  
  const [individualRatings, setIndividualRatings] = useState<IndividualRating[]>([]);
  const [consensus, setConsensus] = useState<Consensus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (symbol) {
      fetchRatings();
    }
  }, [symbol]);

  const fetchRatings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `http://localhost:3001/api/assets/${symbol}/ratings`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch ratings data');
      }
      
      const data = await response.json();
      setIndividualRatings(data.individualRatings || []);
      setConsensus(data.consensus || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRatingColor = (rating: string) => {
    const colors: Record<string, string> = {
      'Strong Buy': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'Buy': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'Hold': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'Sell': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      'Strong Sell': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };
    return colors[rating] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  };

  const getActionColor = (action: string | null) => {
    if (!action) return '';
    const colors: Record<string, string> = {
      'Upgrade': 'text-green-600 dark:text-green-400',
      'Downgrade': 'text-red-600 dark:text-red-400',
      'Maintain': 'text-gray-600 dark:text-gray-400',
    };
    return colors[action] || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded"></div>
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

  const totalRatings = consensus 
    ? consensus.strongBuy + consensus.buy + consensus.hold + consensus.sell + consensus.strongSell
    : 0;

  return (
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
            Analyst Ratings - {symbol}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Professional analyst recommendations and price targets
          </p>
        </div>

        {/* Consensus Section */}
        {consensus && (
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Consensus Rating
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Consensus</p>
                <span className={`inline-block px-3 py-1 rounded text-lg font-bold ${getRatingColor(consensus.consensusRating)}`}>
                  {consensus.consensusRating}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Analysts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {consensus.totalAnalysts}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Price Target</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(consensus.averagePriceTarget)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Buy/Hold Ratio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalRatings > 0 
                    ? (((consensus.strongBuy + consensus.buy) / totalRatings) * 100).toFixed(0) + '%'
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Rating Distribution
              </p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Strong Buy</span>
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded-full h-4 mr-2">
                    <div 
                      className="bg-green-600 h-4 rounded-full"
                      style={{ width: `${totalRatings > 0 ? (consensus.strongBuy / totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {consensus.strongBuy}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Buy</span>
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded-full h-4 mr-2">
                    <div 
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${totalRatings > 0 ? (consensus.buy / totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {consensus.buy}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Hold</span>
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded-full h-4 mr-2">
                    <div 
                      className="bg-yellow-600 h-4 rounded-full"
                      style={{ width: `${totalRatings > 0 ? (consensus.hold / totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {consensus.hold}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Sell</span>
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded-full h-4 mr-2">
                    <div 
                      className="bg-orange-600 h-4 rounded-full"
                      style={{ width: `${totalRatings > 0 ? (consensus.sell / totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {consensus.sell}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-sm text-gray-600 dark:text-gray-400">Strong Sell</span>
                  <div className="flex-1 bg-gray-200 dark:bg-zinc-800 rounded-full h-4 mr-2">
                    <div 
                      className="bg-red-600 h-4 rounded-full"
                      style={{ width: `${totalRatings > 0 ? (consensus.strongSell / totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    {consensus.strongSell}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Ratings Table */}
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Individual Analyst Ratings
          </h2>
          {individualRatings.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No analyst ratings available for {symbol}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Analyst
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Firm
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Rating
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Price Target
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {individualRatings.map((rating, index) => (
                    <tr 
                      key={rating.id || index} 
                      className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {rating.analystName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {rating.firmName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getRatingColor(rating.rating)}`}>
                          {rating.rating}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(rating.priceTarget)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(rating.ratingDate)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {rating.action && (
                          <span className={getActionColor(rating.action)}>
                            {rating.action}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

