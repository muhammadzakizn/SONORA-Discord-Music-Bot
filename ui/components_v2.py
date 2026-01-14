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
        view = MediaPlayerView(bot, guild_id)
        
        # Custom SONORA emoji IDs
        pause_emoji = discord.PartialEmoji(name="pause", id=1460800072823476264)
        play_emoji = discord.PartialEmoji(name="play", id=1460800090586353928)
        stop_emoji = discord.PartialEmoji(name="stop", id=1460800121217224884)
        loop_emoji = discord.PartialEmoji(name="loop", id=1460800053483667610)
        skip_emoji = "⏭"  # Unicode fallback
        
        # Buttons (Row 0)
        pause_btn = discord.ui.Button(
            emoji=pause_emoji if not is_paused else play_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_pause_{guild_id}",
            row=0
        )
        skip_btn = discord.ui.Button(
            emoji=skip_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_skip_{guild_id}",
            row=0
        )
        stop_btn = discord.ui.Button(
            emoji=stop_emoji,
            style=discord.ButtonStyle.danger,
            custom_id=f"ctrl_stop_{guild_id}",
            row=0
        )
        loop_btn = discord.ui.Button(
            emoji=loop_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_loop_{guild_id}",
            row=0
        )
        
        view.add_item(pause_btn)
        view.add_item(skip_btn)
        view.add_item(stop_btn)
        view.add_item(loop_btn)
        
        # NOTE: Dropdown menu removed - it had no callback handler and caused "interaction failed"
        # Users can use /help to see all commands
        
        return embed, view


class MediaPlayerView(discord.ui.View):
    """Standard View for media player"""
    
    def __init__(self, bot, guild_id: int, timeout: float = None):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        
    def add_command_menu(self):
        """Add bot commands dropdown menu"""
        select = discord.ui.Select(
            placeholder="📋 Commands & Help...",
            min_values=1,
            max_values=1,
            custom_id=f"sel_commands_{self.guild_id}",
            row=1,
            options=[
                discord.SelectOption(
                    label="/play",
                    value="cmd_play",
                    emoji="▶️",
                    description="Play a song or playlist"
                ),
                discord.SelectOption(
                    label="/queue",
                    value="cmd_queue",
                    emoji="📜",
                    description="View current queue"
                ),
                discord.SelectOption(
                    label="/skip",
                    value="cmd_skip",
                    emoji="⏭️",
                    description="Skip to next song"
                ),
                discord.SelectOption(
                    label="/stop",
                    value="cmd_stop",
                    emoji="⏹️",
                    description="Stop playback and disconnect"
                ),
                discord.SelectOption(
                    label="/loop",
                    value="cmd_loop",
                    emoji="🔁",
                    description="Toggle loop mode"
                ),
                discord.SelectOption(
                    label="/volume",
                    value="cmd_volume",
                    emoji="🔊",
                    description="Adjust volume"
                ),
                discord.SelectOption(
                    label="/lyrics",
                    value="cmd_lyrics",
                    emoji="📝",
                    description="View full lyrics"
                ),
                discord.SelectOption(
                    label="/help",
                    value="cmd_help",
                    emoji="❓",
                    description="Show all commands"
                ),
            ]
        )
        self.add_item(select)
