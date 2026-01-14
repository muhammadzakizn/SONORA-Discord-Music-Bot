"""
Discord Components V2 helper for SONORA media player
Re-implemented using Standard Embeds + View to ensure API compatibility
Matches FlaviBot style using Markdown formatting in Embed
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
    Matches FlaviBot visuals using standard Discord Embed
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
        
        # 1. Create Embed (The "Container")
        # =================================
        embed = discord.Embed(
            color=discord.Color(COLOR_PLAYING)
        )
        
        # Title & Artist
        # FlaviBot style: **[Title](URL)** - `Duration`
        #                 *Artist*
        
        track_url = "https://sonora.muhammadzakizn.com" # Default
        if hasattr(metadata, 'lavalink_track_info') and hasattr(metadata.lavalink_track_info, 'uri'):
            track_url = metadata.lavalink_track_info.uri
            
        description_parts = []
        
        # Line 1: Title
        description_parts.append(f"### [{metadata.title}]({track_url})")
        
        # Line 2: Artist
        description_parts.append(f"**{metadata.artist}**")
        
        description_parts.append("") # Spacer
        
        # Line 3: Requester & Voice Channel
        requester_text = "Unknown"
        if metadata.requested_by_id and metadata.requested_by_id > 0:
            requester_text = f"<@{metadata.requested_by_id}>"
        elif metadata.requested_by:
            requester_text = metadata.requested_by
            
        description_parts.append(f"> Requested by {requester_text}")
        
        if voice_channel_name:
            description_parts.append(f"> Connected in 🔊 **{voice_channel_name}**")
            
        description_parts.append("") # Spacer
        
        # Line 4: Lyrics (or Loading status)
        # Using footer for lyrics to keep main area clean, OR inside description?
        # FlaviBot puts it in footer/status.
        
        # But user likes them in body?
        # Let's put current lyric line in body for visibility
        
        if lyrics_lines:
            # Join clean lines
            lyrics_text = "\n".join(l for l in lyrics_lines if l.strip())
            if lyrics_text:
                description_parts.append(f"```text\n{lyrics_text}\n```")
        
        # Line 5: Progress Bar
        if progress_bar:
             description_parts.append(f"`{progress_bar}`")
        
        embed.description = "\n".join(description_parts)
        
        # Thumbnail
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
            
        # Footer
        embed.set_footer(text="SONORA Premium • High Quality Audio")
        
        
        # 2. Create View (Controls)
        # =========================
        view = MediaPlayerView(bot, guild_id)
        
        # Custom SONORA emoji IDs
        pause_emoji = discord.PartialEmoji(name="pause", id=1460800072823476264)
        play_emoji = discord.PartialEmoji(name="play", id=1460800090586353928)
        stop_emoji = discord.PartialEmoji(name="stop", id=1460800121217224884)
        loop_emoji = discord.PartialEmoji(name="loop", id=1460800053483667610)
        skip_emoji = discord.PartialEmoji(name="skip", id=1460800090586353928)
        
        # Buttons
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
        
        # Add Dropdown (Row 1)
        view.add_selection_menu()
        
        return embed, view


class MediaPlayerView(discord.ui.View):
    """Standard View for media player"""
    
    def __init__(self, bot, guild_id: int, timeout: float = None):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        
    def add_selection_menu(self):
        """Add settings selection menu (Filters, etc)"""
        select = discord.ui.Select(
            placeholder="✨ Audio Effects & Settings...",
            min_values=1,
            max_values=1,
            custom_id=f"sel_settings_{self.guild_id}",
            row=1, # Explicit row
            options=[
                discord.SelectOption(label="Reset Effects", value="filter_clear", emoji="🔄", description="Remove all audio filters"),
                discord.SelectOption(label="Bass Boost", value="filter_bass", emoji="🔊", description="Heavy bass boost"),
                discord.SelectOption(label="Nightcore", value="filter_nightcore", emoji="🌙", description="Higher pitch & speed"),
                discord.SelectOption(label="Vaporwave", value="filter_vaporwave", emoji="🌊", description="Slowed & reverb"),
                discord.SelectOption(label="8D Audio", value="filter_8d", emoji="🎧", description="Immersive 3D audio"),
                discord.SelectOption(label="Loop Track", value="loop_track", emoji="🔂", description="Repeat current song"),
                discord.SelectOption(label="Loop Queue", value="loop_queue", emoji="🔁", description="Repeat entire queue"),
                discord.SelectOption(label="Lyrics Toggle", value="toggle_lyrics", emoji="📝", description="Show/Hide lyrics"),
            ]
        )
        self.add_item(select)
