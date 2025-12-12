# 🎵 SONORA Bot - BETA VERSION

<div align="center">

![Version](https://img.shields.io/badge/version-3.4.0--beta-orange.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
![Status](https://img.shields.io/badge/status-beta-yellow.svg)

**Discord Music Bot - Beta Testing Version**

All commands use `-beta` suffix (e.g., `/play-beta`, `/pause-beta`)

</div>

---

## 🚀 Quick Start

```bash
# Run with launcher
python3 launcher.py

# Or directly
python3 main.py
```

---

## ⚠️ Beta Commands

All commands have `-beta` suffix:

| Command | Description |
|---------|-------------|
| `/play-beta` | Play music |
| `/pause-beta` | Pause playback |
| `/resume-beta` | Resume playback |
| `/stop-beta` | Stop and disconnect |
| `/skip-beta` | Skip current track |
| `/queue-beta` | View queue |
| `/clear-beta` | Clear queue |
| `/shuffle-beta` | Shuffle queue |
| `/volume-beta` | Set volume |
| `/lyrics-beta` | Show lyrics |
| `/stats-beta` | Your statistics |
| `/history-beta` | Play history |

---

## ✨ Features

- 🎵 Multi-source: Spotify, Apple Music, YouTube
- 📋 Queue management with pagination
- 🎤 Synced lyrics display
- 🌐 Web dashboard at `http://localhost:3000`
- 💾 Smart audio caching

---

## 📁 Project Structure

```
SONORA-beta/
├── main.py              # Entry point
├── launcher.py          # Smart launcher
├── commands/            # All commands with -beta suffix
├── services/            # Audio, lyrics, metadata services
├── web/                 # Next.js web dashboard
├── core/                # Core bot components
└── tests/               # 74 passing tests
```

---

## ⚙️ Configuration

Edit `.env`:
```bash
DISCORD_TOKEN=your_beta_token
DISCORD_CLIENT_ID=your_client_id
WEB_DASHBOARD_PORT=5000
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**SONORA Beta** - Testing new features! 🧪

</div>
