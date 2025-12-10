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
    
    def _get_clean_spotdl_env(self) -> dict:
        """Get a clean environment for spotdl without user's invalid Spotify credentials.
        
        spotdl has its own built-in default credentials:
        - client_id: f8a606e5583643beaa27ce62c48e3fc1  
        - client_secret: f6f4c8f73f0649939286cf417c811607
        
        If the user's .env has invalid credentials, they will override spotdl's defaults.
        This method creates a clean environment without those variables.
        """
        import os
        
        # Copy current environment
        clean_env = os.environ.copy()
        
        # Remove potentially invalid Spotify credentials from env
        # This lets spotdl use its own built-in default credentials
        vars_to_remove = [
            'SPOTIFY_CLIENT_ID',
            'SPOTIFY_CLIENT_SECRET', 
            'SPOTIPY_CLIENT_ID',
            'SPOTIPY_CLIENT_SECRET'
        ]
        
        for var in vars_to_remove:
            if var in clean_env:
                del clean_env[var]
                logger.debug(f"Removed {var} from spotdl environment")
        
        return clean_env
    
    def _init_spotdl(self) -> None:
        """Initialize spotdl - verify CLI is available
        
        We use spotdl CLI with a clean environment (without user's invalid Spotify credentials)
        so that spotdl uses its own built-in default credentials.
        """
        try:
            import subprocess
            import os
            
            # Get clean environment without user's Spotify credentials
            clean_env = self._get_clean_spotdl_env()
            
            # Verify spotdl CLI is available
            result = subprocess.run(
                ['spotdl', '--version'],
                capture_output=True,
                text=True,
                timeout=10,
                env=clean_env
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
        Search for track on Spotify using spotdl CLI with clean environment
        
        Args:
            query: Search query or Spotify URL
        
        Returns:
            TrackInfo if found, None otherwise
        """
        if not SpotifyDownloader._spotdl_instance:
            logger.error("Spotdl CLI not available")
            return None
        
        logger.info(f"Searching Spotify via CLI: {query}")
        
        # Get clean environment
        clean_env = self._get_clean_spotdl_env()
        
        try:
            # For direct Spotify URLs, use spotdl save command to get metadata
            if query.startswith('http') and 'spotify.com' in query:
                import tempfile
                import json
                
                # Create temp file for spotdl save output
                with tempfile.NamedTemporaryFile(mode='w', suffix='.spotdl', delete=False) as f:
                    temp_file = f.name
                
                try:
                    # Use spotdl save to get track metadata without downloading
                    command = [
                        'spotdl',
                        'save',
                        query,
                        '--save-file', temp_file
                    ]
                    
                    logger.debug(f"Running spotdl save: {' '.join(command)}")
                    stdout, stderr, returncode = await self._run_command(command, timeout=60, env=clean_env)
                    
                    # Log output for debugging
                    if stdout:
                        logger.debug(f"spotdl save stdout: {stdout[:500]}")
                    if stderr:
                        logger.debug(f"spotdl save stderr: {stderr[:500]}")
                    
                    if returncode != 0:
                        logger.error(f"spotdl save failed with code {returncode}: {stderr}")
                        return None
                    
                    # Read the saved JSON metadata
                    import os
                    if os.path.exists(temp_file):
                        with open(temp_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if content.strip():
                                data = json.loads(content)
                                
                                # spotdl save format: list of song objects
                                if isinstance(data, list) and len(data) > 0:
                                    song = data[0]
                                    
                                    # Extract track info
                                    title = song.get('name', 'Unknown')
                                    artist = song.get('artist', song.get('artists', ['Unknown'])[0] if isinstance(song.get('artists'), list) else 'Unknown')
                                    album = song.get('album_name')
                                    duration = song.get('duration', 0)
                                    url = song.get('url', query)
                                    song_id = song.get('song_id')
                                    isrc = song.get('isrc')
                                    
                                    logger.info(f"Found on Spotify: {title} - {artist}")
                                    
                                    return TrackInfo(
                                        title=title,
                                        artist=artist,
                                        album=album,
                                        duration=duration,
                                        url=url,
                                        track_id=song_id,
                                        isrc=isrc
                                    )
                                else:
                                    logger.warning(f"spotdl save returned empty data")
                            else:
                                logger.warning(f"spotdl save file is empty")
                    else:
                        logger.warning(f"spotdl save file not created")
                    
                finally:
                    # Clean up temp file
                    import os
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                
                logger.warning(f"Spotify URL search failed for: {query}")
                return None
            else:
                # For text search queries, return None - let YouTube handle it
                logger.info(f"Not a Spotify URL, skipping Spotify search for: {query}")
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
        # Check if we have a Spotify URL - spotdl works best with Spotify URLs
        # If no Spotify URL, let YouTube handle it instead
        if not track_info.url or 'spotify.com' not in track_info.url:
            logger.warning(f"No Spotify URL for track, skipping Spotify download: {track_info}")
            raise Exception("No Spotify URL - use YouTube fallback")
        
        logger.info(f"Downloading from Spotify: {track_info}")
        
        # Get clean environment
        clean_env = self._get_clean_spotdl_env()
        
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
            
            # Add cookies if available (for YouTube Music Premium quality)
            if Settings.SPOTIFY_COOKIES.exists():
                command.extend(['--cookie-file', str(Settings.SPOTIFY_COOKIES)])
            
            logger.debug(f"Running command: {' '.join(command)}")
            
            # Run download with CLEAN environment (no invalid Spotify credentials)
            stdout, stderr, returncode = await self._run_command(command, timeout=300, env=clean_env)
            
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
    
    async def get_playlist_tracks_batch(
        self,
        playlist_id: str,
        offset: int = 0,
        limit: int = 50
    ) -> list:
        """
        Get playlist tracks directly from Spotify API using spotipy
        Much faster than spotdl CLI for metadata-only fetching
        
        Args:
            playlist_id: Spotify playlist ID (extracted from URL)
            offset: Starting position (0-based)
            limit: Number of tracks to fetch (max 50 per API call)
        
        Returns:
            List of TrackInfo objects
        """
        try:
            import spotipy
            from spotipy.oauth2 import SpotifyClientCredentials
            
            # Initialize spotipy with Settings credentials (loaded from .env)
            client_id = Settings.SPOTIFY_CLIENT_ID
            client_secret = Settings.SPOTIFY_CLIENT_SECRET
            
            # Debug logging (masked for security)
            if client_id:
                logger.debug(f"Using Spotify client_id: {client_id[:8]}...{client_id[-4:]}")
            else:
                logger.warning("SPOTIFY_CLIENT_ID is empty!")
            
            if client_secret:
                logger.debug(f"Using Spotify client_secret: {client_secret[:4]}...{client_secret[-4:]}")
            else:
                logger.warning("SPOTIFY_CLIENT_SECRET is empty!")
            
            if not client_id or not client_secret:
                logger.error("Spotify credentials not configured in .env!")
                logger.error("Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file")
                return []
            
            auth_manager = SpotifyClientCredentials(
                client_id=client_id,
                client_secret=client_secret
            )
            sp = spotipy.Spotify(auth_manager=auth_manager)
            
            # Fetch playlist tracks with pagination
            # Use market='US' to access Spotify curated playlists
            logger.debug(f"Fetching playlist {playlist_id} tracks (offset={offset}, limit={limit})")
            
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sp.playlist_tracks(playlist_id, offset=offset, limit=limit, market='US')
            )
            
            if not results or 'items' not in results:
                logger.warning(f"No items in playlist response")
                return []
            
            tracks = []
            for item in results['items']:
                if not item or 'track' not in item or not item['track']:
                    continue
                
                track = item['track']
                
                # Extract artist names
                artists = [artist['name'] for artist in track.get('artists', [])]
                artist_str = ', '.join(artists) if artists else 'Unknown'
                
                # Create TrackInfo
                from database.models import TrackInfo
                track_info = TrackInfo(
                    title=track.get('name', 'Unknown'),
                    artist=artist_str,
                    album=track.get('album', {}).get('name', None),
                    duration=track.get('duration_ms', 0) / 1000,  # Convert ms to seconds
                    url=None,  # Will download from YouTube Music
                    track_id=track.get('id', None)
                )
                tracks.append(track_info)
            
            logger.info(f"Fetched {len(tracks)} tracks from Spotify API (offset={offset})")
            return tracks
        
        except ImportError:
            logger.error("spotipy not installed! Install with: pip install spotipy")
            return []
        except Exception as e:
            logger.error(f"Spotify API batch fetch failed: {e}", exc_info=True)
            return []
    
    async def get_playlist_total_tracks(self, playlist_id: str) -> int:
        """
        Get total number of tracks in a playlist
        
        Args:
            playlist_id: Spotify playlist ID
        
        Returns:
            Total number of tracks, 0 on error
        """
        try:
            import spotipy
            from spotipy.oauth2 import SpotifyClientCredentials
            
            # Initialize spotipy with Settings credentials (loaded from .env)
            client_id = Settings.SPOTIFY_CLIENT_ID
            client_secret = Settings.SPOTIFY_CLIENT_SECRET
            
            if not client_id or not client_secret:
                logger.error("Spotify credentials not configured in .env!")
                return 0
            
            auth_manager = SpotifyClientCredentials(
                client_id=client_id,
                client_secret=client_secret
            )
            sp = spotipy.Spotify(auth_manager=auth_manager)
            
            # Get playlist info (minimal API call)
            # Use market='US' to access Spotify curated playlists
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sp.playlist(playlist_id, fields='tracks.total', market='US')
            )
            
            total = results.get('tracks', {}).get('total', 0)
            logger.info(f"Playlist {playlist_id} has {total} tracks")
            return total
        
        except Exception as e:
            logger.error(f"Failed to get playlist total: {e}")
            return 0
    
    async def get_album_total_tracks(self, album_id: str) -> int:
        """
        Get total number of tracks in an album
        
        Args:
            album_id: Spotify album ID
        
        Returns:
            Total number of tracks, 0 on error
        """
        try:
            import spotipy
            from spotipy.oauth2 import SpotifyClientCredentials
            
            # Initialize spotipy with Settings credentials (loaded from .env)
            client_id = Settings.SPOTIFY_CLIENT_ID
            client_secret = Settings.SPOTIFY_CLIENT_SECRET
            
            if not client_id or not client_secret:
                logger.error("Spotify credentials not configured in .env!")
                return 0
            
            auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
            sp = spotipy.Spotify(auth_manager=auth_manager)
            
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sp.album(album_id)
            )
            
            total = results.get('total_tracks', 0)
            logger.info(f"Album {album_id} has {total} tracks")
            return total
        
        except Exception as e:
            logger.error(f"Failed to get album total: {e}")
            return 0
    
    async def get_album_tracks_batch(
        self,
        album_id: str,
        offset: int = 0,
        limit: int = 50
    ) -> list:
        """
        Get album tracks directly from Spotify API
        
        Args:
            album_id: Spotify album ID
            offset: Starting position
            limit: Number of tracks to fetch
        
        Returns:
            List of TrackInfo objects
        """
        try:
            import spotipy
            from spotipy.oauth2 import SpotifyClientCredentials
            
            # Initialize spotipy with Settings credentials (loaded from .env)
            client_id = Settings.SPOTIFY_CLIENT_ID
            client_secret = Settings.SPOTIFY_CLIENT_SECRET
            
            if not client_id or not client_secret:
                logger.error("Spotify credentials not configured in .env!")
                return []
            
            auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
            sp = spotipy.Spotify(auth_manager=auth_manager)
            
            logger.debug(f"Fetching album {album_id} tracks (offset={offset}, limit={limit})")
            
            # Get album info first to get artist
            album_info = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sp.album(album_id)
            )
            
            album_artist = album_info['artists'][0]['name'] if album_info.get('artists') else 'Unknown'
            album_name = album_info.get('name', 'Unknown Album')
            
            # Album tracks use different API endpoint
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: sp.album_tracks(album_id, offset=offset, limit=limit)
            )
            
            if not results or 'items' not in results:
                return []
            
            tracks = []
            for track in results['items']:
                if not track:
                    continue
                
                # Album tracks may have different artists than album artist
                artists = [a['name'] for a in track.get('artists', [])]
                artist_str = ', '.join(artists) if artists else album_artist
                
                from database.models import TrackInfo
                track_info = TrackInfo(
                    title=track.get('name', 'Unknown'),
                    artist=artist_str,
                    album=album_name,
                    duration=track.get('duration_ms', 0) / 1000,
                    url=None,  # Will download from YouTube Music
                    track_id=track.get('id', None)
                )
                tracks.append(track_info)
            
            logger.info(f"Fetched {len(tracks)} tracks from album API (offset={offset})")
            return tracks
        
        except ImportError:
            logger.error("spotipy not installed!")
            return []
        except Exception as e:
            logger.error(f"Album API batch fetch failed: {e}", exc_info=True)
            return []

