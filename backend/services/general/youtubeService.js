/**
 * YouTube Service
 * Checks if channels are live and fetches live stream or latest livestream video IDs
 */

const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

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
    // Try to resolve handle to channel ID
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
 * Check if a YouTube channel is currently live streaming
 * @param {string} channelId - YouTube Channel ID or handle (@username)
 * @returns {Promise<Object>} { isLive: boolean, videoId: string|null, title: string|null, thumbnail: string|null, status: string }
 */
async function checkChannelLiveStatus(channelId) {
  // Resolve channel ID if it's a handle
  const resolvedChannelId = await resolveChannelId(channelId);
  
  if (!YOUTUBE_API_KEY) {
    console.warn(`YOUTUBE_API_KEY not set for channel ${resolvedChannelId}, returning offline status`);
    // Return a fallback that at least allows embedding
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
      status: 'offline',
      error: 'API key not configured',
      channelId: resolvedChannelId, // Include channel ID for fallback embedding
    };
  }

  try {
    // First, verify the channel exists and get channel info
    let uploadsPlaylistId = null;
    try {
      const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'contentDetails,snippet',
          id: resolvedChannelId,
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      });

      if (channelResponse.data.items && channelResponse.data.items.length > 0) {
        const channel = channelResponse.data.items[0];
        uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      } else {
        console.warn(`Channel ${resolvedChannelId} not found, will try direct video search`);
      }
    } catch (channelError) {
      console.warn(`Error fetching channel info for ${resolvedChannelId}:`, channelError.message);
      // Continue to try getting videos directly
    }

    // Step 1: Check for currently live streams
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

      // If we find a live stream, return it
      if (liveSearchResponse.data.items && liveSearchResponse.data.items.length > 0) {
        const liveVideo = liveSearchResponse.data.items[0];
        console.log(`Channel ${resolvedChannelId} is LIVE: ${liveVideo.id.videoId}`);
        return {
          isLive: true,
          videoId: liveVideo.id.videoId,
          title: liveVideo.snippet.title,
          thumbnail: liveVideo.snippet.thumbnails?.high?.url || liveVideo.snippet.thumbnails?.default?.url,
          status: 'live',
          channelId: resolvedChannelId,
        };
      }
    } catch (liveError) {
      console.warn(`Error checking live status for channel ${resolvedChannelId}:`, liveError.message);
      // Continue to check for latest livestream
    }

    // Step 2: If not live, get latest videos and find the most recent livestream
    // First, try to get uploads playlist ID (more reliable than search)
    if (!uploadsPlaylistId) {
      try {
        const channelInfoResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
          params: {
            part: 'contentDetails',
            id: resolvedChannelId,
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });
        
        if (channelInfoResponse.data.items && channelInfoResponse.data.items.length > 0) {
          uploadsPlaylistId = channelInfoResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
          console.log(`Got uploads playlist ID for ${resolvedChannelId}: ${uploadsPlaylistId}`);
        }
      } catch (infoError) {
        const errorCode = infoError.response?.status;
        const errorMessage = infoError.response?.data?.error?.message || infoError.message;
        
        if (errorCode === 403) {
          const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                 errorMessage?.toLowerCase().includes('exceeded');
          if (isQuotaExceeded) {
            console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}. Using fallback embed.`);
            return {
              isLive: false,
              videoId: null,
              title: null,
              thumbnail: null,
              status: 'quota_exceeded',
              error: 'YouTube API quota exceeded',
              channelId: resolvedChannelId, // Include for fallback embedding
            };
          }
        }
        console.warn(`Could not get uploads playlist for ${resolvedChannelId}:`, errorMessage);
      }
    }

    // Try uploads playlist first (more reliable and uses less quota)
    if (uploadsPlaylistId) {
      try {
        const playlistResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: 'snippet',
            playlistId: uploadsPlaylistId,
            maxResults: 1,
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });

        if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
          const latestVideo = playlistResponse.data.items[0];
          const videoId = latestVideo.snippet.resourceId.videoId;
          
          // Get video details to check if it's a livestream
          try {
            const videoDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
              params: {
                part: 'snippet,liveStreamingDetails',
                id: videoId,
                key: YOUTUBE_API_KEY,
              },
              timeout: 10000,
            });

            if (videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
              const video = videoDetailsResponse.data.items[0];
              const isLivestream = video.liveStreamingDetails !== undefined;
              
              console.log(`Channel ${resolvedChannelId} latest video (playlist): ${videoId}${isLivestream ? ' (livestream)' : ''}`);
              return {
                isLive: false,
                videoId: videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
                status: isLivestream ? 'latest_livestream' : 'latest_video',
                channelId: resolvedChannelId,
              };
            }
          } catch (videoDetailsError) {
            // If we can't get video details, still return the video ID
            console.warn(`Could not get video details for ${videoId}:`, videoDetailsError.message);
            return {
              isLive: false,
              videoId: videoId,
              title: latestVideo.snippet.title,
              thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
              status: 'latest_video',
              channelId: resolvedChannelId,
            };
          }
        }
      } catch (playlistError) {
        const errorCode = playlistError.response?.status;
        const errorMessage = playlistError.response?.data?.error?.message || playlistError.message;
        
        if (errorCode === 403) {
          const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                 errorMessage?.toLowerCase().includes('exceeded');
          if (isQuotaExceeded) {
            console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}. Using fallback embed.`);
            // Return early to avoid further API calls
            return {
              isLive: false,
              videoId: null,
              title: null,
              thumbnail: null,
              status: 'quota_exceeded',
              error: 'YouTube API quota exceeded',
              channelId: resolvedChannelId, // Include for fallback embedding
            };
          }
        }
        console.warn(`Error getting playlist items for ${resolvedChannelId}:`, errorMessage);
      }
    }

    // Fallback: Get the latest videos from the channel using search (if playlist method failed)
    try {
      const latestVideosResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          channelId: resolvedChannelId,
          type: 'video',
          maxResults: 20, // Get more videos to find livestreams
          order: 'date',
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      });

      if (latestVideosResponse.data.items && latestVideosResponse.data.items.length > 0) {
        // Get video IDs
        const videoIds = latestVideosResponse.data.items.map(item => item.id.videoId).join(',');
        
        // Get video details to check for livestreams
        const videoDetailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            part: 'snippet,liveStreamingDetails',
            id: videoIds,
            key: YOUTUBE_API_KEY,
          },
          timeout: 10000,
        });

        if (videoDetailsResponse.data.items) {
          // First, try to find videos that were livestreams (have liveStreamingDetails)
          const livestreamVideos = videoDetailsResponse.data.items.filter(
            video => video.liveStreamingDetails !== undefined
          );

          if (livestreamVideos.length > 0) {
            // Sort by publishedAt to get the most recent livestream
            const latestLivestream = livestreamVideos.sort((a, b) => 
              new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
            )[0];

            console.log(`Channel ${resolvedChannelId} latest livestream: ${latestLivestream.id}`);
            return {
              isLive: false,
              videoId: latestLivestream.id,
              title: latestLivestream.snippet.title,
              thumbnail: latestLivestream.snippet.thumbnails?.high?.url || latestLivestream.snippet.thumbnails?.default?.url,
              status: 'latest_livestream',
              channelId: resolvedChannelId,
            };
          }

          // If no livestreams found, use the most recent video
          const latestVideo = videoDetailsResponse.data.items.sort((a, b) => 
            new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
          )[0];

          console.log(`Channel ${resolvedChannelId} latest video: ${latestVideo.id}`);
          return {
            isLive: false,
            videoId: latestVideo.id,
            title: latestVideo.snippet.title,
            thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
            status: 'latest_video',
            channelId: resolvedChannelId,
          };
        }
      }
    } catch (videoError) {
      const errorCode = videoError.response?.status;
      const errorMessage = videoError.response?.data?.error?.message || videoError.message;
      
      if (errorCode === 403) {
        const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                               errorMessage?.toLowerCase().includes('exceeded');
        if (isQuotaExceeded) {
          console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}. Using fallback embed.`);
          // Return early to avoid further API calls
          return {
            isLive: false,
            videoId: null,
            title: null,
            thumbnail: null,
            status: 'quota_exceeded',
            error: 'YouTube API quota exceeded',
            channelId: resolvedChannelId, // Include for fallback embedding
          };
        }
      }
      console.warn(`Error getting latest videos for channel ${resolvedChannelId}:`, errorMessage);
      // Fallback to uploads playlist method (more reliable for getting latest video)
      if (uploadsPlaylistId) {
        try {
          const latestVideoResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
            params: {
              part: 'snippet',
              playlistId: uploadsPlaylistId,
              maxResults: 1,
              key: YOUTUBE_API_KEY,
            },
            timeout: 10000,
          });

          if (latestVideoResponse.data.items && latestVideoResponse.data.items.length > 0) {
            const latestVideo = latestVideoResponse.data.items[0];
            const videoId = latestVideo.snippet.resourceId.videoId;
            console.log(`Channel ${resolvedChannelId} latest video (playlist fallback): ${videoId}`);
            return {
              isLive: false,
              videoId: videoId,
              title: latestVideo.snippet.title,
              thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
              status: 'latest_video',
              channelId: resolvedChannelId,
            };
          }
        } catch (fallbackError) {
          const errorCode = fallbackError.response?.status;
          const errorMessage = fallbackError.response?.data?.error?.message || fallbackError.message;
          
          if (errorCode === 403) {
            const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                                   errorMessage?.toLowerCase().includes('exceeded');
            if (isQuotaExceeded) {
              console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}. Using fallback embed.`);
              // Don't try further API calls if quota is exceeded
              return {
                isLive: false,
                videoId: null,
                title: null,
                thumbnail: null,
                status: 'quota_exceeded',
                error: 'YouTube API quota exceeded',
                channelId: resolvedChannelId, // Include for fallback embedding
              };
            }
          }
          console.warn(`Error in playlist fallback for channel ${resolvedChannelId}:`, errorMessage);
        }
      }
    }

    // Final fallback: Try to get any video from the channel using search
    // Skip if we already know quota is exceeded
    try {
      const finalSearchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          channelId: resolvedChannelId,
          type: 'video',
          maxResults: 1,
          order: 'date',
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      });

      if (finalSearchResponse.data.items && finalSearchResponse.data.items.length > 0) {
        const latestVideo = finalSearchResponse.data.items[0];
        console.log(`Channel ${resolvedChannelId} latest video (final fallback): ${latestVideo.id.videoId}`);
        return {
          isLive: false,
          videoId: latestVideo.id.videoId,
          title: latestVideo.snippet.title,
          thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
          status: 'latest_video',
          channelId: resolvedChannelId,
        };
      }
    } catch (finalError) {
      const errorCode = finalError.response?.status;
      const errorMessage = finalError.response?.data?.error?.message || finalError.message;
      
      if (errorCode === 403) {
        const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                               errorMessage?.toLowerCase().includes('exceeded');
        if (isQuotaExceeded) {
          console.warn(`YouTube API quota exceeded for channel ${resolvedChannelId}. Using fallback embed.`);
          return {
            isLive: false,
            videoId: null,
            title: null,
            thumbnail: null,
            status: 'quota_exceeded',
            error: 'YouTube API quota exceeded',
            channelId: resolvedChannelId, // Include for fallback embedding
          };
        }
      }
      console.warn(`Final fallback failed for channel ${resolvedChannelId}:`, errorMessage);
    }

    // No content found - but still return channel ID for fallback embedding
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
      status: 'no_content',
      error: 'No videos found',
      channelId: resolvedChannelId, // Include for fallback embedding
    };
  } catch (error) {
    const errorCode = error.response?.status;
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorData = error.response?.data?.error;
    
    // Check for quota exceeded
    if (errorCode === 403) {
      const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota') || 
                             errorMessage?.toLowerCase().includes('exceeded') ||
                             errorData?.errors?.[0]?.reason === 'quotaExceeded';
      
      if (isQuotaExceeded) {
        console.error(`YouTube API quota exceeded. Check your quota at: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas`);
        return {
          isLive: false,
          videoId: null,
          title: null,
          thumbnail: null,
          status: 'quota_exceeded',
          error: 'YouTube API quota exceeded. Please check your quota or wait for reset.',
          channelId: resolvedChannelId, // Include for fallback embedding
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
      channelId: resolvedChannelId, // Include for fallback embedding
    };
  }
}

/**
 * Batch check multiple channels for live status
 * @param {Array<string>} channelIds - Array of YouTube Channel IDs
 * @returns {Promise<Object>} Object mapping channelId to live status
 */
async function checkMultipleChannelsLiveStatus(channelIds) {
  const results = {};
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (channelId) => {
      const status = await checkChannelLiveStatus(channelId);
      return { channelId, status };
    });

    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ channelId, status }) => {
      results[channelId] = status;
    });

    // Add delay between batches to respect rate limits
    if (i + batchSize < channelIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

module.exports = {
  checkChannelLiveStatus,
  checkMultipleChannelsLiveStatus,
  resolveChannelId,
};

