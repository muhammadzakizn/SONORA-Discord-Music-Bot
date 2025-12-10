"""Data models for bot operations"""

from dataclasses import dataclass, field
from typing import Optional, List
from pathlib import Path

from config.constants import AudioSource, LyricsSource, ArtworkSource


@dataclass
class TrackInfo:
    """Track information from search/detection"""
    title: str
    artist: str
    album: Optional[str] = None
    duration: float = 0.0  # seconds
    url: Optional[str] = None
    track_id: Optional[str] = None
    isrc: Optional[str] = None  # International Standard Recording Code
    release_year: Optional[int] = None
    thumbnail_url: Optional[str] = None  # Thumbnail/artwork URL
    
    def __str__(self) -> str:
        return f"{self.title} - {self.artist}"


@dataclass
class AudioResult:
    """Result from audio download"""
    file_path: Path
    title: str
    artist: str
    duration: float
    source: AudioSource = AudioSource.UNKNOWN
    bitrate: int = 256  # kbps
    format: str = 'opus'
    sample_rate: int = 48000  # Hz
    error: Optional[str] = None
    
    @property
    def is_success(self) -> bool:
        """Check if download was successful"""
        return self.file_path.exists() and self.error is None


@dataclass
class LyricLine:
    """Single line of lyrics with timing"""
    text: str
    start_time: float = 0.0  # seconds
    end_time: float = 0.0  # seconds
    romanized: Optional[str] = None  # Romanized/transliterated version (for non-latin scripts)
    
    def is_active(self, current_time: float) -> bool:
        """Check if this line is active at current time"""
        return self.start_time <= current_time <= self.end_time


@dataclass
class LyricsData:
    """Lyrics data with timing information"""
    lines: List[LyricLine] = field(default_factory=list)
    source: LyricsSource = LyricsSource.NONE
    is_synced: bool = False
    language: Optional[str] = None
    offset: float = 0.0  # Timing offset in seconds (can be negative)
    
    def get_lines_at_time(self, current_time: float, count: int = 3, include_romanization: bool = True) -> List[str]:
        """
        Get lyrics lines at specific time with Apple Music style formatting
        - Middle line (index 1) is BOLD (current/active)
        - Lines before/after show upcoming/previous
        - Instrumental breaks show ". . ."
        - Non-latin scripts show romanization below
        
        Args:
            current_time: Current playback time in seconds
            count: Number of lines to return (default: 3)
            include_romanization: Include romanization for non-latin scripts
        
        Returns:
            List of lyrics lines with formatting (may include romanization)
        """
        if not self.lines:
            return [""] * count
        
        # Apply timing offset (adjust for version differences, intro length, etc.)
        adjusted_time = current_time + self.offset
        
        if not self.is_synced:
            # For non-synced lyrics, estimate position
            total_duration = self.lines[-1].end_time if self.lines else 0
            if total_duration > 0:
                progress = adjusted_time / total_duration
                line_index = int(progress * len(self.lines))
            else:
                line_index = 0
        else:
            # For synced lyrics, find current line (middle line) with adjusted time
            line_index = -1
            for i, line in enumerate(self.lines):
                if line.is_active(adjusted_time):
                    line_index = i
                    break
            
            # If no active line found, check for gap (instrumental break)
            if line_index == -1 and len(self.lines) > 0:
                # Check if we're in a gap between lines (use adjusted time)
                in_gap = False
                for i in range(len(self.lines) - 1):
                    if self.lines[i].end_time < adjusted_time < self.lines[i + 1].start_time:
                        # In a gap - show instrumental indicator (Apple Music style)
                        gap_duration = self.lines[i + 1].start_time - self.lines[i].end_time
                        
                        # Show dots for any significant gap (0.5 seconds or more)
                        # This catches instrumental breaks, pauses, and transitions
                        if gap_duration > 0.5:
                            # Previous line (fading out)
                            prev_line = self.lines[i].text if i >= 0 else ""
                            # Next line (coming up)
                            next_line = self.lines[i + 1].text if i + 1 < len(self.lines) else ""
                            
                            return [prev_line, "• • •", next_line][:count]
                        
                        # For very short gaps, just show previous line
                        line_index = i
                        in_gap = True
                        break
                
                if not in_gap:
                    # Check if we're before first line or after last line (use adjusted time)
                    if adjusted_time < self.lines[0].start_time:
                        # Before song starts - show dots
                        return ["", "• • •", self.lines[0].text][:count]
                    elif adjusted_time > self.lines[-1].end_time:
                        # After song ends - show dots
                        return [self.lines[-1].text, "• • •", ""][:count]
                    
                    # Find closest upcoming line (use adjusted time)
                    for i, line in enumerate(self.lines):
                        if line.start_time > adjusted_time:
                            line_index = max(0, i - 1)
                            break
                    else:
                        line_index = len(self.lines) - 1
        
        # Get 3 lines: previous, CURRENT (bold), next
        # Middle line (index 1) is the active/current line
        result = []
        
        # Calculate which lines to show (current line in middle)
        start_idx = line_index - 1
        
        for i in range(count):
            idx = start_idx + i
            
            if idx < 0 or idx >= len(self.lines):
                result.append("")
            else:
                line_obj = self.lines[idx]
                line_text = line_obj.text
                
                # Check if we need to add romanization
                formatted_line = line_text
                if include_romanization and line_obj.romanized:
                    # Format: Original text + romanization below in smaller/italic
                    # Use different formatting for middle line (bold)
                    if i == 1 and self.is_synced:  # Middle line (current)
                        formatted_line = f"**{line_text}**\n*{line_obj.romanized}*"
                    else:
                        formatted_line = f"{line_text}\n*{line_obj.romanized}*"
                else:
                    # No romanization, just format normally
                    if i == 1 and self.is_synced:  # Middle line
                        if line_text:
                            formatted_line = f"**{line_text}**"  # Discord bold formatting
                        else:
                            formatted_line = ""
                    else:
                        formatted_line = line_text
                
                result.append(formatted_line)
        
        # If no lyrics at this time, show instrumental
        if not any(result) or (line_index == -1 and not self.is_synced):
            return ["", "• • •", ""][:count]  # Larger dots like Apple Music
        
        return result


@dataclass
class MetadataInfo:
    """Complete metadata for a track"""
    # Basic info
    title: str
    artist: str
    album: Optional[str] = None
    duration: float = 0.0
    
    # Audio
    audio_path: Optional[Path] = None
    audio_source: AudioSource = AudioSource.UNKNOWN
    bitrate: int = 256
    
    # Artwork
    artwork_url: Optional[str] = None
    artwork_path: Optional[Path] = None
    artwork_source: ArtworkSource = ArtworkSource.NONE
    
    # Lyrics
    lyrics: Optional[LyricsData] = None
    
    # Additional metadata
    release_year: Optional[int] = None
    genre: Optional[str] = None
    isrc: Optional[str] = None
    
    # User info
    requested_by: Optional[str] = None
    requested_by_id: Optional[int] = None
    voice_channel_id: Optional[int] = None  # Track which voice channel this was requested from
    
    def __str__(self) -> str:
        return f"{self.title} - {self.artist}"
    
    @property
    def has_lyrics(self) -> bool:
        """Check if lyrics are available"""
        return self.lyrics is not None and len(self.lyrics.lines) > 0
    
    @property
    def has_synced_lyrics(self) -> bool:
        """Check if synced lyrics are available"""
        return self.has_lyrics and self.lyrics.is_synced
    
    @property
    def has_artwork(self) -> bool:
        """Check if artwork is available"""
        return self.artwork_url is not None or self.artwork_path is not None


@dataclass
class QueueItem:
    """Item in playback queue"""
    metadata: MetadataInfo
    position: int = 0
    added_at: float = 0.0  # timestamp
    added_by: Optional[str] = None
    added_by_id: Optional[int] = None
    
    def __str__(self) -> str:
        return f"{self.position}. {self.metadata.title} - {self.metadata.artist}"
