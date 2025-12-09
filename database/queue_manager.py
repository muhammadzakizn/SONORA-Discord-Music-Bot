"""Queue management for playback"""

from typing import Dict, List, Optional
from collections import deque
import time

from database.models import QueueItem, MetadataInfo
from config.logging_config import get_logger

logger = get_logger('queue_manager')


class QueueManager:
    """Manage playback queues for multiple guilds"""
    
    def __init__(self):
        """Initialize queue manager"""
        self.queues: Dict[int, deque] = {}  # guild_id -> deque of QueueItems
        self.current_track: Dict[int, Optional[MetadataInfo]] = {}  # guild_id -> current track
        logger.info("Queue manager initialized")
    
    def add_track(
        self,
        guild_id: int,
        metadata: MetadataInfo,
        position: Optional[int] = None
    ) -> int:
        """
        Add track to queue
        
        Args:
            guild_id: Guild ID
            metadata: Track metadata
            position: Position to insert (None = end of queue)
        
        Returns:
            Position in queue
        """
        if guild_id not in self.queues:
            self.queues[guild_id] = deque()
        
        queue_item = QueueItem(
            metadata=metadata,
            position=len(self.queues[guild_id]),
            added_at=time.time(),
            added_by=metadata.requested_by,
            added_by_id=metadata.requested_by_id
        )
        
        if position is None:
            self.queues[guild_id].append(queue_item)
            pos = len(self.queues[guild_id])
        else:
            # Insert at specific position
            queue_list = list(self.queues[guild_id])
            queue_list.insert(position, queue_item)
            self.queues[guild_id] = deque(queue_list)
            pos = position + 1
        
        logger.debug(f"Added track to queue in guild {guild_id}: {metadata.title}")
        return pos
    
    def get_next_track(self, guild_id: int) -> Optional[MetadataInfo]:
        """
        Get next track from queue
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Next track metadata or None if queue empty
        """
        if guild_id not in self.queues or not self.queues[guild_id]:
            return None
        
        queue_item = self.queues[guild_id].popleft()
        self.current_track[guild_id] = queue_item.metadata
        
        logger.debug(f"Got next track from queue in guild {guild_id}: {queue_item.metadata.title}")
        return queue_item.metadata
    
    def get_queue(self, guild_id: int) -> List[QueueItem]:
        """
        Get current queue for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            List of queue items
        """
        if guild_id not in self.queues:
            return []
        
        return list(self.queues[guild_id])
    
    def get_current_track(self, guild_id: int) -> Optional[MetadataInfo]:
        """
        Get currently playing track
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Current track metadata or None
        """
        return self.current_track.get(guild_id)
    
    def clear_queue(self, guild_id: int) -> int:
        """
        Clear queue for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Number of tracks removed
        """
        if guild_id not in self.queues:
            return 0
        
        count = len(self.queues[guild_id])
        self.queues[guild_id].clear()
        
        logger.info(f"Cleared queue in guild {guild_id}: {count} tracks removed")
        return count
    
    def remove_track(self, guild_id: int, position: int) -> Optional[QueueItem]:
        """
        Remove track at position
        
        Args:
            guild_id: Guild ID
            position: Position in queue (0-based)
        
        Returns:
            Removed queue item or None if position invalid
        """
        if guild_id not in self.queues or position >= len(self.queues[guild_id]):
            return None
        
        queue_list = list(self.queues[guild_id])
        removed = queue_list.pop(position)
        self.queues[guild_id] = deque(queue_list)
        
        logger.debug(f"Removed track from queue in guild {guild_id}: {removed.metadata.title}")
        return removed
    
    def shuffle_queue(self, guild_id: int) -> None:
        """
        Shuffle queue for guild
        
        Args:
            guild_id: Guild ID
        """
        if guild_id not in self.queues or not self.queues[guild_id]:
            return
        
        import random
        queue_list = list(self.queues[guild_id])
        random.shuffle(queue_list)
        self.queues[guild_id] = deque(queue_list)
        
        logger.info(f"Shuffled queue in guild {guild_id}")
    
    def get_queue_length(self, guild_id: int) -> int:
        """
        Get queue length for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Number of tracks in queue
        """
        if guild_id not in self.queues:
            return 0
        
        return len(self.queues[guild_id])
    
    def get_total_duration(self, guild_id: int) -> float:
        """
        Get total duration of queue
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Total duration in seconds
        """
        if guild_id not in self.queues:
            return 0.0
        
        return sum(item.metadata.duration for item in self.queues[guild_id])
