/**
 * Notion Service - Controller
 * Request handlers with caching logic
 */

const { cache } = require('../../shared/middleware/cache');
const { createNotionClient } = require('./client');

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  SEARCH: 5 * 60,          // 5 minutes
  DATABASE: 30 * 60,       // 30 minutes
  PAGE: 10 * 60,           // 10 minutes
  CONTENT: 10 * 60         // 10 minutes
};

// Cache key prefixes
const CACHE_KEYS = {
  SEARCH: 'notion:search',
  DATABASE: 'notion:database',
  DATABASE_QUERY: 'notion:db_query',
  PAGE: 'notion:page',
  CONTENT: 'notion:content',
  RECENT: 'notion:recent'
};

/**
 * Get cached data or fetch from Notion
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

  // Fetch from Notion API
  const data = await fetchFn();

  // Cache the result
  cache.set(cacheKey, data, duration);

  return { data, fromCache: false };
}

/**
 * Search Notion for pages and databases
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function search(req, res) {
  try {
    const notionClient = createNotionClient();
    const { query, filter, sort, page_size } = req.body;

    // Create cache key based on search params
    const cacheKey = `${CACHE_KEYS.SEARCH}:${JSON.stringify({ query, filter, sort })}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.SEARCH,
      () => notionClient.search({ query, filter, sort, page_size })
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      results: result.data.results,
      has_more: result.data.has_more,
      next_cursor: result.data.next_cursor
    });

  } catch (error) {
    handleError(res, error, 'Failed to search Notion');
  }
}

/**
 * Quick search (simplified)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function quickSearch(req, res) {
  try {
    const notionClient = createNotionClient();
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const cacheKey = `${CACHE_KEYS.SEARCH}:quick:${query}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.SEARCH,
      () => notionClient.quickSearch(query)
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      query,
      count: result.data.length,
      results: result.data
    });

  } catch (error) {
    handleError(res, error, 'Failed to perform quick search');
  }
}

/**
 * Get database schema
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getDatabase(req, res) {
  try {
    const { id } = req.params;
    const notionClient = createNotionClient();

    const cacheKey = `${CACHE_KEYS.DATABASE}:${id}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.DATABASE,
      () => notionClient.getDatabase(id)
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      database: result.data
    });

  } catch (error) {
    handleError(res, error, `Failed to get database ${req.params.id}`);
  }
}

/**
 * Query a database
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function queryDatabase(req, res) {
  try {
    const { id } = req.params;
    const notionClient = createNotionClient();
    const { filter, sorts, page_size, start_cursor } = req.body;

    // Create cache key based on query params
    const cacheKey = `${CACHE_KEYS.DATABASE_QUERY}:${id}:${JSON.stringify({ filter, sorts })}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.PAGE, // Use page duration for queries
      () => notionClient.queryDatabase(id, { filter, sorts, page_size, start_cursor })
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      results: result.data.results,
      has_more: result.data.has_more,
      next_cursor: result.data.next_cursor
    });

  } catch (error) {
    handleError(res, error, `Failed to query database ${req.params.id}`);
  }
}

/**
 * Get recent database entries
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getRecentEntries(req, res) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const notionClient = createNotionClient();

    const cacheKey = `${CACHE_KEYS.RECENT}:${id}:${limit}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.PAGE,
      () => notionClient.getRecentEntries(id, limit)
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      count: result.data.results.length,
      results: result.data.results
    });

  } catch (error) {
    handleError(res, error, `Failed to get recent entries from ${req.params.id}`);
  }
}

/**
 * Get a page
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPage(req, res) {
  try {
    const { id } = req.params;
    const notionClient = createNotionClient();

    const cacheKey = `${CACHE_KEYS.PAGE}:${id}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.PAGE,
      () => notionClient.getPage(id)
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      page: result.data
    });

  } catch (error) {
    handleError(res, error, `Failed to get page ${req.params.id}`);
  }
}

/**
 * Get page content (blocks)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPageContent(req, res) {
  try {
    const { id } = req.params;
    const notionClient = createNotionClient();
    const { page_size, start_cursor } = req.query;

    const cacheKey = `${CACHE_KEYS.CONTENT}:${id}`;

    const result = await getCachedOrFetch(
      cacheKey,
      CACHE_DURATIONS.CONTENT,
      () => notionClient.getBlockChildren(id, { page_size, start_cursor })
    );

    res.json({
      success: true,
      fromCache: result.fromCache,
      blocks: result.data.results,
      has_more: result.data.has_more,
      next_cursor: result.data.next_cursor
    });

  } catch (error) {
    handleError(res, error, `Failed to get page content ${req.params.id}`);
  }
}

/**
 * Clear Notion cache
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function clearCache(req, res) {
  try {
    const keys = cache.keys();
    const notionKeys = keys.filter(key => key.startsWith('notion:'));

    if (notionKeys.length > 0) {
      cache.del(notionKeys);
      console.log(`🗑️  Cleared ${notionKeys.length} Notion cache entries`);
    }

    res.json({
      success: true,
      message: 'Notion cache cleared successfully',
      keysCleared: notionKeys.length
    });

  } catch (error) {
    console.error('❌ Error clearing Notion cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
}

/**
 * Get cache statistics for Notion
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getCacheStats(req, res) {
  try {
    const keys = cache.keys();
    const notionKeys = keys.filter(key => key.startsWith('notion:'));

    const stats = {
      totalKeys: notionKeys.length,
      cacheDurations: CACHE_DURATIONS,
      keysByType: {
        search: notionKeys.filter(k => k.startsWith(CACHE_KEYS.SEARCH)).length,
        database: notionKeys.filter(k => k.startsWith(CACHE_KEYS.DATABASE)).length,
        page: notionKeys.filter(k => k.startsWith(CACHE_KEYS.PAGE)).length,
        content: notionKeys.filter(k => k.startsWith(CACHE_KEYS.CONTENT)).length
      }
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

  const status = error.status || 500;

  const response = {
    success: false,
    error: message,
    message: error.message
  };

  // Add specific error flags
  if (error.rateLimitExceeded) {
    response.rateLimitExceeded = true;
  }

  if (error.code) {
    response.code = error.code;
  }

  res.status(status).json(response);
}

module.exports = {
  search,
  quickSearch,
  getDatabase,
  queryDatabase,
  getRecentEntries,
  getPage,
  getPageContent,
  clearCache,
  getCacheStats
};
