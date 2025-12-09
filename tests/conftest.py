# SONORA Bot Test Configuration
# Run with: pytest tests/ -v

import pytest
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Configure pytest-asyncio mode
def pytest_configure(config):
    """Configure pytest-asyncio mode"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


@pytest.fixture
def temp_db_path(tmp_path):
    """Provide temporary database path for testing"""
    return tmp_path / "test_bot.db"


@pytest.fixture
def sample_track_info():
    """Sample track information for testing"""
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "album": "Test Album",
        "duration": 180.0,
        "url": "https://example.com/track",
        "source": "test"
    }


@pytest.fixture
def sample_metadata():
    """Sample metadata for testing"""
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "album": "Test Album",
        "duration": 180,
        "artwork_url": "https://example.com/artwork.jpg",
        "lyrics": None
    }

