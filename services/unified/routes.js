/**
 * Unified Service - API Routes
 * Aggregates data from multiple sources
 */

const express = require('express');
const controller = require('./controller');

const router = express.Router();

/**
 * GET /tasks
 * Get tasks from Todoist with filtering and normalization
 * Cached for 5 minutes
 *
 * Query params:
 * - filter: "today" | "overdue" | "upcoming" | "all" (default: all)
 * - completed: true | false (default: false)
 *
 * Returns normalized task format:
 * {
 *   id: "todoist:original_id",
 *   title: string,
 *   due: ISO date or null,
 *   completed: boolean,
 *   priority: 1-4,
 *   source: "todoist",
 *   project: string,
 *   labels: string[]
 * }
 */
router.get('/tasks', controller.getTasks);

/**
 * GET /today
 * Get combined data for today's dashboard
 * Cached for 5 minutes
 *
 * Returns:
 * {
 *   date: "2025-01-06",
 *   events: [...],                    // Calendar events for today
 *   tasks: {
 *     due_today: [...],
 *     overdue: [...],
 *     completed_today: [...]
 *   },
 *   fitness: {
 *     activities_this_week: number,
 *     total_distance: number,          // meters
 *     total_duration: number,          // seconds
 *     last_activity: {...} or null
 *   },
 *   summary: {
 *     total_events: number,
 *     total_tasks: number,
 *     completed_tasks: number,
 *     fitness_activities: number
 *   },
 *   errors: [...]                      // Optional: if any service failed
 * }
 */
router.get('/today', controller.getToday);

/**
 * GET /week
 * Get combined data for this week
 * Cached for 5 minutes
 *
 * Returns:
 * {
 *   week: {
 *     start: "2025-01-05",
 *     end: "2025-01-11"
 *   },
 *   events: [...],                    // Calendar events this week
 *   tasks: [...],                     // Tasks due this week
 *   fitness: {
 *     activities_count: number,
 *     total_distance: number,
 *     total_duration: number,
 *     activities: [...]               // Recent activities
 *   },
 *   summary: {
 *     total_events: number,
 *     total_tasks: number,
 *     fitness_activities: number
 *   },
 *   errors: [...]                      // Optional: if any service failed
 * }
 */
router.get('/week', controller.getWeek);

/**
 * GET /fitness-summary
 * Get aggregated fitness data
 * Cached for 5 minutes
 *
 * Returns:
 * {
 *   last_7_days: {
 *     activities_count: number,
 *     total_distance: number,          // meters
 *     total_duration: number           // seconds
 *   },
 *   last_30_days: {
 *     activities_count: number,
 *     total_distance: number,
 *     total_duration: number
 *   },
 *   recent_activities: [...],          // Last 5 activities
 *   errors: [...]                      // Optional: if any period failed
 * }
 */
router.get('/fitness-summary', controller.getFitnessSummary);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'unified',
    status: 'ok',
    timestamp: new Date().toISOString(),
    aggregates: {
      tasks: 'todoist',
      calendar: 'google-calendar',
      fitness: 'strava'
    },
    features: [
      'Normalized task format',
      'Multi-source daily dashboard',
      'Weekly summary',
      'Fitness aggregation',
      'Graceful error handling'
    ],
    note: 'Uses Promise.all() for parallel data fetching. If one service fails, others still return data.'
  });
});

module.exports = router;
