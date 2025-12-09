# 🛠️ Admin Features - Discord Music Bot v3.2

## 🎉 New Admin Commands Overview

### **6 New Powerful Admin Commands Added!**

---

## 📋 Command List

### 1️⃣ **`/maintenance <mode> [reason]`**
**Purpose:** Toggle maintenance mode untuk pause bot sementara

**Parameters:**
- `mode` (required): `True` = enable, `False` = disable
- `reason` (optional): Alasan maintenance (default: "Scheduled maintenance")

**What it does:**
- ✅ Pause all active playback di semua guilds
- ✅ Disable new commands temporarily
- ✅ Show maintenance reason to users
- ✅ Admin only (server owner or administrator)

**Example:**
```
/maintenance mode:True reason:Database upgrade in progress
/maintenance mode:False
```

**Output:**
```
🔧 Maintenance Mode Enabled
────────────────────────────
Reason: Database upgrade in progress

All playback has been paused.
New commands will be temporarily disabled.

Enabled by: @Admin
```

---

### 2️⃣ **`/broadcast <message> [voice_only]`**
**Purpose:** Kirim broadcast message ke semua channels

**Parameters:**
- `message` (required): Message yang akan di-broadcast
- `voice_only` (optional): Only send to guilds where bot is in voice (default: False)

**What it does:**
- ✅ Mengirim message ke semua guilds
- ✅ Menampilkan list channels yang berhasil/gagal
- ✅ Optional: Only to voice-connected guilds
- ✅ Shows sender info

**Example:**
```
/broadcast message:Bot akan maintenance dalam 10 menit voice_only:True
/broadcast message:Update v3.2 telah dirilis! Check changelog
```

**Output:**
```
📢 Broadcast Complete
────────────────────────────
Message: Bot akan maintenance dalam 10 menit

✅ Sent: 5
❌ Failed: 0

Channels:
✅ Dika Empire → #general
✅ Music Server → #bot-commands
✅ Gaming Hub → #music
✅ Chill Zone → #lounge
✅ Study Group → #study-music
```

---

### 3️⃣ **`/activity [period]`**
**Purpose:** Lihat bot activity & usage statistics

**Parameters:**
- `period` (optional): Time period in days (default: 7)

**What it does:**
- ✅ Total plays in period
- ✅ Unique users & guilds
- ✅ Total playtime
- ✅ Top 5 most active users
- ✅ Top 5 most played tracks

**Example:**
```
/activity period:30
/activity period:7
```

**Output:**
```
📊 Bot Activity - Last 30 Days
────────────────────────────────

📈 Overall Statistics
Total Plays: 1,234
Unique Users: 45
Active Guilds: 5
Total Playtime: 87h 45m

👥 Most Active Users
1. @UserA - 234 plays
2. @UserB - 189 plays
3. @UserC - 145 plays
4. @UserD - 123 plays
5. @UserE - 98 plays

🎵 Most Played Tracks
1. Song A by Artist X - 45 plays
2. Song B by Artist Y - 38 plays
3. Song C by Artist Z - 32 plays
4. Song D by Artist W - 28 plays
5. Song E by Artist V - 25 plays
```

---

### 4️⃣ **`/topusers [limit] [days]`**
**Purpose:** Lihat users paling aktif dengan detail

**Parameters:**
- `limit` (optional): Number of users to show (default: 10)
- `days` (optional): Time period in days (default: 30)

**What it does:**
- ✅ Ranking dengan medal (🥇🥈🥉)
- ✅ Total plays per user
- ✅ Total playtime per user
- ✅ Number of guilds active in
- ✅ User avatar display

**Example:**
```
/topusers limit:20 days:90
/topusers limit:5 days:7
```

**Output:**
```
👥 Top 10 Most Active Users
Last 30 days
────────────────────────────────

🥇 UserA
Plays: 234
Playtime: 52h 15m
Active in: 3 server(s)

🥈 UserB
Plays: 189
Playtime: 42h 30m
Active in: 2 server(s)

🥉 UserC
Plays: 145
Playtime: 32h 45m
Active in: 4 server(s)

4. UserD
Plays: 123
Playtime: 27h 20m
Active in: 1 server(s)

[... and 6 more]
```

---

### 5️⃣ **`/cache`**
**Purpose:** Lihat cache status dan available songs

**What it does:**
- ✅ Downloaded songs count & size
- ✅ Cache files count & size
- ✅ Recent downloads (last 10)
- ✅ Storage location info

**Example:**
```
/cache
```

**Output:**
```
💾 Cache Status
────────────────────────────────

📥 Downloaded Songs
Count: 156 files
Size: 1,234.56 MB
Location: downloads/

🗂️ Cache Files
Count: 89 files
Size: 45.67 MB
Location: cache/

🎵 Recent Downloads (Last 10)
• Song Title A - Artist Name
• Another Song - Band Name
• Track Title - Singer Name
• Music Title - Artist Name
• Song Name - Band Name
• Track Name - Singer Name
• Music Name - Artist Name
• Song Title B - Band Name
• Another Track - Singer Name
• Music Track - Artist Name

Requested by: @Admin
```

---

### 6️⃣ **`/health`**
**Purpose:** Comprehensive bot health monitoring

**What it does:**
- ✅ System resources (CPU, Memory, Uptime)
- ✅ Bot metrics (Latency, Guilds, Users)
- ✅ Voice status (Connections, Playing)
- ✅ Database status (Size, Status)
- ✅ Loaded modules count
- ✅ Maintenance mode status
- ✅ Overall health score (0-100%)

**Example:**
```
/health
```

**Output:**
```
🏥 Bot Health Status
────────────────────────────────
Overall Health: 🟢 95%

💻 System Resources
CPU Usage: 3.5%
Memory: 245.6 MB
Uptime: 5h 23m

🤖 Bot Metrics
Latency: 287.45 ms
Guilds: 5
Users: 1,234

🔊 Voice Status
Connections: 2
Playing: 1
Total: 3

🗄️ Database
Status: ✅ Connected
Size: 12.34 MB
Type: SQLite

📦 Loaded Modules
Count: 6
Modules: PlayCommand, ControlCommands, QueueCommands, VolumeCommands, StatsCommands, AdminCommands

⚙️ Maintenance
Status: ✅ Normal
Reason: N/A

Requested by: @Admin
```

---

## 🌐 Web Dashboard Admin Panel

### **New API Endpoints:**

#### 1. **`GET /api/admin/health`**
Returns comprehensive bot health metrics
```json
{
  "system": {
    "cpu_percent": 3.5,
    "memory_mb": 245.6,
    "uptime_seconds": 19380
  },
  "bot": {
    "latency_ms": 287.45,
    "guilds": 5,
    "users": 1234
  },
  "voice": {
    "connected": 2,
    "playing": 1,
    "total_connections": 3
  },
  "database": {
    "size_mb": 12.34,
    "status": "connected"
  },
  "modules": {
    "loaded": ["PlayCommand", "ControlCommands", ...],
    "count": 6
  }
}
```

#### 2. **`GET /api/admin/cache`**
Returns cache status and files
```json
{
  "downloads": {
    "count": 156,
    "size_mb": 1234.56,
    "recent": [
      {"name": "Song Title", "size_mb": 8.5},
      {"name": "Another Song", "size_mb": 7.8}
    ]
  },
  "cache": {
    "count": 89,
    "size_mb": 45.67
  }
}
```

#### 3. **`GET /api/admin/activity?days=7`**
Returns detailed activity statistics
```json
{
  "period_days": 7,
  "total_plays": 1234,
  "total_duration": 315720,
  "top_users": [
    {"username": "UserA", "user_id": 123, "plays": 234, "duration": 52920}
  ],
  "top_tracks": [
    {"title": "Song A", "artist": "Artist X", "plays": 45}
  ]
}
```

---

## 🔐 Security & Permissions

### **Admin-Only Commands:**
All admin commands require one of:
- ✅ Server Owner status
- ✅ Administrator permission

### **Permission Check:**
```python
@is_bot_admin()  # Decorator automatically checks permissions
```

### **Error Response:**
```
⛔ Permission Denied
────────────────────────────
You need administrator permissions to use this command
```

---

## 📊 Use Cases

### **1. Scheduled Maintenance**
```
# Before maintenance
/broadcast message:Bot akan maintenance dalam 5 menit. Mohon maaf atas ketidaknyamanannya.

# Wait 5 minutes

# Enable maintenance
/maintenance mode:True reason:Database optimization and cleanup

# Perform maintenance...

# Disable maintenance
/maintenance mode:False

# Notify users
/broadcast message:Maintenance selesai! Bot sudah normal kembali. Terima kasih atas kesabarannya.
```

### **2. Monitor Bot Health**
```
# Regular health check
/health

# If issues found:
# - High CPU → Check active connections
# - High memory → Clear cache
# - High latency → Check network
```

### **3. Track User Activity**
```
# Weekly report
/activity period:7

# Monthly top users
/topusers limit:10 days:30

# Most requested songs
/top 30
```

### **4. Cache Management**
```
# Check cache status
/cache

# If cache too large:
# - Manual cleanup via file system
# - Or implement /clearcache command (future)
```

---

## 🎯 Benefits

### **For Admins:**
- ✅ Complete control over bot
- ✅ Real-time monitoring
- ✅ Easy maintenance management
- ✅ User activity insights
- ✅ Performance monitoring

### **For Users:**
- ✅ Clear communication during maintenance
- ✅ Transparent bot status
- ✅ Better user experience

### **For Bot Health:**
- ✅ Proactive issue detection
- ✅ Resource monitoring
- ✅ Performance optimization
- ✅ Historical data tracking

---

## 📈 Future Enhancements

### **Planned Features:**
- [ ] `/clearcache` - Clear download cache
- [ ] `/restart` - Restart bot remotely
- [ ] `/blacklist <user>` - Blacklist abusive users
- [ ] `/whitelist <user>` - Whitelist VIP users
- [ ] `/announce` - Schedule announcements
- [ ] `/backup` - Backup database
- [ ] `/logs` - View recent logs
- [ ] `/ban <guild>` - Ban guild from using bot

---

## 🚀 Quick Reference

| Command | Purpose | Admin Only |
|---------|---------|------------|
| `/maintenance` | Toggle maintenance mode | ✅ |
| `/broadcast` | Send message to all guilds | ✅ |
| `/activity` | View usage statistics | ✅ |
| `/topusers` | View most active users | ✅ |
| `/cache` | View cache status | ✅ |
| `/health` | View bot health | ✅ |

---

## 📞 Support

For admin command issues:
1. Check user has admin permissions
2. Verify bot has necessary permissions
3. Check logs for errors
4. Use `/health` to diagnose

---

**Version:** 3.2.0  
**Added:** December 2, 2025  
**Status:** ✅ Production Ready

**🎉 Enjoy the new admin features!**
