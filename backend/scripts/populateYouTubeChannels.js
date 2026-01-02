/**
 * Populate YouTube Channels Database
 * Seeds the youtube_channels table with existing channels from the frontend
 */

require('dotenv').config();
const { pool } = require('../db');

const FINTECH_CHANNELS = [
  {
    channel_id: 'UCjZnbgPb08NFg7MHyPQRZ3Q',
    channel_name: 'Amit Investing',
    subject: 'Amit Kukreja - Fintech and investing insights',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCS01CiRDAiyhR_mTHXDW23A',
    channel_name: 'Dumb Money Live',
    subject: 'Chris Camillo - Retail investing and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UC7SRE6_G0vV94_G93m4uD0Q',
    channel_name: 'Chris Sain',
    subject: 'Chris Sain - Stock market education and trading',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCUvvj5lwue7PspotMDjk5UA',
    channel_name: 'Meet Kevin',
    subject: 'Meet Kevin - Real estate, stocks, and finance',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCV6KDgJskWaEckne5aPA0aQ',
    channel_name: 'Graham Stephan',
    subject: 'Graham Stephan - Personal finance and investing',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UC_iX6P7HhP2MREl20V0_68A',
    channel_name: 'Additional Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCMiJUXvEpHHW5JTnW-ez9EA',
    channel_name: 'Jerry Romine Stocks',
    subject: 'Jerry Romine - Stock market analysis and trading insights',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCnMn36GT_H0X-w5_ckLtlgQ',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCFCEuCsyWP0YkP3CZ3Mr01Q',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCbta0n8i6Rljh0obO7HzG9A',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCfDF3O--fHpa0dTmYRvZjmg',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UC9OIwUcx-Uss7xj7s1P5XGw',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
  {
    channel_id: 'UCzpwkXk_GlfmWntZ9v4l3Tg',
    channel_name: 'Channel',
    subject: 'Financial content and market analysis',
    category: 'fintech',
    content_type: 'live',
    pull_livestreams: true,
  },
];

const NEWS_CHANNELS = [
  {
    channel_id: 'UChqUTb7kYRX8-EiaN3XFrSQ',
    channel_name: 'Reuters',
    subject: 'Reuters - International news and financial markets',
    category: 'news',
    content_type: 'live',
    pull_livestreams: true,
  },
];

async function populateChannels() {
  try {
    console.log('📺 Populating YouTube channels database...\n');

    const allChannels = [...FINTECH_CHANNELS, ...NEWS_CHANNELS];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const channel of allChannels) {
      try {
        // Check if channel exists
        const existing = await pool.query(
          'SELECT id FROM youtube_channels WHERE channel_id = $1',
          [channel.channel_id]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE youtube_channels 
             SET channel_name = $1, subject = $2, category = $3, content_type = $4, 
                 pull_livestreams = $5, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE channel_id = $6`,
            [
              channel.channel_name,
              channel.subject || null,
              channel.category,
              channel.content_type,
              channel.pull_livestreams !== false,
              channel.channel_id,
            ]
          );
          updated++;
          console.log(`✅ Updated: ${channel.channel_name}`);
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO youtube_channels 
             (channel_id, channel_name, subject, category, content_type, pull_livestreams, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
            [
              channel.channel_id,
              channel.channel_name,
              channel.subject || null,
              channel.category,
              channel.content_type,
              channel.pull_livestreams !== false,
            ]
          );
          created++;
          console.log(`➕ Created: ${channel.channel_name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${channel.channel_name}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${allChannels.length}\n`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error populating channels:', error);
    await pool.end();
    process.exit(1);
  }
}

populateChannels();


