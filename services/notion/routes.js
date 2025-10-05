/**
 * Notion Service - API Routes
 * Caching proxy for Notion API
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * POST /search
 * Search for pages and databases in Notion
 * Cached for 5 minutes
 *
 * Body:
 * {
 *   query: "search text",           // Optional: search query
 *   filter: {                        // Optional: filter results
 *     property: "object",
 *     value: "page" | "database"
 *   },
 *   sort: {                          // Optional: sort results
 *     direction: "ascending" | "descending",
 *     timestamp: "last_edited_time"
 *   },
 *   page_size: 100                   // Optional: results per page (max 100)
 * }
 */
router.post('/search', controller.search);

/**
 * POST /quick-search
 * Simplified search that returns basic info
 * Cached for 5 minutes
 *
 * Body:
 * {
 *   query: "search text"             // Required: search query
 * }
 *
 * Returns simplified results:
 * [
 *   {
 *     id: "page-id",
 *     title: "Page Title",
 *     type: "page" | "database",
 *     url: "https://notion.so/...",
 *     lastEditedTime: "2024-01-15T...",
 *     createdTime: "2024-01-01T..."
 *   }
 * ]
 */
router.post('/quick-search', controller.quickSearch);

/**
 * GET /databases/:id
 * Get database schema and properties
 * Cached for 30 minutes
 */
router.get('/databases/:id', controller.getDatabase);

/**
 * POST /databases/:id/query
 * Query a database with filters and sorts
 * Cached for 10 minutes
 *
 * Body: Notion query object (see Notion API docs)
 * {
 *   filter: {                        // Optional: filter conditions
 *     property: "Status",
 *     select: { equals: "Done" }
 *   },
 *   sorts: [                         // Optional: sort criteria
 *     {
 *       property: "Created",
 *       direction: "descending"
 *     }
 *   ],
 *   page_size: 100,                  // Optional: max 100
 *   start_cursor: "cursor-id"        // Optional: for pagination
 * }
 */
router.post('/databases/:id/query', controller.queryDatabase);

/**
 * GET /databases/:id/recent
 * Get most recent database entries (helper endpoint)
 * Cached for 10 minutes
 *
 * Query params:
 * - limit: Number of entries (default: 10, max: 100)
 */
router.get('/databases/:id/recent', controller.getRecentEntries);

/**
 * GET /pages/:id
 * Get page metadata and properties
 * Cached for 10 minutes
 */
router.get('/pages/:id', controller.getPage);

/**
 * GET /pages/:id/content
 * Get page content blocks
 * Cached for 10 minutes
 *
 * Query params:
 * - page_size: Number of blocks (max 100)
 * - start_cursor: Pagination cursor
 */
router.get('/pages/:id/content', controller.getPageContent);

/**
 * POST /cache/clear
 * Clear all Notion cache entries
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /cache/stats
 * Get Notion cache statistics
 */
router.get('/cache/stats', controller.getCacheStats);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'notion',
    status: 'ok',
    timestamp: new Date().toISOString(),
    caching: {
      search: '5 minutes',
      databases: '30 minutes',
      pages: '10 minutes',
      content: '10 minutes'
    },
    note: 'For heavy Notion usage, consider storing frequently-accessed data in MongoDB'
  });
});

module.exports = router;
