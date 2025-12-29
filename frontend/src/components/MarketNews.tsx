'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  description?: string;
  source: string;
  author?: string;
  url: string;
  urlToImage?: string | null;
  publishedAt: string;
  publishedDate?: string;
  publishedTime?: string;
}

export default function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 5;
  const totalArticles = 15;

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/news/market');
      if (response.ok) {
        const data = await response.json();
        setNews(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(Math.min(news.length, totalArticles) / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = news.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of news section
    const newsSection = document.getElementById('market-news-section');
    if (newsSection) {
      newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleArticleClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6" id="market-news-section">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6" id="market-news-section">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>📰</span> Market News
      </h2>
      
      <div className="space-y-3 mb-4">
        {currentArticles.length > 0 ? (
          currentArticles.map((item) => (
            <div
              key={item.id}
              onClick={() => handleArticleClick(item.url)}
              className="p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-lg transition-all cursor-pointer border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                <span className="font-medium">{item.source}</span>
                <span>{item.publishedDate || new Date(item.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No news available at the moment
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
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
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

