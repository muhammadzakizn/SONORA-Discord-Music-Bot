"""Syncedlyrics fetcher - Alternative lyrics source"""

from typing import Optional
import asyncio

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo
from config.constants import LyricsSource
from config.logging_config import get_logger

logger = get_logger('lyrics.syncedlyrics')


class SyncedLyricsFetcher(BaseLyricsFetcher):
    """Syncedlyrics fetcher - synced lyrics from multiple sources"""
    
    def __init__(self):
        """Initialize Syncedlyrics fetcher"""
        super().__init__()
        self.source = LyricsSource.SYNCED
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch synced lyrics using syncedlyrics library
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            import syncedlyrics
            
            logger.info(f"Fetching lyrics from Syncedlyrics: {track_info}")
            
            # Search for lyrics
            search_query = f"{track_info.artist} {track_info.title}"
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            lrc = await loop.run_in_executor(
                None,
                syncedlyrics.search,
                search_query
            )
            
            if not lrc:
                logger.info(f"No lyrics found: {track_info}")
                return None
            
            # Parse LRC format
            lyrics_data = self._parse_lrc_format(lrc)
            
            logger.info(f"✓ Fetched synced lyrics: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except ImportError:
            logger.error("syncedlyrics not installed!")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch lyrics: {e}", exc_info=True)
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            import syncedlyrics
            
            logger.info(f"Searching lyrics: {query}")
            
            # Run in executor
            loop = asyncio.get_event_loop()
            lrc = await loop.run_in_executor(
                None,
                syncedlyrics.search,
                query
            )
            
            if not lrc:
                return None
            
            lyrics_data = self._parse_lrc_format(lrc)
            
            logger.info(f"✓ Found synced lyrics: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return None
