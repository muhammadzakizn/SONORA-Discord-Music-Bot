"""Main bot class"""

import asyncio
import discord
from discord.ext import commands
from typing import Optional

from config.settings import Settings
from config.logging_config import get_logger, setup_logging
from core.error_handler import BotErrorHandler
from services.voice.manager import VoiceManager
from database.db_manager import get_db_manager

logger = get_logger('bot')


class MusicBot(commands.Bot):
    """
    Main Discord Music Bot
    
    Features:
    - Multi-guild voice support
    - Robust error handling
    - Command management
    - Voice connection management
    """
    
    def __init__(self):
        """Initialize music bot"""
        # Setup intents
        intents = discord.Intents.default()
        intents.message_content = True
        intents.voice_states = True
        intents.guilds = True
        
        # Initialize bot
        super().__init__(
            command_prefix='!',  # Fallback prefix for text commands
            intents=intents,
            help_command=None  # Custom help command
        )
        
        # Initialize managers
        self.voice_manager = VoiceManager()
        self.error_handler = BotErrorHandler()
        self.db_manager = get_db_manager()
        
        # Maintenance mode
        self.maintenance_mode = False
        self.maintenance_reason = "Server maintenance in progress. Please try again later."
        
        # Setup event handlers
        self.setup_events()
        
        logger.info("MusicBot initialized")
    
    def setup_events(self) -> None:
        """Setup event handlers"""
        
        # Store original tree interaction check
        _original_interaction_check = self.tree.interaction_check
        
        async def maintenance_check(interaction: discord.Interaction) -> bool:
            """Check maintenance mode before processing commands"""
            # Check if it's a command interaction
            if interaction.type == discord.InteractionType.application_command:
                # Get command name
                command_name = interaction.command.name if interaction.command else ""
                
                # Skip check for admin commands
                if command_name not in ['admin', 'maintenance']:
                    if self.maintenance_mode:
                        embed = discord.Embed(
                            title="🔧 Maintenance Mode",
                            description=self.maintenance_reason,
                            color=0xFFC107
                        )
                        embed.set_footer(text="Bot is currently under maintenance")
                        await interaction.response.send_message(embed=embed, ephemeral=True)
                        return False
            
            # Call original check if exists
            if _original_interaction_check:
                return await _original_interaction_check(interaction)
            return True
        
        # Override tree interaction check
        self.tree.interaction_check = maintenance_check
        
        @self.event
        async def on_ready():
            """Called when bot is ready"""
            logger.info(f"Bot is ready! Logged in as {self.user.name} (ID: {self.user.id})")
            logger.info(f"Connected to {len(self.guilds)} guilds")
            
            # Set status
            await self.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.listening,
                    name="music 🎵"
                )
            )
            
            # Sync slash commands
            try:
                synced = await self.tree.sync()
                logger.info(f"Synced {len(synced)} slash commands")
            except Exception as e:
                logger.error(f"Failed to sync commands: {e}")
        
        @self.event
        async def on_command_error(ctx: commands.Context, error: Exception):
            """Handle command errors"""
            await self.error_handler.handle_command_error(ctx, error)
        
        @self.event
        async def on_voice_state_update(
            member: discord.Member,
            before: discord.VoiceState,
            after: discord.VoiceState
        ):
            """Handle voice state updates"""
            # If bot left voice channel
            if member.id == self.user.id and before.channel and not after.channel:
                logger.info(f"Bot left voice channel in guild {member.guild.id}")
                
                # Cleanup connection
                connection = self.voice_manager.get_connection(member.guild.id)
                if connection:
                    await connection.cleanup()
                return
            
            # CRITICAL: Check if bot's voice state changed (moved, muted, etc.)
            if member.id == self.user.id and before.channel and after.channel:
                # Bot was moved to different channel
                if before.channel.id != after.channel.id:
                    logger.info(f"Bot moved from {before.channel.name} to {after.channel.name}")
                    return
                
                # Bot was server muted/deafened
                if before.mute != after.mute or before.deaf != after.deaf:
                    logger.info(f"Bot mute/deaf state changed: mute={after.mute}, deaf={after.deaf}")
                    return
            
            # CRITICAL: Monitor when other users join/leave bot's channel
            # This can cause audio stream interruption in Discord
            if member.id != self.user.id:
                connection = self.voice_manager.get_connection(member.guild.id)
                if not connection or not connection.is_connected():
                    return
                
                bot_channel = connection.channel
                if not bot_channel:
                    return
                
                # User joined bot's channel
                if after.channel and after.channel.id == bot_channel.id and (not before.channel or before.channel.id != bot_channel.id):
                    logger.info(f"User {member.name} joined bot's voice channel: {bot_channel.name}")
                    
                    # CRITICAL: Check if audio stream is still healthy after user join
                    # Discord API sometimes resets audio stream when users join/leave
                    if connection.is_playing():
                        # Wait a moment for connection to stabilize
                        await asyncio.sleep(0.5)
                        
                        # Verify the connection is actually working
                        try:
                            # Check if voice client is still properly connected
                            if connection.connection:
                                # Test if connection is actually alive
                                is_connected = connection.connection.is_connected()
                                is_playing = connection.connection.is_playing()
                                
                                logger.debug(f"Health check: connected={is_connected}, playing={is_playing}")
                                
                                # If connection claims to be playing but is not connected, it's a ghost playback
                                if is_playing and not is_connected:
                                    logger.error("🚨 GHOST PLAYBACK DETECTED! Connection lost but playback state says playing")
                                    connection.connection.stop()
                                    logger.info("Stopped ghost playback - next track will auto-play")
                                
                                # Additional check: Try to read audio source status
                                elif is_playing and is_connected:
                                    try:
                                        # Check if there's actually an audio source
                                        source = connection.connection.source
                                        if source is None:
                                            logger.error("🚨 Audio source is None while claiming to play!")
                                            connection.connection.stop()
                                            logger.info("Stopped invalid playback state")
                                    except Exception:
                                        pass
                        except Exception as e:
                            logger.error(f"Error checking audio health: {e}")
                
                # User left bot's channel
                elif before.channel and before.channel.id == bot_channel.id and (not after.channel or after.channel.id != bot_channel.id):
                    logger.info(f"User {member.name} left bot's voice channel: {bot_channel.name}")
                    
                    # Check if bot is alone now
                    if bot_channel:
                        members_in_channel = [m for m in bot_channel.members if not m.bot]
                        if len(members_in_channel) == 0:
                            logger.info("🚶 All users left voice channel - Bot is now alone")
                            
                            # CRITICAL: Check if there's queue from OTHER voice channels
                            queue_cog = self.get_cog('QueueCommands')
                            if queue_cog and connection.is_playing():
                                guild_id = member.guild.id
                                queue = queue_cog.queues.get(guild_id, [])
                                
                                # Check if there are tracks from OTHER voice channels
                                other_vc_tracks = []
                                for item in queue:
                                    track_vc_id = getattr(item, 'voice_channel_id', None)
                                    if track_vc_id and track_vc_id != bot_channel.id:
                                        other_vc_tracks.append((item, track_vc_id))
                                
                                if other_vc_tracks:
                                    logger.info(f"✓ Found {len(other_vc_tracks)} tracks from other voice channels")
                                    logger.info("⏭️ Skipping current track to move to other voice channel...")
                                    
                                    # Skip current track - this will trigger _play_next_from_queue
                                    # which will handle moving to the other voice channel
                                    try:
                                        if connection.connection and connection.connection.is_playing():
                                            connection.connection.stop()
                                            logger.info("✓ Skipped - Bot will move to other voice channel")
                                    except Exception as e:
                                        logger.error(f"Failed to skip track: {e}")
                                else:
                                    logger.info("No tracks from other voice channels - staying here")
        
        @self.event
        async def on_guild_join(guild: discord.Guild):
            """Called when bot joins a guild"""
            logger.info(f"Joined guild: {guild.name} (ID: {guild.id})")
        
        @self.event
        async def on_guild_remove(guild: discord.Guild):
            """Called when bot leaves a guild"""
            logger.info(f"Left guild: {guild.name} (ID: {guild.id})")
            
            # Cleanup voice connection
            if self.voice_manager.is_connected(guild.id):
                await self.voice_manager.disconnect(guild.id, force=True)
    
    async def setup_hook(self) -> None:
        """Called when bot is starting up"""
        logger.info("Running setup hook...")
        
        # Connect to database
        await self.db_manager.connect()
        
        # Load commands
        await self.load_commands()
    
    async def load_commands(self) -> None:
        """Load command modules"""
        try:
            # Load command cogs
            await self.load_extension('commands.play')
            await self.load_extension('commands.control')
            await self.load_extension('commands.queue')
            await self.load_extension('commands.volume')
            await self.load_extension('commands.stats')
            await self.load_extension('commands.admin')
            
            logger.info("Commands loaded successfully")
        
        except Exception as e:
            logger.error(f"Failed to load commands: {e}", exc_info=True)
    
    async def close(self) -> None:
        """Cleanup on bot shutdown"""
        logger.info("Shutting down bot...")
        
        # Disconnect from all voice channels
        await self.voice_manager.disconnect_all(force=True)
        
        # Disconnect from database
        await self.db_manager.disconnect()
        
        # Close bot
        await super().close()
        
        logger.info("Bot shutdown complete")
    
    def run_bot(self) -> None:
        """Run the bot with token from settings"""
        if not Settings.DISCORD_TOKEN:
            logger.error("Discord token not found! Check your .env file")
            raise ValueError("Discord token not found")
        
        logger.info(f"Starting bot with token: {Settings.get_safe_token()}")
        
        try:
            self.run(Settings.DISCORD_TOKEN, log_handler=None)
        except KeyboardInterrupt:
            logger.info("Bot stopped by user")
        except Exception as e:
            logger.error(f"Bot crashed: {e}", exc_info=True)
            raise
