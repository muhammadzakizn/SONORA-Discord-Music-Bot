# 🧪 Beta Version Separation Plan

## Problem
1. Beta crashes - trying to copy attributes that don't exist
2. YouTube Music changes applied to stable (should be beta only)

## Solution

### Fix 1: Beta Initialization ✅
**Problem**: `stable_bot.players` doesn't exist

**Solution**: Initialize components directly in beta
```python
# OLD (BROKEN):
stable_bot = MusicBot()
self.players = stable_bot.players  # AttributeError!

# NEW (FIXED):
from services.voice.manager import VoiceManager
self.voice_manager = VoiceManager(self)
self.players = {}  # Direct initialization
```

### Fix 2: Beta-Only YouTube Music
**Files to separate**:
- `services/audio/youtube.py` → Keep stable version
- `beta-version/services/audio/youtube_beta.py` → New YouTube Music version

**Workflow**:
```
Stable Version:
  services/audio/youtube.py (original, unchanged)

Beta Version:
  beta-version/services/audio/youtube_beta.py (YouTube Music forced)
```

## Implementation Steps

### Step 1: Fix Beta Initialization ✅
- Remove stable_bot copying
- Initialize components directly
- Fixed AttributeError

### Step 2: Restore Stable YouTube
- Keep original youtube.py in services/audio/
- Stable version unchanged

### Step 3: Create Beta YouTube Music
- Copy to beta-version/services/audio/youtube_beta.py
- YouTube Music features in beta only
- Import path different for beta

### Step 4: Update Beta Imports
- Beta uses beta-version/services/audio/
- Stable uses services/audio/
- Complete isolation

## Result
✅ Stable: Original YouTube downloader
✅ Beta: YouTube Music downloader with artwork
✅ No conflicts
✅ Safe testing

## Testing
Stable: /play https://youtube.com/watch?v=xxx
  → Uses original youtube.py

Beta: /play-beta https://youtube.com/watch?v=xxx
  → Uses youtube_beta.py (Music version)
