/**
 * Pavlok API Client
 * Wrapper for Pavlok API v1
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const pavlokConfig = require('../../config/services').pavlok;

// Pavlok API configuration
const PAVLOK_BASE_URL = 'https://pavlok-mvp.herokuapp.com/api/v1';

/**
 * Pavlok API Client Class
 */
class PavlokClient {
  constructor(token = null) {
    // Use provided token or get from config
    this.token = token || pavlokConfig?.token;

    if (!this.token) {
      throw new Error('Pavlok token is required. Please set PAVLOK_TOKEN in environment variables.');
    }

    // Create configured API client
    this.client = createApiClient({
      baseURL: PAVLOK_BASE_URL,
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Trigger a beep stimulus
   * @param {number} intensity - Intensity level (1-4)
   * @returns {Promise<Object>} Response data
   */
  async beep(intensity) {
    return this._sendStimulus('beep', intensity);
  }

  /**
   * Trigger a vibration stimulus
   * @param {number} intensity - Intensity level (1-4)
   * @returns {Promise<Object>} Response data
   */
  async vibrate(intensity) {
    return this._sendStimulus('vibration', intensity);
  }

  /**
   * Trigger a shock stimulus
   * @param {number} intensity - Intensity level (1-4)
   * @returns {Promise<Object>} Response data
   */
  async shock(intensity) {
    return this._sendStimulus('shock', intensity);
  }

  /**
   * Send stimulus to Pavlok device
   * @param {string} type - Stimulus type (beep, vibration, shock)
   * @param {number} intensity - Intensity level (1-4)
   * @returns {Promise<Object>} Response data
   * @private
   */
  async _sendStimulus(type, intensity) {
    try {
      // Validate intensity
      if (!Number.isInteger(intensity) || intensity < 1 || intensity > 4) {
        throw new Error('Intensity must be an integer between 1 and 4');
      }

      // Build URL with token as query parameter
      const url = `/stimuli/${type}/${intensity}`;

      console.log(`⚡ Sending ${type} stimulus with intensity ${intensity} to Pavlok...`);

      const response = await this.client.post(url, null, {
        params: {
          token: this.token
        }
      });

      console.log(`✅ ${type} stimulus sent successfully`);

      return {
        success: true,
        type,
        intensity,
        response: response.data
      };

    } catch (error) {
      this._handleError(error, `Failed to send ${type} stimulus`);
    }
  }

  /**
   * Validate stimulus parameters
   * @param {number} intensity - Intensity level
   * @returns {Object} Validation result { valid: boolean, error?: string }
   */
  validateIntensity(intensity) {
    if (intensity === undefined || intensity === null) {
      return { valid: false, error: 'Intensity is required' };
    }

    if (!Number.isInteger(intensity)) {
      return { valid: false, error: 'Intensity must be an integer' };
    }

    if (intensity < 1 || intensity > 4) {
      return { valid: false, error: 'Intensity must be between 1 and 4' };
    }

    return { valid: true };
  }

  /**
   * Handle API errors with proper formatting
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   * @throws {Error} Formatted error
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Pavlok API Error: ${message}`, error.message);

    if (error.response) {
      const status = error.response.status;
      const pavlokError = error.response.data;

      // Handle unauthorized
      if (status === 401 || status === 403) {
        const formattedError = new Error('Invalid or expired Pavlok token');
        formattedError.status = 401;
        throw formattedError;
      }

      // Handle not found (invalid endpoint)
      if (status === 404) {
        const formattedError = new Error('Invalid Pavlok API endpoint');
        formattedError.status = 404;
        throw formattedError;
      }

      // Handle bad request
      if (status === 400) {
        const formattedError = new Error(pavlokError.message || 'Invalid request parameters');
        formattedError.status = 400;
        throw formattedError;
      }

      // Generic API error
      const formattedError = new Error(pavlokError.message || message);
      formattedError.status = status;
      formattedError.data = pavlokError;
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
 * Create a Pavlok client instance
 * @param {string} token - Optional token override
 * @returns {PavlokClient} Pavlok client instance
 */
function createPavlokClient(token = null) {
  return new PavlokClient(token);
}

module.exports = {
  PavlokClient,
  createPavlokClient
};
