'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface YouTubeChannel {
  id: string;
  name: string;
  description?: string;
  category: 'fintech' | 'news';
  thumbnail?: string;
  streamType?: 'youtube' | 'direct'; // New: support direct streams
  streamUrl?: string; // New: direct stream URL for news networks
}

interface ChannelLiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  thumbnail: string | null;
  status?: string;
  error?: string;
  url?: string; // New: direct stream URL
  type?: string; // New: 'youtube' or 'embed'
}

// Fintech and Retail Investing Channels
const FINTECH_CHANNELS: YouTubeChannel[] = [
  {
    id: 'UCjZnbgPb08NFg7MHyPQRZ3Q', // @amitinvesting - verified from user's JSON
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
  {
    id: 'UC_iX6P7HhP2MREl20V0_68A',
    name: 'Additional Channel',
    description: 'Financial content and market analysis',
    category: 'fintech',
  },
  {
    id: 'UCMiJUXvEpHHW5JTnW-ez9EA',
    name: 'Jerry Romine Stocks',
    description: 'Jerry Romine - Stock market analysis and trading insights',
    category: 'fintech',
  },
  // Will be populated with additional top fintech YouTubers (up to 25 total)
];

// Financial News Channels
// These will be populated with direct stream URLs from the API
const NEWS_CHANNELS: YouTubeChannel[] = [
  {
    id: 'cnbc',
    name: 'CNBC',
    description: 'CNBC - Breaking business news and financial markets',
    category: 'news',
    streamType: 'direct', // Will fetch from news-streams API
  },
  {
    id: 'foxBusiness',
    name: 'Fox Business',
    description: 'Fox Business - Business news and market coverage',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    description: 'Bloomberg - Global business and financial news',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'yahooFinance',
    name: 'Yahoo Finance',
    description: 'Yahoo Finance - Stock market news and analysis',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'cnbcInternational',
    name: 'CNBC International',
    description: 'CNBC International - Global financial news',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'cheddar',
    name: 'Cheddar',
    description: 'Cheddar - Business news and market coverage',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'cbsNews',
    name: 'CBS News 24/7',
    description: 'CBS News - 24/7 live news coverage',
    category: 'news',
    streamType: 'direct',
  },
  {
    id: 'UChqUTb7kYRX8-EiaN3XFrSQ',
    name: 'Reuters',
    description: 'Reuters - International news and financial markets',
    category: 'news',
    streamType: 'youtube', // Keep YouTube for Reuters
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
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(null);
  const expandedVideoRef = useRef<HTMLIFrameElement>(null);

  const channels = activeCategory === 'fintech' ? FINTECH_CHANNELS : NEWS_CHANNELS;
  const totalChannels = Math.min(channels.length, MAX_CHANNELS);
  const totalPages = Math.ceil(totalChannels / CHANNELS_PER_PAGE);
  
  // Reset to page 1 when category changes, and collapse any expanded video
  const handleCategoryChange = (category: 'fintech' | 'news') => {
    setActiveCategory(category);
    setCurrentPage(1);
    setExpandedChannelId(null);
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
        // Separate YouTube channels from direct stream channels
        const youtubeChannels = channels.filter(ch => !ch.streamType || ch.streamType === 'youtube');
        const directStreamChannels = channels.filter(ch => ch.streamType === 'direct');

        const statuses: Record<string, ChannelLiveStatus> = {};

        // Fetch YouTube channel statuses
        if (youtubeChannels.length > 0) {
          const channelIds = youtubeChannels.map(ch => ch.id);
          const response = await fetch('http://localhost:3001/api/youtube/channels/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ channelIds }),
          });

          if (response.ok) {
            const youtubeStatuses = await response.json();
            Object.assign(statuses, youtubeStatuses);
          }
        }

        // Fetch direct news stream URLs
        if (directStreamChannels.length > 0) {
          try {
            const newsStreamsResponse = await fetch('http://localhost:3001/api/news-streams');
            if (newsStreamsResponse.ok) {
              const newsStreams = await newsStreamsResponse.json();
              
              // Map news stream data to channel IDs
              directStreamChannels.forEach(channel => {
                const streamData = newsStreams[channel.id];
                if (streamData) {
                  statuses[channel.id] = {
                    isLive: streamData.isLive || true,
                    videoId: null,
                    title: streamData.title || channel.name,
                    thumbnail: streamData.thumbnail || null,
                    status: streamData.status || 'embed',
                    url: streamData.url,
                    type: streamData.type || 'embed',
                  };
                } else {
                  // Fallback if stream not found
                  statuses[channel.id] = {
                    isLive: false,
                    videoId: null,
                    title: channel.name,
                    thumbnail: null,
                    status: 'offline',
                    error: 'Stream not available',
                  };
                }
              });
            }
          } catch (error) {
            console.error('Error fetching news streams:', error);
            // Set fallback statuses for direct streams
            directStreamChannels.forEach(channel => {
              statuses[channel.id] = {
                isLive: false,
                videoId: null,
                title: channel.name,
                thumbnail: null,
                status: 'error',
                error: 'Failed to fetch stream',
              };
            });
          }
        }

        setLiveStatuses(statuses);
      } catch (error) {
        console.error('Error fetching live statuses:', error);
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchLiveStatuses();

    // Refresh live statuses every 5 minutes (300000 ms)
    const interval = setInterval(fetchLiveStatuses, 300000);
    return () => clearInterval(interval);
  }, [channels]);

  const getEmbedUrl = (channel: YouTubeChannel, status: ChannelLiveStatus, autoplay: boolean = false) => {
    // If this is a direct stream channel, use the stream URL
    if (channel.streamType === 'direct' && status.url) {
      return status.url;
    }

    // For YouTube channels, use video ID if available
    if (status.videoId) {
      return `https://www.youtube.com/embed/${status.videoId}?autoplay=${autoplay ? 1 : 0}&mute=0&rel=0&enablejsapi=1`;
    }
    
    // Fallback: Use channel's live stream URL which will show latest video or live stream
    // Format: /embed/live_stream?channel=CHANNEL_ID
    // This will automatically show the latest video if not live
    return `https://www.youtube.com/embed/live_stream?channel=${channel.id}&autoplay=${autoplay ? 1 : 0}&mute=0&enablejsapi=1`;
  };

  const getVideoUrl = (videoId: string | null, channelId: string, directUrl?: string) => {
    // If we have a direct stream URL, return the direct page URL
    if (directUrl) {
      // Try to extract the base URL from embed URL
      const match = directUrl.match(/https?:\/\/([^\/]+)/);
      if (match) {
        return `https://${match[1]}`;
      }
      return directUrl;
    }
    
    // For YouTube videos
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return `https://www.youtube.com/channel/${channelId}`;
  };

  const getChannelUrl = (channelId: string) => {
    return `https://www.youtube.com/channel/${channelId}`;
  };

  const handleVideoClick = (channelId: string) => {
    if (expandedChannelId === channelId) {
      // Collapse if clicking the same video
      setExpandedChannelId(null);
    } else {
      // Expand the clicked video
      setExpandedChannelId(channelId);
    }
  };

  const handleCloseExpanded = () => {
    setExpandedChannelId(null);
  };

  // Separate expanded video and other videos
  const expandedChannel = expandedChannelId 
    ? paginatedChannels.find(ch => ch.id === expandedChannelId)
    : null;
  const otherChannels = expandedChannelId
    ? paginatedChannels.filter(ch => ch.id !== expandedChannelId)
    : paginatedChannels;

  return (
    <ProtectedRoute>
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

        {/* Channels Grid */}
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
            <div className="mb-6">
              {/* Expanded Video Section */}
              {expandedChannel && (() => {
                const status = liveStatuses[expandedChannel.id] || { isLive: false, videoId: null, title: null, thumbnail: null };
                const embedUrl = getEmbedUrl(expandedChannel, status, true);
                const videoUrl = getVideoUrl(status.videoId, expandedChannel.id, status.url);
                
                return (
                  <div 
                    className="mb-6 bg-gray-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-lg transition-all duration-500 ease-in-out"
                    style={{ animation: 'expandIn 0.5s ease-in-out' }}
                  >
                    {/* Expanded Video Player */}
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        ref={expandedVideoRef}
                        className="absolute top-0 left-0 w-full h-full"
                        src={embedUrl}
                        title={expandedChannel.name}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      
                      {/* Close Button */}
                      <button
                        onClick={handleCloseExpanded}
                        className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors z-10"
                        title="Close expanded view"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* YouTube Icon Button */}
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-4 right-16 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-colors z-10"
                        title="Open on YouTube"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    </div>

                    {/* Expanded Video Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {expandedChannel.name}
                          </h3>
                          {status.isLive && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-600 text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                          {!status.isLive && status.videoId && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                              {status.status === 'latest_livestream' ? 'Latest Stream' : 'Latest Video'}
                            </span>
                          )}
                          {!status.isLive && !status.videoId && !expandedChannel.streamType && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-500 text-white" title={status.error || 'Channel videos'}>
                              Channel
                            </span>
                          )}
                        </div>
                      </div>
                      {expandedChannel.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {expandedChannel.description}
                        </p>
                      )}
                      {status.title && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                          {status.title}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Other Videos Grid - Adjusts based on expanded state */}
              <div 
                className={`grid gap-4 transition-all duration-500 ease-in-out ${
                  expandedChannelId 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {otherChannels.map((channel) => {
                  const status = liveStatuses[channel.id] || { isLive: false, videoId: null, title: null, thumbnail: null };
                  const embedUrl = getEmbedUrl(channel, status);
                  
                  return (
                    <div
                      key={channel.id}
                      className="bg-gray-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      onClick={() => handleVideoClick(channel.id)}
                    >
                      {/* Video Embed */}
                      <div className="relative w-full group" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          src={embedUrl}
                          title={channel.name}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                        
                        {/* Click Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>

                        {/* YouTube/External Icon - Opens in new window */}
                        <a
                          href={getVideoUrl(status.videoId, channel.id, status.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title={channel.streamType === 'direct' ? 'Open on website' : 'Open on YouTube'}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </a>
                      </div>

                      {/* Channel Info */}
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                            {channel.name}
                          </h3>
                          {status.isLive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white animate-pulse">
                              LIVE
                            </span>
                          )}
                          {!status.isLive && status.videoId && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                              {status.status === 'latest_livestream' ? 'Latest Stream' : 'Latest Video'}
                            </span>
                          )}
                          {!status.isLive && !status.videoId && !channel.streamType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-500 text-white" title={status.error || 'Channel videos'}>
                              Channel
                            </span>
                          )}
                        </div>
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    setExpandedChannelId(null);
                  }}
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
                      onClick={() => {
                        setCurrentPage(page);
                        setExpandedChannelId(null);
                      }}
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
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    setExpandedChannelId(null);
                  }}
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
            <strong>Tip:</strong> Click on any video to expand it. Click the close button or click the video again to collapse. Use the YouTube icon to open videos in a new window.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes expandIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      </div>
    </ProtectedRoute>
  );
}
