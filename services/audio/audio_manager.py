"""
Audio Manager - Unified Audio Service Router

Routes audio requests to Lavalink (high-quality) or Legacy (yt-dlp/spotdl)
based on LAVALINK_ENABLED setting and availability.
"""

import asyncio
from typing import Optional, List, Union
from pathlib import Path

from discord.ext import commands

from config.settings import Settings
from config.logging_config import get_logger
from database.models import TrackInfo, AudioResult

logger = get_logger('audio.manager')


class AudioManager:
    """
    Unified audio service manager.
    
    Routes requests to Lavalink or Legacy audio services based on
    configuration and availability.
    """
    
    def __init__(self, bot: commands.Bot, download_dir: Path):
        """
        Initialize Audio Manager.
        
        Args:
            bot: Discord bot instance
            download_dir: Directory for downloaded audio files
        """
        self.bot = bot
        self.download_dir = download_dir
        
        # Lazy-loaded services
        self._lavalink_client = None
        self._youtube_downloader = None
        self._spotify_downloader = None
        
        # Track which service is active
        self.using_lavalink = False
    
    @property
    def lavalink_client(self):
        """Get Lavalink client (lazy load)"""
        if self._lavalink_client is None and Settings.LAVALINK_ENABLED:
            from services.audio.lavalink_client import get_lavalink_client
            self._lavalink_client = get_lavalink_client(self.bot)
        return self._lavalink_client
    
    @property
    def youtube_downloader(self):
        """Get YouTube downloader (lazy load)"""
        if self._youtube_downloader is None:
            from services.audio.youtube import YouTubeDownloader
            self._youtube_downloader = YouTubeDownloader(self.download_dir)
        return self._youtube_downloader
    
    @property
    def spotify_downloader(self):
        """Get Spotify downloader (lazy load)"""
        if self._spotify_downloader is None:
            from services.audio.spotify import SpotifyDownloader
            self._spotify_downloader = SpotifyDownloader(self.download_dir)
        return self._spotify_downloader
    
    async def initialize(self) -> bool:
        """
        Initialize audio services.
        
        Tries to connect to Lavalink if enabled, falls back to legacy.
        
        Returns:
            True if any audio service is available
        """
        if Settings.LAVALINK_ENABLED:
            logger.info("Lavalink is enabled, attempting connection...")
            
            try:
                from services.audio.lavalink_client import init_lavalink
                connected = await init_lavalink(self.bot)
                
                if connected:
                    self.using_lavalink = True
                    logger.info("✓ Using Lavalink for audio (Deezer FLAC)")
                    return True
                else:
                    logger.warning("Lavalink connection failed, falling back to legacy")
                    
            except Exception as e:
                logger.error(f"Lavalink initialization error: {e}")
        
        # Fallback to legacy
        self.using_lavalink = False
        logger.info("Using legacy audio services (yt-dlp, spotdl)")
        return True
    
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for a track.
        
        Routes to Lavalink or Legacy based on availability.
        
        Args:
            query: Search query or URL
            
        Returns:
            TrackInfo if found, None otherwise
        """
        # Try Lavalink first if enabled and connected
        if self.using_lavalink and self.lavalink_client:
            logger.info(f"[AudioManager] Searching via Lavalink: {query}")
            result = await self.lavalink_client.search(query)
            
            if result:
                return result
            
            logger.warning("[AudioManager] Lavalink search failed, trying legacy...")
        
        # Fallback to legacy
        return await self._search_legacy(query)
    
    async def _search_legacy(self, query: str) -> Optional[TrackInfo]:
        """
        Search using legacy services (yt-dlp, spotdl).
        
        Args:
            query: Search query or URL
            
        Returns:
            TrackInfo if found
        """
        logger.info(f"[AudioManager] Searching via legacy: {query}")
        
        # Check if it's a Spotify URL
        if 'spotify.com' in query:
            result = await self.spotify_downloader.search(query)
            if result:
                return result
        
        # Default to YouTube
        return await self.youtube_downloader.search(query)
    
    async def get_stream_url(self, track_info: TrackInfo) -> Optional[str]:
        """
        Get direct stream URL for track.
        
        Args:
            track_info: Track information
            
        Returns:
            Stream URL or None
        """
        # Check if track is from Lavalink
        if getattr(track_info, 'is_lavalink', False) and self.lavalink_client:
            url = await self.lavalink_client.get_stream_url(track_info)
            if url:
                return url
        
        # Fallback to legacy
        return await self.youtube_downloader.get_stream_url(track_info)
    
    async def download(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio for track.
        
        Note: When using Lavalink, download is typically not needed
        as audio streams directly. This is for fallback/caching.
        
        Args:
            track_info: Track information
            
        Returns:
            AudioResult with download result
        """
        logger.info(f"[AudioManager] Downloading: {track_info.title}")
        
        # Try Spotify downloader for Spotify URLs
        if track_info.source.value == 'spotify':
            try:
                return await self.spotify_downloader.download(track_info)
            except Exception as e:
                logger.warning(f"Spotify download failed: {e}, trying YouTube")
        
        # Fallback to YouTube
        return await self.youtube_downloader.download(track_info)
    
    async def search_playlist(self, url: str) -> List[TrackInfo]:
        """
        Search for playlist/album tracks.
        
        Args:
            url: Playlist or album URL
            
        Returns:
            List of TrackInfo objects
        """
        # Try Lavalink first
        if self.using_lavalink and self.lavalink_client:
            tracks = await self.lavalink_client.search_playlist(url)
            if tracks:
                return tracks
        
        # Fallback to legacy playlist processing
        # This would need integration with playlist_processor.py
        logger.warning("[AudioManager] Lavalink playlist failed, using legacy")
        
        # For now, return empty and let existing playlist processor handle it
        return []
    
    def check_cache(self, track_info: TrackInfo) -> Optional[Path]:
        """
        Check if track is in local cache.
        
        Args:
            track_info: Track information
            
        Returns:
            Path to cached file if exists
        """
        return self.youtube_downloader.check_cache(track_info)


# Global manager instance
_audio_manager: Optional[AudioManager] = None


def get_audio_manager(bot: commands.Bot = None, download_dir: Path = None) -> Optional[AudioManager]:
    """
    Get or create global Audio Manager.
    
    Args:
        bot: Discord bot instance (required for first call)
        download_dir: Download directory (required for first call)
        
    Returns:
        AudioManager instance
    """
    global _audio_manager
    
    if _audio_manager is None and bot is not None and download_dir is not None:
        _audio_manager = AudioManager(bot, download_dir)
    
    return _audio_manager


async def init_audio_manager(bot: commands.Bot, download_dir: Path) -> AudioManager:
    """
    Initialize Audio Manager and connect to services.
    
    Call this from bot's on_ready event.
    
    Args:
        bot: Discord bot instance
        download_dir: Download directory
        
    Returns:
        Initialized AudioManager
    """
    manager = get_audio_manager(bot, download_dir)
    if manager:
        await manager.initialize()
    return manager
