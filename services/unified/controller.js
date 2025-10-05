/**
 * Unified Service - Controller
 * Aggregates data from multiple sources
 */

const { cache } = require('../../shared/middleware/cache');
const {
  fetchTodoistTasks,
  fetchTodayCalendarEvents,
  fetchCalendarEventsRange,
  fetchStravaActivities,
  filterTasks,
  sortTasks,
  calculateFitnessSummary,
  getCurrentWeekDates
} = require('./aggregator');

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60;

/**
 * Get tasks from Todoist
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getTasks(req, res) {
  try {
    const { filter = 'all', completed } = req.query;
    const completedFilter = completed === 'true' ? true : completed === 'false' ? false : null;

    // Create cache key
    const cacheKey = `unified:tasks:${filter}:${completed || 'any'}`;

    // Try cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        fromCache: true,
        ...cached
      });
    }

    // Fetch tasks
    const allTasks = await fetchTodoistTasks();

    // Filter and sort
    const filtered = filterTasks(allTasks, filter, completedFilter);
    const sorted = sortTasks(filtered);

    const result = {
      filter,
      count: sorted.length,
      tasks: sorted
    };

    // Cache result
    cache.set(cacheKey, result, CACHE_DURATION);

    res.json({
      success: true,
      fromCache: false,
      ...result
    });

  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
}

/**
 * Get today's dashboard data
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getToday(req, res) {
  try {
    const cacheKey = 'unified:today';

    // Try cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        fromCache: true,
        ...cached
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const errors = [];

    // Fetch data in parallel
    const [calendarEvents, allTasks, stravaActivities] = await Promise.allSettled([
      fetchTodayCalendarEvents(),
      fetchTodoistTasks(),
      fetchStravaActivities(7)
    ]);

    // Process calendar events
    const events = calendarEvents.status === 'fulfilled' ? calendarEvents.value : [];
    if (calendarEvents.status === 'rejected') {
      errors.push({ service: 'calendar', error: calendarEvents.reason.message });
    }

    // Process tasks
    let tasks = { due_today: [], overdue: [], completed_today: [] };
    if (allTasks.status === 'fulfilled') {
      const taskList = allTasks.value;
      tasks.due_today = sortTasks(filterTasks(taskList, 'today', false));
      tasks.overdue = sortTasks(filterTasks(taskList, 'overdue', false));
      tasks.completed_today = taskList.filter(t => {
        if (!t.completed) return false;
        // This is simplified - would need task completion timestamp from API
        return filterTasks([t], 'today').length > 0;
      });
    } else {
      errors.push({ service: 'todoist', error: allTasks.reason.message });
    }

    // Process fitness data
    let fitness = {
      activities_this_week: 0,
      total_distance: 0,
      total_duration: 0,
      last_activity: null
    };
    if (stravaActivities.status === 'fulfilled') {
      const activities = stravaActivities.value;
      const summary = calculateFitnessSummary(activities);
      fitness = {
        activities_this_week: summary.activities_count,
        total_distance: summary.total_distance,
        total_duration: summary.total_duration,
        last_activity: summary.last_activity
      };
    } else {
      errors.push({ service: 'strava', error: stravaActivities.reason.message });
    }

    const result = {
      date: today,
      events,
      tasks,
      fitness,
      summary: {
        total_events: events.length,
        total_tasks: tasks.due_today.length + tasks.overdue.length,
        completed_tasks: tasks.completed_today.length,
        fitness_activities: fitness.activities_this_week
      },
      ...(errors.length > 0 && { errors })
    };

    // Cache result
    cache.set(cacheKey, result, CACHE_DURATION);

    res.json({
      success: true,
      fromCache: false,
      ...result
    });

  } catch (error) {
    console.error('❌ Error fetching today data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today data',
      message: error.message
    });
  }
}

/**
 * Get this week's data
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getWeek(req, res) {
  try {
    const cacheKey = 'unified:week';

    // Try cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        fromCache: true,
        ...cached
      });
    }

    const { start, end } = getCurrentWeekDates();
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    const errors = [];

    // Fetch data in parallel
    const [calendarEvents, allTasks, stravaActivities] = await Promise.allSettled([
      fetchCalendarEventsRange(startDate, endDate),
      fetchTodoistTasks(),
      fetchStravaActivities(7)
    ]);

    // Process calendar events
    const events = calendarEvents.status === 'fulfilled' ? calendarEvents.value : [];
    if (calendarEvents.status === 'rejected') {
      errors.push({ service: 'calendar', error: calendarEvents.reason.message });
    }

    // Process tasks - filter for this week
    let tasks = [];
    if (allTasks.status === 'fulfilled') {
      const taskList = allTasks.value;
      tasks = taskList.filter(t => {
        if (!t.due) return false;
        const dueDate = new Date(t.due);
        return dueDate >= start && dueDate <= end;
      });
      tasks = sortTasks(tasks);
    } else {
      errors.push({ service: 'todoist', error: allTasks.reason.message });
    }

    // Process fitness data
    let fitness = {
      activities_count: 0,
      total_distance: 0,
      total_duration: 0,
      activities: []
    };
    if (stravaActivities.status === 'fulfilled') {
      const activities = stravaActivities.value;
      const summary = calculateFitnessSummary(activities);
      fitness = {
        activities_count: summary.activities_count,
        total_distance: summary.total_distance,
        total_duration: summary.total_duration,
        activities: activities.slice(0, 10) // Top 10
      };
    } else {
      errors.push({ service: 'strava', error: stravaActivities.reason.message });
    }

    const result = {
      week: {
        start: startDate,
        end: endDate
      },
      events,
      tasks,
      fitness,
      summary: {
        total_events: events.length,
        total_tasks: tasks.length,
        fitness_activities: fitness.activities_count
      },
      ...(errors.length > 0 && { errors })
    };

    // Cache result
    cache.set(cacheKey, result, CACHE_DURATION);

    res.json({
      success: true,
      fromCache: false,
      ...result
    });

  } catch (error) {
    console.error('❌ Error fetching week data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch week data',
      message: error.message
    });
  }
}

/**
 * Get fitness summary
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getFitnessSummary(req, res) {
  try {
    const cacheKey = 'unified:fitness';

    // Try cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        fromCache: true,
        ...cached
      });
    }

    // Fetch activities in parallel
    const [last7Days, last30Days] = await Promise.allSettled([
      fetchStravaActivities(7),
      fetchStravaActivities(30)
    ]);

    let summary = {
      last_7_days: { activities_count: 0, total_distance: 0, total_duration: 0 },
      last_30_days: { activities_count: 0, total_distance: 0, total_duration: 0 },
      recent_activities: []
    };

    if (last7Days.status === 'fulfilled') {
      const activities7 = last7Days.value;
      const summary7 = calculateFitnessSummary(activities7);
      summary.last_7_days = {
        activities_count: summary7.activities_count,
        total_distance: summary7.total_distance,
        total_duration: summary7.total_duration
      };
      summary.recent_activities = activities7.slice(0, 5);
    }

    if (last30Days.status === 'fulfilled') {
      const activities30 = last30Days.value;
      const summary30 = calculateFitnessSummary(activities30);
      summary.last_30_days = {
        activities_count: summary30.activities_count,
        total_distance: summary30.total_distance,
        total_duration: summary30.total_duration
      };
    }

    const errors = [];
    if (last7Days.status === 'rejected') {
      errors.push({ period: '7_days', error: last7Days.reason.message });
    }
    if (last30Days.status === 'rejected') {
      errors.push({ period: '30_days', error: last30Days.reason.message });
    }

    const result = {
      ...summary,
      ...(errors.length > 0 && { errors })
    };

    // Cache result
    cache.set(cacheKey, result, CACHE_DURATION);

    res.json({
      success: true,
      fromCache: false,
      ...result
    });

  } catch (error) {
    console.error('❌ Error fetching fitness summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fitness summary',
      message: error.message
    });
  }
}

module.exports = {
  getTasks,
  getToday,
  getWeek,
  getFitnessSummary
};
