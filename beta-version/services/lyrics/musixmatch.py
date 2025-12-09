"""Musixmatch lyrics fetcher"""

from typing import Optional
import asyncio
import aiohttp

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo, LyricLine
from config.constants import LyricsSource
from config.logging_config import get_logger

logger = get_logger('lyrics.musixmatch')


class MusixmatchLyricsFetcher(BaseLyricsFetcher):
    """Musixmatch lyrics fetcher using public API"""
    
    def __init__(self):
        """Initialize Musixmatch fetcher"""
        super().__init__()
        self.source = LyricsSource.MUSIXMATCH
        self.base_url = "https://api.musixmatch.com/ws/1.1"
        # Public API key (works without registration for basic queries)
        self.api_key = "d1c16986c4f5e47ebf33ae0a65ff7c09"
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics from Musixmatch
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            logger.info(f"Fetching lyrics from Musixmatch: {track_info}")
            
            # Search for track
            track_id = await self._search_track(track_info.artist, track_info.title)
            
            if not track_id:
                logger.info(f"Track not found on Musixmatch: {track_info}")
                return None
            
            # Get lyrics
            lyrics_text = await self._get_lyrics(track_id)
            
            if not lyrics_text:
                logger.info(f"No lyrics found on Musixmatch for: {track_info}")
                return None
            
            # Parse lyrics
            lyrics_data = self._create_unsynced_lyrics(lyrics_text)
            
            logger.info(f"✓ Fetched lyrics from Musixmatch: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except Exception as e:
            logger.error(f"Failed to fetch lyrics from Musixmatch: {e}", exc_info=True)
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query (artist - title)
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            # Parse query
            if ' - ' in query:
                artist, title = query.split(' - ', 1)
            else:
                artist = ""
                title = query
            
            logger.info(f"Searching lyrics on Musixmatch: {query}")
            
            # Search for track
            track_id = await self._search_track(artist, title)
            
            if not track_id:
                return None
            
            # Get lyrics
            lyrics_text = await self._get_lyrics(track_id)
            
            if not lyrics_text:
                return None
            
            # Parse lyrics
            lyrics_data = self._create_unsynced_lyrics(lyrics_text)
            
            logger.info(f"✓ Found lyrics on Musixmatch: {len(lyrics_data.lines)} lines")
            
            return lyrics_data
        
        except Exception as e:
            logger.error(f"Failed to search lyrics on Musixmatch: {e}", exc_info=True)
            return None
    
    async def _search_track(self, artist: str, title: str) -> Optional[int]:
        """
        Search for track on Musixmatch
        
        Args:
            artist: Artist name
            title: Track title
        
        Returns:
            Track ID if found, None otherwise
        """
        try:
            url = f"{self.base_url}/track.search"
            params = {
                'apikey': self.api_key,
                'q_artist': artist,
                'q_track': title,
                'f_has_lyrics': 1,
                'page_size': 1
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('message', {}).get('header', {}).get('status_code') == 200:
                            track_list = data.get('message', {}).get('body', {}).get('track_list', [])
                            
                            if track_list:
                                track_id = track_list[0].get('track', {}).get('track_id')
                                logger.debug(f"Found track ID: {track_id}")
                                return track_id
        
        except Exception as e:
            logger.error(f"Track search failed: {e}")
        
        return None
    
    async def _get_lyrics(self, track_id: int) -> Optional[str]:
        """
        Get lyrics for track
        
        Args:
            track_id: Musixmatch track ID
        
        Returns:
            Lyrics text if found, None otherwise
        """
        try:
            url = f"{self.base_url}/track.lyrics.get"
            params = {
                'apikey': self.api_key,
                'track_id': track_id
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('message', {}).get('header', {}).get('status_code') == 200:
                            lyrics_body = data.get('message', {}).get('body', {}).get('lyrics', {})
                            lyrics_text = lyrics_body.get('lyrics_body', '')
                            
                            # Remove Musixmatch watermark
                            if '******* This Lyrics is NOT for Commercial use *******' in lyrics_text:
                                lyrics_text = lyrics_text.split('*******')[0].strip()
                            
                            return lyrics_text
        
        except Exception as e:
            logger.error(f"Get lyrics failed: {e}")
        
        return None
