"""Volume control commands"""

import discord
from discord.ext import commands
from discord import app_commands

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.volume')


class VolumeCommands(commands.Cog):
    """Volume control commands"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize volume commands"""
        self.bot = bot
        # Store volume per guild (default 100%)
        self.guild_volumes = {}
        logger.info("Volume commands initialized")
    
    @app_commands.command(name="volume", description="Set playback volume (0-200%)")
    @app_commands.describe(level="Volume level (0-200)")
    async def volume(self, interaction: discord.Interaction, level: int):
        """Set volume level"""
        
        # Validate volume level
        if not 0 <= level <= 200:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Invalid Volume",
                    "Volume must be between 0 and 200"
                ),
                ephemeral=True
            )
            return
        
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
        
        # Calculate volume (0-200% -> 0.0-2.0)
        volume_float = level / 100.0
        
        # Set volume on voice client
        if connection.connection.source:
            # Check if source is already a PCMVolumeTransformer
            if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                connection.connection.source.volume = volume_float
            else:
                # Wrap source in PCMVolumeTransformer
                connection.connection.source = discord.PCMVolumeTransformer(
                    connection.connection.source,
                    volume=volume_float
                )
        
        # Store volume for guild
        self.guild_volumes[interaction.guild.id] = level
        
        # Create visual volume bar
        volume_bar = self._create_volume_bar(level)
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Volume Updated",
                f"🔊 Volume set to **{level}%**\n{volume_bar}"
            )
        )
        
        logger.info(f"Volume set to {level}% in guild {interaction.guild.id}")
    
    @app_commands.command(name="volume-up", description="Increase volume by 10%")
    async def volume_up(self, interaction: discord.Interaction):
        """Increase volume"""
        guild_id = interaction.guild.id
        current_volume = self.guild_volumes.get(guild_id, 100)
        new_volume = min(current_volume + 10, 200)
        
        # Use the volume command
        await self.volume.callback(self, interaction, new_volume)
    
    @app_commands.command(name="volume-down", description="Decrease volume by 10%")
    async def volume_down(self, interaction: discord.Interaction):
        """Decrease volume"""
        guild_id = interaction.guild.id
        current_volume = self.guild_volumes.get(guild_id, 100)
        new_volume = max(current_volume - 10, 0)
        
        # Use the volume command
        await self.volume.callback(self, interaction, new_volume)
    
    def get_volume(self, guild_id: int) -> int:
        """
        Get current volume for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Volume level (0-200)
        """
        return self.guild_volumes.get(guild_id, 100)
    
    def _create_volume_bar(self, level: int) -> str:
        """
        Create visual volume bar
        
        Args:
            level: Volume level (0-200)
        
        Returns:
            Volume bar string
        """
        # Create bar with 20 segments
        filled = int((level / 200) * 20)
        bar = "█" * filled + "░" * (20 - filled)
        
        # Add emoji based on level
        if level == 0:
            emoji = "🔇"
        elif level < 50:
            emoji = "🔉"
        else:
            emoji = "🔊"
        
        return f"{emoji} {bar}"


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(VolumeCommands(bot))
