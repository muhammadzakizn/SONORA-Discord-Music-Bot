# 🔄 Auto-Move to Other Voice Channel Feature

## 📖 Overview

Bot akan **otomatis pindah ke voice channel lain** ketika semua user keluar dari voice channel saat ini, dan ada queue dari voice channel lain yang menunggu.

---

## 🎯 How It Works

### Scenario:

```
Voice Channel 1 (Music Lounge):
- User A, User B, User C
- Bot is playing Song X
- Queue: Song Y (from VC1)

Voice Channel 2 (Chill Zone):
- User D
- Queue: Song Z (from VC2)
```

### When All Users Leave VC1:

```
1. User A leaves → Bot continues playing
2. User B leaves → Bot continues playing
3. User C leaves → Bot is now ALONE

   ↓ Bot checks queue

4. Found tracks from VC2 (User D)
5. Bot skips current song
6. Bot moves to VC2
7. Bot plays Song Z for User D
```

---

## ✨ Features

### 1. **Smart Detection**
- Detects when bot is alone (no human users)
- Checks if there are tracks from other voice channels
- Only moves if there's queue in other VC

### 2. **Automatic Skip**
- Skips current track when everyone leaves
- Triggers next track callback
- `_play_next_from_queue()` handles the move

### 3. **Voice Channel Priority**
- Respects voice_channel_id on each track
- Moves to VC where next track belongs
- No manual intervention needed

---

## 🔧 Implementation

### Code Location: `core/bot.py`

```python
# When user leaves
if len(members_in_channel) == 0:
    logger.info("All users left - Bot is alone")
    
    # Check queue for other VC tracks
    other_vc_tracks = [
        item for item in queue 
        if item.voice_channel_id != current_vc_id
    ]
    
    if other_vc_tracks:
        # Skip current track
        connection.stop()
        # Next track callback → moves to other VC
```

### Auto-Move Logic: `ui/media_player.py`

```python
async def _play_next_from_queue():
    next_item = queue.get_next()
    target_vc_id = next_item.voice_channel_id
    
    # Bot needs to move?
    if current_vc_id != target_vc_id:
        logger.info(f"Moving to {target_vc_name}")
        await connection.disconnect()
        await connection.connect(target_vc)
        # Play next track in new VC
```

---

## 📊 Examples

### Example 1: Simple Move

**Setup:**
```
VC1: User A (playing Song A)
VC2: User B (queue: Song B)
```

**Action:**
```
User A leaves VC1 → Bot alone
Bot checks queue → Found Song B (VC2)
Bot skips Song A → Moves to VC2 → Plays Song B
```

**Logs:**
```
[INFO] User A left bot's voice channel: VC1
[INFO] 🚶 All users left - Bot is now alone
[INFO] ✓ Found 1 tracks from other voice channels
[INFO] ⏭️ Skipping current track to move to other VC
[INFO] ✓ Skipped - Bot will move to other VC
[INFO] 🔄 Moving bot from VC1 to VC2
[INFO] ✓ Moved to VC2
[INFO] Auto-playing next from queue: Song B
[INFO] ✓ Now playing: Song B
```

---

### Example 2: Multiple VCs

**Setup:**
```
VC1: User A, User B (playing Song 1)
     Queue: Song 2 (VC1)
VC2: User C
     Queue: Song 3 (VC2)
VC3: User D
     Queue: Song 4 (VC3)
```

**Sequence:**
```
1. Song 1 finishes → Song 2 plays (stays in VC1)
2. User A leaves → Bot continues
3. User B leaves → Bot alone in VC1
   → Checks queue
   → Found Song 3 (VC2), Song 4 (VC3)
   → Skips Song 2
   → Moves to VC2
   → Plays Song 3
4. User C leaves → Bot alone in VC2
   → Found Song 4 (VC3)
   → Moves to VC3
   → Plays Song 4
```

---

### Example 3: No Other VCs (Stay)

**Setup:**
```
VC1: User A (playing Song A)
     Queue: Song B (VC1), Song C (VC1)
```

**Action:**
```
User A leaves → Bot alone
Bot checks queue → All songs from VC1
No other VCs → Bot stays in VC1
Continues playing Song A → Then Song B → Then Song C
```

**Logs:**
```
[INFO] User A left bot's voice channel: VC1
[INFO] 🚶 All users left - Bot is now alone
[INFO] No tracks from other voice channels - staying here
```

---

## 🎮 User Experience

### Before This Feature:
```
VC1: Everyone leaves
Bot: Continues playing to empty room
VC2: User waiting for their song
Result: ❌ Bot stuck in empty VC, user's song never plays
```

### After This Feature:
```
VC1: Everyone leaves
Bot: "Oh, empty room! Let me check other VCs..."
VC2: User waiting for their song
Bot: "Found it! Moving to VC2..."
Result: ✅ Bot automatically serves all users!
```

---

## ⚙️ Configuration

### When Bot Moves:
- ✅ All users left current VC (bot alone)
- ✅ Bot is currently playing
- ✅ Queue has tracks from other VCs

### When Bot Stays:
- ❌ Still has users in current VC
- ❌ Bot not playing
- ❌ No queue from other VCs
- ❌ All queue tracks from current VC

---

## 🔍 Troubleshooting

### Bot doesn't move to other VC:

**Check 1: Is bot alone?**
```
Only bot should be in VC (no human users)
```

**Check 2: Is bot playing?**
```
Bot must be actively playing (not idle)
```

**Check 3: Queue has other VC tracks?**
```
/queue (in other VC) - Should show queued songs
```

**Check 4: Tracks have voice_channel_id?**
```
Tracks must be tagged with voice_channel_id
(Automatically set when using /play)
```

---

## 📝 Logs to Watch

### Successful Move:
```
[INFO] User left bot's voice channel: Music Lounge
[INFO] 🚶 All users left - Bot is now alone
[INFO] ✓ Found 2 tracks from other voice channels
[INFO] ⏭️ Skipping current track to move to other VC
[INFO] ✓ Skipped - Bot will move to other VC
[INFO] 🔄 Moving bot from Music Lounge to Chill Zone
[INFO] ✓ Moved to Chill Zone
[INFO] Auto-playing next from queue: Song Title
```

### Staying in Current VC:
```
[INFO] User left bot's voice channel: Music Lounge
[INFO] 🚶 All users left - Bot is now alone
[INFO] No tracks from other voice channels - staying here
```

---

## 🎯 Benefits

### For Users:
- ✅ Don't need to wait for bot
- ✅ Bot automatically comes to you
- ✅ Fair queue system across VCs
- ✅ No manual intervention needed

### For Server:
- ✅ Efficient bot usage
- ✅ Serves all VCs fairly
- ✅ No bot stuck in empty VCs
- ✅ Better resource utilization

---

## 🚀 Status

**Implementation:** ✅ Complete
**Testing:** ✅ Ready
**Documentation:** ✅ Complete
**Status:** ✅ **PRODUCTION READY**

---

## 💡 Pro Tips

### Tip 1: Queue Management
```
Use /queue to see where your song is
Bot will come to your VC when it's your turn!
```

### Tip 2: Priority
```
First come, first served (by /play time)
Bot serves all VCs in queue order
```

### Tip 3: Solo Listening
```
If you're alone and want bot to stay:
Keep adding songs with /play
Bot won't leave if you have queue!
```

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Weighted priority (more users = higher priority)
- [ ] VC-specific bot assignment
- [ ] User vote to keep bot in current VC
- [ ] Configurable "alone timeout" before move

---

## 📖 Summary

### What It Does:
Bot automatically moves to other voice channels when:
1. All users leave current VC
2. Other VCs have queued songs
3. Bot is actively playing

### How It Works:
1. Detect when bot is alone
2. Check queue for other VC tracks
3. Skip current track
4. Trigger move in next track callback
5. Play in new VC

### Result:
✅ Bot efficiently serves all users across all VCs!

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready

Made with ❤️ for multi-VC music lovers!
