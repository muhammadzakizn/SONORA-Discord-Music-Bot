"""
Lavalink Player for SONORA

Full wavelink.Player integration for Deezer FLAC and high-quality streaming.
Uses Lavalink server for audio processing instead of local FFmpeg.
"""

import asyncio
from typing import Optional, Dict, Any, Callable
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
from database.models import TrackInfo, MetadataInfo

logger = get_logger('audio.lavalink_player')


class LavalinkPlayer:
    """
    Lavalink-based audio player for SONORA.
    
    Uses wavelink.Player for high-quality Deezer FLAC streaming.
    """
    
    def __init__(self, bot: commands.Bot):
        """
        Initialize Lavalink player.
        
        Args:
            bot: Discord bot instance
        """
        self.bot = bot
        self._players: Dict[int, 'wavelink.Player'] = {}  # guild_id -> player
        self._current_tracks: Dict[int, TrackInfo] = {}  # guild_id -> current track
        self._on_track_end_callbacks: Dict[int, Callable] = {}  # guild_id -> callback
        
        if not WAVELINK_AVAILABLE:
            logger.error("wavelink not installed! Run: pip install wavelink")
    
    @property
    def is_available(self) -> bool:
        """Check if Lavalink is available"""
        return WAVELINK_AVAILABLE and Settings.LAVALINK_ENABLED
    
    def get_player(self, guild_id: int) -> Optional['wavelink.Player']:
        """Get player for guild"""
        return self._players.get(guild_id)
    
    async def connect(
        self, 
        voice_channel: discord.VoiceChannel
    ) -> Optional['wavelink.Player']:
        """
        Connect to voice channel using wavelink.
        
        Args:
            voice_channel: Discord voice channel
            
        Returns:
            wavelink.Player if connected
        """
        if not self.is_available:
            return None
        
        guild_id = voice_channel.guild.id
        
        try:
            # Check if already connected via our cache
            existing_player = self._players.get(guild_id)
            if existing_player and existing_player.connected:
                # Move to new channel if different
                if existing_player.channel and existing_player.channel.id != voice_channel.id:
                    await existing_player.move_to(voice_channel)
                return existing_player
            
            # Also check via guild.voice_client (might be connected but not in cache)
            guild = voice_channel.guild
            if guild.voice_client and isinstance(guild.voice_client, wavelink.Player):
                player = guild.voice_client
                self._players[guild_id] = player
                if player.channel and player.channel.id != voice_channel.id:
                    await player.move_to(voice_channel)
                logger.info(f"[LavalinkPlayer] Reusing existing connection in {voice_channel.guild.name}")
                return player
            
            # Disconnect existing non-wavelink connection if any
            if guild.voice_client:
                try:
                    await guild.voice_client.disconnect(force=True)
                except Exception:
                    pass
            
            # Connect via wavelink
            player: wavelink.Player = await voice_channel.connect(cls=wavelink.Player)
            self._players[guild_id] = player
            
            logger.info(f"[LavalinkPlayer] Connected to {voice_channel.name} in {voice_channel.guild.name}")
            return player
            
        except Exception as e:
            logger.error(f"[LavalinkPlayer] Connect error: {e}")
            return None

    
    async def play(
        self,
        guild_id: int,
        track_info: TrackInfo,
        voice_channel: discord.VoiceChannel,
        on_track_end: Optional[Callable] = None,
        paused: bool = False
    ) -> bool:
        """
        Play a track using Lavalink.
        
        Args:
            guild_id: Guild ID
            track_info: Track to play
            voice_channel: Voice channel to play in
            on_track_end: Callback when track ends
            paused: Whether to start the track in a paused state.
            
        Returns:
            True if playback started successfully
        """
        if not self.is_available:
            return False
        
        try:
            # Connect to voice channel
            player = await self.connect(voice_channel)
            if not player:
                logger.error("[LavalinkPlayer] Failed to connect to voice channel")
                return False
            
            # Store callback
            if on_track_end:
                self._on_track_end_callbacks[guild_id] = on_track_end
            
            # Search for track on Deezer/Lavalink
            search_query = self._build_search_query(track_info)
            logger.info(f"[LavalinkPlayer] Searching: {search_query}")
            
            tracks = await wavelink.Pool.fetch_tracks(search_query)
            
            if not tracks:
                logger.warning(f"[LavalinkPlayer] No tracks found for: {track_info.title}")
                return False
            
            # Get first track
            if hasattr(tracks, 'tracks') and tracks.tracks:
                track = tracks.tracks[0]
            elif isinstance(tracks, list) and len(tracks) > 0:
                track = tracks[0]
            else:
                logger.warning("[LavalinkPlayer] Could not extract track")
                return False
            
            # Store current track info
            self._current_tracks[guild_id] = track_info
            
            # Play the track!
            await player.play(track, paused=paused)
            
            logger.info(f"[LavalinkPlayer] Playing: {track_info.title} by {track_info.artist} (Paused: {paused})")
            return True
            
        except Exception as e:
            logger.error(f"[LavalinkPlayer] Play error: {e}")
            return False
    
    def _build_search_query(self, track_info: TrackInfo) -> str:
        """Build search query for Lavalink"""
        if track_info.url and track_info.url.startswith('http'):
            # Check if it's a Deezer/Spotify URL
            if 'deezer.com' in track_info.url or 'spotify.com' in track_info.url:
                return track_info.url
        
        # Search on Deezer by default
        source = Settings.LAVALINK_DEFAULT_SOURCE
        return f"{source}:{track_info.artist} {track_info.title}"
    
    async def play_wavelink_track(
        self,
        guild_id: int,
        wl_track: wavelink.Playable,
        voice_channel: discord.VoiceChannel,
        on_track_end: Optional[Callable] = None,
        paused: bool = False
    ) -> bool:
        """
        Play a pre-loaded wavelink track directly (no re-searching).
        Used for playlist items and cached tracks.
        """
        if not self.is_available:
            return False
        
        try:
            # Connect to voice channel
            player = await self.connect(voice_channel)
            if not player:
                logger.error("[LavalinkPlayer] Failed to connect to voice channel")
                return False
            
            # Store callback
            if on_track_end:
                self._on_track_end_callbacks[guild_id] = on_track_end
            
            # Create TrackInfo from wavelink track
            track_info = TrackInfo(
                title=wl_track.title,
                artist=wl_track.author,
                duration=wl_track.length // 1000 if wl_track.length else 0
            )
            self._current_tracks[guild_id] = track_info
            
            # Play directly
            await player.play(wl_track, paused=paused)
            
            logger.info(f"[LavalinkPlayer] Playing: {wl_track.title} by {wl_track.author} (Paused: {paused})")
            return True
            
        except Exception as e:
            logger.error(f"[LavalinkPlayer] play_wavelink_track error: {e}")
            return False

    
    async def stop(self, guild_id: int) -> bool:
        """Stop playback"""
        player = self._players.get(guild_id)
        if player and player.playing:
            await player.stop()
            logger.info(f"[LavalinkPlayer] Stopped playback in guild {guild_id}")
            return True
        return False
    
    async def pause(self, guild_id: int) -> bool:
        """Pause playback"""
        player = self._players.get(guild_id)
        if player:
            await player.pause(True)
            logger.info(f"[LavalinkPlayer] Paused in guild {guild_id}")
            return True
        return False

    
    async def resume(self, guild_id: int) -> bool:
        """Resume playback"""
        player = self._players.get(guild_id)
        if player and player.paused:
            await player.pause(False)
            logger.info(f"[LavalinkPlayer] Resumed in guild {guild_id}")
            return True
        return False
    
    async def seek(self, guild_id: int, position_ms: int) -> bool:
        """Seek to position"""
        player = self._players.get(guild_id)
        if player and player.playing:
            await player.seek(position_ms)
            logger.info(f"[LavalinkPlayer] Seeked to {position_ms}ms in guild {guild_id}")
            return True
        return False
    
    async def set_volume(self, guild_id: int, volume: int) -> bool:
        """Set volume (0-1000)"""
        player = self._players.get(guild_id)
        if player:
            await player.set_volume(volume)
            logger.info(f"[LavalinkPlayer] Volume set to {volume} in guild {guild_id}")
            return True
        return False
    
    async def disconnect(self, guild_id: int) -> bool:
        """Disconnect from voice channel"""
        player = self._players.get(guild_id)
        if player:
            await player.disconnect()
            del self._players[guild_id]
            if guild_id in self._current_tracks:
                del self._current_tracks[guild_id]
            if guild_id in self._on_track_end_callbacks:
                del self._on_track_end_callbacks[guild_id]
            logger.info(f"[LavalinkPlayer] Disconnected from guild {guild_id}")
            return True
        return False
    
    def is_playing(self, guild_id: int) -> bool:
        """Check if playing"""
        player = self._players.get(guild_id)
        return player.playing if player else False
    
    def is_paused(self, guild_id: int) -> bool:
        """Check if paused"""
        player = self._players.get(guild_id)
        return player.paused if player else False
    
    def is_connected(self, guild_id: int) -> bool:
        """Check if connected to voice"""
        player = self._players.get(guild_id)
        return player.connected if player else False
    
    def get_position(self, guild_id: int) -> int:
        """Get current playback position in ms"""
        player = self._players.get(guild_id)
        return player.position if player else 0
    
    def get_current_track(self, guild_id: int) -> Optional[TrackInfo]:
        """Get current track info"""
        return self._current_tracks.get(guild_id)
    
    async def handle_track_end(self, player: 'wavelink.Player', track: 'wavelink.Playable', reason: str):
        """
        Handle track end event.
        Called from wavelink event in bot.py
        """
        # Null safety checks
        if player is None or not hasattr(player, 'guild') or player.guild is None:
            logger.warning("[LavalinkPlayer] Track ended but player/guild is None")
            return
        
        guild_id = player.guild.id
        logger.info(f"[LavalinkPlayer] Track ended: {track.title if track else 'Unknown'} (reason: {reason})")
        
        # Clear current track
        if guild_id in self._current_tracks:
            del self._current_tracks[guild_id]
        
        # Call registered callback
        callback = self._on_track_end_callbacks.get(guild_id)
        if callback:
            try:
                await callback()
            except Exception as e:
                logger.error(f"[LavalinkPlayer] Track end callback error: {e}")



# Global instance
_lavalink_player: Optional[LavalinkPlayer] = None


def get_lavalink_player(bot: commands.Bot = None) -> Optional[LavalinkPlayer]:
    """
    Get or create global Lavalink player.
    
    Args:
        bot: Discord bot instance (required for first call)
        
    Returns:
        LavalinkPlayer instance or None
    """
    global _lavalink_player
    
    if not Settings.LAVALINK_ENABLED:
        return None
    
    if _lavalink_player is None and bot is not None:
        _lavalink_player = LavalinkPlayer(bot)
    
    return _lavalink_player
