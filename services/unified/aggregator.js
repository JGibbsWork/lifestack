/**
 * Unified Service - Data Aggregator
 * Helper functions for combining data from multiple sources
 */

const { createTodoistClient } = require('../todoist/client');
const { createStravaClient } = require('../strava/client');
const axios = require('axios');

/**
 * Normalize Todoist task to unified format
 * @param {Object} task - Todoist task object
 * @param {string} projectName - Project name
 * @returns {Object} Normalized task
 */
function normalizeTask(task, projectName = null) {
  return {
    id: `todoist:${task.id}`,
    title: task.content,
    due: task.due?.date || null,
    completed: task.is_completed || false,
    priority: 5 - task.priority, // Todoist: 4=urgent, we want 1=low, 4=urgent
    source: 'todoist',
    project: projectName || task.project_id,
    labels: task.labels || []
  };
}

/**
 * Fetch tasks from Todoist
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Normalized tasks
 */
async function fetchTodoistTasks(options = {}) {
  try {
    const todoistClient = createTodoistClient();
    const tasks = await todoistClient.getTasks(options);

    // Get projects for task names
    let projects = {};
    try {
      const projectsList = await todoistClient.getProjects();
      projects = projectsList.reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {});
    } catch (err) {
      console.warn('Could not fetch projects:', err.message);
    }

    return tasks.map(task => normalizeTask(task, projects[task.project_id]));
  } catch (error) {
    console.error('❌ Failed to fetch Todoist tasks:', error.message);
    throw error;
  }
}

/**
 * Fetch calendar events for today
 * @param {string} baseUrl - Base URL for calendar service
 * @returns {Promise<Array>} Calendar events
 */
async function fetchTodayCalendarEvents(baseUrl = 'http://localhost:3000') {
  try {
    const response = await axios.get(`${baseUrl}/api/calendar/events/today`);
    return response.data.events || [];
  } catch (error) {
    console.error('❌ Failed to fetch calendar events:', error.message);
    throw error;
  }
}

/**
 * Fetch calendar events for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} baseUrl - Base URL
 * @returns {Promise<Array>} Calendar events
 */
async function fetchCalendarEventsRange(startDate, endDate, baseUrl = 'http://localhost:3000') {
  try {
    // Fetch events for each day in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const events = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      try {
        const response = await axios.get(`${baseUrl}/api/calendar/events/${dateStr}`);
        events.push(...(response.data.events || []));
      } catch (err) {
        console.warn(`Could not fetch events for ${dateStr}:`, err.message);
      }
    }

    return events;
  } catch (error) {
    console.error('❌ Failed to fetch calendar events range:', error.message);
    throw error;
  }
}

/**
 * Fetch Strava activities
 * @param {number} daysBack - Number of days to look back
 * @returns {Promise<Array>} Strava activities
 */
async function fetchStravaActivities(daysBack = 7) {
  try {
    const stravaClient = createStravaClient();

    // Calculate timestamp for X days ago
    const afterTimestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);

    const activities = await stravaClient.getActivities({
      after: afterTimestamp,
      per_page: 100
    });

    return stravaClient.normalizeActivities(activities);
  } catch (error) {
    console.error('❌ Failed to fetch Strava activities:', error.message);
    throw error;
  }
}

/**
 * Filter tasks by criteria
 * @param {Array} tasks - Array of tasks
 * @param {string} filter - Filter type: "today" | "overdue" | "upcoming" | "all"
 * @param {boolean} completedOnly - Filter by completion status
 * @returns {Array} Filtered tasks
 */
function filterTasks(tasks, filter = 'all', completedOnly = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filtered = tasks;

  // Filter by completion status
  if (completedOnly !== null) {
    filtered = filtered.filter(task => task.completed === completedOnly);
  }

  // Filter by date
  if (filter === 'today') {
    filtered = filtered.filter(task => {
      if (!task.due) return false;
      const dueDate = new Date(task.due);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });
  } else if (filter === 'overdue') {
    filtered = filtered.filter(task => {
      if (!task.due || task.completed) return false;
      const dueDate = new Date(task.due);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  } else if (filter === 'upcoming') {
    filtered = filtered.filter(task => {
      if (!task.due) return false;
      const dueDate = new Date(task.due);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate > today;
    });
  }

  return filtered;
}

/**
 * Sort tasks by priority and due date
 * @param {Array} tasks - Array of tasks
 * @returns {Array} Sorted tasks
 */
function sortTasks(tasks) {
  return tasks.sort((a, b) => {
    // Incomplete tasks first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Then by due date (null dates last)
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) {
      const dateA = new Date(a.due);
      const dateB = new Date(b.due);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
    }

    // Then by priority (higher first)
    return b.priority - a.priority;
  });
}

/**
 * Calculate fitness summary from activities
 * @param {Array} activities - Array of Strava activities
 * @returns {Object} Fitness summary
 */
function calculateFitnessSummary(activities) {
  if (!activities || activities.length === 0) {
    return {
      activities_count: 0,
      total_distance: 0,
      total_duration: 0,
      last_activity: null
    };
  }

  const total_distance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
  const total_duration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);

  // Get most recent activity
  const sorted = [...activities].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  return {
    activities_count: activities.length,
    total_distance: Math.round(total_distance), // meters
    total_duration: Math.round(total_duration), // seconds
    last_activity: sorted[0] || null
  };
}

/**
 * Get start and end of current week
 * @returns {Object} { start: Date, end: Date }
 */
function getCurrentWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek); // Start of week (Sunday)
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

module.exports = {
  normalizeTask,
  fetchTodoistTasks,
  fetchTodayCalendarEvents,
  fetchCalendarEventsRange,
  fetchStravaActivities,
  filterTasks,
  sortTasks,
  calculateFitnessSummary,
  getCurrentWeekDates
};
