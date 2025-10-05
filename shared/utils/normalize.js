/**
 * Data Normalization Utilities
 * Helper functions for normalizing and transforming data from various sources
 */

/**
 * Normalize date to ISO string
 * @param {Date|string|number} date - Date to normalize
 * @returns {string|null} ISO date string or null
 */
const normalizeDate = (date) => {
  if (!date) return null;

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️  Invalid date:', date);
      return null;
    }
    return dateObj.toISOString();
  } catch (error) {
    console.error('❌ Date normalization error:', error.message);
    return null;
  }
};

/**
 * Normalize string - trim and remove extra whitespace
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
const normalizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Normalize email address
 * @param {string} email - Email to normalize
 * @returns {string|null} Normalized email or null
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;

  const normalized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    console.warn('⚠️  Invalid email format:', email);
    return null;
  }

  return normalized;
};

/**
 * Normalize phone number (remove non-numeric characters)
 * @param {string} phone - Phone number to normalize
 * @returns {string|null} Normalized phone or null
 */
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all non-numeric characters
  const normalized = phone.replace(/\D/g, '');

  if (normalized.length === 0) return null;

  return normalized;
};

/**
 * Normalize array - remove duplicates and null/undefined values
 * @param {Array} arr - Array to normalize
 * @returns {Array} Normalized array
 */
const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];

  // Remove null/undefined and duplicates
  return [...new Set(arr.filter(item => item != null))];
};

/**
 * Remove null/undefined values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const removeNullValues = (obj) => {
  if (!obj || typeof obj !== 'object') return {};

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value != null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('❌ Deep clone error:', error.message);
    return obj;
  }
};

/**
 * Normalize object keys to camelCase
 * @param {Object} obj - Object with keys to normalize
 * @returns {Object} Object with camelCase keys
 */
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Convert snake_case or kebab-case to camelCase
    const camelKey = key.replace(/[-_](.)/g, (_, char) => char.toUpperCase());

    // Recursively handle nested objects
    acc[camelKey] = typeof value === 'object' ? toCamelCase(value) : value;

    return acc;
  }, {});
};

/**
 * Normalize object keys to snake_case
 * @param {Object} obj - Object with keys to normalize
 * @returns {Object} Object with snake_case keys
 */
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    // Recursively handle nested objects
    acc[snakeKey] = typeof value === 'object' ? toSnakeCase(value) : value;

    return acc;
  }, {});
};

/**
 * Sanitize object for API response (remove sensitive fields)
 * @param {Object} obj - Object to sanitize
 * @param {Array} sensitiveFields - Fields to remove (default: password, token, apiKey)
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, sensitiveFields = ['password', 'token', 'apiKey', 'api_key', 'secret']) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  return sanitized;
};

module.exports = {
  normalizeDate,
  normalizeString,
  normalizeEmail,
  normalizePhone,
  normalizeArray,
  removeNullValues,
  deepClone,
  toCamelCase,
  toSnakeCase,
  sanitizeObject
};
