/**
 * News Stream Service
 * Fetches live stream URLs from major financial news networks
 * Uses direct embed URLs, YouTube API, or website scraping
 */

const axios = require('axios');
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * News network configurations
 * Each network has its embed URL pattern and fallback options
 */
const NEWS_NETWORKS = {
  bloomberg: {
    name: 'Bloomberg',
    embedUrl: 'https://www.bloomberg.com/embed/live',
    directUrl: 'https://www.bloomberg.com/live',
    youtubeChannelId: null, // Bloomberg doesn't stream on YouTube
    type: 'embed',
  },
  cnbc: {
    name: 'CNBC',
    embedUrl: 'https://www.cnbc.com/live-tv/embed/',
    directUrl: 'https://www.cnbc.com/live-tv/',
    youtubeChannelId: 'UCvJJ_dzjViJCoLf5uKUTwoA',
    type: 'youtube', // Prefer YouTube as it's more reliable
  },
  cnbcInternational: {
    name: 'CNBC International',
    embedUrl: 'https://www.cnbc.com/cnbc-international/embed/',
    directUrl: 'https://www.cnbc.com/cnbc-international/',
    youtubeChannelId: null, // Check if they have a separate YouTube channel
    type: 'embed',
  },
  foxBusiness: {
    name: 'Fox Business',
    embedUrl: 'https://www.foxbusiness.com/embed/live',
    directUrl: 'https://www.foxbusiness.com/live',
    youtubeChannelId: 'UCCXoCcu9Rp7NPbTzIvogpZg',
    type: 'youtube', // Prefer YouTube
  },
  yahooFinance: {
    name: 'Yahoo Finance',
    embedUrl: 'https://finance.yahoo.com/embed/live',
    directUrl: 'https://finance.yahoo.com/live/',
    youtubeChannelId: 'UCEAZeUIeJs0IjQiqTCdVSIg',
    type: 'youtube', // Prefer YouTube
  },
  cheddar: {
    name: 'Cheddar',
    embedUrl: 'https://cheddar.com/embed/live',
    directUrl: 'https://cheddar.com/live',
    youtubeChannelId: null,
    type: 'embed',
  },
  cbsNews: {
    name: 'CBS News 24/7',
    embedUrl: 'https://www.cbsnews.com/embed/live',
    directUrl: 'https://www.cbsnews.com/live/',
    youtubeChannelId: null, // Check for YouTube channel
    type: 'embed',
  },
};

/**
 * Get live stream URL for a news network
 * @param {string} networkKey - Key from NEWS_NETWORKS (e.g., 'cnbc', 'bloomberg')
 * @returns {Promise<Object>} { url: string, type: string, isLive: boolean, title: string }
 */
async function getNewsStreamUrl(networkKey) {
  const network = NEWS_NETWORKS[networkKey];
  
  if (!network) {
    return {
      url: null,
      type: 'error',
      isLive: false,
      title: null,
      error: `Network ${networkKey} not found`,
    };
  }

  // If network prefers YouTube and has a channel ID, use YouTube API
  if (network.type === 'youtube' && network.youtubeChannelId && YOUTUBE_API_KEY) {
    try {
      const youtubeService = require('./youtubeService');
      const youtubeStatus = await youtubeService.checkChannelLiveStatus(network.youtubeChannelId);
      
      if (youtubeStatus.videoId) {
        return {
          url: `https://www.youtube.com/embed/${youtubeStatus.videoId}?autoplay=0&mute=0&rel=0&enablejsapi=1`,
          type: 'youtube',
          isLive: youtubeStatus.isLive,
          title: youtubeStatus.title || network.name,
          thumbnail: youtubeStatus.thumbnail,
          status: youtubeStatus.status,
        };
      }
    } catch (error) {
      console.warn(`YouTube API failed for ${network.name}, falling back to embed URL:`, error.message);
    }
  }

  // Fallback to direct embed URL
  return {
    url: network.embedUrl,
    type: 'embed',
    isLive: true, // Assume live for embed URLs
    title: network.name,
    thumbnail: null,
    status: 'embed',
  };
}

/**
 * Scrape live stream URL from a website
 * @param {string} url - Website URL to scrape
 * @returns {Promise<string|null>} Embed URL or null
 */
async function scrapeStreamUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const html = response.data;

    // Look for common embed patterns
    const patterns = [
      /src=["']([^"']*embed[^"']*live[^"']*)["']/i,
      /src=["']([^"']*live[^"']*embed[^"']*)["']/i,
      /iframe[^>]*src=["']([^"']+)["']/i,
      /"streamUrl":\s*"([^"]+)"/i,
      /"embedUrl":\s*"([^"]+)"/i,
      /(https?:\/\/[^\s"']*\.m3u8[^\s"']*)/i,
      /(https?:\/\/[^\s"']*\.mpd[^\s"']*)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let embedUrl = match[1];
        // Make sure it's a full URL
        if (embedUrl.startsWith('//')) {
          embedUrl = 'https:' + embedUrl;
        } else if (embedUrl.startsWith('/')) {
          const baseUrl = new URL(url).origin;
          embedUrl = baseUrl + embedUrl;
        }
        return embedUrl;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error scraping stream URL from ${url}:`, error.message);
    return null;
  }
}

/**
 * Get all news stream URLs
 * @returns {Promise<Object>} Object mapping network keys to stream info
 */
async function getAllNewsStreams() {
  const results = {};

  for (const [key, network] of Object.entries(NEWS_NETWORKS)) {
    try {
      const streamInfo = await getNewsStreamUrl(key);
      results[key] = {
        ...streamInfo,
        networkName: network.name,
        directUrl: network.directUrl,
      };

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error getting stream for ${network.name}:`, error.message);
      results[key] = {
        url: network.embedUrl, // Fallback to embed URL
        type: 'embed',
        isLive: false,
        title: network.name,
        error: error.message,
      };
    }
  }

  return results;
}

/**
 * Verify and update embed URLs (run periodically)
 * @returns {Promise<Object>} Updated network configurations
 */
async function verifyAndUpdateEmbedUrls() {
  const updates = {};

  for (const [key, network] of Object.entries(NEWS_NETWORKS)) {
    if (network.type === 'embed') {
      try {
        const scrapedUrl = await scrapeStreamUrl(network.directUrl);
        if (scrapedUrl && scrapedUrl !== network.embedUrl) {
          updates[key] = {
            oldUrl: network.embedUrl,
            newUrl: scrapedUrl,
          };
          console.log(`Found updated embed URL for ${network.name}: ${scrapedUrl}`);
        }
      } catch (error) {
        console.warn(`Could not verify embed URL for ${network.name}:`, error.message);
      }

      // Add delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return updates;
}

module.exports = {
  getNewsStreamUrl,
  getAllNewsStreams,
  scrapeStreamUrl,
  verifyAndUpdateEmbedUrls,
  NEWS_NETWORKS,
};



