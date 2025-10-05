# Lifestack

> A unified API gateway for life services and productivity tools running on Raspberry Pi 5

Lifestack is a Node.js monorepo that aggregates and proxies multiple life services (calendar, tasks, fitness, notifications) into a single, unified API. Built to run efficiently on a Raspberry Pi 5, it provides caching, normalization, and intelligent data aggregation from services like Google Calendar, Todoist, Strava, Pavlok, and Notion.

## Why Lifestack?

- **Single API** for all your life services
- **Smart Caching** reduces API calls and improves response times
- **Data Normalization** provides consistent formats across services
- **Unified Dashboard** combines data from multiple sources
- **Self-Hosted** runs on your own hardware (Raspberry Pi 5)
- **Modular** easy to add new services

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Lifestack API                          │
│                    (Raspberry Pi 5)                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│   Calendar     │   │    Memory      │   │   Strava       │
│   Service      │   │    Service     │   │   Service      │
│                │   │                │   │                │
│ • Google Cal   │   │ • LLM Memories │   │ • Activities   │
│ • Events       │   │ • MongoDB      │   │ • Stats        │
│ • Caching      │   │ • Search       │   │ • Caching      │
└────────────────┘   └────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│    Pavlok      │   │    Notion      │   │    Unified     │
│    Service     │   │    Service     │   │    Service     │
│                │   │                │   │                │
│ • Beep         │   │ • Search       │   │ • Tasks        │
│ • Vibrate      │   │ • Databases    │   │ • Dashboard    │
│ • Shock        │   │ • Pages        │   │ • Aggregation  │
│ • History      │   │ • Caching      │   │ • Multi-source │
└────────────────┘   └────────────────┘   └────────────────┘
```

## Services

### Core Services
- **Calendar** - Google Calendar proxy with intelligent caching
- **Memory** - LLM conversation memory storage (MongoDB)
- **Unified** - Multi-service data aggregation

### Integrations
- **Strava** - Fitness tracking and activity data
- **Pavlok** - Habit reinforcement device control
- **Notion** - Workspace and database queries
- **Todoist** - Task management (used by Unified service)

## Prerequisites

- **Hardware**: Raspberry Pi 5 (4GB+ recommended)
- **OS**: Raspberry Pi OS (64-bit)
- **Node.js**: v18+
- **MongoDB**: v6+ (local or cloud)
- **Memory**: 2GB+ available RAM

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/lifestack.git
cd lifestack

# Copy environment template
cp .env.example .env

# Edit with your API tokens
nano .env
```

### 2. Configure API Tokens

Fill in your `.env` file with the required tokens:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/lifestack
API_KEY=your_secure_random_key_here

# Google Calendar (required for calendar service)
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_TOKEN_PATH=./token.json

# Optional (enable services you want)
TODOIST_TOKEN=your_todoist_token
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
PAVLOK_TOKEN=your_pavlok_token
NOTION_TOKEN=your_notion_token
```

### 3. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
- ✅ Validate environment variables
- ✅ Install dependencies
- ✅ Setup systemd service
- ✅ Start the server
- ✅ Show test URLs

### 4. Verify

```bash
# Check service status
sudo systemctl status lifestack

# Test the API
curl http://localhost:3000/health

# Run comprehensive tests
npm test
```

## Environment Variables

### Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `MONGODB_URI` | MongoDB connection string | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or local install |
| `API_KEY` | Authentication key for Lifestack API | Generate: `openssl rand -hex 32` |

### Google Calendar

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CREDENTIALS_PATH` | Path to OAuth credentials | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_TOKEN_PATH` | Path to OAuth token | Auto-generated after first OAuth flow |
| `CALENDAR_CACHE_DURATION` | Cache duration in seconds | Default: 900 (15 min) |

### Optional Services

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `TODOIST_TOKEN` | Todoist API token | [Todoist Integrations](https://todoist.com/prefs/integrations) |
| `STRAVA_CLIENT_ID` | Strava OAuth client ID | [Strava API Settings](https://www.strava.com/settings/api) - Create an app |
| `STRAVA_CLIENT_SECRET` | Strava OAuth client secret | Same as above |
| `PAVLOK_TOKEN` | Pavlok API token | [Pavlok Account](https://pavlok.com/) |
| `NOTION_TOKEN` | Notion integration token | [Notion Integrations](https://www.notion.so/my-integrations) |

**Note:** After setting up Strava credentials, run the one-time OAuth setup:
```bash
node services/strava/oauth-setup.js
```
This will create `.strava-tokens.json` with auto-refreshing access tokens (tokens refresh automatically every ~6 hours).

## API Documentation

### Core Endpoints

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Lifestack server is running",
  "timestamp": "2025-01-06T10:00:00.000Z",
  "uptime": 3600
}
```

### Calendar Service (`/api/calendar`)

#### Get Today's Events
```bash
GET /api/calendar/events/today
```

#### Get Events by Date
```bash
GET /api/calendar/events/:date
# Example: GET /api/calendar/events/2025-01-06
```

#### Create Event
```bash
POST /api/calendar/events
Content-Type: application/json

{
  "summary": "Team Meeting",
  "start": "2025-01-06T14:00:00Z",
  "end": "2025-01-06T15:00:00Z",
  "description": "Weekly sync",
  "location": "Office"
}
```

### Memory Service (`/api/memory`)

**Authentication Required**: Add `x-api-key: YOUR_API_KEY` header

#### Create Memory
```bash
POST /api/memory
x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "content": "Important decision about project architecture",
  "tags": ["decision", "architecture"],
  "context": "Sprint planning meeting",
  "source": "claude"
}
```

#### Search Memories
```bash
GET /api/memory/search?q=architecture
x-api-key: YOUR_API_KEY
```

#### Get Recent Memories
```bash
GET /api/memory/recent?limit=10
x-api-key: YOUR_API_KEY
```

### Strava Service (`/api/strava`)

#### Get Recent Activities
```bash
GET /api/strava/recent?limit=10
```

#### Get Athlete Stats
```bash
GET /api/strava/stats
```

### Pavlok Service (`/api/pavlok`)

#### Trigger Beep
```bash
POST /api/pavlok/beep
Content-Type: application/json

{
  "intensity": 3,
  "reason": "Task completed"
}
```

#### Trigger Vibration
```bash
POST /api/pavlok/vibrate
Content-Type: application/json

{
  "intensity": 2,
  "reason": "Reminder to stand"
}
```

#### Trigger Shock (requires confirmation)
```bash
POST /api/pavlok/shock
Content-Type: application/json

{
  "intensity": 1,
  "confirm": true,
  "reason": "Failed goal"
}
```

### Notion Service (`/api/notion`)

#### Quick Search
```bash
POST /api/notion/quick-search
Content-Type: application/json

{
  "query": "meeting notes"
}
```

#### Query Database
```bash
POST /api/notion/databases/:id/query
Content-Type: application/json

{
  "filter": {
    "property": "Status",
    "select": { "equals": "In Progress" }
  }
}
```

### Unified Service (`/api/unified`)

#### Get Today's Dashboard
```bash
GET /api/unified/today
```

**Response:**
```json
{
  "date": "2025-01-06",
  "events": [...],
  "tasks": {
    "due_today": [...],
    "overdue": [...],
    "completed_today": [...]
  },
  "fitness": {
    "activities_this_week": 3,
    "total_distance": 15000,
    "total_duration": 3600
  },
  "summary": {
    "total_events": 5,
    "total_tasks": 8,
    "completed_tasks": 2
  }
}
```

#### Get Tasks
```bash
GET /api/unified/tasks?filter=today&completed=false
```

#### Get Fitness Summary
```bash
GET /api/unified/fitness-summary
```

## Deployment on Raspberry Pi 5

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB (optional - can use cloud)
sudo apt-get install -y mongodb

# Verify installations
node -v
npm -v
```

### 2. Setup Google Calendar OAuth

```bash
# Download credentials from Google Cloud Console
# Place in project root as credentials.json

# Run OAuth flow (one-time)
node services/calendar/oauth-setup.js

# This creates token.json
```

### 3. Deploy

```bash
./deploy.sh
```

### 4. Manage Service

```bash
# Start
sudo systemctl start lifestack

# Stop
sudo systemctl stop lifestack

# Restart
sudo systemctl restart lifestack

# Status
sudo systemctl status lifestack

# Enable auto-start on boot
sudo systemctl enable lifestack

# View logs
sudo journalctl -u lifestack -f
```

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
sudo journalctl -u lifestack -n 50
```

**Common issues:**
- Missing `.env` file
- Invalid API tokens
- MongoDB not running
- Port 3000 already in use

**Fix:**
```bash
# Check if port is in use
sudo lsof -i :3000

# Verify .env exists
ls -la .env

# Test MongoDB connection
mongosh $MONGODB_URI
```

### API Authentication Errors

**Symptom:** `401 Unauthorized` responses

**Fix:**
```bash
# Verify API_KEY is set
grep API_KEY .env

# Test with correct header
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/memory
```

### MongoDB Connection Issues

**Symptom:** `MongoServerError: Authentication failed`

**Fix:**
```bash
# Test connection
mongosh "$MONGODB_URI"

# Check MongoDB is running
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb
```

### Cache Not Working

**Symptom:** Slow responses, too many API calls

**Check:**
```bash
# View cache stats
curl http://localhost:3000/api/strava/cache/stats

# Clear cache
curl -X POST http://localhost:3000/api/strava/cache/clear
```

### Google Calendar Token Expired

**Symptom:** `Invalid or expired token`

**Fix:**
```bash
# Remove old token
rm token.json

# Re-run OAuth flow
node services/calendar/oauth-setup.js
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run in dev mode (with auto-reload)
npm run dev

# Run tests
npm test
```

### Project Structure

```
lifestack/
├── config/          # Configuration files
├── models/          # MongoDB models
├── scripts/         # Utility scripts
├── services/        # Service modules
│   ├── calendar/    # Google Calendar
│   ├── memory/      # LLM memories
│   ├── strava/      # Fitness tracking
│   ├── pavlok/      # Habit device
│   ├── notion/      # Workspace
│   ├── todoist/     # Tasks
│   └── unified/     # Data aggregation
├── shared/          # Shared utilities
│   ├── middleware/  # Auth, cache, logging
│   └── utils/       # API client, normalization
├── .env.example     # Environment template
├── deploy.sh        # Deployment script
├── index.js         # Main entry point
└── package.json     # Dependencies
```

### Adding a New Service

1. Create service directory: `services/myservice/`
2. Implement client: `services/myservice/client.js`
3. Implement controller: `services/myservice/controller.js`
4. Implement routes: `services/myservice/routes.js`
5. Export router: `services/myservice/index.js`
6. Mount in `index.js`: `app.use('/api/myservice', router)`
7. Add config to `config/services.js`
8. Update `.env.example`

## Useful Commands

```bash
# View service status
sudo systemctl status lifestack

# View logs (follow)
sudo journalctl -u lifestack -f

# View logs (last 100 lines)
sudo journalctl -u lifestack -n 100

# Restart service
sudo systemctl restart lifestack

# Stop service
sudo systemctl stop lifestack

# Check service is enabled
sudo systemctl is-enabled lifestack

# Run API tests
npm test

# Check which process is using port 3000
sudo lsof -i :3000

# Monitor system resources
htop
```

## Performance Tips

### Optimize Caching

```javascript
// Adjust cache durations in controller
const CACHE_DURATIONS = {
  SEARCH: 5 * 60,      // 5 minutes
  DATABASE: 30 * 60,   // 30 minutes (rarely changes)
  PAGE: 10 * 60        // 10 minutes
};
```

### MongoDB Optimization

```bash
# Create indexes for better query performance
mongosh $MONGODB_URI

use lifestack
db.memories.createIndex({ timestamp: -1 })
db.memories.createIndex({ tags: 1 })
db.pavlokstimuli.createIndex({ timestamp: -1, type: 1 })
```

### Resource Limits

Edit `lifestack.service`:
```ini
[Service]
MemoryLimit=512M        # Adjust based on Pi memory
LimitNOFILE=65536       # Max open files
```

## Security Notes

- **API_KEY**: Use a strong random key (32+ characters)
- **MongoDB**: Use authentication in production
- **Network**: Consider firewall rules for port 3000
- **Tokens**: Never commit `.env` or `token.json` to git
- **HTTPS**: Use reverse proxy (nginx) for SSL in production

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/lifestack/issues)
- **Docs**: This README
- **Logs**: `sudo journalctl -u lifestack -f`

---

Built with ❤️ for Raspberry Pi 5
