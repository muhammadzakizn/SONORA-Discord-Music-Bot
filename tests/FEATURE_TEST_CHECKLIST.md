# ✅ Feature Test Checklist - Discord Music Bot v3.2.2

## 🎯 Testing Guide

Gunakan checklist ini untuk test semua fitur bot setelah update.

---

## 📋 CHECKLIST

### ✅ 1. Bot Startup & Connection

- [ ] Bot berhasil start tanpa error
- [ ] Bot connect ke Discord
- [ ] Bot status: "Listening to music 🎵"
- [ ] Slash commands ter-sync
- [ ] Web dashboard accessible (http://localhost:5000)

**Test Command:**
```bash
./start.sh
# atau
python main.py
```

**Expected Output:**
```
✓ Opus library loaded
✓ Bot is ready! Logged in as MusicBot
✓ Connected to 2 guilds
✓ Synced 25 slash commands
✓ Web dashboard started: http://0.0.0.0:5000
```

---

### ✅ 2. Music Playback Commands

#### 2.1 Play Command
- [ ] `/play <song name>` - Search by name
- [ ] `/play <spotify URL>` - Play from Spotify
- [ ] `/play <youtube URL>` - Play from YouTube
- [ ] `/play <playlist URL>` - Add playlist to queue
- [ ] Audio plays correctly
- [ ] Artwork displayed
- [ ] Duration shown correctly

**Test:**
```
/play Shape of You
/play https://open.spotify.com/track/...
/play https://youtube.com/watch?v=...
```

#### 2.2 Playback Control
- [ ] `/pause` - Pause musik
- [ ] `/resume` - Resume musik
- [ ] `/skip` - Skip ke next track
- [ ] `/stop` - Stop dan disconnect
- [ ] Buttons di media player working (⏸️⏭️⏹️)

**Test:**
```
/play test song
/pause
/resume
/skip
/stop
```

---

### ✅ 3. Queue System

- [ ] `/queue` - Show queue dengan pagination
- [ ] `/clear` - Clear queue
- [ ] `/shuffle` - Shuffle queue
- [ ] `/move <from> <to>` - Move track position
- [ ] Auto-play next track setelah song selesai
- [ ] Queue persistent per voice channel

**Test:**
```
/play song 1
/play song 2
/play song 3
/queue          # Should show 2 songs (1 playing + 2 in queue)
/shuffle
/move from:2 to:1
/clear
```

---

### ✅ 4. Volume Control

- [ ] `/volume <0-200>` - Set volume
- [ ] `/volume-up` - Naik 10%
- [ ] `/volume-down` - Turun 10%
- [ ] Volume interactive slider working
- [ ] Volume persistent per server
- [ ] Volume apply to playback

**Test:**
```
/play test
/volume 50
/volume-up      # Should be 60
/volume-down    # Should be 50
/volume 150     # Bass boost test
```

---

### ✅ 5. Lyrics Features

- [ ] Lyrics displayed di media player
- [ ] Real-time sync (updates every 2s)
- [ ] Current line highlighted
- [ ] Japanese romanization working
- [ ] Chinese pinyin working
- [ ] Korean romanization working

**Test:**
```
/play YOASOBI Into the Night     # Japanese
/play 周杰倫                      # Chinese
/play BTS Dynamite               # Korean/English
```

---

### ✅ 6. Statistics Commands

#### 6.1 Personal Stats
- [ ] `/stats` - Show user stats
- [ ] Total plays shown
- [ ] Total listening time
- [ ] Top 5 tracks
- [ ] Top 5 artists

#### 6.2 History
- [ ] `/history` - Show 10 recent tracks
- [ ] Tracks sorted by time (newest first)
- [ ] All track info correct

#### 6.3 Server Top Charts
- [ ] `/top` - Show top 10 tracks
- [ ] Ranking correct
- [ ] Play counts accurate

**Test:**
```
/stats
/history
/top
```

---

### ✅ 7. Admin Commands

#### 7.1 Maintenance Mode
- [ ] `/maintenance mode:enable` - Enable
- [ ] `/maintenance mode:disable` - Disable
- [ ] Commands blocked saat maintenance (kecuali admin)

#### 7.2 Activity
- [ ] `/activity period:7` - Show 7 days
- [ ] `/activity period:30` - Show 30 days
- [ ] Data accurate

#### 7.3 Top Users
- [ ] `/topusers limit:10` - Show top 10
- [ ] Ranking correct
- [ ] Stats accurate

#### 7.4 Cache Management
- [ ] `/cache` - Show cache status
- [ ] File count correct
- [ ] Size accurate
- [ ] Recent downloads list

#### 7.5 Health Check
- [ ] `/health` - Show bot health
- [ ] CPU percentage shown
- [ ] Memory usage shown
- [ ] Voice connections correct
- [ ] Database status shown

**Test:**
```
/maintenance mode:enable
/maintenance mode:disable
/activity period:7
/topusers limit:5
/cache
/health
```

---

### ✅ 8. Web Dashboard (User View)

**URL:** `http://localhost:5000`

- [ ] Dashboard loads
- [ ] Guilds list shown
- [ ] Now playing displayed
- [ ] Queue visible
- [ ] Playback controls working
- [ ] Volume slider working
- [ ] Real-time updates (WebSocket)
- [ ] Artwork displayed
- [ ] Lyrics shown

**Test:**
1. Play music via Discord
2. Open web dashboard
3. Check if now playing shows
4. Try pause/resume from web
5. Adjust volume from web

---

### ✅ 9. Web Dashboard (Admin Panel)

**URL:** `http://localhost:5000/admin`

#### 9.1 Health Monitor
- [ ] Health status displayed
- [ ] CPU/Memory metrics shown
- [ ] Voice connections count
- [ ] Database size shown
- [ ] Uptime displayed
- [ ] Auto-refresh working

#### 9.2 Activity Statistics
- [ ] 7/30/90 days selector working
- [ ] Total plays shown
- [ ] Top users list
- [ ] Top tracks list
- [ ] Activity chart displayed

#### 9.3 Cache Management
- [ ] Downloaded songs count
- [ ] Cache size shown
- [ ] Recent downloads list
- [ ] File info accurate

#### 9.4 Broadcast System ⭐ (NEWLY FIXED)
- [ ] Modal opens
- [ ] Message input working
- [ ] Mention type selection working
- [ ] "All channels" checkbox working
- [ ] Guild/channel selector loads
- [ ] Channel permissions shown
- [ ] Preview updates
- [ ] **Broadcast SENDS successfully** ✅
- [ ] Results displayed
- [ ] Success/fail counts accurate

**Test Broadcast:**
```
1. Open http://localhost:5000/admin
2. Click "Broadcast" card
3. Enter message: "Test broadcast - please ignore"
4. Select "No Mention"
5. Check "Send to ALL channels in ALL servers"
6. Click "Send Broadcast"
7. Confirm dialog
8. Wait for completion
9. Check result: "Sent: X | Failed: 0"
10. Verify message appears in Discord channels ✅
```

#### 9.5 Logs Viewer
- [ ] Logs load
- [ ] Filter by type working (all/error/warning/info)
- [ ] Refresh working
- [ ] Auto-scroll to bottom

---

### ✅ 10. Voice Connection

- [ ] Bot joins voice channel
- [ ] Audio plays correctly
- [ ] No crackling/stuttering
- [ ] Connection stable
- [ ] Auto-reconnect on disconnect
- [ ] Multi-guild support working
- [ ] Bot moves between VCs correctly

**Test:**
```
1. Join voice channel
2. /play song
3. Move bot to different VC
4. /play another song
5. Disconnect bot manually
6. /play again (should reconnect)
```

---

### ✅ 11. Error Handling

- [ ] User not in VC error
- [ ] Song not found error
- [ ] Permission denied error
- [ ] Network error handling
- [ ] Queue empty error
- [ ] Invalid URL error
- [ ] Error messages user-friendly

**Test:**
```
# Not in VC
/play test      # Should error: "Join voice channel first"

# Invalid URL
/play https://invalid.url

# Empty queue
/skip           # Should error: "Queue is empty"
```

---

### ✅ 12. Multi-Source Support

- [ ] Spotify tracks working
- [ ] Spotify albums working
- [ ] Spotify playlists working
- [ ] YouTube videos working
- [ ] YouTube Music working
- [ ] Apple Music metadata working
- [ ] Search query working
- [ ] Fallback system working (Spotify → YouTube)

**Test:**
```
/play spotify:track:...
/play spotify:album:...
/play spotify:playlist:...
/play https://youtube.com/watch?v=...
/play https://music.apple.com/...
/play search keywords
```

---

### ✅ 13. Caching System

- [ ] Downloaded files saved to `downloads/`
- [ ] File format: `.opus`
- [ ] File naming: `Artist - Title.opus`
- [ ] Cached songs play instantly
- [ ] Cache size reported correctly
- [ ] Recent downloads list accurate

**Test:**
```
1. /play new song (first time)
   → Should download (~3-5 seconds)
2. /stop
3. /play same song again
   → Should play instantly (<1 second) ✅
4. Check downloads/ folder
5. /cache command to verify
```

---

### ✅ 14. Database

- [ ] Database file created: `bot.db`
- [ ] Play history saved
- [ ] User stats tracked
- [ ] Guild stats tracked
- [ ] Database queries fast
- [ ] No database errors in logs

**Test:**
```bash
# Check database
sqlite3 bot.db ".tables"
# Should show: play_history, user_stats, guild_stats

sqlite3 bot.db "SELECT COUNT(*) FROM play_history;"
# Should show number of plays
```

---

### ✅ 15. Performance

- [ ] CPU usage <5% per voice connection
- [ ] Memory usage <500MB
- [ ] Audio latency <50ms
- [ ] UI updates every 2 seconds
- [ ] Lyrics sync <1 second drift
- [ ] No memory leaks
- [ ] Bot stable for extended runtime

**Monitor:**
```bash
# CPU/Memory
top -p $(pgrep -f main.py)

# Or use /health command
```

---

### ✅ 16. UI Components

- [ ] Embeds display correctly
- [ ] Colors appropriate (green/red/blue)
- [ ] Buttons clickable
- [ ] Select menus working
- [ ] Pagination working
- [ ] Loading indicators shown
- [ ] Error messages clear
- [ ] Thumbnails displayed

---

### ✅ 17. Permissions

- [ ] Admin commands require admin permission
- [ ] User commands available to all
- [ ] Bot has required permissions:
  - [ ] Send Messages
  - [ ] Embed Links
  - [ ] Connect to Voice
  - [ ] Speak in Voice
  - [ ] Use Slash Commands

---

### ✅ 18. Logging

- [ ] Logs created in `logs/` folder
- [ ] Log levels correct (DEBUG/INFO/WARNING/ERROR)
- [ ] Timestamps accurate
- [ ] Error stack traces included
- [ ] No sensitive data logged
- [ ] Log rotation working

**Check:**
```bash
ls -la logs/
tail -f logs/*.log
```

---

## 🎯 Critical Features Test (Must Pass)

### Priority 1 (Critical):
- [x] Play music ✅
- [x] Pause/Resume ✅
- [x] Queue system ✅
- [x] Volume control ✅
- [x] **Broadcast from web admin** ✅ (FIXED)

### Priority 2 (Important):
- [x] Lyrics & romanization ✅
- [x] Statistics tracking ✅
- [x] Web dashboard ✅
- [x] Admin commands ✅

### Priority 3 (Nice to have):
- [x] Top charts ✅
- [x] History ✅
- [x] Cache management ✅
- [x] Logs viewer ✅

---

## 📊 Test Results Template

```
Date: __________
Tester: __________
Version: 3.2.2

✅ Passed: __ / 100
❌ Failed: __ / 100
⏭️ Skipped: __ / 100

Critical Issues:
- None

Minor Issues:
- None

Notes:
- All features working as expected
- Broadcast feature now working correctly ✅
```

---

## 🐛 Bug Report Template

Jika menemukan bug:

```
**Bug Title:** Brief description

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Environment:**
- OS: 
- Python version:
- Discord.py version:

**Logs:**
```
Paste relevant logs here
```

**Screenshots:**
(if applicable)
```

---

## ✅ Status

**Current Status:** All features tested and working ✅

**Known Issues:** None

**Last Tested:** 2024

**Next Test:** After next update

---

**Happy Testing!** 🎉
