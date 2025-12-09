# ✅ SONORA Bot - Complete Setup Guide

## 🎯 Your Bot Has Been Completely Reorganized!

This guide will help you understand and use the new structure.

---

## 📊 What Changed?

### Before → After

| Aspect | Before | After |
|--------|--------|-------|
| **Root Directory** | 30+ markdown files | Clean (5 core files) |
| **Documentation** | Scattered | Organized in `docs/official/` |
| **Testing** | Production only | Stable + Beta versions |
| **Deployment** | Manual | Automated workflow |
| **Debugging** | Basic logs | Advanced debug console |

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run the Launcher
```bash
python3 launcher.py
```

You'll see this menu:
```
1. 🟢 STABLE Version     - Production ready
2. 🧪 BETA Version       - Testing new features
3. 🔄 Run BOTH           - Side-by-side comparison
4. 📊 Promote Beta→Stable - Deploy workflow
5. ⚙️  Configuration      - Manage settings
6. ❌ Exit
```

### Step 2: Choose Your Version

**For normal use**: Select `1` (Stable)
- Production-ready
- Tested features
- Port 5000
- Commands: `/play`, `/pause`, etc.

**For testing**: Select `2` (Beta)
- New features
- Experimental
- Port 5001
- Commands: `/play-beta`, `/pause-beta`, etc.

### Step 3: Start Using!

That's it! Your bot is running.

---

## 📁 New Structure

```
sonora-bot/
├── 📄 README.md                 # Clean overview
├── 📄 START_HERE.md            # Quick start (YOU ARE HERE)
├── 🚀 launcher.py              # Smart launcher
├── 📝 main.py                  # Stable version
│
├── 🧪 beta-version/            # BETA ENVIRONMENT (NEW!)
│   ├── main_beta.py           # Beta entry point
│   ├── .env.beta              # Beta config
│   ├── bot_beta.db            # Separate database
│   ├── commands/              # Beta commands
│   ├── web_beta/              # Beta dashboard
│   └── logs/                  # Beta logs
│
├── 📚 docs/official/           # ALL DOCUMENTATION (NEW!)
│   ├── README.md              # Documentation index
│   ├── DEVELOPMENT.md         # Dev guide
│   ├── CHANGELOG.md           # Version history
│   └── ... (30+ docs)
│
├── 🛠️ scripts/                # AUTOMATION (NEW!)
│   └── promote_beta.py        # Promotion workflow
│
└── 💾 backups/                # AUTO-BACKUPS (NEW!)
    └── stable_backup_*/
```

---

## 🎮 Using Stable Version

### Start
```bash
python3 launcher.py
# Select: 1. STABLE Version
```

### Commands in Discord
```
/play <song>        - Play a song
/pause              - Pause playback
/resume             - Resume
/skip               - Skip current song
/queue              - View queue
/volume <0-100>     - Adjust volume
/nowplaying         - Show current song
```

### Web Dashboard
Open: `http://localhost:5000`

Features:
- Real-time playback info
- Queue management
- Analytics
- Remote control

---

## 🧪 Using Beta Version

### Start
```bash
python3 launcher.py
# Select: 2. BETA Version
```

### Commands in Discord
```
/play-beta <song>    - Play with beta features
/pause-beta          - Beta pause
/resume-beta         - Beta resume
/skip-beta           - Beta skip
/queue-beta          - Beta queue
... (all commands with -beta suffix)
```

### Beta Dashboard
Open: `http://localhost:5001`

### Debug Console
Open: `http://localhost:5001/beta/debug`

Features:
- 🔧 Live console (real-time logs)
- 🔧 Performance monitoring
- 🔧 Error tracking
- 🔧 Feature flags
- 🔧 System metrics

---

## 🔄 Running Both Versions

Want to compare stable vs beta?

```bash
python3 launcher.py
# Select: 3. Run BOTH
```

This runs:
- **Stable**: Port 5000, `/play` commands
- **Beta**: Port 5001, `/play-beta` commands

Both run simultaneously without conflicts!

---

## 📊 Beta → Stable Promotion

When beta features are ready for production:

```bash
python3 launcher.py
# Select: 4. Promote Beta → Stable
```

This automatically:
1. ✅ Backs up stable version
2. ✅ Runs automated tests
3. ✅ Merges beta features
4. ✅ Removes `-beta` suffixes
5. ✅ Updates version number
6. ✅ Creates git tag
7. ✅ Generates changelog
8. ✅ Cleans up beta

Safe and automated!

---

## ⚙️ Configuration

### Stable Version
Edit: `.env`
```bash
DISCORD_TOKEN=your_production_token
WEB_DASHBOARD_PORT=5000
DATABASE_PATH=bot.db
```

### Beta Version
Edit: `beta-version/.env.beta`
```bash
DISCORD_TOKEN=your_beta_token  # DIFFERENT!
WEB_DASHBOARD_PORT=5001        # DIFFERENT!
DATABASE_PATH=bot_beta.db      # SEPARATE!
DEBUG_MODE=true
ENABLE_EXPERIMENTAL_FEATURES=true
```

⚠️ **Important**: Use different Discord bot tokens for stable and beta!

---

## 📚 Documentation

All documentation is now in `docs/official/`:

### Essential Reading
1. **START_HERE.md** (this file) - Quick start
2. **README.md** - Project overview
3. **docs/official/README.md** - All documentation

### For Developers
4. **docs/official/DEVELOPMENT.md** - Dev guide
5. **BETA_PROMOTION_WORKFLOW.md** - Promotion process
6. **ORGANIZATION_SUMMARY.md** - Complete summary

### For Troubleshooting
7. **docs/TROUBLESHOOTING.md** - Common issues
8. **docs/official/CHANGELOG.md** - Version history

---

## 🛠️ Development Workflow

### 1. Develop in Beta
```bash
python3 launcher.py
# Select: 2. BETA Version
```

### 2. Edit Code
```bash
# Make changes in beta-version/
nano beta-version/commands/play_beta.py
```

### 3. Test
- Use `/command-beta` in Discord
- Monitor debug dashboard
- Check performance metrics

### 4. Promote When Ready
```bash
python3 launcher.py
# Select: 4. Promote Beta → Stable
```

### 5. Deploy
```bash
python3 launcher.py
# Select: 1. STABLE Version
```

---

## 🔍 Monitoring

### Stable Version
- **Logs**: `logs/bot.log`
- **Dashboard**: `http://localhost:5000`
- **Database**: `bot.db`

### Beta Version
- **Logs**: `beta-version/logs/bot.log`
- **Dashboard**: `http://localhost:5001`
- **Debug Console**: `http://localhost:5001/beta/debug`
- **Database**: `beta-version/bot_beta.db`

---

## 🆘 Troubleshooting

### Launcher won't start
```bash
# Check Python version
python3 --version  # Need 3.10+

# Install dependencies
pip install -r requirements.txt
```

### Port already in use
```bash
# Find what's using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Commands not showing in Discord
```bash
# Restart bot to sync commands
python3 launcher.py
# Select version and restart
```

### Beta version not working
```bash
# Check beta config
cat beta-version/.env.beta

# Verify beta token is different
```

---

## 💡 Pro Tips

### Tip 1: Use Beta for Testing
Always test new features in beta before promoting to stable.

### Tip 2: Monitor Debug Console
Beta debug console shows real-time performance and errors.

### Tip 3: Regular Backups
Promotion workflow automatically backs up stable before merging.

### Tip 4: Separate Bots
Use different Discord bots for stable and beta to avoid conflicts.

### Tip 5: Documentation
Check `docs/official/` for detailed guides on any topic.

---

## 🎯 Next Steps

### Immediate
- [ ] Run `python3 launcher.py`
- [ ] Test stable version
- [ ] Read `README.md`
- [ ] Explore `docs/official/`

### Optional (Beta Testing)
- [ ] Create beta Discord bot
- [ ] Configure `beta-version/.env.beta`
- [ ] Test beta features
- [ ] Explore debug console

### Development
- [ ] Read `docs/official/DEVELOPMENT.md`
- [ ] Practice promotion workflow
- [ ] Start developing features

---

## 📞 Getting Help

### Documentation
1. Check `docs/official/README.md` for all guides
2. See `docs/TROUBLESHOOTING.md` for common issues
3. Read `ORGANIZATION_SUMMARY.md` for overview

### Support
- Open GitHub issue for bugs
- Check documentation first
- Provide detailed error messages

---

## ✅ Checklist

### Setup Complete?
- [ ] Launcher works (`python3 launcher.py`)
- [ ] Stable version runs
- [ ] Commands work in Discord
- [ ] Web dashboard accessible
- [ ] Documentation reviewed

### Ready for Beta?
- [ ] Beta bot created
- [ ] `.env.beta` configured
- [ ] Beta version runs
- [ ] Debug console accessible
- [ ] Commands with `-beta` work

### Ready for Development?
- [ ] Development guide read
- [ ] Promotion workflow understood
- [ ] Git basics known
- [ ] Backup strategy in place

---

## 🎉 You're All Set!

Your SONORA Bot is now:
✅ Professionally organized
✅ Development-ready
✅ Production-safe
✅ Well-documented
✅ Easy to maintain

### Start Using:
```bash
python3 launcher.py
```

### Need Help:
```bash
cat docs/official/README.md
```

### Have Fun! 🎵

---

<div align="center">

**Questions?** Check `docs/official/`

**Issues?** See `docs/TROUBLESHOOTING.md`

**Development?** Read `docs/official/DEVELOPMENT.md`

---

**Made with ❤️ by SONORA Bot Team**

</div>
