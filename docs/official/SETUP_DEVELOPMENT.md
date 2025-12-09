# 🎯 SONORA Bot - Setup Development Environment

## 📋 Quick Setup (3 Steps)

### Step 1: Initialize Git & Branches
```bash
chmod +x tmp_rovodev_setup_dev_branches.sh
./tmp_rovodev_setup_dev_branches.sh
```

**Output:**
```
🚀 SONORA Bot - Development Branch Setup
========================================

✅ Git repository initialized
📍 Current branch: main
✅ Development branch ready
✅ Beta branch ready
✅ Alpha branch ready

📋 Branch Structure:
├── main/master    (Production/Stable)
├── development    (Development)
├── beta          (Beta Testing)
└── alpha         (Alpha Testing/Experimental)
```

---

### Step 2: Configure Environment Files

#### Alpha Environment (.env.alpha)
```bash
# Copy and edit
cp .env.alpha .env.alpha.local
nano .env.alpha.local
```

**Required settings:**
- `DISCORD_TOKEN` - Your alpha bot token
- `SPOTIFY_CLIENT_ID` - Spotify credentials
- `SPOTIFY_CLIENT_SECRET` - Spotify credentials
- `GENIUS_API_TOKEN` - Genius API token

#### Beta Environment (.env.beta)
```bash
# Copy and edit
cp .env.beta .env.beta.local
nano .env.beta.local
```

**Required settings:** (Same as alpha but different bot token)

---

### Step 3: Start Development

#### Option A: Using Environment Switcher (Recommended)
```bash
chmod +x switch_environment.sh
./switch_environment.sh
```

Interactive menu:
```
1) 🟢 Production (main) - Stable
2) 🟡 Development - Active development
3) 🧪 Beta - Beta testing
4) 🔬 Alpha - Experimental
```

#### Option B: Manual Switch
```bash
# Switch to alpha
git checkout alpha
cp .env.alpha .env

# Install dependencies
pip install -r requirements.txt

# Run bot
python3 main.py
```

---

## 🔄 Daily Development Workflow

### Morning Routine:
```bash
# Update from remote (if using GitHub/GitLab)
git fetch origin
git pull origin alpha

# Start development
./switch_environment.sh
# Select: 4) Alpha
```

### Working on Feature:
```bash
# Create feature branch
git checkout alpha
git checkout -b feature/voice-effects

# Make changes
# Edit code...

# Test
python3 main.py

# Commit
git add .
git commit -m "feat: add voice effects system"

# Merge to alpha
git checkout alpha
git merge feature/voice-effects

# Delete feature branch
git branch -d feature/voice-effects
```

### End of Day:
```bash
# Push to remote
git push origin alpha

# Switch to stable for safety
git checkout main
```

---

## 🧪 Testing Workflow

### Alpha → Beta Promotion:
```bash
# When features are stable in alpha
git checkout beta
git merge alpha

# Test in beta environment
./switch_environment.sh
# Select: 3) Beta

# Run comprehensive tests
python3 main.py
```

### Beta → Production Release:
```bash
# After 1-2 weeks of beta testing
git checkout development
git merge beta

# Final testing in development
./switch_environment.sh
# Select: 2) Development

# If all good, release to production
git checkout main
git merge development

# Tag the release
git tag -a v3.4.0 -m "Release version 3.4.0"

# Update stable environment
./switch_environment.sh
# Select: 1) Production
```

---

## 🗄️ Database Management

### Separate Databases for Each Environment:

```bash
# Alpha
bot_alpha.db   (Port: 5001)

# Beta  
bot_beta.db    (Port: 5002)

# Production
bot.db         (Port: 5000)
```

### Reset Alpha Database:
```bash
git checkout alpha
rm bot_alpha.db
python3 main.py  # Will recreate fresh database
```

### Backup Production Database:
```bash
git checkout main
cp bot.db backups/bot.db.$(date +%Y%m%d)
```

---

## 🔍 Checking Current Environment

```bash
# Check current branch
git branch --show-current

# Check current .env
head -5 .env

# Check database
ls -lh bot*.db
```

---

## ⚠️ Important Notes

### DO NOT:
❌ Commit `.env` files with real tokens
❌ Merge main → alpha (always merge up: alpha → beta → dev → main)
❌ Use production tokens in alpha/beta
❌ Test experimental features on production

### DO:
✅ Keep branches synchronized regularly
✅ Use separate Discord bots for each environment
✅ Test thoroughly before promoting to next stage
✅ Document breaking changes
✅ Backup production database before updates

---

## 🛠️ Troubleshooting

### "Branch does not exist" error:
```bash
# Run setup script again
./tmp_rovodev_setup_dev_branches.sh
```

### "Uncommitted changes" error:
```bash
# Stash changes
git stash push -m "WIP: work in progress"

# Or commit them
git add .
git commit -m "wip: work in progress"
```

### Wrong environment:
```bash
# Check which branch you're on
git branch --show-current

# Switch using environment switcher
./switch_environment.sh
```

### Port already in use:
```bash
# Check what's using the port
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or use different port in .env
WEB_DASHBOARD_PORT=5003
```

---

## 📊 Branch Status Visualization

```bash
# Install gitk (optional)
brew install git-gui  # macOS
sudo apt install gitk  # Linux

# Visualize branches
gitk --all
```

Or use command line:
```bash
# Show branch graph
git log --oneline --graph --all --decorate

# Show branch relationships
git branch -vv
```

---

## 🚀 Advanced Tips

### Quick Feature Testing:
```bash
# Create temporary test branch
git checkout alpha
git checkout -b test/quick-experiment

# Test feature
# If failed, just delete branch
git checkout alpha
git branch -D test/quick-experiment

# If success, merge
git merge test/quick-experiment
```

### Cherry-pick specific commit:
```bash
# Copy a specific commit from another branch
git checkout beta
git cherry-pick <commit-hash>
```

### Sync all branches:
```bash
# Create sync script
cat > sync_branches.sh << 'EOF'
#!/bin/bash
git checkout alpha && git pull origin alpha
git checkout beta && git pull origin beta
git checkout development && git pull origin development
git checkout main && git pull origin main
echo "✅ All branches synced"
EOF

chmod +x sync_branches.sh
./sync_branches.sh
```

---

## 📚 Related Documentation

- **Full Guide**: `DEVELOPMENT.md`
- **Branch Strategy**: `BRANCH_STRATEGY.md`
- **Quick Start**: `README_DEV.md`
- **Code Review Report**: `tmp_rovodev_code_review_report.md`

---

## ✅ Setup Checklist

- [ ] Run `./tmp_rovodev_setup_dev_branches.sh`
- [ ] Configure `.env.alpha` with test bot token
- [ ] Configure `.env.beta` with beta bot token
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Test alpha environment: `./switch_environment.sh` → Select 4
- [ ] Verify alpha bot runs correctly
- [ ] Create first feature branch
- [ ] Push branches to remote (if using GitHub/GitLab)

---

**You're all set! Happy coding! 🎉**

For issues or questions, refer to `DEVELOPMENT.md` or the troubleshooting section above.
