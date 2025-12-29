'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  author: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  publishedDate: string;
  publishedTime: string;
}

interface NewsSectionProps {
  title: string;
  icon: string;
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
}

function NewsSection({ title, icon, articles, loading, error }: NewsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 10;
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = articles.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>

      {currentArticles.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No news articles available at this time.
        </p>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {currentArticles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-zinc-700"
              >
                <div className="flex gap-4">
                  {article.urlToImage && (
                    <img
                      src={article.urlToImage}
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{article.publishedDate}</span>
                      {article.author && (
                        <>
                          <span>•</span>
                          <span>{article.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function NewsPage() {
  const [marketNews, setMarketNews] = useState<NewsArticle[]>([]);
  const [cryptoNews, setCryptoNews] = useState<NewsArticle[]>([]);
  const [worldNews, setWorldNews] = useState<NewsArticle[]>([]);
  const [usNews, setUsNews] = useState<NewsArticle[]>([]);
  
  const [marketLoading, setMarketLoading] = useState(true);
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [worldLoading, setWorldLoading] = useState(true);
  const [usLoading, setUsLoading] = useState(true);
  
  const [marketError, setMarketError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [usError, setUsError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch market news
    fetch('http://localhost:3001/api/news/market')
      .then(res => res.json())
      .then(data => {
        setMarketNews(data.articles || []);
        setMarketLoading(false);
      })
      .catch(err => {
        console.error('Error fetching market news:', err);
        setMarketError('Failed to load market news');
        setMarketLoading(false);
      });

    // Fetch crypto news
    fetch('http://localhost:3001/api/news/crypto')
      .then(res => res.json())
      .then(data => {
        setCryptoNews(data.articles || []);
        setCryptoLoading(false);
      })
      .catch(err => {
        console.error('Error fetching crypto news:', err);
        setCryptoError('Failed to load crypto news');
        setCryptoLoading(false);
      });

    // Fetch world news
    fetch('http://localhost:3001/api/news/world')
      .then(res => res.json())
      .then(data => {
        setWorldNews(data.articles || []);
        setWorldLoading(false);
      })
      .catch(err => {
        console.error('Error fetching world news:', err);
        setWorldError('Failed to load world news');
        setWorldLoading(false);
      });

    // Fetch US news
    fetch('http://localhost:3001/api/news/us')
      .then(res => res.json())
      .then(data => {
        setUsNews(data.articles || []);
        setUsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching US news:', err);
        setUsError('Failed to load US news');
        setUsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📰 News
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Stay informed with the latest market, crypto, and world news
          </p>
        </div>

        {/* Market News Section */}
        <NewsSection
          title="Top Market News"
          icon="📈"
          articles={marketNews}
          loading={marketLoading}
          error={marketError}
        />

        {/* Crypto News Section */}
        <NewsSection
          title="Crypto News"
          icon="₿"
          articles={cryptoNews}
          loading={cryptoLoading}
          error={cryptoError}
        />

        {/* World News Section */}
        <NewsSection
          title="Top World News"
          icon="🌍"
          articles={worldNews}
          loading={worldLoading}
          error={worldError}
        />

        {/* US News Section */}
        <NewsSection
          title="Top US News"
          icon="🇺🇸"
          articles={usNews}
          loading={usLoading}
          error={usError}
        />
      </div>
    </div>
  );
}

