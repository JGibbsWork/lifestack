#!/usr/bin/env node

/**
 * API Test Script
 * Tests all Lifestack API endpoints
 */

const axios = require('axios');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const API_KEY = process.env.API_KEY;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passedTests = 0;
let failedTests = 0;

/**
 * Test an endpoint
 */
async function testEndpoint(name, url, options = {}) {
  try {
    const response = await axios({
      method: options.method || 'GET',
      url: `${BASE_URL}${url}`,
      headers: options.headers || {},
      data: options.data,
      timeout: 10000
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      passedTests++;
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name} - Status: ${response.status}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    const message = error.response?.data?.message || error.message;
    console.log(`${colors.red}✗${colors.reset} ${name} - ${status}: ${message}`);
    failedTests++;
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       Lifestack API Test Suite            ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}Testing against: ${BASE_URL}${colors.reset}\n`);

  // Core endpoints
  console.log(`${colors.yellow}Core Endpoints:${colors.reset}`);
  await testEndpoint('Health Check', '/health');
  await testEndpoint('Root Endpoint', '/');

  // Calendar API
  console.log(`\n${colors.yellow}Calendar API:${colors.reset}`);
  await testEndpoint('Calendar Health', '/api/calendar/health');
  await testEndpoint('Calendar Today\'s Events', '/api/calendar/events/today');
  await testEndpoint('Calendar Cache Stats', '/api/calendar/cache/stats');

  // Memory API (requires auth)
  console.log(`\n${colors.yellow}Memory API (requires API key):${colors.reset}`);
  if (API_KEY && API_KEY !== 'your_api_key_here') {
    await testEndpoint('Memory - Get All', '/api/memory?limit=5', {
      headers: { 'x-api-key': API_KEY }
    });
    await testEndpoint('Memory - Get Recent', '/api/memory/recent?limit=5', {
      headers: { 'x-api-key': API_KEY }
    });
    await testEndpoint('Memory - Stats', '/api/memory/stats/summary', {
      headers: { 'x-api-key': API_KEY }
    });
  } else {
    console.log(`${colors.yellow}  Skipped (API_KEY not configured)${colors.reset}`);
  }

  // Strava API
  console.log(`\n${colors.yellow}Strava API:${colors.reset}`);
  await testEndpoint('Strava Health', '/api/strava/health');
  if (process.env.STRAVA_ACCESS_TOKEN && process.env.STRAVA_ACCESS_TOKEN !== 'your_strava_access_token_here') {
    await testEndpoint('Strava Recent Activities', '/api/strava/recent?limit=5');
    await testEndpoint('Strava Cache Stats', '/api/strava/cache/stats');
  } else {
    console.log(`${colors.yellow}  Strava token not configured - skipping data endpoints${colors.reset}`);
  }

  // Pavlok API
  console.log(`\n${colors.yellow}Pavlok API:${colors.reset}`);
  await testEndpoint('Pavlok Health', '/api/pavlok/health');
  await testEndpoint('Pavlok Rate Limit Status', '/api/pavlok/rate-limit');
  if (API_KEY && API_KEY !== 'your_api_key_here') {
    await testEndpoint('Pavlok History', '/api/pavlok/history?limit=5', {
      headers: { 'x-api-key': API_KEY }
    });
  }

  // Notion API
  console.log(`\n${colors.yellow}Notion API:${colors.reset}`);
  await testEndpoint('Notion Health', '/api/notion/health');
  await testEndpoint('Notion Cache Stats', '/api/notion/cache/stats');

  // Unified API
  console.log(`\n${colors.yellow}Unified API:${colors.reset}`);
  await testEndpoint('Unified Health', '/api/unified/health');
  if (process.env.TODOIST_TOKEN && process.env.TODOIST_TOKEN !== 'your_todoist_api_token_here') {
    await testEndpoint('Unified Tasks', '/api/unified/tasks?filter=all&limit=5');
    await testEndpoint('Unified Today Dashboard', '/api/unified/today');
    await testEndpoint('Unified Fitness Summary', '/api/unified/fitness-summary');
  } else {
    console.log(`${colors.yellow}  Todoist token not configured - skipping data endpoints${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║           Test Results                     ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

  const total = passedTests + failedTests;
  const percentage = total > 0 ? Math.round((passedTests / total) * 100) : 0;

  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Total:  ${total}`);
  console.log(`Success Rate: ${percentage}%`);

  if (failedTests === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the output above for details.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error.message);
  process.exit(1);
});
