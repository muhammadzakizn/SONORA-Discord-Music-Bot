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
        
        if not queue:
            logger.debug("📋 [PreProcessor] Queue is empty, nothing to pre-process")
            return
        
        # Get next N tracks to pre-process
        tracks_to_process = queue[:self._max_prefetch]
        queued_count = 0
        
        logger.info(f"📋 [PreProcessor] Queue has {len(queue)} tracks, preparing next {len(tracks_to_process)}...")
        
        for i, metadata in enumerate(tracks_to_process):
            track_id = self._get_track_id(metadata)
            
            # Skip if already cached or processing
            if track_id in self._cache:
                cached = self._cache[track_id]
                if cached.is_ready:
                    logger.debug(f"  ✓ {i+1}. {metadata.title} - Already ready")
                else:
                    logger.debug(f"  ⏳ {i+1}. {metadata.title} - Processing...")
                continue
            
            # Create entry and queue
            self._cache[track_id] = PreProcessedTrack(
                track_id=track_id,
                is_processing=True
            )
            
            await self._processing_queue.put((track_id, metadata))
            queued_count += 1
            logger.info(f"  📥 {i+1}. {metadata.title} - Queued for processing")
        
        if queued_count > 0:
            logger.info(f"📋 [PreProcessor] Added {queued_count} tracks to processing queue")
    
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
        """Process a single track - fetch metadata AND prepare audio"""
        try:
            logger.info(f"🔄 [PreProcessor] Starting: {metadata.title} by {metadata.artist}")
            
            cached = self._cache.get(track_id)
            if not cached:
                return
            
            # ========================================
            # STEP 1: Check/Prepare Audio Cache
            # ========================================
            audio_path = await self._prepare_audio_cache(metadata)
            if audio_path:
                cached.cached_audio_path = audio_path
                logger.info(f"✓ [PreProcessor] Audio ready: {metadata.title}")
            
            # ========================================
            # STEP 2: Fetch artwork (if not already set)
            # ========================================
            if not metadata.artwork_url:
                artwork_url = await self._fetch_artwork(metadata)
                if artwork_url:
                    cached.artwork_url = artwork_url
                    metadata.artwork_url = artwork_url
                    logger.info(f"🎨 [PreProcessor] Artwork fetched: {metadata.title}")
            else:
                cached.artwork_url = metadata.artwork_url
            
            # ========================================
            # STEP 3: Fetch lyrics (Apple Music first, then SyncedLyrics)
            # ========================================
            lyrics, apple_lyrics = await self._fetch_lyrics(metadata)
            if lyrics:
                cached.lyrics = lyrics
                metadata.lyrics = lyrics
                logger.info(f"📝 [PreProcessor] Lyrics fetched: {metadata.title} ({len(getattr(lyrics, 'lines', [])) if lyrics else 0} lines)")
            if apple_lyrics:
                cached.apple_lyrics = apple_lyrics
                metadata.apple_lyrics = apple_lyrics
            
            cached.is_processing = False
            cached.is_ready = True
            
            logger.info(f"✅ [PreProcessor] READY: {metadata.title} | Audio: {'✓' if audio_path else '✗'} | Art: {'✓' if cached.artwork_url else '✗'} | Lyrics: {'✓' if cached.lyrics else '✗'}")
            
        except Exception as e:
            logger.error(f"❌ [PreProcessor] Process error for {metadata.title}: {e}")
            if track_id in self._cache:
                self._cache[track_id].is_processing = False
    
    async def _prepare_audio_cache(self, metadata) -> Optional[Path]:
        """Check/download audio to local cache, upload to rclone"""
        try:
            from config.settings import Settings
            from services.audio.cache import get_cache_manager
            
            cache_mgr = get_cache_manager(Settings.DOWNLOADS_DIR)
            
            # Step 1: Check local cache
            local_path = cache_mgr.is_file_cached(metadata.artist, metadata.title)
            if local_path and local_path.exists():
                logger.info(f"💾 [PreProcessor] Found in local cache: {metadata.title}")
                return local_path
            
            # Step 2: Check rclone/cloud cache
            try:
                from services.storage import get_cloud_cache
                cloud_cache = get_cloud_cache()
                
                if cloud_cache and cloud_cache.is_enabled:
                    if await cloud_cache.exists(metadata.artist, metadata.title):
                        # Download from cloud to local
                        local_dest = Settings.DOWNLOADS_DIR / f"{metadata.artist} - {metadata.title}.opus"
                        if await cloud_cache.download(metadata.artist, metadata.title, local_dest):
                            logger.info(f"☁️ [PreProcessor] Downloaded from rclone: {metadata.title}")
                            return local_dest
            except Exception as e:
                logger.debug(f"[PreProcessor] Cloud cache check failed: {e}")
            
            # Step 3: Download via yt-dlp (background, non-blocking)
            try:
                play_cog = self.bot.get_cog('PlayCommand')
                if play_cog and hasattr(play_cog, 'youtube_downloader'):
                    from database.models import TrackInfo as TI
                    track_info = TI(
                        title=metadata.title,
                        artist=metadata.artist,
                        duration=getattr(metadata, 'duration', 0)
                    )
                    
                    audio_result = await play_cog._download_with_fallback(track_info, None)
                    
                    if audio_result and audio_result.file_path and audio_result.file_path.exists():
                        logger.info(f"⬇️ [PreProcessor] Downloaded: {metadata.title}")
                        
                        # Upload to cloud cache in background
                        try:
                            from services.storage import get_cloud_cache
                            cloud_cache = get_cloud_cache()
                            if cloud_cache and cloud_cache.is_enabled:
                                asyncio.create_task(
                                    cloud_cache.upload(
                                        audio_result.file_path,
                                        metadata.artist,
                                        metadata.title
                                    )
                                )
                                logger.info(f"☁️ [PreProcessor] Uploading to rclone: {metadata.title}")
                        except Exception as e:
                            logger.debug(f"[PreProcessor] Cloud upload failed: {e}")
                        
                        return audio_result.file_path
                        
            except Exception as e:
                logger.warning(f"[PreProcessor] Download failed for {metadata.title}: {e}")
            
            return None
            
        except Exception as e:
            logger.error(f"[PreProcessor] Audio cache error: {e}")
            return None
    
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
