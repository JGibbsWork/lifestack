/**
 * Notion API Client
 * Wrapper for Notion API v1
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const notionConfig = require('../../config/services').notion;

// Notion API configuration
const NOTION_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Notion API Client Class
 */
class NotionClient {
  constructor(token = null) {
    // Use provided token or get from config
    this.token = token || notionConfig?.token;

    if (!this.token) {
      throw new Error('Notion token is required. Please set NOTION_TOKEN in environment variables.');
    }

    // Create configured API client
    this.client = createApiClient({
      baseURL: NOTION_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });
  }

  /**
   * Search for pages and databases
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {Object} options.filter - Filter object (type: page|database)
   * @param {Object} options.sort - Sort object
   * @param {number} options.page_size - Results per page (max 100)
   * @returns {Promise<Object>} Search results
   */
  async search(options = {}) {
    try {
      const body = {
        ...(options.query && { query: options.query }),
        ...(options.filter && { filter: options.filter }),
        ...(options.sort && { sort: options.sort }),
        page_size: Math.min(options.page_size || 100, 100)
      };

      console.log(`🔍 Searching Notion: ${options.query || 'all items'}`);

      const response = await this.client.post('/search', body);
      return response.data;

    } catch (error) {
      this._handleError(error, 'Failed to search Notion');
    }
  }

  /**
   * Get a database by ID
   * @param {string} databaseId - Database ID
   * @returns {Promise<Object>} Database object
   */
  async getDatabase(databaseId) {
    try {
      console.log(`📚 Getting Notion database: ${databaseId}`);

      const response = await this.client.get(`/databases/${databaseId}`);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to get database ${databaseId}`);
    }
  }

  /**
   * Query a database
   * @param {string} databaseId - Database ID
   * @param {Object} options - Query options
   * @param {Object} options.filter - Filter conditions
   * @param {Array} options.sorts - Sort criteria
   * @param {number} options.page_size - Results per page (max 100)
   * @param {string} options.start_cursor - Pagination cursor
   * @returns {Promise<Object>} Query results
   */
  async queryDatabase(databaseId, options = {}) {
    try {
      const body = {
        ...(options.filter && { filter: options.filter }),
        ...(options.sorts && { sorts: options.sorts }),
        page_size: Math.min(options.page_size || 100, 100),
        ...(options.start_cursor && { start_cursor: options.start_cursor })
      };

      console.log(`📊 Querying Notion database: ${databaseId}`);

      const response = await this.client.post(`/databases/${databaseId}/query`, body);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to query database ${databaseId}`);
    }
  }

  /**
   * Get a page by ID
   * @param {string} pageId - Page ID
   * @returns {Promise<Object>} Page object
   */
  async getPage(pageId) {
    try {
      console.log(`📄 Getting Notion page: ${pageId}`);

      const response = await this.client.get(`/pages/${pageId}`);
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to get page ${pageId}`);
    }
  }

  /**
   * Get block children (page content)
   * @param {string} blockId - Block/Page ID
   * @param {Object} options - Options
   * @param {number} options.page_size - Results per page (max 100)
   * @param {string} options.start_cursor - Pagination cursor
   * @returns {Promise<Object>} Block children
   */
  async getBlockChildren(blockId, options = {}) {
    try {
      const params = {
        page_size: Math.min(options.page_size || 100, 100),
        ...(options.start_cursor && { start_cursor: options.start_cursor })
      };

      console.log(`📦 Getting Notion block children: ${blockId}`);

      const response = await this.client.get(`/blocks/${blockId}/children`, {
        params
      });
      return response.data;

    } catch (error) {
      this._handleError(error, `Failed to get block children ${blockId}`);
    }
  }

  /**
   * Get recent database entries
   * @param {string} databaseId - Database ID
   * @param {number} limit - Number of entries (default 10)
   * @returns {Promise<Object>} Recent entries
   */
  async getRecentEntries(databaseId, limit = 10) {
    try {
      const options = {
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending'
          }
        ],
        page_size: Math.min(limit, 100)
      };

      return await this.queryDatabase(databaseId, options);

    } catch (error) {
      this._handleError(error, `Failed to get recent entries from ${databaseId}`);
    }
  }

  /**
   * Simplified search that returns basic info
   * @param {string} query - Search query
   * @returns {Promise<Array>} Simplified results
   */
  async quickSearch(query) {
    try {
      const results = await this.search({ query, page_size: 20 });

      // Simplify the results
      const simplified = results.results.map(item => {
        let title = 'Untitled';

        // Extract title based on type
        if (item.object === 'page') {
          // Try to get title from properties
          const titleProp = Object.values(item.properties || {}).find(
            prop => prop.type === 'title'
          );
          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        } else if (item.object === 'database') {
          // Database title
          if (item.title?.[0]?.plain_text) {
            title = item.title[0].plain_text;
          }
        }

        return {
          id: item.id,
          title,
          type: item.object,
          url: item.url,
          lastEditedTime: item.last_edited_time,
          createdTime: item.created_time
        };
      });

      return simplified;

    } catch (error) {
      this._handleError(error, 'Failed to perform quick search');
    }
  }

  /**
   * Handle API errors with proper formatting
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   * @throws {Error} Formatted error
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Notion API Error: ${message}`, error.message);

    if (error.response) {
      const status = error.response.status;
      const notionError = error.response.data;

      // Handle unauthorized
      if (status === 401) {
        const formattedError = new Error('Invalid or expired Notion token');
        formattedError.status = 401;
        throw formattedError;
      }

      // Handle forbidden (insufficient permissions)
      if (status === 403) {
        const formattedError = new Error('Insufficient permissions to access this Notion resource');
        formattedError.status = 403;
        throw formattedError;
      }

      // Handle not found
      if (status === 404) {
        const formattedError = new Error('Notion resource not found');
        formattedError.status = 404;
        throw formattedError;
      }

      // Handle rate limiting
      if (status === 429) {
        const formattedError = new Error('Notion API rate limit exceeded');
        formattedError.status = 429;
        formattedError.rateLimitExceeded = true;
        throw formattedError;
      }

      // Handle bad request
      if (status === 400) {
        const formattedError = new Error(notionError.message || 'Invalid request to Notion API');
        formattedError.status = 400;
        formattedError.code = notionError.code;
        throw formattedError;
      }

      // Generic API error
      const formattedError = new Error(notionError.message || message);
      formattedError.status = status;
      formattedError.code = notionError.code;
      formattedError.data = notionError;
      throw formattedError;
    }

    // Network or other errors
    const formattedError = new Error(message);
    formattedError.status = 500;
    formattedError.originalError = error.message;
    throw formattedError;
  }
}

/**
 * Create a Notion client instance
 * @param {string} token - Optional token override
 * @returns {NotionClient} Notion client instance
 */
function createNotionClient(token = null) {
  return new NotionClient(token);
}

module.exports = {
  NotionClient,
  createNotionClient
};
