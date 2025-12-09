#!/bin/bash
# SONORA Bot - Server Startup Script
# For Pterodactyl Panel / Linux Server Deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              SONORA BOT - SERVER STARTUP                     ║"
echo "║              Bot + Web Dashboard (Production)                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$PROJECT_DIR/web"

# Default ports (can be overridden by environment)
BOT_API_PORT="${WEB_DASHBOARD_PORT:-5000}"
WEB_PORT="${WEB_PORT:-3000}"

# Check for required files
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if [ ! -f "$PROJECT_DIR/main.py" ]; then
        echo -e "${RED}❌ main.py not found!${NC}"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        echo -e "${RED}❌ .env file not found!${NC}"
        echo -e "${YELLOW}Copy .env.example to .env and configure it${NC}"
        exit 1
    fi
    
    if [ ! -d "$WEB_DIR" ]; then
        echo -e "${RED}❌ web directory not found!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # Python dependencies
    if [ -f "$PROJECT_DIR/requirements.txt" ]; then
        echo -e "${CYAN}Installing Python dependencies...${NC}"
        pip install -r "$PROJECT_DIR/requirements.txt" --quiet
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    fi
    
    # Node.js dependencies
    if [ -f "$WEB_DIR/package.json" ]; then
        echo -e "${CYAN}Installing Node.js dependencies...${NC}"
        cd "$WEB_DIR"
        npm install --silent
        echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
    fi
}

# Build Next.js for production
build_web() {
    echo -e "${YELLOW}Building web dashboard for production...${NC}"
    cd "$WEB_DIR"
    npm run build
    echo -e "${GREEN}✓ Web dashboard built${NC}"
}

# Start Python bot (background)
start_bot() {
    echo -e "${YELLOW}Starting SONORA Bot...${NC}"
    cd "$PROJECT_DIR"
    
    # Export environment variables
    export BOT_VERSION="stable"
    export WEB_DASHBOARD_PORT="$BOT_API_PORT"
    export ENABLE_WEB_DASHBOARD="true"
    
    # Start bot in background
    python3 main.py &
    BOT_PID=$!
    echo $BOT_PID > /tmp/sonora_bot.pid
    
    sleep 3
    
    if kill -0 $BOT_PID 2>/dev/null; then
        echo -e "${GREEN}✓ Bot started (PID: $BOT_PID, API: :$BOT_API_PORT)${NC}"
    else
        echo -e "${RED}❌ Bot failed to start${NC}"
        exit 1
    fi
}

# Start Next.js dashboard (foreground)
start_web() {
    echo -e "${YELLOW}Starting Web Dashboard...${NC}"
    cd "$WEB_DIR"
    
    # Export environment for Next.js
    export PORT="$WEB_PORT"
    export BOT_API_URL="http://localhost:$BOT_API_PORT"
    
    echo -e "${GREEN}✓ Web dashboard starting on port $WEB_PORT${NC}"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  SONORA is now running!${NC}"
    echo -e "${CYAN}  Web Dashboard: http://0.0.0.0:$WEB_PORT${NC}"
    echo -e "${CYAN}  Bot API: http://localhost:$BOT_API_PORT${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Start Next.js in production mode (foreground)
    npm run start
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    
    # Kill bot
    if [ -f /tmp/sonora_bot.pid ]; then
        BOT_PID=$(cat /tmp/sonora_bot.pid)
        if kill -0 $BOT_PID 2>/dev/null; then
            kill $BOT_PID
            echo -e "${GREEN}✓ Bot stopped${NC}"
        fi
        rm -f /tmp/sonora_bot.pid
    fi
    
    echo -e "${GREEN}Goodbye! 👋${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    check_requirements
    
    # Parse arguments
    case "${1:-run}" in
        install)
            install_deps
            ;;
        build)
            build_web
            ;;
        run)
            start_bot
            start_web
            ;;
        all)
            install_deps
            build_web
            start_bot
            start_web
            ;;
        *)
            echo "Usage: $0 {install|build|run|all}"
            echo ""
            echo "Commands:"
            echo "  install  - Install Python and Node.js dependencies"
            echo "  build    - Build Next.js for production"
            echo "  run      - Start bot and web dashboard"
            echo "  all      - Install, build, and run"
            exit 1
            ;;
    esac
}

main "$@"
