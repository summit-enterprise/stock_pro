/**
 * ETL Scheduler Service
 * 
 * Manages scheduled ETL jobs for HISTORICAL batch processing:
 * 1. Daily historical data ingestion (after market close)
 * 2. Weekly full historical backfill
 * 
 * NOTE: Hourly data and latest prices are now handled by the Real-Time Data Scheduler Service.
 * This scheduler focuses ONLY on historical batch processing.
 */

const cron = require('node-cron');
const dataIngestionService = require('./dataIngestionService');
const { pool } = require('../../db');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log('🚀 Starting ETL Scheduler Service...');

    // 1. Daily historical data ingestion (after market close: 4:30 PM ET = 9:30 PM UTC)
    // Runs once per day to backfill any missing historical data
    this.jobs.push(
      cron.schedule('30 21 * * 1-5', async () => {
        console.log('📅 Running daily historical data ingestion...');
        await this.runDailyHistoricalIngestion();
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      })
    );

    // 2. Weekly full historical backfill (Sundays at 2 AM ET)
    // Ensures all historical data is up to date
    this.jobs.push(
      cron.schedule('0 2 * * 0', async () => {
        console.log('📊 Running weekly full historical backfill...');
        await this.runFullHistoricalBackfill();
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      })
    );

    this.isRunning = true;
    console.log(`✅ Scheduler started with ${this.jobs.length} jobs`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }

  /**
   * Run daily historical data ingestion
   * Ingests 1Y of historical data for all assets
   */
  async runDailyHistoricalIngestion() {
    try {
      const symbols = await this.getAllAssetSymbols();
      console.log(`📊 Processing ${symbols.length} assets for daily historical data...`);

      const result = await dataIngestionService.batchIngestHistoricalData(symbols, '1Y');
      console.log(`✅ Daily historical ingestion complete:`, result);
    } catch (error) {
      console.error('❌ Error in daily historical ingestion:', error);
    }
  }


  /**
   * Run full historical backfill
   * Ingests MAX historical data for all assets
   */
  async runFullHistoricalBackfill() {
    try {
      const symbols = await this.getAllAssetSymbols();
      console.log(`📊 Processing ${symbols.length} assets for full historical backfill...`);

      const result = await dataIngestionService.batchIngestHistoricalData(symbols, 'MAX');
      console.log(`✅ Full historical backfill complete:`, result);
    } catch (error) {
      console.error('❌ Error in full historical backfill:', error);
    }
  }

  /**
   * Get all asset symbols from database
   */
  async getAllAssetSymbols() {
    try {
      const result = await pool.query(
        'SELECT DISTINCT symbol FROM asset_info ORDER BY symbol'
      );
      return result.rows.map(row => row.symbol);
    } catch (error) {
      console.error('Error fetching asset symbols:', error);
      return [];
    }
  }


  /**
   * Manually trigger a job (for testing/admin)
   */
  async triggerJob(jobType) {
    switch (jobType) {
      case 'daily':
        await this.runDailyHistoricalIngestion();
        break;
      case 'full':
        await this.runFullHistoricalBackfill();
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }
}

module.exports = new SchedulerService();

