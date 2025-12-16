"""Metadata processor - assembles complete metadata from multiple sources"""

from typing import Optional
import asyncio

from database.models import MetadataInfo, TrackInfo, AudioResult, LyricsData
from config.constants import ArtworkSource
from config.logging_config import get_logger
from .artwork import ArtworkFetcher
from services.lyrics.genius import GeniusLyricsFetcher
from services.lyrics.lrclib import LRCLIBFetcher
try:
    from services.lyrics.syncedlyrics_fetcher import SyncedLyricsFetcher
    SYNCEDLYRICS_AVAILABLE = True
except ImportError:
    SYNCEDLYRICS_AVAILABLE = False
    logger.warning("syncedlyrics not available")

logger = get_logger('metadata.processor')


class MetadataProcessor:
    """
    Metadata processor - assembles complete metadata from multiple sources
    
    Downloads in parallel:
    - Audio (from AudioDownloader)
    - Artwork (Apple Music → Spotify)
    - Lyrics (Genius → Musixmatch)
    """
    
    def __init__(self):
        """Initialize metadata processor"""
        self.artwork_fetcher = ArtworkFetcher()
        self.lrclib_fetcher = LRCLIBFetcher()  # Priority 1: Best quality with duration validation
        self.genius_fetcher = GeniusLyricsFetcher()
        
        # Syncedlyrics as fallback
        if SYNCEDLYRICS_AVAILABLE:
            self.syncedlyrics_fetcher = SyncedLyricsFetcher()
            logger.info("Metadata processor initialized (with LRCLIB + Syncedlyrics)")
        else:
            self.syncedlyrics_fetcher = None
            logger.info("Metadata processor initialized (with LRCLIB only)")
    
    async def process(
        self,
        track_info: TrackInfo,
        audio_result: AudioResult,
        requested_by: Optional[str] = None,
        requested_by_id: Optional[int] = None,
        prefer_apple_artwork: bool = True,
        voice_channel_id: Optional[int] = None
    ) -> MetadataInfo:
        """
        Process and assemble complete metadata
        
        Args:
            track_info: Track information
            audio_result: Audio download result
            requested_by: Username who requested
            requested_by_id: User ID who requested
            prefer_apple_artwork: If True, prefer Apple Music artwork (for single tracks)
                                 If False, prefer source-specific artwork (for playlists)
        
        Returns:
            Complete MetadataInfo
        """
        logger.info(f"Processing metadata for: {track_info}")
        
        # Fetch artwork and lyrics in parallel
        # For single tracks: Always prefer Apple Music (highest quality)
        # For playlists: Prefer source-specific artwork
        artwork_task = self.artwork_fetcher.fetch(track_info, prefer_apple=prefer_apple_artwork)
        
        # Multi-source lyrics fetch with priority
        # Priority: LRCLIB (synced) → Syncedlyrics (synced) → WhisperLRC (AI) → Genius (plain)
        async def fetch_lyrics_with_fallback():
            # Priority 1: LRCLIB (best synced lyrics with timestamps)
            logger.info(f"Fetching lyrics from LRCLIB: {track_info}")
            lyrics = await self.lrclib_fetcher.fetch(track_info)
            if lyrics and lyrics.lines:
                return lyrics
            
            # Priority 2: Syncedlyrics (synced lyrics fallback)
            if self.syncedlyrics_fetcher:
                logger.info("LRCLIB not found, trying Syncedlyrics...")
                lyrics = await self.syncedlyrics_fetcher.fetch(track_info)
                if lyrics and lyrics.lines:
                    return lyrics
            
            # Priority 3: WhisperLRC (AI-generated synced lyrics from audio)
            # Only if audio file exists and ENABLE_WHISPER_LYRICS=true
            try:
                from services.lyrics.whisper_lyrics import get_whisper_lyrics_fetcher, ENABLE_WHISPER_LYRICS
                if ENABLE_WHISPER_LYRICS and audio_result and audio_result.file_path:
                    logger.info("Synced lyrics not found, trying WhisperLRC...")
                    whisper = get_whisper_lyrics_fetcher()
                    if whisper.is_available:
                        # Create track info with audio path for Whisper
                        track_with_audio = {
                            'title': track_info.title,
                            'artist': track_info.artist,
                            'file_path': audio_result.file_path
                        }
                        lyrics = await whisper.fetch(track_with_audio)
                        if lyrics and lyrics.lines:
                            return lyrics
            except Exception as e:
                logger.warning(f"WhisperLRC failed: {e}")
            
            # Priority 4: Genius (plain text - not synced but better than nothing)
            logger.info("Synced lyrics not found, trying Genius (plain text)...")
            lyrics = await self.genius_fetcher.fetch(track_info)
            if lyrics and lyrics.lines:
                return lyrics
            
            return None
        
        lyrics_task = fetch_lyrics_with_fallback()
        
        # Wait for both
        artwork_result, lyrics_result = await asyncio.gather(
            artwork_task,
            lyrics_task,
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(artwork_result, Exception):
            logger.warning(f"Artwork fetch failed: {artwork_result}")
            artwork_result = None
        
        if isinstance(lyrics_result, Exception):
            logger.warning(f"Lyrics fetch failed: {lyrics_result}")
            lyrics_result = None
        
        # Extract artwork data
        artwork_url = None
        artwork_source = ArtworkSource.NONE
        if artwork_result:
            artwork_url, artwork_source = artwork_result
        
        # Handle streaming mode where audio_result may be None
        # Use track_info values as fallback
        if audio_result:
            duration = audio_result.duration
            audio_path = audio_result.file_path
            audio_source = audio_result.source
            bitrate = audio_result.bitrate
        else:
            # Streaming mode - no downloaded file
            duration = track_info.duration or 0
            audio_path = None
            audio_source = AudioSource.STREAMING
            bitrate = None
        
        # Create metadata
        metadata = MetadataInfo(
            title=track_info.title,
            artist=track_info.artist,
            album=track_info.album,
            duration=duration,
            audio_path=audio_path,
            audio_source=audio_source,
            bitrate=bitrate,
            artwork_url=artwork_url,
            artwork_source=artwork_source,
            lyrics=lyrics_result,
            release_year=track_info.release_year,
            isrc=track_info.isrc,
            requested_by=requested_by,
            requested_by_id=requested_by_id,
            voice_channel_id=voice_channel_id
        )
        
        logger.info(
            f"✓ Metadata processed: audio={metadata.audio_source}, "
            f"artwork={metadata.artwork_source}, lyrics={metadata.lyrics.source if metadata.lyrics else 'none'}"
        )
        
        return metadata
