"""
Rolling Download Manager - Manages background downloading for playlists

Features:
- 10-track rolling buffer (downloads tracks ahead)
- Downloads next when one finishes
- Cleanup files >100MB after playback
"""

import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Callable, Any
from collections import deque

from database.models import TrackInfo, AudioResult
from config.logging_config import get_logger

logger = get_logger('audio.download_manager')


class RollingDownloadManager:
    """
    Manages rolling buffer of downloaded tracks for seamless playlist playback.
    
    - Keeps BUFFER_SIZE tracks downloaded ahead
    - Downloads next track when one finishes
    - Cleans up files >100MB after playback
    """
    
    BUFFER_SIZE = 10  # Keep 10 tracks ready ahead
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB - delete after play if larger
    
    def __init__(self, downloader):
        """
        Initialize download manager.
        
        Args:
            downloader: YouTubeDownloader instance for downloading
        """
        self.downloader = downloader
        self.queue: List[TrackInfo] = []  # Full playlist queue
        self.downloaded: Dict[int, AudioResult] = {}  # index -> AudioResult
        self.current_index = 0
        self.download_task: Optional[asyncio.Task] = None
        self._is_running = False
        self._download_lock = asyncio.Lock()
        
        logger.info("RollingDownloadManager initialized")
    
    async def start_playlist(
        self, 
        tracks: List[TrackInfo],
        on_first_ready: Optional[Callable] = None
    ) -> Optional[str]:
        """
        Start processing a playlist with streaming first track.
        
        Args:
            tracks: List of tracks in playlist
            on_first_ready: Callback when first track stream URL is ready
        
        Returns:
            Stream URL for first track
        """
        if not tracks:
            logger.warning("No tracks provided")
            return None
        
        self.queue = tracks
        self.downloaded = {}
        self.current_index = 0
        self._is_running = True
        
        logger.info(f"Starting playlist with {len(tracks)} tracks")
        
        # Get stream URL for first track (instant playback)
        first_track = tracks[0]
        stream_url = await self.downloader.get_stream_url(first_track)
        
        if not stream_url:
            logger.warning("Could not get stream URL, falling back to download")
            # Fallback: download first track
            result = await self.downloader.download(first_track)
            if result:
                self.downloaded[0] = result
                return str(result.file_path)
            return None
        
        # Start background download for tracks 2-11 (buffer)
        self.download_task = asyncio.create_task(
            self._download_buffer(start_index=1)
        )
        
        return stream_url
    
    async def _download_buffer(self, start_index: int = 1) -> None:
        """
        Download tracks in background, maintaining rolling buffer.
        
        Args:
            start_index: Starting index in queue to download
        """
        try:
            idx = start_index
            
            while self._is_running and idx < len(self.queue):
                # Only download if within buffer window
                # Current track + BUFFER_SIZE ahead
                if idx > self.current_index + self.BUFFER_SIZE:
                    # Wait until current track advances
                    await asyncio.sleep(1)
                    continue
                
                # Skip if already downloaded
                if idx in self.downloaded:
                    idx += 1
                    continue
                
                track = self.queue[idx]
                logger.info(f"📥 Buffering track {idx + 1}/{len(self.queue)}: {track.title}")
                
                async with self._download_lock:
                    try:
                        result = await self.downloader.download(track)
                        if result and result.is_success:
                            self.downloaded[idx] = result
                            logger.info(f"✅ Buffered: {track.title} ({idx + 1}/{len(self.queue)})")
                        else:
                            logger.warning(f"Failed to buffer: {track.title}")
                    except Exception as e:
                        logger.error(f"Buffer download error: {e}")
                
                idx += 1
                
                # Small delay between downloads
                await asyncio.sleep(0.5)
            
            logger.info("Buffer download complete")
            
        except asyncio.CancelledError:
            logger.debug("Buffer download cancelled")
        except Exception as e:
            logger.error(f"Buffer download error: {e}")
    
    async def get_track(self, index: int) -> Optional[AudioResult]:
        """
        Get a track by index, downloading if not buffered.
        
        Args:
            index: Track index in playlist
        
        Returns:
            AudioResult or None
        """
        if index < 0 or index >= len(self.queue):
            logger.warning(f"Invalid track index: {index}")
            return None
        
        # Check if already downloaded
        if index in self.downloaded:
            logger.info(f"✓ Track {index + 1} ready from buffer")
            return self.downloaded[index]
        
        # Need to download on-demand
        track = self.queue[index]
        logger.info(f"⏳ Track {index + 1} not buffered, downloading: {track.title}")
        
        async with self._download_lock:
            result = await self.downloader.download(track)
            if result and result.is_success:
                self.downloaded[index] = result
                return result
        
        return None
    
    async def advance_to(self, index: int) -> None:
        """
        Advance current position and trigger cleanup + buffer adjustment.
        
        Args:
            index: New current track index
        """
        old_index = self.current_index
        self.current_index = index
        
        logger.info(f"Advanced to track {index + 1}/{len(self.queue)}")
        
        # Cleanup old tracks (those before current)
        await self._cleanup_old_tracks(before_index=index)
        
        # Restart buffer download if needed
        if self.download_task and not self.download_task.done():
            # Buffer is already running
            pass
        else:
            # Restart buffer from new position
            self.download_task = asyncio.create_task(
                self._download_buffer(start_index=index + 1)
            )
    
    async def _cleanup_old_tracks(self, before_index: int) -> None:
        """
        Delete downloaded files for tracks already played.
        
        Only deletes files >100MB to save storage.
        
        Args:
            before_index: Delete tracks before this index
        """
        for idx in list(self.downloaded.keys()):
            if idx < before_index:
                result = self.downloaded[idx]
                
                if result.file_path and result.file_path.exists():
                    try:
                        file_size = result.file_path.stat().st_size
                        file_size_mb = file_size / (1024 * 1024)
                        
                        # Delete if >100MB
                        if file_size > self.MAX_FILE_SIZE:
                            result.file_path.unlink()
                            logger.info(f"🗑️ Deleted large file: {result.file_path.name} ({file_size_mb:.1f}MB)")
                        else:
                            logger.debug(f"Keeping cached: {result.file_path.name} ({file_size_mb:.1f}MB)")
                    except Exception as e:
                        logger.warning(f"Cleanup error: {e}")
                
                # Remove from tracking
                del self.downloaded[idx]
    
    async def stop(self) -> None:
        """Stop all downloads and cleanup."""
        self._is_running = False
        
        if self.download_task:
            self.download_task.cancel()
            try:
                await self.download_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Download manager stopped")
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """Get current buffer status for debugging."""
        return {
            'total_tracks': len(self.queue),
            'current_index': self.current_index,
            'downloaded_count': len(self.downloaded),
            'downloaded_indices': list(self.downloaded.keys()),
            'is_running': self._is_running,
        }


# Global instance
_download_manager: Optional[RollingDownloadManager] = None


def get_download_manager(downloader=None) -> RollingDownloadManager:
    """Get or create global RollingDownloadManager instance."""
    global _download_manager
    if _download_manager is None:
        if downloader is None:
            raise ValueError("Downloader required for first initialization")
        _download_manager = RollingDownloadManager(downloader)
    return _download_manager


def reset_download_manager() -> None:
    """Reset download manager (for testing or cleanup)."""
    global _download_manager
    if _download_manager:
        asyncio.create_task(_download_manager.stop())
    _download_manager = None
