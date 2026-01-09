"""
Lavalink Client for SONORA

High-quality audio streaming using Lavalink server with Deezer FLAC support.
Uses wavelink library for Python Discord bot integration.
"""

import asyncio
from typing import Optional, Union, List, Dict
from pathlib import Path

import discord
from discord.ext import commands

try:
    import wavelink
    WAVELINK_AVAILABLE = True
except ImportError:
    WAVELINK_AVAILABLE = False
    wavelink = None

from config.settings import Settings
from config.logging_config import get_logger
from database.models import TrackInfo, AudioSource

logger = get_logger('audio.lavalink')


class LavalinkClient:
    """
    Lavalink client wrapper for SONORA.
    
    Provides high-quality audio streaming using Lavalink server
    with LavaSrc plugin for Deezer FLAC support.
    """
    
    def __init__(self, bot: commands.Bot):
        """
        Initialize Lavalink client.
        
        Args:
            bot: Discord bot instance
        """
        self.bot = bot
        self.connected = False
        self._node: Optional['wavelink.Node'] = None
        
        if not WAVELINK_AVAILABLE:
            logger.error("wavelink library not installed! Run: pip install wavelink")
    
    @property
    def is_available(self) -> bool:
        """Check if Lavalink is available and enabled"""
        return (
            WAVELINK_AVAILABLE and 
            Settings.LAVALINK_ENABLED and 
            self.connected
        )
    
    async def connect(self) -> bool:
        """
        Connect to Lavalink server.
        
        Returns:
            True if connected successfully
        """
        if not WAVELINK_AVAILABLE:
            logger.error("Cannot connect: wavelink not installed")
            return False
        
        if not Settings.LAVALINK_ENABLED:
            logger.info("Lavalink is disabled in settings")
            return False
        
        try:
            # Create node connection
            node = wavelink.Node(
                uri=f"{'https' if Settings.LAVALINK_SECURE else 'http'}://{Settings.LAVALINK_HOST}:{Settings.LAVALINK_PORT}",
                password=Settings.LAVALINK_PASSWORD
            )
            
            # Connect to Lavalink
            await wavelink.Pool.connect(
                nodes=[node],
                client=self.bot,
                cache_capacity=100
            )
            
            self._node = node
            self.connected = True
            logger.info(f"✓ Connected to Lavalink at {Settings.LAVALINK_HOST}:{Settings.LAVALINK_PORT}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Lavalink: {e}")
            self.connected = False
            return False
    
    async def disconnect(self) -> None:
        """Disconnect from Lavalink server"""
        try:
            if self._node:
                await wavelink.Pool.close()
                self._node = None
                self.connected = False
                logger.info("Disconnected from Lavalink")
        except Exception as e:
            logger.warning(f"Error disconnecting from Lavalink: {e}")
    
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for a track using Lavalink.
        
        Uses default search source (Deezer by default for FLAC quality).
        
        Args:
            query: Search query or URL
            
        Returns:
            TrackInfo if found, None otherwise
        """
        if not self.is_available:
            logger.debug("Lavalink not available, falling back to legacy")
            return None
        
        try:
            # Determine search prefix
            if query.startswith('http'):
                # Direct URL - no prefix needed
                search_query = query
            else:
                # Add search prefix based on default source
                source = Settings.LAVALINK_DEFAULT_SOURCE
                search_query = f"{source}:{query}"
            
            logger.info(f"[Lavalink] Searching: {search_query}")
            
            # Use wavelink.Pool.fetch_tracks to send raw query to Lavalink
            # This avoids wavelink adding its own search prefix
            tracks = await wavelink.Pool.fetch_tracks(search_query)
            
            if not tracks:
                logger.warning(f"[Lavalink] No results for: {query}")
                return None
            
            # Get first track - handle both list and Playlist response
            if isinstance(tracks, wavelink.Playlist):
                if not tracks.tracks:
                    logger.warning(f"[Lavalink] Empty playlist result for: {query}")
                    return None
                track = tracks.tracks[0]
            elif isinstance(tracks, list):
                track = tracks[0]
            else:
                track = tracks
            
            # Convert to TrackInfo
            track_info = self._wavelink_to_trackinfo(track, query)
            logger.info(f"[Lavalink] Found: {track_info.title} by {track_info.artist}")
            
            return track_info
            
        except Exception as e:
            logger.error(f"[Lavalink] Search error: {e}")
            return None

    
    async def play(
        self, 
        voice_channel: discord.VoiceChannel,
        track_info: TrackInfo
    ) -> Optional['wavelink.Player']:
        """
        Play a track in voice channel.
        
        Args:
            voice_channel: Discord voice channel
            track_info: Track to play
            
        Returns:
            wavelink.Player if successful
        """
        if not self.is_available:
            return None
        
        try:
            # Get or create player
            player: wavelink.Player = voice_channel.guild.voice_client
            
            if not player:
                player = await voice_channel.connect(cls=wavelink.Player)
            
            # Search for track
            tracks = await wavelink.Playable.search(track_info.url)
            
            if not tracks:
                logger.error(f"[Lavalink] Cannot find track: {track_info.url}")
                return None
            
            track = tracks[0] if isinstance(tracks, list) else tracks.tracks[0]
            
            # Play
            await player.play(track)
            logger.info(f"[Lavalink] Playing: {track_info.title}")
            
            return player
            
        except Exception as e:
            logger.error(f"[Lavalink] Play error: {e}")
            return None
    
    async def get_stream_url(self, track_info: TrackInfo) -> Optional[str]:
        """
        Get direct stream URL for track (for legacy player compatibility).
        
        Note: Lavalink typically handles streaming internally, 
        but this provides URL for hybrid mode.
        
        Args:
            track_info: Track information
            
        Returns:
            Stream URL or None
        """
        if not self.is_available:
            return None
        
        try:
            tracks = await wavelink.Playable.search(track_info.url)
            
            if tracks:
                track = tracks[0] if isinstance(tracks, list) else tracks.tracks[0]
                # wavelink tracks have uri attribute
                return track.uri
            
            return None
            
        except Exception as e:
            logger.error(f"[Lavalink] Get stream URL error: {e}")
            return None
    
    def _wavelink_to_trackinfo(
        self, 
        track: 'wavelink.Playable',
        original_query: str
    ) -> TrackInfo:
        """
        Convert wavelink track to TrackInfo.
        
        Args:
            track: wavelink Playable object
            original_query: Original search query
            
        Returns:
            TrackInfo object
        """
        # Determine source from URI
        uri = track.uri or ""
        if "deezer.com" in uri:
            source = AudioSource.DEEZER
        elif "spotify.com" in uri:
            source = AudioSource.SPOTIFY
        elif "music.youtube.com" in uri or "youtube.com" in uri:
            source = AudioSource.YOUTUBE
        elif "soundcloud.com" in uri:
            source = AudioSource.SOUNDCLOUD
        else:
            source = AudioSource.UNKNOWN
        
        return TrackInfo(
            title=track.title or original_query,
            artist=track.author or "Unknown Artist",
            duration_ms=int(track.length) if track.length else 0,
            url=track.uri or "",
            thumbnail=getattr(track, 'artwork', None) or getattr(track, 'thumb', None) or "",
            source=source,
            album=getattr(track, 'album', {}).get('name', '') if hasattr(track, 'album') else "",
            is_lavalink=True  # Mark as Lavalink track for player routing
        )
    
    async def search_playlist(self, url: str) -> List[TrackInfo]:
        """
        Search for playlist/album tracks.
        
        Args:
            url: Playlist or album URL
            
        Returns:
            List of TrackInfo objects
        """
        if not self.is_available:
            return []
        
        try:
            logger.info(f"[Lavalink] Loading playlist: {url}")
            
            result = await wavelink.Playable.search(url)
            
            if not result:
                return []
            
            # Handle playlist result
            if hasattr(result, 'tracks'):
                tracks = result.tracks
            elif isinstance(result, list):
                tracks = result
            else:
                tracks = [result]
            
            track_infos = []
            for track in tracks:
                track_info = self._wavelink_to_trackinfo(track, url)
                track_infos.append(track_info)
            
            logger.info(f"[Lavalink] Loaded {len(track_infos)} tracks from playlist")
            return track_infos
            
        except Exception as e:
            logger.error(f"[Lavalink] Playlist load error: {e}")
            return []


# Global client instance
_lavalink_client: Optional[LavalinkClient] = None


def get_lavalink_client(bot: commands.Bot = None) -> Optional[LavalinkClient]:
    """
    Get or create global Lavalink client.
    
    Args:
        bot: Discord bot instance (required for first call)
        
    Returns:
        LavalinkClient instance or None if not available
    """
    global _lavalink_client
    
    if not Settings.LAVALINK_ENABLED:
        return None
    
    if _lavalink_client is None and bot is not None:
        _lavalink_client = LavalinkClient(bot)
    
    return _lavalink_client


async def init_lavalink(bot: commands.Bot) -> bool:
    """
    Initialize Lavalink connection.
    
    Call this from bot's on_ready event.
    
    Args:
        bot: Discord bot instance
        
    Returns:
        True if connected successfully
    """
    if not Settings.LAVALINK_ENABLED:
        logger.info("Lavalink is disabled, using legacy audio")
        return False
    
    client = get_lavalink_client(bot)
    if client:
        return await client.connect()
    
    return False
