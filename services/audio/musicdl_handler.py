"""
MusicDL Handler - Fallback audio source using MusicDL library
Supports TIDAL, SoundCloud, and other platforms as fallback
"""

import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging

from config.logging_config import get_logger

logger = get_logger('audio.musicdl')

# Check if musicdl is available
MUSICDL_AVAILABLE = False
try:
    from musicdl import musicdl
    from musicdl.modules import MusicClientBuilder
    MUSICDL_AVAILABLE = True
    logger.info("MusicDL library loaded successfully")
except ImportError:
    logger.warning("MusicDL library not available - pip install musicdl")


class MusicDLHandler:
    """
    Fallback audio source using MusicDL library
    
    Supports:
    - TIDAL (HiFi lossless audio)
    - SoundCloud (via GDStudioMusicClient)
    - Various other sources as fallback
    """
    
    # Clients to use for searching
    # NOTE: Only Netease for speed - other Chinese clients are slow
    # If Netease fails, fall back to yt-dlp directly (faster than trying other Chinese services)
    # TIDALMusicClient requires separate auth via browser, not included
    DEFAULT_CLIENTS = [
        'NeteaseMusicClient',     # Primary: Large library, fast response
        # Other clients disabled for speed:
        # 'KugouMusicClient',     # Slow, causes timeouts
        # 'KuwoMusicClient',      # Slow
        # 'QianqianMusicClient',  # Slow
    ]
    
    # Additional clients for specific platforms
    SOUNDCLOUD_CLIENT = 'GDStudioMusicClient'  # Handles SoundCloud
    APPLE_CLIENT = 'AppleMusicClient'
    
    def __init__(self, work_dir: str = "downloads/musicdl"):
        """Initialize MusicDL handler"""
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        self._music_client = None
        self._initialized = False
        
        if not MUSICDL_AVAILABLE:
            logger.warning("MusicDL not available - handler disabled")
            return
            
        # Initialize with default clients
        self._init_clients(self.DEFAULT_CLIENTS)
    
    def _init_clients(self, clients: List[str]):
        """Initialize MusicDL with specified clients"""
        try:
            # Filter to only available clients
            available_clients = list(MusicClientBuilder.REGISTERED_MODULES.keys())
            active_clients = [c for c in clients if c in available_clients]
            
            if not active_clients:
                logger.warning("No MusicDL clients available")
                return
            
            # Initialize config
            # Note: MusicDL doesn't support quality/format preferences directly
            # Files will be in original format from source (usually mp3)
            init_cfg = {}
            for client in active_clients:
                init_cfg[client] = {
                    'work_dir': str(self.work_dir / client.replace('MusicClient', '').lower()),
                    'search_size_per_source': 5,
                    'disable_print': True,
                }
            
            self._music_client = musicdl.MusicClient(
                music_sources=active_clients,
                init_music_clients_cfg=init_cfg
            )
            self._initialized = True
            logger.info(f"MusicDL initialized with clients: {active_clients}")
            
        except Exception as e:
            logger.error(f"Failed to initialize MusicDL: {e}")
            self._initialized = False
    
    @property
    def is_available(self) -> bool:
        """Check if MusicDL is available and initialized"""
        return MUSICDL_AVAILABLE and self._initialized
    
    def _score_result(self, song: Dict, query: str) -> int:
        """
        Score a search result for relevance
        
        Higher score = better match
        Negative scores for remixes/covers unless specifically requested
        """
        score = 0
        song_name = song.get('song_name', '').lower()
        artist = song.get('singers', '').lower()
        query_lower = query.lower()
        
        # Parse query for artist and title
        if ' - ' in query:
            expected_artist, expected_title = query.split(' - ', 1)
            expected_artist = expected_artist.lower().strip()
            expected_title = expected_title.lower().strip()
        else:
            expected_artist = ''
            expected_title = query_lower.strip()
        
        # Exact title match bonus
        if expected_title in song_name:
            score += 50
        
        # Exact artist match bonus
        if expected_artist and expected_artist in artist:
            score += 30
        
        # PENALIZE remixes/covers unless specifically requested
        remix_keywords = ['remix', 'cover', 'dj ', 'mashup', 'bootleg', 'edit', 
                         'extended', 'club mix', 'radio edit', 'instrumental',
                         'karaoke', 'acapella', 'acoustic version', 'live']
        
        is_remix_requested = any(kw in query_lower for kw in remix_keywords)
        
        if not is_remix_requested:
            for kw in remix_keywords:
                if kw in song_name:
                    score -= 100  # Heavy penalty for unwanted remixes
                    break
        
        # Penalize very long titles (likely have extra info)
        if len(song_name) > len(expected_title) * 2:
            score -= 20
        
        return score
    
    async def search(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search for a track using MusicDL
        
        Args:
            query: Search query (artist - title or just title)
            
        Returns:
            Song info dict or None
        """
        if not self.is_available:
            return None
        
        try:
            # Run in thread pool (MusicDL is synchronous)
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: self._music_client.search(keyword=query)
            )
            
            if not results:
                logger.debug(f"No MusicDL results for: {query}")
                return None
            
            # Collect all valid results with scores
            scored_results = []
            for source, songs in results.items():
                for song in songs:
                    if song.get('download_url') or song.get('with_valid_download_url'):
                        score = self._score_result(song, query)
                        scored_results.append({
                            'score': score,
                            'source': source,
                            'song': song
                        })
            
            if not scored_results:
                logger.debug(f"No valid download URLs in MusicDL results for: {query}")
                return None
            
            # Sort by score (highest first)
            scored_results.sort(key=lambda x: x['score'], reverse=True)
            
            # Get best result
            best = scored_results[0]
            song = best['song']
            source = best['source']
            
            # Log if we filtered out remixes
            if best['score'] < 0:
                logger.warning(f"Best result has negative score ({best['score']}), may not be accurate match")
            
            logger.info(f"Found on MusicDL ({source}): {song.get('song_name')} [score: {best['score']}]")
            return {
                'source': source,
                'title': song.get('song_name', 'Unknown'),
                'artist': song.get('singers', 'Unknown'),
                'album': song.get('album', ''),
                'duration': song.get('duration', ''),
                'file_size': song.get('file_size', ''),
                'ext': song.get('ext', 'mp3'),
                'download_url': song.get('download_url'),
                'raw_data': song,
            }
            
        except Exception as e:
            logger.error(f"MusicDL search error: {e}")
            return None
    
    async def search_and_download(
        self, 
        query: str, 
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """
        Search and download a track
        
        Args:
            query: Search query
            output_dir: Output directory (default: self.work_dir)
            
        Returns:
            Path to downloaded file or None
        """
        if not self.is_available:
            return None
        
        song_info = await self.search(query)
        if not song_info:
            return None
        
        return await self.download(song_info, output_dir)
    
    async def download(
        self, 
        song_info: Dict[str, Any],
        output_dir: Optional[Path] = None
    ) -> Optional[Path]:
        """
        Download a track from MusicDL song info
        
        Args:
            song_info: Song info from search()
            output_dir: Output directory
            
        Returns:
            Path to downloaded file or None
        """
        if not self.is_available:
            return None
        
        output_dir = output_dir or self.work_dir
        
        try:
            raw_data = song_info.get('raw_data', {})
            
            if not raw_data:
                logger.warning("No raw data in song info")
                return None
            
            # Run download in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._music_client.download(song_infos=[raw_data])
            )
            
            # Find downloaded file
            source = song_info.get('source', '').replace('MusicClient', '').lower()
            source_dir = self.work_dir / source
            
            if source_dir.exists():
                # Look for most recent file
                files = list(source_dir.rglob(f"*.{song_info.get('ext', '*')}"))
                if files:
                    # Sort by modification time, most recent first
                    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                    downloaded = files[0]
                    
                    # Move to output directory if different
                    if output_dir != source_dir:
                        output_path = output_dir / downloaded.name
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        downloaded.rename(output_path)
                        logger.info(f"Downloaded via MusicDL: {output_path}")
                        return output_path
                    
                    logger.info(f"Downloaded via MusicDL: {downloaded}")
                    return downloaded
            
            logger.warning("Download completed but file not found")
            return None
            
        except Exception as e:
            logger.error(f"MusicDL download error: {e}")
            return None
    
    async def download_from_tidal(self, url: str) -> Optional[Path]:
        """
        Download from TIDAL URL
        
        Args:
            url: TIDAL track/album/playlist URL
            
        Returns:
            Path to downloaded file or None
        """
        # TIDAL requires special handling with authentication
        # For now, search by URL metadata
        logger.info(f"TIDAL download requested: {url}")
        
        # TODO: Implement direct TIDAL URL handling
        # This would require extracting track info from the URL
        # and using TIDALMusicClient specifically
        
        return None
    
    async def download_from_soundcloud(self, url: str) -> Optional[Path]:
        """
        Download from SoundCloud URL
        
        Args:
            url: SoundCloud track URL
            
        Returns:
            Path to downloaded file or None
        """
        logger.info(f"SoundCloud download requested: {url}")
        
        # GDStudioMusicClient can handle SoundCloud
        # For now, extract info and search
        
        # TODO: Implement direct SoundCloud URL handling
        
        return None


# Global instance
_musicdl_handler: Optional[MusicDLHandler] = None


def get_musicdl_handler() -> MusicDLHandler:
    """Get or create global MusicDLHandler instance"""
    global _musicdl_handler
    if _musicdl_handler is None:
        _musicdl_handler = MusicDLHandler()
    return _musicdl_handler
