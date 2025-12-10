"""Base class for audio downloaders"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
import asyncio

from database.models import AudioResult, TrackInfo
from config.constants import AudioSource
from config.logging_config import get_logger

logger = get_logger('audio.base')


class BaseDownloader(ABC):
    """Abstract base class for audio downloaders"""
    
    def __init__(self, download_dir: Path):
        """
        Initialize downloader
        
        Args:
            download_dir: Directory to save downloaded files
        """
        self.download_dir = download_dir
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.source = AudioSource.UNKNOWN
    
    @abstractmethod
    async def download(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio for track
        
        Args:
            track_info: Track information
        
        Returns:
            AudioResult with download result
        
        Raises:
            Exception if download fails
        """
        pass
    
    @abstractmethod
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for track
        
        Args:
            query: Search query
        
        Returns:
            TrackInfo if found, None otherwise
        """
        pass
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to remove invalid characters
        
        Args:
            filename: Original filename
        
        Returns:
            Sanitized filename
        """
        # Remove invalid characters
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        
        return filename
    
    def _get_output_path(self, track_info: TrackInfo, extension: str = 'opus') -> Path:
        """
        Get output file path for track
        
        Args:
            track_info: Track information
            extension: File extension (default: opus)
        
        Returns:
            Path object for output file
        """
        filename = f"{track_info.artist} - {track_info.title}"
        filename = self._sanitize_filename(filename)
        return self.download_dir / f"{filename}.{extension}"
    
    def check_cache(self, track_info: TrackInfo, extension: str = 'opus') -> Optional[Path]:
        """
        Check if track already exists in downloads folder (cache)
        
        Args:
            track_info: Track information
            extension: File extension (default: opus)
        
        Returns:
            Path to cached file if exists and valid, None otherwise
        """
        # Check exact match first
        expected_path = self._get_output_path(track_info, extension)
        if expected_path.exists() and expected_path.is_file():
            # Verify file is not empty
            if expected_path.stat().st_size > 0:
                logger.info(f"✓ Found in cache: {expected_path.name}")
                return expected_path
        
        # Try fuzzy search (case-insensitive, handles slight variations)
        safe_title = self._sanitize_filename(track_info.title).lower()
        safe_artist = self._sanitize_filename(track_info.artist).lower()
        
        # Skip fuzzy match if artist or title is empty (too risky)
        if not safe_artist or not safe_title:
            logger.debug(f"Skipping fuzzy match (missing artist or title)")
            return None
        
        for file in self.download_dir.glob(f"*.{extension}"):
            if not file.is_file():
                continue
            
            # Check if filename contains both artist and title (case-insensitive)
            file_lower = file.stem.lower()
            
            # Must contain both artist and title
            if safe_artist in file_lower and safe_title in file_lower:
                # Verify file is not empty
                if file.stat().st_size > 0:
                    logger.info(f"✓ Found in cache (fuzzy match): {file.name}")
                    return file
        
        # Not found in cache
        logger.debug(f"Not in cache: {track_info.artist} - {track_info.title}")
        return None
    
    async def _run_command(self, command: list, timeout: int = 300, env: dict = None) -> tuple:
        """
        Run shell command asynchronously
        
        Args:
            command: Command and arguments as list
            timeout: Timeout in seconds
            env: Optional environment variables (None = inherit current, {} = clean)
        
        Returns:
            Tuple of (stdout, stderr, returncode)
        """
        try:
            import os
            
            # If env is None, inherit current environment
            # If env is provided (even empty dict), use it
            proc_env = env if env is not None else None
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=proc_env
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            return (
                stdout.decode('utf-8', errors='ignore'),
                stderr.decode('utf-8', errors='ignore'),
                process.returncode
            )
        
        except asyncio.TimeoutError:
            logger.error(f"Command timeout after {timeout}s: {' '.join(command)}")
            raise
        except Exception as e:
            logger.error(f"Command failed: {e}")
            raise
    
    def cleanup_temp_files(self, pattern: str = "*.tmp") -> None:
        """
        Clean up temporary files
        
        Args:
            pattern: File pattern to match (default: *.tmp)
        """
        try:
            for temp_file in self.download_dir.glob(pattern):
                temp_file.unlink()
                logger.debug(f"Deleted temp file: {temp_file}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp files: {e}")
