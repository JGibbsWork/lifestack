/**
 * Strava Service - API Routes
 * Caching proxy for Strava API v3
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * NOTE: Strava OAuth2 Token Management
 *
 * Strava uses OAuth2 for authentication with short-lived access tokens (6 hours).
 * For production use, you should implement the OAuth2 refresh flow:
 *
 * 1. Store refresh_token securely (database or environment)
 * 2. Check if access_token is expired before each request
 * 3. If expired, use refresh_token to get new access_token
 * 4. Update stored access_token
 *
 * OAuth2 Refresh Flow:
 * POST https://www.strava.com/oauth/token
 * {
 *   client_id: YOUR_CLIENT_ID,
 *   client_secret: YOUR_CLIENT_SECRET,
 *   grant_type: "refresh_token",
 *   refresh_token: YOUR_REFRESH_TOKEN
 * }
 *
 * For now, this implementation uses a manually obtained long-lived access token
 * from the environment variables. Future enhancement should add automatic token refresh.
 */

/**
 * GET /athlete
 * Get authenticated athlete's profile
 * Cached for 1 hour
 */
router.get('/athlete', controller.getAthlete);

/**
 * GET /activities
 * Get athlete's activities with pagination and filtering
 * Cached for 15 minutes
 *
 * Query params:
 * - page: Page number (default: 1)
 * - per_page: Results per page (default: 30, max: 200)
 * - before: Epoch timestamp - activities before this time
 * - after: Epoch timestamp - activities after this time
 */
router.get('/activities', controller.getActivities);

/**
 * GET /activities/:id
 * Get a specific activity by ID
 * Cached for 1 hour
 */
router.get('/activities/:id', controller.getActivity);

/**
 * GET /stats
 * Get athlete statistics
 * Cached for 1 hour
 *
 * Query params:
 * - athleteId: Athlete ID (default: 'current' for authenticated athlete)
 */
router.get('/stats', controller.getAthleteStats);

/**
 * GET /recent
 * Get recent activities (helper endpoint)
 * Cached for 15 minutes
 *
 * Query params:
 * - limit: Number of activities to return (default: 10, max: 50)
 */
router.get('/recent', controller.getRecentActivities);

/**
 * POST /cache/clear
 * Clear all Strava cache entries
 */
router.post('/cache/clear', controller.clearCache);

/**
 * GET /cache/stats
 * Get Strava cache statistics
 */
router.get('/cache/stats', controller.getCacheStats);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'strava',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
