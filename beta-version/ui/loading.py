"""Safe loading manager with rate limit protection"""

import asyncio
import time
import discord
from typing import Optional

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('ui.loading')


class SafeLoadingManager:
    """
    Safe loading manager dengan rate limit protection
    
    Features:
    - Rate limit aware (max 5 edits per 5 seconds)
    - Update setiap 2 detik minimum
    - Exponential backoff on rate limit
    - Batch updates untuk efisiensi
    """
    
    def __init__(self, message: discord.Message):
        """
        Initialize loading manager
        
        Args:
            message: Discord message to manage
        """
        self.message = message
        self.last_update = 0
        self.min_interval = Settings.MIN_UPDATE_INTERVAL
        self.pending_update: Optional[asyncio.Task] = None
        self.pending_content: Optional[str] = None
        self.pending_embed: Optional[discord.Embed] = None
        
        logger.debug(f"SafeLoadingManager initialized for message {message.id}")
    
    async def update(
        self,
        content: Optional[str] = None,
        embed: Optional[discord.Embed] = None
    ) -> None:
        """
        Update message dengan rate limit protection
        
        Args:
            content: Message content
            embed: Message embed
        """
        now = time.time()
        time_since_last = now - self.last_update
        
        # Check if we need to wait
        if time_since_last < self.min_interval:
            # Too fast, schedule delayed update
            if not self.pending_update or self.pending_update.done():
                delay = self.min_interval - time_since_last
                self.pending_content = content
                self.pending_embed = embed
                self.pending_update = asyncio.create_task(
                    self._delayed_update(delay)
                )
            else:
                # Update pending content
                self.pending_content = content
                self.pending_embed = embed
            return
        
        # Perform update
        await self._do_update(content, embed)
    
    async def _do_update(
        self,
        content: Optional[str] = None,
        embed: Optional[discord.Embed] = None
    ) -> None:
        """
        Actually perform the update
        
        Args:
            content: Message content
            embed: Message embed
        """
        try:
            kwargs = {}
            if content is not None:
                kwargs['content'] = content
            if embed is not None:
                kwargs['embed'] = embed
            
            await self.message.edit(**kwargs)
            self.last_update = time.time()
            
            logger.debug(f"Updated message {self.message.id}")
        
        except discord.HTTPException as e:
            if e.code == 429:  # Rate limited
                retry_after = getattr(e, 'retry_after', 5)
                logger.warning(f"Rate limited, retry in {retry_after}s")
                await asyncio.sleep(retry_after)
                # Retry
                await self._do_update(content, embed)
            else:
                logger.error(f"Failed to update message: {e}")
        
        except Exception as e:
            logger.error(f"Unexpected error updating message: {e}", exc_info=True)
    
    async def _delayed_update(self, delay: float) -> None:
        """
        Delayed update after waiting
        
        Args:
            delay: Time to wait in seconds
        """
        await asyncio.sleep(delay)
        
        # Use pending content/embed
        await self._do_update(self.pending_content, self.pending_embed)
        
        self.pending_content = None
        self.pending_embed = None
        self.pending_update = None
    
    async def delete(self) -> None:
        """Delete the message"""
        try:
            # Cancel pending updates
            if self.pending_update and not self.pending_update.done():
                self.pending_update.cancel()
            
            await self.message.delete()
            logger.debug(f"Deleted message {self.message.id}")
        
        except discord.HTTPException as e:
            logger.warning(f"Failed to delete message: {e}")
        
        except Exception as e:
            logger.error(f"Unexpected error deleting message: {e}", exc_info=True)
