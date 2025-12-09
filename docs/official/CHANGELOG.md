# 📋 Changelog - Discord Music Bot

All notable changes to Discord Music Bot will be documented in this file.

---

## [3.3.0] - December 3, 2024

### 🎉 MAJOR UPDATE - STABLE RELEASE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ✨ NEW FEATURES

#### 🎚️ **Working Equalizer System**
- **Bass Boost, Treble Boost, and 8+ presets now actually work!**
- FFmpeg filter integration - real audio processing
- Live EQ indicator in media player footer (🎚️ Bass Boost)
- 10-band equalizer with visual sliders
- Custom EQ presets per server
- Preset indicator shows only when EQ is active

**How to use:**
```
1. Play a song with /play
2. Click the Equalizer button in media player
3. Choose preset: Bass Boost, Treble Boost, Pop, Rock, etc.
4. Apply - you'll hear the difference immediately!
5. Footer shows: 🎚️ [Preset Name] when active
```

#### 🌐 **Enhanced Lyrics with Translation**
- **5 languages supported:** English, Indonesian, Thai, Arabic, Turkish
- Auto language detection
- Side-by-side original + translation view
- Smart caching for faster loading
- Toggle show/hide translation in player

**Supported:**
- 🇬🇧 English
- 🇮🇩 Indonesian (Bahasa Indonesia)
- 🇹🇭 Thai (ไทย)
- 🇸🇦 Arabic (العربية)
- 🇹🇷 Turkish (Türkçe)

#### 🔤 **Romanization Toggle**
- Enable/disable romanization per language
- Support for Japanese, Chinese, Korean
- User preference saved per person
- Toggle directly in media player

**Languages:**
- 🇯🇵 Japanese: Kana → Romaji
- 🇨🇳 Chinese: Hanzi → Pinyin
- 🇰🇷 Korean: Hangul → Romanized

#### 📥 **Multi-Format Download System**
- Download audio in multiple formats: MP3, FLAC, OGG, OPUS
- Download lyrics separately (LRC/TXT with timestamps)
- Download high-resolution artwork
- Download complete package (audio + lyrics + artwork)
- Batch download support for playlists

**Download options:**
```
🎵 Audio only - Choose your format
📝 Lyrics only - With timestamps
🎨 Artwork only - High-res album covers
📦 Complete - Everything in one package
```

#### 🎨 **Modern UI Improvements**
- macOS-style dock taskbar
- Glass morphism design effects
- Netflix-style loading animations
- Maroon color theme with light/dark mode
- Smooth page transitions
- Mobile responsive design

### 🔧 IMPROVEMENTS

#### Performance
- ⚡ Faster audio processing with optimized FFmpeg
- 🗄️ Better caching system for repeated plays
- 📊 Reduced memory usage
- 🚀 Instant playback for cached songs (<1 second)

#### Stability
- 🔒 Fixed voice connection issues
- 🎵 Auto-reconnect on disconnect
- 💾 Better error handling
- 📝 Improved logging system

#### User Experience
- 🎯 Clearer command responses
- 🖼️ Better artwork loading
- 📱 Improved mobile experience
- ⌨️ Faster command processing

### 🐛 BUG FIXES

- Fixed equalizer not applying to audio (now it works!)
- Fixed maintenance mode not blocking commands
- Fixed login redirect going to wrong page
- Fixed broadcast permission checking
- Fixed lyrics romanization for mixed scripts
- Fixed volume control range issues
- Fixed queue auto-play after skip
- Improved error messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## [3.2.2] - Previous Stable Release

### 🎵 **QUEUE SYSTEM (Sistem Antrian)**
Sistem antrian yang lebih canggih:
- Auto-play otomatis memutar lagu berikutnya
- Shuffle untuk mengacak urutan lagu
- Move untuk memindahkan lagu ke posisi yang diinginkan
- Pagination view tampilan antrian yang lebih rapi

**Command baru:**
```
/queue       - Lihat antrian (per halaman)
/shuffle     - Acak antrian
/move <dari> <ke> - Pindahkan posisi lagu
/clear       - Hapus semua antrian
```

### 🔊 **VOLUME CONTROL (Kontrol Volume)**
Atur volume dengan lebih fleksibel:
- Range: 0% - 200%
- Volume tersimpan per server
- Slider interaktif
- Tombol cepat Naik/Turun

**Command:**
```
/volume <0-200>  - Set level volume
/volume-up       - Naik 10%
/volume-down     - Turun 10%
```

**Tips:** Set volume >100% untuk bass boost! 🔥

### 🌏 **LYRICS + ROMANIZATION**
Fitur otomatis menerjemahkan huruf asing ke alfabet:
- 🇯🇵 Jepang: Kanji/Hiragana → Romaji
- 🇨🇳 China: Hanzi → Pinyin
- 🇰🇷 Korea: Hangul → Romanized

Lirik berjalan real-time sesuai musik! 🎤

### 📊 **STATISTICS & HISTORY**
Pantau kebiasaan mendengarkan musik:

**Command:**
```
/stats       - Statistik pribadi
             • Total lagu diputar
             • Total waktu mendengarkan
             • Top 5 lagu & artis favorit

/history     - Riwayat lagu
             • 10 lagu terakhir
             • Opsi putar ulang cepat

/top         - Tangga lagu server
             • Top 10 lagu paling populer
             • Lihat lagu yang lagi hits
```

---

## 📖 USAGE GUIDE

### 🎮 COMMAND DASAR

**Putar Musik:**
```
/play <judul lagu>        - Cari berdasarkan nama
/play <URL>               - Link Spotify/YouTube
/play <URL playlist>      - Auto-add album ke antrian
```

**Kontrol Playback:**
```
/pause      - Jeda musik
/resume     - Lanjutkan musik
/skip       - Lompat ke lagu berikutnya
/stop       - Berhenti & keluar dari voice channel
```

### 📝 MANAJEMEN ANTRIAN

```
/queue            - Lihat daftar antrian
/clear            - Bersihkan semua antrian
/shuffle          - Acak urutan lagu
/move 3 1         - Pindah lagu no. 3 ke posisi no. 1
```

### 🔊 VOLUME

```
/volume 100       - Volume normal
/volume 150       - Mode Bass Boost
/volume-up        - Tambah 10%
/volume-down      - Kurang 10%
```

### 🎚️ EQUALIZER (NEW!)

```
1. Play a song with /play
2. Click Equalizer button
3. Choose preset or customize
4. Apply and enjoy!
```

**Presets Available:**
- Flat (default)
- Bass Boost 🔥
- Treble Boost
- Pop
- Rock
- Jazz
- Classical
- Electronic
- Hip Hop
- Vocal Boost

### 📊 STATISTIK

```
/stats      - Statistik kamu
/history    - Riwayat lagu kamu
/top        - Top 10 server
```

---

## 💡 TIPS & TRICKS

### 1️⃣ **Playlist Magic**
Paste link playlist Spotify, bot otomatis masukkan 50 lagu ke antrian! 🎵

### 2️⃣ **Lagu Ter-Cache**
Lagu yang sudah pernah diputar tersimpan di cache.
Putar ulang jadi instan (<1 detik)! ⚡

### 3️⃣ **Bass Boost**
Set volume di atas 100% atau gunakan EQ Bass Boost untuk bass yang nendang! 🔥
Coba `/volume 150` atau `/volume 200` + EQ Bass Boost

### 4️⃣ **Status Voice Channel**
Lihat status "NOW PLAYING" di nama Voice Channel.
Tahu lagu apa yang main tanpa buka chat Discord!

### 5️⃣ **Re-play History**
Lupa judul lagu enak yang barusan main?
Ketik `/history` → copy judulnya → `/play <judul>`

### 6️⃣ **Download for Offline**
Like a song? Download it with the download button in media player!
Choose your preferred format and quality.

### 7️⃣ **Translate Lyrics**
Can't read the lyrics? Click translate button and choose your language!
Available in 5 languages including English and Indonesian.

---

## 🎯 SUPPORTED SOURCES

✅ **Spotify** (Track, Album, Playlist)  
✅ **YouTube & YouTube Music**  
✅ **Apple Music** (Best artwork quality)  
✅ **Direct Search** (Keywords)  
✅ **Direct URL** (Various audio formats)  

### **Audio Quality:**
- 256-320kbps Opus encoding
- 48kHz sample rate
- Low CPU usage (<5%)
- Low latency (<50ms)

---

## 🐛 TROUBLESHOOTING

**Bot tidak mau masuk Voice Channel?**
→ Pastikan kamu sudah berada di dalam Voice Channel

**Audio tidak keluar?**
→ Ketik `/stop` lalu coba `/play` lagi

**Equalizer tidak terdengar bedanya?**
→ Pastikan sudah click "Apply" setelah memilih preset
→ Coba preset Bass Boost atau Treble Boost yang lebih jelas perbedaannya

**Lagu tidak ditemukan?**
→ Coba kata kunci lain atau gunakan link URL langsung

**Lyrics tidak muncul?**
→ Tidak semua lagu punya lyrics, coba lagu lain

**Download gagal?**
→ Pastikan koneksi internet stabil
→ Coba format lain jika satu format tidak work

---

## 📞 SUPPORT & FEEDBACK

**Need Help?**
- Check pinned messages for FAQs
- Try `/help` command for quick guide
- Contact server admin for technical issues

**Found a Bug?**
- Report with detailed information
- Include error messages if any
- Mention which command caused the issue

**Feature Request?**
- Share your ideas with server admin
- Describe the feature clearly
- Explain how it would help users

---

## 🎊 THANK YOU!

Thank you for using SONORA Discord Music Bot!
Enjoy your favorite music with all these new features! 🎶

**Happy Listening!** 🎵

*- SONORA Team*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Version 3.3.0 | Stable Release** ✅  
**Last Updated:** December 3, 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## [3.0.0] - 2024-12-29

### Added
- **Production-ready architecture** with structured modules
- **3-Tier audio source fallback**: Spotify → YouTube Music → Direct URL
- **Robust voice connection** with timeout handling and retry logic
- **Optimized audio player** using FFmpegOpusAudio (<5% CPU per connection)
- **Synchronized media player** with perfect sync (audio, progress, lyrics)
- **Rate limit protection** for Discord API (updates every 2 seconds)
- **Parallel processing** for audio, artwork, and lyrics downloads
- **Comprehensive error handling** with user-friendly messages
- **Caching system** for artwork, lyrics, and metadata
- **Multi-guild support** with voice manager
- **Slash commands** for modern Discord interface

### Features
- `/play <query>` - Play music from Spotify, YouTube, or search
- `/pause` - Pause current playback
- `/resume` - Resume playback
- `/stop` - Stop and disconnect
- `/skip` - Skip current track
- `/queue` - Show current queue
- `/clear` - Clear queue

### Technical Improvements
- CPU usage: <5% per voice connection (vs 10% with PCMAudio)
- Memory usage: <500MB for 10 concurrent guilds
- Audio quality: 256-320kbps Opus @ 48kHz
- UI update interval: 2 seconds (rate limit safe)
- Lyrics sync: <1 second drift
- Connection timeout: 15 seconds with retry
- Comprehensive logging system

### Security
- Credentials managed via .env file
- Cookie files protected in .gitignore
- No hardcoded secrets
- Sanitized user inputs

### Documentation
- Complete README with installation guide
- API documentation in code
- Type hints for all functions
- Comprehensive error messages

## [Future Versions]

### Planned for v3.1
- Queue system with playlist support
- Volume control
- Seek functionality
- Loop/repeat modes
- Voting system for skip
- DJ role permissions

### Planned for v3.2
- Web dashboard
- Spotify playlist import
- YouTube playlist support
- Custom equalizer
- Audio effects

### Planned for v3.3
- Database integration (PostgreSQL)
- User preferences
- Play history
- Statistics and analytics
- Multi-language support
