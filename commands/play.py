"""Play command - Main music playback command"""

import asyncio
import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

from database.models import TrackInfo, AudioResult
from services.audio.spotify import SpotifyDownloader
from services.audio.youtube import YouTubeDownloader
from services.audio.playlist_processor import PlaylistProcessor
from services.metadata.processor import MetadataProcessor
from services.voice.connection import RobustVoiceConnection
from ui.loading import SafeLoadingManager
from ui.media_player import SynchronizedMediaPlayer
from ui.embeds import EmbedBuilder
from ui.menu_view import MediaPlayerView
from utils.validators import URLValidator, InputValidator
from utils.formatters import TimeFormatter
from config.settings import Settings
from config.logging_config import get_logger
from core.error_handler import DownloadError

logger = get_logger('commands.play')


class PlayCommand(commands.Cog):
    """Play command cog"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize play command"""
        self.bot = bot
        
        # Initialize services
        self.spotify_downloader = SpotifyDownloader(Settings.DOWNLOADS_DIR)
        self.youtube_downloader = YouTubeDownloader(Settings.DOWNLOADS_DIR)
        self.playlist_processor = PlaylistProcessor(
            self.spotify_downloader,
            self.youtube_downloader
        )
        self.metadata_processor = MetadataProcessor()
        
        logger.info("Play command initialized")
    
    @app_commands.command(name="play", description="Play music from Spotify, YouTube, or search query")
    async def play(
        self,
        interaction: discord.Interaction,
        query: str
    ):
        """
        Play command - Main entry point
        
        Args:
            interaction: Discord interaction
            query: URL or search query
        """
        # Defer response (this gives us more time)
        await interaction.response.defer()
        
        try:
            # Validate user is in voice channel
            if not interaction.user.voice:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_error(
                        "Not in Voice Channel",
                        "❌ You must be in a voice channel to play music!\n\n"
                        "Please join a voice channel first, then try again."
                    ),
                    ephemeral=True
                )
                return
            
            # Get user's voice channel
            user_voice_channel = interaction.user.voice.channel
            
            # Store for later use
            voice_channel = user_voice_channel
            
            # Sanitize query
            query = InputValidator.sanitize_query(query)
            
            # Send initial loading message
            loading_msg = await interaction.followup.send(
                embed=EmbedBuilder.create_loading("Searching...", f"Query: {query}")
            )
            
            loader = SafeLoadingManager(loading_msg)
            
            # Stage 1: Detection - Check if playlist/album
            logger.info(f"Processing play command: {query}")
            
            # Check if it's a playlist/album URL
            if URLValidator.is_playlist_url(query):
                await self._handle_playlist(interaction, query, loader, voice_channel)
                return
            
            track_info = await self._detect_track(query)
            
            if not track_info:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Not Found",
                        f"Could not find: {query}"
                    )
                )
                return
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Found",
                    f"**{track_info.title}** - *{track_info.artist}*\n\nDownloading..."
                )
            )
            
            # Stage 2: Parallel Download
            audio_result = await self._download_with_fallback(track_info, loader)
            
            if not audio_result or not audio_result.is_success:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Download Failed",
                        "Failed to download audio from all sources"
                    )
                )
                return
            
            # Stage 3: Process Metadata (parallel: artwork + lyrics)
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Processing",
                    "Fetching artwork and lyrics..."
                )
            )
            
            # Single track: Always use Apple Music artwork (highest quality)
            metadata = await self.metadata_processor.process(
                track_info,
                audio_result,
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=True,  # Single tracks always use Apple Music
                voice_channel_id=voice_channel.id  # Track which voice channel
            )
            
            # Stage 4: Check if already connected
            voice_connection = self.bot.voice_manager.connections.get(interaction.guild.id)
            
            # Check if bot is already connected and playing
            if voice_connection and voice_connection.is_connected() and voice_connection.is_playing():
                # Bot is already playing another song, add to queue
                queue_cog = self.bot.get_cog('QueueCommands')
                if queue_cog:
                    # Add to queue
                    position = queue_cog.add_to_queue(interaction.guild.id, metadata)
                    
                    # Delete loader
                    await loader.delete()
                    
                    # Show queued message with thumbnail
                    embed = EmbedBuilder.create_success(
                        "Added to Queue",
                        f"**{metadata.title}**\n*{metadata.artist}*\n\n"
                        f"📋 Position in queue: **#{position}**\n"
                        f"⏱️ Duration: **{TimeFormatter.format_seconds(metadata.duration)}**"
                    )
                    
                    # Add thumbnail if available
                    if metadata.artwork_url:
                        embed.set_thumbnail(url=metadata.artwork_url)
                    
                    # Send as follow-up message
                    await interaction.followup.send(embed=embed, ephemeral=False)
                    
                    # Update voice channel status to show queued track
                    try:
                        if voice_connection and voice_connection.connection.channel:
                            status = f"📋 Queue +{position}: {metadata.title[:25]} - {metadata.artist[:15]}"
                            await voice_connection.connection.channel.edit(status=status[:80])
                    except Exception:
                        pass  # Ignore status update errors
                    
                    logger.info(f"✓ Added to queue: {metadata.title} (position #{position})")
                    return
            
            # Bot not playing OR not connected - need to connect/play
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Connecting",
                    "Connecting to voice channel..."
                )
            )
            
            # If already connected but not playing, reuse connection
            if voice_connection and voice_connection.is_connected():
                logger.info("✓ Reusing existing voice connection")
            else:
                # Need to create new connection
                voice_connection = RobustVoiceConnection()
                await voice_connection.connect(voice_channel)
                
                # Store connection in voice manager
                self.bot.voice_manager.connections[interaction.guild.id] = voice_connection
            
            # Stage 5: Delete loading and old player message
            await loader.delete()
            
            # Delete old player message if exists (keep chat clean)
            if hasattr(self.bot, 'player_messages'):
                old_player_msg = self.bot.player_messages.get(interaction.guild.id)
                if old_player_msg:
                    try:
                        await old_player_msg.delete()
                        logger.debug("Deleted old player message")
                    except Exception as e:
                        logger.debug(f"Could not delete old player message: {e}")
            else:
                # Initialize player_messages dict if not exists
                self.bot.player_messages = {}
            
            # CRITICAL: Wait for audio buffer ready
            await asyncio.sleep(1)
            
            # Create menu view for controls
            view = MediaPlayerView(self.bot, interaction.guild.id, timeout=None)
            
            # Send NEW player message with menu (fresh at bottom of chat)
            player_msg = await interaction.channel.send(
                embed=EmbedBuilder.create_now_playing(
                    metadata=metadata,
                    progress_bar="",
                    lyrics_lines=["", "", ""],
                    guild_id=interaction.guild.id
                ),
                view=view
            )
            
            # Store player message for future deletion
            self.bot.player_messages[interaction.guild.id] = player_msg
            
            # Stage 6: Get volume setting for guild
            volume = 1.0
            volume_cog = self.bot.get_cog('VolumeCommands')
            if volume_cog:
                volume_level = volume_cog.get_volume(interaction.guild.id)
                volume = volume_level / 100.0
            
            # Start synchronized playback with volume
            player = SynchronizedMediaPlayer(
                voice_connection.connection,
                player_msg,
                metadata,
                bot=self.bot,
                guild_id=interaction.guild.id
            )
            
            # Store player reference for control commands to access
            if not hasattr(self.bot, 'players'):
                self.bot.players = {}
            self.bot.players[interaction.guild.id] = player
            
            # Set voice channel status
            try:
                status_text = f"🎵 NOW PLAYING: {metadata.title[:30]} - {metadata.artist[:20]}"
                await voice_channel.edit(status=status_text)
                logger.debug(f"Set voice channel status: {status_text}")
            except Exception as e:
                logger.debug(f"Could not set voice channel status: {e}")
            
            await player.start(volume=volume)
            
            logger.info(f"✓ Now playing: {metadata.title}")
        
        except Exception as e:
            logger.error(f"Play command failed: {e}", exc_info=True)
            
            # Try to delete loader if it exists
            try:
                if 'loader' in locals():
                    await loader.delete()
            except Exception as cleanup_error:
                logger.debug(f"Could not delete loader: {cleanup_error}")
            
            # Send error message
            try:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_error(
                        "Error",
                        f"An error occurred: {str(e)[:200]}"
                    ),
                    ephemeral=True
                )
            except discord.NotFound:
                # Interaction expired, log only
                logger.error(f"Could not send error message - interaction expired")
            except Exception as send_error:
                logger.error(f"Failed to send error message: {send_error}")
    
    async def _detect_track(self, query: str) -> Optional[TrackInfo]:
        """
        Detect track from query
        
        Args:
            query: URL or search query
        
        Returns:
            TrackInfo if found, None otherwise
        """
        url_type = URLValidator.get_url_type(query)
        
        if url_type == 'spotify':
            # Search on Spotify
            return await self.spotify_downloader.search(query)
        
        elif url_type == 'youtube':
            # Search on YouTube
            return await self.youtube_downloader.search(query)
        
        else:
            # Generic search - try both sources with validation
            logger.info(f"Searching for: {query}")
            
            # Try Spotify first
            track_info = await self.spotify_downloader.search(query)
            
            # Validate result matches query
            if track_info:
                # Check if result is relevant to query
                query_lower = query.lower()
                title_lower = track_info.title.lower()
                artist_lower = track_info.artist.lower()
                
                # Check if query words are in title or artist
                query_words = query_lower.split()
                found_words = sum(1 for word in query_words if word in title_lower or word in artist_lower)
                relevance = found_words / len(query_words) if query_words else 0
                
                if relevance >= 0.5:  # At least 50% match
                    logger.info(f"Found on Spotify: {track_info.title} - {track_info.artist} (relevance: {relevance:.0%})")
                    return track_info
                else:
                    logger.warning(f"Spotify result not relevant ({relevance:.0%}): {track_info.title} - {track_info.artist}")
                    logger.warning(f"Trying YouTube instead...")
            else:
                logger.warning(f"Not found on Spotify, trying YouTube...")
            
            # Fallback to YouTube with better error handling
            try:
                track_info = await self.youtube_downloader.search(query)
                if track_info:
                    logger.info(f"Found on YouTube: {track_info.title} - {track_info.artist}")
                    return track_info
            except Exception as e:
                logger.error(f"YouTube search failed: {e}")
            
            logger.error(f"No results found for: {query}")
            return None
    
    async def _safe_loader_update(self, loader: Optional[SafeLoadingManager], *args, **kwargs):
        """Safely update loader only if it exists (handles None for auto-play from queue)"""
        if loader:
            await loader.update(*args, **kwargs)
    
    async def _download_with_fallback(
        self,
        track_info: TrackInfo,
        loader: Optional[SafeLoadingManager]
    ) -> Optional[AudioResult]:
        """
        Download dengan cache check dan 3-tier fallback system
        
        Flow:
        1. Check if track needs enrichment (Apple Music just-in-time)
        2. Check cache (downloads folder) first
        3. If found: Return immediately (no download needed!)
        4. If not found: Download from Spotify → YouTube Music fallback
        
        Args:
            track_info: Track information
            loader: Loading manager for updates
        
        Returns:
            AudioResult or None if all failed
        """
        # STEP 0: Just-in-Time Enrichment for Apple Music tracks
        if hasattr(track_info, '_apple_music_data'):
            logger.info(f"🔄 Just-in-time enrichment for Apple Music track: {track_info.title}")
            
            # Check database first to see if we've downloaded this before
            db_manager = self.bot.db_manager if hasattr(self.bot, 'db_manager') else None
            if db_manager:
                existing_track = await db_manager.find_track_in_history(track_info.title)
                if existing_track:
                    logger.info(f"📋 Found in database: {existing_track['title']} - {existing_track['artist']}")
                    # Use artist from database (correct from previous download)
                    track_info.artist = existing_track['artist']
                    track_info.album = existing_track.get('album', '')
                    track_info.duration = existing_track.get('duration', 0)
                    logger.info(f"✅ Using database metadata (artist: {track_info.artist})")
                    # Skip YouTube Music search, we already have correct info
                else:
                    # Not in database, do enrichment
                    await self._safe_loader_update(loader, 
                        embed=EmbedBuilder.create_loading(
                            "Searching",
                            f"🔍 Finding on YouTube Music...\n**{track_info.title}**"
                        )
                    )
                    
                    # Enrich track with YouTube Music metadata
                    from services.audio.apple_music_handler import get_apple_music_handler
                    am_handler = get_apple_music_handler()
                    
                    enriched_data = await am_handler.enrich_single_track(track_info._apple_music_data)
                    
                    # Update TrackInfo with enriched data
                    if enriched_data.get('artist'):
                        track_info.artist = enriched_data['artist']
                    if enriched_data.get('album'):
                        track_info.album = enriched_data['album']
                    if enriched_data.get('duration'):
                        track_info.duration = enriched_data['duration']
                    
                    logger.info(f"✅ Enriched: {track_info.title} - {track_info.artist}")
            else:
                # No database, do normal enrichment
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Searching",
                        f"🔍 Finding on YouTube Music...\n**{track_info.title}**"
                    )
                )
                
                # Enrich track with YouTube Music metadata
                from services.audio.apple_music_handler import get_apple_music_handler
                am_handler = get_apple_music_handler()
                
                enriched_data = await am_handler.enrich_single_track(track_info._apple_music_data)
                
                # Update TrackInfo with enriched data
                if enriched_data.get('artist'):
                    track_info.artist = enriched_data['artist']
                if enriched_data.get('album'):
                    track_info.album = enriched_data['album']
                if enriched_data.get('duration'):
                    track_info.duration = enriched_data['duration']
                
                logger.info(f"✅ Enriched: {track_info.title} - {track_info.artist}")
        
        # TIER 0: Check Cache First (FASTEST!)
        logger.debug(f"Checking cache for: {track_info.artist} - {track_info.title}")
        cached_file = self.spotify_downloader.check_cache(track_info)
        if not cached_file:
            # Also check YouTube cache
            cached_file = self.youtube_downloader.check_cache(track_info)
        
        if cached_file:
            logger.info(f"🚀 Using cached file: {cached_file.name}")
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Loading from Cache",
                    f"✓ Found in cache\n⚡ Loading instantly..."
                )
            )
            
            # Create AudioResult from cached file
            result = AudioResult(
                file_path=cached_file,
                title=track_info.title,
                artist=track_info.artist,
                duration=track_info.duration,
                source="Cache",  # Indicate it's from cache
                bitrate=256,  # Default assumption
                format='opus',
                sample_rate=48000
            )
            
            return result
        
        # Not in cache, proceed with download
        errors = []
        
        # Tier 1: Spotify
        try:
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Downloading",
                    f"Source: Spotify\n⏳ Downloading audio..."
                )
            )
            
            result = await self.spotify_downloader.download(track_info)
            result.source = "Spotify"
            logger.info(f"✓ Downloaded from Spotify: {result.title}")
            return result
        
        except Exception as e:
            errors.append({"source": "Spotify", "error": str(e)})
            logger.warning(f"Spotify download failed: {e}")
        
        # Tier 2: YouTube Music
        try:
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Downloading",
                    f"Source: YouTube Music (fallback)\n⏳ Downloading audio..."
                )
            )
            
            result = await self.youtube_downloader.download(track_info)
            result.source = "YouTube Music"
            logger.info(f"✓ Downloaded from YouTube Music (fallback): {result.title}")
            return result
        
        except Exception as e:
            errors.append({"source": "YouTube Music", "error": str(e)})
            logger.warning(f"YouTube Music download failed: {e}")
        
        # All failed
        raise DownloadError("All sources failed", details=errors)
    
    async def _handle_playlist(
        self,
        interaction: discord.Interaction,
        url: str,
        loader: SafeLoadingManager,
        voice_channel: discord.VoiceChannel
    ) -> None:
        """
        Handle playlist/album URLs with progressive loading for Spotify
        
        Args:
            interaction: Discord interaction
            url: Playlist/album URL
            loader: Loading manager
            voice_channel: Voice channel to connect to
        """
        try:
            url_type = URLValidator.get_url_type(url)
            guild_id = interaction.guild.id
            
            # Get queue manager early
            queue_cog = self.bot.get_cog('QueueCommands')
            if not queue_cog:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Queue Not Available",
                        "Queue system is not initialized"
                    )
                )
                return
            
            if guild_id not in queue_cog.queues:
                queue_cog.queues[guild_id] = []
            
            # CRITICAL: Check if bot is already playing
            voice_connection = self.bot.voice_manager.connections.get(guild_id)
            is_already_playing = (
                voice_connection and 
                voice_connection.is_connected() and 
                voice_connection.is_playing()
            )
            
            if is_already_playing:
                logger.info(f"Bot is already playing, will queue all tracks from new playlist")
            
            # SPOTIFY: Use progressive loading for faster playback
            if url_type == 'spotify':
                await self._handle_spotify_playlist_progressive(
                    interaction, url, loader, voice_channel, queue_cog,
                    is_already_playing=is_already_playing
                )
                return
            
            # YOUTUBE: Use progressive loading (like Spotify)
            if url_type in ['youtube', 'youtube_music']:
                await self._handle_youtube_playlist_progressive(
                    interaction, url, loader, voice_channel, queue_cog,
                    is_already_playing=is_already_playing
                )
                return
            
            # OTHER SOURCES (Apple Music): Use standard loading
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Processing Playlist",
                    "Fetching track list..."
                )
            )
            
            tracks = await self.playlist_processor.process_url(url)
            
            if not tracks:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Playlist Empty",
                        "Could not find any tracks in the playlist"
                    )
                )
                return
            
            # Apple Music playlist warning
            if url_type == 'apple_music' and 'playlist' in url.lower() and len(tracks) == 1:
                await interaction.channel.send(
                    embed=EmbedBuilder.create_warning(
                        "⚠️ Apple Music Playlist Limitation",
                        "**Only 1 track fetched** due to spotdl limitations.\n\n"
                        "💡 **For full playlist support, use:**\n"
                        "• **Spotify playlist** URL\n"
                        "• **YouTube playlist** URL\n\n"
                        "Playing the 1 track that was found..."
                    ),
                    delete_after=15
                )
            
            # Limit and process remaining tracks using standard method
            max_tracks = 200
            if len(tracks) > max_tracks:
                tracks = tracks[:max_tracks]
            
            await self._play_first_and_queue_rest(
                interaction, tracks, loader, voice_channel, queue_cog, guild_id, url_type,
                is_already_playing=is_already_playing
            )
        
        except Exception as e:
            logger.error(f"Failed to handle playlist: {e}", exc_info=True)
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_error(
                    "Playlist Error",
                    f"An error occurred: {str(e)}"
                )
            )
    
    async def _handle_spotify_playlist_progressive(
        self,
        interaction: discord.Interaction,
        url: str,
        loader: SafeLoadingManager,
        voice_channel: discord.VoiceChannel,
        queue_cog,
        is_already_playing: bool = False
    ) -> None:
        """
        Handle Spotify playlist with progressive loading
        
        If is_already_playing=False: First track plays IMMEDIATELY, rest queued
        If is_already_playing=True: ALL tracks queued (no playback interruption)
        """
        guild_id = interaction.guild.id
        first_track_played = is_already_playing  # Skip first track playback if already playing
        tracks_queued = 0
        
        async def on_first_track(track: TrackInfo):
            """Called when first track is ready - play immediately"""
            nonlocal first_track_played
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Downloading First Track",
                    f"**{track.title}** - *{track.artist}*"
                )
            )
            
            # Download first track
            audio_result = await self._download_with_fallback(track, loader)
            
            if not audio_result or not audio_result.is_success:
                logger.error("Failed to download first track")
                return
            
            # Process metadata
            metadata = await self.metadata_processor.process(
                track,
                audio_result,
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=False,  # Spotify has good artwork
                voice_channel_id=voice_channel.id
            )
            
            # Connect to voice
            voice_connection = RobustVoiceConnection()
            await voice_connection.connect(voice_channel)
            self.bot.voice_manager.connections[guild_id] = voice_connection
            
            # Delete loader
            await loader.delete()
            
            # Delete old player message
            if hasattr(self.bot, 'player_messages'):
                old_msg = self.bot.player_messages.get(guild_id)
                if old_msg:
                    try:
                        await old_msg.delete()
                    except Exception:
                        pass
            else:
                self.bot.player_messages = {}
            
            await asyncio.sleep(0.5)
            
            # Create and send player
            view = MediaPlayerView(self.bot, guild_id, timeout=None)
            player_msg = await interaction.channel.send(
                embed=EmbedBuilder.create_now_playing(
                    metadata=metadata,
                    progress_bar="",
                    lyrics_lines=["", "", ""],
                    guild_id=guild_id
                ),
                view=view
            )
            self.bot.player_messages[guild_id] = player_msg
            
            # Get volume
            volume = 1.0
            volume_cog = self.bot.get_cog('VolumeCommands')
            if volume_cog:
                volume = volume_cog.get_volume(guild_id) / 100.0
            
            # Start playback
            player = SynchronizedMediaPlayer(
                voice_connection.connection,
                player_msg,
                metadata,
                bot=self.bot,
                guild_id=guild_id
            )
            
            if not hasattr(self.bot, 'players'):
                self.bot.players = {}
            self.bot.players[guild_id] = player
            
            await player.start(volume=volume)
            first_track_played = True
            
            logger.info(f"🎵 First track playing: {track.title}")
        
        async def on_track_ready(track: TrackInfo):
            """Called for each subsequent track - add to queue"""
            nonlocal tracks_queued
            
            # Store voice channel ID for the track
            track.voice_channel_id = voice_channel.id
            
            # Add to queue (raw TrackInfo - will be processed when played)
            queue_cog.queues[guild_id].append(track)
            tracks_queued += 1
            
            logger.debug(f"📋 Queued: {track.title} (#{tracks_queued})")
        
        async def on_progress(current: int, total: int, message: str):
            """Progress callback - update loading message only before first track"""
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        f"Loading Playlist ({current}/{total})",
                        message
                    )
                )
        
        # Start progressive loading
        await self._safe_loader_update(loader, 
            embed=EmbedBuilder.create_loading(
                "🎵 Loading Spotify Playlist",
                "Using progressive loading for faster playback..."
            )
        )
        
        try:
            total = await self.playlist_processor.process_spotify_playlist_progressive(
                url=url,
                on_first_track=on_first_track,
                on_track_ready=on_track_ready,
                on_progress=on_progress
            )
            
            if total > 0 and tracks_queued > 0:
                # Send confirmation after loading completes
                if is_already_playing:
                    # All tracks queued (didn't play first one)
                    await loader.delete()
                    await interaction.channel.send(
                        embed=EmbedBuilder.create_success(
                            "✅ Playlist Added to Queue",
                            f"📋 **{tracks_queued}** tracks added to queue\n\n"
                            f"💡 Current playback continues, playlist queued!"
                        ),
                        delete_after=15
                    )
                else:
                    # First track playing, rest queued
                    await interaction.channel.send(
                        embed=EmbedBuilder.create_success(
                            "✅ Playlist Loaded",
                            f"🎵 Now playing first track\n"
                            f"📋 **{tracks_queued}** tracks added to queue\n\n"
                            f"💡 Tracks loaded progressively for faster playback!"
                        ),
                        delete_after=15
                    )
            
            logger.info(f"✅ Progressive playlist complete: {total} tracks")
        
        except ValueError as e:
            # Private/algorithmic playlist error - show full message
            logger.warning(f"Playlist access error: {e}")
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Playlist Tidak Dapat Diakses",
                        str(e)  # Show full error message
                    )
                )
        
        except Exception as e:
            logger.error(f"Progressive playlist failed: {e}", exc_info=True)
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Playlist Error",
                        f"Failed to load playlist: {str(e)[:100]}"
                    )
                )
    
    async def _handle_youtube_playlist_progressive(
        self,
        interaction: discord.Interaction,
        url: str,
        loader: SafeLoadingManager,
        voice_channel: discord.VoiceChannel,
        queue_cog,
        is_already_playing: bool = False
    ) -> None:
        """
        Handle YouTube playlist with progressive loading
        
        If is_already_playing=False: First track plays IMMEDIATELY, rest queued
        If is_already_playing=True: ALL tracks queued (no playback interruption)
        """
        guild_id = interaction.guild.id
        first_track_played = is_already_playing  # Skip first track playback if already playing
        tracks_queued = 0
        
        async def on_first_track(track: TrackInfo):
            """Called when first track is ready - play immediately"""
            nonlocal first_track_played
            
            if is_already_playing:
                # Bot already playing, queue this track too
                track.voice_channel_id = voice_channel.id
                queue_cog.queues[guild_id].append(track)
                return
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Downloading First Track",
                    f"**{track.title}** - *{track.artist}*"
                )
            )
            
            # Download first track
            audio_result = await self._download_with_fallback(track, loader)
            
            if not audio_result or not audio_result.is_success:
                logger.error("Failed to download first YouTube track")
                return
            
            # Process metadata
            metadata = await self.metadata_processor.process(
                track,
                audio_result,
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=True,  # Get Apple Music artwork for YouTube
                voice_channel_id=voice_channel.id
            )
            
            # Connect to voice
            voice_connection = RobustVoiceConnection()
            await voice_connection.connect(voice_channel)
            self.bot.voice_manager.connections[guild_id] = voice_connection
            
            # Delete loader
            await loader.delete()
            
            # Delete old player message
            if hasattr(self.bot, 'player_messages'):
                old_msg = self.bot.player_messages.get(guild_id)
                if old_msg:
                    try:
                        await old_msg.delete()
                    except Exception:
                        pass
            else:
                self.bot.player_messages = {}
            
            await asyncio.sleep(0.5)
            
            # Create and send player
            view = MediaPlayerView(self.bot, guild_id, timeout=None)
            player_msg = await interaction.channel.send(
                embed=EmbedBuilder.create_now_playing(
                    metadata=metadata,
                    progress_bar="",
                    lyrics_lines=["", "", ""],
                    guild_id=guild_id
                ),
                view=view
            )
            self.bot.player_messages[guild_id] = player_msg
            
            # Get volume
            volume = 1.0
            volume_cog = self.bot.get_cog('VolumeCommands')
            if volume_cog:
                volume = volume_cog.get_volume(guild_id) / 100.0
            
            # Start playback
            player = SynchronizedMediaPlayer(
                voice_connection.connection,
                player_msg,
                metadata,
                bot=self.bot,
                guild_id=guild_id
            )
            
            if not hasattr(self.bot, 'players'):
                self.bot.players = {}
            self.bot.players[guild_id] = player
            
            await player.start(volume=volume)
            first_track_played = True
            
            logger.info(f"🎵 First YouTube track playing: {track.title}")
        
        async def on_track_ready(track: TrackInfo):
            """Called for each subsequent track - add to queue"""
            nonlocal tracks_queued
            
            # Store voice channel ID for the track
            track.voice_channel_id = voice_channel.id
            
            # Add to queue (raw TrackInfo - will be processed when played)
            queue_cog.queues[guild_id].append(track)
            tracks_queued += 1
            
            logger.debug(f"📋 Queued: {track.title} (#{tracks_queued})")
        
        async def on_progress(current: int, total: int, message: str):
            """Progress callback - update loading message only before first track"""
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        f"Loading YouTube Playlist ({current}/{total})",
                        message
                    )
                )
        
        # Start progressive loading
        await self._safe_loader_update(loader, 
            embed=EmbedBuilder.create_loading(
                "🎵 Loading YouTube Playlist",
                "Using progressive loading for faster playback..."
            )
        )
        
        try:
            total = await self.playlist_processor.process_youtube_playlist_progressive(
                url=url,
                on_first_track=on_first_track,
                on_track_ready=on_track_ready,
                on_progress=on_progress
            )
            
            if total > 0 and tracks_queued > 0:
                # Send confirmation after loading completes
                if is_already_playing:
                    # All tracks queued (didn't play first one)
                    await loader.delete()
                    await interaction.channel.send(
                        embed=EmbedBuilder.create_success(
                            "✅ YouTube Playlist Added to Queue",
                            f"📋 **{tracks_queued + 1}** tracks added to queue\n\n"
                            f"💡 Current playback continues, playlist queued!"
                        ),
                        delete_after=15
                    )
                else:
                    # First track playing, rest queued
                    await interaction.channel.send(
                        embed=EmbedBuilder.create_success(
                            "✅ YouTube Playlist Loaded",
                            f"🎵 Now playing first track\n"
                            f"📋 **{tracks_queued}** tracks added to queue\n\n"
                            f"💡 Progressive loading complete!"
                        ),
                        delete_after=15
                    )
            
            logger.info(f"✅ YouTube progressive playlist complete: {total} tracks")
        
        except ValueError as e:
            # Playlist access error
            logger.warning(f"YouTube playlist access error: {e}")
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "YouTube Playlist Error",
                        str(e)
                    )
                )
        
        except Exception as e:
            logger.error(f"YouTube progressive playlist failed: {e}", exc_info=True)
            if not first_track_played:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_error(
                        "Playlist Error",
                        f"Failed to load YouTube playlist: {str(e)[:100]}"
                    )
                )
    
    async def _play_first_and_queue_rest(
        self,
        interaction: discord.Interaction,
        tracks: list,
        loader: SafeLoadingManager,
        voice_channel: discord.VoiceChannel,
        queue_cog,
        guild_id: int,
        url_type: str,
        is_already_playing: bool = False
    ) -> None:
        """
        Standard playlist handling
        
        If is_already_playing=False: play first track, queue rest
        If is_already_playing=True: queue ALL tracks (no playback interruption)
        """
        
        # CASE 1: Bot already playing - queue ALL tracks without playing
        if is_already_playing:
            await loader.delete()
            
            # Add ALL tracks to queue
            for track in tracks:
                track.voice_channel_id = voice_channel.id
                queue_cog.queues[guild_id].append(track)
            
            await interaction.channel.send(
                embed=EmbedBuilder.create_success(
                    "✅ Playlist Added to Queue",
                    f"📋 **{len(tracks)}** tracks added to queue\n\n"
                    f"💡 Current playback continues, playlist queued!"
                ),
                delete_after=15
            )
            
            logger.info(f"✓ Playlist queued (bot already playing): {len(tracks)} tracks")
            return
        
        # CASE 2: Bot not playing - play first track, queue rest
        first_track = tracks[0]
        remaining_tracks = tracks[1:]
        
        await self._safe_loader_update(loader, 
            embed=EmbedBuilder.create_loading(
                "Downloading First Track",
                f"**{first_track.title}** - *{first_track.artist}*"
            )
        )
        
        # Download first track
        audio_result = await self._download_with_fallback(first_track, loader)
        
        if not audio_result or not audio_result.is_success:
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_error(
                    "Download Failed",
                    "Failed to download first track"
                )
            )
            return
        
        # Process metadata
        prefer_apple = (url_type == 'youtube')
        metadata = await self.metadata_processor.process(
            first_track,
            audio_result,
            requested_by=interaction.user.display_name,
            requested_by_id=interaction.user.id,
            prefer_apple_artwork=prefer_apple,
            voice_channel_id=voice_channel.id
        )
        
        # Connect to voice
        voice_connection = RobustVoiceConnection()
        await voice_connection.connect(voice_channel)
        self.bot.voice_manager.connections[guild_id] = voice_connection
        
        # Delete loader and old player
        await loader.delete()
        
        if hasattr(self.bot, 'player_messages'):
            old_msg = self.bot.player_messages.get(guild_id)
            if old_msg:
                try:
                    await old_msg.delete()
                except Exception:
                    pass
        else:
            self.bot.player_messages = {}
        
        await asyncio.sleep(1)
        
        # Create player
        view = MediaPlayerView(self.bot, guild_id, timeout=None)
        player_msg = await interaction.channel.send(
            embed=EmbedBuilder.create_now_playing(
                metadata=metadata,
                progress_bar="",
                lyrics_lines=["", "", ""],
                guild_id=guild_id
            ),
            view=view
        )
        self.bot.player_messages[guild_id] = player_msg
        
        # Get volume
        volume = 1.0
        volume_cog = self.bot.get_cog('VolumeCommands')
        if volume_cog:
            volume = volume_cog.get_volume(guild_id) / 100.0
        
        # Start playback
        player = SynchronizedMediaPlayer(
            voice_connection.connection,
            player_msg,
            metadata,
            bot=self.bot,
            guild_id=guild_id
        )
        
        if not hasattr(self.bot, 'players'):
            self.bot.players = {}
        self.bot.players[guild_id] = player
        
        await player.start(volume=volume)
        
        logger.info(f"✓ Now playing: {metadata.title}")
        
        # Add remaining to queue
        for track in remaining_tracks:
            track.voice_channel_id = voice_channel.id
            queue_cog.queues[guild_id].append(track)
        
        if remaining_tracks:
            await interaction.channel.send(
                embed=EmbedBuilder.create_success(
                    "Playlist Added",
                    f"✓ Now playing: **{metadata.title}**\n"
                    f"📋 Added **{len(remaining_tracks)}** more tracks to queue"
                ),
                delete_after=10
            )
        
        logger.info(f"✓ Playlist complete: {len(tracks)} tracks")


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(PlayCommand(bot))
