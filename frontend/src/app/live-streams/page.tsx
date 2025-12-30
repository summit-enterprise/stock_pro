'use client';

import { useState, useEffect } from 'react';

interface YouTubeChannel {
  id: string;
  name: string;
  description?: string;
  category: 'fintech' | 'news';
  thumbnail?: string;
}

interface ChannelLiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  thumbnail: string | null;
}

// Fintech and Retail Investing Channels
const FINTECH_CHANNELS: YouTubeChannel[] = [
  {
    id: 'UC8f3S50G9U7V_m-Y1TfA0Xg',
    name: 'Amit Investing',
    description: 'Amit Kukreja - Fintech and investing insights',
    category: 'fintech',
  },
  {
    id: 'UCS01CiRDAiyhR_mTHXDW23A',
    name: 'Dumb Money Live',
    description: 'Chris Camillo - Retail investing and market analysis',
    category: 'fintech',
  },
  {
    id: 'UC7SRE6_G0vV94_G93m4uD0Q',
    name: 'Chris Sain',
    description: 'Chris Sain - Stock market education and trading',
    category: 'fintech',
  },
  {
    id: 'UC_86S3_KInp_9KAtKToL_8A',
    name: 'Meet Kevin',
    description: 'Meet Kevin - Real estate, stocks, and finance',
    category: 'fintech',
  },
  {
    id: 'UCV6KDgJskWaEckne5aPA0aQ',
    name: 'Graham Stephan',
    description: 'Graham Stephan - Personal finance and investing',
    category: 'fintech',
  },
  // Will be populated with additional top fintech YouTubers (up to 25 total)
];

// Financial News Channels
const NEWS_CHANNELS: YouTubeChannel[] = [
  {
    id: 'UCvJJ_dzjViJCoLf5uKUTwoA',
    name: 'CNBC',
    description: 'CNBC - Breaking business news and financial markets',
    category: 'news',
  },
  {
    id: 'UCCXoCcu9Rp7NPbTzIvogpZg',
    name: 'Fox Business',
    description: 'Fox Business - Business news and market coverage',
    category: 'news',
  },
  {
    id: 'UCIALMKvObZNtJ6AmdCLP7Lg',
    name: 'Bloomberg Television',
    description: 'Bloomberg - Global business and financial news',
    category: 'news',
  },
  {
    id: 'UCEAZeUIeJs0IjQiqTCdVSIg',
    name: 'Yahoo Finance',
    description: 'Yahoo Finance - Stock market news and analysis',
    category: 'news',
  },
  {
    id: 'UChqUTb7kYRX8-EiaN3XFrSQ',
    name: 'Reuters',
    description: 'Reuters - International news and financial markets',
    category: 'news',
  },
  // Will be populated with additional top financial news channels (up to 25 total)
];

const CHANNELS_PER_PAGE = 12; // 4 columns x 3 rows
const MAX_CHANNELS = 25;

export default function LiveStreamsPage() {
  const [activeCategory, setActiveCategory] = useState<'fintech' | 'news'>('fintech');
  const [currentPage, setCurrentPage] = useState(1);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, ChannelLiveStatus>>({});
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  const channels = activeCategory === 'fintech' ? FINTECH_CHANNELS : NEWS_CHANNELS;
  const totalChannels = Math.min(channels.length, MAX_CHANNELS);
  const totalPages = Math.ceil(totalChannels / CHANNELS_PER_PAGE);
  
  // Reset to page 1 when category changes
  const handleCategoryChange = (category: 'fintech' | 'news') => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  // Get channels for current page
  const startIndex = (currentPage - 1) * CHANNELS_PER_PAGE;
  const endIndex = startIndex + CHANNELS_PER_PAGE;
  const paginatedChannels = channels.slice(startIndex, endIndex);

  // Fetch live statuses for all channels
  useEffect(() => {
    const fetchLiveStatuses = async () => {
      if (channels.length === 0) {
        setLoadingStatuses(false);
        return;
      }

      setLoadingStatuses(true);
      try {
        const channelIds = channels.slice(0, MAX_CHANNELS).map(ch => ch.id);
        const response = await fetch('http://localhost:3001/api/youtube/channels/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channelIds }),
        });

        if (response.ok) {
          const statuses = await response.json();
          setLiveStatuses(statuses);
        }
      } catch (error) {
        console.error('Error fetching live statuses:', error);
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchLiveStatuses();

    // Refresh live statuses every 30 seconds
    const interval = setInterval(fetchLiveStatuses, 30000);
    return () => clearInterval(interval);
  }, [channels]);

  const getEmbedUrl = (channelId: string, videoId: string | null = null) => {
    // If we have a specific video ID (live or latest), use it
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0`;
    }
    // Fallback to channel live stream URL
    return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=0&mute=0`;
  };

  const getChannelUrl = (channelId: string) => {
    // Get the YouTube channel URL
    return `https://www.youtube.com/channel/${channelId}`;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Live Streams
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Watch live fintech and financial news streams
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex space-x-4 border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => handleCategoryChange('fintech')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeCategory === 'fintech'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Fintech Live Streams ({Math.min(FINTECH_CHANNELS.length, MAX_CHANNELS)})
          </button>
          <button
            onClick={() => handleCategoryChange('news')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeCategory === 'news'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Financial News Streams ({Math.min(NEWS_CHANNELS.length, MAX_CHANNELS)})
          </button>
        </div>

        {/* Channels Grid - 4 columns x 3 rows = 12 per page */}
        {paginatedChannels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Loading channels...
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              We're currently gathering the top {activeCategory === 'fintech' ? 'fintech' : 'financial news'} channels
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {paginatedChannels.map((channel) => {
                const status = liveStatuses[channel.id] || { isLive: false, videoId: null, title: null, thumbnail: null };
                const embedUrl = getEmbedUrl(channel.id, status.videoId);
                
                return (
                  <div
                    key={channel.id}
                    className="bg-gray-50 dark:bg-zinc-900 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Video Embed with Clickable Overlay */}
                    <div className="relative w-full group" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={embedUrl}
                        title={channel.name}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      {/* Clickable Overlay - Opens YouTube in new tab */}
                      <a
                        href={getChannelUrl(channel.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
                        title={`Open ${channel.name} on YouTube`}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg px-4 py-2 flex items-center space-x-2">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M10 6V8H5V19H16V14H18V19C18 20.1 17.1 21 16 21H5C3.89 21 3 20.1 3 19V8C3 6.9 3.89 6 5 6H10ZM21 3V11H19V6.41L10.41 15L9 13.59L17.59 5H13V3H21Z" />
                          </svg>
                          <span className="text-white font-medium text-sm">Open on YouTube</span>
                        </div>
                      </a>
                    </div>

                    {/* Channel Info */}
                    <div className="p-3">
                      <a
                        href={getChannelUrl(channel.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                            {channel.name}
                          </h3>
                          {status.isLive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                      </a>
                      {channel.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Page Info */}
            <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, totalChannels)} of {totalChannels} channels
            </div>
          </>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> If a channel is not currently live, the embed will show their latest video or indicate the stream is offline.
          </p>
        </div>
      </div>
    </div>
  );
}

