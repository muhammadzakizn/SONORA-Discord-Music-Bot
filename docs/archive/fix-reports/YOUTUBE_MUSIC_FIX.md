# 🎵 YouTube Music Download Fix

## ✅ Yang Diperbaiki

### 1. Force YouTube Music Domain
**Sebelum:**
```
URL: https://www.youtube.com/watch?v=xxxxx
```

**Sekarang:**
```
URL: https://music.youtube.com/watch?v=xxxxx  ✅
```

### 2. Auto-Convert YouTube Links
Jika user kasih link YouTube biasa:
```
Input:  https://www.youtube.com/watch?v=xxxxx
Output: https://music.youtube.com/watch?v=xxxxx  ✅
```

Bot otomatis convert ke YouTube Music!

### 3. Ambil Artwork dari YouTube Music
```python
--embed-thumbnail   # Embed artwork ke audio file
--add-metadata      # Tambah metadata lengkap
```

Artwork diambil dari YouTube Music dan di-embed ke file audio!

---

## 🎯 Fitur Baru

### 1. URL Conversion
```python
# Deteksi YouTube URL
if 'youtube.com' in url:
    # Extract video ID
    video_id = extract_id(url)
    # Convert to YouTube Music
    url = f"https://music.youtube.com/watch?v={video_id}"
```

### 2. Search di YouTube Music
```python
# Search query langsung ke YouTube Music
search_query = f"https://music.youtube.com/search?q={query}"
```

### 3. Thumbnail/Artwork Extraction
```python
# Get thumbnail URL dari metadata
thumbnail = parts[4] if len(parts) > 4 else None

# Embed ke TrackInfo
TrackInfo(
    ...
    thumbnail_url=thumbnail  # Include artwork
)
```

---

## 📊 Workflow Baru

### User Play YouTube Link:
```
1. User: /play https://www.youtube.com/watch?v=xxxxx
2. Bot: Deteksi YouTube URL
3. Bot: Convert ke https://music.youtube.com/watch?v=xxxxx
4. Bot: Download dari YouTube Music
5. Bot: Embed artwork dari YouTube Music
6. Result: Audio + Artwork dari YouTube Music ✅
```

### User Play Search Query:
```
1. User: /play despacito
2. Bot: Search di YouTube Music
3. Bot: Get hasil pertama dari music.youtube.com
4. Bot: Download audio + artwork
5. Result: Audio berkualitas dari YouTube Music ✅
```

---

## 🎨 Artwork Handling

### Embed Thumbnail
```bash
yt-dlp --embed-thumbnail
```

Artwork akan di-embed langsung ke file audio!

### Get Thumbnail URL
```python
thumbnail_url = track_info.thumbnail_url
```

Bisa digunakan untuk display di Discord embed.

---

## 🧪 Testing

### Test 1: YouTube Link
```
/play https://www.youtube.com/watch?v=kJQP7kiw5Fk
```

**Expected:**
- URL converted to music.youtube.com
- Download dari YouTube Music
- Artwork embedded

### Test 2: YouTube Music Link
```
/play https://music.youtube.com/watch?v=kJQP7kiw5Fk
```

**Expected:**
- URL tetap music.youtube.com
- Download langsung
- Artwork embedded

### Test 3: Search Query
```
/play despacito
```

**Expected:**
- Search di YouTube Music
- Get best result
- Download + artwork

---

## ✅ Checklist

- [x] Force music.youtube.com domain
- [x] Auto-convert YouTube URLs
- [x] Extract video ID dengan regex
- [x] Search langsung ke YouTube Music
- [x] Embed thumbnail/artwork
- [x] Add metadata lengkap
- [x] Include thumbnail_url di TrackInfo

---

## 📝 Technical Details

### URL Regex Pattern
```python
import re
video_id_match = re.search(r'(?:v=|/)([a-zA-Z0-9_-]{11})', url)
```

Matches:
- `youtube.com/watch?v=xxxxx`
- `youtu.be/xxxxx`
- `youtube.com/embed/xxxxx`

### yt-dlp Options
```bash
-f bestaudio[ext=m4a]/bestaudio/best  # Best audio quality
-x                                     # Extract audio only
--audio-format opus                    # Convert to Opus
--embed-thumbnail                      # Embed artwork ✅
--add-metadata                         # Add metadata ✅
--geo-bypass                           # Bypass restrictions
```

---

## 🎯 Result

Sekarang bot akan:
✅ Selalu download dari YouTube Music (bukan YouTube biasa)
✅ Artwork otomatis di-embed ke audio
✅ Metadata lengkap tersedia
✅ Kualitas audio lebih konsisten (dari YouTube Music)

---

**Test sekarang dengan:**
```
/play https://www.youtube.com/watch?v=kJQP7kiw5Fk
```

Atau:
```
/play despacito
```

Artwork sekarang akan ikut ter-download! 🎨
