"""CLI-style loading spinner for Discord embeds"""

import asyncio
import discord
from typing import Optional, Callable, Any
from config.logging_config import get_logger

logger = get_logger('ui.spinner')

# Custom Discord emoji for loading animation
# Emoji must be uploaded to the bot's application in Discord Developer Portal
LOADING_EMOJI = "<a:loading:1458442919697715250>"


class LoadingSpinner:
    """
    Loading spinner for Discord embed updates.
    
    Uses custom animated emoji uploaded to Discord application.
    Updates embed message to show loading state.
    """
    
    def __init__(
        self, 
        message: discord.Message,
        update_interval: float = 2.0,  # 2 seconds (no need to animate, emoji is GIF)
        spinner_type: str = "emoji"  # emoji (default), braille, dots, or line
    ):
        """
        Initialize spinner.
        
        Args:
            message: Discord message to update
            update_interval: Seconds between updates (default 0.5)
            spinner_type: Type of spinner animation
        """
        self.message = message
        self.update_interval = update_interval
        self.frame_index = 0
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self._current_title = ""
        self._current_details = ""
        self._color = discord.Color.from_rgb(52, 152, 219)  # Blue
        
        # Use custom emoji for loading
        self.loading_emoji = LOADING_EMOJI
    
    async def _update_loop(self):
        """Background loop that updates the embed (mainly for text updates)"""
        # Initial update with emoji
        try:
            embed = discord.Embed(
                title=f"{self.loading_emoji} {self._current_title}",
                description=self._current_details,
                color=self._color
            )
            await self.message.edit(embed=embed)
        except:
            pass
        
        # Keep checking for text updates
        while self.running:
            try:
                await asyncio.sleep(self.update_interval)
                
                # Only re-edit if still running
                if self.running:
                    embed = discord.Embed(
                        title=f"{self.loading_emoji} {self._current_title}",
                        description=self._current_details,
                        color=self._color
                    )
                    await self.message.edit(embed=embed)
                
            except discord.HTTPException as e:
                if e.code == 429:  # Rate limited
                    await asyncio.sleep(e.retry_after if hasattr(e, 'retry_after') else 5)
                else:
                    logger.debug(f"Spinner update failed: {e}")
                    
            except Exception as e:
                logger.debug(f"Spinner error: {e}")
    
    async def start(self, title: str, details: str = "", color: discord.Color = None):
        """
        Start the spinner animation.
        
        Args:
            title: Title text (spinner will be prepended)
            details: Description/details text
            color: Optional embed color
        """
        self._current_title = title
        self._current_details = details
        if color:
            self._color = color
        
        self.running = True
        self._task = asyncio.create_task(self._update_loop())
        logger.debug(f"Spinner started: {title}")
    
    async def update(self, title: str = None, details: str = None):
        """
        Update spinner text without stopping animation.
        
        Args:
            title: New title (optional)
            details: New details (optional)
        """
        if title is not None:
            self._current_title = title
        if details is not None:
            self._current_details = details
    
    async def stop(self, final_title: str = None, final_details: str = None):
        """
        Stop the spinner and show final state.
        
        Args:
            final_title: Final title to display (no spinner)
            final_details: Final details to display
        """
        self.running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        # Show final state without spinner
        if final_title or final_details:
            try:
                embed = discord.Embed(
                    title=final_title or self._current_title,
                    description=final_details or self._current_details,
                    color=self._color
                )
                await self.message.edit(embed=embed)
            except:
                pass
        
        logger.debug("Spinner stopped")


async def with_spinner(
    message: discord.Message,
    title: str,
    details: str,
    coro: Callable[[], Any],
    spinner_type: str = "braille",
    update_interval: float = 0.5
) -> Any:
    """
    Execute a coroutine with spinner animation.
    
    Usage:
        result = await with_spinner(
            message=msg,
            title="Loading",
            details="Please wait",
            coro=some_async_function()
        )
    
    Args:
        message: Discord message to animate
        title: Loading title
        details: Loading details
        coro: Coroutine to execute
        spinner_type: Type of spinner (braille, dots, line)
        update_interval: Update interval in seconds
        
    Returns:
        Result of the coroutine
    """
    spinner = LoadingSpinner(message, update_interval, spinner_type)
    
    try:
        await spinner.start(title, details)
        result = await coro
        return result
    finally:
        await spinner.stop()
