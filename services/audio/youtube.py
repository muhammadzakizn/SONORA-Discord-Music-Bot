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
    
    def _clean_search_query(self, artist: str, title: str) -> str:
        """
        Clean title for better YouTube Music search results.
        Removes extra info like (feat. X), - Remix, etc.
        """
        # Remove common patterns that mess up search
        clean_title = title
        
        # Remove everything in parentheses (feat. X, Remix, etc.)
        clean_title = re.sub(r'\s*\([^)]*\)\s*', ' ', clean_title)
        
        # Remove everything after " - " (e.g., "- As featured in Superman")
        if ' - ' in clean_title:
            clean_title = clean_title.split(' - ')[0]
        
        # Remove "feat." or "ft." even without parentheses
        clean_title = re.sub(r'\s*(feat\.?|ft\.?)\s+.*', '', clean_title, flags=re.IGNORECASE)
        
        # Clean up multiple spaces
        clean_title = ' '.join(clean_title.split())
        
        # Build simple query: artist + clean title
        query = f"{artist} {clean_title}".strip()
        
        logger.debug(f"Search query cleaned: '{artist} {title}' -> '{query}'")
        return query
    
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
                '--playlist-items', '1',  # Only first result from search
                '--no-check-certificate',
                '--geo-bypass',
                # Force YouTube Music client for proper metadata
                '--extractor-args', 'youtube:player_client=android_music',
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
        Download audio from YouTube Music with fallback to regular YouTube
        
        Args:
            track_info: Track information
        
        Returns:
            AudioResult with download result
        
        Raises:
            Exception if all download attempts fail
        """
        logger.info(f"Downloading from YouTube Music: {track_info}")
        
        # Get output path
        output_path = self._get_output_path(track_info, 'opus')
        
        # Convert URL to YouTube Music if needed
        url = track_info.url
        original_url = url  # Keep original for fallback
        
        if url and 'youtube.com/watch' in url and 'music.youtube.com' not in url:
            url = self._convert_to_ytmusic_url(url)
        elif not url:
            # If no URL, use ytsearch1: prefix (reliable yt-dlp search)
            clean_query = self._clean_search_query(track_info.artist, track_info.title)
            url = f"ytsearch1:{clean_query}"
        
        logger.info(f"Downloading from: {url}")
        
        # Simple download - use Node.js as JS runtime (already installed for Next.js)
        # This works on servers without deno JS runtime
        
        output_template = str(self.download_dir / "%(artist,uploader)s - %(track,title)s.%(ext)s")
        
        # Build base command - simple and reliable
        # Use tv client which works better on server IPs
        command = [
            'yt-dlp',
            url,
            '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
            '-x',  # Extract audio
            '--audio-format', 'opus',
            '--audio-quality', '0',
            '-o', output_template,
            '--no-playlist',
            '--geo-bypass',
            '--socket-timeout', '30',
            '--retries', '3',
            '--no-check-certificate',
            '--js-runtimes', 'node',  # Server doesn't have deno
            '--extractor-args', 'youtube:player_client=tv',  # tv client bypasses some 403 blocks
        ]
        
        # Add cookies if available
        cookies_added = False
        if Settings.YOUTUBE_COOKIES.exists():
            try:
                if Settings.YOUTUBE_COOKIES.stat().st_size > 0:
                    command.extend(['--cookies', str(Settings.YOUTUBE_COOKIES)])
                    cookies_added = True
                    logger.info("  Using YouTube Music cookies")
            except Exception as e:
                logger.warning(f"Could not add cookies: {e}")
        
        if not cookies_added:
            logger.debug("  No cookies available, using default auth")
        
        # Run download
        logger.info(f"  Downloading with yt-dlp (default client)...")
        stdout, stderr, returncode = await self._run_command(command, timeout=300)
        
        if returncode == 0:
            # Success! Wait for file and verify
            await asyncio.sleep(1.0)
            
            # Search for any audio file
            audio_extensions = ['*.opus', '*.m4a', '*.webm', '*.mp3', '*.ogg', '*.aac']
            possible_files = []
            
            for ext in audio_extensions:
                matches = list(self.download_dir.glob(ext))
                possible_files.extend(matches)
            
            if possible_files:
                # Get the most recently modified file
                possible_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                output_path = possible_files[0]
                logger.info(f"Found downloaded file: {output_path.name}")
            else:
                raise FileNotFoundError(f"Downloaded file not found in any audio format")
            
            # Get actual format from file extension
            actual_format = output_path.suffix.lstrip('.')
            
            logger.info(f"✓ Downloaded from YouTube Music: {output_path.name}")
            logger.info(f"  Format: {actual_format}")
            
            return AudioResult(
                file_path=output_path,
                title=track_info.title,
                artist=track_info.artist,
                duration=track_info.duration,
                source=AudioSource.YOUTUBE_MUSIC,
                bitrate=Settings.AUDIO_BITRATE,
                format=actual_format,
                sample_rate=Settings.AUDIO_SAMPLE_RATE
            )
        
        # First attempt failed, try with format 18 (360p mp4 with audio - always available)
        logger.warning(f"Default download failed, trying format 18 fallback...")
        
        command_fallback = [
            'yt-dlp',
            url,
            '-f', '18/best',  # 360p mp4 - almost always works
            '-x',
            '--audio-format', 'opus',
            '-o', output_template,
            '--no-playlist',
            '--geo-bypass',
            '--no-check-certificate',
            '--js-runtimes', 'node',
            '--extractor-args', 'youtube:player_client=ios',  # iOS client as last resort
        ]
        
        if cookies_added:
            command_fallback.extend(['--cookies', str(Settings.YOUTUBE_COOKIES)])
        
        stdout, stderr, returncode = await self._run_command(command_fallback, timeout=300)
        
        if returncode == 0:
            await asyncio.sleep(1.0)
            
            audio_extensions = ['*.opus', '*.m4a', '*.webm', '*.mp3', '*.ogg', '*.aac']
            possible_files = []
            
            for ext in audio_extensions:
                matches = list(self.download_dir.glob(ext))
                possible_files.extend(matches)
            
            if possible_files:
                possible_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                output_path = possible_files[0]
                actual_format = output_path.suffix.lstrip('.')
                
                logger.info(f"✓ Downloaded (fallback format): {output_path.name}")
                
                return AudioResult(
                    file_path=output_path,
                    title=track_info.title,
                    artist=track_info.artist,
                    duration=track_info.duration,
                    source=AudioSource.YOUTUBE_MUSIC,
                    bitrate=Settings.AUDIO_BITRATE,
                    format=actual_format,
                    sample_rate=Settings.AUDIO_SAMPLE_RATE
                )
        
        # Both attempts failed
        last_error = f"yt-dlp failed: {stderr[:200]}"
        logger.warning(last_error)
        # All attempts failed
        error_msg = f"yt-dlp failed: {last_error}"
        logger.error(error_msg)
        raise Exception(error_msg)

