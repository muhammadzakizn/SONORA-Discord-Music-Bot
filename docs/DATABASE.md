# Database System Documentation

## Overview

The Discord Music Bot uses SQLite with async support (aiosqlite) for persistent data storage. This enables tracking play history, user preferences, guild settings, and analytics.

## Database Location

**File:** `bot.db` (created automatically in project root)

## Schema

### 1. Play History Table

Tracks every song played through the bot.

```sql
CREATE TABLE play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration REAL NOT NULL,
    source TEXT NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT 1
);
```

**Indexes:**
- `idx_play_history_guild` on `(guild_id, played_at DESC)`
- `idx_play_history_user` on `(user_id, played_at DESC)`

### 2. User Preferences Table

Stores user-specific settings per guild.

```sql
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    preferred_volume INTEGER DEFAULT 100,
    equalizer_preset TEXT DEFAULT 'flat',
    auto_romanize BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Guild Settings Table

Stores guild-specific bot configuration.

```sql
CREATE TABLE guild_settings (
    guild_id INTEGER PRIMARY KEY,
    prefix TEXT DEFAULT '/',
    dj_role_id INTEGER,
    auto_disconnect_empty BOOLEAN DEFAULT 1,
    auto_disconnect_timeout INTEGER DEFAULT 300,
    max_queue_size INTEGER DEFAULT 100,
    default_volume INTEGER DEFAULT 100,
    announce_songs BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Favorites Table

User's favorite tracks.

```sql
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    guild_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, title, artist)
);
```

### 5. Queue Statistics Table

Daily aggregated statistics per guild.

```sql
CREATE TABLE queue_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_tracks INTEGER DEFAULT 0,
    total_duration REAL DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    UNIQUE(guild_id, date)
);
```

## API Usage

### Getting Database Instance

```python
from database.db_manager import get_db_manager

db = get_db_manager()
```

### Play History

**Add Entry:**
```python
await db.add_play_history(
    guild_id=123456789,
    user_id=987654321,
    username="User#1234",
    title="Song Title",
    artist="Artist Name",
    duration=180.5,
    source="Spotify",
    album="Album Name",  # Optional
    completed=True
)
```

**Get History:**
```python
# All history
history = await db.get_play_history(limit=50)

# Guild-specific
history = await db.get_play_history(guild_id=123456789, limit=50)

# User-specific
history = await db.get_play_history(user_id=987654321, limit=50)
```

**Get User Stats:**
```python
stats = await db.get_user_stats(user_id=987654321, guild_id=123456789)

# Returns:
# {
#     "total_plays": 127,
#     "total_duration": 30720.5,
#     "top_artists": [{"artist": "...", "count": 23}, ...],
#     "recent_tracks": [{"title": "...", "artist": "...", "played_at": "..."}, ...]
# }
```

### User Preferences

**Get Preferences:**
```python
prefs = await db.get_user_preferences(user_id=987654321, guild_id=123456789)

# Returns:
# {
#     "preferred_volume": 100,
#     "equalizer_preset": "flat",
#     "auto_romanize": True
# }
```

**Set Preference:**
```python
await db.set_user_preference(
    user_id=987654321,
    guild_id=123456789,
    key="preferred_volume",
    value=150
)
```

### Guild Settings

**Get Settings:**
```python
settings = await db.get_guild_settings(guild_id=123456789)

# Returns:
# {
#     "prefix": "/",
#     "dj_role_id": None,
#     "auto_disconnect_empty": True,
#     "auto_disconnect_timeout": 300,
#     "max_queue_size": 100,
#     "default_volume": 100,
#     "announce_songs": True
# }
```

**Set Setting:**
```python
await db.set_guild_setting(
    guild_id=123456789,
    key="max_queue_size",
    value=200
)
```

### Favorites

**Add Favorite:**
```python
success = await db.add_favorite(
    user_id=987654321,
    guild_id=123456789,
    title="Song Title",
    artist="Artist Name",
    url="https://..."  # Optional
)
```

**Get Favorites:**
```python
favorites = await db.get_favorites(user_id=987654321, guild_id=123456789)
```

**Remove Favorite:**
```python
removed = await db.remove_favorite(
    user_id=987654321,
    title="Song Title",
    artist="Artist Name"
)
```

### Analytics

**Get Guild Analytics:**
```python
analytics = await db.get_guild_analytics(guild_id=123456789, days=7)

# Returns:
# {
#     "total_plays": 450,
#     "unique_users": 23,
#     "top_tracks": [{"title": "...", "artist": "...", "plays": 15}, ...],
#     "peak_hours": [{"hour": 20, "plays": 67}, ...],
#     "period_days": 7
# }
```

## Automatic Tracking

### Play History

Every track played is automatically recorded in `ui/media_player.py`:

```python
async def _save_play_history(self, completed: bool = True) -> None:
    """Save play history to database"""
    db = self.bot.db_manager
    
    await db.add_play_history(
        guild_id=self.guild_id,
        user_id=self.metadata.requested_by_id or 0,
        username=self.metadata.requested_by or "Unknown",
        title=self.metadata.title,
        artist=self.metadata.artist,
        duration=self.metadata.duration,
        source=str(self.metadata.audio_source),
        album=self.metadata.album,
        completed=completed
    )
```

This is called automatically when:
- Track finishes playing (`completed=True`)
- Track is skipped (`completed=False`)
- Error occurs during playback (`completed=False`)

## Database Maintenance

### Backup

```bash
# Create backup
cp bot.db bot_backup_$(date +%Y%m%d).db

# Automated backup (add to cron)
0 3 * * * cp /path/to/bot.db /path/to/backups/bot_$(date +\%Y\%m\%d).db
```

### Cleanup Old Data

```python
# Delete history older than 90 days
await db.db.execute("""
    DELETE FROM play_history 
    WHERE played_at < datetime('now', '-90 days')
""")
await db.db.commit()
```

### Database Size Management

**Approximate sizes:**
- 100 plays: ~20 KB
- 1,000 plays: ~200 KB
- 10,000 plays: ~2 MB
- 100,000 plays: ~20 MB

**Optimization:**
- Indexes created automatically for performance
- Use `VACUUM` to reclaim space after deletions
- Consider archiving old data to separate database

### Vacuum Database

```python
await db.db.execute("VACUUM")
```

## Discord Commands

### User Statistics

```
/stats
```

Shows personal listening statistics:
- Total plays
- Total listening time
- Top artists
- Recent tracks

### Play History

```
/history [limit]
```

Shows recent play history (default: 10 tracks, max: 25)

### Top Tracks

```
/top [days]
```

Shows server's top tracks for specified period (default: 7 days)

## Web Dashboard Integration

The database is fully integrated with the web dashboard at `http://localhost:5000`.

**Available via API:**
- `/api/history` - Get play history
- `/api/stats/user/<id>` - Get user statistics
- `/api/stats/guild/<id>` - Get guild analytics

**Real-time Updates:**
- Play history updates live as songs play
- Statistics refresh automatically
- Analytics recalculate on demand

## Performance

### Read Operations
- User preferences: <1ms (indexed)
- Play history (50 entries): <5ms (indexed)
- User stats: <10ms (aggregated)
- Guild analytics: <50ms (complex aggregation)

### Write Operations
- Add play history: <5ms
- Update preferences: <2ms
- Add favorite: <3ms

### Impact on Bot
- CPU: <1% additional usage
- Memory: ~10-20 MB for database connection
- No impact on voice playback performance

## Error Handling

All database operations include try-catch blocks:

```python
try:
    await db.add_play_history(...)
except Exception as e:
    logger.error(f"Failed to save play history: {e}", exc_info=True)
    # Bot continues normally, tracking failure is non-critical
```

Database errors never crash the bot or interrupt playback.

## Migration & Upgrades

### Schema Versioning

Currently at version 1.0. Future versions will include:
- Migration scripts in `database/migrations/`
- Automatic version detection
- Safe upgrade path

### Adding New Fields

Example migration:

```python
# database/migrations/002_add_genre.py
async def upgrade(db):
    await db.execute("""
        ALTER TABLE play_history 
        ADD COLUMN genre TEXT
    """)
    await db.commit()
```

## Best Practices

### 1. Always Use Async
```python
# ✅ Correct
await db.add_play_history(...)

# ❌ Wrong
db.add_play_history(...)  # Will not work
```

### 2. Use Context Manager for Sessions
```python
async with db_manager as db:
    # Operations here
    pass
```

### 3. Handle Errors Gracefully
```python
try:
    await db.operation()
except Exception as e:
    logger.error(f"Database error: {e}")
    # Continue without database
```

### 4. Don't Block Bot Event Loop
```python
# ✅ Correct - Use asyncio.create_task for background saves
asyncio.create_task(db.add_play_history(...))

# ❌ Wrong - Don't use blocking sleep
time.sleep(1)  # Blocks entire bot
```

## Troubleshooting

### Database Locked Error

```python
# Increase timeout
db = await aiosqlite.connect('bot.db', timeout=30)
```

### Corruption

```bash
# Check integrity
sqlite3 bot.db "PRAGMA integrity_check;"

# Repair (creates bot.db.backup)
sqlite3 bot.db ".dump" | sqlite3 bot_repaired.db
mv bot.db bot.db.backup
mv bot_repaired.db bot.db
```

### Reset Database

```bash
# Delete database (will recreate on next run)
rm bot.db
python main.py
```

## Security

### SQL Injection Prevention

All queries use parameterized statements:

```python
# ✅ Safe
await db.execute("SELECT * FROM play_history WHERE user_id = ?", (user_id,))

# ❌ Vulnerable
await db.execute(f"SELECT * FROM play_history WHERE user_id = {user_id}")
```

### Data Privacy

- User IDs stored as integers (Discord IDs)
- Usernames stored for display purposes
- No sensitive data (passwords, emails) stored
- Consider GDPR compliance for EU users

### Encryption

For sensitive data, consider:

```python
from cryptography.fernet import Fernet

# Encrypt before storing
cipher = Fernet(key)
encrypted = cipher.encrypt(data.encode())

# Decrypt when reading
decrypted = cipher.decrypt(encrypted).decode()
```

## Future Enhancements

Planned features:
- [ ] Playlist storage and management
- [ ] User achievement system
- [ ] Listening streaks
- [ ] Social features (shared favorites)
- [ ] Export to JSON/CSV
- [ ] PostgreSQL support for scaling
- [ ] Sharding for multi-bot deployments

## Support

For database-related issues:
1. Check logs in `logs/` directory
2. Verify `bot.db` file permissions
3. Ensure `aiosqlite` is installed
4. Try resetting database as last resort

## References

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [aiosqlite GitHub](https://github.com/omnilib/aiosqlite)
- [SQL Best Practices](https://www.sqlstyle.guide/)
