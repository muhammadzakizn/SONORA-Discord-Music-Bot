"""Voice connection manager for multiple guilds"""

from typing import Dict, Optional
import discord

from .connection import RobustVoiceConnection
from config.logging_config import get_logger

logger = get_logger('voice.manager')


class VoiceManager:
    """
    Voice connection manager untuk multiple guilds
    
    Features:
    - Manage connections for multiple guilds simultaneously
    - Automatic cleanup on guild disconnect
    - Connection pooling and reuse
    """
    
    def __init__(self):
        """Initialize voice manager"""
        self.connections: Dict[int, RobustVoiceConnection] = {}
        logger.info("Voice manager initialized")
    
    async def connect(
        self,
        channel: discord.VoiceChannel
    ) -> RobustVoiceConnection:
        """
        Connect to voice channel in a guild
        
        Args:
            channel: Voice channel to connect to
        
        Returns:
            RobustVoiceConnection instance
        """
        guild_id = channel.guild.id
        
        # Check if already connected in this guild
        if guild_id in self.connections:
            connection = self.connections[guild_id]
            
            # If connected to same channel, return existing connection
            if connection.is_connected() and connection.channel == channel:
                logger.info(f"Already connected to {channel.name} in guild {guild_id}")
                return connection
            
            # If connected to different channel, disconnect first
            if connection.is_connected():
                logger.info(f"Disconnecting from old channel in guild {guild_id}")
                await connection.disconnect()
        
        # Create new connection
        connection = RobustVoiceConnection()
        await connection.connect(channel)
        
        # Store connection
        self.connections[guild_id] = connection
        
        logger.info(f"Voice connection established in guild {guild_id}")
        return connection
    
    async def disconnect(self, guild_id: int, force: bool = False) -> None:
        """
        Disconnect from voice channel in a guild
        
        Args:
            guild_id: Guild ID
            force: Force disconnect even if errors occur
        """
        if guild_id not in self.connections:
            logger.debug(f"No connection found for guild {guild_id}")
            return
        
        connection = self.connections[guild_id]
        await connection.disconnect(force=force)
        
        # Remove from pool
        del self.connections[guild_id]
        
        logger.info(f"Disconnected from guild {guild_id}")
    
    async def disconnect_all(self, force: bool = True) -> None:
        """
        Disconnect from all voice channels
        
        Args:
            force: Force disconnect even if errors occur
        """
        logger.info(f"Disconnecting from all guilds ({len(self.connections)} connections)")
        
        for guild_id in list(self.connections.keys()):
            try:
                await self.disconnect(guild_id, force=force)
            except Exception as e:
                logger.error(f"Error disconnecting from guild {guild_id}: {e}")
        
        logger.info("Disconnected from all guilds")
    
    def get_connection(self, guild_id: int) -> Optional[RobustVoiceConnection]:
        """
        Get voice connection for a guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            RobustVoiceConnection or None if not connected
        """
        return self.connections.get(guild_id)
    
    def is_connected(self, guild_id: int) -> bool:
        """
        Check if connected to voice in a guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            True if connected, False otherwise
        """
        connection = self.connections.get(guild_id)
        return connection is not None and connection.is_connected()
    
    def get_connected_guilds(self) -> list:
        """
        Get list of guild IDs where bot is connected
        
        Returns:
            List of guild IDs
        """
        return [
            guild_id for guild_id, connection in self.connections.items()
            if connection.is_connected()
        ]
    
    async def cleanup_disconnected(self) -> None:
        """
        Cleanup disconnected connections
        
        This removes connections that are no longer active
        """
        disconnected = []
        
        for guild_id, connection in self.connections.items():
            if not connection.is_connected():
                disconnected.append(guild_id)
        
        for guild_id in disconnected:
            logger.info(f"Cleaning up disconnected connection for guild {guild_id}")
            del self.connections[guild_id]
        
        if disconnected:
            logger.info(f"Cleaned up {len(disconnected)} disconnected connections")
    
    def get_stats(self) -> dict:
        """
        Get voice manager statistics
        
        Returns:
            Dictionary with stats
        """
        connected_count = len([c for c in self.connections.values() if c.is_connected()])
        playing_count = len([c for c in self.connections.values() if c.is_playing()])
        
        return {
            'total_connections': len(self.connections),
            'connected': connected_count,
            'playing': playing_count,
            'guilds': list(self.connections.keys())
        }
