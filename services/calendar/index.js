/**
 * Calendar Service - Main Entry Point
 * Exports the calendar service router and initialization function
 */

const { initializeGoogleAuth } = require('./auth');
const router = require('./routes');

/**
 * Initialize the calendar service
 * Must be called before using the calendar router
 * @returns {Promise<void>}
 */
async function initializeCalendarService() {
  try {
    console.log('🔧 Initializing Calendar Service...');
    await initializeGoogleAuth();
    console.log('✅ Calendar Service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Calendar Service:', error.message);
    throw error;
  }
}

module.exports = {
  router,
  initializeCalendarService
};
