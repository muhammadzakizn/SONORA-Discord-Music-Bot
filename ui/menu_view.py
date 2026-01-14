"""Menu view with buttons for playback controls"""

import discord
from typing import Optional

from config.logging_config import get_logger

logger = get_logger('ui.menu_view')


class MediaPlayerView(discord.ui.View):
    """
    Interactive view dengan button controls untuk media player
    Row 1: Icon-only buttons (Pause, Skip, Stop, Loop, Queue)
    Row 2: Dropdown menu untuk opsi lainnya
    """
    
    def __init__(self, bot, guild_id: int, timeout: int = None):
        """
        Initialize media player view
        
        Args:
            bot: Bot instance
            guild_id: Guild ID
            timeout: Timeout in seconds (None = no timeout)
        """
        super().__init__(timeout=timeout)
        self.bot = bot
        self.guild_id = guild_id
        self.is_paused = False
        self.loop_mode = 0  # 0=off, 1=track, 2=queue
    
    # ========================================
    # ROW 1: QUICK BUTTONS (icon + label)
    # ========================================
    
    @discord.ui.button(label="Pause", emoji="⏸", style=discord.ButtonStyle.secondary, row=0, custom_id="btn_pause")
    async def btn_pause_resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Pause/Resume toggle - icon changes based on state"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            connection = self.bot.voice_manager.get_connection(self.guild_id)
            
            # Try legacy connection
            if connection:
                if connection.is_playing():
                    connection.connection.pause()
                    self.is_paused = True
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = True
                    # Update button icon to PLAY (because now paused)
                    button.emoji = "▶️"
                    await interaction.response.edit_message(view=self)
                    return
                elif connection.is_paused():
                    connection.connection.resume()
                    self.is_paused = False
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = False
                    # Update button icon to PAUSE (because now playing)
                    button.emoji = "⏸️"
                    await interaction.response.edit_message(view=self)
                    return
            
            # Try Lavalink
            from services.audio.lavalink_player import get_lavalink_player
            lavalink_player = get_lavalink_player()
            if lavalink_player:
                wl_player = lavalink_player.get_player(self.guild_id)
                if wl_player:
                    if wl_player.paused:
                        await wl_player.pause(False)
                        self.is_paused = False
                        # Update button icon to PAUSE (because now playing)
                        button.emoji = "⏸️"
                        await interaction.response.edit_message(view=self)
                    else:
                        await wl_player.pause(True)
                        self.is_paused = True
                        # Update button icon to PLAY (because now paused)
                        button.emoji = "▶️"
                        await interaction.response.edit_message(view=self)
                    return
            
            await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=2)
        except Exception as e:
            logger.error(f"Pause/Resume error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    @discord.ui.button(label="Skip", emoji="⏭", style=discord.ButtonStyle.secondary, row=0)
    async def btn_skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Skip current track"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            # Try Lavalink first
            from services.audio.lavalink_player import get_lavalink_player
            lavalink_player = get_lavalink_player()
            if lavalink_player:
                wl_player = lavalink_player.get_player(self.guild_id)
                if wl_player and wl_player.playing:
                    await wl_player.stop()
                    await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=2)
                    return
            
            # Try legacy
            connection = self.bot.voice_manager.get_connection(self.guild_id)
            if connection and (connection.is_playing() or connection.is_paused()):
                if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                    player = self.bot.players[self.guild_id]
                    player.is_playing = False
                    await player._play_next_from_queue()
                else:
                    connection.connection.stop()
                await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=2)
                return
            
            await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=2)
        except Exception as e:
            logger.error(f"Skip error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    @discord.ui.button(label="Stop", emoji="⏹", style=discord.ButtonStyle.danger, row=0)
    async def btn_stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Stop playback and disconnect"""
        is_valid, error_msg = self._check_voice_channel(interaction)
        if not is_valid:
            await interaction.response.send_message(f"❌ {error_msg}", ephemeral=True, delete_after=3)
            return
        
        try:
            # Stop Lavalink
            from services.audio.lavalink_player import get_lavalink_player
            lavalink_player = get_lavalink_player()
            if lavalink_player:
                await lavalink_player.disconnect(self.guild_id)
            
            # Stop legacy
            connection = self.bot.voice_manager.get_connection(self.guild_id)
            if connection:
                await connection.disconnect()
            
            # Clear player
            if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                player = self.bot.players[self.guild_id]
                player.is_playing = False
                if hasattr(player, 'update_task') and player.update_task:
                    player.update_task.cancel()
            
            # Clear queue
            queue_cog = self.bot.get_cog('QueueCommands')
            if queue_cog and hasattr(queue_cog, 'queues') and self.guild_id in queue_cog.queues:
                queue_cog.queues[self.guild_id].clear()  # Clear the list directly
            
            await interaction.response.send_message("⏹️ Stopped & Disconnected", ephemeral=True, delete_after=3)
        except Exception as e:
            logger.error(f"Stop error: {e}")
            await interaction.response.send_message("❌ Error", ephemeral=True, delete_after=2)
    
    @discord.ui.button(label="Loop", emoji="🔁", style=discord.ButtonStyle.secondary, row=0)
    async def btn_loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Toggle loop mode (Off -> Track -> Queue -> Off)"""
        try:
            loop_cog = self.bot.get_cog('LoopCommands')
            if loop_cog:
                from commands.loop import LoopMode
                current = loop_cog.get_loop_mode(self.guild_id)
                
                # Cycle through modes
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
    
    @discord.ui.button(label="Queue", emoji="📋", style=discord.ButtonStyle.secondary, row=0)
    async def btn_queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show queue"""
        try:
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
    
    def _check_voice_channel(self, interaction: discord.Interaction) -> tuple[bool, str]:
        """Check if user is in same voice channel as bot"""
        # Check if user is in a voice channel
        if not interaction.user.voice or not interaction.user.voice.channel:
            return False, "You must be in a voice channel to control playback"
        
        user_channel = interaction.user.voice.channel
        
        # Check 1: voice_manager connection (legacy FFmpeg)
        connection = self.bot.voice_manager.get_connection(self.guild_id)
        if connection and connection.is_connected():
            # Support both raw VoiceClient and legacy wrapper
            # Standard VoiceClient has .channel property
            if hasattr(connection.connection, 'channel'):
                bot_channel = connection.connection.channel
            elif hasattr(connection, 'channel'):
                bot_channel = connection.channel
            else:
                # Fallback for legacy wrapper structure
                bot_channel = getattr(connection.connection, 'channel', None)
            
            if bot_channel and bot_channel.id != user_channel.id:
                return False, f"You must be in **{bot_channel.name}** to control playback"
            return True, ""
        
        # Check 2: Lavalink/wavelink player connection
        from services.audio.lavalink_player import get_lavalink_player
        lavalink_player = get_lavalink_player()
        if lavalink_player:
            wl_player = lavalink_player.get_player(self.guild_id)
            if wl_player and wl_player.connected:
                bot_channel = wl_player.channel
                if bot_channel and bot_channel.id != user_channel.id:
                    return False, f"You must be in **{bot_channel.name}** to control playback"
                return True, ""
        
        # Check 3: Discord voice_client (fallback)
        guild = interaction.guild
        if guild and guild.voice_client:
            vc = guild.voice_client
            # wavelink Player has .channel, Discord VoiceClient has .channel too
            bot_channel = getattr(vc, 'channel', None)
            if bot_channel:
                if bot_channel.id != user_channel.id:
                    return False, f"You must be in **{bot_channel.name}** to control playback"
                return True, ""
        
        return False, "Bot is not connected to a voice channel"

    
    # ========================================
    # ROW 2: DROPDOWN MENU FOR MORE OPTIONS
    # ========================================
    @discord.ui.select(
        placeholder="⚙️ More Options",
        row=1,
        options=[
            discord.SelectOption(
                label="Pause",
                value="pause",
                description="Pause playback"
            ),
            discord.SelectOption(
                label="Resume",
                value="resume",
                description="Resume playback"
            ),
            discord.SelectOption(
                label="Skip",
                value="skip",
                description="Skip current song"
            ),
            discord.SelectOption(
                label="Stop",
                value="stop",
                description="Stop & disconnect"
            ),
            discord.SelectOption(
                label="Volume Up",
                value="volume_up",
                description="Increase volume 10%"
            ),
            discord.SelectOption(
                label="Volume Down",
                value="volume_down",
                description="Decrease volume 10%"
            ),
            discord.SelectOption(
                label="Mute",
                value="mute",
                description="Mute/Unmute audio"
            ),
            discord.SelectOption(
                label="Volume Reset",
                value="volume_reset",
                description="Reset volume to 100%"
            ),
            discord.SelectOption(
                label="Volume Control",
                value="volume_control",
                description="Open volume slider"
            ),
            discord.SelectOption(
                label="Equalizer",
                value="equalizer",
                description="Adjust EQ settings"
            ),
            discord.SelectOption(
                label="Queue",
                value="queue",
                description="View queue"
            ),
            discord.SelectOption(
                label="Lyrics",
                value="lyrics",
                description="Lyrics control"
            ),
            discord.SelectOption(
                label="Clear Queue",
                value="clear",
                description="Clear all queue"
            ),
            discord.SelectOption(
                label="Shuffle",
                value="shuffle",
                description="Shuffle queue"
            ),
            discord.SelectOption(
                label="Loop Queue",
                value="loop_queue",
                description="Toggle loop queue"
            ),
            discord.SelectOption(
                label="Loop Track",
                value="loop_track",
                description="Toggle loop track"
            ),
            discord.SelectOption(
                label="Now Playing",
                value="now_playing",
                description="Current song info"
            ),
            discord.SelectOption(
                label="Stats",
                value="stats",
                description="Bot statistics"
            ),
            discord.SelectOption(
                label="Donate",
                value="donate",
                description="Support developer"
            ),
            discord.SelectOption(
                label="Website",
                value="website",
                description="SONORA website features"
            ),
            discord.SelectOption(
                label="Help",
                value="help",
                description="Bot usage guide"
            ),
        ]
    )
    async def menu_select(
        self, 
        interaction: discord.Interaction, 
        select: discord.ui.Select
    ):
        """Handle menu selection"""
        
        action = select.values[0]
        
        try:
            # Get voice connection
            connection = self.bot.voice_manager.get_connection(self.guild_id)
            
            # Voice channel check required for playback controls
            if action in ("pause", "resume", "skip", "stop", "volume_up", "volume_down", "mute", "volume_reset", "clear", "shuffle"):
                is_valid, error_msg = self._check_voice_channel(interaction)
                if not is_valid:
                    await interaction.response.send_message(f"Access Denied: {error_msg}", ephemeral=True, delete_after=5)
                    return
            
            if action == "pause":
                # Try legacy connection first
                if connection and connection.is_playing():
                    connection.connection.pause()
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = True
                    await interaction.response.send_message("⏸️ Paused", ephemeral=True, delete_after=3)
                else:
                    # Try Lavalink player
                    from services.audio.lavalink_player import get_lavalink_player
                    lavalink_player = get_lavalink_player()
                    if lavalink_player:
                        wl_player = lavalink_player.get_player(self.guild_id)
                        if wl_player and wl_player.playing:
                            await wl_player.pause(True)
                            if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                                self.bot.players[self.guild_id].is_paused = True
                            await interaction.response.send_message("⏸️ Paused", ephemeral=True, delete_after=3)
                            return
                    await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=3)
            
            elif action == "resume":
                # Try legacy connection first
                if connection and connection.is_paused():
                    connection.connection.resume()
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = False
                    await interaction.response.send_message("▶️ Resumed", ephemeral=True, delete_after=3)
                else:
                    # Try Lavalink player
                    from services.audio.lavalink_player import get_lavalink_player
                    lavalink_player = get_lavalink_player()
                    if lavalink_player:
                        wl_player = lavalink_player.get_player(self.guild_id)
                        if wl_player and wl_player.paused:
                            await wl_player.pause(False)
                            if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                                self.bot.players[self.guild_id].is_paused = False
                            await interaction.response.send_message("▶️ Resumed", ephemeral=True, delete_after=3)
                            return
                    await interaction.response.send_message("Playback not paused", ephemeral=True, delete_after=3)
            
            elif action == "skip":
                # Try legacy connection first
                if connection and connection.is_playing():
                    connection.connection.stop()
                    await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=3)
                else:
                    # Try Lavalink player
                    from services.audio.lavalink_player import get_lavalink_player
                    lavalink_player = get_lavalink_player()
                    if lavalink_player:
                        wl_player = lavalink_player.get_player(self.guild_id)
                        if wl_player and (wl_player.playing or wl_player.paused):
                            await wl_player.stop()
                            await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=3)
                            return
                    await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=3)

            
            elif action == "stop":
                # Clear queue for this guild
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog and self.guild_id in queue_cog.queues:
                    queue_cog.queues[self.guild_id].clear()
                    logger.info(f"Queue cleared for guild {self.guild_id}")
                
                # Cancel prefetch and mark player as stopped
                if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                    player = self.bot.players[self.guild_id]
                    player.is_playing = False
                    player._transitioning_to_next = False
                    if hasattr(player, 'prefetch_task') and player.prefetch_task:
                        player.prefetch_task.cancel()
                    if hasattr(player, 'update_task') and player.update_task:
                        player.update_task.cancel()
                
                stopped = False
                
                # Try legacy connection first
                if connection:
                    await connection.disconnect()
                    stopped = True
                else:
                    # Try Lavalink player
                    from services.audio.lavalink_player import get_lavalink_player
                    lavalink_player = get_lavalink_player()
                    if lavalink_player:
                        wl_player = lavalink_player.get_player(self.guild_id)
                        if wl_player and wl_player.connected:
                            await wl_player.disconnect()
                            stopped = True
                
                if stopped:
                    await interaction.response.send_message("⏹️ Stopped & queue cleared", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Bot not connected", ephemeral=True, delete_after=3)

            
            elif action == "volume_up":
                volume_cog = self.bot.get_cog('VolumeCommands')
                if volume_cog:
                    current = volume_cog.get_volume(self.guild_id)
                    new_volume = min(current + 10, 200)
                    
                    if connection and connection.connection.source:
                        if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                            connection.connection.source.volume = new_volume / 100.0
                            volume_cog.guild_volumes[self.guild_id] = new_volume
                            await interaction.response.send_message(f"🔊 Volume: {new_volume}%", ephemeral=True, delete_after=3)
                        else:
                            await interaction.response.send_message("❌ Volume control tidak tersedia", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Volume system tidak tersedia", ephemeral=True, delete_after=3)
            
            elif action == "volume_down":
                volume_cog = self.bot.get_cog('VolumeCommands')
                if volume_cog:
                    current = volume_cog.get_volume(self.guild_id)
                    new_volume = max(current - 10, 0)
                    
                    if connection and connection.connection.source:
                        if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                            connection.connection.source.volume = new_volume / 100.0
                            volume_cog.guild_volumes[self.guild_id] = new_volume
                            await interaction.response.send_message(f"🔉 Volume: {new_volume}%", ephemeral=True, delete_after=3)
                        else:
                            await interaction.response.send_message("❌ Volume control tidak tersedia", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Volume system tidak tersedia", ephemeral=True, delete_after=3)
            
            elif action == "volume_control":
                # Send NEW message for volume control (don't edit media player!)
                from ui.volume_view import VolumeView
                
                volume_cog = self.bot.get_cog('VolumeCommands')
                current_volume = 100
                
                if volume_cog:
                    current_volume = volume_cog.get_volume(self.guild_id)
                
                view = VolumeView(self.bot, self.guild_id, current_volume)
                embed = view.create_embed()
                
                # Send as NEW message so media player keeps updating
                await interaction.response.send_message(embed=embed, view=view, ephemeral=False)
            
            elif action == "equalizer":
                # Send NEW message for equalizer (don't edit media player!)
                from ui.equalizer_view import EqualizerView
                view = EqualizerView(self.bot, self.guild_id)
                
                embed = discord.Embed(
                    title="🎛️ Equalizer",
                    description="Choose a preset or create your own custom EQ\n\n"
                               "⚠️ **Note:** Changes take effect on next track",
                    color=discord.Color.blue()
                )
                
                # Send as NEW message so media player keeps updating
                await interaction.response.send_message(embed=embed, view=view, ephemeral=False)
            
            elif action == "queue":
                # Use InteractiveQueueView like /queue command
                from ui.queue_view import InteractiveQueueView
                
                # Get user voice channel
                user_voice_channel_id = None
                if interaction.user.voice and interaction.user.voice.channel:
                    user_voice_channel_id = interaction.user.voice.channel.id
                
                if not user_voice_channel_id:
                    await interaction.response.send_message(
                        "❌ Join a voice channel first to see its queue", 
                        ephemeral=True, 
                        delete_after=5
                    )
                    return
                
                view = InteractiveQueueView(
                    bot=self.bot,
                    guild_id=self.guild_id,
                    user_voice_channel_id=user_voice_channel_id,
                    timeout=180
                )
                
                embed = view.create_embed()
                await interaction.response.send_message(embed=embed, view=view, ephemeral=False)
            
            elif action == "lyrics":
                # Use LyricsView from lyrics command
                from commands.lyrics import LyricsView
                
                # Get current player
                if not hasattr(self.bot, 'players') or self.guild_id not in self.bot.players:
                    await interaction.response.send_message(
                        "❌ No track is currently playing", 
                        ephemeral=True, 
                        delete_after=5
                    )
                    return
                
                player = self.bot.players[self.guild_id]
                metadata = player.metadata
                
                # Build status embed
                from config.constants import COLOR_INFO
                embed = discord.Embed(
                    title="🎤 Lyrics Control",
                    description=f"**{metadata.title}** by *{metadata.artist}*",
                    color=COLOR_INFO
                )
                
                # Lyrics status
                if metadata.lyrics and metadata.lyrics.is_synced:
                    status = "🎵 **Synced Lyrics Available**"
                    lines_count = len(metadata.lyrics.lines)
                elif metadata.lyrics and metadata.lyrics.lines:
                    status = "📝 **Plain Lyrics Available**"
                    lines_count = len(metadata.lyrics.lines)
                else:
                    status = "❌ **No Lyrics Found**"
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
                
                view = LyricsView(self.bot, self.guild_id, metadata)
                await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
            
            elif action == "clear":
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog:
                    count = len(queue_cog.queues.get(self.guild_id, []))
                    queue_cog.queues[self.guild_id] = []
                    await interaction.response.send_message(f"🗑️ Cleared {count} tracks dari queue", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Queue system not available", ephemeral=True, delete_after=3)
            
            elif action == "mute":
                volume_cog = self.bot.get_cog('VolumeCommands')
                if volume_cog and connection and connection.connection.source:
                    if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                        current = connection.connection.source.volume
                        if current > 0:
                            # Save current volume and mute
                            if not hasattr(volume_cog, 'muted_volumes'):
                                volume_cog.muted_volumes = {}
                            volume_cog.muted_volumes[self.guild_id] = int(current * 100)
                            connection.connection.source.volume = 0.0
                            await interaction.response.send_message("🔇 Muted", ephemeral=True, delete_after=3)
                        else:
                            # Unmute to saved volume or 100%
                            saved_volume = getattr(volume_cog, 'muted_volumes', {}).get(self.guild_id, 100)
                            connection.connection.source.volume = saved_volume / 100.0
                            volume_cog.guild_volumes[self.guild_id] = saved_volume
                            await interaction.response.send_message(f"🔊 Unmuted (Volume: {saved_volume}%)", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("Volume control not available", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=3)
            
            elif action == "volume_reset":
                volume_cog = self.bot.get_cog('VolumeCommands')
                if volume_cog and connection and connection.connection.source:
                    if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                        connection.connection.source.volume = 1.0
                        volume_cog.guild_volumes[self.guild_id] = 100
                        await interaction.response.send_message("Volume reset to 100%", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("Volume control not available", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Nothing playing", ephemeral=True, delete_after=3)
            
            elif action == "shuffle":
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog:
                    queue_items = queue_cog.queues.get(self.guild_id, [])
                    if len(queue_items) > 1:
                        import random
                        random.shuffle(queue_items)
                        queue_cog.queues[self.guild_id] = queue_items
                        await interaction.response.send_message(f"🔀 Shuffled {len(queue_items)} tracks", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("Queue too small to shuffle", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("Queue system not available", ephemeral=True, delete_after=3)
            
            elif action == "loop_queue":
                # Initialize loop state if not exists
                if not hasattr(self.bot, 'loop_queue_state'):
                    self.bot.loop_queue_state = {}
                
                current_state = self.bot.loop_queue_state.get(self.guild_id, False)
                self.bot.loop_queue_state[self.guild_id] = not current_state
                
                if not current_state:
                    await interaction.response.send_message("🔁 Loop queue: ON", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("🔁 Loop queue: OFF", ephemeral=True, delete_after=3)
            
            elif action == "loop_track":
                # Initialize loop track state if not exists
                if not hasattr(self.bot, 'loop_track_state'):
                    self.bot.loop_track_state = {}
                
                current_state = self.bot.loop_track_state.get(self.guild_id, False)
                self.bot.loop_track_state[self.guild_id] = not current_state
                
                if not current_state:
                    await interaction.response.send_message("🔂 Loop track: ON", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("🔂 Loop track: OFF", ephemeral=True, delete_after=3)
            
            elif action == "now_playing":
                if connection and hasattr(connection, 'current_track'):
                    from ui.embeds import EmbedBuilder
                    embed = EmbedBuilder.create_track_info(connection.current_track)
                    await interaction.response.send_message(embed=embed, ephemeral=True, delete_after=30)
                else:
                    await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
            
            elif action == "stats":
                # Get bot stats
                guild_count = len(self.bot.guilds)
                voice_connections = len(self.bot.voice_manager.connections) if hasattr(self.bot, 'voice_manager') else 0
                
                queue_cog = self.bot.get_cog('QueueCommands')
                total_queued = sum(len(q) for q in queue_cog.queues.values()) if queue_cog else 0
                
                stats_text = f"""
**Bot Statistics**
🏠 Servers: {guild_count}
🎵 Active Connections: {voice_connections}
📋 Queued Tracks: {total_queued}
⚡ Latency: {round(self.bot.latency * 1000)}ms
                """.strip()
                
                await interaction.response.send_message(stats_text, ephemeral=True, delete_after=10)
            
            elif action == "donate":
                # Create donate embed with support button
                class DonateView(discord.ui.View):
                    def __init__(self):
                        super().__init__(timeout=None)
                        self.add_item(discord.ui.Button(
                            label="💖 Support Developer",
                            url="https://teer.id/muhammadzakizn",
                            style=discord.ButtonStyle.link
                        ))
                        self.add_item(discord.ui.Button(
                            label="⭐ Vote & Rate",
                            url="https://top.gg/bot/1443855259536461928?s=09bfcce8f1e15",
                            style=discord.ButtonStyle.link
                        ))
                
                embed = discord.Embed(
                    title="💖 Support SONORA",
                    description=(
                        "**Terima kasih sudah menggunakan SONORA!** 🎵\n\n"
                        "Bot ini dikembangkan dengan sepenuh hati untuk memberikan "
                        "pengalaman musik terbaik di Discord.\n\n"
                        "Jika kamu menikmati SONORA, pertimbangkan untuk:\n"
                        "• ☕ **Mentraktir developer kopi**\n"
                        "• ⭐ **Memberikan vote di Top.gg**\n"
                        "• 📣 **Share ke teman-temanmu**\n\n"
                        "*Setiap dukungan membantu SONORA berkembang!* 💖"
                    ),
                    color=discord.Color.from_rgb(255, 105, 180)  # Hot pink
                )
                embed.set_footer(text="Made with ❤️ by Muhammad Zaky")
                
                await interaction.response.send_message(embed=embed, view=DonateView(), ephemeral=True)
            
            elif action == "website":
                # Show website features
                class WebsiteView(discord.ui.View):
                    def __init__(self):
                        super().__init__(timeout=None)
                        self.add_item(discord.ui.Button(
                            label="🌐 Kunjungi Website",
                            url="https://sonora.muhammadzakizn.com",
                            style=discord.ButtonStyle.link
                        ))
                
                embed = discord.Embed(
                    title="🌐 SONORA Website",
                    description=(
                        "**Website resmi SONORA** dengan dashboard admin!\n\n"
                        "📊 **Dashboard Features:**\n"
                        "• Monitor semua server sekaligus\n"
                        "• Kontrol playback dari browser\n"
                        "• Real-time updates\n\n"
                        "🎵 **Player Features:**\n"
                        "• Album artwork HD\n"
                        "• Synced lyrics\n"
                        "• Queue management"
                    ),
                    color=discord.Color.from_rgb(123, 30, 60)
                )
                
                await interaction.response.send_message(embed=embed, view=WebsiteView(), ephemeral=True)
            
            elif action == "help":
                # Show help guide
                class HelpView(discord.ui.View):
                    def __init__(self):
                        super().__init__(timeout=None)
                        self.add_item(discord.ui.Button(
                            label="📖 Dokumentasi",
                            url="https://sonora.muhammadzakizn.com/docs",
                            style=discord.ButtonStyle.link
                        ))
                
                embed = discord.Embed(
                    title="❓ Panduan SONORA",
                    description=(
                        "🎵 **Memutar Musik:**\n"
                        "`/play <query/URL>` - Putar lagu\n\n"
                        "⏯️ **Kontrol:**\n"
                        "`/pause` `/resume` `/skip` `/stop`\n\n"
                        "📋 **Queue:**\n"
                        "`/queue` `/shuffle` `/clear` `/loop`\n\n"
                        "🔊 **Audio:**\n"
                        "`/volume` `/equalizer` `/lyrics`\n\n"
                        "ℹ️ **Info:**\n"
                        "`/website` `/donate` `/stats`"
                    ),
                    color=discord.Color.blue()
                )
                embed.set_footer(text="Gunakan /donate untuk support! 💖")
                
                await interaction.response.send_message(embed=embed, view=HelpView(), ephemeral=True)
        
        except Exception as e:
            logger.error(f"Menu action failed: {e}", exc_info=True)
            await interaction.response.send_message(f"❌ Error: {str(e)[:100]}", ephemeral=True, delete_after=5)
