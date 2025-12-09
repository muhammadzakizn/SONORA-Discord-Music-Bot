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
        Create now playing embed
        
        Args:
            metadata: Track metadata
            current_time: Current playback time
            progress_bar: Progress bar string
            lyrics_lines: Current lyrics lines (3 lines)
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=f"{EMOJI_MUSIC} NOW PLAYING",
            color=COLOR_PLAYING
        )
        
        # Track info
        embed.add_field(
            name=metadata.title,
            value=f"*{metadata.artist}*",
            inline=False
        )
        
        # Album if available
        if metadata.album:
            embed.add_field(
                name="Album",
                value=metadata.album,
                inline=True
            )
        
        # Audio source
        # Handle both enum and string values
        audio_source_str = metadata.audio_source.value if hasattr(metadata.audio_source, 'value') else str(metadata.audio_source)
        embed.add_field(
            name="Source",
            value=f"{audio_source_str} • {metadata.bitrate}kbps",
            inline=True
        )
        
        # Lyrics (3 lines) - tanpa code block agar bold formatting works
        if lyrics_lines and any(lyrics_lines):
            lyrics_text = "\n".join(lyrics_lines)
            embed.add_field(
                name="",
                value=lyrics_text if lyrics_text.strip() else "\u200b",  # Zero-width space if empty
                inline=False
            )
        
        # Progress
        if progress_bar:
            embed.add_field(
                name="",
                value=progress_bar,
                inline=False
            )
        
        # Artwork
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
        
        # Footer
        footer_text = f"Requested by {metadata.requested_by}" if metadata.requested_by else ""
        
        # Check if equalizer is active
        if guild_id:
            from services.audio.equalizer import get_equalizer_manager, EqualizerPresets
            eq_manager = get_equalizer_manager()
            eq_settings = eq_manager.get_settings(guild_id)
            
            # Check if EQ is not flat (has changes)
            flat_eq = EqualizerPresets.FLAT
            if eq_settings != flat_eq:
                # EQ is active, show indicator
                # Try to find which preset it matches
                eq_name = "Custom EQ"
                for preset_name, preset in EqualizerPresets.get_all_presets().items():
                    if eq_settings == preset and preset_name != "Flat":
                        eq_name = preset_name
                        break
                footer_text += f" • 🎚️ {eq_name}"
        
        if metadata.lyrics and metadata.lyrics.is_synced:
            footer_text += " • Synced Lyrics"
        
        if footer_text:
            embed.set_footer(text=footer_text)
        
        return embed
    
    @staticmethod
    def create_loading(stage: str, details: Optional[str] = None) -> discord.Embed:
        """
        Create loading embed
        
        Args:
            stage: Loading stage name
            details: Additional details
        
        Returns:
            Discord embed
        """
        embed = discord.Embed(
            title=f"{EMOJI_LOADING} {stage}",
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
