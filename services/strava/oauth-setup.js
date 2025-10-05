/**
 * Strava OAuth Setup Script
 * One-time setup to authorize and get initial tokens
 *
 * Usage: node services/strava/oauth-setup.js
 */

require('dotenv').config();
const http = require('http');
const axios = require('axios');
const { saveTokens } = require('./tokenStore');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3030/callback';
const PORT = 3030;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env');
  console.error('Get your credentials from: https://www.strava.com/settings/api');
  process.exit(1);
}

console.log('');
console.log('╔════════════════════════════════════════════╗');
console.log('║     Strava OAuth Setup - One Time Only    ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');
console.log('📋 Instructions:');
console.log('1. A browser window will open for authorization');
console.log('2. Click "Authorize" to grant access');
console.log('3. Tokens will be saved to .strava-tokens.json');
console.log('');

// Create temporary server to handle callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

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

      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      const tokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at
      };

      // Save tokens to file
      saveTokens(tokenData);

      const expiresIn = Math.floor((tokenData.expires_at - Date.now() / 1000) / 3600);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>✅ Authorization Successful!</h1>
        <p>Tokens have been saved to .strava-tokens.json</p>
        <p>Access token expires in ~${expiresIn} hours</p>
        <p>You can close this window and stop the setup script.</p>
      `);

      console.log('');
      console.log('✅ Success! Strava OAuth setup complete');
      console.log(`📄 Tokens saved to: .strava-tokens.json`);
      console.log(`⏰ Access token expires in ~${expiresIn} hours`);
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

      console.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=activity:read_all`;

  console.log(`🌐 Temporary callback server running on port ${PORT}`);
  console.log('');
  console.log('🔗 Open this URL in your browser to authorize:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('Waiting for authorization...');
  console.log('');

  // Try to open browser automatically (works on most systems)
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
