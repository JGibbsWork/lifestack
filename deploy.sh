#!/bin/bash

# Lifestack Deployment Script
# Deploys the Lifestack API on Raspberry Pi 5

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║       Lifestack Deployment Script         ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}Error: Do not run this script as root${NC}"
  exit 1
fi

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}📍 Working directory: ${SCRIPT_DIR}${NC}"

# Check for required files
echo -e "\n${BLUE}🔍 Checking required files...${NC}"

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ Error: .env file not found${NC}"
  echo "   Please copy .env.example to .env and fill in your API tokens:"
  echo "   cp .env.example .env"
  echo "   nano .env"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Required files found${NC}"

# Validate critical environment variables
echo -e "\n${BLUE}🔑 Validating environment variables...${NC}"

source .env

# Check MONGODB_URI
if [ -z "$MONGODB_URI" ]; then
  echo -e "${RED}❌ Error: MONGODB_URI not set in .env${NC}"
  exit 1
fi

# Check API_KEY
if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_api_key_here" ]; then
  echo -e "${RED}❌ Error: API_KEY not set or using default value${NC}"
  echo "   Please set a secure API_KEY in .env"
  exit 1
fi

# Warn about missing optional tokens
WARNINGS=0

if [ -z "$TODOIST_TOKEN" ] || [ "$TODOIST_TOKEN" = "your_todoist_api_token_here" ]; then
  echo -e "${YELLOW}⚠️  Warning: TODOIST_TOKEN not set (Todoist features disabled)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

if [ -z "$STRAVA_ACCESS_TOKEN" ] || [ "$STRAVA_ACCESS_TOKEN" = "your_strava_access_token_here" ]; then
  echo -e "${YELLOW}⚠️  Warning: STRAVA_ACCESS_TOKEN not set (Strava features disabled)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

if [ -z "$PAVLOK_TOKEN" ] || [ "$PAVLOK_TOKEN" = "your_pavlok_token_here" ]; then
  echo -e "${YELLOW}⚠️  Warning: PAVLOK_TOKEN not set (Pavlok features disabled)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

if [ -z "$NOTION_TOKEN" ] || [ "$NOTION_TOKEN" = "your_notion_integration_token_here" ]; then
  echo -e "${YELLOW}⚠️  Warning: NOTION_TOKEN not set (Notion features disabled)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}   (Some services will be unavailable without their API tokens)${NC}"
fi

echo -e "${GREEN}✅ Environment validation complete${NC}"

# Check Node.js
echo -e "\n${BLUE}🔍 Checking Node.js installation...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Error: Node.js not found${NC}"
  echo "   Install Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
  echo "   Then: sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ Error: npm not found${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm ${NPM_VERSION} found${NC}"

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"

npm install --production

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Setup systemd service
echo -e "\n${BLUE}⚙️  Setting up systemd service...${NC}"

# Copy service file to systemd
sudo cp lifestack.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable lifestack

echo -e "${GREEN}✅ Systemd service configured${NC}"

# Start the service
echo -e "\n${BLUE}🚀 Starting Lifestack service...${NC}"

sudo systemctl restart lifestack

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet lifestack; then
  echo -e "${GREEN}✅ Lifestack service is running!${NC}"
else
  echo -e "${RED}❌ Error: Service failed to start${NC}"
  echo "   Check logs with: sudo journalctl -u lifestack -n 50"
  exit 1
fi

# Get server port
PORT=${PORT:-3000}

# Display success message
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║     ✅ Deployment Successful!              ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Show service status
echo -e "${BLUE}📊 Service Status:${NC}"
sudo systemctl status lifestack --no-pager | head -5

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo -e "\n${BLUE}🔗 Test URLs:${NC}"
echo "   Health Check:    http://localhost:${PORT}/health"
echo "   Calendar API:    http://localhost:${PORT}/api/calendar/health"
echo "   Memory API:      http://localhost:${PORT}/api/memory"
echo "   Strava API:      http://localhost:${PORT}/api/strava/health"
echo "   Pavlok API:      http://localhost:${PORT}/api/pavlok/health"
echo "   Notion API:      http://localhost:${PORT}/api/notion/health"
echo "   Unified API:     http://localhost:${PORT}/api/unified/today"

if [ ! -z "$LOCAL_IP" ]; then
  echo -e "\n${BLUE}🌐 External Access (from other devices):${NC}"
  echo "   http://${LOCAL_IP}:${PORT}/health"
fi

echo -e "\n${BLUE}📝 Useful Commands:${NC}"
echo "   View status:     ${GREEN}sudo systemctl status lifestack${NC}"
echo "   View logs:       ${GREEN}sudo journalctl -u lifestack -f${NC}"
echo "   Restart service: ${GREEN}sudo systemctl restart lifestack${NC}"
echo "   Stop service:    ${GREEN}sudo systemctl stop lifestack${NC}"
echo "   Test APIs:       ${GREEN}npm test${NC}"

echo -e "\n${BLUE}🧪 Quick Test:${NC}"
echo "   curl http://localhost:${PORT}/health"

echo ""
