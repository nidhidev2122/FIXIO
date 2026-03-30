#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting FSD Login Signup - Full Stack!${NC}"
echo ""
echo -e "${BLUE}This will start:${NC}"
echo "  ✓ Backend server on http://localhost:5000"
echo "  ✓ Frontend React app on http://localhost:3001"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Kill any existing processes on ports 3000, 3001, 5000
echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"
pkill -f "node server.js" 2>/dev/null || true
sleep 1

echo ""
echo -e "${GREEN}✅ Starting backend server...${NC}"
echo -e "${BLUE}Available API endpoints:${NC}"
echo "  • POST   http://localhost:5000/api/register"
echo "  • POST   http://localhost:5000/api/login"
echo "  • POST   http://localhost:5000/api/forgot-password"
echo "  • POST   http://localhost:5000/api/social-login"
echo "  • GET    http://localhost:5000/api/users (testing)"
echo "  • GET    http://localhost:5000/api/health"
echo ""

# Start backend in background
node server.js &
BACKEND_PID=$!
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend is running (PID: $BACKEND_PID)${NC}"
echo ""
echo -e "${GREEN}✅ Starting frontend React app...${NC}"
echo "  • Frontend: http://localhost:3001"
echo ""
echo -e "${BLUE}📝 To stop the servers:${NC}"
echo "  Press Ctrl+C in this terminal"
echo ""

# Start frontend
npm start

# When npm start exits, kill the backend
kill $BACKEND_PID 2>/dev/null || true
