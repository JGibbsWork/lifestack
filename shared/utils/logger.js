/**
 * Enhanced Logger Utility
 * Provides structured logging with different levels
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const LOG_COLORS = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[90m', // Gray
  reset: '\x1b[0m'
};

// Current log level from environment
const currentLogLevel = process.env.LOG_LEVEL || 'info';

const levelPriority = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Check if a log level should be logged
 * @param {string} level - Log level to check
 * @returns {boolean} Should log
 */
function shouldLog(level) {
  return levelPriority[level] <= levelPriority[currentLogLevel];
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {string} Formatted message
 */
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level] || LOG_COLORS.reset;

  let logMessage = `${color}[${timestamp}] [${level.toUpperCase()}]${LOG_COLORS.reset} ${message}`;

  if (Object.keys(context).length > 0) {
    logMessage += ` ${JSON.stringify(context)}`;
  }

  return logMessage;
}

/**
 * Log error with full context
 * @param {string} message - Error message
 * @param {Object} context - Error context
 */
function logError(message, context = {}) {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;

  const logMessage = formatLog(LOG_LEVELS.ERROR, message, context);
  console.error(logMessage);

  // Also log stack trace if error object provided
  if (context.error && context.error.stack) {
    console.error(context.error.stack);
  }
}

/**
 * Log warning
 * @param {string} message - Warning message
 * @param {Object} context - Warning context
 */
function logWarn(message, context = {}) {
  if (!shouldLog(LOG_LEVELS.WARN)) return;

  const logMessage = formatLog(LOG_LEVELS.WARN, message, context);
  console.warn(logMessage);
}

/**
 * Log info
 * @param {string} message - Info message
 * @param {Object} context - Info context
 */
function logInfo(message, context = {}) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  const logMessage = formatLog(LOG_LEVELS.INFO, message, context);
  console.log(logMessage);
}

/**
 * Log debug
 * @param {string} message - Debug message
 * @param {Object} context - Debug context
 */
function logDebug(message, context = {}) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const logMessage = formatLog(LOG_LEVELS.DEBUG, message, context);
  console.log(logMessage);
}

/**
 * Log API error with full context
 * @param {string} service - Service name
 * @param {string} endpoint - Endpoint called
 * @param {Error} error - Error object
 * @param {Object} params - Request parameters
 */
function logApiError(service, endpoint, error, params = {}) {
  logError(`API Error in ${service}`, {
    service,
    endpoint,
    error: error.message,
    params,
    statusCode: error.status || error.statusCode,
    stack: error.stack
  });
}

/**
 * Log slow request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {number} responseTime - Response time in ms
 * @param {number} statusCode - HTTP status code
 */
function logSlowRequest(method, path, responseTime, statusCode) {
  logWarn(`Slow request detected`, {
    method,
    path,
    responseTime: `${responseTime}ms`,
    statusCode
  });
}

/**
 * Log cache hit/miss for debugging
 * @param {string} key - Cache key
 * @param {boolean} hit - Was it a hit?
 */
function logCache(key, hit) {
  if (hit) {
    logDebug(`Cache HIT`, { key });
  } else {
    logDebug(`Cache MISS`, { key });
  }
}

/**
 * Log service startup
 * @param {string} service - Service name
 * @param {Object} config - Service configuration
 */
function logServiceStartup(service, config = {}) {
  logInfo(`${service} service initialized`, config);
}

/**
 * Log request with response time
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {number} statusCode - Status code
 * @param {number} responseTime - Response time in ms
 */
function logRequest(method, path, statusCode, responseTime) {
  const emoji = statusCode >= 500 ? '❌' :
                statusCode >= 400 ? '⚠️' :
                statusCode >= 300 ? '🔄' :
                '✅';

  logInfo(`${emoji} ${method} ${path}`, {
    statusCode,
    responseTime: `${responseTime}ms`
  });
}

module.exports = {
  LOG_LEVELS,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logApiError,
  logSlowRequest,
  logCache,
  logServiceStartup,
  logRequest
};
