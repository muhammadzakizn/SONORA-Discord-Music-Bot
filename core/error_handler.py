"""Global error handler for bot operations"""

import asyncio
import logging
import discord
from typing import Optional, Union
from discord.ext import commands

from config.logging_config import get_logger

logger = get_logger('error_handler')


class DownloadError(Exception):
    """Raised when audio download fails from all sources"""
    def __init__(self, message: str, details: Optional[list] = None):
        super().__init__(message)
        self.details = details or []


class VoiceConnectionError(Exception):
    """Raised when voice connection fails"""
    pass


class BotErrorHandler:
    """Centralized error handling untuk semua operations"""
    
    @staticmethod
    async def handle_command_error(
        ctx: commands.Context,
        error: Exception,
        send_to_user: bool = True
    ) -> None:
        """
        Handle semua command errors
        
        Args:
            ctx: Command context
            error: Exception yang terjadi
            send_to_user: Whether to send error message to user
        """
        error_message = None
        
        # Connection errors
        if isinstance(error, asyncio.TimeoutError):
            error_message = "❌ Connection timeout. Coba lagi dalam beberapa detik."
            logger.error(f"Connection timeout in guild {ctx.guild.id if ctx.guild else 'DM'}")
            
        elif isinstance(error, discord.errors.ClientException):
            if "already connected" in str(error).lower():
                error_message = "❌ Bot sudah connected ke voice channel. Gunakan `/disconnect` dulu."
            else:
                error_message = f"❌ Discord error: {error}"
            logger.error(f"Discord ClientException: {error}", exc_info=True)
        
        # Download errors
        elif isinstance(error, DownloadError):
            error_details = "\n".join([f"- {detail.get('source', 'Unknown')}: {detail.get('error', 'Unknown error')}" 
                                      for detail in error.details[:3]])  # Show max 3 errors
            error_message = (
                f"❌ Gagal download audio dari semua source\n"
                f"```\n{error_details}\n```"
            )
            logger.error(f"Download failed: {error.details}")
        
        # Rate limit errors
        elif isinstance(error, discord.HTTPException) and error.code == 429:
            retry_after = getattr(error, 'retry_after', 5)
            error_message = (
                f"⚠️ Rate limited oleh Discord. Coba lagi dalam {retry_after:.0f} detik."
            )
            logger.warning(f"Rate limited: retry after {retry_after}s")
        
        # Voice connection errors
        elif isinstance(error, ConnectionError):
            error_message = f"❌ Voice connection error: {error}"
            logger.error(f"Voice connection failed: {error}")
        
        # Command errors
        elif isinstance(error, commands.MissingRequiredArgument):
            error_message = f"❌ Missing argument: `{error.param.name}`"
            logger.warning(f"Missing argument: {error.param.name}")
        
        elif isinstance(error, commands.BadArgument):
            error_message = f"❌ Invalid argument: {error}"
            logger.warning(f"Bad argument: {error}")
        
        elif isinstance(error, commands.CommandNotFound):
            # Silently ignore - no need to notify user
            logger.debug(f"Command not found: {error}")
            return
        
        elif isinstance(error, commands.MissingPermissions):
            error_message = f"❌ Kamu tidak punya permission: {', '.join(error.missing_permissions)}"
            logger.warning(f"Missing permissions: {error.missing_permissions}")
        
        elif isinstance(error, commands.BotMissingPermissions):
            error_message = f"❌ Bot tidak punya permission: {', '.join(error.missing_permissions)}"
            logger.error(f"Bot missing permissions: {error.missing_permissions}")
        
        # Generic errors
        else:
            error_message = (
                f"❌ Terjadi error: `{type(error).__name__}`\n"
                f"```{str(error)[:200]}```"
            )
            logger.error(f"Unhandled error: {type(error).__name__}: {error}", exc_info=True)
        
        # Send error message to user
        if send_to_user and error_message and ctx:
            try:
                await ctx.send(error_message)
            except discord.HTTPException as e:
                logger.error(f"Failed to send error message: {e}")
    
    @staticmethod
    async def handle_voice_error(error: Exception, guild_id: Optional[int] = None) -> None:
        """
        Handle voice connection specific errors
        
        Args:
            error: Exception yang terjadi
            guild_id: Guild ID where error occurred
        """
        guild_str = f"in guild {guild_id}" if guild_id else ""
        
        if isinstance(error, asyncio.TimeoutError):
            logger.error(f"Voice connection timeout {guild_str}")
        elif isinstance(error, discord.errors.ClientException):
            logger.error(f"Voice client exception {guild_str}: {error}")
        else:
            logger.error(f"Voice error {guild_str}: {error}", exc_info=True)
    
    @staticmethod
    async def handle_download_error(
        error: Exception,
        source: str,
        query: str
    ) -> None:
        """
        Handle download specific errors
        
        Args:
            error: Exception yang terjadi
            source: Audio source (Spotify, YouTube, etc)
            query: Query yang digunakan
        """
        logger.error(
            f"Download failed from {source} for query '{query[:50]}': {error}",
            exc_info=True
        )
    
    @staticmethod
    def create_error_embed(
        title: str,
        description: str,
        error_type: str = "Error"
    ) -> discord.Embed:
        """
        Create error embed
        
        Args:
            title: Error title
            description: Error description
            error_type: Type of error (Error, Warning, Info)
        
        Returns:
            Discord embed
        """
        colors = {
            "Error": 0xFF0000,
            "Warning": 0xFFA500,
            "Info": 0x3498DB
        }
        
        embed = discord.Embed(
            title=f"❌ {title}" if error_type == "Error" else f"⚠️ {title}",
            description=description,
            color=colors.get(error_type, 0xFF0000)
        )
        
        return embed
