# ⚡ SONORA Bot - Quick Reference Guide

## 🎯 Quick Commands

### Start the Bot
```bash
# Smart Launcher (Recommended)
python3 launcher.py

# Direct Start
python3 main.py                    # Stable
python3 beta-version/main_beta.py  # Beta
```

---

## 📱 Discord Commands

### Stable Version (Production)
```
/play <song>        - Play a song
/pause              - Pause playback
/resume             - Resume playback
/skip               - Skip current song
/stop               - Stop playback
/queue              - View queue
/nowplaying         - Show current song
/volume <0-100>     - Adjust volume
/shuffle            - Shuffle queue
/clear              - Clear queue
```

### Beta Version (Testing)
```
/play-beta <song>   - Play with beta features
/pause-beta         - Pause (beta)
/queue-beta         - View queue (beta)
... (all commands with -beta suffix)
```

---

## 🌐 Web Dashboards

| Version | URL | Features |
|---------|-----|----------|
| **Stable** | http://localhost:5000 | Basic monitoring |
| **Beta** | http://localhost:5001 | Enhanced dashboard |
| **Beta Debug** | http://localhost:5001/beta/debug | Advanced debugging |

---

## 📁 File Locations

### Configuration
```bash
.env                      # Stable config
beta-version/.env.beta    # Beta config
```

### Databases
```bash
bot.db                    # Stable database
beta-version/bot_beta.db  # Beta database
```

### Logs
```bash
logs/bot.log              # Stable logs
beta-version/logs/bot.log # Beta logs
```

---

## 🚀 Launcher Menu

```
1. 🟢 STABLE Version     - Production ready
2. 🧪 BETA Version       - Testing features
3. 🔄 Run BOTH           - Side-by-side
4. 📊 Promote Beta       - Deploy to stable
5. ⚙️  Configuration     - Manage settings
6. ❌ Exit
```

---

## 📚 Documentation Quick Links

### Must Read
- **🎉_READ_THIS_FIRST.md** - Main overview
- **START_HERE.md** - Quick start (3 steps)
- **README.md** - Full documentation

### For Developers
- **ORGANIZATION_SUMMARY.md** - What changed
- **BETA_PROMOTION_WORKFLOW.md** - Deployment guide
- **docs/official/DEVELOPMENT.md** - Dev guide

### Reference
- **PROJECT_STRUCTURE.txt** - Visual structure
- **COMPLETE_SETUP_GUIDE.md** - Comprehensive guide
- **beta-version/README_BETA.md** - Beta testing guide

---

## 🔄 Common Workflows

### Testing New Features
```bash
# 1. Start beta
python3 launcher.py  # Select: 2

# 2. Test with /command-beta
# 3. Monitor at http://localhost:5001/beta/debug
# 4. Report issues
```

### Deploying to Production
```bash
# 1. Test beta thoroughly (1-2 weeks)
# 2. Run promotion
python3 launcher.py  # Select: 4

# 3. Test stable version
# 4. Deploy
```

### Troubleshooting
```bash
# 1. Check logs
tail -f logs/bot.log

# 2. Check debug console (beta)
http://localhost:5001/beta/debug

# 3. Read troubleshooting
cat docs/TROUBLESHOOTING.md
```

---

## ⚙️ Configuration

### Required Environment Variables
```bash
DISCORD_TOKEN=your_bot_token
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
GENIUS_API_TOKEN=your_genius_token
```

### Beta Specific
```bash
WEB_DASHBOARD_PORT=5001       # Different from stable
DATABASE_PATH=bot_beta.db     # Separate database
DEBUG_MODE=true               # Enable debugging
```

---

## 🐛 Troubleshooting

### Bot Won't Start
```bash
# Check configuration
cat .env

# Check Python version
python3 --version  # Need 3.10+

# Install dependencies
pip install -r requirements.txt
```

### Port Already in Use
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Commands Not Working
```bash
# Restart bot to sync commands
# Wait 1-2 minutes for Discord to sync
```

---

## 📊 System Requirements

- Python 3.10+
- FFmpeg 6.0+
- 2GB RAM minimum
- 5GB disk space
- Internet connection

---

## 🎯 Key Features

### Stable Version
- ✅ Production-ready
- ✅ Tested features
- ✅ Port 5000
- ✅ Basic dashboard

### Beta Version
- ✅ Experimental features
- ✅ Advanced debugging
- ✅ Port 5001
- ✅ Debug console

---

## 💡 Pro Tips

1. **Always test in beta first**
2. **Use separate bot tokens** for stable and beta
3. **Monitor debug console** when testing
4. **Backup before promoting** (automatic)
5. **Read documentation** when stuck

---

## 🆘 Need Help?

### Quick Help
```bash
cat START_HERE.md           # Quick start
cat 🎉_READ_THIS_FIRST.md   # Overview
ls docs/official/           # All docs
```

### Support
- Documentation: `docs/official/`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Beta Guide: `beta-version/README_BETA.md`

---

## ✅ Quick Setup Checklist

- [ ] Install Python 3.10+
- [ ] Install FFmpeg
- [ ] Clone repository
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Configure `.env` file
- [ ] Run launcher: `python3 launcher.py`
- [ ] Test bot works
- [ ] Read documentation

---

<div align="center">

**🚀 Ready to Go!**

```bash
python3 launcher.py
```

**Need more info?** → Read **START_HERE.md**

</div>
