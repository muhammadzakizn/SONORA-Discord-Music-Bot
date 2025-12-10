"""Artwork fetching service"""

from typing import Optional
from pathlib import Path
import aiohttp
import asyncio

from database.models import TrackInfo
from config.constants import ArtworkSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('metadata.artwork')


class ArtworkFetcher:
    """
    Artwork fetcher with priority:
    Apple Music (3000x3000px) → Spotify (640x640px) → YouTube Music → Embedded
    """
    
    def __init__(self):
        """Initialize artwork fetcher"""
        self.cache_dir = Settings.CACHE_DIR / 'artwork'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Artwork fetcher initialized")
    
    async def fetch(
        self,
        track_info: TrackInfo,
        prefer_apple: bool = True
    ) -> Optional[tuple]:
        """
        Fetch artwork for track with fallback chain:
        Apple Music → Spotify → YouTube Music
        
        Args:
            track_info: Track information
            prefer_apple: Prefer Apple Music artwork (higher quality)
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None if not found
        """
        logger.info(f"Fetching artwork for: {track_info}")
        
        # Try Apple Music first (highest quality - 3000x3000)
        result = await self._fetch_from_apple(track_info)
        if result:
            return result
        
        # Fallback to Spotify (640x640)
        result = await self._fetch_from_spotify(track_info)
        if result:
            return result
        
        # Fallback to YouTube Music (using thumbnail from search)
        result = await self._fetch_from_youtube_music(track_info)
        if result:
            return result
        
        logger.warning(f"No artwork found for: {track_info}")
        return None
    
    async def _fetch_from_apple(self, track_info: TrackInfo) -> Optional[tuple]:
        """
        Fetch artwork from Apple Music using iTunes Search API
        
        Args:
            track_info: Track information
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None
        """
        try:
            # Search Apple Music API
            search_term = f"{track_info.artist} {track_info.title}"
            url = "https://itunes.apple.com/search"
            
            params = {
                'term': search_term,
                'media': 'music',
                'entity': 'song',
                'limit': 1,
                'country': 'US'  # Add country parameter
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, headers=headers, timeout=15) as response:
                    if response.status == 200:
                        # Force read as JSON regardless of content-type
                        try:
                            data = await response.json(content_type=None)
                        except:
                            text = await response.text()
                            logger.error(f"Failed to parse Apple Music response: {text[:200]}")
                            return None
                        
                        if data.get('resultCount', 0) > 0:
                            result = data['results'][0]
                            artwork_url = result.get('artworkUrl100', '')
                            
                            # Get high resolution version (3000x3000)
                            if artwork_url:
                                artwork_url = artwork_url.replace('100x100', '3000x3000')
                                logger.info(f"✓ Found artwork on Apple Music: {artwork_url}")
                                return (artwork_url, ArtworkSource.APPLE_MUSIC)
                        else:
                            logger.debug(f"No results from Apple Music for: {search_term}")
        
        except Exception as e:
            logger.warning(f"Failed to fetch from Apple Music: {e}")
        
        return None
    
    async def _fetch_from_spotify(self, track_info: TrackInfo) -> Optional[tuple]:
        """
        Fetch artwork from Spotify using spotdl save to get cover URL
        
        Args:
            track_info: Track information
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None
        """
        try:
            import subprocess
            import tempfile
            import json
            import os
            
            # Create clean environment (no invalid credentials)
            clean_env = os.environ.copy()
            for var in ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIPY_CLIENT_ID', 'SPOTIPY_CLIENT_SECRET']:
                if var in clean_env:
                    del clean_env[var]
            
            # Search on Spotify to get cover URL
            search_query = f"{track_info.artist} {track_info.title}"
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.spotdl', delete=False) as f:
                temp_file = f.name
            
            try:
                # Use spotdl save to get metadata including cover_url
                result = subprocess.run(
                    ['spotdl', 'save', search_query, '--save-file', temp_file],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env=clean_env
                )
                
                if result.returncode == 0 and os.path.exists(temp_file):
                    with open(temp_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if content.strip():
                            data = json.loads(content)
                            if isinstance(data, list) and len(data) > 0:
                                cover_url = data[0].get('cover_url')
                                if cover_url:
                                    logger.info(f"✓ Found artwork on Spotify: {cover_url}")
                                    return (cover_url, ArtworkSource.SPOTIFY)
            finally:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    
            logger.debug(f"No Spotify artwork found for: {search_query}")
        
        except Exception as e:
            logger.warning(f"Failed to fetch from Spotify: {e}")
        
        return None
    
    async def _fetch_from_youtube_music(self, track_info: TrackInfo) -> Optional[tuple]:
        """
        Fetch artwork from YouTube Music using yt-dlp
        
        Args:
            track_info: Track information
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None
        """
        try:
            import subprocess
            import json
            
            search_query = f"{track_info.artist} {track_info.title}"
            search_url = f"https://music.youtube.com/search?q={search_query.replace(' ', '+')}"
            
            # Use yt-dlp to get thumbnail from YouTube Music search
            result = subprocess.run(
                [
                    'yt-dlp',
                    '--dump-json',
                    '--no-playlist',
                    '--playlist-items', '1',
                    '--extractor-args', 'youtube:player_client=android_music',
                    search_url
                ],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and result.stdout:
                data = json.loads(result.stdout)
                thumbnails = data.get('thumbnails', [])
                
                if thumbnails:
                    # Get highest resolution thumbnail
                    best_thumb = thumbnails[-1].get('url')
                    if best_thumb:
                        # Convert to high quality if possible
                        # YouTube thumbnails often have maxresdefault available
                        video_id = data.get('id')
                        if video_id:
                            hq_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                            logger.info(f"✓ Found artwork on YouTube Music: {hq_url}")
                            return (hq_url, ArtworkSource.YOUTUBE)
                        else:
                            logger.info(f"✓ Found artwork on YouTube Music: {best_thumb}")
                            return (best_thumb, ArtworkSource.YOUTUBE)
            
            logger.debug(f"No YouTube Music artwork found for: {search_query}")
        
        except Exception as e:
            logger.warning(f"Failed to fetch from YouTube Music: {e}")
        
        return None
    
    async def download_artwork(
        self,
        artwork_url: str,
        track_info: TrackInfo
    ) -> Optional[Path]:
        """
        Download artwork to cache
        
        Args:
            artwork_url: URL of artwork
            track_info: Track information
        
        Returns:
            Path to downloaded artwork or None if failed
        """
        try:
            # Generate cache filename
            filename = f"{track_info.artist}_{track_info.title}.jpg"
            filename = filename.replace('/', '_').replace('\\', '_')
            filepath = self.cache_dir / filename
            
            # Check if already cached
            if filepath.exists():
                logger.debug(f"Artwork already cached: {filepath}")
                return filepath
            
            # Download
            logger.info(f"Downloading artwork: {artwork_url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(artwork_url, timeout=30) as response:
                    if response.status == 200:
                        content = await response.read()
                        
                        # Save to file
                        filepath.write_bytes(content)
                        logger.info(f"✓ Downloaded artwork: {filepath}")
                        
                        return filepath
        
        except Exception as e:
            logger.error(f"Failed to download artwork: {e}", exc_info=True)
        
        return None
