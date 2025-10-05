/**
 * API Client Utility
 * Reusable Axios wrapper for making HTTP requests to external APIs
 */

const axios = require('axios');

/**
 * Create a configured Axios instance
 * @param {Object} config - Axios configuration options
 * @returns {Object} Configured Axios instance
 */
const createApiClient = (config = {}) => {
  const defaultConfig = {
    timeout: 10000, // 10 seconds default timeout
    headers: {
      'Content-Type': 'application/json',
    },
    ...config
  };

  const client = axios.create(defaultConfig);

  // Request interceptor - logs outgoing requests
  client.interceptors.request.use(
    (config) => {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error.message);
      return Promise.reject(error);
    }
  );

  // Response interceptor - logs responses and handles errors
  client.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.status} from ${response.config.url}`);
      return response;
    },
    (error) => {
      // Enhanced error handling
      if (error.response) {
        // Server responded with error status
        console.error(`❌ API Error Response: ${error.response.status} - ${error.response.statusText}`);
        console.error('   URL:', error.config?.url);
        console.error('   Data:', error.response.data);
      } else if (error.request) {
        // Request made but no response received
        console.error('❌ API No Response:', error.message);
        console.error('   URL:', error.config?.url);
      } else {
        // Error in request setup
        console.error('❌ API Request Setup Error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Make a GET request
 * @param {string} url - Request URL
 * @param {Object} config - Additional Axios config
 * @returns {Promise<Object>} Response data
 */
const get = async (url, config = {}) => {
  try {
    const client = createApiClient(config);
    const response = await client.get(url);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Make a POST request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} config - Additional Axios config
 * @returns {Promise<Object>} Response data
 */
const post = async (url, data = {}, config = {}) => {
  try {
    const client = createApiClient(config);
    const response = await client.post(url, data);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Make a PUT request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} config - Additional Axios config
 * @returns {Promise<Object>} Response data
 */
const put = async (url, data = {}, config = {}) => {
  try {
    const client = createApiClient(config);
    const response = await client.put(url, data);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Make a DELETE request
 * @param {string} url - Request URL
 * @param {Object} config - Additional Axios config
 * @returns {Promise<Object>} Response data
 */
const del = async (url, config = {}) => {
  try {
    const client = createApiClient(config);
    const response = await client.delete(url);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Format error for consistent error handling
 * @param {Error} error - Axios error object
 * @returns {Error} Formatted error
 */
const formatError = (error) => {
  if (error.response) {
    // Server responded with error
    const formattedError = new Error(error.response.data?.message || error.message);
    formattedError.status = error.response.status;
    formattedError.data = error.response.data;
    return formattedError;
  } else if (error.request) {
    // No response received
    const formattedError = new Error('No response received from server');
    formattedError.status = 0;
    return formattedError;
  } else {
    // Request setup error
    return error;
  }
};

module.exports = {
  createApiClient,
  get,
  post,
  put,
  delete: del
};
