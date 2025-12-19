"""
Track State Management for Synchronized Playback

Manages track state between Discord bot and Admin Dashboard.
Uses WebSocket for real-time synchronization.

Flow:
1. Bot sends "preparing" when starting metadata fetch
2. Bot sends "ready" when track is ready to play
3. Dashboard sends ACK confirming ready
4. Bot starts Discord playback
5. Bot sends "playing" to start lyrics sync
"""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from enum import Enum

from config.logging_config import get_logger

logger = get_logger('web.track_state')


class TrackState(Enum):
    """Track playback states"""
    IDLE = "idle"
    PREPARING = "preparing"  # Fetching metadata, lyrics, artwork
    READY = "ready"          # Ready to play, waiting for dashboard ACK
    PLAYING = "playing"      # Playback started
    PAUSED = "paused"
    ENDED = "ended"


@dataclass
class TrackStateData:
    """Complete track state data for dashboard"""
    state: TrackState = TrackState.IDLE
    guild_id: Optional[int] = None
    
    # Track metadata
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration: int = 0
    artwork_url: Optional[str] = None
    
    # Lyrics
    lyrics: Optional[Dict] = None  # {plain: str, synced: list, source: str}
    lyrics_ready: bool = False
    
    # Playback
    current_time: float = 0
    start_timestamp: float = 0
    
    # Dashboard sync
    dashboard_ack: bool = False
    ack_timestamp: float = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "state": self.state.value,
            "guild_id": str(self.guild_id) if self.guild_id else None,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "duration": self.duration,
            "artwork_url": self.artwork_url,
            "lyrics": self.lyrics,
            "lyrics_ready": self.lyrics_ready,
            "current_time": self.current_time,
            "start_timestamp": self.start_timestamp,
            "dashboard_ack": self.dashboard_ack,
        }


class TrackStateManager:
    """
    Manages track state for all guilds.
    Provides WebSocket-based real-time sync.
    """
    
    def __init__(self):
        self._states: Dict[int, TrackStateData] = {}  # guild_id -> state
        self._socketio = None  # Will be set when Flask app initializes
        self._ack_events: Dict[int, asyncio.Event] = {}  # For waiting on ACK
        logger.info("TrackStateManager initialized")
    
    def set_socketio(self, socketio) -> None:
        """Set SocketIO instance for emitting events"""
        self._socketio = socketio
        logger.info("SocketIO connected to TrackStateManager")
    
    def get_state(self, guild_id: int) -> TrackStateData:
        """Get current state for a guild"""
        if guild_id not in self._states:
            self._states[guild_id] = TrackStateData(guild_id=guild_id)
        return self._states[guild_id]
    
    def set_preparing(self, guild_id: int, title: str, artist: str, 
                      album: str = None, duration: int = 0, 
                      artwork_url: str = None) -> None:
        """
        Set track to preparing state.
        Called when bot starts fetching metadata/lyrics.
        """
        state = self.get_state(guild_id)
        state.state = TrackState.PREPARING
        state.title = title
        state.artist = artist
        state.album = album
        state.duration = duration
        state.artwork_url = artwork_url
        state.lyrics = None
        state.lyrics_ready = False
        state.dashboard_ack = False
        state.current_time = 0
        
        self._emit_state_update(guild_id, "track_preparing")
        logger.info(f"[State] Guild {guild_id}: PREPARING - {title}")
    
    def set_lyrics(self, guild_id: int, lyrics: Dict) -> None:
        """Set lyrics for the track"""
        state = self.get_state(guild_id)
        state.lyrics = lyrics
        state.lyrics_ready = True
        
        self._emit_state_update(guild_id, "lyrics_ready")
        logger.info(f"[State] Guild {guild_id}: Lyrics ready")
    
    def set_ready(self, guild_id: int) -> None:
        """
        Set track to ready state.
        Called when everything is prepared and waiting for dashboard.
        """
        state = self.get_state(guild_id)
        state.state = TrackState.READY
        
        # Create ACK event for this guild
        self._ack_events[guild_id] = asyncio.Event()
        
        self._emit_state_update(guild_id, "track_ready")
        logger.info(f"[State] Guild {guild_id}: READY - waiting for dashboard")
    
    async def wait_for_ack(self, guild_id: int, timeout: float = 3.0) -> bool:
        """
        Wait for dashboard ACK.
        Returns True if ACK received, False if timeout.
        """
        event = self._ack_events.get(guild_id)
        if not event:
            return True  # No event = no dashboard connected, proceed
        
        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
            logger.info(f"[State] Guild {guild_id}: Dashboard ACK received")
            return True
        except asyncio.TimeoutError:
            logger.warning(f"[State] Guild {guild_id}: Dashboard ACK timeout ({timeout}s)")
            return False
    
    def receive_ack(self, guild_id: int) -> None:
        """Called when dashboard sends ACK"""
        state = self.get_state(guild_id)
        state.dashboard_ack = True
        state.ack_timestamp = time.time()
        
        # Signal the waiting coroutine
        event = self._ack_events.get(guild_id)
        if event:
            event.set()
        
        logger.info(f"[State] Guild {guild_id}: ACK processed")
    
    def set_playing(self, guild_id: int) -> None:
        """
        Set track to playing state.
        Called when Discord playback actually starts.
        """
        state = self.get_state(guild_id)
        state.state = TrackState.PLAYING
        state.start_timestamp = time.time()
        
        self._emit_state_update(guild_id, "playback_started")
        logger.info(f"[State] Guild {guild_id}: PLAYING - {state.title}")
    
    def set_paused(self, guild_id: int) -> None:
        """Set track to paused state"""
        state = self.get_state(guild_id)
        state.state = TrackState.PAUSED
        state.current_time = time.time() - state.start_timestamp
        
        self._emit_state_update(guild_id, "playback_paused")
    
    def set_ended(self, guild_id: int) -> None:
        """Set track to ended state"""
        state = self.get_state(guild_id)
        state.state = TrackState.ENDED
        
        # Cleanup ACK event
        if guild_id in self._ack_events:
            del self._ack_events[guild_id]
        
        self._emit_state_update(guild_id, "track_ended")
        logger.info(f"[State] Guild {guild_id}: ENDED")
    
    def update_time(self, guild_id: int, current_time: float) -> None:
        """Update current playback time"""
        state = self.get_state(guild_id)
        state.current_time = current_time
        
        # Only emit time updates every 1 second (from dashboard polling)
        # Don't spam WebSocket with time updates
    
    def _emit_state_update(self, guild_id: int, event_name: str) -> None:
        """Emit state update via WebSocket"""
        if not self._socketio:
            logger.debug("SocketIO not available, skipping emit")
            return
        
        state = self.get_state(guild_id)
        
        try:
            # Emit to specific guild room and broadcast
            self._socketio.emit(event_name, state.to_dict())
            self._socketio.emit(f"guild_{guild_id}_{event_name}", state.to_dict())
            logger.debug(f"[WebSocket] Emitted {event_name} for guild {guild_id}")
        except Exception as e:
            logger.error(f"Failed to emit WebSocket event: {e}")


# Global state manager instance
_state_manager: Optional[TrackStateManager] = None


def get_track_state_manager() -> TrackStateManager:
    """Get or create global TrackStateManager instance"""
    global _state_manager
    if _state_manager is None:
        _state_manager = TrackStateManager()
    return _state_manager
