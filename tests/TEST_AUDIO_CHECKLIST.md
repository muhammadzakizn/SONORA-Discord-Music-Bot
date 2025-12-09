# ✅ Audio Test Checklist

## 🎯 Current Status

✅ **Opus Library:** Loaded from `/opt/homebrew/lib/libopus.dylib`  
✅ **FFmpeg:** Version 8.0.1 with libopus support  
✅ **Bot:** Running and connected  
✅ **Web Dashboard:** http://localhost:5001  
✅ **Admin Panel:** http://localhost:5001/admin  

---

## 🧪 Step-by-Step Audio Test

### **Step 1: Verify Bot is Ready**
Check logs for:
```
✓ Opus loaded from: /opt/homebrew/lib/libopus.dylib
✓ Database connected and tables initialized
✓ Commands loaded successfully
Bot is ready! Logged in as YourBot#1234
```

✅ **Status:** Bot should be online in Discord

---

### **Step 2: Join Voice Channel**
In Discord:
1. Join any voice channel in your server
2. Bot should be able to see you in the channel

---

### **Step 3: Test Play Command**
```
/play faded
```

**Expected behavior:**
1. ✅ Bot joins your voice channel
2. ✅ Downloads/caches "Faded" by Alan Walker
3. ✅ Starts playing audio
4. ✅ Shows media player with:
   - Track title & artist
   - Progress bar
   - Playback controls
   - Lyrics (if available)

**If you hear audio:** 🎉 **SUCCESS! Audio is working!**

---

### **Step 4: Test Controls**
While playing, test:
```
/pause          → Should pause
/resume         → Should resume
/volume 150     → Should get louder
/volume 50      → Should get quieter
/skip           → Should skip to next (if in queue)
/stop           → Should stop and disconnect
```

---

### **Step 5: Check Bot Permissions**
Ensure bot has these permissions in Discord:
- ✅ **Connect** - Join voice channels
- ✅ **Speak** - Play audio
- ✅ **Use Voice Activity** - Better quality
- ✅ **Send Messages** - Show media player
- ✅ **Embed Links** - Rich embeds

---

## 🔍 Troubleshooting

### If No Audio:

#### **1. Check if Bot Joined Voice**
- Bot should appear in voice channel members
- If not joining: Check "Connect" permission

#### **2. Check if Bot is Muted**
- Right-click bot in voice channel
- Ensure "Mute" is OFF
- Ensure "Server Mute" is OFF

#### **3. Check Your Discord Audio Settings**
- User Settings → Voice & Video
- Test your audio device
- Check input/output devices

#### **4. Check Bot Logs**
```bash
tail -50 /Users/muham/Documents/"SONORA - Discord Audio Bot"/SONORA7.2.0/logs/*.log
```

Look for errors like:
- "Voice client is not connected"
- "Failed to play audio"
- "FFmpeg error"

#### **5. Verify Opus is Loaded**
```bash
python3 -c "import sys; sys.path.insert(0, '/Users/muham/Documents/SONORA - Discord Audio Bot/SONORA7.2.0'); import discord; print('Opus loaded:', discord.opus.is_loaded())"
```

Should return: `Opus loaded: True`

---

## 📊 Monitor from Web Dashboard

### **User Dashboard** (http://localhost:5001)
- View guilds
- See current playing track
- View play history
- Control playback

### **Admin Panel** (http://localhost:5001/admin)
- Monitor bot health
- Check voice connections
- View cache status
- See activity stats

---

## 🎵 Test Playlist

Try these songs to test different sources:

```
/play faded                                    → YouTube/Spotify
/play never gonna give you up                  → YouTube
/play https://open.spotify.com/track/...       → Spotify direct
/play shape of you                             → Popular song
```

---

## 📈 Success Indicators

You'll know audio is working when:

✅ Bot joins voice channel  
✅ You see "Now Playing" message with media player  
✅ Progress bar updates in real-time  
✅ **You can HEAR the audio** 🔊  
✅ Controls (/pause, /resume, /skip) work  
✅ Volume changes are audible  

---

## 🎉 What to Do Next

Once audio is confirmed working:

### **1. Play More Songs**
```
/play [song name]
/queue              → See queue
/skip               → Next song
```

### **2. Check Statistics**
```
/stats              → Your listening stats
/history 10         → Recent 10 tracks
/top 7              → Top tracks this week
```

### **3. Admin Features**
```
/health             → Bot health
/activity           → Usage stats
/cache              → Cache status
/topusers           → Most active users
```

### **4. Web Dashboard**
- Visit http://localhost:5001
- Click on guild to see details
- Control playback from web
- View real-time statistics

### **5. Admin Panel**
- Visit http://localhost:5001/admin
- Monitor bot health
- View activity analytics
- Manage cache

---

## 🔧 If Still Having Issues

### **Common Fixes:**

**1. Restart Bot**
```bash
pkill -f "python3 main.py"
cd /Users/muham/Documents/"SONORA - Discord Audio Bot"/SONORA7.2.0
python3 main.py
```

**2. Reinstall Opus**
```bash
brew reinstall opus
```

**3. Check FFmpeg**
```bash
ffmpeg -version
# Should show libopus in configuration
```

**4. Verify Audio Files**
```bash
ls -lh downloads/*.opus
# Should show .opus files
```

**5. Test Manually**
```bash
ffplay downloads/"Alan Walker - Faded.opus"
# Should play audio in terminal
```

---

## 📞 Debug Commands

If audio still not working, run these:

```bash
# Check bot is running
ps aux | grep "python3 main.py"

# Check opus
python3 -c "import discord; discord.opus.load_opus('/opt/homebrew/lib/libopus.dylib'); print('Opus:', discord.opus.is_loaded())"

# Check logs
tail -100 logs/*.log | grep -E "(error|Error|ERROR|audio|opus)"

# Check voice connections
curl -s http://localhost:5001/api/status | python3 -m json.tool

# Check health
curl -s http://localhost:5001/api/admin/health | python3 -m json.tool
```

---

## ✅ Final Verification

```
Test: /play faded
Expected: Hear "Faded" by Alan Walker in voice channel
Result: __________

If you can hear it: 🎉 AUDIO IS WORKING!
If not: See troubleshooting above or check logs
```

---

**Updated:** December 2, 2025  
**Status:** Ready for Testing  
**Next:** Join voice channel and `/play faded`

🎵 **Good luck! You should be able to hear audio now!** 🎵
