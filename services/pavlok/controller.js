/**
 * Pavlok Service - Controller
 * Request handlers with safety checks and rate limiting
 */

const { createPavlokClient } = require('./client');
const PavlokStimulus = require('../../models/PavlokStimulus');

// Rate limiting: Track last action time per type
const lastActionTime = {
  beep: 0,
  vibrate: 0,
  shock: 0
};

// Rate limit duration (5 seconds in milliseconds)
const RATE_LIMIT_MS = 5000;

/**
 * Check if action is rate limited
 * @param {string} type - Stimulus type
 * @returns {Object} { allowed: boolean, timeRemaining?: number }
 * @private
 */
function checkRateLimit(type) {
  const now = Date.now();
  const timeSinceLastAction = now - lastActionTime[type];

  if (timeSinceLastAction < RATE_LIMIT_MS) {
    const timeRemaining = Math.ceil((RATE_LIMIT_MS - timeSinceLastAction) / 1000);
    return {
      allowed: false,
      timeRemaining
    };
  }

  return { allowed: true };
}

/**
 * Update rate limit tracker
 * @param {string} type - Stimulus type
 * @private
 */
function updateRateLimit(type) {
  lastActionTime[type] = Date.now();
}

/**
 * Log stimulus action to database
 * @param {string} type - Stimulus type
 * @param {number} intensity - Intensity level
 * @param {string} reason - Optional reason
 * @param {boolean} success - Whether the action succeeded
 * @param {string} error - Error message if failed
 * @returns {Promise<Object>} Saved stimulus record
 * @private
 */
async function logStimulus(type, intensity, reason, success, error = null) {
  try {
    const stimulus = new PavlokStimulus({
      type,
      intensity,
      reason: reason || null,
      success,
      error
    });

    await stimulus.save();
    return stimulus;
  } catch (err) {
    console.error('❌ Failed to log stimulus to database:', err.message);
    // Don't throw - logging failure shouldn't break the stimulus action
    return null;
  }
}

/**
 * Trigger a beep stimulus
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function triggerBeep(req, res) {
  try {
    const { intensity, reason } = req.body;

    // Validate intensity
    const pavlokClient = createPavlokClient();
    const validation = pavlokClient.validateIntensity(intensity);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check rate limit
    const rateLimit = checkRateLimit('beep');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${rateLimit.timeRemaining} seconds before triggering another beep`,
        timeRemaining: rateLimit.timeRemaining
      });
    }

    // Send stimulus
    console.log(`🔔 Triggering beep - Intensity: ${intensity}${reason ? `, Reason: ${reason}` : ''}`);

    const result = await pavlokClient.beep(intensity);

    // Update rate limit
    updateRateLimit('beep');

    // Log to database
    await logStimulus('beep', intensity, reason, true);

    res.json({
      success: true,
      type: 'beep',
      intensity,
      reason: reason || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Log failure to database
    await logStimulus('beep', req.body.intensity, req.body.reason, false, error.message);
    handleError(res, error, 'Failed to trigger beep');
  }
}

/**
 * Trigger a vibration stimulus
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function triggerVibration(req, res) {
  try {
    const { intensity, reason } = req.body;

    // Validate intensity
    const pavlokClient = createPavlokClient();
    const validation = pavlokClient.validateIntensity(intensity);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check rate limit
    const rateLimit = checkRateLimit('vibrate');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${rateLimit.timeRemaining} seconds before triggering another vibration`,
        timeRemaining: rateLimit.timeRemaining
      });
    }

    // Send stimulus
    console.log(`📳 Triggering vibration - Intensity: ${intensity}${reason ? `, Reason: ${reason}` : ''}`);

    const result = await pavlokClient.vibrate(intensity);

    // Update rate limit
    updateRateLimit('vibrate');

    // Log to database
    await logStimulus('vibrate', intensity, reason, true);

    res.json({
      success: true,
      type: 'vibration',
      intensity,
      reason: reason || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Log failure to database
    await logStimulus('vibrate', req.body.intensity, req.body.reason, false, error.message);
    handleError(res, error, 'Failed to trigger vibration');
  }
}

/**
 * Trigger a shock stimulus (requires confirmation)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function triggerShock(req, res) {
  try {
    const { intensity, confirm, reason } = req.body;

    // Safety check: Require explicit confirmation
    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        error: 'Safety confirmation required',
        message: 'Shock requires explicit confirmation. Set "confirm: true" in request body.'
      });
    }

    // Validate intensity
    const pavlokClient = createPavlokClient();
    const validation = pavlokClient.validateIntensity(intensity);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check rate limit
    const rateLimit = checkRateLimit('shock');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Please wait ${rateLimit.timeRemaining} seconds before triggering another shock`,
        timeRemaining: rateLimit.timeRemaining
      });
    }

    // Send stimulus with extra logging for shocks
    console.log(`⚡ SHOCK TRIGGERED - Intensity: ${intensity}${reason ? `, Reason: ${reason}` : ''}`);
    console.log('⚠️  Safety confirmation received');

    const result = await pavlokClient.shock(intensity);

    // Update rate limit
    updateRateLimit('shock');

    // Log to database
    await logStimulus('shock', intensity, reason, true);

    res.json({
      success: true,
      type: 'shock',
      intensity,
      reason: reason || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Log failure to database
    await logStimulus('shock', req.body.intensity, req.body.reason, false, error.message);
    handleError(res, error, 'Failed to trigger shock');
  }
}

/**
 * Get stimulus history
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;
    const type = req.query.type || null;

    const options = { limit, skip };
    if (type && ['beep', 'vibrate', 'shock'].includes(type)) {
      options.type = type;
    }

    const history = await PavlokStimulus.getRecent(options);
    const total = await PavlokStimulus.countDocuments(
      options.type ? { type: options.type } : {}
    );

    res.json({
      success: true,
      count: history.length,
      total,
      limit,
      skip,
      hasMore: skip + history.length < total,
      history
    });

  } catch (error) {
    console.error('❌ Error fetching stimulus history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
}

/**
 * Get stimulus statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const stats = await PavlokStimulus.getStats({
      startDate: startDate || null,
      endDate: endDate || null
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching stimulus stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
}

/**
 * Get rate limit status
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function getRateLimitStatus(req, res) {
  const now = Date.now();

  const status = {
    beep: {
      canTrigger: checkRateLimit('beep').allowed,
      lastTriggered: lastActionTime.beep > 0 ? new Date(lastActionTime.beep).toISOString() : null,
      timeRemaining: checkRateLimit('beep').timeRemaining || 0
    },
    vibrate: {
      canTrigger: checkRateLimit('vibrate').allowed,
      lastTriggered: lastActionTime.vibrate > 0 ? new Date(lastActionTime.vibrate).toISOString() : null,
      timeRemaining: checkRateLimit('vibrate').timeRemaining || 0
    },
    shock: {
      canTrigger: checkRateLimit('shock').allowed,
      lastTriggered: lastActionTime.shock > 0 ? new Date(lastActionTime.shock).toISOString() : null,
      timeRemaining: checkRateLimit('shock').timeRemaining || 0
    }
  };

  res.json({
    success: true,
    rateLimitMs: RATE_LIMIT_MS,
    status
  });
}

/**
 * Handle errors consistently
 * @param {Object} res - Express response
 * @param {Error} error - Error object
 * @param {string} message - Error message
 * @private
 */
function handleError(res, error, message) {
  console.error(`❌ ${message}:`, error.message);

  const status = error.status || 500;

  res.status(status).json({
    success: false,
    error: message,
    message: error.message
  });
}

module.exports = {
  triggerBeep,
  triggerVibration,
  triggerShock,
  getHistory,
  getStats,
  getRateLimitStatus
};
