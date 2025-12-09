# 🌐 Web Dashboard Complete Guide

## 📊 Overview

Discord Music Bot v3.2 hadir dengan 2 halaman web dashboard yang powerful:

1. **User Dashboard** (`/`) - Monitoring & control untuk semua users
2. **Admin Panel** (`/admin`) - Advanced admin features & analytics

---

## 🖥️ User Dashboard

### **URL:** http://localhost:5001

### **Features:**

#### **1. Header Navigation**
```
🎵 Discord Music Bot v3.2
[📊 Dashboard] [🛠️ Admin Panel]  🟢 Online
```
- Quick switch between dashboard & admin panel
- Real-time status indicator

#### **2. Stats Overview**
```
┌────────────┬────────────┬──────────────┬─────────────┐
│ 🏰 Guilds  │ 👥 Users   │ 🔊 Voice Con │ ▶️ Playing  │
│     2      │    10      │      0       │     0       │
└────────────┴────────────┴──────────────┴─────────────┘
```
- Total guilds bot is in
- Total users across all guilds
- Active voice connections
- Currently playing tracks

#### **3. Active Guilds**
```
┌─────────────────────────────────────────┐
│ [Guild Icon] Server Name                │
│ 👥 20 members                           │
│ ⏸️ Idle / ▶️ Playing: Song - Artist    │
└─────────────────────────────────────────┘
```
- Click guild card to see details
- Shows current playing track
- Visual indicator for active playback

#### **4. Guild Detail Modal**
```
┌─────────────────────────────────────────┐
│            Server Name                  │
│ ─────────────────────────────────────── │
│ Current Track                           │
│ [Artwork]                               │
│ Song Title                              │
│ Artist Name                             │
│                                         │
│ [⏸️ Pause] [⏭️ Skip] [⏹️ Stop]          │
│                                         │
│ Queue (5 tracks)                        │
│ 1. Song A - Artist A                    │
│ 2. Song B - Artist B                    │
│ 3. Song C - Artist C                    │
└─────────────────────────────────────────┘
```
- Full track info with artwork
- Playback controls (pause, skip, stop)
- Queue viewer

#### **5. Recent Activity**
```
🎵 Song Title - Artist
   By @Username • 5m ago

🎵 Another Song - Band
   By @User2 • 12m ago
```
- Last 20 tracks played
- Username & timestamp
- Auto-updates

---

## 🛠️ Admin Panel

### **URL:** http://localhost:5001/admin

### **Features:**

#### **1. Quick Actions**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   🔧     │ │   📢     │ │   🔄     │ │   🗑️     │
│Mainten-  │ │Broadcast │ │ Refresh  │ │  Clear   │
│  ance    │ │          │ │   Data   │ │  Cache   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Maintenance Mode:**
- Click to open modal
- Toggle maintenance on/off
- Add reason
- Pauses all playback

**Broadcast:**
- Click to open modal
- Enter message
- Choose voice-only or all channels
- Send to all guilds at once

**Refresh Data:**
- Reload all statistics
- Update charts
- Refresh health metrics

**Clear Cache:**
- Confirmation dialog
- Clear temporary files
- Free up disk space

#### **2. Bot Health Status**
```
🏥 Bot Health Status        🟢 95%
─────────────────────────────────────

💻 System Resources    🤖 Bot Metrics
CPU: 3.5%              Latency: 289ms
Memory: 245 MB         Guilds: 2
Uptime: 5h 23m         Users: 10

🔊 Voice Status        🗄️ Database
Connections: 0         Size: 12.34 MB
Playing: 0             Status: ✅ Connected
Total: 0               Modules: 6
```
- Real-time metrics
- Health score (0-100%)
- Color-coded indicators
- Auto-refresh every 10s

#### **3. Activity Statistics**
```
📊 Activity Statistics
[7 Days] [30 Days] [90 Days]

Total Plays: 1,234     Total Playtime: 87h 45m
Top Users: 10          Top Tracks: 10

🎵 Top Tracks
1. Song A by Artist X - 45 plays
2. Song B by Artist Y - 38 plays
3. Song C by Artist Z - 32 plays
```
- Period selector (7/30/90 days)
- Total plays & playtime
- Top tracks list
- Auto-refresh every 30s

#### **4. Most Active Users**
```
👥 Most Active Users

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
```
- Medal rankings (🥇🥈🥉)
- Total plays & playtime
- Multi-server activity

#### **5. Cache Management**
```
💾 Cache Management

📥 Downloaded Songs        🗂️ Cache Files
Count: 156 files          Count: 89 files
Size: 1,234.56 MB         Size: 45.67 MB
Location: downloads/      Location: cache/

Recent Downloads:
• Song Title A - 8.5 MB
• Another Song - 7.8 MB
• Track Title - 9.2 MB
[... more files]
```
- Downloaded songs count & size
- Cache files info
- Recent downloads list
- Storage usage visualization

#### **6. Activity Trends Chart**
```
📈 Activity Trends
[Interactive Bar Chart]
Shows top 10 tracks with play counts
```
- Interactive Chart.js visualization
- Hover for details
- Updates based on period selection

---

## 🎯 How to Use

### **Access Dashboard:**
```
1. Start bot: python3 main.py
2. Open browser: http://localhost:5001
3. Navigate between pages using top buttons
```

### **Monitor Bot:**
```
User Dashboard:
- See all guilds
- Check current playing
- View recent activity

Admin Panel:
- Monitor health
- View analytics
- Manage cache
- Control bot
```

### **Control Playback:**
```
1. Click guild card in dashboard
2. Modal opens with controls
3. Click: Pause, Skip, or Stop
4. Changes apply immediately
```

### **View Statistics:**
```
Admin Panel → Activity Statistics
- Select period (7/30/90 days)
- View total plays
- See top tracks
- Check top users
```

### **Maintenance Mode:**
```
Admin Panel → Quick Actions → Maintenance
1. Click Maintenance card
2. Check "Enable Maintenance Mode"
3. Enter reason
4. Click Apply
5. All playback pauses
```

### **Broadcast Message:**
```
Admin Panel → Quick Actions → Broadcast
1. Click Broadcast card
2. Enter message
3. Optional: Check "Voice channels only"
4. Click Send Broadcast
5. Message sent to all guilds
```

---

## 📱 Responsive Design

### **Desktop:**
- Full layout with all features
- Multi-column grids
- Interactive charts

### **Tablet:**
- Adaptive 2-column layout
- Touch-friendly buttons
- Optimized charts

### **Mobile:**
- Single column layout
- Collapsible sections
- Swipe navigation

---

## 🔄 Real-time Updates

### **WebSocket Connection:**
```javascript
Status updates: Every 2 seconds
Health metrics: Every 10 seconds
Activity stats: Every 30 seconds
```

### **Auto-refresh:**
- Connection status indicator
- Live playback status
- Real-time statistics
- Instant control feedback

---

## 🎨 UI Elements

### **Color Scheme:**
- Primary: Dark theme (#0f1419, #1a1f2e)
- Accent: Green (#1db954)
- Secondary: Purple (#5865f2)
- Error: Red (#ff4757)
- Warning: Orange (#ffa502)

### **Animations:**
- Smooth transitions
- Hover effects
- Card elevation
- Progress bars
- Loading states

---

## 🔐 Security Notes

### **Current Setup:**
⚠️ **Local Network Only**
- No authentication required
- Accessible to anyone on network
- Suitable for home/private servers

### **For Production:**
1. Add authentication (JWT/OAuth)
2. Use reverse proxy (nginx)
3. Enable HTTPS
4. Restrict IP access
5. Add rate limiting

---

## 🐛 Troubleshooting

### **Dashboard Not Loading:**
```bash
# Check bot is running
curl http://localhost:5001/api/status

# Check port
lsof -i :5001

# Check logs
tail -50 logs/*.log
```

### **Guild Error:**
- Wait 2-3 seconds after load
- Refresh page
- Guild ID automatically fixed in v3.2

### **Stats Not Showing:**
- Play some music first
- Wait for tracking to populate
- Check database: `ls -lh bot.db`

### **Charts Not Loading:**
```html
<!-- Check Chart.js loaded -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

---

## 🎯 Quick Reference

| Feature | URL | Purpose |
|---------|-----|---------|
| User Dashboard | `/` | Monitor & control |
| Admin Panel | `/admin` | Advanced features |
| Bot Status | `/api/status` | JSON status |
| Guilds List | `/api/guilds` | JSON guilds |
| Guild Detail | `/api/guild/<id>` | JSON guild info |
| Health Status | `/api/admin/health` | JSON health |
| Cache Status | `/api/admin/cache` | JSON cache |
| Activity Stats | `/api/admin/activity` | JSON activity |

---

## ✨ Tips & Tricks

### **Keyboard Shortcuts:**
- `Ctrl+R` - Refresh page
- `F12` - Open developer tools
- `Esc` - Close modals

### **Best Practices:**
1. Monitor health regularly
2. Check cache size weekly
3. Review top users monthly
4. Backup database periodically
5. Update bot regularly

### **Performance:**
- Dashboard loads in <1s
- Auto-refresh minimal impact
- Charts render smoothly
- WebSocket efficient

---

## 🎉 Summary

**User Dashboard:**
✅ Real-time monitoring
✅ Guild management
✅ Playback controls
✅ Activity tracking

**Admin Panel:**
✅ Health monitoring
✅ Activity analytics
✅ User rankings
✅ Cache management
✅ Maintenance mode
✅ Broadcast system
✅ Interactive charts

**Total:** 2 pages, 10+ features, production-ready!

---

**Version:** 3.2
**Last Updated:** December 2, 2025
**Status:** ✅ Fully Functional

🌐 **Access Now:** http://localhost:5001
