"""
Playlist Cache Manager - Smart caching for playlist playback

Features:
- FTP cache priority (check before download)
- Sequential download queue with lock (ONE at a time)
- Rolling 3-track buffer
- Wait for "Download Success" before next
- Auto cleanup after playback
"""

import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

from database.models import TrackInfo, AudioResult, MetadataInfo
from config.constants import AudioSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('audio.playlist_cache')


class TrackStatus(Enum):
    """Track preparation status"""
    PENDING = "pending"
    CHECKING_FTP = "checking_ftp"
    DOWNLOADING_FTP = "downloading_ftp"
    DOWNLOADING_MUSICDL = "downloading_musicdl"
    UPLOADING_FTP = "uploading_ftp"
    READY = "ready"
    FAILED = "failed"


@dataclass
class CachedTrack:
    """Represents a cached track ready for playback"""
    track_info: TrackInfo
    audio_path: Optional[Path] = None
    stream_url: Optional[str] = None
    metadata: Optional[MetadataInfo] = None
    is_from_ftp: bool = False
    is_verified: bool = False
    status: TrackStatus = TrackStatus.PENDING


class PlaylistCacheManager:
    """
    Manages playlist caching with FTP priority and rolling buffer.
    
    Flow:
    1. Check FTP cache first
    2. If in FTP → download from FTP to local cache
    3. If NOT in FTP → download via MusicDL → upload to FTP
    4. Keep 3 tracks prepared ahead
    5. Delete local files after playback
    6. When track plays → prepare 1 more
    
    IMPORTANT: Downloads are SEQUENTIAL (one at a time)
    """
    
    BUFFER_SIZE = 3  # Keep 3 tracks prepared
    
    def __init__(self, download_dir: Path):
        """Initialize playlist cache manager."""
        self.download_dir = download_dir
        self.cache_dir = download_dir / 'playlist_cache'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Track states
        self.prepared_tracks: Dict[int, CachedTrack] = {}  # index → CachedTrack
        self.current_index: int = 0
        
        # CRITICAL: Download lock - only ONE download at a time
        self._download_lock = asyncio.Lock()
        self._is_preparing = False
        
        logger.info(f"PlaylistCacheManager initialized: buffer={self.BUFFER_SIZE}, cache_dir={self.cache_dir}")
    
    async def check_and_prepare_first_track(self, track: TrackInfo) -> bool:
        """
        Check if first track is in FTP and queue background download if not.
        
        Returns True if track exists in FTP (no download needed).
        """
        try:
            from services.storage.ftp_storage import get_ftp_cache
            ftp_cache = get_ftp_cache()
            
            if not ftp_cache.is_enabled:
                logger.info("FTP cache disabled, will download in background")
                return False
            
            # Check FTP
            logger.info(f"☁️ Checking FTP for first track: {track.title}")
            exists = await ftp_cache.exists(track.artist, track.title)
            
            if exists:
                logger.info(f"☁️ First track found in FTP: {track.title} (no download needed)")
                return True
            else:
                logger.info(f"📥 First track NOT in FTP: {track.title} (will download in background)")
                return False
                
        except Exception as e:
            logger.warning(f"FTP check failed: {e}")
            return False
    
    async def prepare_track(self, index: int, track_info: TrackInfo) -> CachedTrack:
        """
        Prepare a single track for playback.
        
        Priority:
        1. Check FTP cache → download from FTP
        2. Not in FTP → download via MusicDL → upload to FTP
        
        This method acquires the download lock - only ONE can run at a time.
        """
        cached = CachedTrack(track_info=track_info)
        
        async with self._download_lock:
            logger.info(f"{'='*50}")
            logger.info(f"📦 PREPARING TRACK {index}: {track_info.title}")
            logger.info(f"{'='*50}")
            
            try:
                from services.storage.ftp_storage import get_ftp_cache
                from services.audio.musicdl_handler import get_musicdl_handler
                
                ftp_cache = get_ftp_cache()
                
                # ========================================
                # STEP 1: Check FTP cache
                # ========================================
                cached.status = TrackStatus.CHECKING_FTP
                
                if ftp_cache.is_enabled:
                    logger.info(f"[{index}] Checking FTP cache...")
                    
                    if await ftp_cache.exists(track_info.artist, track_info.title):
                        logger.info(f"[{index}] ☁️ FOUND in FTP: {track_info.title}")
                        
                        # Download from FTP to local cache
                        cached.status = TrackStatus.DOWNLOADING_FTP
                        safe_name = f"{index}_{self._safe_filename(track_info.artist)}_{self._safe_filename(track_info.title)}"
                        local_path = self.cache_dir / f"{safe_name}.opus"
                        
                        logger.info(f"[{index}] Downloading from FTP → {local_path.name}")
                        
                        if await ftp_cache.download(track_info.artist, track_info.title, local_path):
                            cached.audio_path = local_path
                            cached.is_from_ftp = True
                            cached.is_verified = True
                            cached.status = TrackStatus.READY
                            
                            self.prepared_tracks[index] = cached
                            logger.info(f"[{index}] ✓ READY (from FTP): {track_info.title}")
                            return cached
                        else:
                            logger.warning(f"[{index}] FTP download failed, trying MusicDL...")
                    else:
                        logger.info(f"[{index}] ❌ NOT in FTP: {track_info.title}")
                
                # ========================================
                # STEP 2: Download via MusicDL
                # ========================================
                cached.status = TrackStatus.DOWNLOADING_MUSICDL
                logger.info(f"[{index}] 📥 Downloading via MusicDL...")
                
                musicdl = get_musicdl_handler()
                
                if not musicdl.is_available:
                    logger.warning(f"[{index}] MusicDL not available")
                    cached.status = TrackStatus.FAILED
                    self.prepared_tracks[index] = cached
                    return cached
                
                # Search with title matching
                query = f"{track_info.artist} - {track_info.title}"
                logger.info(f"[{index}] Searching: {query}")
                
                song_info = await musicdl.search_best_quality(query)
                
                if not song_info:
                    logger.warning(f"[{index}] No results found for: {query}")
                    cached.status = TrackStatus.FAILED
                    self.prepared_tracks[index] = cached
                    return cached
                
                # Verify title matches (no remixes/covers)
                if not self._verify_title(track_info.title, song_info.get('title', '')):
                    logger.warning(f"[{index}] Title mismatch: expected '{track_info.title}', got '{song_info.get('title')}'")
                    
                    # ========================================
                    # FALLBACK: Use yt-dlp for AAC download
                    # ========================================
                    logger.info(f"[{index}] 🔄 Falling back to yt-dlp AAC...")
                    
                    try:
                        from services.audio.youtube import YouTubeDownloader
                        yt_downloader = YouTubeDownloader(self.cache_dir)
                        
                        # Download via yt-dlp
                        audio_result = await yt_downloader.download(track_info)
                        
                        if audio_result and audio_result.is_success and audio_result.file_path:
                            cached.audio_path = audio_result.file_path
                            cached.is_verified = True
                            cached.status = TrackStatus.READY
                            
                            # Upload to FTP
                            if ftp_cache.is_enabled:
                                logger.info(f"[{index}] ☁️ Uploading yt-dlp result to FTP...")
                                asyncio.create_task(
                                    self._upload_to_ftp(track_info.artist, track_info.title, audio_result.file_path)
                                )
                            
                            self.prepared_tracks[index] = cached
                            logger.info(f"[{index}] ✓ READY (yt-dlp fallback): {track_info.title}")
                            logger.info(f"{'='*50}")
                            return cached
                        else:
                            logger.warning(f"[{index}] yt-dlp fallback also failed")
                    except Exception as yt_err:
                        logger.error(f"[{index}] yt-dlp fallback error: {yt_err}")
                    
                    cached.status = TrackStatus.FAILED
                    self.prepared_tracks[index] = cached
                    return cached
                
                # Download - this blocks until complete
                logger.info(f"[{index}] Downloading: {song_info.get('title', 'Unknown')} ({song_info.get('ext', '?')})")
                
                downloaded = await musicdl.download(song_info, self.cache_dir)
                
                if not downloaded or not downloaded.exists():
                    logger.error(f"[{index}] Download failed!")
                    cached.status = TrackStatus.FAILED
                    self.prepared_tracks[index] = cached
                    return cached
                
                # SUCCESS!
                logger.info(f"[{index}] ✓ Download SUCCESS: {downloaded.name}")
                
                cached.audio_path = downloaded
                cached.is_verified = True
                cached.status = TrackStatus.READY
                
                # ========================================
                # STEP 3: Upload to FTP (background, no wait)
                # ========================================
                if ftp_cache.is_enabled:
                    cached.status = TrackStatus.UPLOADING_FTP
                    logger.info(f"[{index}] ☁️ Uploading to FTP (background)...")
                    asyncio.create_task(
                        self._upload_to_ftp(track_info.artist, track_info.title, downloaded)
                    )
                
                cached.status = TrackStatus.READY
                self.prepared_tracks[index] = cached
                logger.info(f"[{index}] ✓ READY: {track_info.title}")
                logger.info(f"{'='*50}")
                return cached
                
            except Exception as e:
                logger.error(f"[{index}] Error preparing track: {e}")
                cached.status = TrackStatus.FAILED
                self.prepared_tracks[index] = cached
                return cached
    
    async def prepare_next_tracks(self, current_index: int, queue: List[TrackInfo]) -> None:
        """
        Prepare the next BUFFER_SIZE tracks ahead - SEQUENTIALLY.
        
        Downloads ONE at a time, waits for completion before next.
        """
        if self._is_preparing:
            logger.debug("Already preparing tracks, skipping")
            return
        
        self._is_preparing = True
        self.current_index = current_index
        
        try:
            prepared_count = 0
            
            for i in range(1, self.BUFFER_SIZE + 1):
                next_idx = current_index + i
                
                if next_idx >= len(queue):
                    logger.info(f"No more tracks to prepare (end of queue)")
                    break
                
                # Skip if already prepared
                if next_idx in self.prepared_tracks:
                    existing = self.prepared_tracks[next_idx]
                    if existing.status == TrackStatus.READY:
                        logger.info(f"Track {next_idx} already ready: {existing.track_info.title}")
                        prepared_count += 1
                        continue
                
                track = queue[next_idx]
                
                # SEQUENTIAL: Prepare this track, wait for completion
                await self.prepare_track(next_idx, track)
                prepared_count += 1
            
            logger.info(f"✓ {prepared_count} tracks prepared and ready in cache")
            
        finally:
            self._is_preparing = False
    
    async def on_track_started(self, index: int, queue: List[TrackInfo]) -> None:
        """
        Called when a track starts playing.
        Prepares the next track to maintain buffer.
        """
        self.current_index = index
        
        # Cleanup played tracks
        for old_idx in list(self.prepared_tracks.keys()):
            if old_idx < index:
                self._cleanup_track(old_idx)
        
        # Check buffer status
        next_needed = index + self.BUFFER_SIZE
        
        if next_needed < len(queue) and next_needed not in self.prepared_tracks:
            track = queue[next_needed]
            logger.info(f"🔄 Track {index} started, preparing track {next_needed}: {track.title}")
            
            # Prepare in background (non-blocking)
            asyncio.create_task(self.prepare_track(next_needed, track))
    
    def get_cached_track(self, index: int) -> Optional[CachedTrack]:
        """Get a prepared track if available."""
        if index in self.prepared_tracks:
            cached = self.prepared_tracks[index]
            if cached.status == TrackStatus.READY and cached.audio_path and cached.audio_path.exists():
                return cached
        return None
    
    def is_track_ready(self, index: int) -> bool:
        """Check if a track is ready for playback."""
        cached = self.get_cached_track(index)
        return cached is not None
    
    def _safe_filename(self, name: str) -> str:
        """Create safe filename from track name."""
        # Remove/replace problematic characters
        for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
            name = name.replace(char, '_')
        return name[:50]  # Limit length
    
    def _verify_title(self, expected: str, actual: str) -> bool:
        """Verify that downloaded title matches expected."""
        expected_lower = expected.lower().strip()
        actual_lower = actual.lower().strip()
        
        # Unwanted keywords
        unwanted = ['remix', 'cover', 'bootleg', 'mashup', 'live version']
        
        for kw in unwanted:
            if kw in actual_lower and kw not in expected_lower:
                return False
        
        # Check if core title is present
        import re
        clean_expected = re.sub(r'\s*[\(\[].*?[\)\]]', '', expected_lower).strip()
        
        if clean_expected in actual_lower or actual_lower in clean_expected:
            return True
        
        # Fuzzy match
        expected_words = set(clean_expected.split())
        actual_words = set(actual_lower.split())
        
        if len(expected_words) == 0:
            return False
        
        match_ratio = len(expected_words & actual_words) / len(expected_words)
        return match_ratio >= 0.6
    
    async def _upload_to_ftp(self, artist: str, title: str, file_path: Path) -> None:
        """Upload file to FTP cache (background)."""
        try:
            from services.storage.ftp_storage import get_ftp_cache
            ftp = get_ftp_cache()
            
            if ftp.is_enabled:
                success = await ftp.upload(file_path, artist, title)
                if success:
                    logger.info(f"☁️ Uploaded to FTP: {title}")
                else:
                    logger.warning(f"FTP upload failed: {title}")
        except Exception as e:
            logger.error(f"FTP upload error: {e}")
    
    def _cleanup_track(self, index: int) -> None:
        """Clean up a track from local cache after playback."""
        if index in self.prepared_tracks:
            cached = self.prepared_tracks[index]
            if cached.audio_path and cached.audio_path.exists():
                try:
                    file_size = cached.audio_path.stat().st_size
                    file_size_mb = file_size / (1024 * 1024)
                    cached.audio_path.unlink()
                    logger.info(f"🗑️ Auto-deleted playlist track: {cached.audio_path.name} ({file_size_mb:.1f}MB)")
                except Exception as e:
                    logger.warning(f"Cleanup error: {e}")
            del self.prepared_tracks[index]
    
    def cleanup_all(self) -> None:
        """Clean up all cached tracks."""
        for index in list(self.prepared_tracks.keys()):
            self._cleanup_track(index)
        logger.info("Cleaned up all cached tracks")


# Global instance
_playlist_cache: Optional[PlaylistCacheManager] = None


def get_playlist_cache() -> PlaylistCacheManager:
    """Get or create global PlaylistCacheManager instance."""
    global _playlist_cache
    if _playlist_cache is None:
        _playlist_cache = PlaylistCacheManager(Settings.DOWNLOADS_DIR)
    return _playlist_cache
