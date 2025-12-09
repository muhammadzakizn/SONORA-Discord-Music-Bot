"""
LRCLIB lyrics fetcher - Better synced lyrics database
https://lrclib.net/
"""

import asyncio
import aiohttp
from typing import Optional
from pathlib import Path

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo, LyricsSource
from config.logging_config import get_logger

logger = get_logger('lyrics.lrclib')


class LRCLIBFetcher(BaseLyricsFetcher):
    """
    LRCLIB lyrics fetcher
    
    LRCLIB is a crowdsourced lyrics database with:
    - High quality synced lyrics
    - Multiple versions per song
    - Duration-based matching
    - Free API without rate limits
    """
    
    API_BASE = "https://lrclib.net/api"
    
    def __init__(self):
        """Initialize LRCLIB fetcher"""
        super().__init__()
        self.source = LyricsSource.SYNCED
        self.session = None
    
    async def __aenter__(self):
        """Context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensure session cleanup"""
        await self.close()
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics (not used for LRCLIB - use fetch instead)
        LRCLIB requires track info with duration, not just query string
        
        Args:
            query: Search query
        
        Returns:
            None (use fetch with TrackInfo instead)
        """
        logger.warning("LRCLIB.search() called - use fetch() with TrackInfo instead")
        return None
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch synced lyrics from LRCLIB
        
        Args:
            track_info: Track information (with duration for matching)
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            logger.info(f"Fetching lyrics from LRCLIB: {track_info}")
            
            session = await self._get_session()
            
            # Build search parameters
            params = {
                'artist_name': track_info.artist,
                'track_name': track_info.title,
            }
            
            # Add duration if available (helps match correct version)
            # Convert to int if string
            duration = track_info.duration
            if duration:
                if isinstance(duration, str):
                    try:
                        duration = int(float(duration))
                    except (ValueError, TypeError):
                        duration = None
                
                if duration and duration > 0:
                    params['duration'] = duration
            
            # Add album if available
            if track_info.album:
                params['album_name'] = track_info.album
            
            # API endpoint: GET /get
            url = f"{self.API_BASE}/get"
            
            async with session.get(url, params=params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Check if synced lyrics available
                    synced_lyrics = data.get('syncedLyrics')
                    
                    if synced_lyrics:
                        logger.info(f"✓ Found synced lyrics on LRCLIB")
                        
                        # Parse LRC format
                        lyrics_data = self._parse_lrc_format(synced_lyrics)
                        
                        # Validate duration match
                        if track_info.duration and lyrics_data.lines:
                            lyrics_duration = lyrics_data.lines[-1].end_time
                            # Convert duration to float for comparison
                            audio_duration = track_info.duration
                            if isinstance(audio_duration, str):
                                try:
                                    audio_duration = float(audio_duration)
                                except (ValueError, TypeError):
                                    audio_duration = 0
                            
                            duration_diff = abs(lyrics_duration - audio_duration)
                            
                            # If difference > 30 seconds, likely wrong version
                            if duration_diff > 30:
                                logger.warning(
                                    f"⚠️ Duration mismatch: lyrics={lyrics_duration:.0f}s, "
                                    f"audio={audio_duration:.0f}s (diff={duration_diff:.0f}s)"
                                )
                                logger.warning("Lyrics might be for different version, skipping")
                                return None
                            
                            logger.info(f"✓ Duration validated: diff={duration_diff:.1f}s (acceptable)")
                        
                        return lyrics_data
                    
                    # No synced lyrics, check plain lyrics
                    plain_lyrics = data.get('plainLyrics')
                    if plain_lyrics:
                        logger.info("Found plain lyrics on LRCLIB (not synced)")
                        # We prefer synced, so return None
                        return None
                
                elif response.status == 404:
                    logger.debug("Lyrics not found on LRCLIB")
                    return None
                else:
                    logger.warning(f"LRCLIB API error: {response.status}")
                    return None
        
        except asyncio.TimeoutError:
            logger.warning("LRCLIB request timeout")
            return None
        
        except Exception as e:
            logger.error(f"LRCLIB fetch error: {e}", exc_info=True)
            return None
    
    async def close(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
