/**
 * Pavlok Service - API Routes
 * Proxy for Pavlok API with safety features
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * POST /beep
 * Trigger a beep stimulus
 *
 * Body:
 * {
 *   intensity: 1-4,      // Required: Beep intensity
 *   reason: "string"     // Optional: Reason for the beep
 * }
 *
 * Rate limit: 1 beep per 5 seconds
 */
router.post('/beep', controller.triggerBeep);

/**
 * POST /vibrate
 * Trigger a vibration stimulus
 *
 * Body:
 * {
 *   intensity: 1-4,      // Required: Vibration intensity
 *   reason: "string"     // Optional: Reason for the vibration
 * }
 *
 * Rate limit: 1 vibration per 5 seconds
 */
router.post('/vibrate', controller.triggerVibration);

/**
 * POST /shock
 * Trigger a shock stimulus
 *
 * ⚠️  SAFETY REQUIREMENT: Must include confirm: true in request body
 *
 * Body:
 * {
 *   intensity: 1-4,      // Required: Shock intensity
 *   confirm: true,       // Required: Safety confirmation
 *   reason: "string"     // Optional: Reason for the shock
 * }
 *
 * Rate limit: 1 shock per 5 seconds
 */
router.post('/shock', controller.triggerShock);

/**
 * GET /history
 * Get stimulus history
 *
 * Query params:
 * - limit: Number of records (default: 50, max: 200)
 * - skip: Number of records to skip (default: 0)
 * - type: Filter by type (beep|vibrate|shock)
 */
router.get('/history', controller.getHistory);

/**
 * GET /stats
 * Get stimulus statistics
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/stats', controller.getStats);

/**
 * GET /rate-limit
 * Get current rate limit status for all stimulus types
 */
router.get('/rate-limit', controller.getRateLimitStatus);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'pavlok',
    status: 'ok',
    timestamp: new Date().toISOString(),
    safetyFeatures: {
      shockConfirmationRequired: true,
      rateLimitSeconds: 5,
      historyLogging: true
    }
  });
});

module.exports = router;
