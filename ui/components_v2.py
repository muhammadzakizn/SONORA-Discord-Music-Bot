"""
Discord Components V2 helper for SONORA media player
Implements FlaviBot-style UI with Section and Button accessories
"""

import discord
from typing import Optional, List
from database.models import MetadataInfo
from config.constants import COLOR_PLAYING
from config.logging_config import get_logger

logger = get_logger('ui.components_v2')


class MediaPlayerComponentsV2:
    """
    Build Components V2 layout for media player
    Structure like FlaviBot:
    - Container with accent color
    - Section with text content + thumbnail/button accessory
    - ActionRow with control buttons (Pause, Skip, Stop, Loop, Queue)
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
    ) -> discord.ui.LayoutView:
        """
        Create Components V2 media player as LayoutView
        
        Args:
            metadata: Track metadata
            progress_bar: Progress bar string
            lyrics_lines: Current lyrics lines
            guild_id: Guild ID for EQ indicator
            voice_channel_name: Voice channel name
            is_paused: Whether playback is paused
            bot: Bot instance for button callbacks
            
        Returns:
            discord.ui.LayoutView with all components
        """
        # Build track info (Title on one line, Artist below)
        title_text = f"**{metadata.title}**"
        artist_text = f"*{metadata.artist}*"
        
        # Build requester info
        requester_text = ""
        if metadata.requested_by_id and metadata.requested_by_id > 0:
            requester_text = f"Requested by <@{metadata.requested_by_id}>"
        elif metadata.requested_by:
            requester_text = f"Requested by {metadata.requested_by}"
        
        # Build lyrics text  
        lyrics_text = ""
        if lyrics_lines and any(lyrics_lines):
            lyrics_text = "\n".join(l for l in lyrics_lines if l)
        
        # Create LayoutView
        view = MediaPlayerLayoutView(bot=bot, guild_id=guild_id, timeout=None)
        
        # Create thumbnail accessory if artwork available
        thumbnail = None
        if metadata.artwork_url:
            try:
                thumbnail = discord.ui.Thumbnail(media=metadata.artwork_url)
            except Exception as e:
                logger.warning(f"Could not create thumbnail: {e}")
        
        # ========================================
        # LAYOUT STRUCTURE (cleaner FlaviBot style)
        # ========================================
        
        # Section 1: Now Playing header + Title + Artist with thumbnail
        main_section = discord.ui.Section(
            discord.ui.TextDisplay(content="### Now Playing"),
            discord.ui.TextDisplay(content=title_text),
            discord.ui.TextDisplay(content=artist_text),
            accessory=thumbnail
        ) if thumbnail else discord.ui.Section(
            discord.ui.TextDisplay(content="### Now Playing"),
            discord.ui.TextDisplay(content=title_text),
            discord.ui.TextDisplay(content=artist_text)
        )
        
        # Build container with main section
        container = discord.ui.Container(
            main_section,
            accent_colour=discord.Colour(COLOR_PLAYING)
        )
        
        # Add requester (with vertical bar prefix)
        if requester_text:
            container.add_item(discord.ui.TextDisplay(content=f"│ {requester_text}"))
        
        # Add separator before lyrics area
        container.add_item(discord.ui.Separator())
        
        # Add lyrics if present
        if lyrics_text:
            container.add_item(discord.ui.TextDisplay(content=lyrics_text))
        else:
            container.add_item(discord.ui.TextDisplay(content="-# 🎵"))
        
        # Add separator before progress
        container.add_item(discord.ui.Separator())
        
        # Add progress bar if present
        if progress_bar:
            container.add_item(discord.ui.TextDisplay(content=progress_bar))
            
        # Add separator
        container.add_item(discord.ui.Separator())

        # ========================================
        # CONTROL BUTTONS INSIDE CONTAINER
        # ========================================
        
        # Custom SONORA emoji IDs
        pause_emoji = discord.PartialEmoji(name="pause", id=1460800072823476264)
        play_emoji = discord.PartialEmoji(name="play", id=1460800090586353928)
        stop_emoji = discord.PartialEmoji(name="stop", id=1460800121217224884)
        loop_emoji = discord.PartialEmoji(name="loop", id=1460800053483667610)
        skip_emoji = discord.PartialEmoji(name="skip", id=1460800090586353928) # Placeholder
        
        # Pause/Resume
        pause_btn = discord.ui.Button(
            emoji=pause_emoji if not is_paused else play_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_pause_{guild_id}",
            row=0
        )
        
        # Skip
        skip_btn = discord.ui.Button(
            emoji=skip_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_skip_{guild_id}",
            row=0
        )
        
        # Stop
        stop_btn = discord.ui.Button(
            emoji=stop_emoji,
            style=discord.ButtonStyle.danger,
            custom_id=f"ctrl_stop_{guild_id}",
            row=0
        )
        
        # Loop
        loop_btn = discord.ui.Button(
            emoji=loop_emoji,
            style=discord.ButtonStyle.secondary,
            custom_id=f"ctrl_loop_{guild_id}",
            row=0
        )
        
        # Add buttons to container (Hope they render inline or wrap)
        container.add_item(pause_btn)
        container.add_item(skip_btn)
        container.add_item(stop_btn)
        container.add_item(loop_btn)

        # Add container to view
        view.add_item(container)
        
        # No more external ActionRow for controls
        # view.add_control_buttons(is_paused)
        
        return view
        
    @staticmethod
    def create_search_results_view(results: list, user_id: int):
        """Create view for search results"""
        pass


class MediaPlayerLayoutView(discord.ui.LayoutView):
    """Layout view for media player"""
    
    def __init__(self, bot, guild_id: int, timeout: float = None):
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        
        # Callbacks will be handled by the buttons themselves or main view based on custom_id
        
    # add_control_buttons removed - logic moved to create_now_playing_view
    
    def _check_voice_channel(self, interaction: discord.Interaction) -> tuple:
        """Check if user is in the same voice channel as bot"""
        if not interaction.user.voice:
            return False, "You must be in a voice channel"
        
        if self.bot and hasattr(self.bot, 'voice_manager'):
            connection = self.bot.voice_manager.get_connection(self.guild_id)
            if connection:
                vc = getattr(connection, 'connection', connection)
                if hasattr(vc, 'channel') and vc.channel:
                    if interaction.user.voice.channel.id != vc.channel.id:
                        return False, "You must be in the same voice channel"
        
        return True, None
    
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Handle button interactions"""
        custom_id = interaction.data.get('custom_id', '')
        
        # Handle control buttons
        if custom_id.startswith('ctrl_pause_'):
            await self._handle_pause(interaction)
            return False
        elif custom_id.startswith('ctrl_skip_'):
            await self._handle_skip(interaction)
            return False
        elif custom_id.startswith('ctrl_stop_'):
            await self._handle_stop(interaction)
            return False
        elif custom_id.startswith('ctrl_loop_'):
            await self._handle_loop(interaction)
            return False
        elif custom_id.startswith('ctrl_queue_'):
            await self._handle_queue(interaction)
            return False
        elif custom_id.startswith('btn_like_'):
            await self._handle_like(interaction)
            return False
        
        return True
    
    async def _handle_pause(self, interaction: discord.Interaction):
        """Handle pause/resume"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            if self.bot and hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                player = self.bot.players[self.guild_id]
                if player.is_paused:
                    await player.resume()
                    await interaction.response.send_message("▶️ Resumed", ephemeral=True, delete_after=2)
                else:
                    await player.pause()
                    await interaction.response.send_message("⏸️ Paused", ephemeral=True, delete_after=2)
            else:
                await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=2)
        except Exception as e:
            logger.error(f"Pause error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    async def _handle_skip(self, interaction: discord.Interaction):
        """Handle skip"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            if self.bot and hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                player = self.bot.players[self.guild_id]
                player.is_playing = False
                await player._play_next_from_queue()
                await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=2)
            else:
                await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=2)
        except Exception as e:
            logger.error(f"Skip error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    async def _handle_stop(self, interaction: discord.Interaction):
        """Handle stop"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            from services.audio.lavalink_player import get_lavalink_player
            lavalink_player = get_lavalink_player()
            if lavalink_player:
                await lavalink_player.disconnect(self.guild_id)
            
            if self.bot:
                connection = self.bot.voice_manager.get_connection(self.guild_id)
                if connection:
                    await connection.disconnect()
                
                if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                    self.bot.players[self.guild_id].is_playing = False
                
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog and hasattr(queue_cog, 'queues') and self.guild_id in queue_cog.queues:
                    queue_cog.queues[self.guild_id].clear()  # Clear the queue list directly
            
            await interaction.response.send_message("⏹️ Stopped", ephemeral=True, delete_after=3)
        except Exception as e:
            logger.error(f"Stop error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    async def _handle_loop(self, interaction: discord.Interaction):
        """Handle loop toggle"""
        try:
            if self.bot:
                loop_cog = self.bot.get_cog('LoopCommands')
                if loop_cog:
                    from commands.loop import LoopMode
                    current = loop_cog.get_loop_mode(self.guild_id)
                    
                    if current == LoopMode.OFF:
                        loop_cog.set_loop_mode(self.guild_id, LoopMode.TRACK)
                        await interaction.response.send_message("🔂 Loop: Track", ephemeral=True, delete_after=2)
                    elif current == LoopMode.TRACK:
                        loop_cog.set_loop_mode(self.guild_id, LoopMode.QUEUE)
                        await interaction.response.send_message("🔁 Loop: Queue", ephemeral=True, delete_after=2)
                    else:
                        loop_cog.set_loop_mode(self.guild_id, LoopMode.OFF)
                        await interaction.response.send_message("➡️ Loop: Off", ephemeral=True, delete_after=2)
                else:
                    await interaction.response.send_message("Loop not available", ephemeral=True, delete_after=2)
        except Exception as e:
            logger.error(f"Loop error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    async def _handle_queue(self, interaction: discord.Interaction):
        """Handle queue display"""
        try:
            if self.bot:
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog and self.guild_id in queue_cog.queues:
                    queue = queue_cog.queues[self.guild_id]
                    if queue:
                        queue_text = ""
                        for i, item in enumerate(queue[:10], 1):
                            title = item.title[:30] + "..." if len(item.title) > 30 else item.title
                            queue_text += f"`{i}.` {title}\n"
                        
                        if len(queue) > 10:
                            queue_text += f"\n*...and {len(queue) - 10} more*"
                        
                        embed = discord.Embed(
                            title="📋 Queue",
                            description=queue_text,
                            color=0x7B1E3C
                        )
                        await interaction.response.send_message(embed=embed, ephemeral=True, delete_after=15)
                    else:
                        await interaction.response.send_message("Queue is empty", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Queue is empty", ephemeral=True, delete_after=3)
        except Exception as e:
            logger.error(f"Queue error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    async def _handle_like(self, interaction: discord.Interaction):
        """Handle like button"""
        await interaction.response.send_message("🤍 Added to favorites!", ephemeral=True, delete_after=3)


def create_media_player_v2(
    metadata: MetadataInfo,
    progress_bar: str = "",
    lyrics_lines: Optional[List[str]] = None,
    guild_id: int = None,
    voice_channel_name: str = None,
    is_paused: bool = False,
    bot = None
) -> discord.ui.LayoutView:
    """
    Create Components V2 media player LayoutView
    
    Returns:
        LayoutView to be sent with channel.send(view=layout_view)
    """
    return MediaPlayerComponentsV2.create_now_playing_view(
        metadata=metadata,
        progress_bar=progress_bar,
        lyrics_lines=lyrics_lines,
        guild_id=guild_id,
        voice_channel_name=voice_channel_name,
        is_paused=is_paused,
        bot=bot
    )
