/**
 * Google Calendar OAuth Setup Script
 * One-time setup to authorize and get initial tokens
 *
 * Usage: node services/calendar/setup-auth.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || path.join(__dirname, '../../token.json');
const PORT = 3031;

// OAuth2 scopes for Google Calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

console.log('');
console.log('╔════════════════════════════════════════════╗');
console.log('║   Google Calendar OAuth Setup - One Time  ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');

// Load credentials
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('❌ Error: credentials.json not found at:', CREDENTIALS_PATH);
  console.error('');
  console.error('To get credentials.json:');
  console.error('1. Go to https://console.cloud.google.com/apis/credentials');
  console.error('2. Create OAuth 2.0 Client ID (Desktop app or Web app)');
  console.error('3. Download credentials.json to project root');
  console.error('');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

if (!client_id || !client_secret) {
  console.error('❌ Invalid credentials.json format');
  process.exit(1);
}

// Use localhost callback for setup
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// Create OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force to get refresh token
});

console.log('📋 Instructions:');
console.log('1. A browser window will open for authorization');
console.log('2. Sign in with your Google account');
console.log('3. Grant calendar access');
console.log('4. Tokens will be saved to token.json');
console.log('');

// Create temporary server to handle callback
const server = http.createServer(async (req, res) => {
  const url = parse(req.url, true);

  if (url.pathname === '/oauth2callback') {
    const code = url.query.code;
    const error = url.query.error;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization Failed</h1><p>You can close this window.</p>');
      console.error('❌ Authorization failed:', error);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Missing Code</h1><p>You can close this window.</p>');
      console.error('❌ No authorization code received');
      server.close();
      process.exit(1);
    }

    try {
      // Exchange code for tokens
      console.log('🔄 Exchanging authorization code for tokens...');

      const { tokens } = await oAuth2Client.getToken(code);

      // Save tokens to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>✅ Authorization Successful!</h1>
        <p>Tokens have been saved to token.json</p>
        <p>You can close this window and stop the setup script.</p>
      `);

      console.log('');
      console.log('✅ Success! Google Calendar OAuth setup complete');
      console.log(`📄 Tokens saved to: ${TOKEN_PATH}`);
      console.log('🔄 Tokens will auto-refresh when the API is used');
      console.log('');
      console.log('You can now start your Lifestack server with: npm start');
      console.log('');

      // Close server after a short delay
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Token Exchange Failed</h1><p>Check console for errors.</p>');

      console.error('❌ Failed to exchange code for tokens:', error.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Temporary callback server running on port ${PORT}`);
  console.log('');
  console.log('🔗 Open this URL in your browser to authorize:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('Waiting for authorization...');
  console.log('');

  // Try to open browser automatically
  const open = require('child_process').exec;
  const command = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';

  open(`${command} "${authUrl}"`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});
