/**
 * Strava API Client
 * Wrapper for Strava API v3 with OAuth 2.0 token refresh
 */

const axios = require('axios');
const { createApiClient } = require('../../shared/utils/apiClient');
const { loadTokens, saveTokens } = require('./tokenStore');

// Strava API configuration
const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const TOKEN_REFRESH_BUFFER = 300; // Refresh if expires in 5 minutes

/**
 * Strava API Client Class
 */
class StravaClient {
  constructor(accessToken = null) {
    // If explicit token provided, use it (for testing/override)
    if (accessToken) {
      this.accessToken = accessToken;
      this.manualToken = true;
      this._initializeClient();
      return;
    }

    // Load tokens from file
    const tokens = loadTokens();
    if (!tokens) {
      throw new Error('Strava tokens not found. Run: node services/strava/oauth-setup.js');
    }

    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.expiresAt = tokens.expires_at;
    this.manualToken = false;

    // Initialize API client
    this._initializeClient();
  }

  /**
   * Initialize the Axios API client with current access token
   * @private
   */
  _initializeClient() {
    this.client = createApiClient({
      baseURL: STRAVA_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      timeout: 15000 // 15 second timeout
    });
  }

  /**
   * Check if token needs refresh and refresh if necessary
   * @private
   */
  async _ensureValidToken() {
    // Skip if using manual token
    if (this.manualToken) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = this.expiresAt - now;

    // Refresh if expires in less than 5 minutes
    if (timeUntilExpiry < TOKEN_REFRESH_BUFFER) {
      console.log('🔄 Strava token expiring soon, refreshing...');
      await this._refreshToken();
    }
  }

  /**
   * Refresh the access token using refresh token
   * @private
   */
  async _refreshToken() {
    try {
      const response = await axios.post(STRAVA_TOKEN_URL, {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });

      // Update tokens (both access and refresh tokens change!)
      const tokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at
      };

      // Save to file
      saveTokens(tokenData);

      // Update instance variables
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;
      this.expiresAt = tokenData.expires_at;

      // Re-initialize client with new token
      this._initializeClient();

      console.log('✅ Strava token refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh Strava token:', error.response?.data || error.message);
      throw new Error('Token refresh failed. You may need to re-authorize: node services/strava/oauth-setup.js');
    }
  }

  /**
   * Get current authenticated athlete profile
   * @returns {Promise<Object>} Athlete data
   */
  async getAthlete() {
    await this._ensureValidToken();
    try {
      const response = await this.client.get('/athlete');
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch athlete profile');
    }
  }

  /**
   * Get athlete activities
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.per_page - Results per page (default: 30, max: 200)
   * @param {number} params.before - Epoch timestamp to filter activities before
   * @param {number} params.after - Epoch timestamp to filter activities after
   * @returns {Promise<Array>} Array of activities
   */
  async getActivities(params = {}) {
    await this._ensureValidToken();
    try {
      const queryParams = {
        page: params.page || 1,
        per_page: Math.min(params.per_page || 30, 200), // Enforce max 200
        ...(params.before && { before: params.before }),
        ...(params.after && { after: params.after })
      };

      const response = await this.client.get('/athlete/activities', {
        params: queryParams
      });

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch activities');
    }
  }

  /**
   * Get a specific activity by ID
   * @param {string|number} activityId - Activity ID
   * @param {boolean} includeAllEfforts - Include all segment efforts (default: false)
   * @returns {Promise<Object>} Activity data
   */
  async getActivity(activityId, includeAllEfforts = false) {
    await this._ensureValidToken();
    try {
      const response = await this.client.get(`/activities/${activityId}`, {
        params: {
          include_all_efforts: includeAllEfforts
        }
      });

      return response.data;
    } catch (error) {
      this._handleError(error, `Failed to fetch activity ${activityId}`);
    }
  }

  /**
   * Get athlete statistics
   * @param {string|number} athleteId - Athlete ID (use 'current' for authenticated athlete)
   * @returns {Promise<Object>} Athlete stats
   */
  async getAthleteStats(athleteId = 'current') {
    await this._ensureValidToken();
    try {
      // If 'current', fetch athlete first to get ID
      let id = athleteId;
      if (athleteId === 'current') {
        const athlete = await this.getAthlete();
        id = athlete.id;
      }

      const response = await this.client.get(`/athletes/${id}/stats`);
      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to fetch athlete stats');
    }
  }

  /**
   * Normalize activity data to consistent format
   * @param {Object} activity - Raw Strava activity
   * @returns {Object} Normalized activity
   */
  normalizeActivity(activity) {
    return {
      id: activity.id?.toString(),
      name: activity.name,
      type: activity.type || activity.sport_type,
      date: activity.start_date || activity.start_date_local,
      distance: activity.distance || 0, // meters
      duration: activity.moving_time || activity.elapsed_time || 0, // seconds
      elevation_gain: activity.total_elevation_gain || 0, // meters
      average_speed: activity.average_speed || 0, // meters/second
      max_speed: activity.max_speed || 0, // meters/second
      average_heartrate: activity.average_heartrate || null,
      max_heartrate: activity.max_heartrate || null,
      calories: activity.calories || null,
      source: 'strava'
    };
  }

  /**
   * Normalize multiple activities
   * @param {Array} activities - Array of raw Strava activities
   * @returns {Array} Array of normalized activities
   */
  normalizeActivities(activities) {
    if (!Array.isArray(activities)) {
      return [];
    }
    return activities.map(activity => this.normalizeActivity(activity));
  }

  /**
   * Handle API errors with proper formatting
   * @param {Error} error - Error object
   * @param {string} message - Custom error message
   * @throws {Error} Formatted error
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Strava API Error: ${message}`, error.message);

    // Check for specific Strava API errors
    if (error.response) {
      const status = error.response.status;
      const stravaError = error.response.data;

      // Handle rate limiting
      if (status === 429) {
        const formattedError = new Error('Strava API rate limit exceeded');
        formattedError.status = 429;
        formattedError.rateLimitExceeded = true;
        throw formattedError;
      }

      // Handle unauthorized
      if (status === 401) {
        const formattedError = new Error('Invalid or expired Strava access token');
        formattedError.status = 401;
        formattedError.needsRefresh = true;
        throw formattedError;
      }

      // Handle not found
      if (status === 404) {
        const formattedError = new Error('Resource not found');
        formattedError.status = 404;
        throw formattedError;
      }

      // Generic API error
      const formattedError = new Error(stravaError.message || message);
      formattedError.status = status;
      formattedError.data = stravaError;
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
 * Create a Strava client instance
 * @param {string} accessToken - Optional access token override
 * @returns {StravaClient} Strava client instance
 */
function createStravaClient(accessToken = null) {
  return new StravaClient(accessToken);
}

module.exports = {
  StravaClient,
  createStravaClient
};
