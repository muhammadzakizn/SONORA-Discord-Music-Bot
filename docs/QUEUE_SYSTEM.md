# Queue System Documentation

## 🎵 Overview

Sistem queue yang telah diupgrade dengan fitur-fitur canggih untuk multi-voice channel support, pagination, dan kontrol interaktif.

## ✨ Features

### 1. **Voice Channel Isolation** 🔒
- Setiap voice channel memiliki queue yang terpisah
- User hanya bisa melihat dan memanipulasi queue di voice channel mereka sendiri
- Queue dari voice channel lain tidak terlihat dan tidak bisa diubah

### 2. **Interactive Pagination** 📄
- Menampilkan **5 lagu per halaman**
- Tombol navigasi Previous/Next untuk berpindah halaman
- Indikator halaman: "Page 1/3 • Total: 12 tracks"

### 3. **Track Selection** 🎯
- Select menu untuk memilih lagu dari halaman saat ini
- Menampilkan judul lagu (30 karakter) dan artist (40 karakter)
- Pilih lagu untuk membuka menu aksi

### 4. **Jump to Track** ⏭️
- Lompat langsung ke lagu yang dipilih
- Otomatis menghapus semua lagu sebelumnya (di voice channel yang sama)
- Bot akan skip lagu yang sedang playing dan mulai lagu yang dipilih

### 5. **Remove Track** 🗑️
- Hapus lagu tertentu dari queue
- Hanya bisa hapus lagu dari voice channel sendiri
- Lagu di voice channel lain tidak terpengaruh

### 6. **Clear Queue** 🧹
- Hapus semua lagu di queue voice channel Anda
- Command: `/clear`
- Tidak mempengaruhi queue di voice channel lain

## 📋 Commands

### `/queue`
Menampilkan queue interaktif untuk voice channel Anda.

**Requirements:**
- User harus berada di voice channel
- Menampilkan queue yang difilter berdasarkan voice channel user

**UI Components:**
- Embed dengan daftar 5 lagu
- Previous/Next buttons untuk navigasi
- Select menu untuk memilih lagu
- Timeout: 180 detik

**Example:**
```
📋 Queue - General Voice
Page 1/2 • Total: 7 tracks

1. Song Title 1
   👤 Artist Name • ⏱️ 3:45

2. Song Title 2
   👤 Artist Name • ⏱️ 4:12
...
```

### `/clear`
Menghapus semua lagu dari queue voice channel Anda.

**Requirements:**
- User harus berada di voice channel
- Hanya menghapus lagu dari voice channel user

**Response:**
```
🗑️ Removed 5 tracks from General Voice
```

## 🎮 Interactive Controls

### Track Action Menu

Ketika user memilih lagu dari select menu, akan muncul menu aksi:

```
🎵 Track Actions

Song Title
Artist Name

Position: #3

[⏭️ Jump to This] [🗑️ Remove] [◀️ Back]
```

#### Jump to This Button
- Melompat ke lagu yang dipilih
- Menghapus semua lagu sebelumnya di voice channel yang sama
- Melewati lagu yang sedang playing

#### Remove Button
- Menghapus lagu yang dipilih dari queue
- Hanya mempengaruhi lagu di voice channel yang sama

#### Back Button
- Kembali ke tampilan queue
- Refresh data queue terbaru

## 🏗️ Architecture

### File Structure

```
commands/
├── queue.py          # Queue commands (/queue, /clear)

ui/
├── queue_view.py     # Interactive UI components
│   ├── InteractiveQueueView  # Main queue view with pagination
│   └── TrackActionView       # Track action menu (jump/remove)

database/
├── models.py         # MetadataInfo with voice_channel_id
└── queue_manager.py  # Queue management (future upgrade)
```

### Data Flow

```
1. User runs /queue
   ↓
2. Check user's voice channel ID
   ↓
3. Filter queue by voice_channel_id
   ↓
4. Create InteractiveQueueView
   ↓
5. Display paginated queue (5 items)
   ↓
6. User interacts with buttons/select menu
   ↓
7. Update queue or navigate pages
```

### Voice Channel Filtering

```python
# Filter queue items by voice channel
filtered = []
for item in all_queue:
    voice_ch_id = getattr(item, 'voice_channel_id', None)
    if voice_ch_id == user_voice_channel_id:
        filtered.append(item)
```

### Permission System

**Rule:** User dapat memanipulasi queue hanya jika:
- User berada di voice channel
- Item di queue memiliki `voice_channel_id` yang sama dengan voice channel user

**Implemented in:**
- ✅ `/queue` - Hanya menampilkan lagu dari VC user
- ✅ `/clear` - Hanya menghapus lagu dari VC user
- ✅ Jump to Track - Hanya mempengaruhi lagu dari VC user
- ✅ Remove Track - Hanya menghapus lagu dari VC user

## 🔧 Technical Details

### Pagination Algorithm

```python
items_per_page = 5
current_page = 0

# Calculate total pages
total_pages = (len(filtered_items) - 1) // items_per_page + 1

# Get items for current page
start = current_page * items_per_page
end = start + items_per_page
page_items = filtered_items[start:end]
```

### Track Index Mapping

Karena queue difilter, perlu mapping dari filtered index ke actual index:

```python
# User selects filtered index 2
filtered_index = 2

# Find actual index in full queue
filtered_count = 0
actual_index = -1

for i, item in enumerate(all_queue):
    if item.voice_channel_id == user_voice_channel_id:
        if filtered_count == filtered_index:
            actual_index = i
            break
        filtered_count += 1
```

### Jump to Track Logic

```python
# Find tracks to remove (before target, same VC)
to_remove = []
for i in range(actual_index):
    if all_queue[i].voice_channel_id == user_voice_channel_id:
        to_remove.append(i)

# Remove in reverse order to maintain indices
for i in reversed(to_remove):
    all_queue.pop(i)

# Stop current playback to trigger auto-play
if connection.is_playing():
    connection.connection.stop()
```

## 📊 Examples

### Example 1: Multiple Voice Channels

```
Guild Queue (Internal):
1. Song A1 [VC 111]
2. Song B1 [VC 222]
3. Song A2 [VC 111]
4. Song C1 [VC 333]
5. Song A3 [VC 111]

User in VC 111 sees:
1. Song A1
2. Song A2
3. Song A3

User in VC 222 sees:
1. Song B1

User in VC 333 sees:
1. Song C1
```

### Example 2: Pagination

```
User has 12 songs in queue:

Page 1/3:
1. Song 1
2. Song 2
3. Song 3
4. Song 4
5. Song 5

Page 2/3:
6. Song 6
7. Song 7
8. Song 8
9. Song 9
10. Song 10

Page 3/3:
11. Song 11
12. Song 12
```

### Example 3: Jump to Track

```
Before Jump:
1. Song A
2. Song B  ← User selects this
3. Song C
4. Song D

After Jump:
1. Song B  ← Now playing
2. Song C
3. Song D
```

## 🧪 Testing

Sistem queue telah ditest dengan comprehensive test scenarios:

- ✅ Multiple voice channels isolation
- ✅ Pagination with 5 items per page
- ✅ Jump to track functionality
- ✅ Remove track (own VC only)
- ✅ Clear queue (own VC only)
- ✅ Edge cases (empty queue, single page, multiple pages)

Run tests:
```bash
python3 tmp_rovodev_queue_test_full.py
```

## 🚀 Future Enhancements

- [ ] Queue reordering (drag & drop)
- [ ] Shuffle queue
- [ ] Save queue as playlist
- [ ] Queue statistics
- [ ] Queue history
- [ ] Auto-queue based on mood/genre

## 📝 Notes

- View timeout: 180 seconds (3 minutes)
- Maximum tracks per page: 5
- Title truncated to: 30 characters
- Artist truncated to: 40 characters
- All operations are ephemeral (no database persistence yet)

## 🐛 Known Issues

None! System is fully functional and tested.

## 👨‍💻 Developer Notes

### Adding voice_channel_id to Metadata

Saat membuat MetadataInfo, pastikan untuk menambahkan `voice_channel_id`:

```python
metadata = await self.metadata_processor.process(
    track_info,
    audio_result,
    requested_by=interaction.user.display_name,
    requested_by_id=interaction.user.id,
    voice_channel_id=voice_channel.id  # ← PENTING!
)
```

### Checking User Voice Channel

Selalu check apakah user di voice channel sebelum operasi:

```python
if not interaction.user.voice:
    await interaction.response.send_message(
        embed=EmbedBuilder.create_error(
            "Not in Voice Channel",
            "You must be in a voice channel"
        ),
        ephemeral=True
    )
    return

user_voice_channel_id = interaction.user.voice.channel.id
```

---

**Last Updated:** 2024
**Version:** 2.0
**Status:** ✅ Production Ready
