"""Input validation utilities"""

import re
from typing import Optional, Tuple
from urllib.parse import urlparse


class URLValidator:
    """URL validation and parsing"""
    
    # Spotify URL patterns
    SPOTIFY_TRACK_PATTERN = re.compile(r'spotify\.com/track/([a-zA-Z0-9]+)')
    SPOTIFY_PLAYLIST_PATTERN = re.compile(r'spotify\.com/playlist/([a-zA-Z0-9]+)')
    SPOTIFY_ALBUM_PATTERN = re.compile(r'spotify\.com/album/([a-zA-Z0-9]+)')
    
    # YouTube URL patterns
    YOUTUBE_PATTERN = re.compile(r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]+)')
    YOUTUBE_PLAYLIST_PATTERN = re.compile(r'youtube\.com/(?:playlist\?list=|watch\?[^&]*list=)([a-zA-Z0-9_-]+)')
    YOUTUBE_MUSIC_PATTERN = re.compile(r'music\.youtube\.com/(?:watch\?v=|playlist\?list=)([a-zA-Z0-9_-]+)')
    
    # Apple Music URL patterns
    APPLE_MUSIC_TRACK_PATTERN = re.compile(r'music\.apple\.com/([a-z]{2})/(?:song|album)/[^/]+/(\d+)(?:\?i=(\d+))?')
    APPLE_MUSIC_ALBUM_PATTERN = re.compile(r'music\.apple\.com/([a-z]{2})/album/[^/]+/(\d+)')
    APPLE_MUSIC_PLAYLIST_PATTERN = re.compile(r'music\.apple\.com/([a-z]{2})/playlist/[^/]+/pl\.([a-zA-Z0-9\-]+)')
    
    @staticmethod
    def is_valid_url(url: str) -> bool:
        """
        Check if string is a valid URL
        
        Args:
            url: String to validate
        
        Returns:
            True if valid URL, False otherwise
        """
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    @staticmethod
    def is_spotify_url(url: str) -> bool:
        """Check if URL is from Spotify"""
        return 'spotify.com' in url
    
    @staticmethod
    def is_youtube_url(url: str) -> bool:
        """Check if URL is from YouTube"""
        return 'youtube.com' in url or 'youtu.be' in url
    
    @staticmethod
    def is_apple_music_url(url: str) -> bool:
        """Check if URL is from Apple Music"""
        return 'music.apple.com' in url
    
    @staticmethod
    def is_youtube_music_url(url: str) -> bool:
        """Check if URL is from YouTube Music"""
        return 'music.youtube.com' in url
    
    @staticmethod
    def extract_spotify_id(url: str) -> Optional[Tuple[str, str]]:
        """
        Extract Spotify ID and type from URL
        
        Args:
            url: Spotify URL
        
        Returns:
            Tuple of (type, id) or None if not found
        """
        if match := URLValidator.SPOTIFY_TRACK_PATTERN.search(url):
            return ('track', match.group(1))
        elif match := URLValidator.SPOTIFY_PLAYLIST_PATTERN.search(url):
            return ('playlist', match.group(1))
        elif match := URLValidator.SPOTIFY_ALBUM_PATTERN.search(url):
            return ('album', match.group(1))
        return None
    
    @staticmethod
    def extract_youtube_playlist_id(url: str) -> Optional[str]:
        """
        Extract YouTube playlist ID from URL
        
        Args:
            url: YouTube URL
        
        Returns:
            Playlist ID or None if not found
        """
        if match := URLValidator.YOUTUBE_PLAYLIST_PATTERN.search(url):
            return match.group(1)
        if match := URLValidator.YOUTUBE_MUSIC_PATTERN.search(url):
            return match.group(1)
        return None
    
    @staticmethod
    def extract_apple_music_id(url: str) -> Optional[Tuple[str, str, Optional[str]]]:
        """
        Extract Apple Music ID and type from URL
        
        Args:
            url: Apple Music URL
        
        Returns:
            Tuple of (type, album_id, track_id) or None if not found
        """
        # Check for track (with ?i= parameter)
        if match := URLValidator.APPLE_MUSIC_TRACK_PATTERN.search(url):
            country = match.group(1)
            album_id = match.group(2)
            track_id = match.group(3) if len(match.groups()) >= 3 else None
            if track_id:
                return ('track', album_id, track_id)
            else:
                return ('album', album_id, None)
        
        # Check for album
        if match := URLValidator.APPLE_MUSIC_ALBUM_PATTERN.search(url):
            return ('album', match.group(2), None)
        
        # Check for playlist
        if match := URLValidator.APPLE_MUSIC_PLAYLIST_PATTERN.search(url):
            return ('playlist', match.group(2), None)
        
        return None
    
    @staticmethod
    def extract_youtube_id(url: str) -> Optional[str]:
        """
        Extract YouTube video ID from URL
        
        Args:
            url: YouTube URL
        
        Returns:
            Video ID or None if not found
        """
        if match := URLValidator.YOUTUBE_PATTERN.search(url):
            return match.group(1)
        return None
    
    @staticmethod
    def get_url_type(url: str) -> str:
        """
        Get URL type (spotify, youtube, youtube_music, apple_music, direct, unknown)
        
        Args:
            url: URL to check
        
        Returns:
            URL type as string
        """
        if URLValidator.is_spotify_url(url):
            return 'spotify'
        elif URLValidator.is_youtube_music_url(url):
            return 'youtube_music'
        elif URLValidator.is_youtube_url(url):
            return 'youtube'
        elif URLValidator.is_apple_music_url(url):
            return 'apple_music'
        elif URLValidator.is_valid_url(url):
            return 'direct'
        else:
            return 'unknown'
    
    @staticmethod
    def is_playlist_url(url: str) -> bool:
        """
        Check if URL is a playlist/album
        
        Args:
            url: URL to check
        
        Returns:
            True if playlist/album, False otherwise
        """
        # Spotify playlist/album
        if URLValidator.SPOTIFY_PLAYLIST_PATTERN.search(url) or URLValidator.SPOTIFY_ALBUM_PATTERN.search(url):
            return True
        
        # YouTube playlist
        if URLValidator.YOUTUBE_PLAYLIST_PATTERN.search(url):
            return True
        
        # Apple Music playlist/album
        if URLValidator.APPLE_MUSIC_PLAYLIST_PATTERN.search(url) or URLValidator.APPLE_MUSIC_ALBUM_PATTERN.search(url):
            return True
        
        return False


class InputValidator:
    """General input validation"""
    
    @staticmethod
    def sanitize_query(query: str) -> str:
        """
        Sanitize search query
        
        Args:
            query: Raw query string
        
        Returns:
            Sanitized query
        """
        # Remove extra whitespace
        query = ' '.join(query.split())
        
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '`', '\n', '\r']
        for char in dangerous_chars:
            query = query.replace(char, '')
        
        return query.strip()
    
    @staticmethod
    def is_valid_bitrate(bitrate: int) -> bool:
        """Check if bitrate is valid (128-320 kbps)"""
        return 128 <= bitrate <= 320
    
    @staticmethod
    def is_valid_duration(duration: float) -> bool:
        """Check if duration is reasonable (0-2 hours)"""
        return 0 < duration <= 7200  # Max 2 hours
    
    @staticmethod
    def validate_queue_size(size: int, max_size: int = 100) -> bool:
        """Check if queue size is within limits"""
        return 0 <= size <= max_size
