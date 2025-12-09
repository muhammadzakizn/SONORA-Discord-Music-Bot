"""Genius lyrics fetcher"""

from typing import Optional
import asyncio

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo
from config.constants import LyricsSource
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('lyrics.genius')


class GeniusLyricsFetcher(BaseLyricsFetcher):
    """Genius lyrics fetcher using lyricsgenius"""
    
    def __init__(self):
        """Initialize Genius fetcher"""
        super().__init__()
        self.source = LyricsSource.GENIUS
        self.genius = None
        
        # Initialize Genius API if token available
        if Settings.GENIUS_API_TOKEN:
            self._initialize_genius()
        else:
            logger.warning("Genius API token not found, lyrics fetching disabled")
    
    def _initialize_genius(self) -> None:
        """Initialize Genius API client"""
        try:
            import lyricsgenius
            
            # Check if token is valid (not empty or placeholder)
            if not Settings.GENIUS_API_TOKEN or Settings.GENIUS_API_TOKEN == 'your_genius_api_token':
                logger.warning("Genius API token not configured properly")
                self.genius = None
                return
            
            self.genius = lyricsgenius.Genius(
                Settings.GENIUS_API_TOKEN,
                verbose=False,
                remove_section_headers=True,
                skip_non_songs=True,
                excluded_terms=["(Remix)", "(Live)"],
                timeout=15  # Add timeout
            )
            
            logger.info("Genius API initialized")
        
        except ImportError:
            logger.error("lyricsgenius not installed! Install with: pip install lyricsgenius")
            self.genius = None
        
        except Exception as e:
            logger.error(f"Failed to initialize Genius API: {e}")
            self.genius = None
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics from Genius
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found, None otherwise
        """
        if not self.genius:
            logger.warning("Genius API not initialized or token invalid")
            return None
        
        try:
            logger.info(f"Fetching lyrics from Genius: {track_info}")
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            song = await loop.run_in_executor(
                None,
                self.genius.search_song,
                track_info.title,
                track_info.artist
            )
            
            if not song or not song.lyrics:
                logger.info(f"No lyrics found on Genius for: {track_info}")
                return None
            
            # Parse lyrics
            lyrics_data = self._create_unsynced_lyrics(song.lyrics)
            
            logger.info(f"✓ Fetched lyrics from Genius: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except AssertionError as e:
            # Handle 401 token errors gracefully
            if '401' in str(e) or 'invalid_token' in str(e):
                logger.warning(f"Genius API token is invalid or expired. Please update GENIUS_API_TOKEN in .env")
            else:
                logger.error(f"Genius API assertion error: {e}")
            return None
        
        except Exception as e:
            logger.error(f"Failed to fetch lyrics from Genius: {e}", exc_info=True)
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query (artist - title)
        
        Returns:
            LyricsData if found, None otherwise
        """
        if not self.genius:
            logger.warning("Genius API not initialized")
            return None
        
        try:
            # Parse query
            if ' - ' in query:
                artist, title = query.split(' - ', 1)
            else:
                artist = ""
                title = query
            
            logger.info(f"Searching lyrics on Genius: {query}")
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            song = await loop.run_in_executor(
                None,
                self.genius.search_song,
                title,
                artist
            )
            
            if not song or not song.lyrics:
                logger.info(f"No lyrics found on Genius for: {query}")
                return None
            
            # Parse lyrics
            lyrics_data = self._create_unsynced_lyrics(song.lyrics)
            
            logger.info(f"✓ Found lyrics on Genius: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except Exception as e:
            logger.error(f"Failed to search lyrics on Genius: {e}", exc_info=True)
            return None
