# 🎯 FIFO Queue System with Smart VC Management

## 📖 Overview

Sistem queue **FIFO (First In First Out)** yang cerdas dengan:
- ✅ **Global queue** - Urutan berdasarkan waktu request
- ✅ **Empty VC skip** - Otomatis skip lagu dari VC kosong
- ✅ **Real-time check** - Cek apakah ada user di VC sebelum play
- ✅ **Auto-move** - Bot pindah ke VC yang tepat
- ✅ **Smart skip** - Skip semua lagu dari VC kosong

---

## 🎯 How It Works

### FIFO Logic (First In First Out):

```
Queue Global (urutan request):
1. Song A (Voice "HALO") ← Request pertama
2. Song B (Voice "HAI")  ← Request kedua
3. Song C (Voice "HALO") ← Request ketiga

Bot plays in order: A → B → C
```

**Tidak peduli dari VC mana**, yang pertama request yang pertama play!

---

## 🔄 Complete Scenario

### Setup:
```
Voice "HALO": User1, User2 (2 orang)
Voice "HAI": User3 (1 orang)

Queue:
1. Song A (Voice "HALO") - User1 request
2. Song B (Voice "HAI")  - User3 request
3. Song C (Voice "HALO") - User1 request
```

### Step-by-Step:

#### **Step 1: Play Song A**
```
✓ Song A dari Voice "HALO"
✓ Check: Voice "HALO" ada user? YES (2 orang)
✓ Bot play Song A di Voice "HALO"
```

**Logs:**
```
[INFO] Auto-playing next from queue: Song A
[INFO] ✓ Voice channel 'HALO' has 2 user(s)
[INFO] Bot already in correct channel: HALO
[INFO] ✓ Now playing: Song A
```

---

#### **Step 2: Song A selesai → Play Song B**
```
✓ Song B dari Voice "HAI"
✓ Check: Voice "HAI" ada user? YES (1 orang)
✓ Bot pindah ke Voice "HAI"
✓ Bot play Song B di Voice "HAI"
```

**Logs:**
```
[INFO] Auto-playing next from queue: Song B
[INFO] ✓ Voice channel 'HAI' has 1 user(s)
[INFO] 🔄 Moving bot from HALO to HAI
[INFO] ✓ Moved to HAI
[INFO] ✓ Now playing: Song B
```

---

#### **Step 3: Semua user keluar dari Voice "HALO" (saat Song B masih playing)**
```
✓ User1 keluar dari "HALO"
✓ User2 keluar dari "HALO"
✓ Voice "HALO" sekarang KOSONG

Bot detects:
[INFO] 🚶 All users left voice channel - Bot is now alone
[INFO] ✓ Found 1 tracks from other voice channels
[INFO] ⏭️ Skipping current track to move to other voice channel
```

**Action:**
```
✓ Bot skip Song B langsung!
✓ Trigger next track callback
✓ Check Song C dari Voice "HALO"
✓ Real-time check: Voice "HALO" ada user? NO (kosong)
✓ Skip Song C!
✓ Try next track in queue
```

**Logs:**
```
[INFO] ✓ Skipped - Bot will move to other voice channel
[INFO] Auto-playing next from queue: Song C
[INFO] ⏭️ Skipping: Voice channel 'HALO' is empty (no users)
[INFO] Track Skipped: Song C - Reason: Voice channel 'HALO' is empty
```

---

#### **Step 4: Voice "HAI" juga kosong**
```
✓ User3 keluar dari "HAI"
✓ Voice "HAI" sekarang KOSONG

Bot detects:
[INFO] 🚶 All users left - Bot is now alone
[INFO] No tracks from other voice channels
```

**Action:**
```
✓ Bot stays in Voice "HAI" (no queue)
✓ Or skip to next track if any
```

---

#### **Step 5: User baru masuk Voice "HALO"**
```
✓ User4 masuk ke Voice "HALO"
✓ Ada lagu di queue dari "HALO"? (Song D - request lama)

Next track processing:
[INFO] Auto-playing next from queue: Song D
[INFO] ✓ Voice channel 'HALO' has 1 user(s) ← Real-time check!
[INFO] 🔄 Moving bot to HALO
[INFO] ✓ Now playing: Song D
```

---

## 🎯 Key Features

### 1. **FIFO (First In First Out)**
```
Request order = Play order
Song A (10:00) → Song B (10:01) → Song C (10:02)

Play order: A → B → C (regardless of VC)
```

### 2. **Real-Time VC Check**
```python
# Before playing each song
human_members = [m for m in vc.members if not m.bot]

if len(human_members) == 0:
    # VC is EMPTY - SKIP!
    logger.info("Skipping: VC is empty")
    return await _play_next_from_queue()  # Try next
```

### 3. **Recursive Skip**
```python
# Skip empty VC → Check next track
# If next also empty → Skip again
# Continue until find VC with users
```

### 4. **Smart Move on Empty VC**
```python
# User leaves → Bot alone in VC
if len(members) == 0 and has_other_vc_queue:
    connection.stop()  # Skip current
    # Next track callback → Check VC → Move if needed
```

---

## 📊 Complete Example

### Setup:
```
Time  | Action                  | Queue Status
------|-------------------------|---------------------------
10:00 | User1 /play Song A (VC1)| [A(VC1)]
10:01 | User2 /play Song B (VC2)| [A(VC1), B(VC2)]
10:02 | User1 /play Song C (VC1)| [A(VC1), B(VC2), C(VC1)]
10:03 | User3 /play Song D (VC3)| [A(VC1), B(VC2), C(VC1), D(VC3)]
```

### Playback Sequence:

**10:04 - Play Song A:**
```
✓ Check VC1: Has users? YES
✓ Play in VC1
```

**10:07 - Song A ends, play Song B:**
```
✓ Check VC2: Has users? YES
✓ Move to VC2
✓ Play in VC2
```

**10:08 - All users leave VC1:**
```
✓ Detect: VC1 is empty
✓ Skip current Song B
✓ Check Song C: From VC1
✓ Check VC1: Has users? NO (empty)
✓ Skip Song C
✓ Check Song D: From VC3
✓ Check VC3: Has users? YES
✓ Move to VC3
✓ Play Song D
```

---

## 🔍 Smart Detection Logic

### When to Skip:

```python
# Skip if ANY of these true:
1. Voice channel is empty (no human users)
2. Voice channel was deleted
3. Guild not found
```

### When to Play:

```python
# Play if ALL of these true:
1. Voice channel exists
2. Voice channel has at least 1 human user
3. Bot can connect to voice channel
```

---

## 📝 Expected Logs

### Scenario 1: Normal FIFO Playback
```
[INFO] Auto-playing next from queue: Song A
[INFO] ✓ Voice channel 'Music Lounge' has 2 user(s)
[INFO] ✓ Now playing: Song A

[INFO] Auto-playing next from queue: Song B
[INFO] ✓ Voice channel 'Chill Zone' has 1 user(s)
[INFO] 🔄 Moving bot from Music Lounge to Chill Zone
[INFO] ✓ Now playing: Song B
```

### Scenario 2: Empty VC Skip
```
[INFO] Auto-playing next from queue: Song C
[INFO] ⏭️ Skipping: Voice channel 'Music Lounge' is empty (no users)
[INFO] Track Skipped: Song C

[INFO] Auto-playing next from queue: Song D
[INFO] ✓ Voice channel 'Chill Zone' has 1 user(s)
[INFO] ✓ Now playing: Song D
```

### Scenario 3: All Users Leave During Playback
```
[INFO] User UserA left bot's voice channel: Music Lounge
[INFO] User UserB left bot's voice channel: Music Lounge
[INFO] 🚶 All users left - Bot is now alone
[INFO] ✓ Found 2 tracks from other voice channels
[INFO] ⏭️ Skipping current track to move to other VC
[INFO] ✓ Skipped - Bot will move to other VC

[INFO] Auto-playing next from queue: Song E
[INFO] ✓ Voice channel 'Game Room' has 3 user(s)
[INFO] 🔄 Moving bot from Music Lounge to Game Room
[INFO] ✓ Now playing: Song E
```

---

## 🎮 User Experience

### Before This System:
```
❌ Queue stuck in empty VC
❌ Songs play to empty rooms
❌ Users wait forever for their song
❌ Manual intervention needed
```

### After This System:
```
✅ FIFO - Fair queue system
✅ Auto-skip empty VCs
✅ Real-time user detection
✅ Bot serves all active VCs
✅ No wasted playback
✅ Fully automatic
```

---

## 🔧 Configuration

### FIFO Order:
- Based on `/play` command time
- First request = First play
- No priority system (all equal)

### Empty VC Detection:
- Real-time check before each song
- Counts human users only (bots excluded)
- Recursive skip if multiple VCs empty

### Move Logic:
- Bot moves between VCs as needed
- 1 second stabilization delay
- Notification sent to old VC

---

## 💡 Pro Tips

### Tip 1: Fair Queue
```
Everyone's request is equal
First come, first served!
```

### Tip 2: Don't Leave VC
```
If you leave VC, your songs might be skipped
Stay in VC to hear your music!
```

### Tip 3: Check Queue
```
/queue - See all upcoming songs
Your song will play in FIFO order
```

### Tip 4: Multiple Songs
```
Add multiple songs at once
They'll all be queued in order
```

---

## 📊 Benefits

### For Users:
- ✅ Fair system (FIFO)
- ✅ Songs don't play to empty rooms
- ✅ Bot automatically comes to you
- ✅ No waiting in empty queue

### For Server:
- ✅ Efficient bot usage
- ✅ Serves all active VCs
- ✅ Auto-cleanup of empty VCs
- ✅ Smart resource management

---

## 🎯 Summary

### What It Does:
1. **FIFO Queue** - First request = First play
2. **Empty VC Skip** - Skip songs from empty VCs
3. **Real-time Check** - Check VC status before play
4. **Auto-move** - Bot moves to correct VC
5. **Smart Detection** - Detects when all users leave

### How It Works:
```
Request → Queue (FIFO)
  ↓
Next track
  ↓
Check VC: Has users?
  ↓ YES              ↓ NO
Play                Skip → Try next
  ↓
Move if needed
  ↓
Play track
```

### Result:
✅ **Perfect FIFO system with smart VC management!**

---

**Version:** 2.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready

Made with ❤️ for fair music sharing!
