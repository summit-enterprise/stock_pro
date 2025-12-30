/**
 * YouTube Service
 * Checks if channels are live and fetches live stream or latest video IDs
 */

const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Check if a YouTube channel is currently live streaming
 * @param {string} channelId - YouTube Channel ID
 * @returns {Promise<Object>} { isLive: boolean, videoId: string|null, title: string|null }
 */
async function checkChannelLiveStatus(channelId) {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not set, using fallback method');
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
    };
  }

  try {
    // First, get the channel's uploads playlist ID
    const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return {
        isLive: false,
        videoId: null,
        title: null,
        thumbnail: null,
      };
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return {
        isLive: false,
        videoId: null,
        title: null,
        thumbnail: null,
      };
    }

    // Search for live streams from this channel
    const liveSearchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        channelId: channelId,
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
      return {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        thumbnail: liveVideo.snippet.thumbnails?.high?.url || liveVideo.snippet.thumbnails?.default?.url,
      };
    }

    // If not live, get the latest video from uploads playlist
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
      return {
        isLive: false,
        videoId: latestVideo.snippet.resourceId.videoId,
        title: latestVideo.snippet.title,
        thumbnail: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url,
      };
    }

    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
    };
  } catch (error) {
    console.error(`Error checking live status for channel ${channelId}:`, error.message);
    return {
      isLive: false,
      videoId: null,
      title: null,
      thumbnail: null,
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
};

