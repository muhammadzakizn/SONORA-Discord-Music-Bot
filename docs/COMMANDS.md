# Commands Reference - Discord Music Bot v3.0

Complete reference for all available bot commands.

---

## Music Playback

### `/play <url or query>`
Play music from various sources.

**Supported Sources:**
- **Spotify**: Tracks, albums, playlists
- **YouTube**: Videos, playlists
- **YouTube Music**: Tracks, playlists
- **Apple Music**: Tracks, albums, playlists (beta)
- **Search**: Any search query

**Examples:**
```
/play never gonna give you up
/play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
/play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
/play https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3
/play https://www.youtube.com/watch?v=dQw4w9WgXcQ
/play https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
/play https://music.youtube.com/watch?v=dQw4w9WgXcQ
/play https://music.apple.com/us/album/album-name/123456
```

**Features:**
- Automatic source fallback (Spotify → YouTube → Direct)
- Parallel downloading (audio, artwork, lyrics)
- High-quality audio (256-320kbps Opus)
- Synced lyrics display
- Playlist/album support (up to 50 tracks)

---

## Playback Controls

### `/pause`
Pause current playback.

**Usage:**
```
/pause
```

**Requirements:**
- Bot must be playing audio
- User must be in same voice channel

---

### `/resume`
Resume paused playback.

**Usage:**
```
/resume
```

**Requirements:**
- Playback must be paused
- User must be in same voice channel

---

### `/stop`
Stop playback and disconnect from voice channel.

**Usage:**
```
/stop
```

**Effects:**
- Stops current track
- Clears queue
- Disconnects from voice

---

### `/skip`
Skip current track and play next in queue.

**Usage:**
```
/skip
```

**Requirements:**
- Bot must be playing audio
- Queue must have tracks (or it will stop)

---

## Volume Control

### `/volume <level>`
Set playback volume.

**Parameters:**
- `level`: Volume percentage (0-200)
  - 0 = Muted
  - 100 = Normal (default)
  - 200 = Maximum (2x boost)

**Usage:**
```
/volume 50     # Set to 50%
/volume 100    # Set to 100% (normal)
/volume 150    # Set to 150% (boost)
```

**Features:**
- Visual volume bar display
- Volume emoji indicator (🔇🔉🔊)
- Per-guild volume settings
- Real-time volume adjustment (no restart needed)

---

### `/volume-up`
Increase volume by 10%.

**Usage:**
```
/volume-up
```

**Example:**
- Current: 70% → After command: 80%
- Maximum: 200%

---

### `/volume-down`
Decrease volume by 10%.

**Usage:**
```
/volume-down
```

**Example:**
- Current: 70% → After command: 60%
- Minimum: 0%

---

## Queue Management

### `/queue`
Show current queue.

**Usage:**
```
/queue
```

**Display:**
- Currently playing track
- Up to 10 upcoming tracks
- Total queue length
- Track durations

---

### `/clear`
Clear all tracks from queue.

**Usage:**
```
/clear
```

**Effects:**
- Removes all queued tracks
- Current track continues playing
- Queue counter resets to 0

---

## Command Permissions

All commands require:
- User must be in a voice channel (for playback commands)
- Bot must have voice permissions:
  - Connect
  - Speak
  - Use Voice Activity
- Bot must have text permissions:
  - Send Messages
  - Embed Links
  - Attach Files (for artwork)

---

## Command Tips

### Playing Playlists
When you use `/play` with a playlist URL:
1. Bot fetches all tracks (max 50)
2. Adds tracks to queue
3. Plays first track immediately
4. Shows confirmation with track count

### Volume Settings
- Volume is saved per guild (server)
- Default volume: 100%
- Volume persists until bot restart
- Set volume before playing for immediate effect

### Queue Behavior
- Queue is first-in-first-out (FIFO)
- Skip moves to next track automatically
- Stop clears entire queue
- Playlists add multiple tracks at once

### Error Handling
If a command fails:
1. Check error message for details
2. Verify bot has required permissions
3. Try alternative source (e.g., YouTube if Spotify fails)
4. Check `logs/bot.log` for detailed errors

---

## Keyboard Shortcuts (Future)

Coming in future versions:
- Reaction buttons for controls
- Interactive queue management
- Vote skip
- Loop/repeat modes

---

## Advanced Usage

### Mixing Sources
You can mix tracks from different sources:
```
/play https://open.spotify.com/track/...    # Spotify track
/play https://www.youtube.com/watch?v=...   # YouTube video
/play artist - song name                     # Search query
```

### Large Playlists
For playlists with >50 tracks:
- Only first 50 tracks are added
- Use multiple `/play` commands for more
- Or split playlist into smaller ones

### Quality Priority
Audio quality preference:
1. Spotify (spotdl) - 320kbps
2. YouTube Music (yt-dlp) - 256kbps
3. YouTube (yt-dlp) - 192-256kbps

---

## Troubleshooting

### "Not in Voice Channel" Error
**Solution:** Join a voice channel first, then run command

### "Bot Already Connected" Error
**Solution:** Use `/stop` to disconnect, then try again

### "Download Failed" Error
**Solutions:**
1. Try different source (YouTube vs Spotify)
2. Check if URL is valid and public
3. Verify bot has internet access

### "Rate Limited" Error
**Solution:** Wait a few seconds and try again (automatic retry)

### Volume Not Changing
**Solution:** 
1. Check if audio is playing
2. Use `/volume` to verify current level
3. Try `/stop` and `/play` again

---

## Command Aliases (Future)

Coming soon:
- `/p` → `/play`
- `/n` → `/skip`
- `/v` → `/volume`
- `/q` → `/queue`

---

## API Rate Limits

To avoid rate limits:
- Don't spam commands (<2 seconds between commands)
- Avoid large playlists in quick succession
- Bot automatically handles Discord rate limits

---

**For more information, see:**
- [README.md](../README.md) - General documentation
- [QUICK_START.md](QUICK_START.md) - Setup guide
- [API.md](API.md) - Developer reference

---

**Version**: 3.0  
**Last Updated**: December 2024
