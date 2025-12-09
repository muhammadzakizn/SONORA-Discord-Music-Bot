"""Formatting utilities for time, progress bars, etc."""

from typing import Optional
from config.constants import PROGRESS_FILLED, PROGRESS_EMPTY


class TimeFormatter:
    """Time formatting utilities"""
    
    @staticmethod
    def format_seconds(seconds: float) -> str:
        """
        Format seconds to MM:SS or HH:MM:SS
        
        Args:
            seconds: Time in seconds
        
        Returns:
            Formatted time string
        """
        # Handle string input (convert to float first)
        if isinstance(seconds, str):
            try:
                seconds = float(seconds)
            except (ValueError, TypeError):
                return "00:00"
        
        seconds = int(seconds)
        
        if seconds < 0:
            return "00:00"
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes}:{secs:02d}"
    
    @staticmethod
    def format_milliseconds(milliseconds: int) -> str:
        """
        Format milliseconds to MM:SS
        
        Args:
            milliseconds: Time in milliseconds
        
        Returns:
            Formatted time string
        """
        return TimeFormatter.format_seconds(milliseconds / 1000)
    
    @staticmethod
    def parse_time_string(time_str: str) -> Optional[float]:
        """
        Parse time string (MM:SS or HH:MM:SS) to seconds
        
        Args:
            time_str: Time string
        
        Returns:
            Seconds as float or None if invalid
        """
        try:
            parts = time_str.split(':')
            if len(parts) == 2:  # MM:SS
                minutes, seconds = map(int, parts)
                return minutes * 60 + seconds
            elif len(parts) == 3:  # HH:MM:SS
                hours, minutes, seconds = map(int, parts)
                return hours * 3600 + minutes * 60 + seconds
        except (ValueError, AttributeError):
            return None
        
        return None


class ProgressBarFormatter:
    """Progress bar formatting utilities"""
    
    @staticmethod
    def generate_bar(
        progress: float,
        length: int = 20,
        filled_char: str = PROGRESS_FILLED,
        empty_char: str = PROGRESS_EMPTY
    ) -> str:
        """
        Generate progress bar
        
        Args:
            progress: Progress (0.0 to 1.0)
            length: Bar length in characters
            filled_char: Character for filled portion
            empty_char: Character for empty portion
        
        Returns:
            Progress bar string
        """
        # Clamp progress between 0 and 1
        progress = max(0.0, min(1.0, progress))
        
        filled = int(progress * length)
        empty = length - filled
        
        return filled_char * filled + empty_char * empty
    
    @staticmethod
    def generate_with_time(
        current_time: float,
        total_time: float,
        length: int = 20
    ) -> str:
        """
        Generate progress bar with time labels
        
        Args:
            current_time: Current time in seconds
            total_time: Total time in seconds
            length: Bar length in characters
        
        Returns:
            Progress bar with time labels (e.g., "2:30 ████░░░░ 5:00")
        """
        # Handle string inputs (convert to float)
        if isinstance(current_time, str):
            try:
                current_time = float(current_time)
            except (ValueError, TypeError):
                current_time = 0
        
        if isinstance(total_time, str):
            try:
                total_time = float(total_time)
            except (ValueError, TypeError):
                total_time = 0
        
        progress = current_time / total_time if total_time > 0 else 0
        
        # Calculate filled portion more precisely
        filled = round(progress * length)
        filled = max(0, min(length, filled))  # Clamp between 0 and length
        
        # Use better Unicode characters for smoother appearance
        filled_char = "━"  # Box drawing heavy horizontal
        empty_char = "─"  # Box drawing light horizontal
        cursor = "🔘"  # Radio button as cursor
        
        # Build bar with cursor at current position
        if filled == 0:
            bar = cursor + empty_char * (length - 1)
        elif filled >= length:
            bar = filled_char * (length - 1) + cursor
        else:
            bar = filled_char * (filled - 1) + cursor + empty_char * (length - filled)
        
        current_str = TimeFormatter.format_seconds(current_time)
        total_str = TimeFormatter.format_seconds(total_time)
        
        return f"`{current_str}` {bar} `{total_str}`"
    
    @staticmethod
    def generate_percentage(progress: float, length: int = 20) -> str:
        """
        Generate progress bar with percentage
        
        Args:
            progress: Progress (0.0 to 1.0)
            length: Bar length in characters
        
        Returns:
            Progress bar with percentage (e.g., "████░░░░ 40%")
        """
        bar = ProgressBarFormatter.generate_bar(progress, length)
        percentage = int(progress * 100)
        return f"{bar} {percentage}%"


class TextFormatter:
    """Text formatting utilities"""
    
    @staticmethod
    def truncate(text: str, max_length: int = 50, suffix: str = "...") -> str:
        """
        Truncate text to max length
        
        Args:
            text: Text to truncate
            max_length: Maximum length
            suffix: Suffix to add if truncated
        
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def escape_markdown(text: str) -> str:
        """
        Escape markdown special characters
        
        Args:
            text: Text to escape
        
        Returns:
            Escaped text
        """
        special_chars = ['*', '_', '`', '~', '|', '>', '#']
        for char in special_chars:
            text = text.replace(char, f'\\{char}')
        return text
    
    @staticmethod
    def format_list(items: list, max_items: int = 10) -> str:
        """
        Format list with numbering
        
        Args:
            items: List of items
            max_items: Maximum items to show
        
        Returns:
            Formatted list string
        """
        if not items:
            return "No items"
        
        result = []
        for i, item in enumerate(items[:max_items], 1):
            result.append(f"{i}. {item}")
        
        if len(items) > max_items:
            result.append(f"... and {len(items) - max_items} more")
        
        return '\n'.join(result)
