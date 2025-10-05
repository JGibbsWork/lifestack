/**
 * Calendar Service - API Routes
 * Handles all calendar-related endpoints
 */

const express = require('express');
const { getCalendar } = require('./auth');
const {
  getCachedEvents,
  setCachedEvents,
  clearDateCache,
  clearAllCalendarCache,
  getCalendarCacheStats
} = require('./cache');
const {
  getTodayKey,
  getDateKey,
  getDayBoundaries,
  normalizeEvents,
  isValidDateString,
  validateEventData,
  buildEventResource
} = require('./utils');

const router = express.Router();

/**
 * Fetch events from Google Calendar API for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of events
 */
async function fetchEventsFromGoogle(dateKey) {
  const { startOfDay, endOfDay } = getDayBoundaries(dateKey);

  console.log(`📅 Fetching events for ${dateKey} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);

  try {
    const calendar = getCalendar();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`✅ Fetched ${events.length} events from Google Calendar`);

    return events;

  } catch (error) {
    console.error('❌ Error fetching events from Google Calendar:', error.message);
    throw error;
  }
}

/**
 * Get events with caching
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of events
 */
async function getEventsWithCache(dateKey) {
  // Try to get from cache first
  const cachedEvents = getCachedEvents(dateKey);

  if (cachedEvents) {
    return cachedEvents;
  }

  // Fetch from Google Calendar
  const events = await fetchEventsFromGoogle(dateKey);

  // Cache the results
  setCachedEvents(dateKey, events);

  return events;
}

/**
 * GET /health
 * Health check endpoint for calendar service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'calendar',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /events/today
 * Get today's calendar events
 */
router.get('/events/today', async (req, res) => {
  try {
    const dateKey = getTodayKey();
    const events = await getEventsWithCache(dateKey);
    const normalizedEvents = normalizeEvents(events);

    res.json({
      success: true,
      date: dateKey,
      count: normalizedEvents.length,
      events: normalizedEvents
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s events',
      message: error.message
    });
  }
});

/**
 * GET /events/:date
 * Get calendar events for a specific date
 */
router.get('/events/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    const dateKey = getDateKey(date);
    const events = await getEventsWithCache(dateKey);
    const normalizedEvents = normalizeEvents(events);

    res.json({
      success: true,
      date: dateKey,
      count: normalizedEvents.length,
      events: normalizedEvents
    });

  } catch (error) {
    console.error(`❌ Error fetching events for ${req.params.date}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch events for ${req.params.date}`,
      message: error.message
    });
  }
});

/**
 * POST /events
 * Create a new calendar event
 */
router.post('/events', async (req, res) => {
  try {
    const eventData = req.body;

    // Validate event data
    const validation = validateEventData(eventData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        errors: validation.errors
      });
    }

    // Build event resource
    const event = buildEventResource(eventData);

    // Create event in Google Calendar
    const calendar = getCalendar();
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // Clear cache for the affected date
    const eventDate = getDateKey(eventData.start);
    clearDateCache(eventDate);

    console.log(`✅ Created event: ${response.data.id}`);

    res.status(201).json({
      success: true,
      eventId: response.data.id,
      event: response.data
    });

  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

/**
 * PUT /events/:eventId
 * Update an existing calendar event
 */
router.put('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventData = req.body;

    // Validate event data
    const validation = validateEventData(eventData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        errors: validation.errors
      });
    }

    // Build event resource
    const event = buildEventResource(eventData);

    // Update event in Google Calendar
    const calendar = getCalendar();
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: event,
    });

    // Clear cache for the affected date
    const eventDate = getDateKey(eventData.start);
    clearDateCache(eventDate);

    console.log(`✅ Updated event: ${eventId}`);

    res.json({
      success: true,
      event: response.data
    });

  } catch (error) {
    console.error(`❌ Error updating event ${req.params.eventId}:`, error);

    // Handle not found error
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: `Event with ID ${req.params.eventId} not found`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

/**
 * DELETE /events/:eventId
 * Delete a calendar event
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Delete event from Google Calendar
    const calendar = getCalendar();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    // Clear entire cache since we don't know which date this event was on
    clearAllCalendarCache();

    console.log(`✅ Deleted event: ${eventId}`);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error(`❌ Error deleting event ${req.params.eventId}:`, error);

    // Handle not found error
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
        message: `Event with ID ${req.params.eventId} not found`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

/**
 * POST /cache/clear
 * Clear all calendar event caches
 */
router.post('/cache/clear', (req, res) => {
  try {
    clearAllCalendarCache();

    res.json({
      success: true,
      message: 'Calendar cache cleared successfully'
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

/**
 * GET /cache/stats
 * Get calendar cache statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = getCalendarCacheStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
});

module.exports = router;
