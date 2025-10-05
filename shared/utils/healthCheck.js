/**
 * Health Check Utilities
 * Checks connectivity to external services
 */

const mongoose = require('mongoose');
const { createTodoistClient } = require('../../services/todoist/client');
const { createStravaClient } = require('../../services/strava/client');
const { cache, getCacheStats } = require('../middleware/cache');

/**
 * Check MongoDB connection
 * @returns {Promise<Object>} Connection status
 */
async function checkMongoDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Try a simple query
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        connected: true,
        host: mongoose.connection.host,
        database: mongoose.connection.name
      };
    } else {
      return {
        status: 'unhealthy',
        connected: false,
        error: 'Not connected'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
  }
}

/**
 * Check Google Calendar API
 * @returns {Promise<Object>} API status
 */
async function checkGoogleCalendar() {
  try {
    const { getCalendar, isAuthenticated } = require('../../services/calendar/auth');

    if (!isAuthenticated()) {
      return {
        status: 'degraded',
        available: false,
        error: 'Not initialized'
      };
    }

    // Quick check - just verify client exists
    const calendar = getCalendar();

    return {
      status: 'healthy',
      available: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      available: false,
      error: error.message
    };
  }
}

/**
 * Check Todoist API
 * @returns {Promise<Object>} API status
 */
async function checkTodoist() {
  try {
    const todoistClient = createTodoistClient();

    // Quick check - just verify client can be created
    return {
      status: 'healthy',
      available: true
    };
  } catch (error) {
    return {
      status: 'degraded',
      available: false,
      error: error.message
    };
  }
}

/**
 * Check Strava API
 * @returns {Promise<Object>} API status
 */
async function checkStrava() {
  try {
    const stravaClient = createStravaClient();

    // Quick check - just verify client can be created
    return {
      status: 'healthy',
      available: true
    };
  } catch (error) {
    return {
      status: 'degraded',
      available: false,
      error: error.message
    };
  }
}

/**
 * Check cache status
 * @returns {Object} Cache status
 */
function checkCache() {
  try {
    const stats = cache.getStats();

    return {
      status: 'healthy',
      entries: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Perform comprehensive health check
 * @returns {Promise<Object>} Complete health status
 */
async function performHealthCheck() {
  // Run all checks in parallel
  const [mongodb, googleCalendar, todoist, strava] = await Promise.allSettled([
    checkMongoDB(),
    checkGoogleCalendar(),
    checkTodoist(),
    checkStrava()
  ]);

  const cacheStatus = checkCache();

  // Determine overall status
  const services = {
    mongodb: mongodb.status === 'fulfilled' ? mongodb.value : { status: 'unhealthy', error: mongodb.reason?.message },
    googleCalendar: googleCalendar.status === 'fulfilled' ? googleCalendar.value : { status: 'unhealthy', error: googleCalendar.reason?.message },
    todoist: todoist.status === 'fulfilled' ? todoist.value : { status: 'unhealthy', error: todoist.reason?.message },
    strava: strava.status === 'fulfilled' ? strava.value : { status: 'unhealthy', error: strava.reason?.message },
    cache: cacheStatus
  };

  // Calculate overall status
  const statuses = Object.values(services).map(s => s.status);
  let overallStatus = 'healthy';

  if (statuses.includes('unhealthy')) {
    // If MongoDB is unhealthy, system is unhealthy
    if (services.mongodb.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else {
      // Otherwise degraded if any service is unhealthy
      overallStatus = 'degraded';
    }
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  // Count services up/down
  const servicesUp = statuses.filter(s => s === 'healthy').length;
  const servicesDown = statuses.filter(s => s === 'unhealthy').length;
  const servicesDegraded = statuses.filter(s => s === 'degraded').length;

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    services,
    summary: {
      total: Object.keys(services).length,
      healthy: servicesUp,
      degraded: servicesDegraded,
      unhealthy: servicesDown
    }
  };
}

module.exports = {
  checkMongoDB,
  checkGoogleCalendar,
  checkTodoist,
  checkStrava,
  checkCache,
  performHealthCheck
};
