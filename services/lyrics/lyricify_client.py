"""Lyricify API Client - Connects to LyricifyApi C# microservice"""

from typing import Optional
import aiohttp
import asyncio

from .base import BaseLyricsFetcher
from database.models import LyricsData, LyricLine, TrackInfo
from config.constants import LyricsSource
from config.logging_config import get_logger

logger = get_logger('lyrics.lyricify')

# Default port for LyricifyApi
LYRICIFY_API_URL = "http://127.0.0.1:5050"


class LyricifyClient(BaseLyricsFetcher):
    """Client for LyricifyApi C# microservice - QQ Music, Netease, Kugou lyrics"""
    
    def __init__(self, api_url: str = LYRICIFY_API_URL):
        """Initialize Lyricify client"""
        super().__init__()
        self.api_url = api_url
        self.source = LyricsSource.LYRICIFY
    
    async def is_available(self) -> bool:
        """Check if LyricifyApi is running"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_url}/health", timeout=aiohttp.ClientTimeout(total=2)) as resp:
                    return resp.status == 200
        except Exception:
            return False
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics with syllable timing from LyricifyApi
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            if not await self.is_available():
                logger.warning("LyricifyApi not available")
                return None
            
            logger.info(f"Fetching lyrics from Lyricify: {track_info.title} - {track_info.artist}")
            
            async with aiohttp.ClientSession() as session:
                # Use auto endpoint to search and get lyrics
                params = {
                    "title": track_info.title,
                    "artist": track_info.artist
                }
                async with session.get(
                    f"{self.api_url}/api/lyrics/auto",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status != 200:
                        logger.warning(f"Lyricify API error: {resp.status}")
                        return None
                    
                    data = await resp.json()
                    
                    if not data.get("success"):
                        logger.info(f"Lyricify: No lyrics found - {data.get('error', 'Unknown')}")
                        return None
                    
                    return self._parse_lyricify_response(data)
        
        except asyncio.TimeoutError:
            logger.warning("LyricifyApi request timeout")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch from Lyricify: {e}", exc_info=True)
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query (title artist)
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            if not await self.is_available():
                logger.warning("LyricifyApi not available")
                return None
            
            logger.info(f"Searching lyrics via Lyricify: {query}")
            
            # Split query into title/artist if possible
            parts = query.split(" - ")
            if len(parts) >= 2:
                title = parts[0].strip()
                artist = parts[1].strip()
            else:
                title = query
                artist = ""
            
            async with aiohttp.ClientSession() as session:
                params = {"title": title, "artist": artist}
                async with session.get(
                    f"{self.api_url}/api/lyrics/auto",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status != 200:
                        return None
                    
                    data = await resp.json()
                    
                    if not data.get("success"):
                        return None
                    
                    return self._parse_lyricify_response(data)
        
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return None
    
    async def search_sources(self, title: str, artist: str = "") -> list:
        """
        Search all sources and return available results
        
        Returns list of search results with source info
        """
        try:
            if not await self.is_available():
                return []
            
            async with aiohttp.ClientSession() as session:
                params = {"title": title, "artist": artist}
                async with session.get(
                    f"{self.api_url}/api/lyrics/search",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status != 200:
                        return []
                    
                    data = await resp.json()
                    return data.get("results", [])
        
        except Exception as e:
            logger.error(f"Search sources failed: {e}")
            return []
    
    async def get_lyrics_by_id(self, source: str, song_id: str) -> Optional[LyricsData]:
        """
        Get lyrics by source-specific ID
        
        Args:
            source: Source name (qqmusic, netease, kugou)
            song_id: Source-specific ID
        
        Returns:
            LyricsData if found, None otherwise
        """
        try:
            if not await self.is_available():
                return None
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/api/lyrics/{source}/{song_id}",
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status != 200:
                        return None
                    
                    data = await resp.json()
                    
                    if not data.get("success"):
                        return None
                    
                    return self._parse_lyricify_response(data)
        
        except Exception as e:
            logger.error(f"Get lyrics by ID failed: {e}")
            return None
    
    def _parse_lyricify_response(self, data: dict) -> Optional[LyricsData]:
        """Parse LyricifyApi response to LyricsData"""
        try:
            lyrics_data = data.get("lyrics", {})
            lines_data = lyrics_data.get("lines", [])
            
            if not lines_data:
                # If no parsed lines but has raw lyrics, try to use them
                raw_lyrics = lyrics_data.get("rawLyrics", "")
                if not raw_lyrics:
                    return None
                
                # Parse raw QRC format if available
                return self._parse_raw_qrc(raw_lyrics, data.get("hasSyllableTiming", False))
            
            lines = []
            for line_data in lines_data:
                words = []
                syllables = line_data.get("syllables", [])
                
                if syllables:
                    for syl in syllables:
                        start_ms = syl.get("start", 0)
                        duration_ms = syl.get("duration", 0)
                        words.append({
                            "text": syl.get("text", ""),
                            "start_time": start_ms / 1000.0,
                            "end_time": (start_ms + duration_ms) / 1000.0
                        })
                
                start_ms = line_data.get("startTime", 0)
                duration_ms = line_data.get("duration", 0)
                
                lines.append(LyricLine(
                    text=line_data.get("text", ""),
                    start_time=start_ms / 1000.0,
                    end_time=(start_ms + duration_ms) / 1000.0,
                    words=words if words else None
                ))
            
            return LyricsData(
                lines=lines,
                source=LyricsSource.LYRICIFY,
                offset=0,
                is_synced=True,
                has_syllable_timing=data.get("hasSyllableTiming", False)
            )
        
        except Exception as e:
            logger.error(f"Failed to parse Lyricify response: {e}")
            return None
    
    def _parse_raw_qrc(self, raw_lyrics: str, has_syllable: bool) -> Optional[LyricsData]:
        """Parse raw QRC format lyrics"""
        import re
        
        try:
            lines = []
            line_regex = re.compile(r'^\[(\d+),(\d+)\](.*)$')
            syllable_regex = re.compile(r'([^\(\)]+)\((\d+),(\d+)\)')
            
            for line_text in raw_lyrics.split('\n'):
                match = line_regex.match(line_text.strip())
                if not match:
                    continue
                
                start_ms = int(match.group(1))
                duration_ms = int(match.group(2))
                content = match.group(3)
                
                words = []
                text_parts = []
                
                for syl_match in syllable_regex.finditer(content):
                    syl_text = syl_match.group(1)
                    syl_start = int(syl_match.group(2))
                    syl_dur = int(syl_match.group(3))
                    
                    text_parts.append(syl_text)
                    words.append({
                        "text": syl_text,
                        "start_time": syl_start / 1000.0,
                        "end_time": (syl_start + syl_dur) / 1000.0
                    })
                
                full_text = "".join(text_parts).strip()
                if not full_text:
                    continue
                
                lines.append(LyricLine(
                    text=full_text,
                    start_time=start_ms / 1000.0,
                    end_time=(start_ms + duration_ms) / 1000.0,
                    words=words if words else None
                ))
            
            if not lines:
                return None
            
            return LyricsData(
                lines=lines,
                source=LyricsSource.LYRICIFY,
                offset=0,
                is_synced=True,
                has_syllable_timing=has_syllable
            )
        
        except Exception as e:
            logger.error(f"Failed to parse raw QRC: {e}")
            return None
