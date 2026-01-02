/**
 * Script to verify YouTube channel IDs and get channel information
 * Usage: node scripts/verify-youtube-channels.js
 */

require('dotenv').config();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY not set in .env file');
  process.exit(1);
}

// List of channel IDs to verify
const channelsToVerify = [
  { id: 'UCjZnbgPb08NFg7MHyPQRZ3Q', name: 'Amit Investing' },
  { id: 'UCS01CiRDAiyhR_mTHXDW23A', name: 'Dumb Money Live' },
  { id: 'UC7SRE6_G0vV94_G93m4uD0Q', name: 'Chris Sain' },
  { id: 'UC_86S3_KInp_9KAtKToL_8A', name: 'Meet Kevin' },
  { id: 'UCV6KDgJskWaEckne5aPA0aQ', name: 'Graham Stephan' },
];

async function verifyChannel(channelId, name) {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      console.log(`✅ ${name}`);
      console.log(`   Channel ID: ${channelId}`);
      console.log(`   Title: ${channel.snippet.title}`);
      console.log(`   Handle: ${channel.snippet.customUrl || 'N/A'}`);
      console.log(`   Subscribers: ${parseInt(channel.statistics.subscriberCount || 0).toLocaleString()}`);
      console.log(`   URL: https://www.youtube.com/channel/${channelId}`);
      console.log('');
      return true;
    } else {
      console.log(`❌ ${name} - Channel ID ${channelId} not found`);
      console.log('');
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.response?.data?.error?.message || error.message}`);
    console.log('');
    return false;
  }
}

async function resolveHandle(handle) {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'id,snippet',
        forHandle: handle.replace('@', ''),
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        handle: handle,
      };
    }
    return null;
  } catch (error) {
    console.warn(`Could not resolve handle ${handle}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Verifying YouTube Channel IDs...\n');

  let validCount = 0;
  let invalidCount = 0;

  for (const channel of channelsToVerify) {
    const isValid = await verifyChannel(channel.id, channel.name);
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Valid: ${validCount}`);
  console.log(`   ❌ Invalid: ${invalidCount}`);
  console.log(`   Total: ${channelsToVerify.length}`);

  // Example: Resolve a handle
  console.log('\n🔍 Example: Resolving @amitinvesting handle...');
  const resolved = await resolveHandle('@amitinvesting');
  if (resolved) {
    console.log(`   ✅ Resolved: ${resolved.title}`);
    console.log(`   Channel ID: ${resolved.id}`);
  }
}

main().catch(console.error);



