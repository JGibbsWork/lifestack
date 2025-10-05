/**
 * Strava Service - Controller
 * Request handlers with caching logic
 */

const { cache } = require('../../shared/middleware/cache');
const { createStravaClient } = require('./client');

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  ATHLETE: 60 * 60,        // 1 hour
  ACTIVITIES: 15 * 60,     // 15 minutes
  ACTIVITY: 60 * 60,       // 1 hour
  STATS: 60 * 60          // 1 hour
};

// Cache key prefixes
const CACHE_KEYS = {
  ATHLETE: 'strava:athlete',
  ACTIVITIES: 'strava:activities',
  ACTIVITY: 'strava:activity',
  STATS: 'strava:stats'
};

/**
 * Get cached data or fetch from Strava
 * @param {string} cacheKey - Cache key
 * @param {number} duration - Cache duration in seconds
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @returns {Promise<Object>} Data from cache or API
 * @private
 */
async function getCachedOrFetch(cacheKey, duration, fetchFn) {
  // Try to get from cache
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return { data: cached, fromCache: true };
  }

  console.log(`⚠️  Cache miss: ${cacheKey}`);

  // Fetch from Strava API
  const data = await fetchFn();

  // Cache the result
  cache.set(cacheKey, data, duration);

  return { data, fromCache: false };
}

/**
 * Get athlete profile
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAthlete(req, res) {
  try {
    const stravaClient = createStravaClient();

    const result = await getCachedOrFetch(
      CACHE_KEYS.ATHLETE,
      CACHE_DURATIONS.ATHLETE,
      () => stravaClient.getAthlete()
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      athlete: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to fetch athlete profile');
  }
}

/**
 * Get athlete activities with pagination
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getActivities(req, res) {
  try {
    const stravaClient = createStravaClient();

    // Parse query parameters
    const params = {
      page: parseInt(req.query.page) || 1,
      per_page: Math.min(parseInt(req.query.per_page) || 30, 200),
      ...(req.query.before && { before: parseInt(req.query.before) }),
      ...(req.query.after && { after: parseInt(req.query.after) })
    };

    // Create cache key based on query params
    const cacheKey = `${CACHE_KEYS.ACTIVITIES}:${JSON.stringify(params)}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.ACTIVITIES,
      () => stravaClient.getActivities(params)
    );

    // Normalize activities
    const normalized = stravaClient.normalizeActivities(result.data);

    res.json({
      success: true,
      fromCache: result.fromCache,
      count: normalized.length,
      page: params.page,
      per_page: params.per_page,
      activities: normalized
    });

  } catch (error) {
    handleError(res, error, 'Failed to fetch activities');
  }
}

/**
 * Get a specific activity by ID
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getActivity(req, res) {
  try {
    const { id } = req.params;
    const stravaClient = createStravaClient();

    // Validate activity ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid activity ID'
      });
    }

    const cacheKey = `${CACHE_KEYS.ACTIVITY}:${id}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.ACTIVITY,
      () => stravaClient.getActivity(id)
    );

    // Normalize activity
    const normalized = stravaClient.normalizeActivity(result.data);

    res.json({
      success: true,
      fromCache: result.fromCache,
      activity: normalized,
      raw: result.data // Include raw data for additional details
    });

  } catch (error) {
    handleError(res, error, `Failed to fetch activity ${req.params.id}`);
  }
}

/**
 * Get athlete statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAthleteStats(req, res) {
  try {
    const stravaClient = createStravaClient();
    const athleteId = req.query.athleteId || 'current';

    const cacheKey = `${CACHE_KEYS.STATS}:${athleteId}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.STATS,
      () => stravaClient.getAthleteStats(athleteId)
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      stats: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to fetch athlete stats');
  }
}

/**
 * Get recent activities (helper endpoint)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getRecentActivities(req, res) {
  try {
    const stravaClient = createStravaClient();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const cacheKey = `${CACHE_KEYS.ACTIVITIES}:recent:${limit}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.ACTIVITIES,
      () => stravaClient.getActivities({ page: 1, per_page: limit })
    );

    // Normalize activities
    const normalized = stravaClient.normalizeActivities(result.data);

    res.json({
      success: true,
      fromCache: result.fromCache,
      count: normalized.length,
      limit,
      activities: normalized
    });

  } catch (error) {
    handleError(res, error, 'Failed to fetch recent activities');
  }
}

/**
 * Clear Strava cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const stravaKeys = keys.filter(key => key.startsWith('strava:'));

    if (stravaKeys.length > 0) {
      cache.del(stravaKeys);
      console.log(`🗑️  Cleared ${stravaKeys.length} Strava cache entries`);
    }

    res.json({
      success: true,
      message: 'Strava cache cleared successfully',
      keysCleared: stravaKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing Strava cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Get cache statistics for Strava
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCacheStats(req, res) {
  try {
    const keys = cache.keys();
    const stravaKeys = keys.filter(key => key.startsWith('strava:'));

    const stats = {
      totalKeys: stravaKeys.length,
      cacheDurations: CACHE_DURATIONS,
      keys: stravaKeys
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error.message
    });
  }
}

/**
 * Handle errors consistently
 * @param {Object} res - Express response
 * @param {Error} error - Error object
 * @param {string} message - Error message
 * @private
 */
function handleError(res, error, message) {
  console.error(`❌ ${message}:`, error.message);

  // Use error status if available, otherwise 500
  const status = error.status || 500;

  const response = {
    success: false,
    error: message,
    message: error.message
  };

  // Add specific error flags
  if (error.rateLimitExceeded) {
    response.rateLimitExceeded = true;
    response.retryAfter = '15 minutes';
    response.message = 'Strava API rate limit exceeded. Limits: 200 requests per 15 minutes, 2000 per day';
  }

  if (error.needsRefresh) {
    response.needsRefresh = true;
    response.message = 'Strava access token needs to be refreshed. Run: node services/strava/oauth-setup.js';
  }

  res.status(status).json(response);
}

module.exports = {
  getAthlete,
  getActivities,
  getActivity,
  getAthleteStats,
  getRecentActivities,
  clearCache,
  getCacheStats
};
