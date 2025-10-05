/**
 * Authentication Middleware
 * Simple API key-based authentication
 */

/**
 * Middleware to verify API key from request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateApiKey = (req, res, next) => {
  try {
    // Get API key from request header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    // Check if API key is provided
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
        message: 'Please provide an API key in the x-api-key header or Authorization header'
      });
    }

    // Verify API key against environment variable
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
      console.error('⚠️  API_KEY not configured in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Validate API key
    if (apiKey !== validApiKey) {
      return res.status(403).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    // API key is valid, proceed to next middleware
    next();

  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user/auth context if valid API key is provided, but doesn't block the request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const validApiKey = process.env.API_KEY;

    // Mark request as authenticated if valid key provided
    req.isAuthenticated = apiKey && apiKey === validApiKey;

    next();
  } catch (error) {
    // Continue even if there's an error
    req.isAuthenticated = false;
    next();
  }
};

module.exports = {
  authenticateApiKey,
  optionalAuth
};
