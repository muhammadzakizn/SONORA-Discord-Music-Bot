"""Robust voice connection with retry logic and timeout handling"""

import asyncio
import discord
from typing import Optional
from discord import VoiceChannel

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('voice.connection')


class RobustVoiceConnection:
    """
    Robust voice connection dengan retry logic dan timeout handling
    
    Features:
    - Automatic retry on connection failure
    - Timeout handling (default 15 seconds)
    - Proper cleanup on disconnect
    - "Already connected" error handling
    """
    
    def __init__(
        self,
        timeout: int = None,
        max_reconnects: int = None
    ):
        """
        Initialize robust voice connection
        
        Args:
            timeout: Connection timeout in seconds (default: from settings)
            max_reconnects: Maximum reconnection attempts (default: from settings)
        """
        self.timeout = timeout or Settings.VOICE_TIMEOUT
        self.max_reconnects = max_reconnects or Settings.MAX_RECONNECT_ATTEMPTS
        self.connection: Optional[discord.VoiceClient] = None
        self.reconnect_attempts = 0
        self.guild_id: Optional[int] = None
        
        # Import health monitor lazily to avoid circular import
        try:
            from services.voice.health_monitor import get_health_monitor
            self.health_monitor = get_health_monitor()
        except ImportError:
            logger.warning("Health monitor not available")
            self.health_monitor = None
        
        logger.debug(
            f"RobustVoiceConnection initialized: "
            f"timeout={self.timeout}s, max_reconnects={self.max_reconnects}"
        )
    
    async def connect(self, channel: VoiceChannel) -> discord.VoiceClient:
        """
        Connect to voice channel dengan retry logic dan timeout handling
        
        Args:
            channel: Voice channel to connect to
        
        Returns:
            Connected VoiceClient
        
        Raises:
            ConnectionError: If connection fails after all retry attempts
        """
        logger.info(f"Connecting to voice channel: {channel.name} (ID: {channel.id})")
        
        # Check if already connected to this channel
        existing_client = channel.guild.voice_client
        if existing_client and existing_client.is_connected():
            if existing_client.channel.id == channel.id:
                logger.info("✓ Already connected to this channel, reusing connection")
                self.connection = existing_client
                self.guild_id = channel.guild.id
                return self.connection
            else:
                logger.info(f"Moving from {existing_client.channel.name} to {channel.name}")
                try:
                    await existing_client.move_to(channel)
                    self.connection = existing_client
                    self.guild_id = channel.guild.id
                    logger.info("✓ Moved to new channel")
                    return self.connection
                except Exception as e:
                    logger.warning(f"Failed to move: {e}, will reconnect")
                    await self.cleanup()
        
        for attempt in range(self.max_reconnects):
            try:
                # CRITICAL: Set timeout explicit
                self.connection = await asyncio.wait_for(
                    channel.connect(),
                    timeout=self.timeout
                )
                
                # Verify connection successful
                if self.connection and self.connection.is_connected():
                    logger.info(f"✓ Connected to {channel.name} (attempt {attempt + 1}/{self.max_reconnects})")
                    self.reconnect_attempts = 0  # Reset counter on success
                    self.guild_id = channel.guild.id
                    
                    # Start health monitoring if available
                    if self.health_monitor:
                        await self.health_monitor.start_monitoring(
                            guild_id=self.guild_id,
                            voice_client=self.connection,
                            on_issue_callback=self._on_health_issue
                        )
                    
                    return self.connection
                else:
                    logger.warning(f"Connection established but not connected (attempt {attempt + 1})")
                    await asyncio.sleep(Settings.RECONNECT_WAIT)
            
            except asyncio.TimeoutError:
                self.reconnect_attempts += 1
                logger.error(
                    f"Connection timeout (attempt {attempt + 1}/{self.max_reconnects})"
                )
                
                if attempt < self.max_reconnects - 1:
                    wait_time = Settings.RECONNECT_WAIT * (attempt + 1)  # Exponential backoff
                    logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
            
            except discord.errors.ClientException as e:
                if "already connected" in str(e).lower():
                    logger.warning("Bot already connected, attempting to reuse...")
                    # Try to get existing voice client
                    existing_client = channel.guild.voice_client
                    if existing_client and existing_client.is_connected():
                        logger.info("✓ Reusing existing connection")
                        self.connection = existing_client
                        self.guild_id = channel.guild.id
                        return self.connection
                    else:
                        # Cleanup and retry
                        await self.cleanup()
                        await asyncio.sleep(Settings.RECONNECT_WAIT)
                else:
                    logger.error(f"Discord ClientException: {e}")
                    raise
            
            except Exception as e:
                logger.error(f"Connection failed: {e}", exc_info=True)
                
                if attempt < self.max_reconnects - 1:
                    await asyncio.sleep(Settings.RECONNECT_WAIT)
                else:
                    raise
        
        # All attempts failed
        error_msg = f"Failed to connect after {self.max_reconnects} attempts"
        logger.error(error_msg)
        raise ConnectionError(error_msg)
    
    async def disconnect(self, force: bool = False) -> None:
        """
        Disconnect from voice channel
        
        Args:
            force: Force disconnect even if errors occur
        """
        if not self.connection:
            logger.debug("No connection to disconnect")
            return
        
        try:
            if self.connection.is_connected():
                logger.info("Disconnecting from voice channel...")
                await self.connection.disconnect(force=force)
                logger.info("✓ Disconnected from voice channel")
            else:
                logger.debug("Connection already disconnected")
        
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
            if not force:
                raise
        
        finally:
            self.connection = None
    
    async def cleanup(self) -> None:
        """
        Cleanup connection properly
        
        This includes:
        - Stopping health monitoring
        - Stopping any playback
        - Disconnecting from channel
        - Waiting before allowing reconnect
        """
        logger.info("Cleaning up voice connection...")
        
        # Stop health monitoring
        if self.guild_id and self.health_monitor:
            await self.health_monitor.stop_monitoring(self.guild_id)
        
        if self.connection:
            try:
                # Stop playback if any
                if self.connection.is_playing() or self.connection.is_paused():
                    self.connection.stop()
                    logger.debug("Stopped playback")
                
                # Disconnect
                if self.connection.is_connected():
                    await self.connection.disconnect(force=True)
                    logger.debug("Disconnected")
                
                # CRITICAL: Wait before allowing reconnect
                await asyncio.sleep(Settings.RECONNECT_WAIT)
            
            except Exception as e:
                logger.error(f"Cleanup error: {e}", exc_info=True)
            
            finally:
                self.connection = None
                self.guild_id = None
        
        logger.info("✓ Cleanup complete")
    
    async def _on_health_issue(self, guild_id: int, issue: str, consecutive: int):
        """
        Callback when health issue is detected
        
        Args:
            guild_id: Guild ID
            issue: Issue description
            consecutive: Number of consecutive issues
        """
        logger.error(f"Health issue in guild {guild_id}: {issue} (consecutive: {consecutive})")
        
        # If critical issue (3+ consecutive), stop playback
        if consecutive >= 3:
            logger.critical(f"Critical health issues detected, stopping playback")
            if self.connection and self.connection.is_playing():
                self.connection.stop()
        
        # If moderate issue (unexpected stop), try to auto-recover
        elif "stopped unexpectedly" in issue.lower():
            logger.warning("Playback stopped unexpectedly, attempting auto-recovery")
            
            if self.connection:
                # CRITICAL: Force trigger the after callback to play next track
                # The connection.stop() will call the after callback which triggers _play_next_from_queue
                try:
                    logger.info("Forcing playback stop to trigger next track callback...")
                    self.connection.stop()
                    
                    # Give time for callback to execute
                    await asyncio.sleep(0.5)
                    
                    logger.info("✓ Auto-recovery triggered")
                except Exception as e:
                    logger.error(f"Auto-recovery failed: {e}", exc_info=True)
    
    def is_connected(self) -> bool:
        """Check if currently connected to voice channel"""
        try:
            return self.connection is not None and self.connection.is_connected()
        except Exception as e:
            logger.warning(f"Error checking connection state: {e}")
            return False
    
    def is_playing(self) -> bool:
        """Check if currently playing audio"""
        try:
            return (
                self.connection is not None 
                and self.connection.is_connected() 
                and self.connection.is_playing()
            )
        except Exception as e:
            logger.warning(f"Error checking playback state: {e}")
            return False
    
    def is_paused(self) -> bool:
        """Check if playback is paused"""
        return (
            self.connection is not None 
            and self.connection.is_connected() 
            and self.connection.is_paused()
        )
    
    async def ensure_connected(self, channel: VoiceChannel = None) -> bool:
        """
        Verify voice connection is alive and restore if lost.
        
        Use this before any playback operation to ensure connection is stable.
        
        Args:
            channel: Target channel (optional, uses current if not specified)
            
        Returns:
            True if connected (or reconnected), False if failed
        """
        try:
            # Quick check - already connected and healthy
            if self.connection and self.connection.is_connected():
                # Verify with ping check
                if self.connection.latency > 0:
                    logger.debug(f"Connection healthy (latency: {self.connection.latency:.0f}ms)")
                    return True
                else:
                    # Latency 0 might indicate stale connection
                    logger.warning("Zero latency detected, checking connection state...")
            
            # Not connected or stale - need to reconnect
            if not channel:
                channel = self.channel
            
            if not channel:
                logger.error("No channel to reconnect to")
                return False
            
            logger.info(f"Connection lost, attempting reconnect to {channel.name}...")
            
            # Cleanup old connection
            await self.cleanup()
            
            # Reconnect
            await self.connect(channel)
            
            if self.is_connected():
                logger.info("✓ Reconnected successfully")
                return True
            else:
                logger.error("Reconnection failed")
                return False
                
        except Exception as e:
            logger.error(f"ensure_connected failed: {e}")
            return False
    
    def sync_state(self, guild: 'discord.Guild') -> bool:
        """
        Synchronize connection state with Discord's actual state.
        
        Use this when bot might have lost track of voice state.
        
        Args:
            guild: Discord guild to sync with
            
        Returns:
            True if connection is valid after sync
        """
        try:
            actual_voice_client = guild.voice_client
            
            if actual_voice_client and actual_voice_client.is_connected():
                # Discord says we're connected
                if self.connection != actual_voice_client:
                    logger.warning("Connection state mismatch, syncing...")
                    self.connection = actual_voice_client
                    self.guild_id = guild.id
                    logger.info("✓ State synchronized")
                return True
            else:
                # Discord says we're not connected
                if self.connection:
                    logger.warning("Internal state says connected but Discord says no")
                    self.connection = None
                    self.guild_id = None
                return False
                
        except Exception as e:
            logger.error(f"sync_state failed: {e}")
            return False
    
    async def move_to(self, channel: VoiceChannel) -> None:
        """
        Move to a different voice channel
        
        Args:
            channel: Target voice channel
        """
        if not self.connection or not self.connection.is_connected():
            logger.warning("Not connected, cannot move. Connecting to new channel...")
            await self.connect(channel)
            return
        
        try:
            logger.info(f"Moving to voice channel: {channel.name}")
            await self.connection.move_to(channel)
            logger.info(f"✓ Moved to {channel.name}")
        
        except Exception as e:
            logger.error(f"Failed to move channel: {e}")
            # Try reconnecting to new channel
            await self.cleanup()
            await self.connect(channel)
    
    @property
    def latency(self) -> float:
        """Get connection latency in seconds"""
        if self.connection:
            return self.connection.latency
        return 0.0
    
    @property
    def channel(self) -> Optional[VoiceChannel]:
        """Get current voice channel"""
        if self.connection:
            return self.connection.channel
        return None
