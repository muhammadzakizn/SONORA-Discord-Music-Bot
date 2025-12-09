# Troubleshooting Guide - Discord Music Bot

## Common Issues & Solutions

### 1. "No module named 'cachetools'"
**Error:**
```
ModuleNotFoundError: No module named 'cachetools'
```

**Solution:**
```bash
pip install cachetools
# Or install all dependencies:
pip install -r requirements.txt
```

---

### 2. "spotdl failed with code 2: invalid choice: '256'"
**Error:**
```
spotdl: error: argument --bitrate: invalid choice: '256'
```

**Solution:**
This is already fixed in the code. Spotdl v4+ requires bitrate format like `256k` not `256`.

**Fixed in:** `services/audio/spotify.py`

---

### 3. YouTube DRM Protection Error
**Error:**
```
ERROR: [DRM] The requested site is known to use DRM protection
```

**Solution:**
This is already fixed with:
- `--no-check-certificate` flag
- `--geo-bypass` flag
- Cookie integration

**Fixed in:** `services/audio/youtube.py`

---

### 4. Search Returns Wrong Song
**Issue:** Search returns incorrect or unexpected results

**Solution:** Include artist name in query
```
✓ GOOD: "Faded Alan Walker"
✓ GOOD: "Shape of You Ed Sheeran"
✗ BAD:  "Faded" (could match other songs)
```

---

### 5. Bot Not Responding to Commands
**Issue:** Bot is online but doesn't respond to `/play`

**Checklist:**
1. Check bot has correct permissions:
   - Send Messages
   - Embed Links
   - Connect to Voice
   - Speak
2. Verify slash commands are synced:
   ```
   Check bot logs for: "Synced [N] slash commands"
   ```
3. Try re-inviting bot with correct OAuth URL

---

### 6. Voice Connection Timeout
**Error:**
```
Connection timeout after 15 seconds
```

**Solutions:**
1. Check network connectivity
2. Verify bot has voice permissions
3. Try different voice channel
4. Check if Discord is having issues

---

### 7. Download Takes Too Long
**Issue:** Songs take >30 seconds to download

**Solutions:**
1. Check internet speed
2. Try different audio source (YouTube instead of Spotify)
3. Reduce audio quality in settings:
   ```python
   # config/settings.py
   AUDIO_BITRATE = 192  # Lower from 256
   ```

---

### 8. Cookies Expired
**Issue:** Downloads fail even with cookies

**Solution:** Re-export cookies from browser
1. Login to Spotify/YouTube in browser
2. Use cookie export extension
3. Replace old cookie files:
   - `cookies/spotify_cookies.txt`
   - `cookies/youtube_music_cookies.txt`
   - `cookies/apple_music_cookies.txt`

**Cookie Export Extensions:**
- Chrome: "Get cookies.txt LOCALLY"
- Firefox: "cookies.txt"

---

### 9. "All Sources Failed" Error
**Error:**
```
DownloadError: All sources failed
```

**Debug Steps:**
1. Check logs: `logs/bot.log`
2. Verify credentials in `.env`:
   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   ```
3. Test each source manually:
   ```bash
   spotdl "song name"
   yt-dlp "ytsearch:song name"
   ```

---

### 10. Rate Limited by Discord
**Error:**
```
Rate limited by Discord. Retry after X seconds
```

**Solution:**
Bot automatically handles this with exponential backoff. Just wait a few seconds.

To prevent:
- Don't spam commands
- Wait 2 seconds between commands

---

### 11. FFmpeg Not Found
**Error:**
```
FileNotFoundError: ffmpeg not found
```

**Solution:**
Install FFmpeg:

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH

---

### 12. Volume Not Working
**Issue:** `/volume` command doesn't change volume

**Solutions:**
1. Make sure audio is playing
2. Check if volume command succeeded:
   ```
   Bot should respond with volume bar
   ```
3. Try `/stop` and `/play` again

---

### 13. Playlist Not Loading
**Issue:** Playlist URLs don't work

**Checklist:**
1. Verify URL is public (not private playlist)
2. Check URL format:
   ```
   ✓ https://open.spotify.com/playlist/...
   ✓ https://www.youtube.com/playlist?list=...
   ```
3. Check bot logs for specific error

---

### 14. Memory Issues
**Issue:** Bot uses too much memory

**Solutions:**
1. Clear cache:
   ```bash
   rm -rf cache/*
   rm -rf downloads/*
   ```
2. Reduce queue size in `config/settings.py`:
   ```python
   MAX_QUEUE_SIZE = 50  # Lower from 100
   ```
3. Restart bot periodically

---

### 15. Bot Crashes on Startup
**Error:** Bot exits immediately after starting

**Debug Steps:**
1. Check logs: `logs/errors.log`
2. Verify `.env` file exists and is valid
3. Test configuration:
   ```bash
   python3 -c "from config.settings import Settings; Settings.validate()"
   ```
4. Check Python version:
   ```bash
   python3 --version  # Should be 3.10+
   ```

---

## Log Files

Check these files for detailed error information:

- `logs/bot.log` - Main bot log
- `logs/errors.log` - Error log only
- `logs/audio.log` - Audio operations log

---

## Getting Help

If issue persists:

1. Check logs for detailed error
2. Verify all dependencies installed
3. Test with simple command: `/play test song`
4. Check Discord API status: https://discordstatus.com
5. Verify FFmpeg is installed: `ffmpeg -version`

---

## Quick Fixes Checklist

Before asking for help, try these:

- [ ] Run `pip install -r requirements.txt`
- [ ] Check `.env` file exists with valid credentials
- [ ] Verify cookies are not expired
- [ ] Check FFmpeg is installed: `ffmpeg -version`
- [ ] Review `logs/errors.log` for specific errors
- [ ] Try simple search: `/play shape of you`
- [ ] Restart bot: `Ctrl+C` then `python3 main.py`
- [ ] Check bot has voice permissions in Discord

---

**Version:** 3.1.0  
**Last Updated:** December 2024
