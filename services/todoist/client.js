/**
 * Todoist API Client
 * Wrapper for Todoist REST API v2
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const todoistConfig = require('../../config/services').todoist;

// Todoist API configuration
const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2';

/**
 * Todoist API Client Class
 */
class TodoistClient {
  constructor(token = null) {
    this.token = token || todoistConfig?.token;

    if (!this.token) {
      throw new Error('Todoist token is required. Please set TODOIST_TOKEN in environment variables.');
    }

    this.client = createApiClient({
      baseURL: TODOIST_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      timeout: 10000
    });
  }

  /**
   * Get all tasks
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of tasks
   */
  async getTasks(options = {}) {
    try {
      const params = {
        ...(options.project_id && { project_id: options.project_id }),
        ...(options.filter && { filter: options.filter })
      };

      const response = await this.client.get('/tasks', { params });
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch tasks');
    }
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of projects
   */
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch projects');
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Todoist API Error: ${message}`, error.message);

    if (error.response) {
      const status = error.response.status;
      const formattedError = new Error(error.response.data?.error || message);
      formattedError.status = status;
      throw formattedError;
    }

    const formattedError = new Error(message);
    formattedError.status = 500;
    throw formattedError;
  }
}

function createTodoistClient(token = null) {
  return new TodoistClient(token);
}

module.exports = {
  TodoistClient,
  createTodoistClient
};
