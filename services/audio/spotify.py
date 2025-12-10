"""Spotify audio downloader using spotdl"""

import asyncio
from pathlib import Path
from typing import Optional
import json

from .base import BaseDownloader
from database.models import AudioResult, TrackInfo
from config.constants import AudioSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('audio.spotify')


class SpotifyDownloader(BaseDownloader):
    """Spotify audio downloader using spotdl"""
    
    _spotdl_instance = None  # Singleton instance
    
    def __init__(self, download_dir: Path):
        """Initialize Spotify downloader"""
        super().__init__(download_dir)
        self.source = AudioSource.SPOTIFY
        
        # Verify spotdl is installed
        self._verify_spotdl()
        
        # Initialize spotdl instance (singleton)
        if SpotifyDownloader._spotdl_instance is None:
            self._init_spotdl()
    
    def _verify_spotdl(self) -> None:
        """Verify spotdl is installed and accessible"""
        try:
            import spotdl
            logger.info(f"spotdl version: {spotdl.__version__}")
        except ImportError:
            logger.error("spotdl not installed! Install with: pip install spotdl")
            raise RuntimeError("spotdl not installed")
    
    def _init_spotdl(self) -> None:
        """Initialize spotdl - verify CLI is available
        
        We use spotdl CLI instead of Python API because:
        1. CLI automatically uses spotdl's built-in default Spotify credentials
        2. No authentication issues with Python API
        3. More reliable for server environments
        """
        try:
            import subprocess
            
            # Just verify spotdl CLI is available
            result = subprocess.run(
                ['spotdl', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info(f"spotdl CLI verified: {version}")
                SpotifyDownloader._spotdl_instance = True  # Mark as available
            else:
                logger.error(f"spotdl CLI check failed: {result.stderr}")
                SpotifyDownloader._spotdl_instance = None
        
        except Exception as e:
            logger.error(f"Failed to verify spotdl CLI: {e}")
            SpotifyDownloader._spotdl_instance = None
    
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for track on Spotify using spotdl CLI
        
        Args:
            query: Search query or Spotify URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        if not SpotifyDownloader._spotdl_instance:
            logger.error("Spotdl CLI not available")
            return None
        
        logger.info(f"Searching Spotify via CLI: {query}")
        
        try:
            # Use spotdl CLI to get song info (save mode doesn't download)
            # This uses spotdl's built-in default credentials automatically
            command = [
                'spotdl',
                'url',  # Just get the URL/info, don't download
                query,
                '--print-errors'
            ]
            
            stdout, stderr, returncode = await self._run_command(command, timeout=30)
            
            if returncode != 0:
                # Try alternate approach with 'save' to get metadata
                logger.debug(f"spotdl url failed, trying search approach")
                
                # For non-URL queries, we need a different approach
                # Use the download command with --print-errors to get info
                if not query.startswith('http'):
                    # Search query - use spotdl's search capability
                    search_cmd = [
                        'spotdl',
                        'download',
                        query,
                        '--output', '/dev/null',  # Don't actually save
                        '--print-errors',
                        '--headless'
                    ]
                    stdout, stderr, returncode = await self._run_command(search_cmd, timeout=30)
            
            # Parse output to extract track info
            if stdout:
                lines = stdout.strip().split('\n')
                for line in lines:
                    # spotdl outputs URLs or track names
                    if 'spotify.com/track/' in line or ' - ' in line:
                        # Found track info
                        if ' - ' in line:
                            parts = line.split(' - ', 1)
                            if len(parts) == 2:
                                artist = parts[0].strip()
                                title = parts[1].strip()
                                logger.info(f"Found on Spotify: {title} - {artist}")
                                return TrackInfo(
                                    title=title,
                                    artist=artist,
                                    url=query if query.startswith('http') else None
                                )
            
            logger.warning(f"No Spotify results for: {query}")
            return None
        
        except Exception as e:
            logger.error(f"Spotify CLI search failed: {e}", exc_info=True)
            return None
    
    async def download(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio from Spotify
        
        Args:
            track_info: Track information
        
        Returns:
            AudioResult with download result
        
        Raises:
            Exception if download fails
        """
        logger.info(f"Downloading from Spotify: {track_info}")
        
        try:
            # Get output path
            output_path = self._get_output_path(track_info, 'opus')
            
            # Build spotdl command
            # Note: spotdl v4+ requires bitrate format like '256k' not '256'
            bitrate_str = f"{Settings.AUDIO_BITRATE}k"
            
            # spotdl --output expects a template format, not full path
            # Use the download directory and template format
            output_template = str(self.download_dir / "{artist} - {title}.{output-ext}")
            
            command = [
                'spotdl',
                'download',
                track_info.url or f"{track_info.artist} - {track_info.title}",
                '--output', output_template,  # Use template format
                '--format', 'opus',
                '--bitrate', bitrate_str,  # Changed to '256k' format
                '--threads', '4',
                '--overwrite', 'force'
            ]
            
            # NOTE: We do NOT add custom Spotify credentials
            # spotdl uses its built-in default access which works for all public content
            
            # Add cookies if available
            if Settings.SPOTIFY_COOKIES.exists():
                command.extend(['--cookie-file', str(Settings.SPOTIFY_COOKIES)])
            
            logger.debug(f"Running command: {' '.join(command)}")
            
            # Run download
            stdout, stderr, returncode = await self._run_command(command, timeout=300)
            
            # Log stdout/stderr for debugging
            if stdout:
                logger.debug(f"spotdl stdout: {stdout[:500]}")
            if stderr:
                logger.debug(f"spotdl stderr: {stderr[:500]}")
            
            if returncode != 0:
                error_msg = f"spotdl failed with code {returncode}: {stderr}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Check if spotdl actually downloaded or skipped
            if stdout:
                if "Skipping" in stdout or "already exists" in stdout or "duplicate" in stdout:
                    logger.info(f"spotdl skipped (file exists): {stdout[:200]}")
                    # File already exists! Check cache again after sleep
                    await asyncio.sleep(1.0)
                    
                    # Re-check cache now that we know file should exist
                    cached = self.check_cache(track_info, 'opus')
                    if cached:
                        logger.info(f"✓ Found existing file after skip: {cached.name}")
                        return AudioResult(
                            file_path=cached,
                            title=track_info.title,
                            artist=track_info.artist,
                            duration=track_info.duration,
                            source=AudioSource.SPOTIFY,
                            bitrate=Settings.AUDIO_BITRATE,
                            format='opus',
                            sample_rate=Settings.AUDIO_SAMPLE_RATE
                        )
                    
                elif "Downloaded" in stdout or "Processing" in stdout:
                    logger.debug("spotdl is processing the download")
                elif "Error" in stdout or "Failed" in stdout:
                    logger.error(f"spotdl reported error: {stdout[:300]}")
                    # Continue anyway, maybe file was partially created
            
            # Give spotdl more time to finish writing the file
            # spotdl can take a while to convert and write, especially for longer tracks
            await asyncio.sleep(2.0)
            
            # Log what we expect vs what might be created
            logger.debug(f"Expected output path: {output_path}")
            logger.debug(f"Template used: {output_template}")
            
            # Verify file exists with retry logic (file might not be fully written yet)
            import time
            max_retries = 10  # Increased from 5 to 10 for slow conversions
            retry_delay = 1.0  # Increased from 0.5 to 1.0 second
            
            for retry in range(max_retries):
                if output_path.exists() and output_path.is_file():
                    # Found the expected file, but verify it's completely written
                    # Check file size is stable (not being written)
                    initial_size = output_path.stat().st_size
                    if initial_size > 0:
                        await asyncio.sleep(0.3)  # Wait a bit
                        final_size = output_path.stat().st_size
                        if initial_size == final_size:
                            # File is stable and complete
                            logger.debug(f"File verified: {output_path.name} ({final_size} bytes)")
                            break
                        else:
                            logger.debug(f"File still being written, waiting... ({initial_size} -> {final_size})")
                    else:
                        logger.debug("File exists but size is 0, waiting...")
                        # Continue to search/retry
                
                # spotdl might have used a different filename
                # Try multiple search strategies
                if retry == 0:
                    logger.debug(f"Output path not found or is directory: {output_path}")
                    logger.debug(f"Searching for title: {track_info.title}")
                    logger.debug(f"Searching for artist: {track_info.artist}")
                
                # Strategy 1: Search by title (FILES ONLY, not directories) - case insensitive
                all_opus_files = [f for f in self.download_dir.glob("*.opus") if f.is_file()]
                possible_files = [f for f in all_opus_files if track_info.title.lower() in f.name.lower()]
                
                if retry == 0 and not possible_files:
                    logger.debug(f"No files found with title '{track_info.title}'")
                
                # Strategy 2: Search by artist (FILES ONLY) - case insensitive
                if not possible_files:
                    possible_files = [f for f in all_opus_files if track_info.artist.lower() in f.name.lower()]
                    
                if retry == 0 and not possible_files:
                    logger.debug(f"No files found with artist '{track_info.artist}'")
                
                # Strategy 3: Get the newest .opus file in downloads (FILES ONLY)
                if not possible_files:
                    all_opus = sorted(
                        [f for f in self.download_dir.glob("*.opus") if f.is_file()],
                        key=lambda p: p.stat().st_mtime,
                        reverse=True
                    )
                    if all_opus:
                        # Get file modified in last 10 seconds (recently downloaded)
                        recent_files = [
                            f for f in all_opus 
                            if time.time() - f.stat().st_mtime < 10
                        ]
                        if recent_files:
                            possible_files = recent_files
                
                if possible_files:
                    output_path = possible_files[0]
                    logger.info(f"Found downloaded file: {output_path.name}")
                    
                    # Verify this file is also complete (not being written)
                    initial_size = output_path.stat().st_size
                    if initial_size > 0:
                        await asyncio.sleep(0.3)
                        final_size = output_path.stat().st_size
                        if initial_size == final_size:
                            logger.debug(f"File verified complete: {final_size} bytes")
                            break
                        else:
                            logger.debug(f"File still being written, continuing search...")
                            possible_files = []  # Clear and continue searching
                    else:
                        logger.debug("File size is 0, continuing search...")
                        possible_files = []  # Clear and continue searching
                
                # If not found and not last retry, wait and try again
                if retry < max_retries - 1:
                    logger.debug(f"File not found, retrying... ({retry + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                else:
                    # Last retry failed, list all files to help debug
                    all_files = [f.name for f in self.download_dir.glob("*") if f.is_file()]
                    logger.error(f"Files in downloads: {all_files[:10]}")
                    raise FileNotFoundError(f"Downloaded file not found after {max_retries} retries: {output_path}")
            
            logger.info(f"✓ Downloaded from Spotify: {output_path}")
            
            return AudioResult(
                file_path=output_path,
                title=track_info.title,
                artist=track_info.artist,
                duration=track_info.duration,
                source=AudioSource.SPOTIFY,
                bitrate=Settings.AUDIO_BITRATE,
                format='opus',
                sample_rate=Settings.AUDIO_SAMPLE_RATE
            )
        
        except Exception as e:
            logger.error(f"Spotify download failed: {e}", exc_info=True)
            raise
