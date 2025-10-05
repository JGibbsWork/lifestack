/**
 * Strava Token Store
 * Manages OAuth tokens in .strava-tokens.json file
 */

const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '../../.strava-tokens.json');

/**
 * Save tokens to file
 * @param {Object} tokenData - Token data to save
 * @param {string} tokenData.access_token - Access token
 * @param {string} tokenData.refresh_token - Refresh token
 * @param {number} tokenData.expires_at - Unix timestamp when token expires
 */
function saveTokens(tokenData) {
  try {
    const data = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      updated_at: new Date().toISOString()
    };

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Strava tokens saved successfully');
  } catch (error) {
    console.error('❌ Failed to save Strava tokens:', error.message);
    throw error;
  }
}

/**
 * Load tokens from file
 * @returns {Object|null} Token data or null if file doesn't exist
 */
function loadTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }

    const data = fs.readFileSync(TOKEN_FILE, 'utf8');
    const tokens = JSON.parse(data);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at
    };
  } catch (error) {
    console.error('❌ Failed to load Strava tokens:', error.message);
    return null;
  }
}

module.exports = {
  saveTokens,
  loadTokens
};
