# 🎛️ Equalizer & Volume Control Feature

## 📖 Overview

Sistem **Equalizer 10-band** dan **Volume Control Slider** yang lengkap dengan:
- ✅ 9 EQ presets (Bass Boost, Rock, Pop, dll)
- ✅ Custom EQ editor (10-band adjustment)
- ✅ Save/load custom presets
- ✅ Volume slider dengan mute
- ✅ Fine control (+/-1%, +/-5%, +/-10%, +/-50%)
- ✅ Volume presets (0%, 25%, 50%, 100%, 150%, 200%)

---

## 🎛️ Equalizer System

### Built-in Presets:

| Preset | Description | Best For |
|--------|-------------|----------|
| **Flat** | No EQ (default) | Reference listening |
| **Bass Boost** | Enhanced low frequencies | Hip-hop, EDM, Dubstep |
| **Treble Boost** | Enhanced high frequencies | Classical, Acoustic |
| **Vocal Boost** | Enhanced mid range | Podcasts, Vocals |
| **Rock** | Rock music optimized | Rock, Metal, Alternative |
| **Pop** | Pop music optimized | Pop, Top 40 |
| **Classical** | Classical optimized | Orchestra, Symphony |
| **Jazz** | Jazz optimized | Jazz, Blues, Soul |
| **Electronic** | EDM optimized | EDM, Techno, House |

### EQ Bands (10-band):

```
Frequency  | Range  | Description
-----------|--------|------------------
32 Hz      | Bass   | Sub-bass
64 Hz      | Bass   | Deep bass
125 Hz     | Bass   | Bass
250 Hz     | Low Mid| Low midrange
500 Hz     | Mid    | Midrange
1 kHz      | Mid    | Midrange
2 kHz      | High Mid| High midrange
4 kHz      | High   | Presence
8 kHz      | High   | Brilliance
16 kHz     | Treble | Air/sparkle
```

### EQ Range:
- **-12 dB to +12 dB** per band
- Adjustments in **2 dB steps**

---

## 🎚️ Volume Control

### Features:

1. **Visual Slider Bar**
   ```
   🔊 125%
   ████████████░░░░░░░░
   ```

2. **Mute Button**
   - Toggle mute/unmute
   - Saves volume before mute
   - Quick mute with 🔇 button

3. **Fine Control Buttons**
   - +/-50% - Large adjustments
   - +/-10% - Medium adjustments
   - +/-5% - Small adjustments
   - +/-1% - Precise adjustments

4. **Volume Presets**
   - 0% (Mute)
   - 25% (Quiet)
   - 50% (Half)
   - 100% (Default)
   - 150% (Loud)
   - 200% (Maximum)

### Volume Range:
- **0% to 200%**
- Default: **100%**

---

## 🎮 How to Use

### Access Equalizer:

```
Method 1: Menu
1. Click "🎵 Menu Kontrol" on media player
2. Select "🎛️ Equalizer"
3. Choose preset or custom EQ

Method 2: Will have command (future)
/equalizer [preset_name]
```

### Access Volume Control:

```
Method 1: Menu
1. Click "🎵 Menu Kontrol" on media player
2. Select "🎚️ Volume Control"
3. Adjust with buttons

Method 2: Quick commands (existing)
/volume <level>      - Set volume
/volume-up           - +10%
/volume-down         - -10%
```

---

## 📊 UI Examples

### Equalizer Main Menu:

```
┌──────────────────────────────────────┐
│ 🎛️ Equalizer                        │
├──────────────────────────────────────┤
│ Choose a preset or create custom EQ  │
│                                      │
│ ⚠️ Note: Changes take effect on     │
│          next track                  │
├──────────────────────────────────────┤
│ 🎛️ Select EQ Preset... ▼           │
│   ⚖️  Flat (Default)                │
│   🔊 Bass Boost                     │
│   ✨ Treble Boost                   │
│   🎤 Vocal Boost                    │
│   🎸 Rock                           │
│   🎵 Pop                            │
│   🎻 Classical                      │
│   🎷 Jazz                           │
│   🎧 Electronic                     │
├──────────────────────────────────────┤
│ [⚙️ Custom EQ] [💾 Save] [📂 My Presets] │
│ [◀️ Back]                           │
└──────────────────────────────────────┘
```

### Custom EQ Editor:

```
┌──────────────────────────────────────┐
│ 🎛️ Custom Equalizer                │
├──────────────────────────────────────┤
│ Frequency    dB      Level           │
│ ─────────────────────────────────    │
│   32 Hz   +8.0  ████████████████████ │
│   64 Hz   +6.0  ███████████████░░░░░ │
│  125 Hz   +4.0  ████████████░░░░░░░░ │
│  250 Hz   +2.0  ██████████░░░░░░░░░░ │
│  500 Hz    0.0  ██████████░░░░░░░░░░ │
│    1 kHz   0.0  ██████████░░░░░░░░░░ │
│    2 kHz   0.0  ██████████░░░░░░░░░░ │
│    4 kHz   0.0  ██████████░░░░░░░░░░ │
│    8 kHz   0.0  ██████████░░░░░░░░░░ │
│   16 kHz   0.0  ██████████░░░░░░░░░░ │
├──────────────────────────────────────┤
│ ℹ️ Adjust each band using dropdowns │
│                                      │
│ [Select band: 32 Hz - Bass ▼]      │
│ [Select band: 64 Hz - Bass ▼]      │
│ [Select band: 125 Hz - Bass ▼]     │
├──────────────────────────────────────┤
│ [♻️ Reset] [◀️ Back]                │
└──────────────────────────────────────┘
```

### Volume Control:

```
┌──────────────────────────────────────┐
│ 🔊 Volume Control                    │
├──────────────────────────────────────┤
│ 125% - High                          │
│                                      │
│ ████████████░░░░░░░░                │
│                                      │
│ Use buttons below to adjust          │
├──────────────────────────────────────┤
│ 💡 Tips                              │
│ • Volume range: 0-200%               │
│ • Default is 100%                    │
│ • Use slider for quick adjustment    │
│ • Click 🔇 Mute to toggle           │
├──────────────────────────────────────┤
│ [-50%] [-10%] [100%] [+10%] [+50%]  │
│ [-5%]  [-1%]  [🔇]   [+1%]  [+5%]   │
│ [0%] [25%] [50%] [150%] [200%]       │
│ [◀️ Back]                           │
└──────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### File Structure:

```
services/audio/
├── equalizer.py           ← NEW! EQ system
    ├── EqualizerSettings (10-band dataclass)
    ├── EqualizerPresets  (9 presets)
    └── EqualizerManager  (per-guild management)

ui/
├── equalizer_view.py      ← NEW! EQ UI
    ├── EqualizerView      (Main menu)
    ├── CustomEqualizerView (Custom editor)
    ├── SavePresetModal    (Save dialog)
    └── CustomPresetsView  (My presets)

├── volume_view.py         ← NEW! Volume UI
    └── VolumeView         (Volume slider)

├── menu_view.py           ← MODIFIED
    └── Added EQ & Volume to menu

commands/
├── volume.py              ← EXISTS (kept for commands)
```

### How EQ Works:

1. **User selects preset**
   ```python
   preset = EqualizerPresets.BASS_BOOST
   eq_manager.set_settings(guild_id, preset)
   ```

2. **EQ settings stored per guild**
   ```python
   # Settings stored in memory
   guild_settings: Dict[int, EqualizerSettings]
   ```

3. **Applied on next track**
   ```python
   # When playing next track
   eq_filter = eq_manager.get_ffmpeg_filter(guild_id)
   # Apply to FFmpeg audio source
   ```

4. **FFmpeg filter generated**
   ```
   equalizer=f=32:t=q:w=200:g=8,
   equalizer=f=64:t=q:w=200:g=6,
   equalizer=f=125:t=q:w=200:g=4
   ```

### Custom Presets:

```python
# Save custom preset
current_settings = eq_manager.get_settings(guild_id)
eq_manager.save_custom_preset(guild_id, "My Bass", current_settings)

# Load custom preset
eq_manager.set_preset(guild_id, "My Bass")

# List custom presets
presets = eq_manager.get_custom_presets(guild_id)
```

---

## 💡 Usage Tips

### For Equalizer:

1. **Start with Preset**
   - Choose closest preset to your taste
   - Then fine-tune with custom EQ

2. **Save Your Settings**
   - After adjusting, click "💾 Save Current"
   - Give it a memorable name
   - Access from "📂 My Presets"

3. **Genre Matching**
   - Rock/Metal → Rock preset
   - EDM/Dance → Electronic preset
   - Podcasts → Vocal Boost preset

4. **Bass Lovers**
   - Use Bass Boost preset
   - Or custom boost 32Hz, 64Hz, 125Hz

### For Volume:

1. **Quick Adjustments**
   - Use +/-10% for normal changes
   - Use +/-50% for big jumps

2. **Precise Control**
   - Use +/-1% for fine tuning
   - Perfect for finding sweet spot

3. **Presets**
   - Click preset buttons for instant levels
   - 100% = Default, safe level

4. **Mute**
   - Quick mute with 🔇 button
   - Unmute restores previous volume

---

## ⚠️ Important Notes

### Equalizer:

1. **Changes apply to NEXT track**
   - Current playing track not affected
   - Skip to apply immediately

2. **Custom presets per server**
   - Each server has own custom presets
   - Not shared across servers

3. **EQ persists**
   - Settings saved per guild
   - Applies to all future tracks

### Volume:

1. **Volume per guild**
   - Each server has independent volume
   - Doesn't affect other servers

2. **200% maximum**
   - Be careful with high volumes
   - May cause audio distortion

3. **Real-time application**
   - Volume changes apply immediately
   - No need to restart track

---

## 🎯 Benefits

### User Experience:
- ✅ Professional audio control
- ✅ Customizable sound
- ✅ Genre-optimized presets
- ✅ Easy volume adjustment
- ✅ Save personal preferences

### Server Admin:
- ✅ Per-guild settings
- ✅ No configuration needed
- ✅ Works out of the box

---

## 📊 Statistics

- **EQ Presets:** 9 built-in
- **Custom Presets:** Unlimited per guild
- **EQ Bands:** 10 (32Hz - 16kHz)
- **EQ Range:** -12dB to +12dB
- **Volume Range:** 0% to 200%
- **Volume Control Buttons:** 15
- **UI Views:** 5 (Main EQ, Custom EQ, Save Modal, My Presets, Volume)

---

## ✅ Status

**Implementation:** ✅ Complete  
**Testing:** ⚠️ Needs testing  
**Documentation:** ✅ Complete  
**Status:** 🚧 **READY FOR TESTING**

---

## 🧪 Testing Checklist

### Equalizer:
- [ ] Select each preset
- [ ] Custom EQ adjustment
- [ ] Save custom preset
- [ ] Load custom preset
- [ ] Delete custom preset
- [ ] EQ applies to next track
- [ ] Back button works

### Volume:
- [ ] All adjustment buttons (+/-)
- [ ] Mute/unmute toggle
- [ ] Volume presets (0-200%)
- [ ] Visual bar updates
- [ ] Real-time volume change
- [ ] Back button works

### Integration:
- [ ] Access from menu
- [ ] Return to media player
- [ ] Multiple guilds work independently
- [ ] No conflicts with existing commands

---

**Version:** 1.0  
**Created:** 2024  
**Status:** Ready for Testing

Made with ❤️ for audiophiles!
