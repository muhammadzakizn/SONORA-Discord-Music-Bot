# ⚡ Quick Commands Reference

## 🚀 Starting Bot

### **Method 1: Simple Start (Manual)**
```bash
cd /Users/muham/Documents/"SONORA - Discord Audio Bot"/SONORA7.2.0
python3 main.py
```

### **Method 2: Using Start Script**
```bash
./START_BOT.sh
```

### **Method 3: With Auto-Restart (Recommended for Production)**
```bash
./AUTO_RESTART.sh &
```

### **Method 4: In Background**
```bash
python3 main.py > logs/bot.log 2>&1 &
```

---

## 🛑 Stopping Bot

### **Stop Running Bot:**
```bash
pkill -f "python3 main.py"
```

### **Stop Auto-Restart:**
```bash
pkill -f "AUTO_RESTART.sh"
pkill -f "python3 main.py"
```

### **Force Kill:**
```bash
pkill -9 -f "python3 main.py"
```

---

## 🔍 Checking Status

### **Check if Bot Running:**
```bash
ps aux | grep "python3 main.py" | grep -v grep
```

### **Check Via API:**
```bash
curl http://localhost:5001/api/status
```

### **Check Health:**
```bash
curl http://localhost:5001/api/admin/health | python3 -m json.tool
```

### **Via Web Browser:**
- Dashboard: http://localhost:5001
- Admin Panel: http://localhost:5001/admin

---

## 📋 Viewing Logs

### **Real-time Logs:**
```bash
tail -f logs/*.log
```

### **Last 50 Lines:**
```bash
tail -50 logs/*.log
```

### **Errors Only:**
```bash
tail -100 logs/*.log | grep ERROR
```

### **Warnings Only:**
```bash
tail -100 logs/*.log | grep WARNING
```

### **Specific Search:**
```bash
tail -200 logs/*.log | grep -E "(audio|voice|connection)"
```

---

## 🔄 Restarting Bot

### **Quick Restart:**
```bash
pkill -f "python3 main.py" && sleep 2 && python3 main.py &
```

### **Or Use Script:**
```bash
pkill -f "python3 main.py"
./START_BOT.sh
```

---

## 🧪 Testing

### **Test Audio:**
```discord
/play faded
```

### **Test Commands:**
```discord
/health
/stats
/cache
```

### **Test Web Dashboard:**
```bash
open http://localhost:5001
# Or: xdg-open http://localhost:5001 (Linux)
```

---

## 🗄️ Database

### **Check Database Size:**
```bash
ls -lh bot.db
```

### **Backup Database:**
```bash
cp bot.db "backups/bot_$(date +%Y%m%d_%H%M%S).db"
```

### **Reset Database:**
```bash
rm bot.db
# Bot will recreate on next start
```

---

## 📦 Cache Management

### **Check Cache Size:**
```bash
du -sh downloads/
du -sh cache/
```

### **Clear Downloads:**
```bash
rm downloads/*.opus
```

### **Clear Cache:**
```bash
rm -rf cache/*
```

---

## 🔧 Troubleshooting

### **If Bot Won't Start:**
```bash
# Check Python version
python3 --version

# Check dependencies
pip list | grep discord

# Reinstall requirements
pip install -r requirements.txt --upgrade
```

### **If Opus Error:**
```bash
# Check opus
brew list | grep opus

# Reinstall
brew reinstall opus
```

### **If Port Busy:**
```bash
# Find process using port 5001
lsof -i :5001

# Kill it
kill -9 <PID>
```

### **If Database Locked:**
```bash
# Check for lock file
ls -la bot.db*

# Remove lock
rm bot.db-wal bot.db-shm

# Or reset database
rm bot.db
```

---

## 📊 Monitoring

### **CPU & Memory:**
```bash
# Via system
top -l 1 | grep -E "(python3|CPU|PhysMem)"

# Via web dashboard
curl http://localhost:5001/api/admin/health | python3 -m json.tool
```

### **Uptime:**
```bash
# Check bot uptime from API
curl -s http://localhost:5001/api/status | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Uptime: {data.get('uptime', 0):.0f}s\")"
```

---

## 🌐 Web Access

### **Local:**
- http://localhost:5001
- http://127.0.0.1:5001

### **Network:**
- http://192.168.1.6:5001 (from other devices)

### **Find Your IP:**
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Linux
hostname -I
```

---

## 🎯 Common Tasks

### **Daily:**
```bash
# Check status
curl http://localhost:5001/api/status

# Check logs for errors
tail -50 logs/*.log | grep ERROR
```

### **Weekly:**
```bash
# Backup database
cp bot.db "backups/bot_weekly_$(date +%Y%m%d).db"

# Check cache size
du -sh downloads/ cache/

# Review stats
open http://localhost:5001/admin
```

### **Monthly:**
```bash
# Update dependencies
pip install -r requirements.txt --upgrade

# Clear old cache
find downloads/ -mtime +30 -delete

# Restart bot fresh
pkill -f "python3 main.py"
python3 main.py &
```

---

## 🎵 Discord Commands Quick Ref

### **Music:**
```
/play <song>     - Play music
/pause           - Pause
/resume          - Resume
/skip            - Skip
/stop            - Stop
/volume <0-200>  - Set volume
```

### **Queue:**
```
/queue           - Show queue
/clear           - Clear queue
```

### **Stats:**
```
/stats           - Your stats
/history [n]     - Play history
/top [days]      - Top tracks
```

### **Admin:**
```
/health          - Bot health
/activity        - Usage stats
/topusers        - Active users
/cache           - Cache info
```

---

## 💾 Backup & Restore

### **Full Backup:**
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database
cp bot.db backups/$(date +%Y%m%d)/

# Backup config
cp .env backups/$(date +%Y%m%d)/

# Backup logs
cp -r logs/ backups/$(date +%Y%m%d)/
```

### **Restore:**
```bash
# Stop bot
pkill -f "python3 main.py"

# Restore database
cp backups/YYYYMMDD/bot.db ./

# Start bot
python3 main.py &
```

---

## 🚨 Emergency

### **Bot Crashed:**
```bash
# Check what happened
tail -100 logs/*.log | grep -E "(ERROR|CRITICAL|crash)"

# Restart
python3 main.py &

# Check if running
curl http://localhost:5001/api/status
```

### **Can't Connect to Voice:**
```bash
# Check voice connections
curl -s http://localhost:5001/api/status | python3 -m json.tool | grep voice

# Check logs
tail -50 logs/*.log | grep -i voice

# Restart bot
pkill -f "python3 main.py" && sleep 2 && python3 main.py &
```

### **High CPU/Memory:**
```bash
# Check resources
top -l 1 | grep python3

# Check health dashboard
open http://localhost:5001/admin

# Clear cache
rm downloads/*.opus

# Restart
pkill -f "python3 main.py" && sleep 2 && python3 main.py &
```

---

## 📱 Quick Access URLs

Save these for easy access:

- **Dashboard:** http://localhost:5001
- **Admin Panel:** http://localhost:5001/admin
- **Bot Status:** http://localhost:5001/api/status
- **Health Check:** http://localhost:5001/api/admin/health

---

**Version:** 3.2.1  
**Last Updated:** December 2, 2025
