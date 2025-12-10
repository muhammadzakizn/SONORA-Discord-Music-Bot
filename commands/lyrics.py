"""Lyrics control commands"""

import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger
from config.constants import COLOR_INFO, COLOR_SUCCESS

logger = get_logger('commands.lyrics')


class LyricsView(discord.ui.View):
    """Interactive view for lyrics control"""
    
    def __init__(self, bot: commands.Bot, guild_id: int, metadata=None):
        super().__init__(timeout=120)
        self.bot = bot
        self.guild_id = guild_id
        self.metadata = metadata
        self.lyrics_enabled = True  # Default enabled
    
    @discord.ui.button(label="Show All", emoji="📜", style=discord.ButtonStyle.primary)
    async def show_all_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show all lyrics"""
        await self._show_full_lyrics(interaction)
    
    @discord.ui.button(label="Search", emoji="🔍", style=discord.ButtonStyle.secondary)
    async def search_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Search for lyrics"""
        # Open modal for search query
        modal = LyricsSearchModal(self.bot, self.guild_id)
        await interaction.response.send_modal(modal)
    
    @discord.ui.button(label="Refresh", emoji="🔄", style=discord.ButtonStyle.secondary)
    async def refresh_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Refresh lyrics from sources"""
        await interaction.response.defer()
        
        # Get current player
        if not hasattr(self.bot, 'players') or self.guild_id not in self.bot.players:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error("No Track", "No track is currently playing"),
                ephemeral=True
            )
            return
        
        player = self.bot.players[self.guild_id]
        metadata = player.metadata
        
        # Re-fetch lyrics
        from services.metadata.processor import MetadataProcessor
        processor = MetadataProcessor()
        
        from database.models import TrackInfo
        track_info = TrackInfo(
            title=metadata.title,
            artist=metadata.artist,
            duration=metadata.duration
        )
        
        # Fetch lyrics with fallback
        lyrics = None
        try:
            lyrics = await processor.lrclib_fetcher.fetch(track_info)
            if not lyrics or not lyrics.lines:
                if processor.syncedlyrics_fetcher:
                    lyrics = await processor.syncedlyrics_fetcher.fetch(track_info)
            if not lyrics or not lyrics.lines:
                lyrics = await processor.genius_fetcher.fetch(track_info)
        except Exception as e:
            logger.error(f"Failed to refresh lyrics: {e}")
        
        if lyrics and lyrics.lines:
            metadata.lyrics = lyrics
            await interaction.followup.send(
                embed=EmbedBuilder.create_success(
                    "Lyrics Refreshed",
                    f"Found {len(lyrics.lines)} lines from {lyrics.source.value}"
                ),
                ephemeral=True
            )
        else:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "No Lyrics Found",
                    "Could not find lyrics for this track"
                ),
                ephemeral=True
            )
    
    async def _show_full_lyrics(self, interaction: discord.Interaction):
        """Display full lyrics with current line highlighted"""
        await interaction.response.defer()
        
        # Get current player
        if not hasattr(self.bot, 'players') or self.guild_id not in self.bot.players:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error("No Track", "No track is currently playing"),
                ephemeral=True
            )
            return
        
        player = self.bot.players[self.guild_id]
        metadata = player.metadata
        
        if not metadata.lyrics or not metadata.lyrics.lines:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "No Lyrics",
                    "No lyrics available for this track.\nUse **Search** to find lyrics."
                ),
                ephemeral=True
            )
            return
        
        # Get current time for highlighting
        current_time = player.get_current_time()
        
        # Build lyrics text
        lyrics_lines = []
        current_line_idx = -1
        
        for i, line in enumerate(metadata.lyrics.lines):
            # Check if this is the current line (for synced lyrics)
            if metadata.lyrics.is_synced and hasattr(line, 'start_time'):
                if line.start_time <= current_time:
                    current_line_idx = i
        
        # Format lyrics with highlighting
        for i, line in enumerate(metadata.lyrics.lines[:50]):  # Limit to 50 lines for embed
            text = line.text if hasattr(line, 'text') else str(line)
            
            if i == current_line_idx:
                # Highlight current line
                lyrics_lines.append(f"**▶ {text}**")
            else:
                lyrics_lines.append(text)
        
        # Create embed
        embed = discord.Embed(
            title=f"📜 Lyrics: {metadata.title}",
            description="\n".join(lyrics_lines) if lyrics_lines else "No lyrics",
            color=COLOR_INFO
        )
        
        embed.set_footer(text=f"By {metadata.artist} • Source: {metadata.lyrics.source.value}")
        
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
        
        # Add note if synced
        if metadata.lyrics.is_synced:
            embed.add_field(
                name="",
                value="*🎵 Synced lyrics - current line highlighted*",
                inline=False
            )
        else:
            embed.add_field(
                name="",
                value="*📝 Plain lyrics - not synced with music*",
                inline=False
            )
        
        if len(metadata.lyrics.lines) > 50:
            embed.add_field(
                name="",
                value=f"*... and {len(metadata.lyrics.lines) - 50} more lines*",
                inline=False
            )
        
        await interaction.followup.send(embed=embed, ephemeral=True)


class LyricsSearchModal(discord.ui.Modal):
    """Modal for searching lyrics"""
    
    def __init__(self, bot: commands.Bot, guild_id: int):
        super().__init__(title="Search Lyrics")
        self.bot = bot
        self.guild_id = guild_id
        
        self.query = discord.ui.TextInput(
            label="Search Query",
            placeholder="Artist - Title (e.g., Owl City - Fireflies)",
            style=discord.TextStyle.short,
            required=True,
            max_length=200
        )
        self.add_item(self.query)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle search submission"""
        await interaction.response.defer()
        
        query = self.query.value.strip()
        
        # Parse query
        if ' - ' in query:
            artist, title = query.split(' - ', 1)
        else:
            artist = ""
            title = query
        
        # Search for lyrics
        from services.metadata.processor import MetadataProcessor
        from database.models import TrackInfo
        
        processor = MetadataProcessor()
        track_info = TrackInfo(title=title, artist=artist, duration=0)
        
        # Try different sources
        lyrics = None
        source_tried = []
        
        try:
            # Try LRCLIB first
            source_tried.append("LRCLIB")
            lyrics = await processor.lrclib_fetcher.fetch(track_info)
            
            if not lyrics or not lyrics.lines:
                # Try Syncedlyrics
                if processor.syncedlyrics_fetcher:
                    source_tried.append("Syncedlyrics")
                    lyrics = await processor.syncedlyrics_fetcher.fetch(track_info)
            
            if not lyrics or not lyrics.lines:
                # Try Genius
                source_tried.append("Genius")
                lyrics = await processor.genius_fetcher.fetch(track_info)
        
        except Exception as e:
            logger.error(f"Lyrics search failed: {e}")
        
        if lyrics and lyrics.lines:
            # Update current player if exists
            if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                player = self.bot.players[self.guild_id]
                player.metadata.lyrics = lyrics
            
            await interaction.followup.send(
                embed=EmbedBuilder.create_success(
                    "Lyrics Found",
                    f"Found **{len(lyrics.lines)} lines** from {lyrics.source.value}\n\n"
                    f"Searched: *{', '.join(source_tried)}*"
                ),
                ephemeral=True
            )
        else:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "No Lyrics Found",
                    f"Could not find lyrics for: **{query}**\n\n"
                    f"Searched: *{', '.join(source_tried)}*"
                ),
                ephemeral=True
            )


class LyricsCommands(commands.Cog):
    """Lyrics control commands"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize lyrics commands"""
        self.bot = bot
        logger.info("Lyrics commands initialized")
    
    @app_commands.command(name="lyrics", description="Lyrics control - show, search, or toggle lyrics")
    async def lyrics(self, interaction: discord.Interaction):
        """Show lyrics control panel"""
        guild_id = interaction.guild.id
        
        # Check if playing
        if not hasattr(self.bot, 'players') or guild_id not in self.bot.players:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_warning(
                    "No Track Playing",
                    "Start playing music first, then use this command to control lyrics."
                ),
                ephemeral=True
            )
            return
        
        player = self.bot.players[guild_id]
        metadata = player.metadata
        
        # Build status embed
        embed = discord.Embed(
            title="🎤 Lyrics Control",
            description=f"**{metadata.title}** by *{metadata.artist}*",
            color=COLOR_INFO
        )
        
        # Lyrics status
        if metadata.lyrics and metadata.lyrics.is_synced:
            status = "🎵 **Synced Lyrics Available**\nLyrics are synchronized with the music."
            lines_count = len(metadata.lyrics.lines)
        elif metadata.lyrics and metadata.lyrics.lines:
            status = "📝 **Plain Lyrics Available**\nLyrics are not synchronized (plain text)."
            lines_count = len(metadata.lyrics.lines)
        else:
            status = "❌ **No Lyrics Found**\nUse the Search button to find lyrics."
            lines_count = 0
        
        embed.add_field(name="Status", value=status, inline=False)
        
        if lines_count > 0:
            embed.add_field(
                name="Source",
                value=f"{metadata.lyrics.source.value} • {lines_count} lines",
                inline=True
            )
        
        if metadata.artwork_url:
            embed.set_thumbnail(url=metadata.artwork_url)
        
        embed.set_footer(text="Use buttons below to control lyrics")
        
        # Create view with buttons
        view = LyricsView(self.bot, guild_id, metadata)
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
    
    @app_commands.command(name="lyrics-show", description="Show all lyrics for current track")
    async def lyrics_show(self, interaction: discord.Interaction):
        """Show all lyrics"""
        guild_id = interaction.guild.id
        
        view = LyricsView(self.bot, guild_id)
        await view._show_full_lyrics(interaction)
    
    @app_commands.command(name="lyrics-search", description="Search for lyrics")
    @app_commands.describe(query="Search query (e.g., 'Owl City - Fireflies')")
    async def lyrics_search(self, interaction: discord.Interaction, query: str):
        """Search and apply lyrics"""
        await interaction.response.defer()
        
        guild_id = interaction.guild.id
        
        # Parse query
        if ' - ' in query:
            artist, title = query.split(' - ', 1)
        else:
            artist = ""
            title = query
        
        # Search for lyrics
        from services.metadata.processor import MetadataProcessor
        from database.models import TrackInfo
        
        processor = MetadataProcessor()
        track_info = TrackInfo(title=title, artist=artist, duration=0)
        
        lyrics = None
        try:
            lyrics = await processor.lrclib_fetcher.fetch(track_info)
            if not lyrics or not lyrics.lines:
                if processor.syncedlyrics_fetcher:
                    lyrics = await processor.syncedlyrics_fetcher.fetch(track_info)
            if not lyrics or not lyrics.lines:
                lyrics = await processor.genius_fetcher.fetch(track_info)
        except Exception as e:
            logger.error(f"Lyrics search failed: {e}")
        
        if lyrics and lyrics.lines:
            # Update current player if exists
            if hasattr(self.bot, 'players') and guild_id in self.bot.players:
                player = self.bot.players[guild_id]
                player.metadata.lyrics = lyrics
                
                await interaction.followup.send(
                    embed=EmbedBuilder.create_success(
                        "Lyrics Applied",
                        f"Found **{len(lyrics.lines)} lines** from {lyrics.source.value}\n"
                        "Lyrics will now display in the player."
                    )
                )
            else:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_success(
                        "Lyrics Found",
                        f"Found **{len(lyrics.lines)} lines** from {lyrics.source.value}\n"
                        "Start playing a track to see lyrics."
                    )
                )
        else:
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "No Lyrics Found",
                    f"Could not find lyrics for: **{query}**\n"
                    "Try a different search term."
                )
            )


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(LyricsCommands(bot))
