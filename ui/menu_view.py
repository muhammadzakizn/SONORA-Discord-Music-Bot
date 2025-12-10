"""Menu view with buttons for playback controls"""

import discord
from typing import Optional

from config.logging_config import get_logger

logger = get_logger('ui.menu_view')


class MediaPlayerView(discord.ui.View):
    """
    Interactive view dengan menu button untuk media player
    Semua controls disembunyikan dalam menu dropdown
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
    
    @discord.ui.select(
        placeholder="🎵 Menu Kontrol",
        options=[
            discord.SelectOption(
                label="⏸️ Pause",
                value="pause",
                description="Pause playback"
            ),
            discord.SelectOption(
                label="▶️ Resume",
                value="resume",
                description="Resume playback"
            ),
            discord.SelectOption(
                label="⏭️ Skip",
                value="skip",
                description="Skip lagu sekarang"
            ),
            discord.SelectOption(
                label="⏹️ Stop",
                value="stop",
                description="Stop & disconnect"
            ),
            discord.SelectOption(
                label="🔊 Volume Up",
                value="volume_up",
                description="Naikkan volume 10%"
            ),
            discord.SelectOption(
                label="🔉 Volume Down",
                value="volume_down",
                description="Turunkan volume 10%"
            ),
            discord.SelectOption(
                label="🔇 Mute",
                value="mute",
                description="Mute/Unmute audio"
            ),
            discord.SelectOption(
                label="🔄 Volume Reset",
                value="volume_reset",
                description="Reset volume ke 100%"
            ),
            discord.SelectOption(
                label="🎚️ Volume Control",
                value="volume_control",
                description="Open volume slider"
            ),
            discord.SelectOption(
                label="🎛️ Equalizer",
                value="equalizer",
                description="Adjust EQ settings"
            ),
            discord.SelectOption(
                label="📋 Queue",
                value="queue",
                description="Lihat queue"
            ),
            discord.SelectOption(
                label="🎤 Lyrics",
                value="lyrics",
                description="Kontrol lirik"
            ),
            discord.SelectOption(
                label="🗑️ Clear Queue",
                value="clear",
                description="Hapus semua queue"
            ),
            discord.SelectOption(
                label="🔀 Shuffle",
                value="shuffle",
                description="Shuffle queue"
            ),
            discord.SelectOption(
                label="🔁 Loop Queue",
                value="loop_queue",
                description="Toggle loop queue"
            ),
            discord.SelectOption(
                label="🔂 Loop Track",
                value="loop_track",
                description="Toggle loop track"
            ),
            discord.SelectOption(
                label="ℹ️ Now Playing",
                value="now_playing",
                description="Info lagu sekarang"
            ),
            discord.SelectOption(
                label="📊 Stats",
                value="stats",
                description="Statistik bot"
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
            
            if action == "pause":
                if connection and connection.is_playing():
                    connection.connection.pause()
                    # Also update player's is_paused state so update loop pauses
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = True
                    await interaction.response.send_message("⏸️ Paused", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
            
            elif action == "resume":
                if connection and connection.is_paused():
                    connection.connection.resume()
                    # Also update player's is_paused state so update loop resumes
                    if hasattr(self.bot, 'players') and self.guild_id in self.bot.players:
                        self.bot.players[self.guild_id].is_paused = False
                    await interaction.response.send_message("▶️ Resumed", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Playback tidak di-pause", ephemeral=True, delete_after=3)
            
            elif action == "skip":
                if connection and connection.is_playing():
                    connection.connection.stop()
                    await interaction.response.send_message("⏭️ Skipped", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
            
            elif action == "stop":
                if connection:
                    await connection.disconnect()
                    await interaction.response.send_message("⏹️ Stopped & disconnected", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Bot tidak connected", ephemeral=True, delete_after=3)
            
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
                    await interaction.response.send_message("❌ Queue system tidak tersedia", ephemeral=True, delete_after=3)
            
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
                        await interaction.response.send_message("❌ Volume control tidak tersedia", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
            
            elif action == "volume_reset":
                volume_cog = self.bot.get_cog('VolumeCommands')
                if volume_cog and connection and connection.connection.source:
                    if isinstance(connection.connection.source, discord.PCMVolumeTransformer):
                        connection.connection.source.volume = 1.0
                        volume_cog.guild_volumes[self.guild_id] = 100
                        await interaction.response.send_message("🔄 Volume reset ke 100%", ephemeral=True, delete_after=3)
                    else:
                        await interaction.response.send_message("❌ Volume control tidak tersedia", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Tidak ada yang diputar", ephemeral=True, delete_after=3)
            
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
                        await interaction.response.send_message("❌ Queue terlalu sedikit untuk shuffle", ephemeral=True, delete_after=3)
                else:
                    await interaction.response.send_message("❌ Queue system tidak tersedia", ephemeral=True, delete_after=3)
            
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
        
        except Exception as e:
            logger.error(f"Menu action failed: {e}", exc_info=True)
            await interaction.response.send_message(f"❌ Error: {str(e)[:100]}", ephemeral=True, delete_after=5)
