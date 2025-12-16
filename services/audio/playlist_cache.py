"""
Playlist Cache Manager - Smart caching for playlist playback

Features:
- FTP cache priority (check before download)
- Streaming fallback (yt-dlp AAC, 6s buffer)
- Rolling 3-track buffer
- Title verification before FTP upload
- Auto cleanup after playback
"""

import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from database.models import TrackInfo, AudioResult, MetadataInfo
from config.constants import AudioSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('audio.playlist_cache')


@dataclass
class CachedTrack:
    """Represents a cached track ready for playback"""
    track_info: TrackInfo
    audio_path: Optional[Path] = None
    stream_url: Optional[str] = None
    metadata: Optional[MetadataInfo] = None
    is_from_ftp: bool = False
    is_verified: bool = False
    needs_ftp_upload: bool = False


class PlaylistCacheManager:
    """
    Manages playlist caching with FTP priority and rolling buffer.
    
    Flow:
    1. Check FTP cache first
    2. If cached → download from FTP
    3. If not → stream via yt-dlp + background download to FTP
    4. Keep 3 tracks prepared ahead
    5. Delete local files after playback
    """
    
    BUFFER_SIZE = 3  # Keep 3 tracks prepared
    STREAM_BUFFER_SECONDS = 6  # Wait before playing stream
    
    def __init__(self, download_dir: Path):
        """Initialize playlist cache manager."""
        self.download_dir = download_dir
        self.cache_dir = download_dir / 'playlist_cache'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Track states
        self.prepared_tracks: Dict[int, CachedTrack] = {}  # index → CachedTrack
        self.current_index: int = 0
        
        # Background tasks
        self._prepare_tasks: Dict[int, asyncio.Task] = {}
        
        logger.info(f"PlaylistCacheManager initialized: buffer={self.BUFFER_SIZE}")
    
    async def prepare_track(self, index: int, track_info: TrackInfo) -> CachedTrack:
        """
        Prepare a track for playback.
        
        Priority:
        1. Check FTP cache → download from FTP
        2. Not in FTP → download via MusicDL → upload to FTP
        
        Args:
            index: Track index in queue
            track_info: Track information
        
        Returns:
            CachedTrack ready for playback
        """
        logger.info(f"Preparing track {index}: {track_info.title}")
        
        cached = CachedTrack(track_info=track_info)
        
        try:
            from services.storage.ftp_storage import get_ftp_cache
            from services.audio.youtube import YouTubeDownloader
            from services.audio.musicdl_handler import get_musicdl_handler
            
            ftp_cache = get_ftp_cache()
            
            # Step 1: Check FTP cache
            if ftp_cache.is_enabled:
                if await ftp_cache.exists(track_info.artist, track_info.title):
                    logger.info(f"☁️ Found in FTP: {track_info.title}")
                    
                    # Download from FTP to local cache
                    local_path = self.cache_dir / f"{index}_{track_info.artist}_{track_info.title}.opus"
                    if await ftp_cache.download(track_info.artist, track_info.title, local_path):
                        cached.audio_path = local_path
                        cached.is_from_ftp = True
                        cached.is_verified = True  # FTP files are already verified
                        
                        self.prepared_tracks[index] = cached
                        logger.info(f"✓ Loaded from FTP: {local_path.name}")
                        return cached
            
            # Step 2: Not in FTP → Download via MusicDL
            logger.info(f"📥 Downloading: {track_info.title}")
            
            musicdl = get_musicdl_handler()
            
            if musicdl.is_available:
                # Search with title matching (no remixes)
                query = f"{track_info.artist} - {track_info.title}"
                song_info = await musicdl.search_best_quality(query)
                
                if song_info:
                    # Verify title matches
                    if self._verify_title(track_info.title, song_info.get('title', '')):
                        downloaded = await musicdl.download(song_info, self.cache_dir)
                        
                        if downloaded and downloaded.exists():
                            cached.audio_path = downloaded
                            cached.is_verified = True
                            cached.needs_ftp_upload = True  # Upload to FTP later
                            
                            # Background upload to FTP
                            asyncio.create_task(
                                self._upload_to_ftp(track_info.artist, track_info.title, downloaded)
                            )
                            
                            self.prepared_tracks[index] = cached
                            logger.info(f"✓ Downloaded: {downloaded.name}")
                            return cached
                    else:
                        logger.warning(f"Title mismatch: expected '{track_info.title}', got '{song_info.get('title')}'")
            
            # Step 3: MusicDL failed → will need to stream
            logger.info(f"Will stream: {track_info.title} (MusicDL unavailable)")
            cached.needs_ftp_upload = True
            self.prepared_tracks[index] = cached
            return cached
            
        except Exception as e:
            logger.error(f"Failed to prepare track {index}: {e}")
            self.prepared_tracks[index] = cached
            return cached
    
    async def prepare_next_tracks(self, current_index: int, queue: List[TrackInfo]) -> None:
        """
        Prepare the next BUFFER_SIZE tracks ahead.
        
        Args:
            current_index: Current playing track index
            queue: Full queue of tracks
        """
        self.current_index = current_index
        
        for i in range(1, self.BUFFER_SIZE + 1):
            next_idx = current_index + i
            
            if next_idx >= len(queue):
                break  # No more tracks
            
            if next_idx in self.prepared_tracks:
                continue  # Already prepared
            
            if next_idx in self._prepare_tasks:
                continue  # Already preparing
            
            # Start background preparation
            track = queue[next_idx]
            task = asyncio.create_task(self.prepare_track(next_idx, track))
            self._prepare_tasks[next_idx] = task
            logger.debug(f"Started preparing track {next_idx}: {track.title}")
    
    async def get_playable_track(self, index: int, track_info: TrackInfo) -> CachedTrack:
        """
        Get a track ready for playback. Stream if not cached.
        
        Args:
            index: Track index
            track_info: Track information
        
        Returns:
            CachedTrack with audio_path or stream_url
        """
        # Check if already prepared
        if index in self.prepared_tracks:
            cached = self.prepared_tracks[index]
            if cached.audio_path and cached.audio_path.exists():
                return cached
        
        # Wait for preparation if in progress
        if index in self._prepare_tasks:
            try:
                await self._prepare_tasks[index]
                if index in self.prepared_tracks:
                    return self.prepared_tracks[index]
            except:
                pass
        
        # Not ready → stream via yt-dlp
        logger.info(f"🌐 Streaming (not cached): {track_info.title}")
        
        cached = CachedTrack(track_info=track_info)
        
        try:
            from services.audio.youtube import YouTubeDownloader
            
            yt = YouTubeDownloader(self.download_dir)
            stream_url = await yt.get_stream_url(track_info)
            
            if stream_url:
                cached.stream_url = stream_url
                
                # Background: download for FTP cache
                asyncio.create_task(
                    yt.background_download_for_cache(track_info.artist, track_info.title)
                )
        except Exception as e:
            logger.error(f"Failed to get stream URL: {e}")
        
        self.prepared_tracks[index] = cached
        return cached
    
    async def handle_skip(self, from_index: int, to_index: int, queue: List[TrackInfo]) -> CachedTrack:
        """
        Handle user skipping to a different track.
        
        Args:
            from_index: Current track index
            to_index: Target track index
            queue: Full queue
        
        Returns:
            CachedTrack for target track
        """
        logger.info(f"Skip: {from_index} → {to_index}")
        
        # Clean up old preparations
        for idx in list(self.prepared_tracks.keys()):
            if idx < to_index or idx > to_index + self.BUFFER_SIZE:
                self._cleanup_track(idx)
        
        # Get the target track
        if to_index >= len(queue):
            raise ValueError(f"Invalid track index: {to_index}")
        
        target = await self.get_playable_track(to_index, queue[to_index])
        
        # Prepare next tracks
        await self.prepare_next_tracks(to_index, queue)
        
        return target
    
    def _verify_title(self, expected: str, actual: str) -> bool:
        """
        Verify that downloaded title matches expected.
        
        Rejects remixes, covers, DJ versions, etc.
        
        Args:
            expected: Expected title from metadata
            actual: Actual title from download
        
        Returns:
            True if titles match (no unwanted versions)
        """
        expected_lower = expected.lower().strip()
        actual_lower = actual.lower().strip()
        
        # Unwanted keywords
        unwanted = ['remix', 'cover', 'dj', 'bootleg', 'edit', 'mashup', 'live', 'acoustic']
        
        # Check if actual has unwanted keywords that expected doesn't
        for kw in unwanted:
            if kw in actual_lower and kw not in expected_lower:
                logger.warning(f"Title mismatch: '{actual}' contains unwanted '{kw}'")
                return False
        
        # Check if core title is present
        # Remove common suffixes/prefixes
        import re
        clean_expected = re.sub(r'\s*[\(\[].*?[\)\]]', '', expected_lower).strip()
        
        if clean_expected in actual_lower or actual_lower in clean_expected:
            return True
        
        # Fuzzy match - at least 70% of words match
        expected_words = set(clean_expected.split())
        actual_words = set(actual_lower.split())
        
        if len(expected_words) == 0:
            return False
        
        match_ratio = len(expected_words & actual_words) / len(expected_words)
        return match_ratio >= 0.7
    
    async def _upload_to_ftp(self, artist: str, title: str, file_path: Path) -> None:
        """Upload file to FTP cache (background)."""
        try:
            from services.storage.ftp_storage import get_ftp_cache
            ftp = get_ftp_cache()
            
            if ftp.is_enabled:
                await ftp.upload(file_path, artist, title)
                logger.info(f"☁️ Uploaded to FTP: {title}")
        except Exception as e:
            logger.error(f"FTP upload failed: {e}")
    
    def _cleanup_track(self, index: int) -> None:
        """Clean up a track from local cache."""
        if index in self.prepared_tracks:
            cached = self.prepared_tracks[index]
            if cached.audio_path and cached.audio_path.exists():
                try:
                    cached.audio_path.unlink()
                    logger.debug(f"🗑️ Cleaned up: {cached.audio_path.name}")
                except:
                    pass
            del self.prepared_tracks[index]
        
        if index in self._prepare_tasks:
            task = self._prepare_tasks[index]
            if not task.done():
                task.cancel()
            del self._prepare_tasks[index]
    
    def cleanup_played(self, index: int) -> None:
        """
        Clean up after a track has finished playing.
        
        Deletes local cache file immediately.
        
        Args:
            index: Index of played track
        """
        logger.info(f"Cleaning up played track {index}")
        self._cleanup_track(index)
    
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
