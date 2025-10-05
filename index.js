/**
 * Lifestack - Main Application Entry Point
 * A Node.js monorepo for managing life services and integrations
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const { connectDB, closeDB } = require('./config/database');
const { requestLogger, errorLogger } = require('./shared/middleware/logger');
const { statsMiddleware, getStats, getMongoStats } = require('./shared/middleware/stats');
const { performHealthCheck } = require('./shared/utils/healthCheck');
const { cache } = require('./shared/middleware/cache');
const { authenticateApiKey } = require('./shared/middleware/auth');
const { router: calendarRouter, initializeCalendarService } = require('./services/calendar');
const { router: memoryRouter } = require('./services/memory');
const { router: stravaRouter } = require('./services/strava');
const { router: pavlokRouter } = require('./services/pavlok');
const { router: notionRouter } = require('./services/notion');
const { router: unifiedRouter } = require('./services/unified');

// Initialize Express app
const app = express();

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

/**
 * Middleware Setup
 */

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Stats tracking middleware
app.use(statsMiddleware);

// Request logging middleware
app.use(requestLogger);

/**
 * Routes
 */

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await performHealthCheck();

    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Lifestack API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      stats: '/api/stats',
      calendar: '/api/calendar',
      memory: '/api/memory',
      strava: '/api/strava',
      pavlok: '/api/pavlok',
      notion: '/api/notion',
      unified: '/api/unified'
    }
  });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = getStats();
    const mongoStats = await getMongoStats();
    const cacheStats = cache.getStats();

    res.json({
      success: true,
      ...stats,
      mongodb: mongoStats,
      cache: {
        entries: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// Global cache clear endpoint (requires auth)
app.post('/api/cache/clear', authenticateApiKey, (req, res) => {
  try {
    const keys = cache.keys();
    const count = keys.length;

    cache.flushAll();

    console.log(`🗑️  Cleared ${count} cache entries`);

    res.json({
      success: true,
      message: 'All cache cleared successfully',
      entriesCleared: count
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Mount service routers
app.use('/api/calendar', calendarRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/strava', stravaRouter);
app.use('/api/pavlok', pavlokRouter);
app.use('/api/notion', notionRouter);
app.use('/api/unified', unifiedRouter);

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

/**
 * Error Handling Middleware
 */

// Error logger
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  // Set status code
  const statusCode = err.status || err.statusCode || 500;

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Unhandled error:', err);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

/**
 * Server Startup
 */

const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    // Initialize Calendar Service (optional)
    try {
      await initializeCalendarService();
    } catch (error) {
      console.log('⚠️  Calendar service disabled:', error.message);
      console.log('   To enable: Set up Google OAuth credentials');
    }

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║         🚀 Lifestack Server Started       ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log('');
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📅 Calendar API: http://localhost:${PORT}/api/calendar/events/today`);
      console.log(`🧠 Memory API: http://localhost:${PORT}/api/memory`);
      console.log(`🏃 Strava API: http://localhost:${PORT}/api/strava/recent`);
      console.log(`⚡ Pavlok API: http://localhost:${PORT}/api/pavlok/rate-limit`);
      console.log(`📝 Notion API: http://localhost:${PORT}/api/notion/health`);
      console.log(`🔄 Unified API: http://localhost:${PORT}/api/unified/today`);
      console.log('');
      console.log('Press CTRL+C to stop the server');
      console.log('');
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log('');
      console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);

      // Close server
      server.close(async () => {
        console.log('🛑 HTTP server closed');

        // Close database connection
        await closeDB();

        console.log('👋 Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
