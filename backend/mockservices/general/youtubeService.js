/**
 * Mock YouTube Service
 * Generates mock live status for development
 */

/**
 * Check if a YouTube channel is currently live streaming (mock)
 */
async function checkChannelLiveStatus(channelId) {
  // Mock: Randomly determine if channel is live (30% chance)
  const isLive = Math.random() < 0.3;
  
  if (isLive) {
    // Generate a mock video ID
    const mockVideoId = `mock_live_${channelId.substring(0, 8)}`;
    return {
      isLive: true,
      videoId: mockVideoId,
      title: 'Live Stream',
      thumbnail: null,
    };
  } else {
    // Return latest video (mock)
    const mockVideoId = `mock_latest_${channelId.substring(0, 8)}`;
    return {
      isLive: false,
      videoId: mockVideoId,
      title: 'Latest Video',
      thumbnail: null,
    };
  }
}

/**
 * Batch check multiple channels for live status (mock)
 */
async function checkMultipleChannelsLiveStatus(channelIds) {
  const results = {};
  
  for (const channelId of channelIds) {
    results[channelId] = await checkChannelLiveStatus(channelId);
  }
  
  return results;
}

module.exports = {
  checkChannelLiveStatus,
  checkMultipleChannelsLiveStatus,
};

