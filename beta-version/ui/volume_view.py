"""
Modern Volume Control UI with slider
"""

import discord
from typing import Optional
from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('ui.volume_view')


class VolumeView(discord.ui.View):
    """Volume control view with slider and mute"""
    
    def __init__(self, bot, guild_id: int, current_volume: int = 100, timeout: int = 60):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        self.current_volume = current_volume
        self.is_muted = False
        self.volume_before_mute = current_volume
    
    def create_embed(self) -> discord.Embed:
        """Create volume display embed"""
        # Volume percentage
        volume_pct = 0 if self.is_muted else self.current_volume
        
        # Create visual volume bar (20 segments)
        bar_length = 20
        filled = int((volume_pct / 200) * bar_length)
        bar = "█" * filled + "░" * (bar_length - filled)
        
        # Volume emoji
        if self.is_muted or volume_pct == 0:
            emoji = "🔇"
            status = "MUTED"
        elif volume_pct < 33:
            emoji = "🔈"
            status = "Low"
        elif volume_pct < 66:
            emoji = "🔉"
            status = "Medium"
        else:
            emoji = "🔊"
            status = "High"
        
        # Create embed
        embed = discord.Embed(
            title=f"{emoji} Volume Control",
            description=f"**{volume_pct}%** - {status}\n\n"
                       f"`{bar}`\n\n"
                       f"Use the buttons below to adjust volume",
            color=discord.Color.blue() if not self.is_muted else discord.Color.greyple()
        )
        
        embed.add_field(
            name="💡 Tips",
            value="• Volume range: 0-200%\n"
                  "• Default is 100%\n"
                  "• Use slider buttons for quick adjustment\n"
                  "• Click **🔇 Mute** to toggle mute",
            inline=False
        )
        
        return embed
    
    def _update_volume(self, new_volume: int):
        """Update volume (clamp to 0-200)"""
        self.current_volume = max(0, min(200, new_volume))
    
    async def _apply_volume(self, interaction: discord.Interaction):
        """Apply volume to voice connection"""
        connection = self.bot.voice_manager.get_connection(self.guild_id)
        
        if not connection or not connection.is_connected():
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Playing",
                    "Bot is not connected to voice channel"
                ),
                ephemeral=True
            )
            return False
        
        # Calculate actual volume (0-200% -> 0.0-2.0)
        volume_float = 0.0 if self.is_muted else (self.current_volume / 100.0)
        
        # Set volume on voice client
        if connection.connection and connection.connection.source:
            # Check if source is PCMVolumeTransformer
            if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                connection.connection.source.volume = volume_float
            else:
                # Wrap source
                connection.connection.source = discord.PCMVolumeTransformer(
                    connection.connection.source,
                    volume=volume_float
                )
            
            # Update stored volume
            volume_cog = self.bot.get_cog('VolumeCommands')
            if volume_cog:
                volume_cog.guild_volumes[self.guild_id] = self.current_volume
            
            logger.info(f"Volume set to {self.current_volume}% (muted={self.is_muted}) in guild {self.guild_id}")
            return True
        
        return False
    
    # Swipe Up/Down buttons (row 0)
    @discord.ui.button(label="🔼 Volume Up", style=discord.ButtonStyle.success, row=0)
    async def vol_up(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Increase volume by 10% (swipe up)"""
        self._update_volume(self.current_volume + 10)
        self.is_muted = False
        await self._apply_volume(interaction)
        await interaction.response.edit_message(embed=self.create_embed(), view=self)
    
    @discord.ui.button(label="🔽 Volume Down", style=discord.ButtonStyle.danger, row=0)
    async def vol_down(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Decrease volume by 10% (swipe down)"""
        self._update_volume(self.current_volume - 10)
        self.is_muted = False
        await self._apply_volume(interaction)
        await interaction.response.edit_message(embed=self.create_embed(), view=self)
    
    @discord.ui.button(label="🔇 Mute", style=discord.ButtonStyle.secondary, row=0)
    async def mute_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Toggle mute"""
        if self.is_muted:
            # Unmute - restore previous volume
            self.is_muted = False
            self.current_volume = self.volume_before_mute
            button.label = "🔇 Mute"
            button.style = discord.ButtonStyle.secondary
        else:
            # Mute - save current volume
            self.volume_before_mute = self.current_volume
            self.is_muted = True
            button.label = "🔊 Unmute"
            button.style = discord.ButtonStyle.success
        
        await self._apply_volume(interaction)
        await interaction.response.edit_message(embed=self.create_embed(), view=self)
    
    # Close button (row 1)
    @discord.ui.button(label="🗑️ Close", style=discord.ButtonStyle.danger, row=1)
    async def close_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Close volume control (delete message)"""
        await interaction.message.delete()
        await interaction.response.send_message("✅ Volume control closed", ephemeral=True, delete_after=2)
