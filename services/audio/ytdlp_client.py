"""
YTDLP API Client - HTTP client for YTDLP Audio API

This module provides an async client to call the YTDLP API endpoints
instead of directly executing yt-dlp CLI commands.

API Endpoints:
- GET /api/ytdlp/search - Search tracks
- GET /api/ytdlp/stream-url - Get stream URL
- GET /api/ytdlp/download - Download audio file
"""

import asyncio
import aiohttp
import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from config.logging_config import get_logger
from database.models import TrackInfo

logger = get_logger('audio.ytdlp_client')


@dataclass
class APIConfig:
    """API Configuration"""
    host: str = "localhost"
    port: int = 9072
    
    @property
    def base_url(self) -> str:
        return f"http://{self.host}:{self.port}/api/ytdlp"


class YTDLPApiClient:
    """
    HTTP client for YTDLP Audio API.
    
    Replaces direct yt-dlp CLI calls with HTTP API calls.
    The API runs on the same server as the bot (localhost:9072).
    """
    
    def __init__(self, config: Optional[APIConfig] = None):
        """Initialize API client."""
        self.config = config or APIConfig()
        self._session: Optional[aiohttp.ClientSession] = None
        logger.info(f"YTDLPApiClient initialized: {self.config.base_url}")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=300)  # 5 min timeout for downloads
            )
        return self._session
    
    async def close(self):
        """Close the session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def is_available(self) -> bool:
        """Check if API is available."""
        try:
            session = await self._get_session()
            async with session.get(f"{self.config.base_url}/info", timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    logger.debug(f"API available: {data.get('status')}")
                    return True
        except Exception as e:
            logger.warning(f"YTDLP API not available: {e}")
        return False
    
    async def search(self, query: str) -> Optional[TrackInfo]:
        """
        Search for a track via API.
        
        Args:
            query: Search query (song name, artist, or URL)
            
        Returns:
            TrackInfo if found, None otherwise
        """
        try:
            logger.info(f"[API] Searching: {query}")
            session = await self._get_session()
            
            async with session.get(
                f"{self.config.base_url}/search",
                params={"q": query}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("success") and data.get("track"):
                        track = data["track"]
                        result = TrackInfo(
                            title=track.get("title", "Unknown"),
                            artist=track.get("artist", "Unknown"),
                            album=track.get("album"),
                            duration=track.get("duration", 0),
                            url=track.get("url"),
                            thumbnail_url=track.get("thumbnail_url"),
                            track_id=track.get("track_id")
                        )
                        logger.info(f"[API] Found: {result.title} - {result.artist}")
                        return result
                elif resp.status == 404:
                    logger.warning(f"[API] No results for: {query}")
                else:
                    logger.error(f"[API] Search failed: {resp.status}")
                    
        except Exception as e:
            logger.error(f"[API] Search error: {e}")
        
        return None
    
    async def get_stream_url(self, track_info: TrackInfo) -> Optional[str]:
        """
        Get fresh stream URL via API.
        
        Args:
            track_info: Track information
            
        Returns:
            Stream URL or None if failed (403, etc.)
        """
        try:
            logger.info(f"[API] Getting stream URL: {track_info.title}")
            session = await self._get_session()
            
            params = {}
            if track_info.url:
                params["url"] = track_info.url
            else:
                params["title"] = track_info.title
                params["artist"] = track_info.artist or ""
            
            async with session.get(
                f"{self.config.base_url}/stream-url",
                params=params
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("success") and data.get("stream_url"):
                        stream_url = data["stream_url"]
                        logger.info(f"[API] Got stream URL (expires in {data.get('expires_in', 0)}s)")
                        return stream_url
                elif resp.status == 503:
                    logger.warning(f"[API] Stream URL unavailable (403?)")
                else:
                    logger.error(f"[API] Stream URL failed: {resp.status}")
                    
        except Exception as e:
            logger.error(f"[API] Stream URL error: {e}")
        
        return None
    
    async def download(
        self, 
        track_info: TrackInfo, 
        save_dir: Path,
        audio_format: str = "opus"
    ) -> Optional[Path]:
        """
        Download audio file via API.
        
        Args:
            track_info: Track information
            save_dir: Directory to save the file
            audio_format: Output format (opus, mp3, m4a)
            
        Returns:
            Path to downloaded file or None if failed
        """
        try:
            logger.info(f"[API] Downloading: {track_info.title}")
            session = await self._get_session()
            
            params = {"format": audio_format}
            if track_info.url:
                params["url"] = track_info.url
            else:
                params["title"] = track_info.title
                params["artist"] = track_info.artist or ""
            
            async with session.get(
                f"{self.config.base_url}/download",
                params=params
            ) as resp:
                if resp.status == 200:
                    # Get filename from Content-Disposition header or generate one
                    content_disp = resp.headers.get("Content-Disposition", "")
                    if "filename=" in content_disp:
                        filename = content_disp.split("filename=")[1].strip('"')
                    else:
                        # Generate filename
                        safe_title = "".join(c for c in track_info.title if c.isalnum() or c in (' ', '-', '_')).strip()
                        safe_artist = "".join(c for c in (track_info.artist or "Unknown") if c.isalnum() or c in (' ', '-', '_')).strip()
                        filename = f"{safe_artist} - {safe_title}.{audio_format}"
                    
                    # Ensure directory exists
                    save_dir.mkdir(parents=True, exist_ok=True)
                    file_path = save_dir / filename
                    
                    # Write file
                    with open(file_path, 'wb') as f:
                        async for chunk in resp.content.iter_chunked(8192):
                            f.write(chunk)
                    
                    file_size = file_path.stat().st_size
                    logger.info(f"[API] Downloaded: {file_path.name} ({file_size / 1024 / 1024:.1f}MB)")
                    return file_path
                    
                elif resp.status == 404:
                    logger.warning(f"[API] Track not found: {track_info.title}")
                else:
                    error_data = await resp.json()
                    logger.error(f"[API] Download failed: {resp.status} - {error_data.get('error')}")
                    
        except Exception as e:
            logger.error(f"[API] Download error: {e}")
        
        return None


# Global client instance
_api_client: Optional[YTDLPApiClient] = None


def get_ytdlp_api_client() -> YTDLPApiClient:
    """Get or create global YTDLPApiClient instance."""
    global _api_client
    if _api_client is None:
        _api_client = YTDLPApiClient()
    return _api_client
