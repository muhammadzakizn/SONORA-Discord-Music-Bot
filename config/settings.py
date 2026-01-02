"""Settings loader from environment variables"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, List

# Load .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""
    
    # Discord
    DISCORD_TOKEN: str = os.getenv('DISCORD_TOKEN', '')
    
    @staticmethod
    def _parse_guild_id() -> Optional[int]:
        """Safely parse DISCORD_GUILD_ID"""
        guild_id_str = os.getenv('DISCORD_GUILD_ID', '')
        if not guild_id_str:
            return None
        try:
            return int(guild_id_str)
        except ValueError:
            # Invalid value (e.g., placeholder text)
            return None
    
    DISCORD_GUILD_ID: Optional[int] = _parse_guild_id.__func__()
    
    # Spotify
    SPOTIFY_CLIENT_ID: str = os.getenv('SPOTIFY_CLIENT_ID', '')
    SPOTIFY_CLIENT_SECRET: str = os.getenv('SPOTIFY_CLIENT_SECRET', '')
    
    # Genius
    GENIUS_API_TOKEN: str = os.getenv('GENIUS_API_TOKEN', '')
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    COOKIES_DIR: Path = BASE_DIR / 'cookies'
    DOWNLOADS_DIR: Path = BASE_DIR / 'downloads'
    CACHE_DIR: Path = BASE_DIR / 'cache'
    LOGS_DIR: Path = BASE_DIR / 'logs'
    
    # Cookie files
    APPLE_MUSIC_COOKIES: Path = COOKIES_DIR / 'apple_music_cookies.txt'
    SPOTIFY_COOKIES: Path = COOKIES_DIR / 'spotify_cookies.txt'
    
    # YouTube cookies - can be set via env var or default path
    @classmethod
    def get_youtube_cookies(cls) -> Optional[Path]:
        """Get YouTube cookies path from env var or default location"""
        # First check env var
        env_path = os.getenv('YOUTUBE_COOKIES_PATH', '')
        if env_path:
            path = Path(env_path)
            if path.exists():
                return path
        # Fallback to default
        default_path = cls.COOKIES_DIR / 'youtube_music_cookies.txt'
        if default_path.exists():
            return default_path
        return None
    
    YOUTUBE_COOKIES: Optional[Path] = None  # Set dynamically
    
    # Audio settings
    AUDIO_BITRATE: int = 256  # kbps
    AUDIO_SAMPLE_RATE: int = 48000  # Hz (Discord native)
    AUDIO_QUALITY: str = 'opus'  # opus, mp3, m4a
    
    # Opus library paths (OS-specific)
    @classmethod
    def get_opus_paths(cls) -> List[str]:
        """Get opus library paths based on operating system"""
        if sys.platform == 'darwin':  # macOS
            return [
                '/opt/homebrew/lib/libopus.dylib',
                '/usr/local/lib/libopus.dylib',
                '/opt/homebrew/opt/opus/lib/libopus.dylib',
                'libopus.0.dylib',
                'libopus.dylib'
            ]
        elif sys.platform == 'win32':  # Windows
            # Include opus.dll from project folder first
            project_opus = str(cls.BASE_DIR / 'opus.dll')
            return [
                project_opus,  # Project folder first
                'opus.dll',
                'libopus-0.dll',
                'libopus.dll',
                str(Path.home() / 'opus.dll'),  # User home
            ]
        else:  # Linux and others
            return [
                '/usr/lib/x86_64-linux-gnu/libopus.so.0',
                '/usr/lib/libopus.so.0',
                '/usr/local/lib/libopus.so',
                'libopus.so.0',
                'libopus.so'
            ]
    
    # Performance settings
    MAX_QUEUE_SIZE: int = 100
    CACHE_TTL: int = 3600  # 1 hour in seconds
    MAX_CONCURRENT_DOWNLOADS: int = 3
    
    # Rate limit settings
    MIN_UPDATE_INTERVAL: float = 2.0  # seconds between UI updates
    VOICE_TIMEOUT: int = 15  # seconds for voice connection timeout
    RECONNECT_WAIT: int = 5  # seconds to wait before reconnect
    MAX_RECONNECT_ATTEMPTS: int = 3
    
    # UI settings
    PROGRESS_BAR_LENGTH: int = 20
    LYRICS_DISPLAY_LINES: int = 3
    
    # FTP Audio Cache (Hostinger)
    FTP_HOST: str = os.getenv('FTP_HOST', '')
    FTP_USER: str = os.getenv('FTP_USER', '')
    FTP_PASSWORD: str = os.getenv('FTP_PASSWORD', '')
    FTP_DIRECTORY: str = os.getenv('FTP_DIRECTORY', '/audio-cache')
    
    # Server mode - disable streaming if YouTube blocks IP (403 error)
    # Set to "true" on servers where streaming returns 403 Forbidden
    DISABLE_STREAMING: bool = os.getenv('DISABLE_STREAMING', 'false').lower() == 'true'
    
    # One Track One Process Mode - sequential playlist processing
    # When enabled, only prepares 1 track at a time instead of 3
    # Useful for limited resources or slow connections
    ONE_TRACK_ONE_PROCESS: bool = os.getenv('ONE_TRACK_ONE_PROCESS', 'false').lower() == 'true'
    
    # YouTube Proxy - fallback proxy when YouTube blocks server IP (403)
    # Supports HTTP proxy (http://host:port) or SOCKS5 (socks5://host:port)
    # Example: http://bore.pub:31909 (via bore tunnel from local machine)
    YOUTUBE_PROXY: str = os.getenv('YOUTUBE_PROXY', '')
    
    # Rclone Cache - Use mounted Google Drive instead of FTP
    # On Windows: mount Google Drive as drive letter (e.g., G:)
    # Command: rclone mount gdrive:SONORA-Cache G: --vfs-cache-mode full
    RCLONE_CACHE_ENABLED: bool = os.getenv('RCLONE_CACHE_ENABLED', 'false').lower() == 'true'
    RCLONE_CACHE_PATH: Path = Path(os.getenv('RCLONE_CACHE_PATH', 'G:/audio'))
    
    @classmethod
    def get_cache_path(cls) -> Path:
        """Get the active cache path - Rclone mount or local downloads"""
        if cls.RCLONE_CACHE_ENABLED and cls.RCLONE_CACHE_PATH.exists():
            return cls.RCLONE_CACHE_PATH
        return cls.DOWNLOADS_DIR
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that all required settings are present"""
        errors = []
        
        # Check required credentials
        if not cls.DISCORD_TOKEN:
            errors.append("DISCORD_TOKEN is missing")
        
        if not cls.SPOTIFY_CLIENT_ID:
            errors.append("SPOTIFY_CLIENT_ID is missing")
        
        if not cls.SPOTIFY_CLIENT_SECRET:
            errors.append("SPOTIFY_CLIENT_SECRET is missing")
        
        # Check cookie files
        if not cls.APPLE_MUSIC_COOKIES.exists():
            errors.append(f"Apple Music cookies not found: {cls.APPLE_MUSIC_COOKIES}")
        
        # Create directories if they don't exist
        for directory in [cls.DOWNLOADS_DIR, cls.CACHE_DIR, cls.LOGS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        
        if errors:
            for error in errors:
                print(f"❌ Configuration Error: {error}")
            return False
        
        print("✅ Configuration validated successfully")
        return True
    
    @classmethod
    def get_safe_token(cls) -> str:
        """Get masked token for logging (security)"""
        if not cls.DISCORD_TOKEN:
            return "NOT_SET"
        return cls.DISCORD_TOKEN[:10] + "..." + ("*" * 20)


# Validate on import
if __name__ == "__main__":
    Settings.validate()
