/**
 * Real-Time Data Scheduler Service
 * 
 * Manages scheduled real-time data updates:
 * 1. Hourly data updates (every 5-15 minutes during market hours)
 * 2. Latest price updates (every 1 minute during market hours)
 * 
 * This is separate from ETL which handles historical batch processing.
 */

const cron = require('node-cron');
const realtimeDataService = require('./realtimeDataService');
const { pool } = require('../../db');

class RealtimeSchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled real-time jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Real-time scheduler is already running');
      return;
    }

    console.log('🚀 Starting Real-Time Data Scheduler Service...');

    // 1. Hourly data updates (every 10 minutes during market hours: 9:30 AM - 4:00 PM ET)
    // This keeps 1D charts up to date with the latest hourly data points
    this.jobs.push(
      cron.schedule('*/10 9-16 * * 1-5', async () => {
        console.log('⏰ Running hourly data update...');
        await this.runHourlyDataUpdate();
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      })
    );

    // 2. Latest price updates (every 1 minute during market hours)
    // Updates cache with latest prices for market overview
    this.jobs.push(
      cron.schedule('* 9-16 * * 1-5', async () => {
        await this.runLatestPriceUpdate();
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      })
    );

    this.isRunning = true;
    console.log(`✅ Real-time scheduler started with ${this.jobs.length} jobs`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('🛑 Real-time scheduler stopped');
  }

  /**
   * Run hourly data update
   * Updates hourly data for active assets (watchlisted + market overview)
   */
  async runHourlyDataUpdate() {
    try {
      const symbols = await this.getActiveSymbols();
      if (symbols.length === 0) {
        console.log('⚠️  No active symbols to update hourly data');
        return;
      }

      console.log(`📊 Updating hourly data for ${symbols.length} active assets...`);
      const result = await realtimeDataService.updateHourlyData(symbols);
      console.log(`✅ Hourly data update complete:`, result);
    } catch (error) {
      console.error('❌ Error in hourly data update:', error);
    }
  }

  /**
   * Run latest price update
   * Updates cache with latest prices for active assets
   */
  async runLatestPriceUpdate() {
    try {
      const symbols = await this.getActiveSymbols();
      if (symbols.length === 0) {
        return; // No active symbols to update
      }

      await realtimeDataService.updateLatestPrices(symbols);
    } catch (error) {
      console.error('❌ Error in latest price update:', error);
    }
  }

  /**
   * Get active symbols (from watchlists and market overview)
   * This limits updates to only assets users are actively viewing
   */
  async getActiveSymbols() {
    try {
      // Get symbols from watchlists
      const watchlistResult = await pool.query(
        'SELECT DISTINCT symbol FROM watchlist'
      );
      const watchlistSymbols = watchlistResult.rows.map(row => row.symbol);

      // Get symbols from market overview (top assets)
      const marketResult = await pool.query(
        `SELECT DISTINCT symbol FROM asset_info 
         WHERE type IN ('stock', 'etf', 'crypto', 'index')
         ORDER BY market_cap DESC NULLS LAST
         LIMIT 100`
      );
      const marketSymbols = marketResult.rows.map(row => row.symbol);

      // Combine and deduplicate
      const allSymbols = [...new Set([...watchlistSymbols, ...marketSymbols])];
      return allSymbols;
    } catch (error) {
      console.error('Error fetching active symbols:', error);
      return [];
    }
  }

  /**
   * Manually trigger a job (for testing/admin)
   */
  async triggerJob(jobType) {
    switch (jobType) {
      case 'hourly':
        await this.runHourlyDataUpdate();
        break;
      case 'latest':
        await this.runLatestPriceUpdate();
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }
}

module.exports = new RealtimeSchedulerService();


