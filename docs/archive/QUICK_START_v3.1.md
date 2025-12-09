# 🚀 Quick Start Guide - Discord Music Bot v3.1

## 📦 Installation (5 Minutes)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Bot
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
nano .env  # or use your favorite editor
```

Required:
- `DISCORD_TOKEN` - Your Discord bot token
- `SPOTIFY_CLIENT_ID` - Spotify API credentials
- `SPOTIFY_CLIENT_SECRET` - Spotify API credentials
- `GENIUS_API_TOKEN` - Genius API token (for lyrics)

Optional (already set to defaults):
- `ENABLE_WEB_DASHBOARD=true`
- `WEB_DASHBOARD_PORT=5000`

### 3. Add Cookies (for Apple Music)
Place `apple_music_cookies.txt` in `cookies/` directory

### 4. Run Bot
```bash
python main.py
```

You should see:
```
✓ Opus library loaded
✓ Configuration validated successfully
✓ Database connected and tables initialized
✓ Web dashboard started: http://0.0.0.0:5000
✓ Commands loaded successfully
Bot is ready! Logged in as YourBot#1234
```

### 5. Test Bot
In Discord:
```
/play never gonna give you up
```

### 6. Access Web Dashboard
Open browser: `http://localhost:5000`

---

## 🎮 Basic Commands

### Play Music
```
/play <song name or URL>
```
Examples:
- `/play shape of you` - Search and play
- `/play https://open.spotify.com/track/...` - Play Spotify track
- `/play https://www.youtube.com/watch?v=...` - Play YouTube video
- `/play https://music.apple.com/...` - Play Apple Music track

### Control Playback
```
/pause          - Pause current track
/resume         - Resume playback
/skip           - Skip to next track
/stop           - Stop and disconnect
```

### Volume
```
/volume 150     - Set volume to 150%
/volume-up      - Increase by 10%
/volume-down    - Decrease by 10%
```

### Queue
```
/queue          - Show current queue
/clear          - Clear the queue
```

### Statistics ✨ NEW
```
/stats          - Show your listening stats
/history 10     - Show last 10 tracks played
/top 7          - Show top tracks (last 7 days)
```

---

## 🌐 Web Dashboard Features

### Access
Open `http://localhost:5000` in your browser

### What You Can Do
1. **Monitor Bot Status** - See guilds, connections, playing tracks
2. **View Play History** - See what's been played recently
3. **Control Playback** - Pause, skip, stop from web interface
4. **View Analytics** - User stats, top tracks, peak hours
5. **Manage Guilds** - See queue, current track per guild

### Remote Access
To access from other devices on your network:
```
http://YOUR_COMPUTER_IP:5000
```

Find your IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

---

## 📊 Statistics Examples

### Your Personal Stats
```
/stats
```
Shows:
- Total plays
- Total listening time
- Top 5 artists
- Recent 5 tracks

### Server History
```
/history 20
```
Shows last 20 tracks played on the server

### Top Tracks
```
/top 30
```
Shows most played tracks in last 30 days with:
- Play counts
- Unique users
- Peak listening hours

---

## 🔧 Configuration

### Disable Web Dashboard
In `.env`:
```bash
ENABLE_WEB_DASHBOARD=false
```

### Change Dashboard Port
In `.env`:
```bash
WEB_DASHBOARD_PORT=8080
```

### Adjust Bot Settings
Edit `config/settings.py`:
- `MAX_QUEUE_SIZE` - Maximum queue size (default: 100)
- `AUDIO_BITRATE` - Audio quality (default: 256 kbps)
- `MIN_UPDATE_INTERVAL` - UI update frequency (default: 2s)

---

## 🐛 Troubleshooting

### Bot Won't Start
```bash
# Check Python version (need 3.10+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Check .env file
cat .env
```

### No Sound
1. Check bot has "Connect" and "Speak" permissions
2. Verify you're in a voice channel
3. Check volume: `/volume 100`

### Web Dashboard Not Loading
```bash
# Check if port is available
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Check dependencies
pip install flask flask-cors flask-socketio
```

### Database Errors
```bash
# Reset database
rm bot.db
python main.py
```

---

## 📚 Documentation

- [README.md](README.md) - Main documentation
- [docs/COMMANDS.md](docs/COMMANDS.md) - All commands
- [docs/DATABASE.md](docs/DATABASE.md) - Database system
- [docs/WEB_DASHBOARD.md](docs/WEB_DASHBOARD.md) - Dashboard guide
- [README_UPDATES.md](README_UPDATES.md) - What's new in v3.1
- [CHANGELOG_v3.1.md](CHANGELOG_v3.1.md) - Technical changelog

---

## 🎯 Next Steps

1. **Invite bot to your server**
   - Go to Discord Developer Portal
   - OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: Administrator (or specific permissions)
   - Use generated URL to invite

2. **Test all features**
   - Play different sources (Spotify, YouTube, Apple Music)
   - Test playlists
   - Try volume controls
   - View statistics
   - Access web dashboard

3. **Customize settings**
   - Adjust volume defaults
   - Configure queue size
   - Set up guild-specific settings

4. **Monitor performance**
   - Check web dashboard statistics
   - Review play history
   - Analyze user engagement

---

## 💡 Tips & Tricks

### Best Practices
1. **Use playlists** - `/play <playlist URL>` for continuous music
2. **Check queue** - `/queue` to see what's coming up
3. **Volume per server** - Each server remembers its volume setting
4. **Web dashboard** - Great for monitoring multiple servers

### Performance
- Database is lightweight (<1% CPU)
- Web dashboard adds ~50-100 MB RAM
- Voice playback unaffected by new features
- Can disable dashboard if not needed

### Security
- Dashboard is local network only by default
- Add authentication for public access
- Regular database backups recommended
- Keep cookies files private

---

## 🆘 Need Help?

### Common Issues

**"Opus library not loaded"**
```bash
# macOS
brew install opus

# Ubuntu
sudo apt install libopus-dev
```

**"Spotify credentials invalid"**
- Check client ID and secret in `.env`
- Verify no extra spaces
- Get new credentials from Spotify Dashboard

**"Could not connect to voice channel"**
- Check bot permissions
- Verify you're in a voice channel
- Try `/stop` then `/play` again

### Still Having Issues?
1. Check logs in `logs/` directory
2. Review error messages carefully
3. Try with a simple test case
4. Create GitHub issue with details

---

## 🎉 You're Ready!

Your Discord Music Bot v3.1 is now running with:
- ✅ Multi-source music playback
- ✅ Queue management
- ✅ Volume control
- ✅ Synchronized lyrics
- ✅ Database tracking
- ✅ Web dashboard
- ✅ Statistics & analytics

Enjoy your music! 🎵

---

**Quick Links:**
- Web Dashboard: `http://localhost:5000`
- Documentation: [README.md](README.md)
- Support: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Version:** 3.1
**Status:** ✅ Production Ready
