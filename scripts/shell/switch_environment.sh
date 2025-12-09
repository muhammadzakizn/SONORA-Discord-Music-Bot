#!/bin/bash
# SONORA Bot - Environment Switcher
# Quick switch between development environments

echo "🎯 SONORA Bot - Environment Switcher"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git repository not initialized${NC}"
    echo "Run: ./tmp_rovodev_setup_dev_branches.sh first"
    exit 1
fi

# Current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📍 Current environment: ${YELLOW}$CURRENT_BRANCH${NC}"
echo ""

# Menu
echo "Select environment:"
echo "1) 🟢 Production (main) - Stable"
echo "2) 🟡 Development - Active development"
echo "3) 🧪 Beta - Beta testing"
echo "4) 🔬 Alpha - Experimental"
echo "5) ❌ Cancel"
echo ""

read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        TARGET_BRANCH="main"
        ENV_FILE=".env"
        PORT="5000"
        DB_FILE="bot.db"
        COLOR=$GREEN
        ICON="🟢"
        ;;
    2)
        TARGET_BRANCH="development"
        ENV_FILE=".env"
        PORT="5000"
        DB_FILE="bot.db"
        COLOR=$BLUE
        ICON="🔧"
        ;;
    3)
        TARGET_BRANCH="beta"
        ENV_FILE=".env.beta"
        PORT="5002"
        DB_FILE="bot_beta.db"
        COLOR=$YELLOW
        ICON="🧪"
        ;;
    4)
        TARGET_BRANCH="alpha"
        ENV_FILE=".env.alpha"
        PORT="5001"
        DB_FILE="bot_alpha.db"
        COLOR=$RED
        ICON="🔬"
        ;;
    5)
        echo "Cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${COLOR}${ICON} Switching to: $TARGET_BRANCH${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo ""
    git status -s
    echo ""
    read -p "Stash changes? (y/n): " stash_choice
    
    if [ "$stash_choice" = "y" ] || [ "$stash_choice" = "Y" ]; then
        git stash push -m "Auto-stash before switching to $TARGET_BRANCH"
        echo -e "${GREEN}✅ Changes stashed${NC}"
    else
        echo -e "${RED}❌ Cannot switch with uncommitted changes${NC}"
        echo "Commit or stash your changes first"
        exit 1
    fi
fi

# Switch branch
echo "📦 Checking out $TARGET_BRANCH..."
if git checkout $TARGET_BRANCH 2>/dev/null; then
    echo -e "${GREEN}✅ Switched to $TARGET_BRANCH${NC}"
else
    echo -e "${RED}❌ Failed to switch branch${NC}"
    echo "Branch may not exist. Run setup script first."
    exit 1
fi

# Copy environment file
echo ""
echo "🔧 Configuring environment..."
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" .env
    echo -e "${GREEN}✅ Using $ENV_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  $ENV_FILE not found${NC}"
    echo "Using existing .env or create one manually"
fi

# Display environment info
echo ""
echo -e "${COLOR}═══════════════════════════════════════${NC}"
echo -e "${COLOR}${ICON} Environment: $TARGET_BRANCH${NC}"
echo -e "${COLOR}═══════════════════════════════════════${NC}"
echo -e "📄 Config file: ${YELLOW}$ENV_FILE${NC}"
echo -e "🗄️  Database: ${YELLOW}$DB_FILE${NC}"
echo -e "🌐 Web port: ${YELLOW}$PORT${NC}"
echo -e "${COLOR}═══════════════════════════════════════${NC}"
echo ""

# Display next steps
echo "📋 Next steps:"
echo "1. Review/edit .env file if needed"
echo "2. Install dependencies: pip install -r requirements.txt"
echo "3. Run bot: python3 main.py"
echo ""

# Ask if want to start bot
read -p "Start bot now? (y/n): " start_choice

if [ "$start_choice" = "y" ] || [ "$start_choice" = "Y" ]; then
    echo ""
    echo -e "${GREEN}🚀 Starting SONORA Bot...${NC}"
    echo ""
    python3 main.py
else
    echo ""
    echo -e "${BLUE}✨ Environment switched successfully!${NC}"
    echo "Run: python3 main.py when ready"
fi
