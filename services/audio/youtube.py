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
        
        Uses ytmusicsearch: prefix to force search on music.youtube.com
        Extracts proper track/artist metadata from YouTube Music
        
        Args:
            query: Search query or YouTube URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        logger.info(f"Searching YouTube Music: {query}")
        
        try:
            # Determine search query
            if query.startswith('http'):
                # Convert to YouTube Music URL if it's a YouTube link
                if 'youtube.com' in query or 'youtu.be' in query:
                    query = self._convert_to_ytmusic_url(query)
                    logger.info(f"Using YouTube Music URL: {query}")
                search_query = query
            else:
                # Use ytmusicsearch: prefix to force YouTube Music search
                # This searches music.youtube.com instead of regular youtube.com
                search_query = f"https://music.youtube.com/search?q={query.replace(' ', '+')}"
                logger.info(f"Using YouTube Music search URL")
            
            command = [
                'yt-dlp',
                '--dump-json',
                '--no-playlist',
                '--flat-playlist',  # Get first result from search
                '--playlist-items', '1',  # Only first result
                '--no-check-certificate',
                '--geo-bypass',
                # Force YouTube Music client for proper metadata
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
                logger.warning(f"yt-dlp YTMusic search failed: {stderr}")
                # Fallback to regular ytsearch
                logger.info("Falling back to ytsearch1...")
                fallback_query = query if query.startswith('http') else f"ytsearch1:{query}"
                fallback_cmd = [
                    'yt-dlp',
                    '--dump-json',
                    '--no-playlist',
                    '--no-check-certificate',
                    '--geo-bypass',
                    '--extractor-args', 'youtube:player_client=android_music',
                    fallback_query
                ]
                stdout, stderr, returncode = await self._run_command(fallback_cmd, timeout=30)
                
                if returncode != 0:
                    logger.warning(f"yt-dlp fallback search also failed: {stderr}")
                    return None
            
            # Parse JSON output
            try:
                track_data = json.loads(stdout)
                
                # Extract info - YouTube Music metadata fields
                # Priority: track > alt_title > fulltitle > title
                title = (track_data.get('track') or 
                         track_data.get('alt_title') or 
                         track_data.get('fulltitle') or 
                         track_data.get('title', 'Unknown'))
                
                # Prefer 'artist' over 'uploader' for YouTube Music
                artist = track_data.get('artist') or track_data.get('creator') or track_data.get('uploader', 'Unknown')
                
                # Get album if available (YouTube Music specific)
                album = track_data.get('album')
                
                duration = track_data.get('duration', 0)
                video_id = track_data.get('id', None)
                
                # Get thumbnail (highest quality)
                thumbnail = None
                thumbnails = track_data.get('thumbnails', [])
                if thumbnails:
                    # Get highest resolution thumbnail
                    thumbnail = thumbnails[-1].get('url')
                
                # If title still has "Artist - Title" format, split it
                if ' - ' in title and artist in ['Unknown', title.split(' - ')[0]]:
                    parts = title.split(' - ', 1)
                    artist = parts[0].strip()
                    title = parts[1].strip()
                
                # Force YouTube Music URL
                ytmusic_url = f"https://music.youtube.com/watch?v={video_id}" if video_id else None
                
                logger.info(f"Found on YouTube Music: {title} - {artist}")
                
                return TrackInfo(
                    title=title,
                    artist=artist,
                    album=album,
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
                # If no URL, search on YouTube Music
                url = f"https://music.youtube.com/search?q={track_info.artist}+{track_info.title}".replace(' ', '+')
            
            logger.info(f"Downloading from: {url}")
            
            # Build yt-dlp command optimized for YouTube Music
            # Use %(track,title)s to prefer track name from YouTube Music metadata
            output_template = str(self.download_dir / "%(artist,uploader)s - %(track,title)s.%(ext)s")
            
            command = [
                'yt-dlp',
                url,
                '-f', 'bestaudio[ext=m4a]/bestaudio/best',
                '-x',  # Extract audio
                '--audio-format', 'opus',
                '--audio-quality', f"{Settings.AUDIO_BITRATE}k",
                '-o', output_template,  # Use template with track/artist
                '--no-playlist',
                '--playlist-items', '1',  # Only first result if searching
                '--no-warnings',
                '--geo-bypass',
                '--embed-thumbnail',  # Embed artwork!
                '--add-metadata',  # Add metadata
                # Force YouTube Music client for proper track/artist metadata
                '--extractor-args', 'youtube:player_client=android_music',
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
