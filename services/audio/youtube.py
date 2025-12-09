"""YouTube Music downloader using yt-dlp - Force music.youtube.com"""

import asyncio
from pathlib import Path
from typing import Optional
import json
import re

from .base import BaseDownloader
from database.models import AudioResult, TrackInfo
from config.constants import AudioSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('audio.youtube')


class YouTubeDownloader(BaseDownloader):
    """YouTube Music downloader - Forces download from music.youtube.com"""
    
    def __init__(self, download_dir: Path):
        """Initialize YouTube Music downloader"""
        super().__init__(download_dir)
        self.source = AudioSource.YOUTUBE_MUSIC
        
        # Force YouTube Music domain
        self.ytmusic_domain = "music.youtube.com"
        
        # Verify yt-dlp is installed
        self._verify_ytdlp()
    
    def _verify_ytdlp(self) -> None:
        """Verify yt-dlp is installed and accessible"""
        try:
            import yt_dlp
            logger.info(f"yt-dlp version: {yt_dlp.version.__version__}")
        except ImportError:
            logger.error("yt-dlp not installed! Install with: pip install yt-dlp")
            raise RuntimeError("yt-dlp not installed")
    
    def _convert_to_ytmusic_url(self, url: str) -> str:
        """Convert any YouTube URL to YouTube Music URL"""
        # Extract video ID using regex
        video_id_pattern = r'(?:v=|/)([a-zA-Z0-9_-]{11})'
        match = re.search(video_id_pattern, url)
        
        if match:
            video_id = match.group(1)
            ytmusic_url = f"https://music.youtube.com/watch?v={video_id}"
            logger.info(f"Converted to YouTube Music: {video_id}")
            return ytmusic_url
        
        return url
    
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for track on YouTube Music (forced)
        
        Args:
            query: Search query or YouTube URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        logger.info(f"Searching YouTube Music: {query}")
        
        try:
            # Convert to YouTube Music URL if it's a YouTube link
            if 'youtube.com' in query or 'youtu.be' in query:
                query = self._convert_to_ytmusic_url(query)
                logger.info(f"Using YouTube Music URL: {query}")
            
            # Use yt-dlp to search/get info
            search_query = query if query.startswith('http') else f"ytsearch1:{query}"
            
            command = [
                'yt-dlp',
                '--dump-json',
                '--no-playlist',
                '--default-search', 'ytsearch1',
                '--no-check-certificate',
                '--geo-bypass',
                '--extractor-args', 'youtube:player_client=android_music',  # Force Music client
                search_query
            ]
            
            # Add cookies if available
            cookies_added = False
            for cookie_file in [Settings.YOUTUBE_COOKIES, Settings.SPOTIFY_COOKIES]:
                if cookie_file.exists() and not cookies_added:
                    command.extend(['--cookies', str(cookie_file)])
                    cookies_added = True
                    break
            
            stdout, stderr, returncode = await self._run_command(command, timeout=30)
            
            if returncode != 0:
                logger.warning(f"yt-dlp search failed: {stderr}")
                return None
            
            # Parse JSON output
            try:
                track_data = json.loads(stdout)
                
                # Extract info
                title_full = track_data.get('title', 'Unknown')
                artist = track_data.get('uploader', 'Unknown')
                duration = track_data.get('duration', 0)
                video_id = track_data.get('id', None)
                
                # Get thumbnail (highest quality)
                thumbnail = None
                thumbnails = track_data.get('thumbnails', [])
                if thumbnails:
                    # Get highest resolution thumbnail
                    thumbnail = thumbnails[-1].get('url')
                
                # Try to parse "Artist - Title" format
                if ' - ' in title_full:
                    parts = title_full.split(' - ', 1)
                    artist = parts[0]
                    title = parts[1]
                else:
                    title = title_full
                
                # Force YouTube Music URL
                ytmusic_url = f"https://music.youtube.com/watch?v={video_id}" if video_id else None
                
                logger.info(f"Found on YouTube Music: {title} - {artist}")
                
                return TrackInfo(
                    title=title,
                    artist=artist,
                    duration=duration,
                    url=ytmusic_url,
                    track_id=video_id,
                    thumbnail_url=thumbnail
                )
            
            except json.JSONDecodeError:
                logger.error("Failed to parse yt-dlp output")
                return None
        
        except Exception as e:
            logger.error(f"YouTube Music search failed: {e}", exc_info=True)
            return None
    
    async def download(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio from YouTube Music
        
        Args:
            track_info: Track information
        
        Returns:
            AudioResult with download result
        
        Raises:
            Exception if download fails
        """
        logger.info(f"Downloading from YouTube Music: {track_info}")
        
        try:
            # Get output path
            output_path = self._get_output_path(track_info, 'opus')
            
            # Convert URL to YouTube Music if needed
            url = track_info.url
            if url and 'youtube.com/watch' in url and 'music.youtube.com' not in url:
                url = self._convert_to_ytmusic_url(url)
            elif not url:
                # If no URL, search
                url = f"ytsearch1:{track_info.artist} - {track_info.title}"
            
            logger.info(f"Downloading from: {url}")
            
            # Build yt-dlp command optimized for YouTube Music
            command = [
                'yt-dlp',
                url,
                '-f', 'bestaudio[ext=m4a]/bestaudio/best',
                '-x',  # Extract audio
                '--audio-format', 'opus',
                '--audio-quality', f"{Settings.AUDIO_BITRATE}k",
                '-o', str(output_path.with_suffix('')),  # yt-dlp adds extension
                '--no-playlist',
                '--no-warnings',
                '--geo-bypass',
                '--embed-thumbnail',  # Embed artwork!
                '--add-metadata',  # Add metadata
                '--extractor-args', 'youtube:player_client=android_music',  # Force Music client
                '--postprocessor-args', f'ffmpeg:-b:a {Settings.AUDIO_BITRATE}k'
            ]
            
            # Add cookies if available
            if Settings.YOUTUBE_COOKIES.exists():
                try:
                    if Settings.YOUTUBE_COOKIES.stat().st_size > 0:
                        command.extend(['--cookies', str(Settings.YOUTUBE_COOKIES)])
                        logger.debug(f"Using YouTube cookies")
                except Exception as e:
                    logger.debug(f"Could not add cookies: {e}")
            
            logger.debug(f"Running yt-dlp download...")
            
            # Run download
            stdout, stderr, returncode = await self._run_command(command, timeout=300)
            
            if returncode != 0:
                error_msg = f"yt-dlp failed with code {returncode}: {stderr}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Wait for file to be written
            await asyncio.sleep(1.0)
            
            # Verify file exists
            if not output_path.exists():
                # Try to find the downloaded file
                possible_files = list(self.download_dir.glob(f"*{track_info.title}*.opus"))
                if not possible_files:
                    possible_files = list(self.download_dir.glob("*.opus"))
                    # Get most recent
                    if possible_files:
                        possible_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                
                if possible_files:
                    output_path = possible_files[0]
                    logger.info(f"Found downloaded file: {output_path.name}")
                else:
                    raise FileNotFoundError(f"Downloaded file not found: {output_path}")
            
            logger.info(f"✓ Downloaded from YouTube Music: {output_path.name}")
            logger.info(f"  Artwork embedded: Yes")
            logger.info(f"  Metadata added: Yes")
            
            return AudioResult(
                file_path=output_path,
                title=track_info.title,
                artist=track_info.artist,
                duration=track_info.duration,
                source=AudioSource.YOUTUBE_MUSIC,
                bitrate=Settings.AUDIO_BITRATE,
                format='opus',
                sample_rate=Settings.AUDIO_SAMPLE_RATE
            )
        
        except Exception as e:
            logger.error(f"YouTube Music download failed: {e}", exc_info=True)
            raise
