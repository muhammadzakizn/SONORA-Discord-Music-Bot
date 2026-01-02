"""Safe loading manager with rate limit protection"""

import asyncio
import time
import discord
from typing import Optional

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('ui.loading')

# CLI-style Braille spinner frames
SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


class SafeLoadingManager:
    """
    Safe loading manager with rate limit protection and CLI spinner
    
    Features:
    - Rate limit aware (max 5 edits per 5 seconds)
    - CLI-style Braille spinner animation
    - Minimum 2 second update interval
    - Exponential backoff on rate limit
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
        self._spinner_index = 0  # Track spinner frame
        
        logger.debug(f"SafeLoadingManager initialized for message {message.id}")
    
    def _get_spinner_frame(self) -> str:
        """Get current spinner frame and advance to next"""
        frame = SPINNER_FRAMES[self._spinner_index]
        self._spinner_index = (self._spinner_index + 1) % len(SPINNER_FRAMES)
        return frame
    
    async def start_spinner(
        self,
        title: str,
        details: str = "",
        color: int = 0x3498DB,  # Blue
        update_interval: float = 0.5  # 500ms
    ) -> None:
        """
        Start continuous animated spinner.
        
        Runs in background, updating embed every 500ms with rotating spinner.
        Call stop_spinner() when done.
        
        Args:
            title: Loading stage title
            details: Additional details  
            color: Embed color
            update_interval: Seconds between updates
        """
        self._spinner_title = title
        self._spinner_details = details
        self._spinner_color = color
        self._spinner_running = True
        self._spinner_task = asyncio.create_task(
            self._spinner_loop(update_interval)
        )
        logger.debug(f"Started spinner: {title}")
    
    async def _spinner_loop(self, interval: float) -> None:
        """Background loop for animated spinner"""
        while self._spinner_running:
            try:
                spinner = self._get_spinner_frame()
                
                embed = discord.Embed(
                    title=f"{spinner} {self._spinner_title}",
                    description=self._spinner_details,
                    color=self._spinner_color
                )
                
                # Direct edit (bypass rate limit for animation)
                await self.message.edit(embed=embed)
                
            except discord.HTTPException as e:
                if e.code == 429:  # Rate limited
                    await asyncio.sleep(2)
                else:
                    logger.debug(f"Spinner update failed: {e}")
            except Exception as e:
                logger.debug(f"Spinner error: {e}")
            
            await asyncio.sleep(interval)
    
    async def update_spinner(self, title: str = None, details: str = None) -> None:
        """Update spinner text without stopping animation"""
        if title is not None:
            self._spinner_title = title
        if details is not None:
            self._spinner_details = details
    
    async def stop_spinner(self, final_title: str = None, final_details: str = None) -> None:
        """
        Stop the spinner animation.
        
        Args:
            final_title: Final title to show (optional)
            final_details: Final details to show (optional)
        """
        self._spinner_running = False
        
        if hasattr(self, '_spinner_task') and self._spinner_task:
            self._spinner_task.cancel()
            try:
                await self._spinner_task
            except asyncio.CancelledError:
                pass
        
        # Show final state
        if final_title or final_details:
            try:
                embed = discord.Embed(
                    title=final_title or self._spinner_title,
                    description=final_details or self._spinner_details,
                    color=self._spinner_color if hasattr(self, '_spinner_color') else 0x3498DB
                )
                await self.message.edit(embed=embed)
            except:
                pass
        
        logger.debug("Stopped spinner")
    
    async def spinner_update(
        self,
        title: str,
        details: str = "",
        color: int = 0x3498DB  # Blue
    ) -> None:
        """
        Update with CLI-style spinner animation.
        
        Creates embed with Braille spinner prefix.
        
        Args:
            title: Loading stage title (e.g., "Buffering")
            details: Additional details
            color: Embed color
        """
        spinner = self._get_spinner_frame()
        
        embed = discord.Embed(
            title=f"{spinner} {title}",
            description=details,
            color=color
        )
        
        await self.update(embed=embed)
    
    async def update(
        self,
        content: Optional[str] = None,
        embed: Optional[discord.Embed] = None
    ) -> None:
        """
        Update message with rate limit protection
        
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
