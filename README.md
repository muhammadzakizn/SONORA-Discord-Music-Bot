# 🎵 SONORA Bot - Discord Music Bot

<div align="center">

![Version](https://img.shields.io/badge/version-3.3.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
![Status](https://img.shields.io/badge/status-stable-brightgreen.svg)

**High-quality Discord music bot with advanced features**

[Quick Start](#-quick-start) • [Features](#-features) • [Beta Version](#-beta-version) • [Documentation](#-documentation)

</div>

---

## 🚀 Quick Start

### Using Smart Launcher (Recommended)
```bash
# Run the launcher
python3 launcher.py

# Select from menu:
# 1. 🟢 Stable Version (Production)
# 2. 🧪 Beta Version (Testing)
# 3. 🔄 Run Both (Side-by-side)
# 4. 📊 Promote Beta → Stable
```

### Manual Start
```bash
# Stable version
python3 main.py

# Beta version
python3 beta-version/main_beta.py
```

---

## ✨ Features

### 🎵 Music Playback
- ✅ Multi-source: Spotify, Apple Music, YouTube
- ✅ High-quality Opus audio
- ✅ Smart caching with instant playback
- ✅ Pre-fetching next tracks

### 📋 Queue Management
- ✅ FIFO queue per voice channel
- ✅ Interactive controls with pagination
- ✅ Auto-play seamless transitions

### 🌐 Web Dashboard
- ✅ Real-time monitoring
- ✅ Remote control
- ✅ Analytics & statistics
- ✅ PWA support

---

## 🧪 Beta Version

### What's Different?

| Feature | Stable | Beta |
|---------|--------|------|
| Commands | `/play` | `/play-beta` |
| Port | 5000 | 5001 |
| Database | `bot.db` | `bot_beta.db` |
| Debug Tools | Basic | Advanced |

### Beta Features
- 🔬 Advanced caching algorithms
- 🔬 Improved search ranking
- 🔬 Experimental audio filters
- 🔬 Enhanced debugging tools

### Beta Web Dashboard
Access at: `http://localhost:5001/beta/debug`

Features:
- 🔧 Live console with real-time logs
- 🔧 Performance monitoring
- 🔧 Error tracking
- 🔧 Feature flag toggles

---

## 📁 Project Structure

```
SONORA8/
├── main.py                  # 🎵 Stable entry point
├── launcher.py              # 🚀 Smart launcher
├── requirements.txt         # 📦 Dependencies
│
├── core/                    # 🔧 Core bot components
├── commands/                # ⌨️ Discord commands
├── services/                # 🔌 External services
├── database/                # 💾 Data persistence
├── ui/                      # 🎨 Discord UI components
├── utils/                   # 🛠️ Utilities
├── config/                  # ⚙️ Configuration
│
├── web/                     # 🌐 Web dashboard
├── tests/                   # 🧪 Test suite (71 tests)
├── scripts/                 # 📜 Utility scripts
│   └── shell/               # 🐚 Shell scripts
│
├── docs/                    # 📚 Documentation
│   ├── archive/             # 📦 Old docs & reports
│   ├── official/            # 📖 Official guides
│   └── testing/             # 🔬 Test docs
│
├── beta-version/            # 🧪 Beta (isolated)
│   ├── main_beta.py
│   └── ...
│
├── cookies/                 # 🍪 Authentication
├── downloads/               # 💿 Downloaded audio
├── cache/                   # ⚡ Cache files
├── logs/                    # 📋 Log files
└── exports/                 # 📤 Exported data
```

---

## 📚 Documentation

Located in `docs/official/`:

- **[Quick Start Guide](docs/official/QUICK_START_V3.3.md)**
- **[Complete Guide](docs/official/PANDUAN_LENGKAP.md)**
- **[Development Guide](docs/official/DEVELOPMENT.md)**
- **[All Documentation](docs/official/README.md)**

---

## 🛠️ Development Workflow

```bash
# 1. Develop in beta
python3 launcher.py  # Select: 2. Beta

# 2. Test thoroughly
# Beta runs on port 5001 with debug tools

# 3. Promote to stable when ready
python3 launcher.py  # Select: 4. Promote

# 4. Deploy stable version
python3 main.py
```

---

## ⚙️ Configuration

### Stable (`.env`)
```bash
DISCORD_TOKEN=your_production_token
WEB_DASHBOARD_PORT=5000
DATABASE_PATH=bot.db
```

### Beta (`beta-version/.env.beta`)
```bash
DISCORD_TOKEN=your_beta_token  # Different!
WEB_DASHBOARD_PORT=5001        # Different!
DATABASE_PATH=bot_beta.db      # Separate!
DEBUG_MODE=true
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ by SONORA Bot Team**

For full documentation, see [docs/official/](docs/official/)

</div>
