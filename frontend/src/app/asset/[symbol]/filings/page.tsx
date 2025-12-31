'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Filing {
  id?: number;
  filingType: string;
  filingDate: string;
  reportDate: string | null;
  accessionNumber: string;
  documentUrl: string | null;
  description: string | null;
  formType: string | null;
  periodEnd: string | null;
}

interface FilingStats {
  filingType: string;
  count: number;
  lastFiling: string;
}

export default function FilingsPage() {
  const router = useRouter();
  const params = useParams();
  const symbol = params.symbol as string;
  
  const [filings, setFilings] = useState<Filing[]>([]);
  const [stats, setStats] = useState<FilingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (symbol) {
      fetchFilings();
    }
  }, [symbol]);

  const fetchFilings = async () => {
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

      const encodedSymbol = encodeURIComponent(symbol);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortOrder', sortOrder);
      
      const url = `http://localhost:3001/api/assets/${encodedSymbol}/filings?${params.toString()}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in.');
        }
        throw new Error(`Failed to fetch filings data: ${response.status}`);
      }
      
      const data = await response.json();
      setFilings(data.filings || []);
      setStats(data.statistics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchFilings();
    }
  }, [filterType, searchQuery, sortOrder, symbol]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFilingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '13F': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      '10-K': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      '10-Q': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      '8-K': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      'DEF 14A': 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  };

  const uniqueFilingTypes = Array.from(new Set(filings.map(f => f.filingType))).sort();

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

  return (
    <ProtectedRoute>
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
            SEC Filings - {symbol}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Historical SEC filings and regulatory documents
          </p>
        </div>

        {/* Statistics Cards */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.filingType} className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.filingType}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Last: {formatDate(stat.lastFiling)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search:
            </label>
            <input
              type="text"
              placeholder="Search by filing type or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter by Type */}
          {uniqueFilingTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Filing Type:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {uniqueFilingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort by Date:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Filings Table */}
        <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Filing History
          </h2>
          {filings.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No filings available for {symbol}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Filing Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Report Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Period End
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filings.map((filing, index) => (
                    <tr 
                      key={filing.id || index} 
                      className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getFilingTypeColor(filing.filingType)}`}>
                          {filing.filingType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(filing.filingDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(filing.reportDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(filing.periodEnd)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {filing.description || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {filing.documentUrl ? (
                          <a
                            href={filing.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-sm">N/A</span>
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
    </ProtectedRoute>
  );
}

