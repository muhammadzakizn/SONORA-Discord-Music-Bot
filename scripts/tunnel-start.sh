#!/bin/bash
#
# SONORA - Cloudflare Tunnel Startup Script
# This script starts the Cloudflare tunnel for secure public access
#
# Prerequisites:
# 1. Install cloudflared: brew install cloudflare/cloudflare/cloudflared
# 2. Login to Cloudflare: cloudflared tunnel login
# 3. Create tunnel: cloudflared tunnel create sonora
#
# Usage:
#   ./tunnel-start.sh [port]
#   ./tunnel-start.sh 3000      # For web dashboard (Next.js)
#   ./tunnel-start.sh 5000      # For API (Python Flask)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default ports
WEB_PORT=${1:-3000}
API_PORT=${2:-5000}
TUNNEL_NAME="sonora"

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              SONORA - Cloudflare Tunnel Manager               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_cloudflared() {
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${RED}❌ cloudflared is not installed!${NC}"
        echo ""
        echo -e "${YELLOW}Install with:${NC}"
        echo "  brew install cloudflare/cloudflare/cloudflared"
        echo ""
        echo -e "${YELLOW}Or download from:${NC}"
        echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
    echo -e "${GREEN}✓ cloudflared found${NC}"
}

check_login() {
    if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
        echo -e "${YELLOW}⚠️  You need to login to Cloudflare first!${NC}"
        echo ""
        echo "Run: cloudflared tunnel login"
        echo ""
        read -p "Login now? (y/n): " login_choice
        if [ "$login_choice" = "y" ] || [ "$login_choice" = "Y" ]; then
            cloudflared tunnel login
        else
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Cloudflare authenticated${NC}"
}

check_tunnel() {
    if ! cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
        echo -e "${YELLOW}⚠️  Tunnel '$TUNNEL_NAME' not found. Creating...${NC}"
        cloudflared tunnel create "$TUNNEL_NAME"
    fi
    echo -e "${GREEN}✓ Tunnel '$TUNNEL_NAME' exists${NC}"
}

start_quick_tunnel() {
    echo ""
    echo -e "${CYAN}${BOLD}Starting Quick Tunnel (no configuration needed)...${NC}"
    echo -e "${YELLOW}This creates a temporary public URL${NC}"
    echo ""
    
    echo -e "${GREEN}🌐 Starting tunnel for web dashboard (port $WEB_PORT)...${NC}"
    echo -e "${CYAN}Your public URL will appear below:${NC}"
    echo ""
    
    cloudflared tunnel --url http://localhost:$WEB_PORT
}

start_named_tunnel() {
    echo ""
    echo -e "${CYAN}${BOLD}Starting Named Tunnel '$TUNNEL_NAME'...${NC}"
    echo ""
    
    # Create config file if it doesn't exist
    CONFIG_FILE="$HOME/.cloudflared/config-sonora.yml"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${YELLOW}Creating tunnel configuration...${NC}"
        
        # Get tunnel ID
        TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
        
        cat > "$CONFIG_FILE" << EOF
# SONORA Cloudflare Tunnel Configuration
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  # Web Dashboard (Next.js)
  - hostname: sonora.yourdomain.com
    service: http://localhost:$WEB_PORT
  
  # API Backend (Python/Flask)
  - hostname: api.sonora.yourdomain.com
    service: http://localhost:$API_PORT
  
  # Catch-all (required)
  - service: http_status:404
EOF
        echo -e "${GREEN}✓ Configuration created at: $CONFIG_FILE${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Please edit the config to set your domain:${NC}"
        echo "   nano $CONFIG_FILE"
        echo ""
        echo -e "${YELLOW}Then add DNS records in Cloudflare:${NC}"
        echo "   cloudflared tunnel route dns $TUNNEL_NAME sonora.yourdomain.com"
        echo ""
        exit 0
    fi
    
    echo -e "${GREEN}Starting tunnel with config: $CONFIG_FILE${NC}"
    cloudflared tunnel --config "$CONFIG_FILE" run
}

show_menu() {
    echo ""
    echo -e "${BOLD}Select tunnel mode:${NC}"
    echo ""
    echo "1. 🚀 Quick Tunnel (temporary URL, no setup needed)"
    echo "2. 🔧 Named Tunnel (custom domain, requires DNS setup)"
    echo "3. ❌ Exit"
    echo ""
    read -p "Choice (1-3): " choice
    
    case $choice in
        1) start_quick_tunnel ;;
        2) start_named_tunnel ;;
        3) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}"; show_menu ;;
    esac
}

# Signal handler for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down tunnel...${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main
print_banner
check_cloudflared
check_login

echo ""
echo -e "${GREEN}Web Dashboard Port: $WEB_PORT${NC}"
echo -e "${GREEN}API Port: $API_PORT${NC}"

show_menu
