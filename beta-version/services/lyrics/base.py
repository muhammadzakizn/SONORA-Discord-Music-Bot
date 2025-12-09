"""Base class for lyrics fetchers"""

from abc import ABC, abstractmethod
from typing import Optional

from database.models import LyricsData, TrackInfo
from config.constants import LyricsSource
from config.logging_config import get_logger

logger = get_logger('lyrics.base')


class BaseLyricsFetcher(ABC):
    """Abstract base class for lyrics fetchers"""
    
    def __init__(self):
        """Initialize lyrics fetcher"""
        self.source = LyricsSource.NONE
    
    @abstractmethod
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics for track
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def search(self, query: str) -> Optional[LyricsData]:
        """
        Search for lyrics by query
        
        Args:
            query: Search query (artist - title)
        
        Returns:
            LyricsData if found, None otherwise
        """
        pass
    
    def _parse_lrc_format(self, lrc_content: str) -> LyricsData:
        """
        Parse LRC format lyrics
        
        LRC format example:
        [00:12.00]Line 1
        [00:17.20]Line 2
        
        Args:
            lrc_content: LRC format lyrics string
        
        Returns:
            LyricsData with synced lyrics
        """
        from database.models import LyricLine
        from utils.romanization import romanize_lyrics_line
        import re
        
        lines = []
        lrc_pattern = re.compile(r'\[(\d{2}):(\d{2})\.(\d{2})\](.*)')
        
        for line in lrc_content.split('\n'):
            match = lrc_pattern.match(line.strip())
            if match:
                minutes = int(match.group(1))
                seconds = int(match.group(2))
                centiseconds = int(match.group(3))
                text = match.group(4).strip()
                
                start_time = minutes * 60 + seconds + centiseconds / 100
                
                if text:  # Skip empty lines
                    # Auto-romanize if needed
                    romanized = romanize_lyrics_line(text)
                    
                    lines.append(LyricLine(
                        text=text,
                        start_time=start_time,
                        end_time=start_time + 5.0,  # Default 5 seconds per line
                        romanized=romanized
                    ))
        
        # Calculate proper end times
        for i in range(len(lines) - 1):
            lines[i].end_time = lines[i + 1].start_time
        
        # No automatic offset - rely on accurate lyrics sources
        offset = 0.0
        
        return LyricsData(
            lines=lines,
            source=self.source,
            is_synced=True,
            offset=offset
        )
    
    def _create_unsynced_lyrics(self, text: str) -> LyricsData:
        """
        Create unsynced lyrics data from plain text
        
        Args:
            text: Plain text lyrics
        
        Returns:
            LyricsData with unsynced lyrics
        """
        from database.models import LyricLine
        from utils.romanization import romanize_lyrics_line
        
        lines = []
        text_lines = text.strip().split('\n')
        
        for i, line in enumerate(text_lines):
            line = line.strip()
            if line:  # Skip empty lines
                # Auto-romanize if needed
                romanized = romanize_lyrics_line(line)
                
                lines.append(LyricLine(
                    text=line,
                    start_time=i * 5.0,  # Estimate 5 seconds per line
                    end_time=(i + 1) * 5.0,
                    romanized=romanized
                ))
        
        return LyricsData(
            lines=lines,
            source=self.source,
            is_synced=False
        )
