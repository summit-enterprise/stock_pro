/**
 * Application Status Logger
 * Displays a detailed table of services, APIs, and application health in console
 */

const serviceHealthService = require('./serviceHealthService');
const apiTrackingService = require('./apiTrackingService');
const { pool } = require('../../db');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Format a value with color based on status
 */
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Get status color
 */
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'running':
    case 'success':
      return 'green';
    case 'degraded':
    case 'warning':
      return 'yellow';
    case 'error':
    case 'unhealthy':
    case 'stopped':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Format a cell value with padding
 */
function formatCell(value, width, align = 'left') {
  const str = String(value || 'N/A');
  const padding = Math.max(0, width - str.length);
  
  if (align === 'right') {
    return ' '.repeat(padding) + str;
  } else if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  } else {
    return str + ' '.repeat(padding);
  }
}

/**
 * Create a horizontal line for table
 */
function createLine(widths) {
  const parts = widths.map(w => '─'.repeat(w + 2));
  return '┌' + parts.join('┬') + '┐';
}

function createMiddleLine(widths) {
  const parts = widths.map(w => '─'.repeat(w + 2));
  return '├' + parts.join('┼') + '┤';
}

function createBottomLine(widths) {
  const parts = widths.map(w => '─'.repeat(w + 2));
  return '└' + parts.join('┴') + '┘';
}

/**
 * Create a table row
 */
function createRow(cells, widths) {
  const formatted = cells.map((cell, i) => formatCell(cell, widths[i]));
  return '│ ' + formatted.join(' │ ') + ' │';
}

/**
 * Get application health summary
 */
async function getApplicationHealth() {
  try {
    // Get database status
    const dbCheck = await pool.query('SELECT 1 as health');
    const dbStatus = dbCheck.rows.length > 0 ? 'healthy' : 'error';
    
    // Get Redis status (if available)
    let redisStatus = 'unknown';
    try {
      const redis = require('../../config/redis');
      if (redis.client) {
        if (typeof redis.client.isReady === 'function') {
          redisStatus = redis.client.isReady() ? 'healthy' : 'degraded';
        } else if (redis.client.status === 'ready') {
          redisStatus = 'healthy';
        } else {
          redisStatus = redis.client.status || 'unknown';
        }
      } else {
        redisStatus = 'unavailable';
      }
    } catch (e) {
      redisStatus = 'unavailable';
    }
    
    // Count active services
    const services = await serviceHealthService.getAllServiceHealth();
    const healthyServices = services.filter(s => s.health_status === 'healthy').length;
    const totalServices = services.length;
    
    // Get API call stats (last 24h)
    let apiStats = [];
    try {
      apiStats = await apiTrackingService.getApiCallStats('24h');
    } catch (error) {
      // API stats are optional
      console.warn('Unable to fetch API stats:', error.message);
    }
    const totalApiCalls = apiStats.reduce((sum, stat) => sum + parseInt(stat.total_calls || 0), 0);
    const successfulCalls = apiStats.reduce((sum, stat) => sum + parseInt(stat.successful_calls || 0), 0);
    const failedCalls = apiStats.reduce((sum, stat) => sum + parseInt(stat.failed_calls || 0), 0);
    
    return {
      database: dbStatus,
      redis: redisStatus,
      services: {
        healthy: healthyServices,
        total: totalServices,
        status: healthyServices === totalServices ? 'healthy' : 'degraded'
      },
      apis: {
        totalCalls: totalApiCalls,
        successful: successfulCalls,
        failed: failedCalls,
        successRate: totalApiCalls > 0 ? ((successfulCalls / totalApiCalls) * 100).toFixed(1) : '0.0'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  } catch (error) {
    console.error('Error getting application health:', error);
    return null;
  }
}

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format memory usage
 */
function formatMemory(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Display services status table
 */
async function displayServicesTable() {
  try {
    let services = [];
    try {
      services = await serviceHealthService.getAllServiceHealth();
    } catch (error) {
      console.log(colorize('  Unable to fetch service health data', 'yellow'));
      return;
    }
    
    if (services.length === 0) {
      console.log(colorize('No services found', 'yellow'));
      return;
    }
    
    // Define column widths
    const widths = [25, 12, 12, 15, 12, 10];
    const headers = ['Service Name', 'Status', 'Health', 'Last Check', 'Response', 'Type'];
    
    console.log('\n' + colorize('📊 SERVICES STATUS', 'bright') + '\n');
    console.log(createLine(widths));
    console.log(createRow(headers, widths));
    console.log(createMiddleLine(widths));
    
    for (const service of services) {
      const name = service.serviceInfo?.name || service.service_name;
      const status = service.status || 'unknown';
      const health = service.health_status || 'unknown';
      const lastCheck = service.last_check 
        ? new Date(service.last_check).toLocaleTimeString()
        : 'Never';
      const responseTime = service.response_time_ms 
        ? `${service.response_time_ms}ms`
        : 'N/A';
      const type = service.service_type || 'unknown';
      
      const statusColor = getStatusColor(status);
      const healthColor = getStatusColor(health);
      
      const row = [
        name,
        colorize(status, statusColor),
        colorize(health, healthColor),
        lastCheck,
        responseTime,
        type
      ];
      
      console.log(createRow(row, widths));
    }
    
    console.log(createBottomLine(widths));
  } catch (error) {
    console.error('Error displaying services table:', error);
  }
}

/**
 * Display API status table
 */
async function displayApiTable() {
  try {
    let apiStats = [];
    let quotaUsage = [];
    
    try {
      apiStats = await apiTrackingService.getApiCallStats('24h');
    } catch (error) {
      console.log(colorize('  Unable to fetch API stats', 'yellow'));
      return;
    }
    
    try {
      quotaUsage = await apiTrackingService.getQuotaUsage();
    } catch (error) {
      // Quota usage is optional, continue without it
      console.log(colorize('  Unable to fetch quota usage', 'dim'));
    }
    
    if (apiStats.length === 0) {
      console.log(colorize('No API calls in last 24h', 'yellow'));
      return;
    }
    
    // Create a map of quota usage by provider
    const quotaMap = new Map();
    quotaUsage.forEach(q => {
      quotaMap.set(q.api_provider, q);
    });
    
    // Define column widths
    const widths = [20, 12, 10, 10, 12, 12, 10];
    const headers = ['API Provider', 'Total Calls', 'Success', 'Failed', 'Avg Time', 'Quota Used', 'Status'];
    
    console.log('\n' + colorize('🔌 API STATUS (Last 24h)', 'bright') + '\n');
    console.log(createLine(widths));
    console.log(createRow(headers, widths));
    console.log(createMiddleLine(widths));
    
    for (const stat of apiStats) {
      const provider = stat.api_provider || 'unknown';
      const totalCalls = parseInt(stat.total_calls || 0);
      const successful = parseInt(stat.successful_calls || 0);
      const failed = parseInt(stat.failed_calls || 0);
      const avgTime = stat.avg_response_time 
        ? `${Math.round(parseFloat(stat.avg_response_time))}ms`
        : 'N/A';
      
      // Get quota info
      const quota = quotaMap.get(provider);
      let quotaUsed = 'N/A';
      let quotaStatus = 'unknown';
      
      if (quota) {
        const used = parseFloat(quota.quota_used || 0);
        const limit = parseFloat(quota.quota_limit || 0);
        const percent = limit > 0 ? (used / limit * 100).toFixed(1) : '0.0';
        quotaUsed = `${percent}%`;
        
        if (percent >= 90) quotaStatus = 'error';
        else if (percent >= 75) quotaStatus = 'warning';
        else quotaStatus = 'healthy';
      }
      
      const statusColor = getStatusColor(quotaStatus);
      
      const row = [
        provider,
        totalCalls,
        colorize(successful, 'green'),
        colorize(failed, failed > 0 ? 'red' : 'gray'),
        avgTime,
        quotaUsed,
        colorize(quotaStatus, statusColor)
      ];
      
      console.log(createRow(row, widths));
    }
    
    console.log(createBottomLine(widths));
  } catch (error) {
    console.error('Error displaying API table:', error);
  }
}

/**
 * Display application health summary
 */
async function displayApplicationHealth() {
  try {
    const health = await getApplicationHealth();
    
    if (!health) {
      console.log(colorize('Unable to get application health', 'red'));
      return;
    }
    
    console.log('\n' + colorize('🏥 APPLICATION HEALTH', 'bright') + '\n');
    
    const dbColor = getStatusColor(health.database);
    const redisColor = getStatusColor(health.redis);
    const servicesColor = getStatusColor(health.services.status);
    
    console.log(`  Database:        ${colorize(health.database.toUpperCase(), dbColor)}`);
    console.log(`  Redis:           ${colorize(health.redis.toUpperCase(), redisColor)}`);
    console.log(`  Services:        ${colorize(`${health.services.healthy}/${health.services.total} healthy`, servicesColor)}`);
    console.log(`  API Calls (24h): ${health.apis.totalCalls} (${health.apis.successful} success, ${health.apis.failed} failed)`);
    console.log(`  API Success Rate: ${colorize(`${health.apis.successRate}%`, health.apis.successRate >= 95 ? 'green' : health.apis.successRate >= 80 ? 'yellow' : 'red')}`);
    console.log(`  Uptime:          ${formatUptime(health.uptime)}`);
    console.log(`  Memory:          ${formatMemory(health.memory.heapUsed)} / ${formatMemory(health.memory.heapTotal)}`);
    console.log(`  Environment:     ${colorize(process.env.NODE_ENV || 'development', 'cyan')}`);
    
    console.log('');
  } catch (error) {
    console.error('Error displaying application health:', error);
  }
}

/**
 * Display complete status dashboard
 */
async function displayStatusDashboard() {
  try {
    // Clear screen (optional - can be removed if you want to keep history)
    // console.clear();
    
    console.log('\n' + '═'.repeat(80));
    console.log(colorize('  APPLICATION STATUS DASHBOARD', 'bright') + ' ' + colorize(new Date().toLocaleString(), 'dim'));
    console.log('═'.repeat(80));
    
    await displayApplicationHealth();
    await displayServicesTable();
    await displayApiTable();
    
    console.log('\n' + '═'.repeat(80) + '\n');
  } catch (error) {
    console.error(colorize('Error displaying status dashboard:', 'red'), error.message);
  }
}

/**
 * Start periodic status logging
 */
let statusInterval = null;

function startStatusLogging(intervalMinutes = 5) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Display immediately
  displayStatusDashboard();
  
  // Set up periodic display
  statusInterval = setInterval(() => {
    displayStatusDashboard();
  }, intervalMs);
  
  console.log(colorize(`✅ Status logging started (updating every ${intervalMinutes} minutes)`, 'green'));
}

function stopStatusLogging() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
    console.log(colorize('🛑 Status logging stopped', 'yellow'));
  }
}

module.exports = {
  displayStatusDashboard,
  displayServicesTable,
  displayApiTable,
  displayApplicationHealth,
  startStatusLogging,
  stopStatusLogging,
  getApplicationHealth,
};

