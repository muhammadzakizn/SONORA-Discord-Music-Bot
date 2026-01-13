"""Embed builders for Discord messages"""

import discord
from typing import Optional, List

from database.models import MetadataInfo
from config.constants import (
    COLOR_SUCCESS, COLOR_ERROR, COLOR_WARNING, COLOR_INFO, COLOR_PLAYING,
    EMOJI_MUSIC, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARNING, EMOJI_LOADING
)
from utils.formatters import TimeFormatter, TextFormatter


class EmbedBuilder:
    """Builder for Discord embeds"""
    
    @staticmethod
    def create_now_playing(
        metadata: MetadataInfo,
        current_time: float = 0,
        progress_bar: str = "",
        lyrics_lines: Optional[List[str]] = None,
        guild_id: int = None
    ) -> discord.Embed:
        """
        Create now playing embed - FlaviBot style
        
        Args:
            metadata: Track metadata
            current_time: Current playback time
            progress_bar: Progress bar string
            lyrics_lines: Current lyrics lines (3 lines)
        
        Returns:
            Discord embed
        """
        # Format duration
        duration_str = ""
        if metadata.duration and metadata.duration > 0:
            mins = int(metadata.duration // 60)
            secs = int(metadata.duration % 60)
            duration_str = f"`{mins:02d}:{secs:02d}`"
        
        # Build description - FlaviBot style
        description_parts = []
        
        # Title and artist with duration
        if duration_str:
            description_parts.append(f"**{metadata.title}** - *{metadata.artist}* - {duration_str}")
        else:
            description_parts.append(f"**{metadata.title}** - *{metadata.artist}*")
        
        # Requester info in blockquote
        if metadata.requested_by_id and metadata.requested_by_id > 0:
            description_parts.append(f"> Requested by <@{metadata.requested_by_id}>")
        elif metadata.requested_by:
            description_parts.append(f"> Requested by {metadata.requested_by}")
        
        # Lyrics (if available)
        if lyrics_lines and any(lyrics_lines):
            lyrics_text = "\n".join(l for l in lyrics_lines if l)
            if lyrics_text.strip():
                description_parts.append("")  # Empty line
                description_parts.append(lyrics_text)
        
        # Progress bar
        if progress_bar:
            description_parts.append("")  # Empty line
            description_parts.append(progress_bar)
        
        embed = discord.Embed(
            title="Now Playing",
            description="\n".join(description_parts),
            color=COLOR_PLAYING
        )
        
        # Artwork
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
        
        # EQ indicator in footer (if not flat)
        footer_text = ""
        if guild_id:
            from services.audio.equalizer import get_equalizer_manager, EqualizerPresets
            eq_manager = get_equalizer_manager()
            eq_settings = eq_manager.get_settings(guild_id)
            
            flat_eq = EqualizerPresets.FLAT
            if eq_settings != flat_eq:
                eq_name = "Custom EQ"
                for preset_name, preset in EqualizerPresets.get_all_presets().items():
                    if eq_settings == preset and preset_name != "Flat":
                        eq_name = preset_name
                        break
                footer_text = f"EQ: {eq_name}"
        
        if footer_text:
            embed.set_footer(text=footer_text)
        
        return embed
    
    @staticmethod
    def create_loading(stage: str, details: Optional[str] = None) -> discord.Embed:
        """
        Create loading embed with custom animated emoji
        
        Args:
            stage: Loading stage name (e.g., "Searching", "Buffering", "Streaming")
            details: Additional details
        
        Returns:
            Discord embed
        """
        # Title with loading emoji
        title = f"{EMOJI_LOADING} {stage.strip()}"
        
        embed = discord.Embed(
            title=title,
            description=details or "",
            color=COLOR_INFO
        )
        
        return embed
    
    @staticmethod
    def create_success(title: str, description: str) -> discord.Embed:
        """
        Create success embed
        
        Args:
            title: Success title
            description: Success description
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=f"{EMOJI_SUCCESS} {title}",
            description=description,
            color=COLOR_SUCCESS
        )
        
        return embed
    
    @staticmethod
    def create_error(title: str, description: str) -> discord.Embed:
        """
        Create error embed
        
        Args:
            title: Error title
            description: Error description
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=f"{EMOJI_ERROR} {title}",
            description=description,
            color=COLOR_ERROR
        )
        
        return embed
    
    @staticmethod
    def create_warning(title: str, description: str) -> discord.Embed:
        """
        Create warning embed
        
        Args:
            title: Warning title
            description: Warning description
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=f"{EMOJI_WARNING} {title}",
            description=description,
            color=COLOR_WARNING
        )
        
        return embed
    
    @staticmethod
    def create_queue(queue_items: list, current_track: Optional[MetadataInfo] = None) -> discord.Embed:
        """
        Create queue embed
        
        Args:
            queue_items: List of QueueItem
            current_track: Currently playing track
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title="📋 Queue",
            color=COLOR_INFO
        )
        
        # Current track
        if current_track:
            embed.add_field(
                name="Now Playing",
                value=f"**{current_track.title}** - *{current_track.artist}*",
                inline=False
            )
        
        # Queue
        if queue_items:
            queue_text = []
            for i, item in enumerate(queue_items[:10], 1):  # Show max 10
                duration = TimeFormatter.format_seconds(item.metadata.duration)
                queue_text.append(
                    f"{i}. **{item.metadata.title}** - *{item.metadata.artist}* `[{duration}]`"
                )
            
            if len(queue_items) > 10:
                queue_text.append(f"\n... and {len(queue_items) - 10} more")
            
            embed.add_field(
                name=f"Up Next ({len(queue_items)} tracks)",
                value="\n".join(queue_text),
                inline=False
            )
        else:
            embed.add_field(
                name="Up Next",
                value="*Queue is empty*",
                inline=False
            )
        
        return embed
    
    @staticmethod
    def create_track_info(metadata: MetadataInfo) -> discord.Embed:
        """
        Create track info embed
        
        Args:
            metadata: Track metadata
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=metadata.title,
            description=f"by **{metadata.artist}**",
            color=COLOR_INFO
        )
        
        # Details
        if metadata.album:
            embed.add_field(name="Album", value=metadata.album, inline=True)
        
        if metadata.release_year:
            embed.add_field(name="Year", value=str(metadata.release_year), inline=True)
        
        if metadata.genre:
            embed.add_field(name="Genre", value=metadata.genre, inline=True)
        
        # Duration
        duration_str = TimeFormatter.format_seconds(metadata.duration)
        embed.add_field(name="Duration", value=duration_str, inline=True)
        
        # Audio quality
        embed.add_field(
            name="Quality",
            value=f"{metadata.bitrate}kbps • {metadata.audio_source.value}",
            inline=True
        )
        
        # Lyrics
        lyrics_status = "✓ Available" if metadata.has_lyrics else "✗ Not available"
        if metadata.has_synced_lyrics:
            lyrics_status += " (Synced)"
        embed.add_field(name="Lyrics", value=lyrics_status, inline=True)
        
        # Artwork
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
            embed.add_field(
                name="Artwork",
                value=f"✓ {metadata.artwork_source.value}",
                inline=True
            )
        
        return embed
