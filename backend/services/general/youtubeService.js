/**
 * YouTube Service
 * Optimized to minimize API calls and rate limiting
 * Uses batching and caching to reduce quota usage
 */

const axios = require('axios');
const { getRedisClient, isRedisAvailable } = require('../../config/redis');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Cache for channel info (uploads playlist IDs) - expires after 1 hour
const channelInfoCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Redis cache TTLs
const REDIS_CACHE_TTL_LIVE = 15 * 60; // 15 minutes for live status checks
const REDIS_CACHE_TTL_VIDEO = 30 * 60; // 30 minutes for video-only checks
const REDIS_CACHE_TTL_CHANNEL_INFO = 60 * 60; // 1 hour for channel info

/**
 * Resolve channel handle (@username) or channel ID to actual channel ID
 * @param {string} channelIdentifier - Channel ID (UC...) or handle (@username)
 * @returns {Promise<string>} Resolved channel ID
 */
async function resolveChannelId(channelIdentifier) {
  // If it's already a channel ID (starts with UC), return it
  if (channelIdentifier.startsWith('UC') && channelIdentifier.length === 24) {
    return channelIdentifier;
  }

  // If it's a handle (@username), remove @ and resolve
  const handle = channelIdentifier.startsWith('@') 
    ? channelIdentifier.substring(1) 
    : channelIdentifier;

  if (!YOUTUBE_API_KEY) {
    console.warn(`Cannot resolve channel handle ${handle} without API key`);
    return channelIdentifier; // Return original if no API key
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'id',
        forHandle: handle,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id;
    }
  } catch (error) {
    console.warn(`Error resolving channel handle ${handle}:`, error.message);
  }

  return channelIdentifier; // Return original if resolution fails
}

/**
 * Batch fetch channel info (uploads playlist IDs) for multiple channels
 * This is much more efficient than fetching one at a time
 * @param {Array<string>} channelIds - Array of channel IDs
 * @returns {Promise<Object>} Map of channelId -> uploadsPlaylistId
 */
async function batchGetChannelInfo(channelIds) {
  const result = {};
  const uncachedIds = [];
  const now = Date.now();

  // Check cache first
  channelIds.forEach(channelId => {
    const cached = channelInfoCache.get(channelId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      result[channelId] = cached.uploadsPlaylistId;
    } else {
      uncachedIds.push(channelId);
    }
  });

  if (uncachedIds.length === 0) {
    return result;
  }

  if (!YOUTUBE_API_KEY) {
    // Return empty for all uncached if no API key
    uncachedIds.forEach(id => {
      result[id] = null;
    });
    return result;
  }

  // YouTube API allows up to 50 IDs per request
  const batchSize = 50;
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'contentDetails',
          id: batch.join(','),
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      });

      if (response.data.items) {
        response.data.items.forEach(channel => {
          const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
          result[channel.id] = uploadsPlaylistId;
          
          // Cache the result
          channelInfoCache.set(channel.id, {
            uploadsPlaylistId,
            timestamp: now,
          });
        });
      }

      // Mark channels not found in response
      batch.forEach(channelId => {
        if (!result[channelId]) {
          result[channelId] = null;
          // Cache null to avoid repeated lookups
          channelInfoCache.set(channelId, {
            uploadsPlaylistId: null,
            timestamp: now,
          });
        }
      });
    } catch (error) {
      const errorCode = error.response?.status;
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      if (errorCode === 403) {
        const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                               errorMessage?.toLowerCase().includes('exceeded');
        if (isQuotaExceeded) {
          console.warn('YouTube API quota exceeded in batchGetChannelInfo');
          // Return null for all in this batch
          batch.forEach(channelId => {
            result[channelId] = null;
          });
          continue;
        }
      }
      
      console.warn(`Error batch fetching channel info:`, errorMessage);
      // Return null for all in this batch
      batch.forEach(channelId => {
        result[channelId] = null;
      });
    }
  }

  return result;
}

/**
 * Fetch channel name from YouTube API
 * @param {string} channelId - Channel ID
 * @returns {Promise<string|null>} Channel name or null
 */
async function fetchChannelName(channelId) {
  if (!YOUTUBE_API_KEY) {
    return null;
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'snippet',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].snippet.title;
    }
    return null;
  } catch (error) {
    console.warn(`Error fetching channel name for ${channelId}:`, error.message);
    return null;
  }
}

/**
 * Batch fetch channel names for multiple channels
 * @param {Array<string>} channelIds - Array of channel IDs
 * @returns {Promise<Object>} Map of channelId -> channelName
 */
async function batchGetChannelNames(channelIds) {
  const result = {};
  
  if (!YOUTUBE_API_KEY || channelIds.length === 0) {
    return result;
  }

  try {
    // Batch fetch channel info (1 unit per 50 channels)
    // Split into batches of 50 (API limit)
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50);
      
      const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'snippet',
          id: batch.join(','),
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      });

      if (response.data.items) {
        response.data.items.forEach(item => {
          if (item.snippet && item.snippet.title) {
            result[item.id] = item.snippet.title;
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error batch fetching channel names:', error.message);
    return result;
  }
}

/**
 * Store last video ID in database for fallback when API quota is exceeded
 * @param {string} channelId - YouTube Channel ID
 * @param {string} videoId - Video ID to store
 */
async function storeLastVideoId(channelId, videoId) {
  try {
    const { pool } = require('../../db');
    await pool.query(
      `UPDATE youtube_channels 
       SET last_video_id = $1, 
           last_video_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE channel_id = $2`,
      [videoId, channelId]
    );
  } catch (error) {
    console.warn(`Failed to store last video ID for ${channelId}:`, error.message);
  }
}

/**
 * Get last video ID from database as fallback
 * @param {string} channelId - YouTube Channel ID
 * @returns {Promise<string|null>} Last video ID or null
 */
async function getLastVideoId(channelId) {
  try {
    const { pool } = require('../../db');
    const result = await pool.query(
      'SELECT last_video_id, last_video_updated_at FROM youtube_channels WHERE channel_id = $1',
      [channelId]
    );
    if (result.rows.length > 0 && result.rows[0].last_video_id) {
      return result.rows[0].last_video_id;
    }
  } catch (error) {
    console.warn(`Failed to get last video ID for ${channelId}:`, error.message);
  }
  return null;
}

/**
 * Get cached channel status from Redis
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object|null>} Cached status or null
 */
async function getCachedChannelStatus(channelId) {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const redis = await getRedisClient();
    if (!redis) return null;

    const cacheKey = `youtube:status:${channelId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Error getting cached status for ${channelId}:`, error.message);
  }
  
  return null;
}

/**
 * Cache channel status in Redis
 * @param {string} channelId - Channel ID
 * @param {Object} status - Status object to cache
 * @param {number} ttl - Time to live in seconds
 */
async function cacheChannelStatus(channelId, status, ttl) {
  if (!isRedisAvailable()) {
    return;
  }

  try {
    const redis = await getRedisClient();
    if (!redis) return;

    const cacheKey = `youtube:status:${channelId}`;
    await redis.setEx(cacheKey, ttl, JSON.stringify(status));
  } catch (error) {
    console.warn(`Error caching status for ${channelId}:`, error.message);
  }
}

/**
 * Optimized: Check if a YouTube channel is currently live streaming
 * Priority order:
 * 1. If live → return live stream (only if pullLivestreams is true)
 * 2. If not live but has older livestreams → return latest livestream (only if pullLivestreams is true)
 * 3. If no livestreams → return latest long-form video (filters out shorts)
 * 4. If API quota exceeded → use last_video_id from database as fallback
 * 
 * Uses minimal API calls by batching channel info and using efficient endpoints
 * @param {string} channelId - YouTube Channel ID
 * @param {string} uploadsPlaylistId - Optional: pre-fetched uploads playlist ID
 * @param {boolean} pullLivestreams - Whether to check for livestreams (default: true)
 * @returns {Promise<Object>} { isLive: boolean, videoId: string|null, title: string|null, thumbnail: string|null, status: string }
 */
async function checkChannelLiveStatus(channelId, uploadsPlaylistId = null, pullLivestreams = true) {
  // Resolve channel ID if it's a handle
  const resolvedChannelId = await resolveChannelId(channelId);
  
  // Check Redis cache first
  const cachedStatus = await getCachedChannelStatus(resolvedChannelId);
  if (cachedStatus) {
    // If cached status is recent and channel wasn't live, skip expensive live search
    // Only use cache if it's not live (live status changes frequently)
    if (!cachedStatus.isLive && cachedStatus.videoId) {
      console.log(`Using cached status for ${resolvedChannelId}`);
      return cachedStatus;
    }
    // If cached status shows live, still check to confirm it's still live
    // But if cache is very recent (< 2 minutes), trust it
    const cacheAge = Date.now() - (cachedStatus.cachedAt || 0);
    if (cachedStatus.isLive && cacheAge < 2 * 60 * 1000) {
      console.log(`Using recent cached live status for ${resolvedChannelId}`);
      return cachedStatus;
    }
  }
  
  if (!YOUTUBE_API_KEY) {
    console.warn(`YOUTUBE_API_KEY not set for channel ${resolvedChannelId}, returning offline status`);
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
      status: 'offline',
      error: 'API key not configured',
      channelId: resolvedChannelId,
    };
  }

  try {
    // Step 1: Check for currently live streams (100 units) - ONLY if pullLivestreams is true
    // Skip this expensive call if we only want latest videos
    if (pullLivestreams) {
      try {
        const liveSearchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
          params: {
            part: 'snippet',
            channelId: resolvedChannelId,
            eventType: 'live',
            type: 'video',
            maxResults: 1,
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });

        // If we find a live stream, return it immediately
        if (liveSearchResponse.data.items && liveSearchResponse.data.items.length > 0) {
          const liveVideo = liveSearchResponse.data.items[0];
          console.log(`Channel ${resolvedChannelId} is LIVE: ${liveVideo.id.videoId}`);
          const status = {
            isLive: true,
            videoId: liveVideo.id.videoId,
            title: liveVideo.snippet.title,
            thumbnail: liveVideo.snippet.thumbnails?.high?.url || liveVideo.snippet.thumbnails?.default?.url,
            status: 'live',
            channelId: resolvedChannelId,
            publishedAt: liveVideo.snippet.publishedAt,
            cachedAt: Date.now(),
          };
          // Cache live status for shorter time (15 minutes)
          await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_LIVE);
          return status;
        }
      } catch (liveError) {
        const errorCode = liveError.response?.status;
        const errorMessage = liveError.response?.data?.error?.message || liveError.message;
        
        if (errorCode === 403) {
          const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                 errorMessage?.toLowerCase().includes('exceeded');
          if (isQuotaExceeded) {
            console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}`);
            // Try to use last video ID from database as fallback
            const lastVideoId = await getLastVideoId(resolvedChannelId);
            if (lastVideoId) {
              console.log(`Channel ${resolvedChannelId} using cached last video ID: ${lastVideoId}`);
              return {
                isLive: false,
                videoId: lastVideoId,
                title: null,
                thumbnail: null,
                status: 'cached_video',
                error: 'YouTube API quota exceeded, using cached video',
                channelId: resolvedChannelId,
              };
            }
            return {
              isLive: false,
              videoId: null,
              title: null,
              thumbnail: null,
              status: 'quota_exceeded',
              error: 'YouTube API quota exceeded',
              channelId: resolvedChannelId,
            };
          }
        }
        console.warn(`Error checking live status for channel ${resolvedChannelId}:`, errorMessage);
        // Continue to fallback
      }
    }

    // Step 2: If not live, search for latest livestream or latest long-form video
    // Use provided uploadsPlaylistId or fetch it if not provided
    let playlistId = uploadsPlaylistId;
    
    if (!playlistId) {
      // Get uploads playlist ID (1 unit)
      try {
        const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
          params: {
            part: 'contentDetails',
            id: resolvedChannelId,
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });

        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          playlistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
          
          // Cache it
          if (playlistId) {
            channelInfoCache.set(resolvedChannelId, {
              uploadsPlaylistId: playlistId,
              timestamp: Date.now(),
            });
          }
        }
      } catch (channelError) {
        const errorCode = channelError.response?.status;
        const errorMessage = channelError.response?.data?.error?.message || channelError.message;
        
        if (errorCode === 403) {
          const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                 errorMessage?.toLowerCase().includes('exceeded');
          if (isQuotaExceeded) {
            // Try to use last video ID from database as fallback
            const lastVideoId = await getLastVideoId(resolvedChannelId);
            if (lastVideoId) {
              console.log(`Channel ${resolvedChannelId} using cached last video ID: ${lastVideoId}`);
              return {
                isLive: false,
                videoId: lastVideoId,
                title: null,
                thumbnail: null,
                status: 'cached_video',
                error: 'YouTube API quota exceeded, using cached video',
                channelId: resolvedChannelId,
              };
            }
            return {
              isLive: false,
              videoId: null,
              title: null,
              thumbnail: null,
              status: 'quota_exceeded',
              error: 'YouTube API quota exceeded',
              channelId: resolvedChannelId,
            };
          }
        }
        console.warn(`Error fetching channel info for ${resolvedChannelId}:`, errorMessage);
      }
    }

    // Get recent videos from uploads playlist to find livestreams or long-form videos
    if (playlistId) {
      try {
        // Get up to 50 recent videos to check for livestreams
        const playlistResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: 'snippet',
            playlistId: playlistId,
            maxResults: 50, // Get more videos to find livestreams
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });

        if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
          // Extract video IDs
          const videoIds = playlistResponse.data.items
            .map(item => item.snippet.resourceId.videoId)
            .filter(id => id);
          
          if (videoIds.length > 0) {
            // Get video details to check for livestreams and filter for long-form videos
            // YouTube API allows up to 50 video IDs per request
            const videoDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
              params: {
                part: 'snippet,contentDetails,liveStreamingDetails',
                id: videoIds.join(','),
                key: YOUTUBE_API_KEY,
              },
              timeout: 10000,
            });

            if (videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
              const videos = videoDetailsResponse.data.items;
              
              // Priority 1: Find the most recent livestream (has liveStreamingDetails) - ONLY if pullLivestreams is true
              if (pullLivestreams) {
                const livestreams = videos.filter(video => 
                  video.liveStreamingDetails !== undefined && video.liveStreamingDetails !== null
                );
                
                if (livestreams.length > 0) {
                  // Sort by published date (most recent first)
                  livestreams.sort((a, b) => 
                    new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
                  );
                  const latestLivestream = livestreams[0];
                  
                  // Check if livestream is over a month old (30 days)
                  const livestreamDate = new Date(latestLivestream.snippet.publishedAt);
                  const monthAgo = new Date();
                  monthAgo.setDate(monthAgo.getDate() - 30);
                  
                  // If livestream is recent (within a month), use it
                  if (livestreamDate >= monthAgo) {
                    console.log(`Channel ${resolvedChannelId} latest livestream: ${latestLivestream.id}`);
                    // Store as last video for fallback
                    await storeLastVideoId(resolvedChannelId, latestLivestream.id);
                    const status = {
                      isLive: false,
                      videoId: latestLivestream.id,
                      title: latestLivestream.snippet.title,
                      thumbnail: latestLivestream.snippet.thumbnails?.high?.url || latestLivestream.snippet.thumbnails?.default?.url,
                      status: 'latest_livestream',
                      channelId: resolvedChannelId,
                      publishedAt: latestLivestream.snippet.publishedAt,
                      cachedAt: Date.now(),
                    };
                    await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_VIDEO);
                    return status;
                  }
                  // If livestream is old, fall through to latest video
                }
              }
              
              // Priority 2: Find the most recent long-form video (not a short)
              // Long-form videos typically have duration > 60 seconds
              // Shorts are usually < 60 seconds and have "Shorts" in the title or are in a shorts playlist
              const longFormVideos = videos.filter(video => {
                const duration = video.contentDetails?.duration;
                if (!duration) return true; // Include if duration unknown
                
                // Parse ISO 8601 duration (e.g., PT1H2M10S, PT30S, PT5M)
                // Format: PT[hours H][minutes M][seconds S]
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (!match) {
                  // If can't parse, include it (safe fallback)
                  return true;
                }
                
                const hours = parseInt(match[1] || '0', 10) || 0;
                const minutes = parseInt(match[2] || '0', 10) || 0;
                const seconds = parseInt(match[3] || '0', 10) || 0;
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                
                // Filter out shorts (typically < 60 seconds)
                // Also filter out videos with "Short" or "#shorts" in title
                const title = video.snippet.title?.toLowerCase() || '';
                const isShort = totalSeconds < 60 || title.includes('short') || title.includes('#shorts');
                
                return !isShort;
              });
              
              if (longFormVideos.length > 0) {
                // Sort by published date (most recent first)
                longFormVideos.sort((a, b) => 
                  new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
                );
                const latestLongForm = longFormVideos[0];
                console.log(`Channel ${resolvedChannelId} latest long-form video: ${latestLongForm.id}`);
                // Store as last video for fallback
                await storeLastVideoId(resolvedChannelId, latestLongForm.id);
                const status = {
                  isLive: false,
                  videoId: latestLongForm.id,
                  title: latestLongForm.snippet.title,
                  thumbnail: latestLongForm.snippet.thumbnails?.high?.url || latestLongForm.snippet.thumbnails?.default?.url,
                  status: 'latest_video',
                  channelId: resolvedChannelId,
                  publishedAt: latestLongForm.snippet.publishedAt,
                  cachedAt: Date.now(),
                };
                await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_VIDEO);
                return status;
              }
              
              // If no long-form videos found, return the most recent video anyway
              videos.sort((a, b) => 
                new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
              );
              const latestVideo = videos[0];
              console.log(`Channel ${resolvedChannelId} latest video (fallback): ${latestVideo.id}`);
              // Store as last video for fallback
              await storeLastVideoId(resolvedChannelId, latestVideo.id);
              const status = {
                isLive: false,
                videoId: latestVideo.id,
                title: latestVideo.snippet.title,
                thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
                status: 'latest_video',
                channelId: resolvedChannelId,
                publishedAt: latestVideo.snippet.publishedAt,
                cachedAt: Date.now(),
              };
              await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_VIDEO);
              return status;
            }
          }
        }
      } catch (playlistError) {
        const errorCode = playlistError.response?.status;
        const errorMessage = playlistError.response?.data?.error?.message || playlistError.message;
        
        if (errorCode === 403) {
          const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                 errorMessage?.toLowerCase().includes('exceeded');
          if (isQuotaExceeded) {
            // Try to use last video ID from database as fallback
            const lastVideoId = await getLastVideoId(resolvedChannelId);
            if (lastVideoId) {
              console.log(`Channel ${resolvedChannelId} using cached last video ID: ${lastVideoId}`);
              return {
                isLive: false,
                videoId: lastVideoId,
                title: null,
                thumbnail: null,
                status: 'cached_video',
                error: 'YouTube API quota exceeded, using cached video',
                channelId: resolvedChannelId,
              };
            }
            return {
              isLive: false,
              videoId: null,
              title: null,
              thumbnail: null,
              status: 'quota_exceeded',
              error: 'YouTube API quota exceeded',
              channelId: resolvedChannelId,
            };
          }
        }
        console.warn(`Error getting playlist items for ${resolvedChannelId}:`, errorMessage);
      }
    }

    // Final fallback: Try to use last video ID from database
    const lastVideoId = await getLastVideoId(resolvedChannelId);
    if (lastVideoId) {
      console.log(`Channel ${resolvedChannelId} using cached last video ID as fallback: ${lastVideoId}`);
      const status = {
        isLive: false,
        videoId: lastVideoId,
        title: null,
        thumbnail: null,
        status: 'cached_video',
        error: 'No videos found, using cached video',
        channelId: resolvedChannelId,
        cachedAt: Date.now(),
      };
      await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_VIDEO);
      return status;
    }
    
    // Final fallback: Return channel ID for embed URL (no API call needed)
    // The embed URL will show the channel's live stream or latest video
    const status = {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
      status: 'offline',
      error: 'No videos found, using channel embed',
      channelId: resolvedChannelId,
      cachedAt: Date.now(),
    };
    await cacheChannelStatus(resolvedChannelId, status, REDIS_CACHE_TTL_VIDEO);
    return status;
  } catch (error) {
    const errorCode = error.response?.status;
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    if (errorCode === 403) {
      const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                             errorMessage?.toLowerCase().includes('exceeded');
      if (isQuotaExceeded) {
        // Try to use last video ID from database as fallback
        const lastVideoId = await getLastVideoId(resolvedChannelId);
        if (lastVideoId) {
          console.log(`Channel ${resolvedChannelId} using cached last video ID: ${lastVideoId}`);
          return {
            isLive: false,
            videoId: lastVideoId,
            title: null,
            thumbnail: null,
            status: 'cached_video',
            error: 'YouTube API quota exceeded, using cached video',
            channelId: resolvedChannelId,
          };
        }
        return {
          isLive: false,
          videoId: null,
          title: null,
          thumbnail: null,
          status: 'quota_exceeded',
          error: 'YouTube API quota exceeded',
          channelId: resolvedChannelId,
        };
      }
    }
    
    console.error(`Error checking live status for channel ${channelId}:`, errorMessage);
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
      status: 'error',
      error: errorMessage,
      channelId: resolvedChannelId,
    };
  }
}

/**
 * Optimized batch check multiple channels for live status
 * Priority for each channel:
 * 1. If live → return live stream (only if pullLivestreams is true)
 * 2. If not live but has older livestreams → return latest livestream (only if pullLivestreams is true)
 * 3. If no livestreams → return latest long-form video (filters out shorts)
 * 
 * Uses batching to minimize API calls:
 * 1. Batch fetch all channel info (uploads playlist IDs) in one API call (1 unit for up to 50 channels)
 * 2. Batch fetch video details for all channels (1 unit per 50 videos)
 * 3. For channels with pullLivestreams=true: Check live status (100 units per channel - expensive!)
 * 
 * Optimizations:
 * - Skips live search (100 units) if pullLivestreams is false - saves 100 units per channel!
 * - Batches channel info fetching (1 unit for 50 channels instead of 1 per channel)
 * - Batches video details (1 unit for 50 videos instead of 1 per channel)
 * 
 * @param {Array<string>} channelIds - Array of YouTube Channel IDs
 * @param {Object} channelConfigs - Map of channelId -> { pullLivestreams: boolean }
 * @returns {Promise<Object>} Object mapping channelId to live status
 */
async function checkMultipleChannelsLiveStatus(channelIds, channelConfigs = {}) {
  if (!channelIds || channelIds.length === 0) {
    return {};
  }

  const results = {};
  
  if (!YOUTUBE_API_KEY) {
    // Return offline status for all if no API key
    channelIds.forEach(channelId => {
      results[channelId] = {
        isLive: false,
        videoId: null,
        title: null,
        thumbnail: null,
        status: 'offline',
        error: 'API key not configured',
        channelId: channelId,
      };
    });
    return results;
  }

  // Step 1: Batch fetch channel info (uploads playlist IDs) for all channels
  // This is much more efficient than fetching one at a time
  // 1 API call for up to 50 channels (1 unit total)
  const channelInfo = await batchGetChannelInfo(channelIds);
  
  // Step 2: Separate channels by whether they need livestream checks
  const channelsNeedingLiveCheck = [];
  const channelsNeedingLatestVideo = [];
  
  channelIds.forEach(channelId => {
    const config = channelConfigs[channelId] || { pullLivestreams: true };
    if (config.pullLivestreams) {
      channelsNeedingLiveCheck.push(channelId);
    } else {
      channelsNeedingLatestVideo.push(channelId);
    }
  });

  // Step 3: Process channels that need livestream checks (expensive - 100 units each)
  // Process in very small batches with delays to avoid quota exhaustion
  const liveBatchSize = 5; // Process only 5 at a time to avoid quota issues
  for (let i = 0; i < channelsNeedingLiveCheck.length; i += liveBatchSize) {
    const batch = channelsNeedingLiveCheck.slice(i, i + liveBatchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (channelId) => {
      const uploadsPlaylistId = channelInfo[channelId] || null;
      const config = channelConfigs[channelId] || { pullLivestreams: true };
      const status = await checkChannelLiveStatus(channelId, uploadsPlaylistId, config.pullLivestreams);
      return { channelId, status };
    });

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ channelId, status }) => {
      results[channelId] = status;
    });

    // Add delay between batches to respect rate limits
    // YouTube allows 100 units per 100 seconds per user
    // Each live check is 100 units (live search) + 1 (playlist) + 1 (video details) = 102 units
    // With 5 channels per batch = 510 units per batch
    // We need to space these out to avoid quota exhaustion
    if (i + liveBatchSize < channelsNeedingLiveCheck.length) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between live check batches
    }
  }

  // Step 4: Process channels that only need latest video (much cheaper - no live search!)
  // These only cost ~2 units per channel (1 for playlist, 1 for video details)
  // We can process these in larger batches
  const videoBatchSize = 20; // Process 20 at a time since they're cheaper
  for (let i = 0; i < channelsNeedingLatestVideo.length; i += videoBatchSize) {
    const batch = channelsNeedingLatestVideo.slice(i, i + videoBatchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (channelId) => {
      const uploadsPlaylistId = channelInfo[channelId] || null;
      const config = channelConfigs[channelId] || { pullLivestreams: false };
      const status = await checkChannelLiveStatus(channelId, uploadsPlaylistId, config.pullLivestreams);
      return { channelId, status };
    });

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ channelId, status }) => {
      results[channelId] = status;
    });

    // Smaller delay for video-only checks since they're cheaper
    if (i + videoBatchSize < channelsNeedingLatestVideo.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between video-only batches
    }
  }

  return results;
}

module.exports = {
  checkChannelLiveStatus,
  checkMultipleChannelsLiveStatus,
  batchGetChannelInfo,
  fetchChannelName,
  batchGetChannelNames,
  resolveChannelId,
  storeLastVideoId,
  getLastVideoId,
};
