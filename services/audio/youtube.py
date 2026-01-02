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

# Import ytmusicapi for better search matching
try:
    from ytmusicapi import YTMusic
    YTMUSIC_AVAILABLE = True
except ImportError:
    YTMUSIC_AVAILABLE = False

logger = get_logger('audio.youtube')


class YouTubeDownloader(BaseDownloader):
    """YouTube Music downloader - Forces download from music.youtube.com"""
    
    def __init__(self, download_dir: Path):
        """Initialize YouTube Music downloader"""
        super().__init__(download_dir)
        self.source = AudioSource.YOUTUBE_MUSIC
        
        # Force YouTube Music domain
        self.ytmusic_domain = "music.youtube.com"
        
        # Initialize ytmusicapi for better search matching
        if YTMUSIC_AVAILABLE:
            self.ytmusic = YTMusic()
            logger.info("YTMusic API initialized for improved search matching")
        else:
            self.ytmusic = None
            logger.warning("ytmusicapi not available - using yt-dlp search only")
        
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
        
        Uses ytmusicapi with title matching first for accuracy,
        then falls back to yt-dlp CLI.
        
        Args:
            query: Search query or YouTube URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        logger.info(f"Searching YouTube Music: {query}")
        
        # If it's a URL, skip ytmusicapi search - go directly to yt-dlp
        is_url = query.startswith('http')
        
        # ========================================
        # STEP 1: Use ytmusicapi with title matching (NON-URL ONLY)
        # ========================================
        if not is_url and self.ytmusic:
            try:
                result = await self._search_ytmusic_with_matching(query)
                if result:
                    logger.info(f"[YTMusicAPI] Found: {result.title} - {result.artist}")
                    return result
                logger.info("[YTMusicAPI] No results, falling back to yt-dlp")
            except Exception as e:
                logger.warning(f"[YTMusicAPI] Search failed: {e}, falling back to yt-dlp")
        
        # ========================================
        # STEP 2: Try YTDLP API
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
    
    async def _search_ytmusic_with_matching(self, query: str) -> Optional[TrackInfo]:
        """
        Search YouTube Music using ytmusicapi with improved title/artist matching.
        
        Parses query to extract title and artist, then scores results based on:
        - Title match (how well the result title matches query title)
        - Artist match (if query contains artist, verify result artist matches)
        
        Args:
            query: Search query (e.g., "Faded", "Faded Alan Walker", "Alan Walker Faded")
            
        Returns:
            TrackInfo if found, None otherwise
        """
        if not self.ytmusic:
            return None
        
        try:
            # Search on YouTube Music - get 10 results for better matching
            results = await asyncio.to_thread(
                self.ytmusic.search,
                query,
                filter='songs',
                limit=10
            )
            
            if not results:
                return None
            
            # Parse query into potential title and artist parts
            query_words = self._normalize_title(query).split()
            
            # Log all results for debugging
            logger.info(f"🔍 Query: '{query}' - Found {len(results)} results")
            for i, r in enumerate(results[:5]):
                r_title = r.get('title', '')
                r_artist = r['artists'][0]['name'] if r.get('artists') else ''
                logger.debug(f"  {i+1}. '{r_title}' by '{r_artist}'")
            
            # Score each result
            best_match = None
            best_score = 0.0
            best_details = ""
            
            for result in results:
                result_title = result.get('title', '')
                result_artist = result['artists'][0]['name'] if result.get('artists') else ''
                
                # Normalize for comparison
                title_normalized = self._normalize_title(result_title)
                artist_normalized = self._normalize_title(result_artist)
                
                # Split into words
                title_words = set(title_normalized.split())
                artist_words = set(artist_normalized.split())
                all_result_words = title_words | artist_words
                
                # Calculate how many query words are found in result
                query_words_set = set(query_words)
                matches_in_title = query_words_set & title_words
                matches_in_artist = query_words_set & artist_words
                matches_total = query_words_set & all_result_words
                
                # Score based on coverage
                if not query_words_set:
                    continue
                    
                title_coverage = len(matches_in_title) / len(query_words_set)
                total_coverage = len(matches_total) / len(query_words_set)
                
                # Bonus for exact title match or containment
                title_bonus = 0.0
                query_as_phrase = self._normalize_title(query)
                if title_normalized == query_as_phrase:
                    title_bonus = 0.5  # Exact match
                elif query_as_phrase in title_normalized or title_normalized in query_as_phrase:
                    title_bonus = 0.3  # Containment
                
                # Calculate final score
                # Prioritize: title word matches + coverage + title bonus
                final_score = (title_coverage * 0.5) + (total_coverage * 0.3) + title_bonus
                
                # Penalize if artist words found but title words not in result title
                if matches_in_artist and not matches_in_title:
                    final_score *= 0.5  # Reduce score - probably wrong song same artist
                
                # CRITICAL: Penalize unwanted variations (remix, cover, live, etc.)
                # when query doesn't request them
                unwanted_variations = [
                    'remix', 'cover', 'live', 'acoustic', 'instrumental', 
                    'karaoke', 'version', 'edit', 'bootleg', 'mashup', 'extended',
                    'tribute', 'billboard masters', 'originally performed',
                    'made famous', 'in the style of', 'backing track', 'minus one',
                    'sped up', 'slowed', 'reverb', '8d audio', 'nightcore',
                    'metal version', 'rock version', 'jazz version', 'lofi'
                ]
                query_lower = query.lower()
                result_title_lower = result_title.lower()
                result_artist_lower = result_artist.lower()
                
                for variation in unwanted_variations:
                    # If result title OR artist contains variation but query doesn't
                    if (variation in result_title_lower or variation in result_artist_lower) and variation not in query_lower:
                        # Strong penalty - prefer original over variations
                        final_score *= 0.1  # Very strong penalty (was 0.3)
                        logger.debug(f"Penalized for unwanted '{variation}': {result_title} by {result_artist}")
                        break  # Apply penalty once
                
                details = f"title_cov={title_coverage:.2f}, total_cov={total_coverage:.2f}, bonus={title_bonus:.2f}"
                logger.debug(f"Score {final_score:.2f} ({details}): '{result_title}' by '{result_artist}'")
                
                if final_score > best_score:
                    best_score = final_score
                    best_match = result
                    best_details = details
            
            # Only return if we have a good match (score >= 0.4)
            if best_match and best_score >= 0.4:
                title = best_match.get('title', query)
                artist = best_match['artists'][0]['name'] if best_match.get('artists') else 'Unknown'
                album = best_match.get('album', {}).get('name', '') if best_match.get('album') else ''
                video_id = best_match.get('videoId', '')
                duration_str = best_match.get('duration', '')
                
                # Parse duration string (e.g., "3:45" -> 225 seconds)
                duration = 0
                if duration_str:
                    try:
                        parts = duration_str.split(':')
                        if len(parts) == 2:
                            duration = int(parts[0]) * 60 + int(parts[1])
                        elif len(parts) == 3:
                            duration = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    except ValueError:
                        pass
                
                # Get thumbnail
                thumbnails = best_match.get('thumbnails', [])
                thumbnail = thumbnails[-1].get('url') if thumbnails else None
                
                ytmusic_url = f"https://music.youtube.com/watch?v={video_id}" if video_id else None
                
                logger.info(f"✅ Best match (score {best_score:.2f}): '{title}' by '{artist}'")
                
                return TrackInfo(
                    title=title,
                    artist=artist,
                    album=album,
                    duration=duration,
                    url=ytmusic_url,
                    track_id=video_id,
                    thumbnail_url=thumbnail
                )
            else:
                logger.warning(f"⚠️ No good match found for '{query}' (best score: {best_score:.2f})")
                return None
                
        except Exception as e:
            logger.warning(f"YTMusicAPI search error: {e}")
            return None
    
    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison - lowercase, remove special chars"""
        # Convert to lowercase
        normalized = title.lower()
        # Remove common suffixes like (Official Video), [Lyric Video], etc.
        normalized = re.sub(r'\s*[\(\[].*?[\)\]]', '', normalized)
        # Remove special characters except spaces
        normalized = re.sub(r'[^\w\s]', '', normalized)
        # Collapse multiple spaces
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings using Jaccard similarity"""
        if str1 == str2:
            return 1.0
        
        # Check if one contains the other (partial match)
        if str1 in str2 or str2 in str1:
            longer = max(len(str1), len(str2))
            shorter = min(len(str1), len(str2))
            return shorter / longer if longer > 0 else 0.0
        
        # Jaccard similarity on words
        words1 = set(str1.split())
        words2 = set(str2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union) if union else 0.0
    
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
    
    async def get_stream_url_with_proxy(self, track_info: TrackInfo, proxy: str) -> Optional[str]:
        """
        Get stream URL using proxy (for when direct access returns 403).
        
        Args:
            track_info: Track information with URL
            proxy: Proxy URL (http://host:port or socks5://host:port)
            
        Returns:
            Direct audio stream URL or None if failed
        """
        logger.info(f"Getting stream URL via proxy: {track_info.title}")
        
        try:
            # Build URL for yt-dlp
            url = track_info.url
            if not url:
                clean_query = self._clean_search_query(track_info.artist, track_info.title)
                url = f"https://music.youtube.com/search?q={clean_query.replace(' ', '+')}"
            
            # Build command with proxy
            command = [
                'yt-dlp',
                '--proxy', proxy,
                url,
                '-I', '1',
                '--get-url',
                '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
                '--no-playlist',
                '--geo-bypass',
                '--socket-timeout', '15',
                '--no-check-certificate',
                '--extractor-args', 'youtube:player_client=android_sdkless',
            ]
            
            stdout, stderr, returncode = await self._run_command(command, timeout=30)
            
            if returncode != 0:
                logger.warning(f"Failed to get stream URL via proxy: {stderr}")
                return None
            
            stream_url = stdout.strip()
            
            if stream_url and stream_url.startswith('http'):
                logger.info(f"✓ Got stream URL via proxy: {track_info.title}")
                return stream_url
            else:
                logger.warning(f"Invalid stream URL from proxy: {stream_url[:100] if stream_url else 'empty'}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get stream URL via proxy: {e}")
            return None
    
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
            from services.storage import get_cloud_cache
            cloud_cache = get_cloud_cache()
            
            if cloud_cache.is_enabled:
                # Upload and wait for result
                success = await cloud_cache.upload(file_path, artist, title)
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
            from services.storage import get_cloud_cache
            import re
            
            cloud_cache = get_cloud_cache()
            if not cloud_cache.is_enabled:
                logger.debug("FTP cache disabled, skipping background download")
                return
            
            # Check if already cached
            if await cloud_cache.exists(artist, title):
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
                    
                    # Use TrackVerifier for stricter check
                    from utils.track_verifier import TrackVerifier
                    is_unwanted, unwanted_reason = TrackVerifier.is_unwanted_version(title, song_info.get('title', ''))
                    
                    if is_unwanted:
                        logger.warning(f"MusicDL returned wrong version: {unwanted_reason}")
                        logger.info(f"Falling back to yt-dlp AAC...")
                        use_ytdlp = True
                    else:
                        # Title OK, download via MusicDL
                        downloaded_file = await musicdl.download(song_info, self.download_dir)
                        
                        if downloaded_file and downloaded_file.exists():
                            # VERIFY downloaded audio BEFORE uploading to cloud
                            from database.models import TrackInfo as TI
                            temp_track = TI(title=title, artist=artist, url=None)
                            verification = await TrackVerifier.verify_track(downloaded_file, temp_track)
                            
                            if not verification.success:
                                logger.warning(f"Downloaded audio verification FAILED: {verification.message}")
                                logger.warning(f"Expected: {title} by {artist}")
                                logger.warning(f"Got: {verification.actual_title} by {verification.actual_artist}")
                                # Delete bad file
                                try:
                                    downloaded_file.unlink()
                                    logger.info(f"Deleted wrong audio file: {downloaded_file.name}")
                                except:
                                    pass
                                use_ytdlp = True  # Fallback to yt-dlp
                            else:
                                # Verification passed - upload to cloud
                                success = await cloud_cache.upload(downloaded_file, artist, title)
                                
                                if success:
                                    logger.info(f"Cached to cloud (VERIFIED): {title} ({song_info.get('ext', 'unknown')})")
                                else:
                                    logger.warning(f"Cloud cache upload failed for: {title}")
                                
                                # Keep local file - SmartCacheManager handles cleanup
                                logger.info(f"Kept local cache: {downloaded_file.name}")
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
                    success = await cloud_cache.upload(result.file_path, artist, title)
                    if success:
                        logger.info(f"☁️ Cached to cloud via yt-dlp: {title}")
                    else:
                        logger.warning(f"Cloud cache upload failed for: {title}")
                    
                    # Keep local file - SmartCacheManager handles cleanup
                    logger.info(f"✓ Kept local cache: {result.file_path.name}")
                    
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
        # PRIORITY 0: Check Cloud Cache first
        # ========================================
        try:
            from services.storage import get_cloud_cache
            cloud_cache = get_cloud_cache()
            
            if cloud_cache.is_enabled:
                # Check if exists in FTP cache
                if await cloud_cache.exists(track_info.artist, track_info.title):
                    logger.info(f"☁️ Found in FTP cache: {track_info.title}")
                    
                    # Download from FTP
                    if await cloud_cache.download(track_info.artist, track_info.title, output_path):
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
        
        # CRITICAL: Spotify URLs cannot be downloaded (DRM protected)
        # Always search YouTube Music for Spotify tracks
        if url and 'spotify.com' in url:
            logger.info(f"Spotify URL detected, searching YouTube Music instead...")
            url = None  # Force YouTube Music search below
        
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
        
        # Third attempt failed, try with android_vr client
        # This client often bypasses authentication requirements
        logger.warning(f"tv_embedded failed, trying android_vr fallback...")
        
        command_fallback3 = [
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
            # android_vr is known to bypass many restrictions
            '--extractor-args', 'youtube:player_client=android_vr',
        ]
        # NOT adding cookies - android_vr works better without auth
        
        stdout, stderr, returncode = await self._run_command(command_fallback3, timeout=300)
        
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
                
                logger.info(f"✓ Downloaded (android_vr): {output_path.name}")
                
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
        
        # Fourth attempt failed, try with android_sdkless client (last resort)
        logger.warning(f"android_vr failed, trying android_sdkless (final fallback)...")
        
        command_fallback4 = [
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
            # android_sdkless - minimal client, often works when others fail
            '--extractor-args', 'youtube:player_client=android_sdkless',
        ]
        
        stdout, stderr, returncode = await self._run_command(command_fallback4, timeout=300)
        
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
                
                logger.info(f"✓ Downloaded (android_sdkless): {output_path.name}")
                
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
        
        # ========================================
        # FINAL FALLBACK: Try with proxy if configured
        # This handles 403 Forbidden when server IP is blocked
        # ========================================
        if Settings.YOUTUBE_PROXY:
            logger.warning(f"All clients failed, trying with proxy: {Settings.YOUTUBE_PROXY}")
            
            command_proxy = [
                'yt-dlp',
                '--proxy', Settings.YOUTUBE_PROXY,
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
                '--extractor-args', 'youtube:player_client=android_sdkless',
            ]
            
            stdout, stderr, returncode = await self._run_command(command_proxy, timeout=300)
            
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
                    
                    logger.info(f"✓ Downloaded (via proxy): {output_path.name}")
                    
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
            else:
                logger.error(f"Proxy download also failed: {stderr[:100] if stderr else 'unknown'}")
        
        # All attempts failed
        last_error = f"yt-dlp failed after all attempts (5 clients + proxy): {stderr[:200] if stderr else 'unknown error'}"
        logger.error(last_error)
        raise Exception(last_error)

