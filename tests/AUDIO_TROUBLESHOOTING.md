# 🔊 Audio Troubleshooting Guide

## ✅ FIXED: Opus Library Issue

### Problem
Audio tidak terdengar karena Opus library tidak ter-load.

### Solution Applied
Added automatic Opus library loading in `main.py`:

```python
# Try multiple possible locations
opus_paths = [
    '/opt/homebrew/opt/opus/lib/libopus.dylib',    # Homebrew (Apple Silicon)
    '/opt/homebrew/lib/libopus.dylib',              # Homebrew symlink
    '/usr/local/lib/libopus.dylib',                 # Homebrew (Intel Mac)
    '/usr/lib/libopus.so.0',                        # Linux
    '/usr/lib/x86_64-linux-gnu/libopus.so.0'       # Ubuntu/Debian
]
```

### Current Status
✅ Opus loaded from: `/opt/homebrew/lib/libopus.dylib`

---

## 🎵 How to Test Audio

### 1. Join Voice Channel
Di Discord, join voice channel terlebih dahulu

### 2. Play Song
```
/play faded
```

### 3. Check Bot Joins
Bot seharusnya:
- ✅ Join voice channel
- ✅ Download/cache song
- ✅ Start playing audio
- ✅ Show media player with progress

### 4. If Still No Audio

#### Check Bot Permissions:
```
✅ Connect - Allows bot to join voice
✅ Speak - Allows bot to play audio
✅ Use Voice Activity - For better audio quality
```

#### Check Voice Connection:
```
/health
```
Look for:
- Voice Connections: Should be > 0
- Playing: Should be > 0

#### Check Logs:
```bash
tail -50 logs/*.log | grep -E "(audio|play|opus|ffmpeg)"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Opus library not loaded"
**Solution:**
```bash
# macOS
brew install opus

# Ubuntu/Debian
sudo apt-get install libopus0 libopus-dev

# After install, restart bot
```

### Issue 2: "FFmpeg not found"
**Solution:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

### Issue 3: Bot joins but no audio
**Checklist:**
- ✅ Opus loaded? (Check logs)
- ✅ FFmpeg installed? (`which ffmpeg`)
- ✅ Audio file exists? (`ls downloads/*.opus`)
- ✅ Bot has Speak permission?
- ✅ Voice channel not full?
- ✅ Bot not muted in Discord?

### Issue 4: Audio cuts out / stops randomly
**Possible causes:**
- Network latency too high
- CPU usage too high (>50%)
- Voice region issues

**Solution:**
```
/health  # Check CPU & latency
```

If CPU high:
- Close other applications
- Reduce bot load (fewer guilds)

If latency high (>500ms):
- Change voice region in server settings
- Check internet connection

### Issue 5: "Voice client is not connected"
**Solution:**
```
1. Bot left voice channel
2. Use /stop to disconnect
3. Try /play again
```

---

## 🔧 Manual Opus Test

Test if Opus is properly loaded:

```python
python3 << 'EOF'
import discord
import os

print("Discord.py version:", discord.__version__)
print("Opus loaded:", discord.opus.is_loaded())

if discord.opus.is_loaded():
    print("✅ Opus is working!")
else:
    print("❌ Opus not loaded")
    
    # Try to load
    opus_paths = [
        '/opt/homebrew/lib/libopus.dylib',
        '/usr/local/lib/libopus.dylib',
        '/usr/lib/libopus.so.0'
    ]
    
    for path in opus_paths:
        if os.path.exists(path):
            print(f"Found opus at: {path}")
            try:
                discord.opus.load_opus(path)
                if discord.opus.is_loaded():
                    print(f"✅ Successfully loaded from: {path}")
                    break
            except Exception as e:
                print(f"Failed: {e}")
EOF
```

---

## 📊 Audio Quality Settings

Current settings in `config/settings.py`:

```python
AUDIO_BITRATE = 256        # kbps (128-512)
AUDIO_QUALITY = "high"     # low/medium/high
FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1',
    'options': '-vn'       # No video
}
```

### Adjust for Better Quality:
```python
AUDIO_BITRATE = 384        # Higher quality, more bandwidth
```

### Adjust for Lower Latency:
```python
AUDIO_BITRATE = 128        # Lower quality, less bandwidth
```

---

## 🎛️ FFmpeg Options

### Current Configuration:
```python
ffmpeg_options = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn -b:a 256k'
}
```

### For Streaming Issues:
```python
ffmpeg_options = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 -probesize 10M',
    'options': '-vn -b:a 256k -bufsize 512k'
}
```

---

## 🔍 Debug Commands

### Check System:
```bash
# Opus
python3 -c "import discord; print('Opus:', discord.opus.is_loaded())"

# FFmpeg
ffmpeg -version

# Audio files
ls -lh downloads/*.opus

# Disk space
df -h
```

### Check Bot:
```
/health          # Overall status
/cache           # Check downloaded songs
/activity        # Check if bot is working
```

### Check Logs:
```bash
# Recent errors
tail -50 logs/*.log | grep ERROR

# Audio-related
tail -100 logs/*.log | grep -E "(audio|opus|ffmpeg|play)"

# Voice connections
tail -100 logs/*.log | grep -E "(voice|connect|disconnect)"
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Opus library loaded (`discord.opus.is_loaded() = True`)
- [ ] FFmpeg installed and in PATH
- [ ] Bot has Connect & Speak permissions
- [ ] Bot can join voice channel
- [ ] Audio files exist in downloads/
- [ ] No errors in logs
- [ ] CPU usage normal (<10%)
- [ ] Latency acceptable (<300ms)
- [ ] Can hear audio in Discord

---

## 📞 Still Having Issues?

If audio still not working:

1. **Check Bot Logs:**
   ```bash
   tail -100 logs/*.log
   ```

2. **Test Simple Play:**
   ```
   /play never gonna give you up
   ```

3. **Verify Voice Connection:**
   ```bash
   curl -s http://localhost:5001/api/status | python3 -m json.tool
   ```

4. **Check Discord Status:**
   - Is Discord voice working for others?
   - Is voice region stable?
   - Any Discord outages?

5. **Restart Bot:**
   ```bash
   pkill -f "python3 main.py"
   python3 main.py
   ```

---

## 🎉 Current Status

✅ **Opus Library:** Loaded from `/opt/homebrew/lib/libopus.dylib`  
✅ **FFmpeg:** Version 8.0.1 with libopus support  
✅ **Audio Files:** Present in downloads/  
✅ **Bot:** Running on port 5001  

**You should now be able to hear audio!**

Try: `/play faded` and check if you can hear it.

---

**Updated:** December 2, 2025  
**Status:** ✅ Fixed
