"""Track verification system - ensures audio matches metadata before playback"""

import asyncio
from pathlib import Path
from typing import Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher
import subprocess
import json

from database.models import TrackInfo, AudioResult
from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('utils.track_verifier')


@dataclass
class VerificationResult:
    """Result of track verification"""
    success: bool
    confidence: float  # 0.0 to 1.0
    expected_title: str
    actual_title: str
    expected_artist: str
    actual_artist: str
    message: str


class TrackVerifier:
    """
    Verifies that downloaded audio matches expected metadata
    Uses fuzzy matching to compare titles and artists
    """
    
    # Minimum similarity threshold (0.0 - 1.0)
    MIN_TITLE_SIMILARITY = 0.6
    MIN_ARTIST_SIMILARITY = 0.5
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        
        # Lowercase
        text = text.lower()
        
        # Remove common variations
        replacements = [
            (" - ", " "),
            ("'", ""),
            ("'", ""),
            ('"', ""),
            ("(", ""),
            (")", ""),
            ("[", ""),
            ("]", ""),
            (".", ""),
            (",", ""),
            ("feat.", "ft"),
            ("featuring", "ft"),
            ("official video", ""),
            ("official audio", ""),
            ("lyric video", ""),
            ("lyrics", ""),
            ("music video", ""),
            ("audio", ""),
            ("hd", ""),
            ("hq", ""),
            ("  ", " "),
        ]
        
        for old, new in replacements:
            text = text.replace(old, new)
        
        return text.strip()
    
    @staticmethod
    def calculate_similarity(str1: str, str2: str) -> float:
        """Calculate similarity ratio between two strings"""
        if not str1 or not str2:
            return 0.0
        
        norm1 = TrackVerifier.normalize_text(str1)
        norm2 = TrackVerifier.normalize_text(str2)
        
        # If either contains the other, high match
        if norm1 in norm2 or norm2 in norm1:
            return 0.9
        
        return SequenceMatcher(None, norm1, norm2).ratio()
    
    @staticmethod
    def is_unwanted_version(expected_title: str, actual_title: str) -> Tuple[bool, str]:
        """
        Check if the actual track is an unwanted version (remix, DJ, cover, etc.)
        
        Returns:
            Tuple of (is_unwanted, reason)
        """
        expected_lower = expected_title.lower()
        actual_lower = actual_title.lower()
        
        # Unwanted keywords that indicate wrong version
        UNWANTED_KEYWORDS = [
            'remix', 'dj ', 'dj mix', 'bootleg', 'mashup', 'cover', 
            'live version', 'live from', 'live at', 'acoustic version',
            'instrumental', 'karaoke', 'tribute', 'originally performed',
            'made famous', 'backing track', 'sped up', 'slowed', 'nightcore',
            'reverb', '8d audio', 'bass boosted', 'extended mix', 'radio edit',
            'club mix', 'dance mix', 'party mix', 'edit', 'vip mix',
            'billboard masters', 'in the style of', 'version by'
        ]
        
        # Check each keyword
        for keyword in UNWANTED_KEYWORDS:
            # If keyword is in actual but NOT in expected, it's unwanted
            if keyword in actual_lower and keyword not in expected_lower:
                return True, f"Unwanted version detected: '{keyword}' in actual title"
        
        return False, ""
    
    @classmethod
    async def extract_audio_metadata(cls, file_path: Path) -> Optional[dict]:
        """
        Extract metadata from audio file using ffprobe
        
        Returns:
            Dict with title, artist, album, duration or None if failed
        """
        if not file_path.exists():
            return None
        
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                str(file_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10)
            
            if process.returncode != 0:
                logger.debug(f"ffprobe failed for {file_path}: {stderr.decode()}")
                # Fallback: use filename
                return cls._parse_filename(file_path)
            
            data = json.loads(stdout.decode())
            
            # Extract from format tags
            tags = data.get('format', {}).get('tags', {})
            
            # Try different tag variations
            title = (
                tags.get('title') or 
                tags.get('TITLE') or 
                tags.get('Title') or 
                ''
            )
            
            artist = (
                tags.get('artist') or 
                tags.get('ARTIST') or 
                tags.get('Artist') or
                tags.get('album_artist') or
                ''
            )
            
            album = (
                tags.get('album') or 
                tags.get('ALBUM') or 
                tags.get('Album') or
                ''
            )
            
            duration = float(data.get('format', {}).get('duration', 0))
            
            # If no metadata or if Unknown, fallback to filename
            # This handles cases where yt-dlp downloads with proper filename but no embedded metadata
            if not title or not artist or title.lower() == 'unknown' or artist.lower() == 'unknown':
                return cls._parse_filename(file_path)
            
            return {
                'title': title,
                'artist': artist,
                'album': album,
                'duration': duration
            }
            
        except Exception as e:
            logger.debug(f"Error extracting metadata from {file_path}: {e}")
            return cls._parse_filename(file_path)
    
    @staticmethod
    def _parse_filename(file_path: Path) -> dict:
        """Parse title and artist from filename as fallback"""
        stem = file_path.stem
        
        # Common format: "Artist - Title" or "Title - Artist"
        if ' - ' in stem:
            parts = stem.split(' - ', 1)
            return {
                'title': parts[1].strip() if len(parts) > 1 else parts[0].strip(),
                'artist': parts[0].strip(),
                'album': '',
                'duration': 0
            }
        
        return {
            'title': stem,
            'artist': '',
            'album': '',
            'duration': 0
        }
    
    @classmethod
    async def verify_track(
        cls,
        file_path: Path,
        expected: TrackInfo
    ) -> VerificationResult:
        """
        Verify that audio file matches expected track info
        
        Args:
            file_path: Path to audio file
            expected: Expected track information
            
        Returns:
            VerificationResult with match confidence
        """
        # Get actual metadata from file
        actual = await cls.extract_audio_metadata(file_path)
        
        if not actual:
            return VerificationResult(
                success=False,
                confidence=0.0,
                expected_title=expected.title,
                actual_title="",
                expected_artist=expected.artist,
                actual_artist="",
                message="Tidak dapat membaca metadata file audio"
            )
        
        # Calculate similarities
        title_sim = cls.calculate_similarity(expected.title, actual['title'])
        artist_sim = cls.calculate_similarity(expected.artist, actual['artist'])
        
        # Also check if artist appears in title or vice versa (common in YouTube)
        title_has_artist = cls.calculate_similarity(expected.artist, actual['title']) > 0.5
        
        # CRITICAL: Check for unwanted versions (remix, DJ, cover, etc.)
        is_unwanted, unwanted_reason = cls.is_unwanted_version(expected.title, actual['title'])
        if is_unwanted:
            logger.warning(f"Rejected unwanted version: {unwanted_reason}")
            return VerificationResult(
                success=False,
                confidence=0.0,
                expected_title=expected.title,
                actual_title=actual.get('title', ''),
                expected_artist=expected.artist,
                actual_artist=actual.get('artist', ''),
                message=f"Versi salah terdeteksi: {unwanted_reason}"
            )
        
        # Calculate overall confidence
        if title_sim >= cls.MIN_TITLE_SIMILARITY:
            if artist_sim >= cls.MIN_ARTIST_SIMILARITY or title_has_artist:
                confidence = (title_sim + max(artist_sim, 0.7 if title_has_artist else 0)) / 2
                success = True
                message = "Audio sesuai dengan metadata"
            else:
                confidence = title_sim * 0.7
                success = confidence >= 0.5
                message = f"Artist berbeda ({expected.artist} vs {actual['artist']})"
        else:
            confidence = title_sim
            success = False
            message = f"Title tidak cocok ({expected.title} vs {actual['title']})"
        
        logger.debug(
            f"Verification: '{expected.title}' vs '{actual['title']}' = {title_sim:.2f}, "
            f"'{expected.artist}' vs '{actual['artist']}' = {artist_sim:.2f}"
        )
        
        return VerificationResult(
            success=success,
            confidence=confidence,
            expected_title=expected.title,
            actual_title=actual.get('title', ''),
            expected_artist=expected.artist,
            actual_artist=actual.get('artist', ''),
            message=message
        )


class VerifiedPlaybackPipeline:
    """
    Pipeline for verified track playback with retry logic
    
    Flow:
    1. Get metadata
    2. Check cache
    3. Download if needed
    4. Verify audio matches metadata
    5. Retry up to 3 times on failure
    6. Play or skip
    """
    
    MAX_RETRIES = 3
    
    def __init__(self, spotify_downloader, youtube_downloader):
        self.spotify_downloader = spotify_downloader
        self.youtube_downloader = youtube_downloader
        self.verifier = TrackVerifier()
    
    async def process_track(
        self,
        track_info: TrackInfo,
        on_progress: callable = None
    ) -> Tuple[Optional[AudioResult], str]:
        """
        Process track with verification
        
        Args:
            track_info: Track to process
            on_progress: Callback for progress updates (stage, message)
            
        Returns:
            Tuple of (AudioResult or None, status_message)
        """
        async def progress(stage: str, message: str):
            if on_progress:
                await on_progress(stage, message)
        
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                # Stage 1: Check cache
                await progress("cache", f"📂 Memeriksa cache... (percobaan {attempt}/{self.MAX_RETRIES})")
                
                cached_file = self._check_cache(track_info)
                
                if cached_file:
                    await progress("verify", "✅ Memverifikasi audio dari cache...")
                    
                    verification = await TrackVerifier.verify_track(cached_file, track_info)
                    
                    if verification.success:
                        logger.info(f"✓ Cache hit verified: {track_info.title} (confidence: {verification.confidence:.2f})")
                        result = AudioResult(
                            file_path=cached_file,
                            title=track_info.title,
                            artist=track_info.artist,
                            duration=track_info.duration,
                            source="Cache",
                            bitrate=256,
                            format='opus',
                            sample_rate=48000
                        )
                        return result, "✓ Dari cache (terverifikasi)"
                    else:
                        logger.warning(f"Cache verification failed: {verification.message}")
                        # Remove bad cache file
                        try:
                            cached_file.unlink()
                            logger.info(f"Removed bad cache file: {cached_file}")
                        except:
                            pass
                
                # Stage 2: Download
                await progress("download", f"⬇️ Mengunduh audio... (percobaan {attempt}/{self.MAX_RETRIES})")
                
                audio_result = await self._download_track(track_info)
                
                if not audio_result or not audio_result.file_path.exists():
                    await progress("error", f"❌ Unduhan gagal (percobaan {attempt}/{self.MAX_RETRIES})")
                    continue
                
                # Stage 3: Verify
                await progress("verify", "✅ Memverifikasi audio...")
                
                verification = await TrackVerifier.verify_track(audio_result.file_path, track_info)
                
                if verification.success:
                    logger.info(f"✓ Download verified: {track_info.title} (confidence: {verification.confidence:.2f})")
                    return audio_result, f"✓ Terunduh dan terverifikasi (confidence: {verification.confidence:.0%})"
                else:
                    logger.warning(f"Verification failed (attempt {attempt}): {verification.message}")
                    await progress("retry", f"⚠️ Verifikasi gagal ({attempt}/{self.MAX_RETRIES}): {verification.message}")
                    
                    # Try to remove and re-download
                    try:
                        audio_result.file_path.unlink()
                    except:
                        pass
                    
                    await asyncio.sleep(1)  # Brief pause before retry
                    
            except Exception as e:
                logger.error(f"Pipeline error (attempt {attempt}): {e}")
                await progress("error", f"❌ Error: {str(e)[:50]}")
        
        # All retries failed
        return None, f"❌ Gagal setelah {self.MAX_RETRIES} percobaan"
    
    def _check_cache(self, track_info: TrackInfo) -> Optional[Path]:
        """Check if track exists in cache"""
        # Use existing cache check from downloaders
        cached = self.spotify_downloader.check_cache(track_info)
        if cached:
            return cached
        
        cached = self.youtube_downloader.check_cache(track_info)
        return cached
    
    async def _download_track(self, track_info: TrackInfo) -> Optional[AudioResult]:
        """Download track with fallback"""
        # Try Spotify first
        if track_info.url and 'spotify.com' in track_info.url:
            try:
                result = await self.spotify_downloader.download(track_info)
                if result and result.is_success:
                    return result
            except Exception as e:
                logger.debug(f"Spotify download failed: {e}")
        
        # Fallback to YouTube
        try:
            result = await self.youtube_downloader.download(track_info)
            if result and result.is_success:
                return result
        except Exception as e:
            logger.debug(f"YouTube download failed: {e}")
        
        return None
