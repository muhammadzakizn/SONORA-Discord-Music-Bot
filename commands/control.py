"""Playback control commands"""

import discord
from discord.ext import commands
from discord import app_commands

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.control')


class ControlCommands(commands.Cog):
    """Playback control commands"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize control commands"""
        self.bot = bot
        logger.info("Control commands initialized")
    
    def _check_voice_channel(self, interaction: discord.Interaction) -> tuple[bool, str | None]:
        """
        Check if user is in same voice channel as bot.
        Returns (is_valid, error_message)
        """
        # Check if user is in a voice channel
        if not interaction.user.voice or not interaction.user.voice.channel:
            return False, "You must be in a voice channel to control playback"
        
        # Check if bot is in a voice channel
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        if not connection or not connection.is_connected():
            return False, "Bot is not connected to a voice channel"
        
        # Check if user is in the SAME voice channel as bot
        bot_channel = connection.connection.channel
        user_channel = interaction.user.voice.channel
        
        if bot_channel.id != user_channel.id:
            return False, f"You must be in **{bot_channel.name}** to control playback"
        
        return True, None
    
    @app_commands.command(name="pause", description="Pause current playback")
    async def pause(self, interaction: discord.Interaction):
        """Pause playback"""
        # Check voice channel
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Access Denied", error_msg),
                ephemeral=True
            )
            return
        
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if connection.is_paused():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Already Paused",
                    "Playback is already paused"
                ),
                ephemeral=True
            )
            return
        
        connection.connection.pause()
        
        # CRITICAL: Also notify player object to stop UI updates
        if hasattr(self.bot, 'players') and interaction.guild.id in self.bot.players:
            player = self.bot.players[interaction.guild.id]
            player.is_paused = True
            logger.debug("Set player.is_paused = True")
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Paused",
                "Playback paused"
            )
        )
        
        logger.info(f"Paused playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="resume", description="Resume playback")
    async def resume(self, interaction: discord.Interaction):
        """Resume playback"""
        # Check voice channel
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Access Denied", error_msg),
                ephemeral=True
            )
            return
        
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection.is_paused():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Paused",
                    "Playback is not paused"
                ),
                ephemeral=True
            )
            return
        
        connection.connection.resume()
        
        # CRITICAL: Also notify player object to resume UI updates
        if hasattr(self.bot, 'players') and interaction.guild.id in self.bot.players:
            player = self.bot.players[interaction.guild.id]
            player.is_paused = False
            logger.debug("Set player.is_paused = False")
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Resumed",
                "Playback resumed"
            )
        )
        
        logger.info(f"Resumed playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="stop", description="Stop playback and disconnect")
    async def stop(self, interaction: discord.Interaction):
        """Stop playback"""
        # Check voice channel
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Access Denied", error_msg),
                ephemeral=True
            )
            return
        
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        # CLEANUP: Delete opus streaming files before stopping
        if hasattr(self.bot, 'players') and interaction.guild.id in self.bot.players:
            player = self.bot.players[interaction.guild.id]
            logger.info(f"Stop cleanup: Found player for guild {interaction.guild.id}")
            
            if player.metadata:
                logger.info(f"Stop cleanup: Metadata exists, audio_path = {player.metadata.audio_path}")
                
                if player.metadata.audio_path:
                    from pathlib import Path
                    audio_path = Path(player.metadata.audio_path)
                    logger.info(f"Stop cleanup: Checking file {audio_path}, exists={audio_path.exists()}, suffix={audio_path.suffix}")
                    
                    if audio_path.exists() and audio_path.suffix.lower() == '.opus':
                        try:
                            file_size = audio_path.stat().st_size / (1024 * 1024)
                            audio_path.unlink()
                            logger.info(f"Deleted opus file on stop: {audio_path.name} ({file_size:.1f}MB)")
                        except Exception as e:
                            logger.error(f"Could not delete opus file: {e}")
                    else:
                        logger.info(f"Stop cleanup: Skipping - exists={audio_path.exists()}, suffix={audio_path.suffix}")
            else:
                logger.info("Stop cleanup: No metadata in player")
        
        await connection.disconnect()
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Stopped",
                "Playback stopped and disconnected"
            )
        )
        
        logger.info(f"Stopped playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="skip", description="Skip current track")
    async def skip(self, interaction: discord.Interaction):
        """Skip current track"""
        # Check voice channel
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error("Access Denied", error_msg),
                ephemeral=True
            )
            return
        
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection.is_playing():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Nothing Playing",
                    "No track is currently playing"
                ),
                ephemeral=True
            )
            return
        
        connection.connection.stop()
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Skipped",
                "Skipped current track"
            )
        )
        
        logger.info(f"Skipped track in guild {interaction.guild.id}")


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(ControlCommands(bot))
