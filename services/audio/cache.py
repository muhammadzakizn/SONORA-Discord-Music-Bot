"""Audio Cache Manager - Manages cached audio files with size limits and expiry"""

import os
import time
from pathlib import Path
from typing import Optional, List, Tuple
from datetime import datetime, timedelta

from config.logging_config import get_logger

logger = get_logger('audio.cache')


class CacheManager:
    """
    Manages audio file cache with:
    - 2GB storage limit (configurable)
    - Auto-delete files not used for 3 days (configurable)
    - Track last access time for LRU eviction
    """
    
    def __init__(
        self, 
        cache_dir: Path, 
        max_size_gb: float = 2.0,
        max_age_days: int = 3
    ):
        """
        Initialize cache manager
        
        Args:
            cache_dir: Directory for cached files
            max_size_gb: Maximum cache size in GB (default: 2GB)
            max_age_days: Delete files older than this (default: 3 days)
        """
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_size_bytes = int(max_size_gb * 1024 * 1024 * 1024)  # Convert GB to bytes
        self.max_age_seconds = max_age_days * 24 * 60 * 60  # Convert days to seconds
        
        logger.info(f"CacheManager initialized: max_size={max_size_gb}GB, max_age={max_age_days}days")
        
        # Run initial cleanup
        self.cleanup()
    
    def get_cache_stats(self) -> dict:
        """
        Get cache statistics
        
        Returns:
            Dict with total_size, file_count, max_size, etc.
        """
        total_size = 0
        file_count = 0
        
        for file in self.cache_dir.iterdir():
            if file.is_file():
                total_size += file.stat().st_size
                file_count += 1
        
        return {
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'total_size_gb': round(total_size / (1024 * 1024 * 1024), 3),
            'file_count': file_count,
            'max_size_gb': self.max_size_bytes / (1024 * 1024 * 1024),
            'usage_percent': round((total_size / self.max_size_bytes) * 100, 1) if self.max_size_bytes > 0 else 0
        }
    
    def touch_file(self, file_path: Path) -> None:
        """
        Update file access time (for LRU tracking)
        
        Args:
            file_path: Path to file
        """
        try:
            if file_path.exists():
                # Update access time to now
                os.utime(file_path, None)
                logger.debug(f"Touched cache file: {file_path.name}")
        except Exception as e:
            logger.debug(f"Could not touch file: {e}")
    
    def cleanup(self) -> int:
        """
        Clean up cache:
        1. Delete files older than max_age_days
        2. Delete oldest files if over size limit
        
        Returns:
            Number of files deleted
        """
        deleted_count = 0
        now = time.time()
        
        try:
            # Get all files with their stats
            files_with_stats: List[Tuple[Path, float, int]] = []
            
            for file in self.cache_dir.iterdir():
                if not file.is_file():
                    continue
                
                # Skip non-audio files
                if not file.suffix.lower() in ['.opus', '.m4a', '.mp3', '.ogg', '.webm']:
                    continue
                
                try:
                    stat = file.stat()
                    access_time = stat.st_atime
                    size = stat.st_size
                    files_with_stats.append((file, access_time, size))
                except Exception:
                    continue
            
            # Step 1: Delete files older than max_age_days
            for file, access_time, size in files_with_stats[:]:
                age_seconds = now - access_time
                
                if age_seconds > self.max_age_seconds:
                    try:
                        file.unlink()
                        deleted_count += 1
                        files_with_stats.remove((file, access_time, size))
                        logger.info(f"🗑️ Deleted old cache file: {file.name} (age: {age_seconds/86400:.1f} days)")
                    except Exception as e:
                        logger.warning(f"Could not delete old file: {e}")
            
            # Step 2: Check total size and delete oldest if over limit
            total_size = sum(size for _, _, size in files_with_stats)
            
            if total_size > self.max_size_bytes:
                # Sort by access time (oldest first)
                files_with_stats.sort(key=lambda x: x[1])
                
                bytes_to_free = total_size - self.max_size_bytes
                freed = 0
                
                for file, access_time, size in files_with_stats:
                    if freed >= bytes_to_free:
                        break
                    
                    try:
                        file.unlink()
                        deleted_count += 1
                        freed += size
                        logger.info(f"🗑️ Deleted cache file (size limit): {file.name} (freed: {size/1024/1024:.1f}MB)")
                    except Exception as e:
                        logger.warning(f"Could not delete file for size limit: {e}")
                
                logger.info(f"Cache cleanup freed: {freed/1024/1024:.1f}MB")
            
            if deleted_count > 0:
                logger.info(f"Cache cleanup complete: {deleted_count} files deleted")
            
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
        
        return deleted_count
    
    def ensure_space(self, needed_bytes: int = 50 * 1024 * 1024) -> bool:
        """
        Ensure there's enough space for a new download
        
        Args:
            needed_bytes: Bytes needed (default: 50MB for typical audio file)
        
        Returns:
            True if space available, False otherwise
        """
        stats = self.get_cache_stats()
        available = self.max_size_bytes - stats['total_size_bytes']
        
        if available >= needed_bytes:
            return True
        
        # Need to free space
        logger.info(f"Cache full, need to free {(needed_bytes - available)/1024/1024:.1f}MB")
        self.cleanup()
        
        # Check again
        stats = self.get_cache_stats()
        available = self.max_size_bytes - stats['total_size_bytes']
        return available >= needed_bytes


# Global cache manager instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager(cache_dir: Path = None) -> CacheManager:
    """
    Get or create global cache manager instance
    
    Args:
        cache_dir: Cache directory (required on first call)
    
    Returns:
        CacheManager instance
    """
    global _cache_manager
    
    if _cache_manager is None:
        if cache_dir is None:
            raise ValueError("cache_dir required on first call")
        _cache_manager = CacheManager(cache_dir)
    
    return _cache_manager
