/**
 * Calendar Service - Google OAuth Authentication
 * Handles Google Calendar API authentication and token management
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Paths for credentials and token
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || path.join(__dirname, '../../token.json');

let oAuth2Client = null;
let calendarInstance = null;

/**
 * Initialize Google OAuth2 client
 * @returns {Promise<Object>} OAuth2 client instance
 */
async function initializeGoogleAuth() {
  try {
    // Load credentials from file
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(`Credentials file not found at ${CREDENTIALS_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

    if (!client_id || !client_secret || !redirect_uris) {
      throw new Error('Invalid credentials file format');
    }

    // Create OAuth2 client
    oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Load existing token
    if (!fs.existsSync(TOKEN_PATH)) {
      throw new Error(`Token file not found at ${TOKEN_PATH}. Please run OAuth setup first.`);
    }

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    // Auto-refresh token handling
    oAuth2Client.on('tokens', (tokens) => {
      console.log('🔄 Refreshing Google OAuth tokens...');

      // Update token file with new access token
      if (tokens.refresh_token) {
        token.refresh_token = tokens.refresh_token;
      }
      token.access_token = tokens.access_token;
      token.expiry_date = tokens.expiry_date;

      try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
        console.log('✅ OAuth tokens refreshed and saved');
      } catch (error) {
        console.error('❌ Failed to save refreshed tokens:', error.message);
      }
    });

    // Initialize Calendar API instance
    calendarInstance = google.calendar({ version: 'v3', auth: oAuth2Client });

    console.log('✅ Google Calendar API initialized');

    return oAuth2Client;

  } catch (error) {
    console.error('❌ Error initializing Google Auth:', error.message);
    throw error;
  }
}

/**
 * Get the initialized calendar instance
 * @returns {Object} Google Calendar API instance
 */
function getCalendar() {
  if (!calendarInstance) {
    throw new Error('Calendar not initialized. Call initializeGoogleAuth() first.');
  }
  return calendarInstance;
}

/**
 * Get the OAuth2 client
 * @returns {Object} OAuth2 client instance
 */
function getOAuth2Client() {
  if (!oAuth2Client) {
    throw new Error('OAuth2 client not initialized. Call initializeGoogleAuth() first.');
  }
  return oAuth2Client;
}

/**
 * Check if authentication is valid
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
  return oAuth2Client !== null && calendarInstance !== null;
}

module.exports = {
  initializeGoogleAuth,
  getCalendar,
  getOAuth2Client,
  isAuthenticated
};
