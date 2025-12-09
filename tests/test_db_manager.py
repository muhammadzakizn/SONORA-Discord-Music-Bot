"""Tests for database manager operations"""

import pytest
import asyncio
from pathlib import Path
from database.db_manager import DatabaseManager

# Configure pytest-asyncio
pytestmark = pytest.mark.asyncio(loop_scope="function")


class TestDatabaseManager:
    """Test DatabaseManager class"""
    
    @pytest.fixture
    async def db_manager(self, tmp_path):
        """Create a temporary database for testing"""
        db_path = tmp_path / "test_bot.db"
        manager = DatabaseManager(db_path)
        await manager.connect()
        yield manager
        await manager.disconnect()
    
    @pytest.mark.asyncio
    async def test_connect_creates_tables(self, tmp_path):
        """Test that connecting creates required tables"""
        db_path = tmp_path / "test_bot.db"
        manager = DatabaseManager(db_path)
        
        await manager.connect()
        
        # Check that database file was created
        assert db_path.exists()
        
        # Verify table exists by querying
        async with manager.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ) as cursor:
            tables = await cursor.fetchall()
            table_names = [t[0] for t in tables]
        
        assert "play_history" in table_names
        assert "user_preferences" in table_names
        assert "guild_settings" in table_names
        assert "favorites" in table_names
        
        await manager.disconnect()
    
    @pytest.mark.asyncio
    async def test_add_play_history(self, db_manager):
        """Test adding play history entry"""
        entry_id = await db_manager.add_play_history(
            guild_id=123456789,
            user_id=987654321,
            username="TestUser",
            title="Test Song",
            artist="Test Artist",
            duration=180.0,
            source="Spotify",
            album="Test Album"
        )
        
        assert entry_id is not None
        assert entry_id > 0
    
    @pytest.mark.asyncio
    async def test_get_play_history(self, db_manager):
        """Test retrieving play history"""
        # Add some entries first
        await db_manager.add_play_history(
            guild_id=123456789,
            user_id=987654321,
            username="TestUser",
            title="Song 1",
            artist="Artist 1",
            duration=180.0,
            source="Spotify"
        )
        await db_manager.add_play_history(
            guild_id=123456789,
            user_id=987654321,
            username="TestUser",
            title="Song 2",
            artist="Artist 2",
            duration=200.0,
            source="YouTube"
        )
        
        history = await db_manager.get_play_history(guild_id=123456789)
        
        assert len(history) == 2
        # Check both songs are present (order may vary if timestamps are equal)
        titles = [h["title"] for h in history]
        assert "Song 1" in titles
        assert "Song 2" in titles
    
    @pytest.mark.asyncio
    async def test_find_track_in_history(self, db_manager):
        """Test finding track in history"""
        await db_manager.add_play_history(
            guild_id=123456789,
            user_id=987654321,
            username="TestUser",
            title="Unique Song Title",
            artist="Unique Artist",
            duration=180.0,
            source="Spotify"
        )
        
        # Should find the track
        found = await db_manager.find_track_in_history("Unique Song Title")
        assert found is not None
        assert found["artist"] == "Unique Artist"
        
        # Should not find non-existent track
        not_found = await db_manager.find_track_in_history("Non Existent Song")
        assert not_found is None


class TestSQLInjectionPrevention:
    """Test SQL injection prevention"""
    
    @pytest.fixture
    async def db_manager(self, tmp_path):
        """Create a temporary database for testing"""
        db_path = tmp_path / "test_bot.db"
        manager = DatabaseManager(db_path)
        await manager.connect()
        yield manager
        await manager.disconnect()
    
    @pytest.mark.asyncio
    async def test_set_user_preference_validates_key(self, db_manager):
        """Test that invalid preference keys are rejected"""
        with pytest.raises(ValueError) as excinfo:
            await db_manager.set_user_preference(
                user_id=123,
                guild_id=456,
                key="invalid_key; DROP TABLE users;--",
                value="malicious"
            )
        
        assert "Invalid preference key" in str(excinfo.value)
    
    @pytest.mark.asyncio
    async def test_set_user_preference_allows_valid_key(self, db_manager):
        """Test that valid preference keys are accepted"""
        # Should not raise - valid key
        await db_manager.set_user_preference(
            user_id=123,
            guild_id=456,
            key="preferred_volume",
            value=80
        )
        
        # Verify it was set
        prefs = await db_manager.get_user_preferences(123, 456)
        assert prefs["preferred_volume"] == 80
    
    @pytest.mark.asyncio
    async def test_set_guild_setting_validates_key(self, db_manager):
        """Test that invalid guild setting keys are rejected"""
        with pytest.raises(ValueError) as excinfo:
            await db_manager.set_guild_setting(
                guild_id=123,
                key="malicious_key",
                value="evil"
            )
        
        assert "Invalid guild setting key" in str(excinfo.value)
    
    @pytest.mark.asyncio
    async def test_set_guild_setting_allows_valid_key(self, db_manager):
        """Test that valid guild setting keys are accepted"""
        await db_manager.set_guild_setting(
            guild_id=123,
            key="default_volume",
            value=75
        )
        
        settings = await db_manager.get_guild_settings(123)
        assert settings["default_volume"] == 75


class TestFavorites:
    """Test favorites functionality"""
    
    @pytest.fixture
    async def db_manager(self, tmp_path):
        """Create a temporary database for testing"""
        db_path = tmp_path / "test_bot.db"
        manager = DatabaseManager(db_path)
        await manager.connect()
        yield manager
        await manager.disconnect()
    
    @pytest.mark.asyncio
    async def test_add_favorite(self, db_manager):
        """Test adding a favorite track"""
        result = await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="Favorite Song",
            artist="Favorite Artist"
        )
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_add_duplicate_favorite(self, db_manager):
        """Test that duplicate favorites return False"""
        await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="Same Song",
            artist="Same Artist"
        )
        
        # Adding same track again should return False
        result = await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="Same Song",
            artist="Same Artist"
        )
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_favorites(self, db_manager):
        """Test getting user favorites"""
        await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="Song 1",
            artist="Artist 1"
        )
        await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="Song 2",
            artist="Artist 2"
        )
        
        favorites = await db_manager.get_favorites(user_id=123)
        
        assert len(favorites) == 2
    
    @pytest.mark.asyncio
    async def test_remove_favorite(self, db_manager):
        """Test removing a favorite"""
        await db_manager.add_favorite(
            user_id=123,
            guild_id=456,
            title="To Remove",
            artist="Artist"
        )
        
        result = await db_manager.remove_favorite(
            user_id=123,
            title="To Remove",
            artist="Artist"
        )
        
        assert result is True
        
        # Should be gone
        favorites = await db_manager.get_favorites(user_id=123)
        assert len(favorites) == 0
