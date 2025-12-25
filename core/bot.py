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
        
        # Maintenance mode - load from persistent file
        self._load_maintenance_state()
        
        # Setup event handlers
        self.setup_events()
        
        logger.info("MusicBot initialized")
    
    def _load_maintenance_state(self) -> None:
        """Load maintenance state from persistent file"""
        try:
            from pathlib import Path
            import json
            
            maintenance_file = Path(__file__).parent.parent / 'config' / 'maintenance_state.json'
            
            if maintenance_file.exists():
                with open(maintenance_file, 'r') as f:
                    state = json.load(f)
                    self.maintenance_mode = state.get("enabled", False)
                    self.maintenance_reason = state.get("reason", "Server maintenance in progress. Please try again later.")
                    
                    if self.maintenance_mode:
                        logger.info(f"🔧 Maintenance mode ACTIVE from previous session: {self.maintenance_reason}")
            else:
                self.maintenance_mode = False
                self.maintenance_reason = "Server maintenance in progress. Please try again later."
                
        except Exception as e:
            logger.error(f"Failed to load maintenance state: {e}")
            self.maintenance_mode = False
            self.maintenance_reason = "Server maintenance in progress. Please try again later."
    
    def setup_events(self) -> None:
        """Setup event handlers"""
        
        # Store original tree interaction check
        _original_interaction_check = self.tree.interaction_check
        
        async def maintenance_check(interaction: discord.Interaction) -> bool:
            """Check maintenance mode, banned users, and disabled channels before processing commands"""
            # Check if it's a command interaction
            if interaction.type == discord.InteractionType.application_command:
                # Get command name
                command_name = interaction.command.name if interaction.command else ""
                
                # Skip check for admin commands
                if command_name not in ['admin', 'maintenance']:
                    
                    # 1. Check maintenance mode
                    if self.maintenance_mode:
                        # Get maintenance details from API state
                        try:
                            from web.api.app import _maintenance_mode, _save_maintenance_state, MAINTENANCE_STAGES
                            
                            progress = _maintenance_mode.get("progress", 0)
                            stage = _maintenance_mode.get("stage", "starting")
                            reason = _maintenance_mode.get("reason", self.maintenance_reason)
                            started_at = _maintenance_mode.get("started_at")
                            stage_label = MAINTENANCE_STAGES.get(stage, {}).get("label", "In Progress")
                            
                            # Calculate time elapsed
                            import time as time_module
                            elapsed = ""
                            if started_at:
                                elapsed_secs = int(time_module.time() - started_at)
                                elapsed_mins = elapsed_secs // 60
                                if elapsed_mins > 0:
                                    elapsed = f" ({elapsed_mins} menit)"
                                else:
                                    elapsed = f" ({elapsed_secs} detik)"
                            
                            # Create detailed embed
                            embed = discord.Embed(
                                title="🔧 SONORA dalam Mode Maintenance",
                                description=(
                                    f"**📋 Alasan:**\n{reason}\n\n"
                                    f"**📊 Progress:** {progress}%\n"
                                    f"**🔄 Tahap:** {stage_label}{elapsed}"
                                ),
                                color=0xFFC107
                            )
                            
                            # Add progress bar
                            progress_bar = "▓" * (progress // 10) + "░" * (10 - progress // 10)
                            embed.add_field(
                                name="Progress",
                                value=f"`[{progress_bar}]` {progress}%",
                                inline=False
                            )
                            
                            embed.set_footer(text="🔗 Pantau status di: sonora.muhammadzakizn.com/status")
                            
                            # Create buttons
                            view = discord.ui.View()
                            view.add_item(discord.ui.Button(
                                label="Status Page",
                                url="https://sonora.muhammadzakizn.com/status",
                                style=discord.ButtonStyle.link,
                                emoji="📊"
                            ))
                            view.add_item(discord.ui.Button(
                                label="Changelog",
                                url="https://bit.ly/changeLog",
                                style=discord.ButtonStyle.link,
                                emoji="📋"
                            ))
                            
                            guild_id = str(interaction.guild_id) if interaction.guild_id else ""
                            channel_id = str(interaction.channel_id) if interaction.channel_id else ""
                            
                            # Check if we have existing message for this channel
                            message_ids = _maintenance_mode.get("message_ids", {})
                            existing_msg_id = message_ids.get(guild_id, {}).get(channel_id)
                            
                            if existing_msg_id:
                                # Try to delete old message
                                try:
                                    channel = interaction.channel
                                    if channel:
                                        old_msg = await channel.fetch_message(int(existing_msg_id))
                                        await old_msg.delete()
                                except Exception:
                                    pass  # Message might already be deleted
                            
                            # Send new message
                            await interaction.response.send_message(embed=embed, view=view)
                            
                            # Get the message ID and store it
                            try:
                                message = await interaction.original_response()
                                if message and guild_id and channel_id:
                                    if guild_id not in _maintenance_mode.get("message_ids", {}):
                                        if "message_ids" not in _maintenance_mode:
                                            _maintenance_mode["message_ids"] = {}
                                        _maintenance_mode["message_ids"][guild_id] = {}
                                    _maintenance_mode["message_ids"][guild_id][channel_id] = str(message.id)
                                    _save_maintenance_state(_maintenance_mode)
                            except Exception as e:
                                logger.debug(f"Could not store message ID: {e}")
                            
                        except ImportError:
                            # Fallback if API not loaded
                            embed = discord.Embed(
                                title="🔧 Maintenance Mode",
                                description=self.maintenance_reason,
                                color=0xFFC107
                            )
                            embed.set_footer(text="Bot is currently under maintenance")
                            await interaction.response.send_message(embed=embed, ephemeral=True)
                        except Exception as e:
                            logger.error(f"Maintenance check error: {e}")
                            embed = discord.Embed(
                                title="🔧 Maintenance Mode",
                                description=self.maintenance_reason,
                                color=0xFFC107
                            )
                            await interaction.response.send_message(embed=embed, ephemeral=True)
                        
                        return False
                    
                    # 2. Check banned users
                    try:
                        from web.api.app import _banned_users
                        user_id = str(interaction.user.id)
                        if user_id in _banned_users:
                            ban_info = _banned_users[user_id]
                            ban_reason = ban_info.get('reason', 'No reason provided')
                            
                            embed = discord.Embed(
                                title="🚫 Access Denied",
                                description=(
                                    f"You have been banned from using SONORA.\n\n"
                                    f"**Reason:** {ban_reason}\n\n"
                                    f"If you believe this is an error, please contact support."
                                ),
                                color=0xE53935
                            )
                            embed.set_footer(text="SONORA Support: https://sonora.muhammadzakizn.com/support")
                            
                            # Add support button
                            view = discord.ui.View()
                            view.add_item(discord.ui.Button(
                                label="Contact Support",
                                url="https://sonora.muhammadzakizn.com/support",
                                style=discord.ButtonStyle.link,
                                emoji="💬"
                            ))
                            
                            await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
                            return False
                    except ImportError:
                        pass  # Flask API not loaded yet
                    except Exception as e:
                        logger.error(f"Error checking banned users: {e}")
                    
                    # 3. Check disabled channels
                    try:
                        from web.api.app import _disabled_channels
                        guild_id = str(interaction.guild_id) if interaction.guild_id else None
                        channel_id = str(interaction.channel_id) if interaction.channel_id else None
                        
                        if guild_id and channel_id:
                            guild_channels = _disabled_channels.get(guild_id, {})
                            if channel_id in guild_channels:
                                disable_info = guild_channels[channel_id]
                                disable_reason = disable_info.get('reason', 'This channel has been disabled')
                                
                                embed = discord.Embed(
                                    title="🚫 Channel Disabled",
                                    description=(
                                        f"Bot commands are disabled in this channel.\n\n"
                                        f"**Reason:** {disable_reason}\n\n"
                                        f"Please use another channel or contact server admin."
                                    ),
                                    color=0xE53935
                                )
                                embed.set_footer(text="SONORA Support: https://sonora.muhammadzakizn.com/support")
                                
                                # Add support button
                                view = discord.ui.View()
                                view.add_item(discord.ui.Button(
                                    label="Contact Support",
                                    url="https://sonora.muhammadzakizn.com/support",
                                    style=discord.ButtonStyle.link,
                                    emoji="💬"
                                ))
                                
                                await interaction.response.send_message(embed=embed, view=view, ephemeral=True)
                                return False
                    except ImportError:
                        pass  # Flask API not loaded yet
                    except Exception as e:
                        logger.error(f"Error checking disabled channels: {e}")
            
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
            
            # Start welcome retry background task
            from ui.welcome import start_welcome_retry_task
            start_welcome_retry_task(self)
            
            # Setup permission monitoring
            from utils.permission_monitor import setup_permission_events
            await setup_permission_events(self)
            
            # Connect bot instance to auth API for Discord DM MFA
            try:
                from web.api.auth_api import set_auth_bot_instance
                set_auth_bot_instance(self)
                logger.info("✓ Auth API connected to bot for Discord DM MFA")
            except Exception as e:
                logger.warning(f"Auth API not available: {e}")

        
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
            """Called when bot joins a guild - checks ban status and sends welcome message"""
            logger.info(f"Joined guild: {guild.name} (ID: {guild.id})")
            
            # Check if server is banned
            try:
                from web.api.app import _banned_servers
                guild_id = str(guild.id)
                if guild_id in _banned_servers:
                    ban_info = _banned_servers[guild_id]
                    ban_reason = ban_info.get('reason', 'This server has been banned')
                    
                    logger.warning(f"Banned server {guild.name} ({guild.id}) tried to invite bot - auto-leaving")
                    
                    # Try to DM the owner
                    try:
                        owner = guild.owner
                        if owner:
                            embed = discord.Embed(
                                title="🚫 SONORA Cannot Join This Server",
                                description=(
                                    f"Your server **{guild.name}** has been banned from using SONORA.\n\n"
                                    f"**Reason:** {ban_reason}\n\n"
                                    f"If you believe this is an error, please contact support."
                                ),
                                color=0xE53935
                            )
                            embed.set_footer(text="SONORA Support: https://sonora.muhammadzakizn.com/support")
                            
                            view = discord.ui.View()
                            view.add_item(discord.ui.Button(
                                label="Contact Support",
                                url="https://sonora.muhammadzakizn.com/support",
                                style=discord.ButtonStyle.link,
                                emoji="💬"
                            ))
                            
                            await owner.send(embed=embed, view=view)
                            logger.info(f"Sent ban notification to owner: {owner.name}")
                    except Exception as e:
                        logger.error(f"Failed to DM owner about ban: {e}")
                    
                    # Leave the server
                    await guild.leave()
                    logger.info(f"Auto-left banned server: {guild.name} ({guild.id})")
                    return  # Don't proceed with welcome
                    
            except ImportError:
                pass  # Flask API not loaded yet
            except Exception as e:
                logger.error(f"Error checking banned servers: {e}")
            
            # Initialize pending_welcomes if needed
            if not hasattr(self, 'pending_welcomes'):
                self.pending_welcomes = {}
            
            # Use enhanced welcome system
            from ui.welcome import send_welcome_message
            await send_welcome_message(guild, self)
        
        @self.event
        async def on_guild_channel_update(before: discord.abc.GuildChannel, after: discord.abc.GuildChannel):
            """Called when channel permissions change - retry pending welcomes"""
            if not hasattr(self, 'pending_welcomes'):
                self.pending_welcomes = {}
                return
            
            guild = after.guild
            if guild.id not in self.pending_welcomes:
                return
            
            # Check if this is a text channel we can now send to
            if isinstance(after, discord.TextChannel):
                perms = after.permissions_for(guild.me)
                if perms.send_messages:
                    try:
                        from ui.welcome import WelcomeView
                        view = WelcomeView(guild, self)
                        embed = view.create_welcome_embed()
                        await after.send(embed=embed, view=view)
                        logger.info(f"[WELCOME] ✓ Retry SUCCESS after permission change in #{after.name}")
                        del self.pending_welcomes[guild.id]
                    except discord.Forbidden:
                        pass  # Still can't send
                    except Exception as e:
                        logger.error(f"[WELCOME] Retry error: {e}")
        
        @self.event
        async def on_guild_remove(guild: discord.Guild):
            """Called when bot leaves a guild"""
            logger.info(f"Left guild: {guild.name} (ID: {guild.id})")
            
            # Cleanup pending welcomes
            if hasattr(self, 'pending_welcomes') and guild.id in self.pending_welcomes:
                del self.pending_welcomes[guild.id]
            
            # Cleanup voice connection
            if self.voice_manager.is_connected(guild.id):
                await self.voice_manager.disconnect(guild.id, force=True)

    
    async def setup_hook(self) -> None:
        """Called when bot is starting up"""
        logger.info("Running setup hook...")
        
        # Cleanup cache on startup (clear downloads folder)
        await self._startup_cleanup()
        
        # Connect to database
        await self.db_manager.connect()
        
        # Run annual history cleanup (deletes data older than 1 year)
        await self._annual_history_cleanup()
        
        # Load commands
        await self.load_commands()
    
    async def _annual_history_cleanup(self) -> None:
        """
        Check if annual history cleanup is needed (runs on January 1st).
        Deletes play history older than 1 year to comply with privacy policy.
        """
        try:
            from datetime import datetime
            
            # Only run intensive cleanup if it's January
            today = datetime.now()
            if today.month == 1:
                logger.info("📅 January detected - checking for annual history cleanup...")
                deleted = await self.db_manager.cleanup_old_history(years_to_keep=1)
                if deleted > 0:
                    logger.info(f"🧹 Annual cleanup: Deleted {deleted} old history entries")
                else:
                    logger.info("🧹 Annual cleanup: No old history to delete")
            else:
                logger.debug("Annual cleanup skipped - not January")
        except Exception as e:
            logger.warning(f"Annual history cleanup failed: {e}")
    
    async def _startup_cleanup(self) -> None:
        """
        Clean up cache and downloads on startup.
        
        Removes old audio files to save disk space.
        Called once when bot starts.
        CRITICAL: Skips files that are registered as active.
        """
        logger.info("🧹 Starting cache cleanup...")
        
        try:
            from config.settings import Settings
            from services.audio.file_registry import get_audio_registry
            
            registry = get_audio_registry()
            active_files = registry.get_all_active()
            
            cleaned_count = 0
            cleaned_size = 0
            skipped_count = 0
            
            # 1. Clean downloads folder (audio files)
            downloads_dir = Settings.DOWNLOADS_DIR
            if downloads_dir.exists():
                for ext in ['*.opus', '*.m4a', '*.mp3', '*.webm', '*.flac', '*.ogg']:
                    for f in downloads_dir.glob(ext):
                        try:
                            # Skip active files
                            if f in active_files:
                                skipped_count += 1
                                continue
                            
                            size = f.stat().st_size
                            f.unlink()
                            cleaned_count += 1
                            cleaned_size += size
                        except Exception:
                            pass
                
                # 2. Clean playlist_cache subfolder
                playlist_cache = downloads_dir / 'playlist_cache'
                if playlist_cache.exists():
                    for ext in ['*.opus', '*.m4a', '*.mp3', '*.webm', '*.flac', '*.ogg']:
                        for f in playlist_cache.glob(ext):
                            try:
                                # Skip active files
                                if f in active_files:
                                    skipped_count += 1
                                    continue
                                    
                                size = f.stat().st_size
                                f.unlink()
                                cleaned_count += 1
                                cleaned_size += size
                            except Exception:
                                pass
            
            size_mb = cleaned_size / (1024 * 1024)
            if cleaned_count > 0 or skipped_count > 0:
                logger.info(f"🧹 Startup cleanup: Deleted {cleaned_count} files ({size_mb:.1f}MB), skipped {skipped_count} active")
            else:
                logger.info("🧹 Startup cleanup: No files to clean")
                
        except Exception as e:
            logger.warning(f"Startup cleanup failed: {e}")
    
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
            await self.load_extension('commands.lyrics')
            
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
