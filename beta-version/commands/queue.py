"""Queue management commands"""

import discord
from discord.ext import commands
from discord import app_commands

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.queue')


class QueueCommands(commands.Cog):
    """Queue management commands"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize queue commands"""
        self.bot = bot
        # Simple queue storage (guild_id -> list of TrackInfo)
        # For production, use database.queue_manager.QueueManager
        self.queues = {}  # guild_id -> list of TrackInfo
        logger.info("Queue commands initialized")
    
    def add_to_queue(self, guild_id: int, metadata) -> int:
        """
        Add track to queue
        
        Args:
            guild_id: Guild ID
            metadata: MetadataInfo object
        
        Returns:
            Position in queue (1-indexed)
        """
        if guild_id not in self.queues:
            self.queues[guild_id] = []
        
        self.queues[guild_id].append(metadata)
        position = len(self.queues[guild_id])
        
        logger.info(f"Added to queue: {metadata.title} (position #{position})")
        return position
    
    def get_next(self, guild_id: int):
        """
        Get next track from queue
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Next MetadataInfo or None if queue empty
        """
        if guild_id not in self.queues or not self.queues[guild_id]:
            return None
        
        return self.queues[guild_id].pop(0)
    
    @app_commands.command(name="queue", description="Show queue for your voice channel")
    async def queue(self, interaction: discord.Interaction):
        """Show interactive queue filtered by user's voice channel"""
        # Check if user is in voice
        if not interaction.user.voice:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not in Voice Channel",
                    "❌ You must be in a voice channel to view its queue"
                ),
                ephemeral=True
            )
            return
        
        user_voice_channel_id = interaction.user.voice.channel.id
        
        # Create interactive queue view
        from ui.queue_view import InteractiveQueueView
        view = InteractiveQueueView(
            bot=self.bot,
            guild_id=interaction.guild.id,
            user_voice_channel_id=user_voice_channel_id,
            timeout=180
        )
        
        embed = view.create_embed()
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=False)
    
    @app_commands.command(name="clear", description="Clear queue in your voice channel")
    async def clear(self, interaction: discord.Interaction):
        """Clear queue for user's voice channel only"""
        # Check if user is in voice
        if not interaction.user.voice:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not in Voice Channel",
                    "❌ You must be in a voice channel to clear its queue"
                ),
                ephemeral=True
            )
            return
        
        user_voice_channel_id = interaction.user.voice.channel.id
        guild_id = interaction.guild.id
        
        if guild_id in self.queues:
            # Filter and remove only tracks from user's voice channel
            all_queue = self.queues[guild_id]
            to_remove = []
            
            for i, item in enumerate(all_queue):
                voice_ch_id = getattr(item, 'voice_channel_id', None)
                if voice_ch_id == user_voice_channel_id:
                    to_remove.append(i)
            
            # Remove in reverse order
            for i in reversed(to_remove):
                all_queue.pop(i)
            
            count = len(to_remove)
            
            if count > 0:
                await interaction.response.send_message(
                    embed=EmbedBuilder.create_success(
                        "Queue Cleared",
                        f"🗑️ Removed **{count}** tracks from **{interaction.user.voice.channel.name}**"
                    )
                )
            else:
                await interaction.response.send_message(
                    embed=EmbedBuilder.create_error(
                        "Queue Empty",
                        "No tracks in your voice channel queue"
                    ),
                    ephemeral=True
                )
        else:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Queue Empty",
                    "Queue is already empty"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="shuffle", description="Shuffle queue in your voice channel")
    async def shuffle(self, interaction: discord.Interaction):
        """Shuffle queue for user's voice channel only"""
        # Check if user is in voice
        if not interaction.user.voice:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not in Voice Channel",
                    "❌ You must be in a voice channel to shuffle its queue"
                ),
                ephemeral=True
            )
            return
        
        user_voice_channel_id = interaction.user.voice.channel.id
        guild_id = interaction.guild.id
        
        if guild_id not in self.queues or not self.queues[guild_id]:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Queue Empty",
                    "No tracks to shuffle"
                ),
                ephemeral=True
            )
            return
        
        all_queue = self.queues[guild_id]
        
        # Extract tracks from user's voice channel
        user_tracks = []
        user_indices = []
        
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == user_voice_channel_id:
                user_tracks.append(item)
                user_indices.append(i)
        
        if len(user_tracks) < 2:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not Enough Tracks",
                    "Need at least 2 tracks to shuffle"
                ),
                ephemeral=True
            )
            return
        
        # Shuffle user's tracks
        import random
        random.shuffle(user_tracks)
        
        # Put shuffled tracks back in their positions
        for i, idx in enumerate(user_indices):
            all_queue[idx] = user_tracks[i]
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Queue Shuffled",
                f"🔀 Shuffled **{len(user_tracks)}** tracks in **{interaction.user.voice.channel.name}**\n\n"
                f"Other voice channels were not affected"
            )
        )
        
        logger.info(f"Shuffled {len(user_tracks)} tracks in VC {user_voice_channel_id}")
    
    @app_commands.command(name="move", description="Move a track to a specific position")
    @app_commands.describe(
        from_position="Current position of the track (starting from 1)",
        to_position="New position for the track (starting from 1)"
    )
    async def move(
        self,
        interaction: discord.Interaction,
        from_position: int,
        to_position: int
    ):
        """Move track to specific position (only within user's voice channel)"""
        # Check if user is in voice
        if not interaction.user.voice:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Not in Voice Channel",
                    "❌ You must be in a voice channel to move tracks"
                ),
                ephemeral=True
            )
            return
        
        user_voice_channel_id = interaction.user.voice.channel.id
        guild_id = interaction.guild.id
        
        if guild_id not in self.queues or not self.queues[guild_id]:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Queue Empty",
                    "No tracks in queue"
                ),
                ephemeral=True
            )
            return
        
        all_queue = self.queues[guild_id]
        
        # Get user's tracks with their actual indices
        user_tracks = []
        user_indices = []
        
        for i, item in enumerate(all_queue):
            voice_ch_id = getattr(item, 'voice_channel_id', None)
            if voice_ch_id == user_voice_channel_id:
                user_tracks.append(item)
                user_indices.append(i)
        
        # Validate positions (1-indexed for user)
        if len(user_tracks) == 0:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Queue Empty",
                    "No tracks in your voice channel queue"
                ),
                ephemeral=True
            )
            return
        
        if from_position < 1 or from_position > len(user_tracks):
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Invalid Position",
                    f"From position must be between 1 and {len(user_tracks)}"
                ),
                ephemeral=True
            )
            return
        
        if to_position < 1 or to_position > len(user_tracks):
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Invalid Position",
                    f"To position must be between 1 and {len(user_tracks)}"
                ),
                ephemeral=True
            )
            return
        
        if from_position == to_position:
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Same Position",
                    "Track is already at that position"
                ),
                ephemeral=True
            )
            return
        
        # Convert to 0-indexed
        from_idx = from_position - 1
        to_idx = to_position - 1
        
        # Get the track to move
        track_to_move = user_tracks[from_idx]
        
        # Remove from old position
        user_tracks.pop(from_idx)
        
        # Insert at new position
        user_tracks.insert(to_idx, track_to_move)
        
        # Put back in all_queue
        for i, idx in enumerate(user_indices):
            all_queue[idx] = user_tracks[i]
        
        await interaction.response.send_message(
            embed=EmbedBuilder.create_success(
                "Track Moved",
                f"✅ Moved **{track_to_move.title}**\n"
                f"From position **#{from_position}** → **#{to_position}**\n\n"
                f"In **{interaction.user.voice.channel.name}**"
            )
        )
        
        logger.info(f"Moved track '{track_to_move.title}' from pos {from_position} to {to_position} in VC {user_voice_channel_id}")


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(QueueCommands(bot))
