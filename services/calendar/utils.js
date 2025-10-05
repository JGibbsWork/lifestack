/**
 * Calendar Service - Utility Functions
 * Date formatting and event processing helpers
 */

/**
 * Format date to YYYY-MM-DD string
 * Uses local date to avoid timezone issues
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date key
 */
function getTodayKey() {
  return formatDate(new Date());
}

/**
 * Get date key from date string
 * @param {string} dateString - Date string to parse
 * @returns {string} Formatted date key
 */
function getDateKey(dateString) {
  return formatDate(new Date(dateString));
}

/**
 * Get start and end of day in local timezone
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Object} Object with startOfDay and endOfDay Date objects
 */
function getDayBoundaries(dateKey) {
  // Parse date in local timezone to avoid UTC confusion
  const [year, month, day] = dateKey.split('-').map(Number);

  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * Normalize event data for API response
 * @param {Object} event - Raw event from Google Calendar API
 * @returns {Object} Normalized event object
 */
function normalizeEvent(event) {
  return {
    id: event.id,
    summary: event.summary || 'Untitled Event',
    start: event.start,
    end: event.end,
    description: event.description || null,
    location: event.location || null,
    status: event.status,
    htmlLink: event.htmlLink,
    created: event.created,
    updated: event.updated
  };
}

/**
 * Normalize multiple events
 * @param {Array} events - Array of events from Google Calendar API
 * @returns {Array} Array of normalized events
 */
function normalizeEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map(normalizeEvent);
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate event creation/update data
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
function validateEventData(eventData) {
  const errors = [];

  if (!eventData.summary || eventData.summary.trim() === '') {
    errors.push('Event summary is required');
  }

  if (!eventData.start) {
    errors.push('Event start time is required');
  } else {
    const startDate = new Date(eventData.start);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start time format');
    }
  }

  if (!eventData.end) {
    errors.push('Event end time is required');
  } else {
    const endDate = new Date(eventData.end);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end time format');
    }

    // Check if end is after start
    if (eventData.start) {
      const startDate = new Date(eventData.start);
      if (endDate <= startDate) {
        errors.push('Event end time must be after start time');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Build Google Calendar event object from request data
 * @param {Object} eventData - Event data from request
 * @returns {Object} Google Calendar event resource
 */
function buildEventResource(eventData) {
  const event = {
    summary: eventData.summary
  };

  // Handle start time
  if (eventData.start) {
    event.start = { dateTime: eventData.start };
    if (eventData.timeZone) {
      event.start.timeZone = eventData.timeZone;
    }
  }

  // Handle end time
  if (eventData.end) {
    event.end = { dateTime: eventData.end };
    if (eventData.timeZone) {
      event.end.timeZone = eventData.timeZone;
    }
  }

  // Optional fields
  if (eventData.description) {
    event.description = eventData.description;
  }

  if (eventData.location) {
    event.location = eventData.location;
  }

  if (eventData.attendees) {
    event.attendees = eventData.attendees;
  }

  if (eventData.reminders) {
    event.reminders = eventData.reminders;
  }

  return event;
}

module.exports = {
  formatDate,
  getTodayKey,
  getDateKey,
  getDayBoundaries,
  normalizeEvent,
  normalizeEvents,
  isValidDateString,
  validateEventData,
  buildEventResource
};
