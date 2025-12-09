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
    
    @app_commands.command(name="pause", description="Pause current playback")
    async def pause(self, interaction: discord.Interaction):
        """Pause playback"""
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection or not connection.is_connected():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Playing",
                    "Bot is not connected to voice channel"
                ),
                ephemeral=True
            )
            return
        
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
                "⏸️ Playback paused"
            )
        )
        
        logger.info(f"Paused playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="resume", description="Resume playback")
    async def resume(self, interaction: discord.Interaction):
        """Resume playback"""
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection or not connection.is_connected():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Playing",
                    "Bot is not connected to voice channel"
                ),
                ephemeral=True
            )
            return
        
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
                "▶️ Playback resumed"
            )
        )
        
        logger.info(f"Resumed playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="stop", description="Stop playback and disconnect")
    async def stop(self, interaction: discord.Interaction):
        """Stop playback"""
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection or not connection.is_connected():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Playing",
                    "Bot is not connected to voice channel"
                ),
                ephemeral=True
            )
            return
        
        await connection.disconnect()
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Stopped",
                "⏹️ Playback stopped and disconnected"
            )
        )
        
        logger.info(f"Stopped playback in guild {interaction.guild.id}")
    
    @app_commands.command(name="skip", description="Skip current track")
    async def skip(self, interaction: discord.Interaction):
        """Skip current track"""
        connection = self.bot.voice_manager.get_connection(interaction.guild.id)
        
        if not connection or not connection.is_connected():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Playing",
                    "Bot is not connected to voice channel"
                ),
                ephemeral=True
            )
            return
        
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
                "⏭️ Skipped current track"
            )
        )
        
        logger.info(f"Skipped track in guild {interaction.guild.id}")


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(ControlCommands(bot))
