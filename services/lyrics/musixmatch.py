"""
Musixmatch lyrics fetcher - High quality synced lyrics with syllable timing
Uses reverse-engineered API for richsync (syllable-level timing)
"""

import asyncio
import aiohttp
import base64
import hashlib
import hmac
import json
import re
import urllib.parse
from datetime import datetime
from typing import Optional, List, Dict, Any

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo, LyricLine
from config.constants import LyricsSource
from config.logging_config import get_logger
from utils.romanization import romanize_lyrics_line

logger = get_logger('lyrics.musixmatch')


class MusixmatchFetcher(BaseLyricsFetcher):
    """
    Musixmatch lyrics fetcher with richsync (syllable-level timing)
    
    Features:
    - Syllable-level timing for smooth karaoke effect
    - World's largest lyrics database
    - Automatic signature generation for web API
    """
    
    BASE_URL = "https://www.musixmatch.com/ws/1.1/"
    USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    
    def __init__(self):
        """Initialize Musixmatch fetcher"""
        super().__init__()
        self.source = LyricsSource.SYNCED
        self.session = None
        self._secret = None
        self._secret_fetched = False
    
    async def __aenter__(self):
        """Context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        await self.close()
    
    async def close(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={"User-Agent": self.USER_AGENT}
            )
        return self.session
    
    async def _get_secret(self) -> str:
        """Fetch the signing secret from Musixmatch website"""
        if self._secret and self._secret_fetched:
            return self._secret
        
        try:
            session = await self._get_session()
            
            # Get main page to find _app.js URL
            async with session.get(
                "https://www.musixmatch.com/search",
                headers={"Cookie": "mxm_bab=AB"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                html = await resp.text()
            
            # Find _app.js URL
            pattern = r'src="([^"]*/_next/static/chunks/pages/_app-[^"]+\.js)"'
            matches = re.findall(pattern, html)
            
            if not matches:
                logger.error("Could not find _app.js URL")
                return ""
            
            app_url = matches[-1]
            
            # Fetch _app.js
            async with session.get(app_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                js_code = await resp.text()
            
            # Extract encoded secret
            secret_pattern = r'from\(\s*"(.*?)"\s*\.split'
            match = re.search(secret_pattern, js_code)
            
            if match:
                encoded = match.group(1)
                reversed_str = encoded[::-1]
                self._secret = base64.b64decode(reversed_str).decode('utf-8')
                self._secret_fetched = True
                logger.info("Successfully fetched Musixmatch signing secret")
                return self._secret
            else:
                logger.error("Could not extract secret from _app.js")
                return ""
                
        except Exception as e:
            logger.error(f"Failed to fetch Musixmatch secret: {e}")
            return ""
    
    def _generate_signature(self, url: str, secret: str) -> str:
        """Generate request signature"""
        now = datetime.now()
        date_str = f"{now.year}{str(now.month).zfill(2)}{str(now.day).zfill(2)}"
        message = (url + date_str).encode()
        key = secret.encode()
        hash_output = hmac.new(key, message, hashlib.sha256).digest()
        signature = urllib.parse.quote(base64.b64encode(hash_output).decode())
        return f"&signature={signature}&signature_protocol=sha256"
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Optional[Dict]:
        """Make signed API request"""
        try:
            secret = await self._get_secret()
            if not secret:
                logger.error("No signing secret available")
                return None
            
            session = await self._get_session()
            
            # Build URL
            param_str = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in (params or {}).items())
            url = f"{self.BASE_URL}{endpoint}?app_id=web-desktop-app-v1.0&format=json"
            if param_str:
                url += f"&{param_str}"
            
            # Add signature
            signed_url = url + self._generate_signature(url, secret)
            
            async with session.get(signed_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    logger.error(f"Musixmatch API error: {resp.status}")
                    return None
                
                data = await resp.json()
                return data
                
        except Exception as e:
            logger.error(f"Musixmatch request failed: {e}")
            return None
    
    async def search_track(self, title: str, artist: str) -> Optional[int]:
        """Search for track and return track_id"""
        query = f"{title} {artist}"
        data = await self._make_request("track.search", {
            "q": query,
            "f_has_lyrics": "true",
            "page_size": "5"
        })
        
        if not data:
            return None
        
        try:
            tracks = data.get("message", {}).get("body", {}).get("track_list", [])
            if tracks:
                # Find best match
                for track in tracks:
                    track_data = track.get("track", {})
                    track_title = track_data.get("track_name", "").lower()
                    track_artist = track_data.get("artist_name", "").lower()
                    
                    if title.lower() in track_title or track_title in title.lower():
                        if artist.lower() in track_artist or track_artist in artist.lower():
                            return track_data.get("track_id")
                
                # Return first result if no exact match
                return tracks[0]["track"]["track_id"]
        except Exception as e:
            logger.error(f"Error parsing track search: {e}")
        
        return None
    
    async def fetch_richsync(self, track_id: int) -> Optional[List[Dict]]:
        """Fetch richsync (syllable-level timing) for track"""
        data = await self._make_request("track.richsync.get", {
            "track_id": str(track_id)
        })
        
        if not data:
            return None
        
        try:
            richsync_body = data.get("message", {}).get("body", {}).get("richsync", {})
            richsync_str = richsync_body.get("richsync_body", "")
            
            if richsync_str:
                return json.loads(richsync_str)
        except Exception as e:
            logger.error(f"Error parsing richsync: {e}")
        
        return None
    
    async def fetch_lyrics_text(self, track_id: int) -> Optional[str]:
        """Fetch plain lyrics for track"""
        data = await self._make_request("track.lyrics.get", {
            "track_id": str(track_id)
        })
        
        if not data:
            return None
        
        try:
            lyrics_body = data.get("message", {}).get("body", {}).get("lyrics", {})
            lyrics_text = lyrics_body.get("lyrics_body", "")
            
            # Remove Musixmatch watermark
            if "******* This Lyrics is NOT for Commercial use *******" in lyrics_text:
                lyrics_text = lyrics_text.split("*******")[0].strip()
            
            return lyrics_text
        except Exception as e:
            logger.error(f"Error parsing lyrics: {e}")
        
        return None
    
    def _parse_richsync(self, richsync_data: List[Dict]) -> LyricsData:
        """
        Parse richsync data into LyricsData with syllable timing
        
        Richsync format:
        {
            "ts": 12.34,  # line start time
            "te": 15.67,  # line end time
            "l": [        # syllables
                {"c": "Hel", "o": 0},      # text and offset from ts
                {"c": "lo", "o": 0.3},
                {"c": " ", "o": 0.5},
                {"c": "World", "o": 0.6}
            ],
            "x": "Hello World"  # full line text
        }
        """
        lines = []
        
        for entry in richsync_data:
            ts = float(entry.get("ts", 0))
            te = float(entry.get("te", ts + 5))
            full_text = entry.get("x", "").strip()
            syllables = entry.get("l", [])
            
            if not full_text:
                continue
            
            # Build word list from syllables
            words = []
            current_word = ""
            word_start = None
            last_offset = 0
            
            for syl in syllables:
                char = syl.get("c", "")
                offset = float(syl.get("o", 0))
                last_offset = offset
                
                if char == " ":
                    # Word boundary
                    if current_word:
                        words.append({
                            "text": current_word,
                            "start_time": ts + (word_start or 0),
                            "end_time": ts + offset
                        })
                        current_word = ""
                        word_start = None
                else:
                    if word_start is None:
                        word_start = offset
                    current_word += char
            
            # Don't forget last word
            if current_word:
                words.append({
                    "text": current_word,
                    "start_time": ts + (word_start or 0),
                    "end_time": te
                })
            
            # Romanize if needed
            romanized = romanize_lyrics_line(full_text)
            
            lines.append(LyricLine(
                text=full_text,
                start_time=ts,
                end_time=te,
                romanized=romanized,
                words=words  # Store syllable/word timing
            ))
        
        return LyricsData(
            lines=lines,
            source=LyricsSource.SYNCED,
            is_synced=True,
            offset=0.0,
            has_syllable_timing=True  # Richsync always has real syllable timing
        )
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics from Musixmatch with richsync if available
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData with syllable timing if available
        """
        try:
            logger.info(f"Fetching Musixmatch lyrics: {track_info.title} - {track_info.artist}")
            
            # Search for track
            track_id = await self.search_track(track_info.title, track_info.artist)
            
            if not track_id:
                logger.warning(f"Track not found on Musixmatch: {track_info.title}")
                return None
            
            logger.info(f"Found Musixmatch track ID: {track_id}")
            
            # Try richsync first (syllable timing)
            richsync = await self.fetch_richsync(track_id)
            
            if richsync:
                logger.info(f"Got richsync for: {track_info.title} ({len(richsync)} lines)")
                return self._parse_richsync(richsync)
            
            # Fallback to regular lyrics
            logger.info(f"No richsync available, trying regular lyrics")
            lyrics_text = await self.fetch_lyrics_text(track_id)
            
            if lyrics_text:
                logger.info(f"Got plain lyrics for: {track_info.title}")
                return self._create_unsynced_lyrics(lyrics_text)
            
            return None
            
        except Exception as e:
            logger.error(f"Musixmatch fetch error: {e}")
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query (e.g., "title - artist")
        
        Returns:
            LyricsData if found
        """
        # Parse query into title and artist
        parts = query.split(" - ", 1)
        if len(parts) == 2:
            title, artist = parts
        else:
            title = query
            artist = ""
        
        # Create temporary TrackInfo
        track_info = TrackInfo(
            title=title.strip(),
            artist=artist.strip() or "Unknown",
            duration=0
        )
        
        return await self.fetch(track_info)


# Keep backwards compatibility alias
MusixmatchLyricsFetcher = MusixmatchFetcher
