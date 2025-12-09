"""Tests for queue commands and thread safety"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch


class MockMetadata:
    """Mock metadata for testing"""
    def __init__(self, title: str, artist: str = "Test Artist"):
        self.title = title
        self.artist = artist
        self.voice_channel_id = None


class TestQueueThreadSafety:
    """Test thread safety of queue operations"""
    
    @pytest.fixture
    def queue_cog(self):
        """Create a QueueCommands instance with mocked bot"""
        from commands.queue import QueueCommands
        
        mock_bot = MagicMock()
        cog = QueueCommands(mock_bot)
        return cog
    
    def test_add_to_queue(self, queue_cog):
        """Test basic add to queue functionality"""
        metadata = MockMetadata("Test Song")
        
        position = queue_cog.add_to_queue(guild_id=123, metadata=metadata)
        
        assert position == 1
        assert len(queue_cog.queues[123]) == 1
    
    def test_get_next(self, queue_cog):
        """Test getting next track from queue"""
        metadata = MockMetadata("Test Song")
        queue_cog.add_to_queue(guild_id=123, metadata=metadata)
        
        next_track = queue_cog.get_next(guild_id=123)
        
        assert next_track.title == "Test Song"
        assert len(queue_cog.queues[123]) == 0
    
    def test_get_next_empty_queue(self, queue_cog):
        """Test getting from empty queue returns None"""
        result = queue_cog.get_next(guild_id=999)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_add_to_queue_async(self, queue_cog):
        """Test async add to queue"""
        metadata = MockMetadata("Async Song")
        
        position = await queue_cog.add_to_queue_async(guild_id=123, metadata=metadata)
        
        assert position == 1
    
    @pytest.mark.asyncio
    async def test_get_next_async(self, queue_cog):
        """Test async get next"""
        metadata = MockMetadata("Async Song")
        await queue_cog.add_to_queue_async(guild_id=123, metadata=metadata)
        
        next_track = await queue_cog.get_next_async(guild_id=123)
        
        assert next_track.title == "Async Song"
    
    @pytest.mark.asyncio
    async def test_concurrent_adds(self, queue_cog):
        """Test that concurrent adds are handled safely"""
        tasks = []
        
        for i in range(100):
            metadata = MockMetadata(f"Song {i}")
            task = queue_cog.add_to_queue_async(guild_id=123, metadata=metadata)
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        
        # All 100 songs should be in queue
        assert len(queue_cog.queues[123]) == 100
    
    def test_lock_exists_per_guild(self, queue_cog):
        """Test that each guild gets its own lock"""
        lock1 = queue_cog._get_lock(123)
        lock2 = queue_cog._get_lock(456)
        
        assert lock1 is not lock2
        
        # Same guild should return same lock
        lock1_again = queue_cog._get_lock(123)
        assert lock1 is lock1_again
    
    def test_queue_ordering(self, queue_cog):
        """Test that queue maintains FIFO order"""
        for i in range(5):
            metadata = MockMetadata(f"Song {i}")
            queue_cog.add_to_queue(guild_id=123, metadata=metadata)
        
        # Should come out in order
        for i in range(5):
            track = queue_cog.get_next(guild_id=123)
            assert track.title == f"Song {i}"
    
    def test_multiple_guilds(self, queue_cog):
        """Test that different guilds have separate queues"""
        queue_cog.add_to_queue(guild_id=123, metadata=MockMetadata("Guild 1 Song"))
        queue_cog.add_to_queue(guild_id=456, metadata=MockMetadata("Guild 2 Song"))
        
        track1 = queue_cog.get_next(guild_id=123)
        track2 = queue_cog.get_next(guild_id=456)
        
        assert track1.title == "Guild 1 Song"
        assert track2.title == "Guild 2 Song"
