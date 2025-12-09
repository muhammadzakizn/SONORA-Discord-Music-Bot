# 🎵 Discord Music Bot v3.3.0 - SONORA

> Modern, Feature-Rich Discord Music Bot with PWA Dashboard

[![Version](https://img.shields.io/badge/version-3.3.0-maroon)](https://github.com/yourusername/discord-music-bot)
[![Status](https://img.shields.io/badge/status-operational-success)](http://127.0.0.1:5001)
[![Python](https://img.shields.io/badge/python-3.8+-blue)](https://python.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ What's New in v3.3.0

### 🚀 Major Features
- 📊 **Enhanced Analytics** - Track commands, platforms, and usage
- 📥 **Multi-Download** - Audio, lyrics, artwork in multiple formats
- 🌐 **Translation** - Lyrics in 5 languages
- 🔤 **Romanization** - Toggle for Asian languages
- 🎨 **PWA Dashboard** - Installable web app
- 📱 **macOS Taskbar** - Beautiful dock-style navigation

### 🎨 UI/UX Improvements
- Glass morphism design
- Maroon color theme
- Netflix-style animations
- Light/Dark mode
- Mobile responsive
- Offline support

---

## 🚀 Quick Start

### 1. Installation
```bash
# Clone repository
git clone https://github.com/yourusername/discord-music-bot
cd discord-music-bot

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your Discord token
```

### 2. Run Bot
```bash
# Start bot
python3 main.py

# Or use script
bash START_BOT.sh
```

### 3. Access Dashboard
```
URL: http://127.0.0.1:5001
Username: admin
Password: admin123
```

---

## 📖 Documentation

### Quick Links
- 📘 [**Quick Start Guide**](QUICK_START_V3.3.md) - Get started in 5 minutes
- 📗 [**Complete Features**](V3.3.0_READY.md) - All features explained
- 📙 [**Implementation Report**](IMPLEMENTATION_COMPLETE_V3.3.md) - Technical details
- 📕 [**Final Status**](V3.3.0_FINAL_STATUS.md) - Deployment summary

### Detailed Guides
- [Commands Guide](docs/COMMANDS.md)
- [API Documentation](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 🎯 Features

### 🎵 Music Playback
- ✅ Spotify, YouTube, Apple Music support
- ✅ High-quality audio (Opus encoding)
- ✅ Queue management
- ✅ Playlist support
- ✅ Search functionality
- ✅ Equalizer (10-band)
- ✅ Volume control (0-200%)
- ✅ Pause/Resume/Skip

### 📊 Analytics Dashboard
- ✅ Real-time statistics
- ✅ Command usage tracking
- ✅ Platform distribution
- ✅ User activity monitoring
- ✅ Historical data
- ✅ Visual charts

### 📥 Download Manager
- ✅ Audio: MP3, FLAC, OGG, OPUS
- ✅ Lyrics: LRC, TXT with timestamps
- ✅ Artwork: High-res album covers
- ✅ Complete packages (ZIP)
- ✅ Batch downloads
- ✅ Format selection

### 🌐 Translation System
- ✅ English, Indonesian, Thai, Arabic, Turkish
- ✅ Auto language detection
- ✅ Side-by-side display
- ✅ Caching for speed
- ✅ Toggle show/hide

### 🔤 Romanization
- ✅ Japanese (Kana → Romaji)
- ✅ Chinese (Hanzi → Pinyin)
- ✅ Korean (Hangul → Romanized)
- ✅ User preferences
- ✅ Per-song toggle

### 🎨 Modern UI
- ✅ PWA (installable)
- ✅ Service Worker (offline)
- ✅ Glass morphism
- ✅ Maroon theme
- ✅ Dark/Light mode
- ✅ Responsive design
- ✅ macOS-style taskbar

---

## 🎮 Discord Commands

### Basic Commands
```
/play <song>      - Play a song
/pause            - Pause/resume playback
/skip             - Skip current song
/stop             - Stop and clear queue
/queue            - Show current queue
/nowplaying       - Show current song
```

### Advanced Commands
```
/volume <0-200>   - Set volume
/seek <time>      - Seek to position
/lyrics           - Show lyrics
/download         - Download current song
/equalizer        - Open equalizer
/playlist         - Manage playlists
/stats            - Show bot statistics
```

### Admin Commands
```
/broadcast        - Send announcement
/settings         - Bot settings
/maintenance      - Maintenance mode
/analytics        - View analytics
```

---

## 🌐 Web Dashboard

### Features
- 📊 Real-time bot status
- 🎵 Now playing display
- 📝 Queue management
- 📥 Download manager
- 🌐 Lyrics translation
- 📊 Statistics & analytics
- ⚙️ Settings panel
- 👤 Admin controls

### Access
```
Local:    http://127.0.0.1:5001
Network:  http://YOUR_IP:5001
```

### Login
```
Default credentials:
Username: admin
Password: admin123

⚠️ Change in production!
```

---

## 📱 PWA Installation

### Desktop
1. Open dashboard in browser
2. Click install button (⊕) in address bar
3. Confirm installation
4. App launches as standalone

### Mobile (iOS)
1. Open in Safari
2. Tap Share (📤)
3. "Add to Home Screen"
4. Tap "Add"

### Mobile (Android)
1. Open in Chrome
2. Tap Menu (⋮)
3. "Install app"
4. Confirm

---

## 🔧 Configuration

### Environment Variables (.env)
```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_PREFIX=!

# Web Dashboard
WEB_DASHBOARD=true
WEB_PORT=5001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Services
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret

# Features
ENABLE_TRANSLATION=true
ENABLE_DOWNLOADS=true
ENABLE_ANALYTICS=true
```

### Advanced Settings
See [settings.py](config/settings.py) for more options.

---

## 📊 API Reference

### Authentication
```bash
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Analytics
```bash
GET /api/analytics/commands   # Command usage
GET /api/analytics/platforms  # Platform stats
GET /api/analytics/methods    # Play methods
```

### Downloads
```bash
POST /api/download/audio      # Download audio
POST /api/download/lyrics     # Download lyrics
POST /api/download/artwork    # Download artwork
POST /api/download/complete   # Download all
```

### Translation
```bash
POST /api/translate/lyrics
Content-Type: application/json

{
  "lyrics": "original text",
  "target_language": "id"
}
```

---

## 🧪 Testing

### Test Bot
```bash
# Check if running
ps aux | grep python | grep main.py

# Test dashboard
curl http://127.0.0.1:5001/api/status

# Test login
curl -X POST http://127.0.0.1:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test Features
1. Join voice channel
2. Use `/play` command
3. Open dashboard
4. Test translation
5. Try downloads
6. Check analytics

---

## 📦 Project Structure

```
discord-music-bot/
├── main.py                 # Bot entry point
├── requirements.txt        # Dependencies
├── .env                    # Configuration
│
├── commands/              # Discord commands
│   ├── play.py
│   ├── queue.py
│   ├── admin.py
│   └── stats.py
│
├── services/              # Core services
│   ├── audio/            # Audio handling
│   ├── lyrics/           # Lyrics fetching
│   ├── metadata/         # Metadata processing
│   ├── voice/            # Voice connection
│   ├── translation.py    # Translation (NEW)
│   └── download_manager.py  # Downloads (NEW)
│
├── web/                   # Web dashboard
│   ├── app.py            # Flask app
│   ├── templates/        # HTML templates
│   ├── static/           # CSS/JS/Assets
│   ├── manifest.json     # PWA manifest (NEW)
│   └── sw.js             # Service worker (NEW)
│
├── utils/                 # Utilities
│   ├── analytics.py      # Analytics (NEW)
│   ├── romanization.py
│   └── formatters.py
│
├── docs/                  # Documentation
│   ├── QUICK_START_V3.3.md
│   ├── V3.3.0_READY.md
│   └── ...
│
└── exports/               # Download exports (NEW)
    ├── audio/
    ├── lyrics/
    ├── artwork/
    └── full/
```

---

## 🔒 Security

### Recommendations
- ✅ Change default admin password
- ✅ Use HTTPS in production
- ✅ Keep bot token secret
- ✅ Regular dependency updates
- ✅ Enable rate limiting
- ✅ Implement 2FA for admin

### Best Practices
- Don't commit `.env` file
- Use environment variables
- Validate all inputs
- Sanitize user data
- Log security events

---

## 🐛 Troubleshooting

### Bot Won't Start
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Check dependencies
pip install -r requirements.txt

# Check .env file
cat .env | grep DISCORD_TOKEN
```

### Dashboard Not Accessible
```bash
# Check if running
curl http://127.0.0.1:5001/api/status

# Check port
netstat -an | grep 5001

# Restart bot
pkill -f "python.*main.py"
python3 main.py &
```

### Voice Issues
```bash
# Check Opus library
python3 -c "import discord; print(discord.opus.is_loaded())"

# Reinstall dependencies
pip install -U discord.py[voice]
```

For more help, see [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

See [CONTRIBUTING.md](documentation/CONTRIBUTING.md) for details.

---

## 📝 Changelog

### v3.3.0 (December 3, 2024)
- ✨ Added enhanced analytics dashboard
- ✨ Added multi-format download manager
- ✨ Added lyrics translation (5 languages)
- ✨ Added romanization toggle
- ✨ Added PWA support
- ✨ Added macOS-style taskbar
- 🎨 Complete UI redesign
- 🐛 Fixed service worker routing
- 📚 Comprehensive documentation

### v3.2.2 (Previous)
- See [CHANGELOG.md](CHANGELOG.md) for full history

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

### Technologies
- [Discord.py](https://discordpy.readthedocs.io/) - Discord API
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [spotdl](https://github.com/spotDL/spotify-downloader) - Spotify downloads
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloads
- [Google Translate](https://pypi.org/project/googletrans/) - Translation
- [DeepTranslator](https://github.com/nidhaloff/deep-translator) - Backup translation

### Contributors
- Your name here! (Contribute and get listed)

---

## 📞 Support

### Need Help?
- 📖 Check [Documentation](docs/)
- 💬 Join [Discord Server](#)
- 🐛 [Report Bug](https://github.com/yourusername/discord-music-bot/issues)
- 💡 [Request Feature](https://github.com/yourusername/discord-music-bot/issues)

### Contact
- Email: your.email@example.com
- Discord: YourUsername#0000
- GitHub: [@yourusername](https://github.com/yourusername)

---

## 🌟 Show Your Support

If you like this project:
- ⭐ Star the repository
- 🍴 Fork and improve
- 📢 Share with friends
- 💖 Sponsor development

---

## 📊 Stats

![Bot Status](https://img.shields.io/badge/status-online-success)
![Guilds](https://img.shields.io/badge/guilds-2-blue)
![Commands](https://img.shields.io/badge/commands-19-orange)
![Version](https://img.shields.io/badge/version-3.3.0-maroon)

---

**Made with ❤️ by the SONORA Team**

*Discord Music Bot v3.3.0 - Bringing music to life*

---

© 2024 Discord Music Bot. All rights reserved.
