"""
Rclone Audio Cache - Store audio files on mounted Google Drive

Uses Rclone mounted path (e.g., G:/audio on Windows) for cloud storage.
Simpler and faster than FTP - just file operations on mounted path.
"""

import hashlib
import shutil
from pathlib import Path
from typing import Optional
import os

from config.logging_config import get_logger
from config.settings import Settings

logger = get_logger('storage.rclone')


class RcloneAudioCache:
    """
    Rclone-based audio cache using mounted Google Drive.
    
    Mount command: rclone mount gdrive:SONORA-Cache G: --vfs-cache-mode full
    Then set RCLONE_CACHE_PATH=G:/audio in .env
    """
    
    def __init__(self):
        """Initialize Rclone cache with settings from environment."""
        self.cache_path = Settings.RCLONE_CACHE_PATH
        self._enabled = Settings.RCLONE_CACHE_ENABLED
        
        if self._enabled:
            if self.cache_path.exists():
                logger.info(f"Rclone Cache initialized: {self.cache_path}")
            else:
                logger.warning(f"Rclone Cache path not found: {self.cache_path}")
                logger.warning("Make sure Rclone is mounted. Run: rclone mount gdrive:SONORA-Cache G: --vfs-cache-mode full")
                self._enabled = False
        else:
            logger.info("Rclone Cache disabled (RCLONE_CACHE_ENABLED=false)")
    
    @property
    def is_enabled(self) -> bool:
        """Check if Rclone cache is enabled and path exists."""
        return self._enabled and self.cache_path.exists()
    
    def _generate_cache_key(self, artist: str, title: str) -> str:
        """
        Generate unique cache key for a track.
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            Filename-safe cache key
        """
        # Normalize and hash for consistent filename
        normalized = f"{artist.lower().strip()}-{title.lower().strip()}"
        hash_suffix = hashlib.md5(normalized.encode()).hexdigest()[:8]
        
        # Clean filename
        safe_name = "".join(c for c in normalized if c.isalnum() or c in "- _").strip()
        safe_name = safe_name[:50]  # Limit length
        
        return f"{safe_name}_{hash_suffix}.opus"
    
    def _get_cache_file_path(self, artist: str, title: str) -> Path:
        """Get full path to cache file."""
        cache_key = self._generate_cache_key(artist, title)
        return self.cache_path / cache_key
    
    async def exists(self, artist: str, title: str) -> bool:
        """
        Check if track exists in Rclone cache.
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            True if file exists in cache
        """
        if not self.is_enabled:
            return False
        
        cache_file = self._get_cache_file_path(artist, title)
        exists = cache_file.exists()
        
        if exists:
            logger.debug(f"Rclone cache hit: {cache_file.name}")
        
        return exists
    
    async def upload(self, local_path: Path, artist: str, title: str) -> bool:
        """
        Copy audio file to Rclone cache (Google Drive mount).
        
        Args:
            local_path: Local file path
            artist: Artist name
            title: Track title
        
        Returns:
            True if copy successful
        """
        if not self.is_enabled:
            return False
        
        if not local_path.exists():
            logger.warning(f"Cannot upload - file not found: {local_path}")
            return False
        
        # VALIDATE: Minimum file size (500KB = ~30 seconds of opus audio)
        # This prevents corrupt/incomplete files from being cached
        MIN_FILE_SIZE_KB = 500
        file_size_kb = local_path.stat().st_size / 1024
        
        if file_size_kb < MIN_FILE_SIZE_KB:
            logger.warning(f"File too small to cache: {local_path.name} ({file_size_kb:.0f}KB < {MIN_FILE_SIZE_KB}KB minimum)")
            logger.warning(f"Skipping upload - file may be corrupt or incomplete")
            return False
        
        cache_file = self._get_cache_file_path(artist, title)
        
        try:
            # Ensure cache directory exists
            self.cache_path.mkdir(parents=True, exist_ok=True)
            
            # Copy file to Rclone mount
            shutil.copy2(local_path, cache_file)
            
            file_size = local_path.stat().st_size / (1024 * 1024)
            logger.info(f"Uploaded to Rclone: {cache_file.name} ({file_size:.1f}MB)")
            return True
            
        except Exception as e:
            logger.error(f"Rclone upload failed: {e}")
            return False
    
    async def download(self, artist: str, title: str, local_path: Path) -> bool:
        """
        Copy audio file from Rclone cache to local.
        
        Args:
            artist: Artist name
            title: Track title
            local_path: Where to save the file locally
        
        Returns:
            True if copy successful
        """
        if not self.is_enabled:
            return False
        
        cache_file = self._get_cache_file_path(artist, title)
        
        if not cache_file.exists():
            return False
        
        try:
            # Ensure parent directory exists
            local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy from Rclone mount to local
            shutil.copy2(cache_file, local_path)
            
            file_size = cache_file.stat().st_size / (1024 * 1024)
            logger.info(f"📥 Downloaded from Rclone: {cache_file.name} ({file_size:.1f}MB)")
            return True
            
        except Exception as e:
            logger.error(f"Rclone download failed: {e}")
            return False
    
    async def delete(self, artist: str, title: str) -> bool:
        """
        Delete audio file from Rclone cache.
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            True if deletion successful
        """
        if not self.is_enabled:
            return False
        
        cache_file = self._get_cache_file_path(artist, title)
        
        try:
            if cache_file.exists():
                cache_file.unlink()
                logger.info(f"🗑️ Deleted from Rclone: {cache_file.name}")
                return True
            return False
        except Exception as e:
            logger.error(f"Rclone delete failed: {e}")
            return False
    
    async def get_cache_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dict with file count and total size
        """
        if not self.is_enabled:
            return {'enabled': False}
        
        try:
            audio_files = list(self.cache_path.glob('*.opus'))
            audio_files.extend(self.cache_path.glob('*.mp3'))
            audio_files.extend(self.cache_path.glob('*.m4a'))
            
            total_size = sum(f.stat().st_size for f in audio_files if f.exists())
            
            return {
                'enabled': True,
                'connected': True,
                'file_count': len(audio_files),
                'total_size_mb': total_size / (1024 * 1024),
                'total_size_gb': total_size / (1024 * 1024 * 1024),
                'cache_path': str(self.cache_path)
            }
        except Exception as e:
            return {'enabled': True, 'connected': False, 'error': str(e)}
    
    async def cleanup_old_files(self, max_age_days: int = 7, size_limit_gb: float = 100.0) -> dict:
        """
        Clean up old files from Rclone cache.
        
        With Google Drive 2TB, we can be less aggressive than FTP.
        
        Args:
            max_age_days: Delete files older than this (default 7 days)
            size_limit_gb: If exceeded, use stricter cleanup (default 100GB)
        
        Returns:
            Dict with cleanup stats
        """
        if not self.is_enabled:
            return {'enabled': False}
        
        try:
            import time
            from datetime import datetime
            
            audio_files = list(self.cache_path.glob('*.opus'))
            audio_files.extend(self.cache_path.glob('*.mp3'))
            audio_files.extend(self.cache_path.glob('*.m4a'))
            
            # Calculate total size and collect file info
            total_size = 0
            file_info = []
            
            for f in audio_files:
                try:
                    stat = f.stat()
                    file_info.append({
                        'path': f,
                        'size': stat.st_size,
                        'mtime': datetime.fromtimestamp(stat.st_mtime)
                    })
                    total_size += stat.st_size
                except:
                    pass
            
            total_size_gb = total_size / (1024 * 1024 * 1024)
            
            # Determine cleanup threshold
            if total_size_gb > size_limit_gb:
                age_threshold = 3  # Stricter 3-day limit
                logger.warning(f"Rclone cache near limit ({total_size_gb:.1f}GB), using 3-day cleanup")
            else:
                age_threshold = max_age_days
            
            # Delete old files
            now = datetime.now()
            deleted_count = 0
            deleted_size = 0
            
            for info in file_info:
                age_days = (now - info['mtime']).days
                
                if age_days >= age_threshold:
                    try:
                        info['path'].unlink()
                        deleted_count += 1
                        deleted_size += info['size']
                        logger.info(f"🗑️ Deleted old cache: {info['path'].name} (age: {age_days}d)")
                    except:
                        pass
            
            return {
                'enabled': True,
                'connected': True,
                'total_files': len(audio_files),
                'total_size_gb': total_size_gb,
                'deleted_files': deleted_count,
                'deleted_size_mb': deleted_size / (1024 * 1024),
                'age_threshold_days': age_threshold
            }
            
        except Exception as e:
            logger.error(f"Rclone cleanup error: {e}")
            return {'enabled': True, 'connected': False, 'error': str(e)}


# Global instance
_rclone_cache: Optional[RcloneAudioCache] = None


def get_rclone_cache() -> RcloneAudioCache:
    """Get or create global Rclone cache instance."""
    global _rclone_cache
    if _rclone_cache is None:
        _rclone_cache = RcloneAudioCache()
    return _rclone_cache
