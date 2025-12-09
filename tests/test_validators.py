"""Tests for URL and input validators"""

import pytest
from utils.validators import URLValidator, InputValidator


class TestURLValidator:
    """Test URLValidator class"""
    
    def test_is_valid_url(self):
        """Test URL validation"""
        assert URLValidator.is_valid_url("https://example.com") is True
        assert URLValidator.is_valid_url("http://test.org/path") is True
        assert URLValidator.is_valid_url("not a url") is False
        assert URLValidator.is_valid_url("") is False
    
    def test_is_spotify_url(self):
        """Test Spotify URL detection"""
        assert URLValidator.is_spotify_url("https://open.spotify.com/track/123") is True
        assert URLValidator.is_spotify_url("https://spotify.com/album/abc") is True
        assert URLValidator.is_spotify_url("https://youtube.com/watch?v=123") is False
    
    def test_is_youtube_url(self):
        """Test YouTube URL detection"""
        assert URLValidator.is_youtube_url("https://youtube.com/watch?v=abc123") is True
        assert URLValidator.is_youtube_url("https://youtu.be/abc123") is True
        assert URLValidator.is_youtube_url("https://spotify.com/track/123") is False
    
    def test_is_apple_music_url(self):
        """Test Apple Music URL detection"""
        assert URLValidator.is_apple_music_url("https://music.apple.com/us/album/test/123") is True
        assert URLValidator.is_apple_music_url("https://spotify.com/track/123") is False
    
    def test_is_youtube_music_url(self):
        """Test YouTube Music URL detection"""
        assert URLValidator.is_youtube_music_url("https://music.youtube.com/watch?v=abc") is True
        assert URLValidator.is_youtube_music_url("https://youtube.com/watch?v=abc") is False
    
    def test_extract_spotify_id_track(self):
        """Test Spotify track ID extraction"""
        url = "https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6"
        result = URLValidator.extract_spotify_id(url)
        
        assert result is not None
        assert result[0] == "track"
        assert result[1] == "6rqhFgbbKwnb9MLmUQDhG6"
    
    def test_extract_spotify_id_playlist(self):
        """Test Spotify playlist ID extraction"""
        url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
        result = URLValidator.extract_spotify_id(url)
        
        assert result is not None
        assert result[0] == "playlist"
        assert result[1] == "37i9dQZF1DXcBWIGoYBM5M"
    
    def test_extract_spotify_id_album(self):
        """Test Spotify album ID extraction"""
        url = "https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo"
        result = URLValidator.extract_spotify_id(url)
        
        assert result is not None
        assert result[0] == "album"
        assert result[1] == "1A2GTWGtFfWp7KSQTwWOyo"
    
    def test_extract_youtube_id(self):
        """Test YouTube video ID extraction"""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        result = URLValidator.extract_youtube_id(url)
        
        assert result == "dQw4w9WgXcQ"
    
    def test_extract_youtube_id_short(self):
        """Test YouTube short URL ID extraction"""
        url = "https://youtu.be/dQw4w9WgXcQ"
        result = URLValidator.extract_youtube_id(url)
        
        assert result == "dQw4w9WgXcQ"
    
    def test_get_url_type(self):
        """Test URL type detection"""
        assert URLValidator.get_url_type("https://spotify.com/track/123") == "spotify"
        assert URLValidator.get_url_type("https://music.youtube.com/watch?v=abc") == "youtube_music"
        assert URLValidator.get_url_type("https://youtube.com/watch?v=abc") == "youtube"
        assert URLValidator.get_url_type("https://music.apple.com/us/album/test/123") == "apple_music"
        assert URLValidator.get_url_type("https://example.com/audio.mp3") == "direct"
        assert URLValidator.get_url_type("not a url") == "unknown"
    
    def test_is_playlist_url(self):
        """Test playlist URL detection"""
        # Spotify
        assert URLValidator.is_playlist_url("https://open.spotify.com/playlist/abc123") is True
        assert URLValidator.is_playlist_url("https://open.spotify.com/album/abc123") is True
        assert URLValidator.is_playlist_url("https://open.spotify.com/track/abc123") is False
        
        # YouTube
        assert URLValidator.is_playlist_url("https://youtube.com/playlist?list=PLabc123") is True
        assert URLValidator.is_playlist_url("https://youtube.com/watch?v=abc123") is False


class TestInputValidator:
    """Test InputValidator class"""
    
    def test_sanitize_query_removes_whitespace(self):
        """Test that extra whitespace is removed"""
        assert InputValidator.sanitize_query("  hello   world  ") == "hello world"
        assert InputValidator.sanitize_query("test\n\nvalue") == "test value"
    
    def test_sanitize_query_removes_dangerous_chars(self):
        """Test that dangerous characters are removed"""
        assert InputValidator.sanitize_query("test<script>") == "testscript"
        assert InputValidator.sanitize_query("hello\"world") == "helloworld"
        assert InputValidator.sanitize_query("test`ls`") == "testls"
    
    def test_is_valid_bitrate(self):
        """Test bitrate validation"""
        assert InputValidator.is_valid_bitrate(128) is True
        assert InputValidator.is_valid_bitrate(256) is True
        assert InputValidator.is_valid_bitrate(320) is True
        assert InputValidator.is_valid_bitrate(64) is False
        assert InputValidator.is_valid_bitrate(500) is False
    
    def test_is_valid_duration(self):
        """Test duration validation"""
        assert InputValidator.is_valid_duration(180) is True  # 3 minutes
        assert InputValidator.is_valid_duration(3600) is True  # 1 hour
        assert InputValidator.is_valid_duration(0) is False
        assert InputValidator.is_valid_duration(-1) is False
        assert InputValidator.is_valid_duration(10000) is False  # > 2 hours
    
    def test_validate_queue_size(self):
        """Test queue size validation"""
        assert InputValidator.validate_queue_size(0) is True
        assert InputValidator.validate_queue_size(50) is True
        assert InputValidator.validate_queue_size(100) is True
        assert InputValidator.validate_queue_size(101) is False
        assert InputValidator.validate_queue_size(-1) is False
    
    def test_validate_queue_size_custom_max(self):
        """Test queue size validation with custom max"""
        assert InputValidator.validate_queue_size(150, max_size=200) is True
        assert InputValidator.validate_queue_size(201, max_size=200) is False
