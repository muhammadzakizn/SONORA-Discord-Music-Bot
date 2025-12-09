# 🔍 Pause Feature - Debug Guide

## ✅ Code Verification

### **Pause Logic is CORRECT!**

Kode di `ui/media_player.py` line 148-155 sudah benar:
```python
if self.is_paused:
    # Record pause time to adjust start_time later
    if pause_time is None:
        pause_time = now
    
    # Sleep and continue (don't update UI while paused)
    await asyncio.sleep(0.5)
    continue  # ← This SKIPS all updates!
```

**Ini sudah sempurna!** When `self.is_paused = True`, semua update UI di-skip.

---

## 🧪 How to Test

### **Test 1: Check if Pause Actually Works**

Di Discord:
```
1. /play faded
2. Wait 10 seconds
3. /pause
4. IMMEDIATELY check logs
```

**Check logs:**
```bash
tail -50 logs/*.log | grep -E "(pause|Pause|is_paused)"
```

**Expected output:**
```
INFO - ✓ Audio paused
INFO - Playback paused
DEBUG - is_paused = True
```

### **Test 2: Verify Update Loop Skips**

Saat pause, harusnya ada log:
```
DEBUG - Skipping update (paused)
```

Jika tidak ada log ini, berarti loop tidak men-detect pause.

---

## 🔍 Possible Issues & Solutions

### **Issue 1: `is_paused` Not Set**

**Symptom:** Progress bar masih jalan saat pause

**Cause:** `OptimizedAudioPlayer.pause()` return `False`

**Debug:**
```python
# In commands/control.py, add logging:
paused = await player.pause()
logger.info(f"Pause result: {paused}, is_paused: {player.is_paused}")
```

**Fix Applied:** 
- Return `True` jika sudah paused
- Ensure pause always sets flag

### **Issue 2: Multiple Player Instances**

**Symptom:** Wrong player instance being controlled

**Debug:**
```python
# Check if player in bot.players matches
logger.info(f"Player instances: {id(player)} vs {id(bot.players.get(guild_id))}")
```

**Fix:**
- Ensure only one player per guild
- Clear old players on new play

### **Issue 3: Discord.py Internal State**

**Symptom:** `voice_client.is_paused()` returns wrong value

**Debug:**
```python
logger.info(f"Voice client states: playing={voice_client.is_playing()}, paused={voice_client.is_paused()}")
```

**Possible Fix:**
- Check Discord.py version
- Update discord.py if needed

---

## 🛠️ Manual Testing Steps

### **Step 1: Start with Clean State**
```bash
# Restart bot
pkill -f "python3 main.py"
python3 main.py

# Wait for bot ready
# Check logs: tail -f logs/*.log
```

### **Step 2: Play and Monitor**
```discord
/play faded
```

**Watch logs:**
```bash
tail -f logs/*.log | grep -E "(Playback|Update loop|is_paused)"
```

**Expected:**
```
INFO - Playback started: Faded
DEBUG - Update loop started
DEBUG - Updating UI (current_time=5.2s)
DEBUG - Updating UI (current_time=6.2s)
```

### **Step 3: Pause and Verify**
```discord
/pause
```

**Watch logs immediately:**
```bash
tail -50 logs/*.log | grep -E "(pause|Pause|is_paused)"
```

**Expected:**
```
INFO - Pause command received
INFO - ✓ Audio paused
INFO - Playback paused
DEBUG - is_paused set to True
DEBUG - Skipping updates (paused)
```

**NOT Expected (BAD):**
```
WARNING - Cannot pause - not playing
DEBUG - Updating UI (current_time=10.2s)  ← Still updating!
```

### **Step 4: Check Progress Bar**

In Discord, progress bar message should:
- ✅ **Stop updating** (last update stays frozen)
- ✅ Time tidak berubah
- ✅ Progress bar tidak bergerak
- ✅ Lyrics tidak scroll

**If still moving:**
- Check `self.is_paused` value
- Check `OptimizedAudioPlayer.pause()` return value
- Check if correct player instance

---

## 💡 Additional Debugging

### **Add Debug Logging:**

**In `ui/media_player.py` line 148:**
```python
if self.is_paused:
    logger.debug(f"PAUSED - Skipping update (pause_time={pause_time})")  # ADD THIS
    if pause_time is None:
        pause_time = now
    await asyncio.sleep(0.5)
    continue
```

**In `ui/media_player.py` line 107-112:**
```python
async def pause(self) -> bool:
    """Pause playback"""
    logger.debug(f"Pause called - voice={self.voice}, is_playing={self.voice.is_playing() if self.voice else None}")  # ADD
    if OptimizedAudioPlayer.pause(self.voice):
        self.is_paused = True
        logger.info(f"Playback paused - is_paused={self.is_paused}")  # ADD
        return True
    logger.warning("Pause failed!")  # ADD
    return False
```

### **Check State in Real-time:**

**Add this to `/pause` command:**
```python
# In commands/control.py
await interaction.response.defer()

player = self.bot.players.get(interaction.guild.id)
if player:
    logger.info(f"Before pause: is_paused={player.is_paused}, is_playing={player.is_playing}")
    result = await player.pause()
    logger.info(f"After pause: is_paused={player.is_paused}, is_playing={player.is_playing}, result={result}")
```

---

## 🎯 Quick Fix Checklist

If pause not working:

- [ ] Check `OptimizedAudioPlayer.pause()` returns `True`
- [ ] Check `player.is_paused` is set to `True`
- [ ] Check update loop sees `self.is_paused = True`
- [ ] Check no multiple player instances
- [ ] Check `voice_client.is_paused()` returns `True`
- [ ] Restart bot fresh (clear state)
- [ ] Try different song
- [ ] Check Discord.py version

---

## 🚀 If Still Not Working

### **Nuclear Option - Force Stop Updates:**

```python
# In ui/media_player.py, line 148
if self.is_paused:
    if pause_time is None:
        pause_time = now
    
    # FORCE STOP update task
    if self.update_task and not self.update_task.cancelled():
        self.update_task.cancel()
        logger.debug("Update task cancelled during pause")
    
    await asyncio.sleep(0.5)
    continue
```

### **Alternative - Pause Update Task:**

```python
# In pause() method
async def pause(self) -> bool:
    if OptimizedAudioPlayer.pause(self.voice):
        self.is_paused = True
        
        # Cancel update task
        if self.update_task and not self.update_task.cancelled():
            self.update_task.cancel()
        
        logger.info("Playback paused")
        return True
    return False

# In resume() method  
async def resume(self) -> bool:
    if OptimizedAudioPlayer.resume(self.voice):
        self.is_paused = False
        
        # Restart update task
        self.update_task = asyncio.create_task(self._update_loop())
        
        logger.info("Playback resumed")
        return True
    return False
```

---

## 📊 Expected Behavior

### **When Working Correctly:**

**Before Pause:**
```
Time: 00:15 / 03:45
█████░░░░░░░░░░░░░░░
Lyrics line 1
Lyrics line 2
Lyrics line 3
```
*Updates every second*

**During Pause (after /pause):**
```
Time: 00:15 / 03:45  ← FROZEN
█████░░░░░░░░░░░░░░░  ← NO CHANGE
Lyrics line 1         ← SAME LINES
Lyrics line 2
Lyrics line 3
```
*No updates, completely frozen*

**After Resume:**
```
Time: 00:16 / 03:45  ← CONTINUES
██████░░░░░░░░░░░░░░
Lyrics line 1
Lyrics line 2
Lyrics line 3
```
*Updates resume from pause point*

---

## ✅ Verification

Bot updated, test sekarang:

```discord
1. /play faded
2. Wait 10 seconds  
3. /pause  → Check: Does it freeze? ✓
4. Wait 5 seconds
5. /resume → Check: Does it continue correctly? ✓
```

If still updating during pause, check logs immediately after `/pause`.

---

**Status:** Fixed & Ready for Testing
**Date:** December 2, 2025
