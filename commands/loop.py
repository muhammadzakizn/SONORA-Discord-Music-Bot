"""Loop command for repeating tracks/queue"""

import discord
from discord.ext import commands
from discord import app_commands
from enum import Enum
from typing import Dict

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.loop')


class LoopMode(str, Enum):
    """Loop mode types"""
    OFF = "off"
    TRACK = "track"
    QUEUE = "queue"


class LoopView(discord.ui.View):
    """Interactive view for loop control"""
    
    def __init__(self, cog: 'LoopCommands', guild_id: int, current_mode: LoopMode):
        super().__init__(timeout=60)
        self.cog = cog
        self.guild_id = guild_id
        self.current_mode = current_mode
        self._update_buttons()
    
    def _update_buttons(self):
        """Update button styles based on current mode"""
        for child in self.children:
            if isinstance(child, discord.ui.Button):
                if child.custom_id == f"loop_{self.current_mode.value}":
                    child.style = discord.ButtonStyle.success
                elif child.custom_id in ["loop_off", "loop_track", "loop_queue"]:
                    child.style = discord.ButtonStyle.secondary
    
    @discord.ui.button(label="🔂 Track", custom_id="loop_track", style=discord.ButtonStyle.secondary)
    async def loop_track(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Loop current track"""
        self.current_mode = LoopMode.TRACK
        self.cog.set_loop_mode(self.guild_id, LoopMode.TRACK)
        self._update_buttons()
        
        embed = self._create_embed()
        await interaction.response.edit_message(embed=embed, view=self)
        logger.info(f"[Loop] Set to TRACK for guild {self.guild_id}")
    
    @discord.ui.button(label="🔁 Queue", custom_id="loop_queue", style=discord.ButtonStyle.secondary)
    async def loop_queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Loop entire queue"""
        self.current_mode = LoopMode.QUEUE
        self.cog.set_loop_mode(self.guild_id, LoopMode.QUEUE)
        self._update_buttons()
        
        embed = self._create_embed()
        await interaction.response.edit_message(embed=embed, view=self)
        logger.info(f"[Loop] Set to QUEUE for guild {self.guild_id}")
    
    @discord.ui.button(label="Off", custom_id="loop_off", style=discord.ButtonStyle.secondary)
    async def loop_off(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Disable loop"""
        self.current_mode = LoopMode.OFF
        self.cog.set_loop_mode(self.guild_id, LoopMode.OFF)
        self._update_buttons()
        
        embed = self._create_embed()
        await interaction.response.edit_message(embed=embed, view=self)
        logger.info(f"[Loop] Set to OFF for guild {self.guild_id}")
    
    @discord.ui.button(label="Close", custom_id="loop_close", style=discord.ButtonStyle.danger)
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Close the loop control panel"""
        await interaction.message.delete()
    
    def _create_embed(self) -> discord.Embed:
        """Create embed showing current loop status"""
        mode_info = {
            LoopMode.OFF: ("Loop Disabled", "Playback will continue normally.", "⏹️"),
            LoopMode.TRACK: ("Loop Track", "Current track will repeat continuously.", "🔂"),
            LoopMode.QUEUE: ("Loop Queue", "Queue will repeat after all tracks finish.", "🔁")
        }
        
        title, desc, emoji = mode_info[self.current_mode]
        
        embed = discord.Embed(
            title=f"{emoji} {title}",
            description=desc,
            color=discord.Color.blurple() if self.current_mode != LoopMode.OFF else discord.Color.greyple()
        )
        
        # Show current track info if available
        if hasattr(self.cog.bot, 'players') and self.guild_id in self.cog.bot.players:
            player = self.cog.bot.players[self.guild_id]
            if hasattr(player, 'metadata') and player.metadata:
                embed.add_field(
                    name="Now Playing",
                    value=f"**{player.metadata.title}** - *{player.metadata.artist}*",
                    inline=False
                )
        
        return embed


class LoopCommands(commands.Cog):
    """Loop management commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._loop_modes: Dict[int, LoopMode] = {}
    
    def get_loop_mode(self, guild_id: int) -> LoopMode:
        """Get loop mode for a guild"""
        return self._loop_modes.get(guild_id, LoopMode.OFF)
    
    def set_loop_mode(self, guild_id: int, mode: LoopMode):
        """Set loop mode for a guild"""
        self._loop_modes[guild_id] = mode
        logger.info(f"[Loop] Guild {guild_id} loop mode: {mode.value}")
    
    @app_commands.command(name="loop", description="Toggle loop mode for track or queue")
    @app_commands.describe(mode="Loop mode: track (repeat one), queue (repeat all), or off")
    @app_commands.choices(mode=[
        app_commands.Choice(name="🔂 Track - Repeat current track", value="track"),
        app_commands.Choice(name="🔁 Queue - Repeat entire queue", value="queue"),
        app_commands.Choice(name="Off - Disable loop", value="off"),
    ])
    async def loop(
        self,
        interaction: discord.Interaction,
        mode: str = None
    ):
        """Toggle or set loop mode"""
        await interaction.response.defer()
        
        guild_id = interaction.guild.id
        current_mode = self.get_loop_mode(guild_id)
        
        # If mode specified, set it directly
        if mode:
            new_mode = LoopMode(mode)
            self.set_loop_mode(guild_id, new_mode)
            current_mode = new_mode
        
        # Create interactive view
        view = LoopView(self, guild_id, current_mode)
        embed = view._create_embed()
        
        await interaction.followup.send(embed=embed, view=view)
    
    async def cog_unload(self):
        """Cleanup when cog is unloaded"""
        self._loop_modes.clear()


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(LoopCommands(bot))
