/**
 * Request Logger Middleware
 * Logs HTTP requests with timing and status information
 */

/**
 * Logger middleware for HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestLogger = (req, res, next) => {
  // Record request start time
  const startTime = Date.now();

  // Log incoming request
  console.log(`📥 ${req.method} ${req.originalUrl || req.url}`);

  // Log request body if present (except for sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields from logs
    ['password', 'token', 'apiKey', 'api_key'].forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });
    console.log('   Body:', JSON.stringify(sanitizedBody));
  }

  // Log query parameters if present
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('   Query:', JSON.stringify(req.query));
  }

  // Store original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk, encoding) {
    // Calculate response time
    const duration = Date.now() - startTime;

    // Get status code emoji
    const statusEmoji = res.statusCode >= 500 ? '❌' :
                       res.statusCode >= 400 ? '⚠️' :
                       res.statusCode >= 300 ? '🔄' :
                       '✅';

    // Log response
    console.log(`${statusEmoji} ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} - ${duration}ms`);

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logger middleware
 * Logs errors that occur during request processing
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorLogger = (err, req, res, next) => {
  // Log error details
  console.error('❌ Error occurred:');
  console.error(`   Route: ${req.method} ${req.originalUrl || req.url}`);
  console.error(`   Message: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);

  // Pass error to next error handler
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
