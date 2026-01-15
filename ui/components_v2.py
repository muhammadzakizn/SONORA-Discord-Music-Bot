"""
Discord Components V2 helper for SONORA media player
Re-implemented using Standard Embeds + View to ensure API compatibility
"""

import discord
from typing import Optional, List, Tuple
from database.models import MetadataInfo
from config.constants import COLOR_PLAYING
from config.logging_config import get_logger

logger = get_logger('ui.components_v2')


class MediaPlayerComponentsV2:
    """
    Build Standard Embed + View layout for media player
    """
    
    @staticmethod
    def create_now_playing_view(
        metadata: MetadataInfo,
        progress_bar: str = "",
        lyrics_lines: Optional[List[str]] = None,
        guild_id: int = None,
        voice_channel_name: str = None,
        is_paused: bool = False,
        bot = None
    ) -> Tuple[discord.Embed, discord.ui.View]:
        """
        Create Embed and View for media player
        
        Returns:
            (discord.Embed, discord.ui.View)
        """
        
        # 1. Create Embed
        # ===============
        embed = discord.Embed(
            color=discord.Color(COLOR_PLAYING)
        )
        
        # Title: "Now Playing"
        embed.title = "Now Playing"
        
        # Build description
        description_parts = []
        
        # Track Title (bold, linked if possible)
        track_url = "https://sonora.muhammadzakizn.com"
        if hasattr(metadata, 'lavalink_track_info') and hasattr(metadata.lavalink_track_info, 'uri'):
            track_url = metadata.lavalink_track_info.uri
            
        description_parts.append(f"**[{metadata.title}]({track_url})**")
        
        # Artist
        description_parts.append(f"{metadata.artist}")
        
        description_parts.append("")  # Spacer
        
        # Lyrics (plain text, no code block - so bold ** ** works)
        if lyrics_lines:
            lyrics_text = "\n".join(l for l in lyrics_lines if l and l.strip())
            if lyrics_text:
                description_parts.append(lyrics_text)
                description_parts.append("")  # Spacer
        
        # Progress Bar (fix comma issue - ensure clean format)
        if progress_bar:
            # Remove any stray commas from progress bar
            clean_progress = progress_bar.replace(",", "").replace("`", "").strip()
            description_parts.append(f"`{clean_progress}`")
            description_parts.append("")  # Spacer
        
        # Requested by & Connected in (at bottom of description)
        requester_text = "Unknown"
        if metadata.requested_by_id and metadata.requested_by_id > 0:
            requester_text = f"<@{metadata.requested_by_id}>"
        elif metadata.requested_by:
            requester_text = metadata.requested_by
            
        description_parts.append(f"Requested by {requester_text}")
        
        if voice_channel_name:
            description_parts.append(f"Connected in 🔊 **{voice_channel_name}**")
        
        embed.description = "\n".join(description_parts)
        
        # Thumbnail (artwork)
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
        
        # NO footer (user requested to remove "SONORA Premium...")
        
        
        # 2. Create View (Controls)
        # =========================
        # MediaPlayerView already has buttons with callbacks defined via decorators
        view = MediaPlayerView(bot, guild_id)
        
        return embed, view


class MediaPlayerView(discord.ui.View):
    """Standard View for media player with working button callbacks"""
    
    def __init__(self, bot, guild_id: int, timeout: float = None):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        
        # Custom SONORA emoji IDs
        self.pause_emoji = discord.PartialEmoji(name="pause", id=1460800072823476264)
        self.play_emoji = discord.PartialEmoji(name="play", id=1460800090586353928)
        self.stop_emoji = discord.PartialEmoji(name="stop", id=1460800121217224884)
        self.loop_emoji = discord.PartialEmoji(name="loop", id=1460800053483667610)
        self.skip_emoji = discord.PartialEmoji(name="skipnext", id=1461176857654202388)
        
    def _get_player(self, guild_id: int = None):
        """Get current player for this guild"""
        # Use provided guild_id or fall back to self.guild_id
        gid = guild_id or self.guild_id
        if not gid:
            return None
        if self.bot and hasattr(self.bot, 'players'):
            return self.bot.players.get(gid)
        return None
    
    @discord.ui.button(emoji=discord.PartialEmoji(name="pause", id=1460800072823476264), style=discord.ButtonStyle.secondary, custom_id="ctrl_pause", row=0)
    async def pause_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Toggle pause/resume"""
        try:
            player = self._get_player(interaction.guild_id)
            if not player:
                await interaction.response.send_message("No active player!", ephemeral=True)
                return
                
            if player.is_paused:
                await player.resume()
                await interaction.response.send_message("▶️ Resumed", ephemeral=True)
            else:
                await player.pause()
                await interaction.response.send_message("⏸ Paused", ephemeral=True)
        except Exception as e:
            logger.error(f"Pause button error: {e}")
            await interaction.response.send_message("Error toggling pause", ephemeral=True)
    
    @discord.ui.button(emoji=discord.PartialEmoji(name="skipnext", id=1461176857654202388), style=discord.ButtonStyle.secondary, custom_id="ctrl_skip", row=0)
    async def skip_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Skip current track"""
        try:
            player = self._get_player(interaction.guild_id)
            if not player:
                await interaction.response.send_message("No active player!", ephemeral=True)
                return
            
            await interaction.response.defer(ephemeral=True)
            
            # Stop current playback to trigger next track
            await player.skip()
            await interaction.followup.send("⏭ Skipped!", ephemeral=True)
        except Exception as e:
            logger.error(f"Skip button error: {e}")
            await interaction.response.send_message("Error skipping track", ephemeral=True)
    
    @discord.ui.button(emoji=discord.PartialEmoji(name="stop", id=1460800121217224884), style=discord.ButtonStyle.danger, custom_id="ctrl_stop", row=0)
    async def stop_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Stop playback and disconnect"""
        try:
            player = self._get_player(interaction.guild_id)
            if not player:
                await interaction.response.send_message("No active player!", ephemeral=True)
                return
            
            await interaction.response.defer(ephemeral=True)
            
            # Stop and cleanup
            await player.stop()
            await interaction.followup.send("⏹ Stopped!", ephemeral=True)
        except Exception as e:
            logger.error(f"Stop button error: {e}")
            await interaction.response.send_message("Error stopping playback", ephemeral=True)
    
    @discord.ui.button(emoji=discord.PartialEmoji(name="loop", id=1460800053483667610), style=discord.ButtonStyle.secondary, custom_id="ctrl_loop", row=0)
    async def loop_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Toggle loop mode"""
        try:
            player = self._get_player(interaction.guild_id)
            if not player:
                await interaction.response.send_message("No active player!", ephemeral=True)
                return
            
            # Toggle loop
            player.loop = not getattr(player, 'loop', False)
            loop_status = "enabled 🔁" if player.loop else "disabled"
            await interaction.response.send_message(f"Loop {loop_status}", ephemeral=True)
        except Exception as e:
            logger.error(f"Loop button error: {e}")
            await interaction.response.send_message("Error toggling loop", ephemeral=True)

