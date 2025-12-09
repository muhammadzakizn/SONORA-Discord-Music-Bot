# 🚀 Quick Start Guide - v3.3.0

## ⚡ TL;DR - Bot Sudah Jalan!

```
✅ Bot Status: ONLINE
✅ Discord: Connected (2 guilds, 19 commands)
✅ Web Dashboard: http://127.0.0.1:5001
✅ Version: 3.3.0
```

---

## 🎯 AKSES CEPAT

### 🌐 Web Dashboard
```
URL: http://127.0.0.1:5001
Username: admin
Password: admin123
```

**Fitur Dashboard:**
- 📊 Real-time statistics
- 🎵 Now playing display
- 📝 Queue management
- 📥 Download manager
- 🌐 Lyrics translation
- 🎨 Theme switcher (light/dark)
- 📱 PWA installable

### 🤖 Discord Commands
```
/play <song>      - Putar lagu
/queue           - Lihat antrian
/skip            - Skip lagu
/pause           - Pause/resume
/volume <0-200>  - Atur volume
/stats           - Statistik bot
/download        - Download lagu
/lyrics          - Tampilkan lirik
/equalizer       - Atur equalizer
```

---

## 🆕 FITUR BARU V3.3.0

### 1. 📊 Analytics Dashboard
**Lokasi:** Dashboard > Statistics

Tracking otomatis:
- ✅ Most used commands
- ✅ Platform usage (Spotify/YouTube/Apple Music)
- ✅ Play methods (search/playlist/URL)
- ✅ User activity
- ✅ Song history

### 2. 📥 Multi-Download System
**Lokasi:** Dashboard > Downloads

Download options:
- 🎵 **Audio only** (MP3/FLAC/OGG/OPUS)
- 📝 **Lyrics only** (with timestamps)
- 🎨 **Artwork only** (high quality)
- 📦 **Complete package** (all-in-one)
- 🔢 **Batch download** (multiple tracks)

**Export folders:**
```
exports/
├── audio/     - Audio files
├── lyrics/    - Lyrics (LRC/TXT)
├── artwork/   - Album covers
└── full/      - Complete packages
```

### 3. 🌐 Lyrics Translation
**Lokasi:** Media Player > Translation Menu

Supported languages:
- 🇬🇧 English
- 🇮🇩 Indonesian (Bahasa Indonesia)
- 🇹🇭 Thai (ไทย)
- 🇸🇦 Arabic (العربية)
- 🇹🇷 Turkish (Türkçe)

**Features:**
- Auto language detection
- Side-by-side display
- Toggle show/hide
- Caching for speed

### 4. 🔤 Romanization Toggle
**Lokasi:** Media Player > Settings

Control romanization for:
- 🇯🇵 Japanese (Hiragana/Katakana → Romaji)
- 🇨🇳 Chinese (Hanzi → Pinyin)
- 🇰🇷 Korean (Hangul → Romanized)

Toggle per user preference!

### 5. 🎨 Modern PWA Dashboard
**Install:** Click install button in browser

**Features:**
- 📱 Installable as app (mobile/desktop)
- 🔌 Offline mode support
- 🎬 Netflix-style animations
- 🪟 macOS-style taskbar
- 🎨 Glass morphism UI
- 🌓 Light/Dark theme
- ⚡ Lightning fast

---

## 📱 INSTALL PWA

### Desktop (Chrome/Edge):
1. Buka http://127.0.0.1:5001
2. Klik icon "Install" di address bar
3. Atau: Menu (⋮) > Install Music Bot Dashboard

### Mobile (iOS Safari):
1. Buka http://192.168.1.6:5001 (dari HP)
2. Tap Share button
3. Tap "Add to Home Screen"

### Mobile (Android Chrome):
1. Buka http://192.168.1.6:5001
2. Tap Menu (⋮)
3. Tap "Install app" atau "Add to Home screen"

---

## 🎮 CARA PAKAI

### Play Lagu Pertama Kali:
```
1. Join voice channel
2. Ketik: /play <nama lagu>
3. Bot akan join dan mulai play
4. Buka dashboard untuk kontrol lebih
```

### Download Lagu:
```
Dashboard Method:
1. Login ke dashboard
2. Klik "Downloads" di taskbar
3. Pilih lagu yang sedang play
4. Pilih format & type
5. Klik download

Discord Method:
1. /download
2. Pilih format dari menu
3. File dikirim ke DM atau channel
```

### Translate Lyrics:
```
Dashboard Method:
1. Buka "Now Playing"
2. Klik "Translate" button
3. Pilih bahasa
4. Lihat terjemahan side-by-side

Discord Method:
1. /lyrics translate
2. Pilih bahasa dari menu
3. Lihat hasil terjemahan
```

### Lihat Statistics:
```
Dashboard Method:
1. Klik "Statistics" di taskbar
2. Lihat charts & graphs
3. Filter by time/platform/command

Discord Method:
1. /stats
2. Lihat embed statistik
3. /stats detailed untuk lebih detail
```

---

## 🎨 THEME CUSTOMIZATION

### Cara Ganti Theme:
1. Buka dashboard
2. Klik icon 🌓 di taskbar (kanan bawah)
3. Pilih Light atau Dark mode

### Maroon Color Scheme:
```css
Primary: #800020 (Maroon)
Secondary: #A0153E (Darker Maroon)
Accent: #5D0E41 (Purple Maroon)
Background Dark: #1a1a1a
Background Light: #f5f5f5
```

---

## 🔧 TROUBLESHOOTING

### Dashboard tidak bisa diakses?
```bash
# Check if bot running
ps aux | grep python | grep main.py

# Restart bot
pkill -f "python.*main.py"
python3 main.py &
```

### PWA tidak bisa install?
- Pastikan akses via HTTPS atau localhost
- Clear browser cache
- Try different browser

### Download error?
```bash
# Check export folders
ls -la exports/

# Create if missing
mkdir -p exports/{audio,lyrics,artwork,full}
```

### Translation tidak muncul?
- Pastikan koneksi internet aktif
- Check API rate limits
- Coba bahasa lain

---

## 📊 MONITORING

### Check Bot Status:
```bash
# View logs
tail -f logs/*.log

# Check processes
ps aux | grep python

# Check web dashboard
curl http://127.0.0.1:5001/api/status
```

### View Statistics:
```bash
# Command stats
curl http://127.0.0.1:5001/api/analytics/commands

# Platform stats
curl http://127.0.0.1:5001/api/analytics/platforms

# Play method stats
curl http://127.0.0.1:5001/api/analytics/methods
```

---

## 🎯 BEST PRACTICES

### Performance Tips:
1. ✅ Use search instead of playlists when possible
2. ✅ Enable caching for faster loads
3. ✅ Clear downloads folder regularly
4. ✅ Use PWA for better performance
5. ✅ Keep bot & dashboard on same network

### Quality Tips:
1. ✅ Use Spotify for best metadata
2. ✅ Download in FLAC for best quality
3. ✅ Enable lyrics for karaoke mode
4. ✅ Use equalizer for audio tuning
5. ✅ Check artwork in dashboard

### User Experience:
1. ✅ Install PWA for app-like feel
2. ✅ Use dark mode at night
3. ✅ Pin favorites in queue
4. ✅ Create playlists for parties
5. ✅ Share dashboard URL with friends

---

## 📚 FURTHER READING

- **Full Documentation**: See `docs/` folder
- **API Reference**: See `documentation/API.md`
- **Commands Guide**: See `docs/COMMANDS.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`
- **Architecture**: See `docs/ARCHITECTURE.md`

---

## 🎉 ENJOY!

Your Discord Music Bot v3.3.0 is ready to rock! 🎵

**Need help?** Check the docs or create an issue.

**Found a bug?** Report it with logs.

**Love the bot?** Star the repo! ⭐

---

*Discord Music Bot v3.3.0 - Modern, Fast, Feature-Rich*
