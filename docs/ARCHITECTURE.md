# Architecture Overview - Discord Music Bot v3.0

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Discord Music Bot                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Commands   │    │     Core     │    │      UI      │  │
│  │              │───▶│              │───▶│              │  │
│  │ - play       │    │ - bot        │    │ - embeds     │  │
│  │ - control    │    │ - error      │    │ - loading    │  │
│  │ - queue      │    │ - client     │    │ - player     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┼────────────────────┘          │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                      Services                           │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │   Audio     │  │   Lyrics    │  │  Metadata   │   │ │
│  │  │             │  │             │  │             │   │ │
│  │  │ - spotify   │  │ - genius    │  │ - artwork   │   │ │
│  │  │ - youtube   │  │ - musixmatch│  │ - processor │   │ │
│  │  │ - player    │  │ - synced    │  │             │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  │                                                          │ │
│  │  ┌─────────────┐                                        │ │
│  │  │    Voice    │                                        │ │
│  │  │             │                                        │ │
│  │  │ - connection│                                        │ │
│  │  │ - manager   │                                        │ │
│  │  └─────────────┘                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                      Utilities                          │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ - validators  - formatters  - cache  - logger          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Commands Layer
**Purpose**: Handle user interactions via Discord commands

- **play.py**: Main music playback command
  - Track detection
  - Download orchestration
  - Playback initiation
  
- **control.py**: Playback controls
  - Pause/Resume
  - Stop
  - Skip
  
- **queue.py**: Queue management
  - View queue
  - Clear queue
  - Remove tracks

### 2. Core Layer
**Purpose**: Bot foundation and error handling

- **bot.py**: Main bot class
  - Event handling
  - Command loading
  - Lifecycle management
  
- **error_handler.py**: Centralized error handling
  - Command errors
  - Voice errors
  - Download errors
  - User-friendly error messages

### 3. Services Layer
**Purpose**: Business logic and external integrations

#### Audio Services
- **base.py**: Abstract downloader interface
- **spotify.py**: Spotify downloader (spotdl)
- **youtube.py**: YouTube downloader (yt-dlp)
- **player.py**: Audio player (FFmpegOpusAudio)

#### Lyrics Services
- **base.py**: Abstract lyrics fetcher interface
- **genius.py**: Genius lyrics fetcher

#### Metadata Services
- **processor.py**: Metadata assembly
- **artwork.py**: Artwork fetcher (Apple Music → Spotify)

#### Voice Services
- **connection.py**: Robust voice connection
- **manager.py**: Multi-guild voice management

### 4. UI Layer
**Purpose**: User interface components

- **embeds.py**: Discord embed builders
- **loading.py**: Safe loading manager (rate limit protection)
- **media_player.py**: Synchronized media player

### 5. Utilities Layer
**Purpose**: Helper functions and tools

- **validators.py**: Input validation
- **formatters.py**: Time and progress formatting
- **cache.py**: Caching system
- **logger.py**: Logging utilities

### 6. Configuration Layer
**Purpose**: Application settings

- **settings.py**: Environment configuration
- **constants.py**: Constants and enums
- **logging_config.py**: Logging setup

### 7. Database Layer
**Purpose**: Data models

- **models.py**: Data classes
  - TrackInfo
  - AudioResult
  - LyricsData
  - MetadataInfo
  - QueueItem

## Data Flow

### Play Command Flow

```
User Input (/play query)
         │
         ▼
┌────────────────────┐
│  1. Command        │  Validate user in voice channel
│     Validation     │  Sanitize query
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  2. Track          │  Spotify search → YouTube search
│     Detection      │  Extract track info
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  3. Parallel       │  ┌──────────────┐
│     Download       │  │ Audio        │
│                    │──│ Artwork      │ (asyncio.gather)
│                    │  │ Lyrics       │
└────────┬───────────┘  └──────────────┘
         │
         ▼
┌────────────────────┐
│  4. Metadata       │  Assemble all metadata
│     Assembly       │  Create MetadataInfo
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  5. Voice          │  Connect to voice channel
│     Connection     │  Verify connection
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  6. Media Player   │  Create UI (embed)
│     Creation       │  Start synchronized playback
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  7. Playback       │  Update progress bar (every 2s)
│     Loop           │  Update lyrics display
│                    │  Monitor playback state
└────────────────────┘
```

## Key Design Patterns

### 1. Parallel Processing
**Pattern**: asyncio.gather()
**Purpose**: Download audio, artwork, and lyrics simultaneously

```python
results = await asyncio.gather(
    download_audio(),
    fetch_artwork(),
    fetch_lyrics(),
    return_exceptions=True
)
```

### 2. Fallback Strategy
**Pattern**: Try-except with multiple sources
**Purpose**: Ensure high availability

```
Spotify → YouTube Music → Direct URL
Apple Music → Spotify → Embedded
Genius → Musixmatch → Syncedlyrics
```

### 3. Rate Limit Protection
**Pattern**: Time-based throttling
**Purpose**: Avoid Discord API rate limits

```python
class SafeLoadingManager:
    min_interval = 2.0  # seconds
    # Only update every 2 seconds minimum
```

### 4. Robust Connection
**Pattern**: Retry with exponential backoff
**Purpose**: Handle network issues gracefully

```python
for attempt in range(max_attempts):
    try:
        await connect()
        break
    except TimeoutError:
        wait_time = base_wait * (attempt + 1)
        await asyncio.sleep(wait_time)
```

### 5. Synchronized Updates
**Pattern**: Timestamp-based sync
**Purpose**: Perfect audio/UI synchronization

```python
start_time = time.time()
voice.play(audio)
# Update loop calculates: current_time = now - start_time
```

## Performance Optimizations

### 1. FFmpegOpusAudio
- **Benefit**: 2-5% CPU (vs 10% with PCMAudio)
- **Reason**: Native Opus codec, no transcoding

### 2. TTL Cache
- **Benefit**: Reduced API calls
- **Cache**: Artwork (1h), Lyrics (2h), Metadata (1h)

### 3. Async Operations
- **Benefit**: Non-blocking I/O
- **Pattern**: All network operations are async

### 4. Resource Cleanup
- **Benefit**: Memory efficiency
- **Pattern**: Automatic cleanup on disconnect

## Security Considerations

### 1. Credential Management
- All secrets in `.env` file
- Never logged or exposed
- Cookies in `.gitignore`

### 2. Input Validation
- All user inputs sanitized
- URL validation
- Query length limits

### 3. Error Information
- Errors logged with details
- User sees sanitized messages
- No sensitive data in user messages

## Scalability

### Current Capacity
- **Guilds**: Unlimited (bot-wide)
- **Concurrent**: 10+ guilds simultaneously
- **Memory**: ~50MB per active guild
- **CPU**: ~5% per voice connection

### Scaling Strategy
1. **Horizontal**: Multiple bot instances
2. **Vertical**: More CPU/RAM
3. **Distributed**: Separate audio processing

## Monitoring

### Logging Levels
- **DEBUG**: Detailed diagnostics
- **INFO**: Normal operations
- **WARNING**: Potential issues
- **ERROR**: Errors with recovery
- **CRITICAL**: Fatal errors

### Log Files
- `logs/bot.log`: Main log
- `logs/errors.log`: Error log
- `logs/audio.log`: Audio operations

### Health Checks
- Voice connections
- Memory usage
- Disk space
- API rate limits

---

**Version**: 3.0  
**Last Updated**: December 2024
