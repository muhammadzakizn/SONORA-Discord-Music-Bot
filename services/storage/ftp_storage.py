"""
FTP Audio Cache - Store audio files on remote FTP server

Uses Hostinger FTP for 25GB audio cache storage.
Reduces local Pterodactyl storage usage (3GB limit).
"""

import asyncio
import ftplib
import hashlib
from pathlib import Path
from typing import Optional
from io import BytesIO
import os

from config.logging_config import get_logger
from config.settings import Settings

logger = get_logger('storage.ftp')


class FTPAudioCache:
    """
    FTP-based audio cache for remote storage.
    
    Uploads downloaded audio files to Hostinger FTP server.
    Checks cache before downloading to save bandwidth.
    """
    
    def __init__(self):
        """Initialize FTP cache with settings from environment."""
        self.host = Settings.FTP_HOST
        self.user = Settings.FTP_USER
        self.password = Settings.FTP_PASSWORD
        self.directory = Settings.FTP_DIRECTORY
        
        self._ftp: Optional[ftplib.FTP] = None
        self._enabled = bool(self.host and self.user and self.password)
        
        if self._enabled:
            logger.info(f"Cloud Cache (FTP) initialized: {self.host}")
        else:
            logger.debug("FTP fallback not configured - using Rclone or local only")
    
    @property
    def is_enabled(self) -> bool:
        """Check if FTP cache is enabled and configured."""
        return self._enabled
    
    def _connect(self) -> bool:
        """
        Connect to FTP server.
        
        Returns:
            True if connected successfully
        """
        if not self._enabled:
            return False
        
        try:
            self._ftp = ftplib.FTP(self.host, timeout=30)
            self._ftp.login(self.user, self.password)
            
            # Navigate to cache directory
            try:
                self._ftp.cwd(self.directory)
            except ftplib.error_perm:
                # Directory doesn't exist, create it
                self._ftp.mkd(self.directory)
                self._ftp.cwd(self.directory)
            
            logger.debug(f"FTP connected: {self.host}{self.directory}")
            return True
            
        except Exception as e:
            logger.error(f"FTP connection failed: {e}")
            self._ftp = None
            return False
    
    def _disconnect(self) -> None:
        """Disconnect from FTP server."""
        if self._ftp:
            try:
                self._ftp.quit()
            except:
                pass
            self._ftp = None
    
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
    
    async def exists(self, artist: str, title: str) -> bool:
        """
        Check if track exists in FTP cache.
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            True if file exists in cache
        """
        if not self._enabled:
            return False
        
        cache_key = self._generate_cache_key(artist, title)
        
        def _check():
            if not self._connect():
                return False
            try:
                files = self._ftp.nlst()
                return cache_key in files
            except:
                return False
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _check)
    
    async def upload(self, local_path: Path, artist: str, title: str) -> bool:
        """
        Upload audio file to FTP cache.
        
        Args:
            local_path: Local file path
            artist: Artist name
            title: Track title
        
        Returns:
            True if upload successful
        """
        if not self._enabled:
            return False
        
        if not local_path.exists():
            logger.warning(f"Cannot upload - file not found: {local_path}")
            return False
        
        cache_key = self._generate_cache_key(artist, title)
        
        def _upload():
            if not self._connect():
                return False
            try:
                with open(local_path, 'rb') as f:
                    self._ftp.storbinary(f'STOR {cache_key}', f)
                
                file_size = local_path.stat().st_size / (1024 * 1024)
                logger.info(f"☁️ Uploaded to FTP: {cache_key} ({file_size:.1f}MB)")
                return True
            except Exception as e:
                logger.error(f"FTP upload failed: {e}")
                return False
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _upload)
    
    async def download(self, artist: str, title: str, local_path: Path) -> bool:
        """
        Download audio file from FTP cache.
        
        Args:
            artist: Artist name
            title: Track title
            local_path: Where to save the file locally
        
        Returns:
            True if download successful
        """
        if not self._enabled:
            return False
        
        cache_key = self._generate_cache_key(artist, title)
        
        def _download():
            if not self._connect():
                return False
            try:
                # Ensure parent directory exists
                local_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(local_path, 'wb') as f:
                    self._ftp.retrbinary(f'RETR {cache_key}', f.write)
                
                file_size = local_path.stat().st_size / (1024 * 1024)
                logger.info(f"📥 Downloaded from FTP: {cache_key} ({file_size:.1f}MB)")
                return True
            except ftplib.error_perm:
                # File not found
                return False
            except Exception as e:
                logger.error(f"FTP download failed: {e}")
                return False
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _download)
    
    async def delete(self, artist: str, title: str) -> bool:
        """
        Delete audio file from FTP cache.
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            True if deletion successful
        """
        if not self._enabled:
            return False
        
        cache_key = self._generate_cache_key(artist, title)
        
        def _delete():
            if not self._connect():
                return False
            try:
                self._ftp.delete(cache_key)
                logger.info(f"🗑️ Deleted from FTP: {cache_key}")
                return True
            except:
                return False
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _delete)
    
    async def get_cache_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dict with file count and total size
        """
        if not self._enabled:
            return {'enabled': False}
        
        def _stats():
            if not self._connect():
                return {'enabled': True, 'connected': False}
            try:
                files = self._ftp.nlst()
                audio_files = [f for f in files if f.endswith(('.opus', '.mp3', '.m4a'))]
                
                total_size = 0
                for f in audio_files:
                    try:
                        size = self._ftp.size(f)
                        if size:
                            total_size += size
                    except:
                        pass
                
                return {
                    'enabled': True,
                    'connected': True,
                    'file_count': len(audio_files),
                    'total_size_mb': total_size / (1024 * 1024)
                }
            except Exception as e:
                return {'enabled': True, 'connected': False, 'error': str(e)}
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _stats)
    
    async def cleanup_old_files(self, max_age_days: int = 2, size_limit_gb: float = 23.0) -> dict:
        """
        Clean up old/unused files from FTP cache.
        
        Rules:
        1. Delete files not used in max_age_days (default 2 days)
        2. If cache > size_limit_gb (23GB), use stricter 1-day limit
        
        Args:
            max_age_days: Delete files older than this (default 2)
            size_limit_gb: If exceeded, use 1-day cleanup (default 23GB)
        
        Returns:
            Dict with cleanup stats
        """
        if not self._enabled:
            return {'enabled': False}
        
        def _cleanup():
            if not self._connect():
                return {'enabled': True, 'connected': False}
            
            try:
                import time
                from datetime import datetime
                
                files = self._ftp.nlst()
                audio_files = [f for f in files if f.endswith(('.opus', '.mp3', '.m4a', '.flac'))]
                
                # Calculate total size
                total_size = 0
                file_info = []
                
                for f in audio_files:
                    try:
                        size = self._ftp.size(f)
                        # Get modification time
                        mdtm_response = self._ftp.sendcmd(f'MDTM {f}')
                        # Response format: "213 YYYYMMDDHHmmss"
                        mdtm_str = mdtm_response.split()[1]
                        mtime = datetime.strptime(mdtm_str, '%Y%m%d%H%M%S')
                        
                        file_info.append({
                            'name': f,
                            'size': size or 0,
                            'mtime': mtime
                        })
                        total_size += size or 0
                    except:
                        pass
                
                total_size_gb = total_size / (1024 * 1024 * 1024)
                
                # Determine cleanup threshold
                if total_size_gb > size_limit_gb:
                    # Near capacity - use stricter 1-day limit
                    age_threshold = 1
                    logger.warning(f"FTP cache near limit ({total_size_gb:.1f}GB), using 1-day cleanup")
                else:
                    age_threshold = max_age_days
                
                # Find old files
                now = datetime.now()
                deleted_count = 0
                deleted_size = 0
                
                for info in file_info:
                    age_days = (now - info['mtime']).days
                    
                    if age_days >= age_threshold:
                        try:
                            self._ftp.delete(info['name'])
                            deleted_count += 1
                            deleted_size += info['size']
                            logger.info(f"🗑️ Deleted old cache: {info['name']} (age: {age_days}d)")
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
                logger.error(f"FTP cleanup error: {e}")
                return {'enabled': True, 'connected': False, 'error': str(e)}
            finally:
                self._disconnect()
        
        return await asyncio.get_event_loop().run_in_executor(None, _cleanup)


# Global instance
_ftp_cache: Optional[FTPAudioCache] = None


def get_ftp_cache() -> FTPAudioCache:
    """Get or create global FTP cache instance."""
    global _ftp_cache
    if _ftp_cache is None:
        _ftp_cache = FTPAudioCache()
    return _ftp_cache
