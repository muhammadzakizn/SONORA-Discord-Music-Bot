# API Documentation - Discord Music Bot v3.0

## Core Classes

### MusicBot

Main bot class that handles Discord connection and event management.

```python
from core.bot import MusicBot

bot = MusicBot()
bot.run_bot()
```

**Attributes:**
- `voice_manager`: VoiceManager instance for managing voice connections
- `error_handler`: BotErrorHandler instance for error handling

**Methods:**
- `setup_hook()`: Called when bot is starting up
- `load_commands()`: Load command modules
- `run_bot()`: Run the bot with token from settings

---

## Services

### Audio Downloaders

#### SpotifyDownloader

Download audio from Spotify using spotdl.

```python
from services.audio.spotify import SpotifyDownloader

downloader = SpotifyDownloader(download_dir)
track_info = await downloader.search("artist - song")
audio_result = await downloader.download(track_info)
```

**Methods:**
- `search(query: str) -> Optional[TrackInfo]`: Search for track
- `download(track_info: TrackInfo) -> AudioResult`: Download audio

#### YouTubeDownloader

Download audio from YouTube using yt-dlp.

```python
from services.audio.youtube import YouTubeDownloader

downloader = YouTubeDownloader(download_dir)
track_info = await downloader.search("song name")
audio_result = await downloader.download(track_info)
```

**Methods:**
- `search(query: str) -> Optional[TrackInfo]`: Search for video
- `download(track_info: TrackInfo) -> AudioResult`: Download audio

#### OptimizedAudioPlayer

Play audio with optimized CPU usage.

```python
from services.audio.player import OptimizedAudioPlayer

# Create audio source
audio_source = OptimizedAudioPlayer.create_audio_source(
    file_path,
    bitrate=256
)

# Play audio
await OptimizedAudioPlayer.play_audio(
    voice_client,
    audio_source,
    after_callback=on_end
)
```

**Static Methods:**
- `create_audio_source(file_path, bitrate, volume) -> FFmpegOpusAudio`
- `play_audio(voice_client, audio_source, after_callback) -> None`
- `pause(voice_client) -> bool`
- `resume(voice_client) -> bool`
- `stop(voice_client) -> bool`

---

### Voice Management

#### RobustVoiceConnection

Robust voice connection with retry logic.

```python
from services.voice.connection import RobustVoiceConnection

connection = RobustVoiceConnection(timeout=15, max_reconnects=3)
await connection.connect(voice_channel)

# Use connection
if connection.is_connected():
    # Play audio...
    pass

await connection.disconnect()
```

**Methods:**
- `connect(channel: VoiceChannel) -> VoiceClient`: Connect to voice channel
- `disconnect(force: bool) -> None`: Disconnect from channel
- `cleanup() -> None`: Cleanup connection properly
- `is_connected() -> bool`: Check if connected
- `is_playing() -> bool`: Check if playing audio
- `move_to(channel: VoiceChannel) -> None`: Move to different channel

#### VoiceManager

Manage voice connections across multiple guilds.

```python
from services.voice.manager import VoiceManager

manager = VoiceManager()

# Connect to guild
connection = await manager.connect(voice_channel)

# Get connection
connection = manager.get_connection(guild_id)

# Disconnect from guild
await manager.disconnect(guild_id)

# Disconnect from all guilds
await manager.disconnect_all()
```

**Methods:**
- `connect(channel: VoiceChannel) -> RobustVoiceConnection`
- `disconnect(guild_id: int, force: bool) -> None`
- `disconnect_all(force: bool) -> None`
- `get_connection(guild_id: int) -> Optional[RobustVoiceConnection]`
- `is_connected(guild_id: int) -> bool`
- `get_stats() -> dict`

---

### Lyrics Services

#### GeniusLyricsFetcher

Fetch lyrics from Genius.

```python
from services.lyrics.genius import GeniusLyricsFetcher

fetcher = GeniusLyricsFetcher()
lyrics_data = await fetcher.fetch(track_info)

if lyrics_data:
    lines = lyrics_data.get_lines_at_time(current_time, count=3)
```

**Methods:**
- `fetch(track_info: TrackInfo) -> Optional[LyricsData]`
- `search(query: str) -> Optional[LyricsData]`

---

### Metadata Services

#### ArtworkFetcher

Fetch artwork from Apple Music or Spotify.

```python
from services.metadata.artwork import ArtworkFetcher

fetcher = ArtworkFetcher()
artwork_url, source = await fetcher.fetch(track_info)

# Download artwork
artwork_path = await fetcher.download_artwork(artwork_url, track_info)
```

**Methods:**
- `fetch(track_info: TrackInfo, prefer_apple: bool) -> Optional[tuple]`
- `download_artwork(artwork_url: str, track_info: TrackInfo) -> Optional[Path]`

#### MetadataProcessor

Assemble complete metadata from multiple sources.

```python
from services.metadata.processor import MetadataProcessor

processor = MetadataProcessor()
metadata = await processor.process(
    track_info,
    audio_result,
    requested_by="Username",
    requested_by_id=123456
)
```

**Methods:**
- `process(track_info, audio_result, requested_by, requested_by_id) -> MetadataInfo`

---

## UI Components

### SafeLoadingManager

Manage loading messages with rate limit protection.

```python
from ui.loading import SafeLoadingManager

manager = SafeLoadingManager(message)

# Update message (rate limit safe)
await manager.update(content="Loading...")
await manager.update(embed=embed)

# Delete message
await manager.delete()
```

**Methods:**
- `update(content: str, embed: Embed) -> None`: Update message
- `delete() -> None`: Delete message

### SynchronizedMediaPlayer

Media player with synchronized progress and lyrics.

```python
from ui.media_player import SynchronizedMediaPlayer

player = SynchronizedMediaPlayer(voice_client, message, metadata)

# Start playback
await player.start()

# Control playback
await player.pause()
await player.resume()
await player.stop()

# Get current time
current_time = player.get_current_time()
```

**Methods:**
- `start() -> None`: Start playback with sync
- `pause() -> bool`: Pause playback
- `resume() -> bool`: Resume playback
- `stop() -> None`: Stop playback
- `get_current_time() -> float`: Get current playback time

### EmbedBuilder

Build Discord embeds for various purposes.

```python
from ui.embeds import EmbedBuilder

# Now playing embed
embed = EmbedBuilder.create_now_playing(
    metadata,
    current_time=30.0,
    progress_bar="████░░░░░░",
    lyrics_lines=["Line 1", "Line 2", "Line 3"]
)

# Loading embed
embed = EmbedBuilder.create_loading("Downloading", "Please wait...")

# Success embed
embed = EmbedBuilder.create_success("Success", "Operation completed")

# Error embed
embed = EmbedBuilder.create_error("Error", "Something went wrong")

# Queue embed
embed = EmbedBuilder.create_queue(queue_items, current_track)
```

**Static Methods:**
- `create_now_playing(metadata, current_time, progress_bar, lyrics_lines) -> Embed`
- `create_loading(stage: str, details: str) -> Embed`
- `create_success(title: str, description: str) -> Embed`
- `create_error(title: str, description: str) -> Embed`
- `create_queue(queue_items: list, current_track) -> Embed`
- `create_track_info(metadata: MetadataInfo) -> Embed`

---

## Utilities

### URLValidator

Validate and parse URLs.

```python
from utils.validators import URLValidator

# Check URL type
is_valid = URLValidator.is_valid_url(url)
is_spotify = URLValidator.is_spotify_url(url)
is_youtube = URLValidator.is_youtube_url(url)

# Extract IDs
spotify_type, spotify_id = URLValidator.extract_spotify_id(url)
youtube_id = URLValidator.extract_youtube_id(url)

# Get URL type
url_type = URLValidator.get_url_type(url)  # 'spotify', 'youtube', 'direct', 'unknown'
```

### InputValidator

Validate and sanitize user inputs.

```python
from utils.validators import InputValidator

# Sanitize query
clean_query = InputValidator.sanitize_query(user_input)

# Validate values
is_valid = InputValidator.is_valid_bitrate(256)
is_valid = InputValidator.is_valid_duration(180.0)
```

### TimeFormatter

Format time values.

```python
from utils.formatters import TimeFormatter

# Format seconds to MM:SS
time_str = TimeFormatter.format_seconds(125)  # "2:05"

# Format milliseconds
time_str = TimeFormatter.format_milliseconds(125000)  # "2:05"

# Parse time string
seconds = TimeFormatter.parse_time_string("2:05")  # 125.0
```

### ProgressBarFormatter

Generate progress bars.

```python
from utils.formatters import ProgressBarFormatter

# Generate bar
bar = ProgressBarFormatter.generate_bar(0.5, length=20)
# "██████████░░░░░░░░░░"

# Generate with time
bar_with_time = ProgressBarFormatter.generate_with_time(60, 180)
# "1:00 ██████░░░░░░░░░░ 3:00"

# Generate with percentage
bar_with_pct = ProgressBarFormatter.generate_percentage(0.5)
# "██████████░░░░░░░░░░ 50%"
```

### CacheManager

Manage caching for various resources.

```python
from utils.cache import cache_manager

# Get from cache
value = cache_manager.get('artwork', cache_key)

# Set in cache
cache_manager.set('lyrics', cache_key, lyrics_data)

# Clear cache
cache_manager.clear('artwork')  # Clear specific cache
cache_manager.clear()  # Clear all caches

# Get stats
stats = cache_manager.get_stats()
```

---

## Data Models

### TrackInfo

Track information from search/detection.

```python
from database.models import TrackInfo

track = TrackInfo(
    title="Song Title",
    artist="Artist Name",
    album="Album Name",
    duration=180.0,
    url="https://...",
    track_id="abc123"
)
```

**Attributes:**
- `title: str`
- `artist: str`
- `album: Optional[str]`
- `duration: float` (seconds)
- `url: Optional[str]`
- `track_id: Optional[str]`
- `isrc: Optional[str]`
- `release_year: Optional[int]`

### AudioResult

Result from audio download.

```python
from database.models import AudioResult

result = AudioResult(
    file_path=Path("audio.opus"),
    title="Song Title",
    artist="Artist Name",
    duration=180.0,
    source=AudioSource.SPOTIFY,
    bitrate=256
)

if result.is_success:
    # Use audio file
    pass
```

**Attributes:**
- `file_path: Path`
- `title: str`
- `artist: str`
- `duration: float`
- `source: AudioSource`
- `bitrate: int`
- `format: str`
- `sample_rate: int`
- `error: Optional[str]`

**Properties:**
- `is_success: bool`

### LyricsData

Lyrics data with timing.

```python
from database.models import LyricsData, LyricLine

lyrics = LyricsData(
    lines=[
        LyricLine(text="Line 1", start_time=0.0, end_time=5.0),
        LyricLine(text="Line 2", start_time=5.0, end_time=10.0),
    ],
    source=LyricsSource.GENIUS,
    is_synced=True
)

# Get lines at specific time
current_lines = lyrics.get_lines_at_time(7.5, count=3)
```

**Attributes:**
- `lines: List[LyricLine]`
- `source: LyricsSource`
- `is_synced: bool`
- `language: Optional[str]`

**Methods:**
- `get_lines_at_time(current_time: float, count: int) -> List[str]`

### MetadataInfo

Complete metadata for a track.

```python
from database.models import MetadataInfo

metadata = MetadataInfo(
    title="Song Title",
    artist="Artist Name",
    duration=180.0,
    audio_path=Path("audio.opus"),
    audio_source=AudioSource.SPOTIFY,
    artwork_url="https://...",
    lyrics=lyrics_data
)

if metadata.has_synced_lyrics:
    # Use synced lyrics
    pass
```

**Attributes:**
- `title: str`
- `artist: str`
- `album: Optional[str]`
- `duration: float`
- `audio_path: Optional[Path]`
- `audio_source: AudioSource`
- `bitrate: int`
- `artwork_url: Optional[str]`
- `artwork_path: Optional[Path]`
- `artwork_source: ArtworkSource`
- `lyrics: Optional[LyricsData]`
- `requested_by: Optional[str]`
- `requested_by_id: Optional[int]`

**Properties:**
- `has_lyrics: bool`
- `has_synced_lyrics: bool`
- `has_artwork: bool`

---

## Error Handling

### BotErrorHandler

Centralized error handling.

```python
from core.error_handler import BotErrorHandler

handler = BotErrorHandler()

# Handle command error
await handler.handle_command_error(ctx, error)

# Handle voice error
await handler.handle_voice_error(error, guild_id)

# Create error embed
embed = handler.create_error_embed(
    "Error Title",
    "Error description",
    error_type="Error"
)
```

### Custom Exceptions

```python
from core.error_handler import DownloadError, ConnectionError

# Raise download error with details
raise DownloadError("All sources failed", details=[...])

# Raise connection error
raise ConnectionError("Failed to connect after 3 attempts")
```

---

## Configuration

### Settings

Access configuration values.

```python
from config.settings import Settings

# Discord
token = Settings.DISCORD_TOKEN

# Paths
downloads_dir = Settings.DOWNLOADS_DIR
cache_dir = Settings.CACHE_DIR

# Audio settings
bitrate = Settings.AUDIO_BITRATE
sample_rate = Settings.AUDIO_SAMPLE_RATE

# Validate settings
is_valid = Settings.validate()
```

### Constants

Access constants and enums.

```python
from config.constants import (
    AudioSource,
    LyricsSource,
    PlayerState,
    EMOJI_LOADING,
    COLOR_SUCCESS
)

source = AudioSource.SPOTIFY
lyrics_source = LyricsSource.GENIUS
```

---

## Logging

### Setup Logging

```python
from config.logging_config import setup_logging, get_logger

# Setup logging
logger = setup_logging(level=logging.INFO)

# Get logger
logger = get_logger('module_name')

# Log messages
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)
```

---

**Version**: 3.0  
**Last Updated**: December 2024
