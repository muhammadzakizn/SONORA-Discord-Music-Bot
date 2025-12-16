"""
WhisperLRC Lyrics Fetcher
Auto-generate synced lyrics using Whisper AI speech-to-text
Used as fallback when no lyrics found from other sources
"""

import asyncio
import os
from pathlib import Path
from typing import Optional
import logging

from config.logging_config import get_logger
from .base import BaseLyricsFetcher, LyricsData

logger = get_logger('lyrics.whisper')

# Check if faster-whisper is available
WHISPER_AVAILABLE = False
try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
    logger.info("WhisperLRC (faster-whisper) loaded successfully")
except ImportError:
    logger.info("WhisperLRC not available - pip install faster-whisper")


# Environment variable to enable/disable WhisperLRC
ENABLE_WHISPER_LYRICS = os.environ.get('ENABLE_WHISPER_LYRICS', 'false').lower() == 'true'


class WhisperLyricsFetcher(BaseLyricsFetcher):
    """
    Auto-generate lyrics using Whisper AI speech-to-text
    
    Only used as fallback when no lyrics found from:
    - LRCLIB
    - Syncedlyrics  
    
    Before falling back to Genius (plain text).
    
    Model sizes (ordered smallest to largest):
    - tiny: Fastest, lowest accuracy (~1GB VRAM)
    - base: Good balance of speed/accuracy (~1GB VRAM)
    - small: Better accuracy, slower (~2GB VRAM)
    - medium: High accuracy, slow (~5GB VRAM)
    - large-v3: Best accuracy, very slow (~10GB VRAM)
    
    Note: Processing time is roughly 10-30 seconds per track on CPU,
    much faster with GPU (CUDA).
    """
    
    DEFAULT_MODEL = 'base'
    
    # Supported audio formats for Whisper
    SUPPORTED_FORMATS = ['.mp3', '.opus', '.wav', '.flac', '.m4a', '.ogg', '.webm']
    
    def __init__(self, model_size: str = None, device: str = 'auto'):
        """
        Initialize WhisperLRC fetcher
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large-v3)
            device: Device to use ('auto', 'cpu', 'cuda')
        """
        super().__init__()
        
        self.model_size = model_size or self.DEFAULT_MODEL
        self.device = device
        self._model = None
        self._initialized = False
        
        if not WHISPER_AVAILABLE:
            logger.info("WhisperLRC not available - faster-whisper not installed")
    
    def _ensure_model(self):
        """Lazy-load the Whisper model on first use"""
        if self._model is not None:
            return True
            
        if not WHISPER_AVAILABLE:
            return False
        
        try:
            # Determine compute type based on device
            if self.device == 'cuda':
                compute_type = 'float16'
            elif self.device == 'cpu':
                compute_type = 'int8'
            else:
                # auto - try GPU first
                compute_type = 'int8'
                self.device = 'cpu'
            
            logger.info(f"Loading Whisper model '{self.model_size}' on {self.device}...")
            
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=compute_type,
                download_root=str(Path.home() / '.cache' / 'whisper')
            )
            
            self._initialized = True
            logger.info(f"Whisper model '{self.model_size}' loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            return False
    
    @property
    def is_available(self) -> bool:
        """Check if WhisperLRC is available"""
        return WHISPER_AVAILABLE and ENABLE_WHISPER_LYRICS
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics (not applicable for Whisper - use fetch_from_audio)
        """
        logger.debug("WhisperLRC.search() called - use fetch_from_audio() instead")
        return None
    
    async def fetch(self, track_info) -> Optional[LyricsData]:
        """
        Fetch lyrics from track info
        
        This requires an audio file path in track_info.
        Falls back to None if no audio path available.
        
        Args:
            track_info: Track info with audio_path or file_path
            
        Returns:
            LyricsData with synced lyrics or None
        """
        if not self.is_available:
            return None
        
        # Get audio path from track info
        audio_path = None
        if hasattr(track_info, 'file_path'):
            audio_path = Path(track_info.file_path)
        elif hasattr(track_info, 'audio_path'):
            audio_path = Path(track_info.audio_path)
        elif isinstance(track_info, dict):
            audio_path = Path(track_info.get('file_path') or track_info.get('audio_path', ''))
        
        if not audio_path or not audio_path.exists():
            logger.debug("No audio file available for WhisperLRC")
            return None
        
        return await self.fetch_from_audio(audio_path)
    
    async def fetch_from_audio(self, audio_path: Path) -> Optional[LyricsData]:
        """
        Generate lyrics from audio file using Whisper
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            LyricsData with synced lyrics or None
        """
        if not self.is_available:
            logger.debug("WhisperLRC is disabled or unavailable")
            return None
        
        audio_path = Path(audio_path)
        
        # Validate file
        if not audio_path.exists():
            logger.warning(f"Audio file not found: {audio_path}")
            return None
        
        if audio_path.suffix.lower() not in self.SUPPORTED_FORMATS:
            logger.warning(f"Unsupported audio format: {audio_path.suffix}")
            return None
        
        try:
            # Ensure model is loaded
            loop = asyncio.get_event_loop()
            model_loaded = await loop.run_in_executor(None, self._ensure_model)
            
            if not model_loaded:
                return None
            
            logger.info(f"Generating lyrics with Whisper for: {audio_path.name}")
            
            # Transcribe audio (run in executor - CPU intensive)
            segments, info = await loop.run_in_executor(
                None,
                lambda: self._model.transcribe(
                    str(audio_path),
                    word_timestamps=True,
                    language=None,  # Auto-detect
                    vad_filter=True,  # Voice activity detection
                )
            )
            
            # Convert to LRC format
            lyrics_lines = []
            full_text_lines = []
            
            for segment in segments:
                start_time = segment.start
                text = segment.text.strip()
                
                if text:
                    # Format as LRC timestamp [mm:ss.xx]
                    minutes = int(start_time // 60)
                    seconds = start_time % 60
                    timestamp = f"[{minutes:02d}:{seconds:05.2f}]"
                    
                    lyrics_lines.append({
                        'time': start_time,
                        'text': text
                    })
                    full_text_lines.append(f"{timestamp}{text}")
            
            if not lyrics_lines:
                logger.info("No speech detected in audio")
                return None
            
            # Build LyricsData
            lyrics_data = LyricsData(
                synced=True,
                lines=lyrics_lines,
                full_text='\n'.join(full_text_lines),
                source='WhisperLRC',
                language=info.language if info else 'unknown'
            )
            
            # Set confidence based on detected language probability
            if info and hasattr(info, 'language_probability'):
                lyrics_data.confidence = info.language_probability
            else:
                lyrics_data.confidence = 0.7  # Default for AI-generated
            
            logger.info(f"Generated {len(lyrics_lines)} lyrics lines with WhisperLRC")
            return lyrics_data
            
        except Exception as e:
            logger.error(f"WhisperLRC transcription error: {e}", exc_info=True)
            return None


# Global instance (lazy)
_whisper_fetcher: Optional[WhisperLyricsFetcher] = None


def get_whisper_lyrics_fetcher(model_size: str = None) -> WhisperLyricsFetcher:
    """Get or create global WhisperLyricsFetcher instance"""
    global _whisper_fetcher
    if _whisper_fetcher is None:
        _whisper_fetcher = WhisperLyricsFetcher(model_size=model_size)
    return _whisper_fetcher
