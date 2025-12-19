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
        
        Uses YTDLP API first, then falls back to direct yt-dlp CLI.
        Extracts proper track/artist metadata from YouTube Music.
        
        Args:
            query: Search query or YouTube URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        logger.info(f"Searching YouTube Music: {query}")
        
        # ========================================
        # STEP 1: Try YTDLP API first
        # ========================================
        try:
            from .ytdlp_client import get_ytdlp_api_client
            api_client = get_ytdlp_api_client()
            
            if await api_client.is_available():
                result = await api_client.search(query)
                if result:
                    logger.info(f"[API] Search success: {result.title}")
                    return result
                logger.info("[API] Search returned no results, trying direct CLI")
            else:
                logger.debug("[API] Not available, using direct CLI")
        except Exception as e:
            logger.warning(f"[API] Search failed, using CLI fallback: {e}")
        
        # ========================================  
        # STEP 2: Fallback to direct yt-dlp CLI
        # ========================================
        try:
            # Determine search query
            if query.startswith('http'):
                # Convert to YouTube Music URL if it's a YouTube link
                if 'youtube.com' in query or 'youtu.be' in query:
                    query = self._convert_to_ytmusic_url(query)
                    logger.info(f"Using YouTube Music URL: {query}")
                search_query = query
            else:
                # Use music.youtube.com search URL with -I 1 to get first result only
                # This searches music.youtube.com instead of regular youtube.com
                search_query = f"https://music.youtube.com/search?q={query.replace(' ', '+')}"
                logger.info(f"Using YouTube Music search: {search_query}")
            
            command = [
                'yt-dlp',
                '--remote-components', 'ejs:github',  # Enable EJS challenge solver
                '--dump-json',
                '-I', '1',  # CRITICAL: Only get first item from results
                '--no-check-certificate',
                '--geo-bypass',
                # Force YouTube Music client for proper metadata (no video intro)
                '--extractor-args', 'youtube:player_client=ios,web',
            ]
            
            # ALWAYS add YouTube Music cookies for authenticated access
            yt_cookies = Settings.get_youtube_cookies()
            if yt_cookies:
                try:
                    if yt_cookies.stat().st_size > 0:
                        command.extend(['--cookies', str(yt_cookies)])
                        logger.info(f"✓ Search: Using YouTube Music cookies from {yt_cookies}")
                    else:
                        logger.warning("⚠ YouTube Music cookies file is empty!")
                except Exception as e:
                    logger.warning(f"Could not check cookies: {e}")
            else:
                logger.warning("⚠ YouTube Music cookies not found - search may fail!")
            
            # Add search query last
            command.append(search_query)
            
            stdout, stderr, returncode = await self._run_command(command, timeout=30)
            
            if returncode != 0:
                logger.warning(f"yt-dlp YTMusic search failed: {stderr}")
                # Fallback to regular ytsearch
                logger.info("Falling back to ytsearch1...")
                fallback_query = query if query.startswith('http') else f"ytsearch1:{query}"
                fallback_cmd = [
                    'yt-dlp',
                    '--remote-components', 'ejs:github',
                    '--dump-json',
                    '--no-playlist',
                    '--no-check-certificate',
                    '--geo-bypass',
                    '--extractor-args', 'youtube:player_client=ios,web',
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
    
    async def get_stream_url(self, track_info: TrackInfo) -> Optional[str]:
        """
        Get direct stream URL without downloading.
        
        Uses YTDLP API first, then falls back to direct yt-dlp CLI.
        
        Args:
            track_info: Track information with URL
        
        Returns:
            Direct audio stream URL or None if failed (403, etc.)
        """
        logger.info(f"Getting stream URL for: {track_info}")
        
        # ========================================
        # STEP 1: Try YTDLP API first
        # ========================================
        try:
            from .ytdlp_client import get_ytdlp_api_client
            api_client = get_ytdlp_api_client()
            
            if await api_client.is_available():
                stream_url = await api_client.get_stream_url(track_info)
                if stream_url:
                    logger.info(f"[API] Got stream URL: {track_info.title}")
                    return stream_url
                logger.info("[API] Stream URL failed (403?), trying CLI fallback")
            else:
                logger.debug("[API] Not available, using direct CLI")
        except Exception as e:
            logger.warning(f"[API] Stream URL failed: {e}")
        
        # ========================================  
        # STEP 2: Fallback to direct yt-dlp CLI
        # ========================================
        try:
            # Build URL for yt-dlp
            url = track_info.url
            if not url:
                # Need to search first
                clean_query = self._clean_search_query(track_info.artist, track_info.title)
                url = f"https://music.youtube.com/search?q={clean_query.replace(' ', '+')}"
            
            # Build command to get stream URL only (no download)
            command = [
                'yt-dlp',
                url,
                '-I', '1',  # Only first result if search
                '--get-url',  # Just get URL, don't download
                '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
                '--no-playlist',
                '--geo-bypass',
                '--socket-timeout', '15',
                '--no-check-certificate',
                '--extractor-args', 'youtube:player_client=ios,web',
            ]
            
            # Add cookies
            yt_cookies = Settings.get_youtube_cookies()
            if yt_cookies:
                try:
                    if yt_cookies.stat().st_size > 0:
                        command.extend(['--cookies', str(yt_cookies)])
                        logger.debug("Using YouTube Music cookies for stream")
                except:
                    pass
            
            stdout, stderr, returncode = await self._run_command(command, timeout=15)
            
            if returncode != 0:
                logger.warning(f"Failed to get stream URL: {stderr}")
                return None
            
            stream_url = stdout.strip()
            
            if stream_url and stream_url.startswith('http'):
                logger.info(f"✓ Got stream URL for: {track_info.title}")
                
                # Test if URL is accessible (detect 403 early)
                if await self.test_stream_url(stream_url):
                    return stream_url
                else:
                    logger.warning(f"Stream URL test failed (403?), will need download")
                    return None
            else:
                logger.warning(f"Invalid stream URL returned: {stream_url[:100] if stream_url else 'empty'}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get stream URL: {e}")
            return None
    
    async def test_stream_url(self, url: str) -> bool:
        """
        Test if stream URL is accessible (check for 403).
        
        Makes a HEAD request to the URL to verify it's accessible
        before attempting to stream. Detects 403 Forbidden early.
        
        Args:
            url: Stream URL to test
            
        Returns:
            True if accessible, False if 403 or other error
        """
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.head(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        logger.debug(f"✓ Stream URL accessible (200 OK)")
                        return True
                    elif response.status == 403:
                        logger.warning(f"⚠ Stream URL blocked: 403 Forbidden")
                        return False
                    else:
                        logger.warning(f"Stream URL returned status {response.status}")
                        # Allow other statuses, might still work
                        return True
        except Exception as e:
            logger.warning(f"Stream URL test failed: {e}")
            # If test fails, assume URL might work
            return True
    
    async def _upload_to_ftp_cache(self, file_path: Path, artist: str, title: str) -> None:
        """
        Upload downloaded file to FTP cache.
        
        If FTP upload fails or FTP is unavailable, delete the local file
        to save disk space (since we can't cache it anyway).
        
        Args:
            file_path: Local file path
            artist: Artist name  
            title: Track title
        """
        try:
            from services.storage.ftp_storage import get_ftp_cache
            ftp_cache = get_ftp_cache()
            
            if ftp_cache.is_enabled:
                # Upload and wait for result
                success = await ftp_cache.upload(file_path, artist, title)
                if success:
                    logger.info(f"☁️ Uploaded to FTP: {title}")
                else:
                    logger.warning(f"FTP upload failed: {title}")
                    # FTP failed - delete local file to save space
                    self._delete_file_if_exists(file_path, "FTP upload failed")
            else:
                # FTP not enabled - delete local file to save space
                self._delete_file_if_exists(file_path, "FTP not available")
        except Exception as e:
            logger.warning(f"FTP upload failed: {e}")
            # Error - delete local file to save space
            self._delete_file_if_exists(file_path, f"FTP error: {e}")
    
    def _delete_file_if_exists(self, file_path: Path, reason: str) -> None:
        """Delete a file if it exists and log the reason."""
        if file_path and file_path.exists():
            try:
                file_size = file_path.stat().st_size
                file_size_mb = file_size / (1024 * 1024)
                file_path.unlink()
                logger.info(f"🗑️ Deleted file ({reason}): {file_path.name} ({file_size_mb:.1f}MB)")
            except Exception as e:
                logger.warning(f"Failed to delete file: {e}")
    
    async def background_download_for_cache(self, artist: str, title: str) -> None:
        """
        Background task: Download best quality audio and cache to FTP.
        
        Called while streaming to prepare high-quality file for future use.
        Uses MusicDL to find FLAC/best quality, then uploads to FTP.
        Verifies title matches to avoid remixes/covers.
        
        Args:
            artist: Artist name
            title: Track title
        """
        try:
            from services.audio.musicdl_handler import get_musicdl_handler
            from services.storage.ftp_storage import get_ftp_cache
            import re
            
            ftp_cache = get_ftp_cache()
            if not ftp_cache.is_enabled:
                logger.debug("FTP cache disabled, skipping background download")
                return
            
            # Check if already cached
            if await ftp_cache.exists(artist, title):
                logger.info(f"✓ Already in FTP cache: {title}")
                return
            
            logger.info(f"📥 Background: Downloading for cache: {artist} - {title}")
            
            musicdl = get_musicdl_handler()
            use_ytdlp = False
            
            if musicdl.is_available:
                # Search for best quality (FLAC preferred)
                query = f"{artist} - {title}"
                song_info = await musicdl.search_best_quality(query)
                
                if song_info:
                    # ========================================
                    # VERIFY TITLE - No remixes/covers
                    # ========================================
                    found_title = song_info.get('title', '').lower()
                    expected_title = title.lower()
                    
                    # Check for unwanted keywords
                    unwanted = ['remix', 'cover', 'bootleg', 'mashup', 'dj ', 'live version', 'instrumental']
                    is_remix = any(kw in found_title and kw not in expected_title for kw in unwanted)
                    
                    if is_remix:
                        logger.warning(f"⚠️ MusicDL returned remix/cover: '{song_info.get('title')}'")
                        logger.info(f"🔄 Falling back to yt-dlp AAC...")
                        use_ytdlp = True
                    else:
                        # Title OK, download via MusicDL
                        downloaded_file = await musicdl.download(song_info, self.download_dir)
                        
                        if downloaded_file and downloaded_file.exists():
                            # Upload to FTP
                            success = await ftp_cache.upload(downloaded_file, artist, title)
                            
                            if success:
                                logger.info(f"☁️ Cached to FTP: {title} ({song_info.get('ext', 'unknown')})")
                            else:
                                logger.warning(f"FTP upload failed for: {title}")
                            
                            # ALWAYS clean up local file (success or fail - save disk space)
                            try:
                                file_size = downloaded_file.stat().st_size / (1024 * 1024)
                                downloaded_file.unlink()
                                logger.info(f"🗑️ Deleted local file: {downloaded_file.name} ({file_size:.1f}MB)")
                            except Exception as del_err:
                                logger.warning(f"Failed to delete local file: {del_err}")
                            return
                else:
                    logger.info(f"MusicDL found no results for: {query}")
                    use_ytdlp = True
            else:
                use_ytdlp = True
            
            # ========================================
            # FALLBACK: Use yt-dlp AAC
            # ========================================
            if use_ytdlp:
                logger.info(f"📥 yt-dlp AAC fallback for: {title}")
                
                from database.models import TrackInfo as TI
                temp_track = TI(
                    title=title,
                    artist=artist,
                    url=None,
                    source="youtube_music"
                )
                
                # Use regular download (yt-dlp)
                result = await self.download(temp_track)
                if result and result.file_path and result.file_path.exists():
                    success = await ftp_cache.upload(result.file_path, artist, title)
                    if success:
                        logger.info(f"☁️ Cached to FTP via yt-dlp: {title}")
                    else:
                        logger.warning(f"FTP upload failed for: {title}")
                    
                    # ALWAYS clean up local file (success or fail - save disk space)
                    try:
                        file_size = result.file_path.stat().st_size / (1024 * 1024)
                        result.file_path.unlink()
                        logger.info(f"🗑️ Deleted local file: {result.file_path.name} ({file_size:.1f}MB)")
                    except Exception as del_err:
                        logger.warning(f"Failed to delete local file: {del_err}")
                    
        except Exception as e:
            logger.error(f"Background cache download failed: {e}")
    
    async def download(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio - FTP cache first, then MusicDL, then YouTube Music fallback
        
        Args:
            track_info: Track information
        
        Returns:
            AudioResult with download result
        
        Raises:
            Exception if all download attempts fail
        """
        logger.info(f"Downloading: {track_info}")
        
        # Get output path
        output_path = self._get_output_path(track_info, 'opus')
        
        # ========================================
        # PRIORITY 0: Check FTP Cache first
        # ========================================
        try:
            from services.storage.ftp_storage import get_ftp_cache
            ftp_cache = get_ftp_cache()
            
            if ftp_cache.is_enabled:
                # Check if exists in FTP cache
                if await ftp_cache.exists(track_info.artist, track_info.title):
                    logger.info(f"☁️ Found in FTP cache: {track_info.title}")
                    
                    # Download from FTP
                    if await ftp_cache.download(track_info.artist, track_info.title, output_path):
                        logger.info(f"☁️ Downloaded from FTP cache: {output_path.name}")
                        
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
                else:
                    logger.debug(f"Not in FTP cache: {track_info.title}")
        except Exception as e:
            logger.warning(f"FTP cache check failed: {e}")
        
        # ========================================
        # PRIORITY 1: Try MusicDL (primary source)
        # ========================================
        try:
            from services.audio.musicdl_handler import get_musicdl_handler
            musicdl = get_musicdl_handler()
            
            if musicdl.is_available:
                logger.info("Trying MusicDL as primary source...")
                
                # Search query for MusicDL
                search_query = f"{track_info.artist} - {track_info.title}"
                
                # Try download via MusicDL
                downloaded_file = await musicdl.search_and_download(
                    search_query, 
                    output_dir=self.download_dir
                )
                
                if downloaded_file and downloaded_file.exists():
                    # Check file size - returns True if should delete after play
                    delete_after_play = self._check_file_size(downloaded_file)
                    
                    actual_format = downloaded_file.suffix.lstrip('.')
                    logger.info(f"Downloaded via MusicDL: {downloaded_file.name}")
                    
                    result = AudioResult(
                        file_path=downloaded_file,
                        title=track_info.title,
                        artist=track_info.artist,
                        duration=track_info.duration,
                        source=AudioSource.YOUTUBE_MUSIC,
                        bitrate=Settings.AUDIO_BITRATE,
                        format=actual_format,
                        sample_rate=Settings.AUDIO_SAMPLE_RATE
                    )
                    result.delete_after_play = delete_after_play
                    
                    # Upload to FTP cache (background, non-blocking)
                    await self._upload_to_ftp_cache(downloaded_file, track_info.artist, track_info.title)
                    
                    return result
                else:
                    logger.info("MusicDL: No result, falling back to yt-dlp...")
            else:
                logger.info("MusicDL not available, using yt-dlp...")
                
        except Exception as e:
            logger.warning(f"MusicDL failed: {e}, falling back to yt-dlp...")
        
        # Use yt-dlp fallback
        return await self._download_from_ytdlp(track_info)
    
    async def _download_from_ytdlp(self, track_info: TrackInfo) -> AudioResult:
        """
        Download audio using yt-dlp directly (skip MusicDL).
        
        Uses YTDLP API first, then falls back to direct yt-dlp CLI.
        
        This method is used when:
        - MusicDL fails or is unavailable
        - Direct yt-dlp download is requested (e.g., after 403 stream failure)
        
        Args:
            track_info: Track information
            
        Returns:
            AudioResult with download result
        """
        # ========================================
        # STEP 1: Try YTDLP API first
        # ========================================
        try:
            from .ytdlp_client import get_ytdlp_api_client
            api_client = get_ytdlp_api_client()
            
            if await api_client.is_available():
                logger.info(f"[API] Downloading: {track_info.title}")
                downloaded_path = await api_client.download(track_info, self.download_dir)
                
                if downloaded_path and downloaded_path.exists():
                    logger.info(f"[API] Downloaded: {downloaded_path.name}")
                    actual_format = downloaded_path.suffix.lstrip('.')
                    
                    return AudioResult(
                        file_path=downloaded_path,
                        title=track_info.title,
                        artist=track_info.artist,
                        duration=track_info.duration,
                        source=AudioSource.YOUTUBE_MUSIC,
                        bitrate=Settings.AUDIO_BITRATE,
                        format=actual_format,
                        sample_rate=Settings.AUDIO_SAMPLE_RATE
                    )
                logger.info("[API] Download failed, trying CLI fallback")
            else:
                logger.debug("[API] Not available, using direct CLI")
        except Exception as e:
            logger.warning(f"[API] Download failed: {e}, using CLI fallback")
        
        # ========================================
        # STEP 2: Fallback to direct yt-dlp CLI
        # ========================================
        logger.info(f"Downloading from YouTube Music (CLI fallback): {track_info}")
        
        # Convert URL to YouTube Music if needed
        url = track_info.url
        original_url = url  # Keep original for fallback
        
        if url and 'youtube.com/watch' in url and 'music.youtube.com' not in url:
            url = self._convert_to_ytmusic_url(url)
        elif not url:
            # Force music.youtube.com search URL (not ytsearch1: which uses regular YouTube)
            clean_query = self._clean_search_query(track_info.artist, track_info.title)
            # Use music.youtube.com search URL with proper encoding
            url = f"https://music.youtube.com/search?q={clean_query.replace(' ', '+')}"
            logger.info(f"Using YouTube Music search URL: {url}")
        
        logger.info(f"Downloading from: {url}")
        
        # Simple download - use Node.js as JS runtime (already installed for Next.js)
        # This works on servers without deno JS runtime
        
        output_template = str(self.download_dir / "%(artist,uploader)s - %(track,title)s.%(ext)s")
        
        # Build base command - use android_music client for best YouTube Music compatibility with cookies
        command = [
            'yt-dlp',
            '--remote-components', 'ejs:github',  # Enable EJS challenge solver
            url,
            '-I', '1',  # Only first result if URL is a search
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
            # ios,web client works with Deno for signature solving
            '--extractor-args', 'youtube:player_client=ios,web',
        ]
        
        # ALWAYS use YouTube Music cookies for authenticated downloads
        # This ensures we get music.youtube.com audio (no video intro)
        cookies_added = False
        yt_cookies = Settings.get_youtube_cookies()
        if yt_cookies:
            try:
                cookie_size = yt_cookies.stat().st_size
                if cookie_size > 0:
                    command.extend(['--cookies', str(yt_cookies)])
                    cookies_added = True
                    logger.info(f"✓ Download: Using YouTube Music cookies ({cookie_size} bytes)")
                else:
                    logger.warning("⚠ YouTube Music cookies file is empty!")
            except Exception as e:
                logger.warning(f"Could not add cookies: {e}")
        
        if not cookies_added:
            logger.warning("⚠ No YouTube Music cookies - download may have video intro!")
        
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
            
            # Check file size limit (100MB)
            self._check_file_size(output_path)
            
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
        
        # First attempt failed, try with web client (supports cookies, different extraction method)
        logger.warning(f"ios client failed, trying web client fallback...")
        
        command_fallback = [
            'yt-dlp',
            '--remote-components', 'ejs:github',
            url,
            '-I', '1',  # Only first result if URL is a search
            '-f', 'bestaudio/best',  # More permissive format selection
            '-x',
            '--audio-format', 'opus',
            '-o', output_template,
            '--no-playlist',
            '--geo-bypass',
            '--no-check-certificate',
            # web client as fallback - supports cookies and works on most videos
            '--extractor-args', 'youtube:player_client=web',
        ]
        
        # Always add cookies for web client
        if cookies_added and yt_cookies:
            command_fallback.extend(['--cookies', str(yt_cookies)])
            logger.info(f"  Fallback: Using YouTube Music cookies")
        
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
                
                # Check file size limit (100MB)
                self._check_file_size(output_path)
                
                logger.info(f"✓ Downloaded (web client): {output_path.name}")
                
                # Upload to FTP cache (background, non-blocking)
                await self._upload_to_ftp_cache(output_path, track_info.artist, track_info.title)
                
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
        
        # Second attempt failed, try with tv_embedded client WITHOUT cookies
        # Some videos are restricted when using authenticated clients
        logger.warning(f"web client failed, trying tv_embedded (no cookies) fallback...")
        
        command_fallback2 = [
            'yt-dlp',
            '--remote-components', 'ejs:github',
            url,
            '-I', '1',
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'opus',
            '-o', output_template,
            '--no-playlist',
            '--geo-bypass',
            '--no-check-certificate',
            # tv_embedded works for many restricted videos without cookies
            '--extractor-args', 'youtube:player_client=tv_embedded',
        ]
        # Note: NOT adding cookies for tv_embedded - some videos only work without auth
        
        stdout, stderr, returncode = await self._run_command(command_fallback2, timeout=300)
        
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
                
                # Check file size limit (100MB)
                self._check_file_size(output_path)
                
                logger.info(f"✓ Downloaded (tv_embedded): {output_path.name}")
                
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
        
        # All attempts failed
        last_error = f"yt-dlp failed after 3 attempts: {stderr[:200] if stderr else 'unknown error'}"
        logger.error(last_error)
        raise Exception(last_error)

