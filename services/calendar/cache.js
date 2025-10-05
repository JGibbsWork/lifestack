/**
 * Calendar Service - Cache Management
 * Handles caching of calendar events with date-based keys
 */

const { cache } = require('../../shared/middleware/cache');

// Cache configuration
const CACHE_DURATION = parseInt(process.env.CALENDAR_CACHE_DURATION) || 15 * 60; // 15 minutes in seconds
const CACHE_PREFIX = 'calendar:events:';

/**
 * Generate cache key for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {string} Cache key
 */
function getCacheKey(dateKey) {
  return `${CACHE_PREFIX}${dateKey}`;
}

/**
 * Get cached events for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Array|null} Cached events or null if not found/expired
 */
function getCachedEvents(dateKey) {
  const key = getCacheKey(dateKey);
  const cachedData = cache.get(key);

  if (cachedData) {
    console.log(`✅ Cache hit for date: ${dateKey}`);
    return cachedData;
  }

  console.log(`⚠️  Cache miss for date: ${dateKey}`);
  return null;
}

/**
 * Store events in cache for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {Array} events - Events to cache
 * @returns {boolean} Success status
 */
function setCachedEvents(dateKey, events) {
  const key = getCacheKey(dateKey);
  const success = cache.set(key, events, CACHE_DURATION);

  if (success) {
    console.log(`✅ Cached ${events.length} events for date: ${dateKey} (TTL: ${CACHE_DURATION}s)`);
  } else {
    console.error(`❌ Failed to cache events for date: ${dateKey}`);
  }

  return success;
}

/**
 * Clear cache for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {number} Number of keys deleted
 */
function clearDateCache(dateKey) {
  const key = getCacheKey(dateKey);
  const deleted = cache.del(key);
  console.log(`🗑️  Cleared cache for date: ${dateKey}`);
  return deleted;
}

/**
 * Clear all calendar event caches
 * @returns {void}
 */
function clearAllCalendarCache() {
  const keys = cache.keys();
  const calendarKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

  if (calendarKeys.length > 0) {
    cache.del(calendarKeys);
    console.log(`🗑️  Cleared ${calendarKeys.length} calendar cache entries`);
  } else {
    console.log('ℹ️  No calendar cache entries to clear');
  }
}

/**
 * Get cache statistics for calendar events
 * @returns {Object} Cache statistics
 */
function getCalendarCacheStats() {
  const stats = cache.getStats();
  const keys = cache.keys();
  const calendarKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

  return {
    totalKeys: stats.keys,
    calendarKeys: calendarKeys.length,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0,
    cacheDuration: CACHE_DURATION
  };
}

module.exports = {
  getCachedEvents,
  setCachedEvents,
  clearDateCache,
  clearAllCalendarCache,
  getCalendarCacheStats,
  CACHE_DURATION
};
