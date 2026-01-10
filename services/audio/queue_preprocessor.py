"""
Queue Pre-Processor for SONORA
Handles background processing of queued tracks:
- Metadata pre-fetching (artwork, lyrics)
- Cache warming (download for loop/replay)
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class PreProcessedTrack:
    """Pre-processed track data"""
    track_id: str  # Unique identifier (title + artist hash)
    artwork_url: Optional[str] = None
    artwork_data: Optional[bytes] = None  # Cached artwork
    lyrics: Optional[Any] = None  # LyricsResult
    apple_lyrics: Optional[Any] = None  # Syllable-level
    cached_audio_path: Optional[Path] = None
    is_processing: bool = False
    is_ready: bool = False


class QueuePreProcessor:
    """
    Background processor for queued tracks.
    Pre-fetches metadata and optionally caches audio.
    """
    
    def __init__(self, bot):
        self.bot = bot
        self._cache: Dict[str, PreProcessedTrack] = {}
        self._processing_queue: asyncio.Queue = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._running = False
        self._max_prefetch = 3  # Pre-process up to 3 tracks ahead
        
    def start(self):
        """Start the background worker"""
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(self._worker_loop())
            logger.info("[PreProcessor] Started background worker")
    
    def stop(self):
        """Stop the background worker"""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            logger.info("[PreProcessor] Stopped background worker")
    
    def _get_track_id(self, metadata) -> str:
        """Generate unique track ID from metadata"""
        title = getattr(metadata, 'title', '') or ''
        artist = getattr(metadata, 'artist', '') or ''
        return f"{title.lower()}:{artist.lower()}"
    
    def get_cached(self, metadata) -> Optional[PreProcessedTrack]:
        """Get pre-processed data if available"""
        track_id = self._get_track_id(metadata)
        cached = self._cache.get(track_id)
        if cached and cached.is_ready:
            return cached
        return None
    
    async def queue_for_processing(self, guild_id: int):
        """Queue the next N tracks from guild's queue for pre-processing"""
        queue_cog = self.bot.get_cog('QueueCommands')
        if not queue_cog or guild_id not in queue_cog.queues:
            return
        
        queue = queue_cog.queues[guild_id]
        
        # Get next N tracks to pre-process
        tracks_to_process = queue[:self._max_prefetch]
        
        for metadata in tracks_to_process:
            track_id = self._get_track_id(metadata)
            
            # Skip if already cached or processing
            if track_id in self._cache:
                continue
            
            # Create entry and queue
            self._cache[track_id] = PreProcessedTrack(
                track_id=track_id,
                is_processing=True
            )
            
            await self._processing_queue.put((track_id, metadata))
            logger.debug(f"[PreProcessor] Queued: {metadata.title}")
    
    async def _worker_loop(self):
        """Background worker that processes tracks"""
        while self._running:
            try:
                # Wait for work
                track_id, metadata = await asyncio.wait_for(
                    self._processing_queue.get(),
                    timeout=5.0
                )
                
                # Process the track
                await self._process_track(track_id, metadata)
                
            except asyncio.TimeoutError:
                # No work, continue
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[PreProcessor] Worker error: {e}")
                await asyncio.sleep(1)
    
    async def _process_track(self, track_id: str, metadata):
        """Process a single track - fetch metadata"""
        try:
            logger.info(f"[PreProcessor] Processing: {metadata.title}")
            
            cached = self._cache.get(track_id)
            if not cached:
                return
            
            # 1. Fetch artwork (if not already set)
            if not metadata.artwork_url:
                artwork_url = await self._fetch_artwork(metadata)
                if artwork_url:
                    cached.artwork_url = artwork_url
                    metadata.artwork_url = artwork_url
            else:
                cached.artwork_url = metadata.artwork_url
            
            # 2. Fetch lyrics (Apple Music first, then SyncedLyrics)
            lyrics, apple_lyrics = await self._fetch_lyrics(metadata)
            if lyrics:
                cached.lyrics = lyrics
                metadata.lyrics = lyrics
            if apple_lyrics:
                cached.apple_lyrics = apple_lyrics
                metadata.apple_lyrics = apple_lyrics
            
            # 3. Optional: Check/warm cache for loop mode
            # (Skip for now - uses bandwidth)
            
            cached.is_processing = False
            cached.is_ready = True
            
            logger.info(f"[PreProcessor] Ready: {metadata.title} (artwork: {'✓' if cached.artwork_url else '✗'}, lyrics: {'✓' if cached.lyrics else '✗'})")
            
        except Exception as e:
            logger.error(f"[PreProcessor] Process error: {e}")
            if track_id in self._cache:
                self._cache[track_id].is_processing = False
    
    async def _fetch_artwork(self, metadata) -> Optional[str]:
        """Fetch artwork URL from Deezer/iTunes"""
        try:
            from services.metadata.artwork import ArtworkFetcher
            fetcher = ArtworkFetcher()
            
            result = await fetcher.fetch_artwork(
                metadata.title,
                metadata.artist,
                getattr(metadata, 'album', None)
            )
            
            if result and result.get('url'):
                return result['url']
                
        except Exception as e:
            logger.debug(f"[PreProcessor] Artwork fetch failed: {e}")
        
        return None
    
    async def _fetch_lyrics(self, metadata) -> tuple:
        """Fetch lyrics - Apple Music (syllable) and SyncedLyrics"""
        lyrics = None
        apple_lyrics = None
        
        try:
            from database.models import TrackInfo as TrackInfoModel
            
            track_info = TrackInfoModel(
                title=metadata.title,
                artist=metadata.artist
            )
            
            # Try Apple Music first (syllable timing)
            try:
                from services.lyrics.applemusic import AppleMusicFetcher
                from config.settings import Settings
                
                cookies_path = str(Settings.APPLE_MUSIC_COOKIES) if Settings.APPLE_MUSIC_COOKIES.exists() else None
                apple_fetcher = AppleMusicFetcher(cookies_path=cookies_path)
                result = await apple_fetcher.fetch(track_info)
                
                if result and result.lines:
                    apple_lyrics = result
                    lyrics = result
                    logger.debug(f"[PreProcessor] Apple Music lyrics: {len(result.lines)} lines")
                    
            except Exception as e:
                logger.debug(f"[PreProcessor] Apple Music lyrics failed: {e}")
            
            # Fallback to SyncedLyrics
            if not lyrics:
                try:
                    from services.lyrics.syncedlyrics_fetcher import SyncedLyricsFetcher
                    fetcher = SyncedLyricsFetcher()
                    result = await fetcher.fetch(track_info)
                    
                    if result and result.lines:
                        lyrics = result
                        logger.debug(f"[PreProcessor] SyncedLyrics: {len(result.lines)} lines")
                        
                except Exception as e:
                    logger.debug(f"[PreProcessor] SyncedLyrics failed: {e}")
                    
        except Exception as e:
            logger.error(f"[PreProcessor] Lyrics fetch error: {e}")
        
        return lyrics, apple_lyrics
    
    def clear_guild(self, guild_id: int):
        """Clear cached data for a guild when queue clears"""
        # For now, keep cache (useful if track is replayed)
        pass
    
    def clear_all(self):
        """Clear all cached data"""
        self._cache.clear()
        logger.debug("[PreProcessor] Cache cleared")


# Global instance
_preprocessor: Optional[QueuePreProcessor] = None


def get_preprocessor(bot=None) -> Optional[QueuePreProcessor]:
    """Get or create the global pre-processor"""
    global _preprocessor
    
    if _preprocessor is None and bot is not None:
        _preprocessor = QueuePreProcessor(bot)
        _preprocessor.start()
    
    return _preprocessor


def stop_preprocessor():
    """Stop the global pre-processor"""
    global _preprocessor
    if _preprocessor:
        _preprocessor.stop()
        _preprocessor = None
