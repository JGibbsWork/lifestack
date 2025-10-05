/**
 * Stats Tracking Middleware
 * Tracks request metrics and system statistics
 */

const mongoose = require('mongoose');

// Stats storage
const stats = {
  startTime: Date.now(),
  totalRequests: 0,
  requestsByService: {},
  responseTimes: [],
  slowRequests: [],
  errors: 0
};

// Track active requests
let activeRequests = 0;

/**
 * Stats tracking middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function statsMiddleware(req, res, next) {
  const startTime = Date.now();
  activeRequests++;

  // Increment total requests
  stats.totalRequests++;

  // Track by service
  const service = req.path.split('/')[2] || 'core'; // /api/[service]/...
  if (!stats.requestsByService[service]) {
    stats.requestsByService[service] = 0;
  }
  stats.requestsByService[service]++;

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    activeRequests--;

    // Track response time
    stats.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (stats.responseTimes.length > 1000) {
      stats.responseTimes.shift();
    }

    // Log slow requests (>2 seconds)
    if (responseTime > 2000) {
      const slowRequest = {
        method: req.method,
        path: req.path,
        responseTime,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode
      };

      stats.slowRequests.push(slowRequest);

      // Keep only last 50 slow requests
      if (stats.slowRequests.length > 50) {
        stats.slowRequests.shift();
      }

      console.warn(`⚠️  SLOW REQUEST (${responseTime}ms): ${req.method} ${req.path}`);
    }

    // Track errors
    if (res.statusCode >= 400) {
      stats.errors++;
    }

    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Get current stats
 * @returns {Object} Current statistics
 */
function getStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const avgResponseTime = stats.responseTimes.length > 0
    ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
    : 0;

  return {
    uptime,
    uptimeHuman: formatUptime(uptime),
    totalRequests: stats.totalRequests,
    activeRequests,
    requestsByService: stats.requestsByService,
    averageResponseTime: avgResponseTime,
    slowRequests: stats.slowRequests.length,
    slowRequestsList: stats.slowRequests.slice(-10), // Last 10
    errors: stats.errors,
    errorRate: stats.totalRequests > 0
      ? Math.round((stats.errors / stats.totalRequests) * 100)
      : 0,
    memoryUsage: process.memoryUsage(),
    memoryUsageMB: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };
}

/**
 * Format uptime to human readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Get MongoDB stats
 * @returns {Promise<Object>} MongoDB statistics
 */
async function getMongoStats() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { connected: false };
    }

    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();

    return {
      connected: true,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections).length,
      uptime: serverStatus.uptime,
      connections: {
        current: serverStatus.connections.current,
        available: serverStatus.connections.available
      }
    };
  } catch (error) {
    console.error('Error getting MongoDB stats:', error.message);
    return { connected: true, error: error.message };
  }
}

/**
 * Reset stats (useful for testing)
 */
function resetStats() {
  stats.totalRequests = 0;
  stats.requestsByService = {};
  stats.responseTimes = [];
  stats.slowRequests = [];
  stats.errors = 0;
  stats.startTime = Date.now();
}

module.exports = {
  statsMiddleware,
  getStats,
  getMongoStats,
  resetStats
};
