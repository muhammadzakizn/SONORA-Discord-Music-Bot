"""Audio Cache Manager - Smart caching with storage-aware cleanup

Features:
- Keeps downloaded files locally for faster playback
- Smart cleanup based on storage usage and last access time
- Normal mode: Delete files not used for 4 days
- High storage mode (>450GB): Delete files not used for 2 days
- Periodic cleanup runs automatically
"""

import os
import shutil
import time
import asyncio
from pathlib import Path
from typing import Optional, List, Tuple
from datetime import datetime, timedelta

from config.logging_config import get_logger

logger = get_logger('audio.cache')


class SmartCacheManager:
    """
    Smart Audio Cache Manager with storage-aware cleanup.
    
    Cleanup Rules:
    - Files not used for 4 days → delete (normal mode)
    - If total storage > 450GB: Files not used for 2 days → delete
    - Runs cleanup on startup and periodically (every 6 hours)
    """
    
    # Storage thresholds
    HIGH_STORAGE_THRESHOLD_GB = 450  # If used storage > 450GB, switch to aggressive mode
    
    # Cleanup rules (in days)
    NORMAL_UNUSED_DAYS = 4    # Delete after 4 days unused (normal)
    AGGRESSIVE_UNUSED_DAYS = 2  # Delete after 2 days unused (high storage)
    
    # Audio file extensions to manage
    AUDIO_EXTENSIONS = {'.opus', '.m4a', '.mp3', '.ogg', '.webm', '.flac', '.wav'}
    
    def __init__(
        self, 
        cache_dir: Path,
        check_drive: str = "C:\\"  # Drive to check for storage
    ):
        """
        Initialize smart cache manager
        
        Args:
            cache_dir: Directory for cached files
            check_drive: Drive letter to check storage (default: C:)
        """
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.check_drive = check_drive
        
        # Track file access times (in-memory for performance)
        self._access_times: dict[str, float] = {}
        
        # Load existing file access times
        self._load_access_times()
        
        logger.info(
            f"SmartCacheManager initialized: dir={cache_dir}, "
            f"normal_ttl={self.NORMAL_UNUSED_DAYS}d, "
            f"aggressive_ttl={self.AGGRESSIVE_UNUSED_DAYS}d"
        )
    
    def _load_access_times(self) -> None:
        """Load access times from all cached files"""
        try:
            for file in self.cache_dir.rglob('*'):
                if file.is_file() and file.suffix.lower() in self.AUDIO_EXTENSIONS:
                    try:
                        stat = file.stat()
                        # Use modification time as last access
                        self._access_times[str(file)] = stat.st_mtime
                    except:
                        pass
            
            logger.debug(f"Loaded {len(self._access_times)} cached file access times")
        except Exception as e:
            logger.warning(f"Could not load access times: {e}")
    
    def get_storage_usage_gb(self) -> float:
        """Get total used storage on the drive in GB"""
        try:
            usage = shutil.disk_usage(self.check_drive)
            used_gb = usage.used / (1024 ** 3)
            return used_gb
        except Exception as e:
            logger.warning(f"Could not get storage usage: {e}")
            return 0
    
    def get_storage_info(self) -> dict:
        """Get detailed storage information"""
        try:
            usage = shutil.disk_usage(self.check_drive)
            return {
                'total_gb': round(usage.total / (1024 ** 3), 2),
                'used_gb': round(usage.used / (1024 ** 3), 2),
                'free_gb': round(usage.free / (1024 ** 3), 2),
                'used_percent': round((usage.used / usage.total) * 100, 1),
                'high_storage_mode': usage.used / (1024 ** 3) > self.HIGH_STORAGE_THRESHOLD_GB
            }
        except Exception as e:
            logger.warning(f"Could not get storage info: {e}")
            return {'error': str(e)}
    
    def get_cache_stats(self) -> dict:
        """
        Get cache statistics
        
        Returns:
            Dict with total_size, file_count, storage info, etc.
        """
        total_size = 0
        file_count = 0
        oldest_access = time.time()
        newest_access = 0
        
        for file in self.cache_dir.rglob('*'):
            if file.is_file() and file.suffix.lower() in self.AUDIO_EXTENSIONS:
                try:
                    stat = file.stat()
                    total_size += stat.st_size
                    file_count += 1
                    
                    access_time = self._access_times.get(str(file), stat.st_mtime)
                    oldest_access = min(oldest_access, access_time)
                    newest_access = max(newest_access, access_time)
                except:
                    pass
        
        storage_info = self.get_storage_info()
        now = time.time()
        
        return {
            'cache_size_mb': round(total_size / (1024 * 1024), 2),
            'cache_size_gb': round(total_size / (1024 ** 3), 3),
            'file_count': file_count,
            'oldest_file_days': round((now - oldest_access) / 86400, 1) if file_count > 0 else 0,
            'newest_file_days': round((now - newest_access) / 86400, 1) if file_count > 0 else 0,
            'cleanup_mode': 'aggressive' if storage_info.get('high_storage_mode') else 'normal',
            'unused_days_threshold': self.AGGRESSIVE_UNUSED_DAYS if storage_info.get('high_storage_mode') else self.NORMAL_UNUSED_DAYS,
            **storage_info
        }
    
    def touch_file(self, file_path: Path) -> None:
        """
        Update file access time (mark as recently used)
        
        Args:
            file_path: Path to file
        """
        try:
            if file_path.exists():
                now = time.time()
                self._access_times[str(file_path)] = now
                
                # Also update file modification time
                os.utime(file_path, (now, now))
                logger.debug(f"Touched cache file: {file_path.name}")
        except Exception as e:
            logger.debug(f"Could not touch file: {e}")
    
    def mark_file_used(self, file_path: Path) -> None:
        """Alias for touch_file for clearer intent"""
        self.touch_file(file_path)
    
    def is_file_cached(self, artist: str, title: str) -> Optional[Path]:
        """
        Check if a track is cached locally
        
        Args:
            artist: Artist name
            title: Track title
            
        Returns:
            Path to cached file if exists, None otherwise
        """
        # Sanitize for filename matching
        def sanitize(s: str) -> str:
            return ''.join(c for c in s if c.isalnum() or c in (' ', '-', '_')).strip().lower()
        
        artist_clean = sanitize(artist)
        title_clean = sanitize(title)
        
        # Search in cache directory
        for ext in self.AUDIO_EXTENSIONS:
            for file in self.cache_dir.rglob(f'*{ext}'):
                filename_clean = sanitize(file.stem)
                
                # Check if both artist and title are in filename
                if artist_clean and title_clean:
                    if artist_clean in filename_clean and title_clean in filename_clean:
                        # Touch file to update access time
                        self.touch_file(file)
                        return file
        
        return None
    
    def cleanup(self, force_aggressive: bool = False) -> dict:
        """
        Smart cleanup based on storage usage and file access time.
        
        Rules:
        - Normal mode: Delete files not accessed for 4+ days
        - High storage mode (>450GB): Delete files not accessed for 2+ days
        
        Args:
            force_aggressive: Force aggressive cleanup mode
            
        Returns:
            Dict with cleanup statistics
        """
        now = time.time()
        deleted_count = 0
        freed_bytes = 0
        skipped_active = 0
        
        # Check storage to determine cleanup mode
        storage_info = self.get_storage_info()
        is_high_storage = storage_info.get('high_storage_mode', False) or force_aggressive
        
        if is_high_storage:
            max_unused_seconds = self.AGGRESSIVE_UNUSED_DAYS * 24 * 60 * 60
            mode = 'aggressive'
        else:
            max_unused_seconds = self.NORMAL_UNUSED_DAYS * 24 * 60 * 60
            mode = 'normal'
        
        logger.info(
            f"Starting cache cleanup ({mode} mode): "
            f"storage={storage_info.get('used_gb', 0):.1f}GB, "
            f"threshold={self.AGGRESSIVE_UNUSED_DAYS if is_high_storage else self.NORMAL_UNUSED_DAYS} days"
        )
        
        # Get list of files to potentially delete
        files_to_check: List[Tuple[Path, float, int]] = []
        
        try:
            for file in self.cache_dir.rglob('*'):
                if not file.is_file():
                    continue
                
                if file.suffix.lower() not in self.AUDIO_EXTENSIONS:
                    continue
                
                try:
                    stat = file.stat()
                    # Get access time from our tracker, fall back to file mtime
                    access_time = self._access_times.get(str(file), stat.st_mtime)
                    size = stat.st_size
                    files_to_check.append((file, access_time, size))
                except:
                    continue
            
            # Check each file
            for file, access_time, size in files_to_check:
                unused_seconds = now - access_time
                unused_days = unused_seconds / 86400
                
                if unused_seconds > max_unused_seconds:
                    try:
                        file.unlink()
                        deleted_count += 1
                        freed_bytes += size
                        
                        # Remove from access time tracker
                        self._access_times.pop(str(file), None)
                        
                        logger.info(
                            f"🗑️ Deleted unused cache: {file.name} "
                            f"(unused: {unused_days:.1f} days, size: {size/1024/1024:.1f}MB)"
                        )
                    except Exception as e:
                        logger.warning(f"Could not delete {file.name}: {e}")
                else:
                    # File is still fresh, keep it
                    skipped_active += 1
            
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
        
        result = {
            'mode': mode,
            'deleted_count': deleted_count,
            'freed_mb': round(freed_bytes / (1024 * 1024), 2),
            'freed_gb': round(freed_bytes / (1024 ** 3), 3),
            'kept_count': skipped_active,
            'storage_used_gb': storage_info.get('used_gb', 0),
            'threshold_days': self.AGGRESSIVE_UNUSED_DAYS if is_high_storage else self.NORMAL_UNUSED_DAYS
        }
        
        if deleted_count > 0:
            logger.info(
                f"Cache cleanup complete: {deleted_count} files deleted, "
                f"{result['freed_mb']:.1f}MB freed, {skipped_active} files kept"
            )
        else:
            logger.info(f"Cache cleanup complete: No files to delete, {skipped_active} files kept")
        
        return result
    
    async def start_periodic_cleanup(self, interval_hours: float = 6.0) -> None:
        """
        Start periodic cleanup task
        
        Args:
            interval_hours: Hours between cleanups (default: 6)
        """
        while True:
            try:
                await asyncio.sleep(interval_hours * 3600)
                logger.info("Running periodic cache cleanup...")
                self.cleanup()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Periodic cleanup error: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour on error


# Legacy CacheManager for backwards compatibility
class CacheManager(SmartCacheManager):
    """Legacy alias for SmartCacheManager"""
    
    def __init__(
        self, 
        cache_dir: Path, 
        max_size_gb: float = 2.0,  # Ignored - using storage-aware cleanup now
        max_age_days: int = 3       # Ignored - using NORMAL_UNUSED_DAYS
    ):
        super().__init__(cache_dir)
        logger.info(f"✓ CacheManager initialized (Max: {max_size_gb}GB, TTL: {max_age_days} days, Dir: {cache_dir})")
    
    def ensure_space(self, needed_bytes: int = 50 * 1024 * 1024) -> bool:
        """Ensure space available - legacy method, always returns True now"""
        # With 500GB storage, we don't need to pre-check space
        return True


# Global cache manager instance
_cache_manager: Optional[SmartCacheManager] = None


def get_cache_manager(cache_dir: Path = None) -> SmartCacheManager:
    """
    Get or create global cache manager instance
    
    Args:
        cache_dir: Cache directory (required on first call)
    
    Returns:
        SmartCacheManager instance
    """
    global _cache_manager
    
    if _cache_manager is None:
        if cache_dir is None:
            raise ValueError("cache_dir required on first call")
        _cache_manager = SmartCacheManager(cache_dir)
    
    return _cache_manager
