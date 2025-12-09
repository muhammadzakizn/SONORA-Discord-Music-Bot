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
    Apple Music (3000x3000px) → Spotify (640x640px) → Embedded
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
        Fetch artwork for track
        
        Args:
            track_info: Track information
            prefer_apple: Prefer Apple Music artwork (higher quality)
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None if not found
        """
        logger.info(f"Fetching artwork for: {track_info}")
        
        # Try sources in order
        if prefer_apple:
            # Try Apple Music first
            result = await self._fetch_from_apple(track_info)
            if result:
                return result
            
            # Fallback to Spotify
            result = await self._fetch_from_spotify(track_info)
            if result:
                return result
        else:
            # Try Spotify first
            result = await self._fetch_from_spotify(track_info)
            if result:
                return result
            
            # Fallback to Apple Music
            result = await self._fetch_from_apple(track_info)
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
        Fetch artwork from Spotify
        
        Args:
            track_info: Track information
        
        Returns:
            Tuple of (artwork_url, artwork_source) or None
        """
        try:
            # This would require Spotify API authentication
            # For now, we'll skip implementation as it requires more setup
            # In production, use spotipy library with credentials
            logger.debug("Spotify artwork fetching not implemented yet")
            return None
        
        except Exception as e:
            logger.warning(f"Failed to fetch from Spotify: {e}")
        
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
