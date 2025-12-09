"""Constants and enums for the application"""

from enum import Enum


class AudioSource(str, Enum):
    """Audio source types"""
    SPOTIFY = "Spotify"
    YOUTUBE_MUSIC = "YouTube Music"
    APPLE_MUSIC = "Apple Music"
    DIRECT = "Direct URL"
    UNKNOWN = "Unknown"


class LyricsSource(str, Enum):
    """Lyrics source types"""
    GENIUS = "Genius"
    MUSIXMATCH = "Musixmatch"
    SYNCED = "Syncedlyrics"
    NONE = "No Lyrics"


class ArtworkSource(str, Enum):
    """Artwork source types"""
    APPLE_MUSIC = "Apple Music"
    SPOTIFY = "Spotify"
    EMBEDDED = "Embedded"
    NONE = "No Artwork"


class PlayerState(str, Enum):
    """Player state"""
    IDLE = "idle"
    LOADING = "loading"
    PLAYING = "playing"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


# Emoji constants
EMOJI_LOADING = "⏳"
EMOJI_SUCCESS = "✓"
EMOJI_ERROR = "❌"
EMOJI_WARNING = "⚠️"
EMOJI_MUSIC = "🎵"
EMOJI_PAUSE = "⏸️"
EMOJI_PLAY = "▶️"
EMOJI_SKIP = "⏭️"
EMOJI_STOP = "⏹️"

# Progress bar characters
PROGRESS_FILLED = "█"
PROGRESS_EMPTY = "░"

# Colors (for Discord embeds)
COLOR_SUCCESS = 0x1DB954  # Spotify green
COLOR_ERROR = 0xFF0000    # Red
COLOR_WARNING = 0xFFA500  # Orange
COLOR_INFO = 0x3498DB     # Blue
COLOR_PLAYING = 0x1DB954  # Spotify green

# API Limits
DISCORD_EMBED_EDIT_LIMIT = 5  # edits per 5 seconds
DISCORD_RATE_LIMIT_CODE = 429

# Audio quality presets
AUDIO_QUALITY_PRESETS = {
    'low': {'bitrate': 128, 'sample_rate': 44100},
    'medium': {'bitrate': 192, 'sample_rate': 48000},
    'high': {'bitrate': 256, 'sample_rate': 48000},
    'ultra': {'bitrate': 320, 'sample_rate': 48000},
}

# Timeouts
HTTP_TIMEOUT = 30  # seconds
DOWNLOAD_TIMEOUT = 300  # 5 minutes
VOICE_CONNECTION_TIMEOUT = 15  # seconds

# Cache settings
ARTWORK_CACHE_TTL = 3600  # 1 hour
LYRICS_CACHE_TTL = 7200  # 2 hours
METADATA_CACHE_TTL = 3600  # 1 hour
