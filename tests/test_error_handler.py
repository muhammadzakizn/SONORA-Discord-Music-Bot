"""Tests for error handler classes"""

import pytest
from core.error_handler import (
    DownloadError,
    VoiceConnectionError,
    BotErrorHandler
)


class TestDownloadError:
    """Test DownloadError exception class"""
    
    def test_download_error_basic(self):
        """Test basic DownloadError creation"""
        error = DownloadError("Download failed")
        
        assert str(error) == "Download failed"
        assert error.details == []
    
    def test_download_error_with_details(self):
        """Test DownloadError with details"""
        details = [
            {"source": "Spotify", "error": "Rate limited"},
            {"source": "YouTube", "error": "Not found"}
        ]
        error = DownloadError("All sources failed", details=details)
        
        assert error.details == details
        assert len(error.details) == 2


class TestVoiceConnectionError:
    """Test VoiceConnectionError exception class"""
    
    def test_voice_connection_error(self):
        """Test VoiceConnectionError creation"""
        error = VoiceConnectionError("Failed to connect to voice channel")
        
        assert str(error) == "Failed to connect to voice channel"
    
    def test_voice_connection_error_is_exception(self):
        """Test that VoiceConnectionError is a proper Exception"""
        error = VoiceConnectionError("Connection failed")
        
        assert isinstance(error, Exception)
        
        # Should be raisable
        with pytest.raises(VoiceConnectionError):
            raise error


class TestBotErrorHandler:
    """Test BotErrorHandler class"""
    
    def test_create_error_embed(self):
        """Test creating error embed"""
        embed = BotErrorHandler.create_error_embed(
            title="Test Error",
            description="This is a test error"
        )
        
        assert embed is not None
        assert embed.color.value == 0xFF0000  # Red for error
    
    def test_create_warning_embed(self):
        """Test creating warning embed"""
        embed = BotErrorHandler.create_error_embed(
            title="Test Warning",
            description="This is a test warning",
            error_type="Warning"
        )
        
        assert embed is not None
        assert embed.color.value == 0xFFA500  # Orange for warning
    
    def test_create_info_embed(self):
        """Test creating info embed"""
        embed = BotErrorHandler.create_error_embed(
            title="Test Info",
            description="This is a test info",
            error_type="Info"
        )
        
        assert embed is not None
        assert embed.color.value == 0x3498DB  # Blue for info


class TestExceptionNaming:
    """Test that exception names don't conflict with built-ins"""
    
    def test_voice_connection_error_not_builtin(self):
        """Verify VoiceConnectionError doesn't shadow built-in ConnectionError"""
        # Our custom error
        from core.error_handler import VoiceConnectionError
        
        # Built-in ConnectionError should still be accessible
        builtin_error = ConnectionError("Socket error")
        custom_error = VoiceConnectionError("Voice error")
        
        # They should be different types
        assert type(builtin_error) != type(custom_error)
        assert isinstance(builtin_error, ConnectionError)
        assert isinstance(custom_error, VoiceConnectionError)
