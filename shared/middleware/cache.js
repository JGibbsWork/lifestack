/**
 * Cache Middleware
 * In-memory caching using node-cache
 */

const NodeCache = require('node-cache');

// Initialize cache with default TTL of 5 minutes and check period of 60 seconds
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone cached data for better performance
});

/**
 * Cache middleware factory
 * Creates a middleware function that caches responses based on request URL
 * @param {number} duration - Cache duration in seconds (default: 300)
 * @returns {Function} Express middleware function
 */
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from request URL and query parameters
    const key = `__express__${req.originalUrl || req.url}`;

    // Check if cached response exists
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log(`✅ Cache hit: ${key}`);
      // Return cached response
      return res.json(cachedResponse);
    }

    console.log(`⚠️  Cache miss: ${key}`);

    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = (body) => {
      // Cache the response body
      cache.set(key, body, duration);
      // Call original json function
      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear cache by key or pattern
 * @param {string} key - Cache key or pattern to clear
 */
const clearCache = (key) => {
  if (key) {
    const deleted = cache.del(key);
    console.log(`🗑️  Cleared cache key: ${key} (${deleted} keys deleted)`);
    return deleted;
  }
  // Clear all cache
  cache.flushAll();
  console.log('🗑️  Cleared all cache');
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getCacheStats = () => {
  return cache.getStats();
};

/**
 * Get all cache keys
 * @returns {Array} Array of cache keys
 */
const getCacheKeys = () => {
  return cache.keys();
};

module.exports = {
  cache,
  cacheMiddleware,
  clearCache,
  getCacheStats,
  getCacheKeys
};
