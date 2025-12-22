"""Metadata processor - assembles complete metadata from multiple sources"""

from typing import Optional
import asyncio

from database.models import MetadataInfo, TrackInfo, AudioResult, LyricsData
from config.constants import ArtworkSource, AudioSource
from config.logging_config import get_logger
from .artwork import ArtworkFetcher
from services.lyrics.genius import GeniusLyricsFetcher
from services.lyrics.lrclib import LRCLIBFetcher
from services.lyrics.applemusic import AppleMusicFetcher
try:
    from services.lyrics.syncedlyrics_fetcher import SyncedLyricsFetcher
    SYNCEDLYRICS_AVAILABLE = True
except ImportError:
    SYNCEDLYRICS_AVAILABLE = False

logger = get_logger('metadata.processor')


class MetadataProcessor:
    """
    Metadata processor - assembles complete metadata from multiple sources
    
    Downloads in parallel:
    - Audio (from AudioDownloader)
    - Artwork (Apple Music → Spotify)
    - Lyrics (LRCLIB → Syncedlyrics → Genius)
    - Apple Music Lyrics (for dashboard - pre-fetched to avoid RAM spikes)
    """
    
    def __init__(self):
        """Initialize metadata processor"""
        self.artwork_fetcher = ArtworkFetcher()
        self.lrclib_fetcher = LRCLIBFetcher()  # Priority 1: Best quality with duration validation
        self.genius_fetcher = GeniusLyricsFetcher()
        
        # Get Apple Music cookies path (project root / cookies / apple_music_cookies.txt)
        import os
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        apple_cookies_path = os.path.join(project_root, 'cookies', 'apple_music_cookies.txt')
        
        # Initialize AppleMusicFetcher with cookies for pre-fetching
        self.applemusic_fetcher = AppleMusicFetcher(cookies_path=apple_cookies_path)
        
        # Syncedlyrics as fallback
        if SYNCEDLYRICS_AVAILABLE:
            self.syncedlyrics_fetcher = SyncedLyricsFetcher()
            logger.info("Metadata processor initialized (with LRCLIB + Syncedlyrics + AppleMusic)")
        else:
            self.syncedlyrics_fetcher = None
            logger.info("Metadata processor initialized (with LRCLIB + AppleMusic)")
    
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
        
        # Smart lyrics pre-fetch for dashboard:
        # 1. Try Lyricify (QQ Music) first for syllable timing
        # 2. Fallback to Apple Music if no syllable timing
        async def fetch_smart_lyrics():
            try:
                # Try Lyricify first (QQ Music - best syllable timing)
                from services.lyrics.lyricify_client import LyricifyClient
                client = LyricifyClient()
                logger.info(f"Pre-fetching Lyricify (QQ Music) lyrics: {track_info}")
                lyricify_lyrics = await client.fetch(track_info)
                
                if lyricify_lyrics and lyricify_lyrics.lines:
                    has_syllable = getattr(lyricify_lyrics, 'has_syllable_timing', False)
                    logger.info(f"Lyricify lyrics found: {len(lyricify_lyrics.lines)} lines, syllable_timing={has_syllable}")
                    
                    # If has syllable timing, use Lyricify
                    if has_syllable:
                        return lyricify_lyrics
                    
                    # Otherwise try Apple Music, but keep Lyricify as backup
                    logger.info(f"Lyricify has no syllable timing, trying Apple Music...")
                    try:
                        apple_lyrics = await self.applemusic_fetcher.fetch(track_info)
                        if apple_lyrics and apple_lyrics.lines:
                            logger.info(f"Apple Music lyrics found: {len(apple_lyrics.lines)} lines")
                            return apple_lyrics
                    except Exception as e:
                        logger.warning(f"Apple Music fetch failed: {e}")
                    
                    # Return Lyricify anyway (better than nothing)
                    return lyricify_lyrics
                else:
                    # Lyricify not found, try Apple Music
                    logger.info(f"Lyricify not found, trying Apple Music: {track_info}")
                    return await self.applemusic_fetcher.fetch(track_info)
                    
            except Exception as e:
                logger.warning(f"Lyricify pre-fetch failed: {e}, trying Apple Music...")
                try:
                    return await self.applemusic_fetcher.fetch(track_info)
                except Exception as e2:
                    logger.warning(f"Apple Music pre-fetch also failed: {e2}")
                    return None
        
        smart_lyrics_task = fetch_smart_lyrics()
        
        # Wait for all three
        artwork_result, lyrics_result, smart_lyrics_result = await asyncio.gather(
            artwork_task,
            lyrics_task,
            smart_lyrics_task,
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(artwork_result, Exception):
            logger.warning(f"Artwork fetch failed: {artwork_result}")
            artwork_result = None
        
        if isinstance(lyrics_result, Exception):
            logger.warning(f"Lyrics fetch failed: {lyrics_result}")
            lyrics_result = None
        
        if isinstance(smart_lyrics_result, Exception):
            logger.warning(f"Smart lyrics fetch failed: {smart_lyrics_result}")
            smart_lyrics_result = None
        
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
            apple_lyrics=smart_lyrics_result,  # Smart pre-fetched (Lyricify first, Apple Music fallback)
            release_year=track_info.release_year,
            isrc=track_info.isrc,
            requested_by=requested_by,
            requested_by_id=requested_by_id,
            voice_channel_id=voice_channel_id
        )
        
        logger.info(
            f"✓ Metadata processed: audio={metadata.audio_source}, "
            f"artwork={metadata.artwork_source}, lyrics={metadata.lyrics.source if metadata.lyrics else 'none'}, "
            f"smart_lyrics={'yes (' + smart_lyrics_result.source.value + ')' if smart_lyrics_result and hasattr(smart_lyrics_result, 'source') else 'no'}"
        )
        
        return metadata
