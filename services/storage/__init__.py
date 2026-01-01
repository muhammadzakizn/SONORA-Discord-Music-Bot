"""Storage services package"""

from .ftp_storage import FTPAudioCache, get_ftp_cache
from .rclone_storage import RcloneAudioCache, get_rclone_cache
from config.settings import Settings


def get_cloud_cache():
    """
    Get the active cloud cache - prefers Rclone over FTP.
    
    Returns:
        RcloneAudioCache or FTPAudioCache instance
    """
    # Prefer Rclone (Google Drive mount) if enabled
    if Settings.RCLONE_CACHE_ENABLED:
        cache = get_rclone_cache()
        if cache.is_enabled:
            return cache
    
    # Fall back to FTP
    return get_ftp_cache()


__all__ = [
    'FTPAudioCache', 'get_ftp_cache',
    'RcloneAudioCache', 'get_rclone_cache',
    'get_cloud_cache'
]
