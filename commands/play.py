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
            
            # Proactive permission check - warn if missing critical permissions
            try:
                from utils.permission_monitor import get_permission_monitor
                monitor = get_permission_monitor(self.bot)
                warning = await monitor.on_command_check(interaction.guild)
                if warning:
                    # Send warning but continue
                    await interaction.followup.send(warning, ephemeral=True)
            except Exception as e:
                logger.debug(f"Permission check failed: {e}")
            
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
            
            # ========================================
            # SINGLE TRACK: SMART CACHE FLOW
            # Priority: Local Cache → Rclone Cache → Stream + Background Download
            # ========================================
            stream_url = None
            audio_result = None
            use_streaming = False
            cached = False
            
            # STEP 0: Check LOCAL Cache first (fastest!)
            try:
                from services.audio.cache import get_cache_manager
                from utils.track_verifier import TrackVerifier
                
                cache_mgr = get_cache_manager(Settings.DOWNLOADS_DIR)
                local_cached = cache_mgr.is_file_cached(track_info.artist, track_info.title)
                
                if local_cached and local_cached.exists():
                    logger.info(f"Found in LOCAL cache: {local_cached.name}")
                    
                    # CRITICAL: Verify the cached file is not a remix/DJ version
                    is_unwanted, unwanted_reason = TrackVerifier.is_unwanted_version(
                        track_info.title, 
                        local_cached.stem  # Check filename
                    )
                    
                    if is_unwanted:
                        # Wrong version! Delete and re-download
                        logger.warning(f"LOCAL cache has wrong version: {unwanted_reason}")
                        logger.warning(f"Deleting bad cache file: {local_cached.name}")
                        try:
                            local_cached.unlink()
                        except Exception as del_err:
                            logger.debug(f"Could not delete bad cache: {del_err}")
                        # Don't set cached=True, continue to streaming/download
                    else:
                        # File is valid
                        cached = True
                        cache_mgr.touch_file(local_cached)
                        
                        from database.models import AudioResult as AR
                        from config.constants import AudioSource
                        audio_result = AR(
                            file_path=local_cached,
                            title=track_info.title,
                            artist=track_info.artist,
                            duration=track_info.duration,
                            source=AudioSource.YOUTUBE_MUSIC,
                            bitrate=256,
                            format=local_cached.suffix.lstrip('.'),
                            sample_rate=48000
                        )
                        logger.info(f"Using LOCAL cache (verified): {local_cached.name}")
            except Exception as e:
                logger.debug(f"Local cache check failed: {e}")
            
            # STEP 1: Check Cloud/Rclone Cache (if not found locally) - SILENT CHECK
            if not cached:
                try:
                    from services.storage import get_cloud_cache
                    cloud_cache = get_cloud_cache()
                    
                    if cloud_cache.is_enabled:
                        # Silent check - no UI message for cloud cache check
                        if await cloud_cache.exists(track_info.artist, track_info.title):
                            logger.info(f"Found in cloud cache: {track_info.title}")
                            cached = True
                            
                            # Download from cloud cache
                            await loader.spinner_update(
                                "Loading from Cache",
                                f"**{track_info.title}** - *{track_info.artist}*\n\n"
                                f"Downloading from cloud cache..."
                            )
                            
                            cache_path = self.youtube_downloader.download_dir / f"{track_info.artist}_{track_info.title}_cached.opus"
                            if await cloud_cache.download(track_info.artist, track_info.title, cache_path):
                                from database.models import AudioResult as AR
                                from config.constants import AudioSource
                                audio_result = AR(
                                    file_path=cache_path,
                                    title=track_info.title,
                                    artist=track_info.artist,
                                    duration=track_info.duration,
                                    source=AudioSource.YOUTUBE_MUSIC,
                                    bitrate=256,
                                    format='opus',
                                    sample_rate=48000
                                )
                                logger.info(f"Loaded from cloud cache: {cache_path.name}")
                except Exception as e:
                    logger.warning(f"Cloud cache check failed: {e}")
            
            # STEP 2: If not cached, stream + background download
            # Skip streaming if DISABLE_STREAMING=true (server mode)
            if not cached and not Settings.DISABLE_STREAMING:
                await loader.start_spinner(
                    "Preparing Stream",
                    f"**{track_info.title}** - *{track_info.artist}*\n\n"
                    f"Finding audio source..."
                )
                
                try:
                    stream_url = await self.youtube_downloader.get_stream_url(track_info)
                    if stream_url:
                        use_streaming = True
                        logger.info(f"Got stream URL, measuring network speed...")
                        
                        # Adaptive buffer based on network speed
                        from services.audio.adaptive_buffer import get_adaptive_buffer
                        adaptive = get_adaptive_buffer()
                        network_speed = await adaptive.measure_stream_speed(stream_url)
                        buffer_time = network_speed.buffer_recommended
                        
                        # Update spinner text (keeps animating)
                        await loader.update_spinner(
                            title="Buffering Audio",
                            details=f"**{track_info.title}** - *{track_info.artist}*\n\n"
                                    f"Buffering ({network_speed.quality}: {buffer_time:.0f}s)...\n"
                                    f"Speed: {network_speed.mbps:.1f} Mbps"
                        )
                        
                        # Wait for buffer (spinner keeps rotating during this!)
                        if buffer_time > 0:
                            await asyncio.sleep(buffer_time)
                        
                        # Stop spinner animation
                        await loader.stop_spinner()
                        
                        # Start background download for cache
                        asyncio.create_task(
                            self.youtube_downloader.background_download_for_cache(
                                track_info.artist, track_info.title
                            )
                        )
                        logger.info(f"Background: Started caching {track_info.title}")
                    else:
                        logger.info("No stream URL, falling back to download")
                except Exception as e:
                    logger.warning(f"Stream URL failed: {e}, falling back to download")
            elif Settings.DISABLE_STREAMING and not cached:
                logger.info(f"Streaming disabled (server mode), downloading first: {track_info.title}")
            
            
            # If streaming not available AND not from cache, download
            if not use_streaming and not audio_result:
                # Stage 2: Download with Verification (3x retry)
                MAX_DOWNLOAD_RETRIES = 3
                last_error = None
                
                for attempt in range(1, MAX_DOWNLOAD_RETRIES + 1):
                    try:
                        await loader.spinner_update(
                            f"Downloading ({attempt}/{MAX_DOWNLOAD_RETRIES})",
                            f"**{track_info.title}** - *{track_info.artist}*\n\n"
                            f"Downloading and verifying audio..."
                        )
                        
                        audio_result = await self._download_with_fallback(track_info, loader)
                        
                        if audio_result and audio_result.is_success:
                            logger.info(f"✓ Download & verification success (attempt {attempt})")
                            break  # Success, exit retry loop
                        else:
                            last_error = "Download returned empty result"
                            logger.warning(f"Download attempt {attempt} failed: {last_error}")
                            
                    except Exception as e:
                        last_error = str(e)
                        logger.warning(f"Download attempt {attempt} error: {e}")
                        
                        if attempt < MAX_DOWNLOAD_RETRIES:
                            await loader.spinner_update(
                                f"Retry ({attempt}/{MAX_DOWNLOAD_RETRIES})",
                                f"Attempt {attempt} failed\n"
                                f"Retrying in 2 seconds..."
                            )
                            await asyncio.sleep(2)
                
                if not audio_result or not audio_result.is_success:
                    await self._safe_loader_update(loader, 
                        embed=EmbedBuilder.create_error(
                            "Download Failed",
                            f"Failed after {MAX_DOWNLOAD_RETRIES} attempts\n\n"
                            f"**Error:** {last_error or 'Unknown'}"
                        )
                    )
                    return
            
            # Stage 3: Process Metadata (parallel: artwork + lyrics)
            await loader.spinner_update(
                "Processing",
                "Fetching artwork and lyrics..."
            )
            
            # Single track: Always use Apple Music artwork (highest quality)
            # For streaming mode, audio_result may be None
            metadata = await self.metadata_processor.process(
                track_info,
                audio_result,  # Can be None for streaming mode
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=True,  # Single tracks always use Apple Music
                voice_channel_id=voice_channel.id  # Track which voice channel
            )
            
            # Store stream_url in metadata for streaming mode
            if use_streaming and stream_url:
                metadata.stream_url = stream_url
                logger.info(f"Metadata prepared for streaming: {metadata.title}")
            
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
                if use_streaming:
                    status_text = f"🌐 STREAMING: {metadata.title[:30]} - {metadata.artist[:20]}"
                else:
                    status_text = f"🎵 NOW PLAYING: {metadata.title[:30]} - {metadata.artist[:20]}"
                await voice_channel.edit(status=status_text)
                logger.debug(f"Set voice channel status: {status_text}")
            except Exception as e:
                logger.debug(f"Could not set voice channel status: {e}")
            
            # Start playback - streaming or file-based
            if use_streaming and stream_url:
                await player.start_from_stream(stream_url, volume=volume)
                logger.info(f"🌐 Streaming: {metadata.title}")
            else:
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
    
    async def _process_track_with_retry(
        self,
        track_info: TrackInfo,
        loader: Optional[SafeLoadingManager] = None,
        max_retries: int = 3
    ) -> tuple:
        """
        Process track with verification and retry logic.
        
        Flow:
        1. Check cache with verification
        2. Download with fallback chain (MusicDL → yt-dlp)
        3. Verify audio matches expected track
        4. Retry up to max_retries on failure
        5. Return (None, skip_reason) to skip track after all retries fail
        
        Args:
            track_info: Track to process
            loader: Optional loading manager for UI updates
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            Tuple of (AudioResult, skip_reason)
            - If success: (AudioResult, None)
            - If skip: (None, "reason for skip")
        """
        last_error = None
        
        for attempt in range(1, max_retries + 1):
            try:
                # Update UI
                await self._safe_loader_update(loader,
                    embed=EmbedBuilder.create_loading(
                        f"Processing ({attempt}/{max_retries})",
                        f"**{track_info.title}** - *{track_info.artist}*\n\n"
                        f"🔄 {'Mengunduh' if attempt == 1 else 'Mencoba ulang'}..."
                    )
                )
                
                # Try download with verification
                audio_result = await self._download_with_fallback(track_info, loader)
                
                if audio_result and audio_result.is_success:
                    logger.info(f"✓ Track ready (attempt {attempt}): {track_info.title}")
                    return (audio_result, None)  # Success!
                else:
                    last_error = "Download returned empty result"
                    logger.warning(f"Attempt {attempt} failed: {last_error}")
                    
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt} error: {e}")
                
                # Don't retry on certain errors
                if "File terlalu besar" in str(e):
                    return (None, f"File terlalu besar (> 100MB)")
                
                if attempt < max_retries:
                    await self._safe_loader_update(loader,
                        embed=EmbedBuilder.create_loading(
                            f"Retry ({attempt}/{max_retries})",
                            f"⚠️ Percobaan {attempt} gagal\n"
                            f"🔄 Mencoba ulang dalam 2 detik..."
                        )
                    )
                    await asyncio.sleep(2)
        
        # All retries failed - skip this track
        skip_reason = f"Gagal setelah {max_retries}x percobaan: {last_error[:50] if last_error else 'Unknown'}"
        logger.warning(f"Skipping track: {track_info.title} - {skip_reason}")
        
        return (None, skip_reason)
    
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
                    f"✓ Found in cache\n🔍 Memverifikasi audio..."
                )
            )
            
            # VERIFY cached file matches expected track
            from utils.track_verifier import TrackVerifier
            verification = await TrackVerifier.verify_track(cached_file, track_info)
            
            if not verification.success:
                logger.warning(f"Cache verification failed: {verification.message}")
                # Remove bad cache, continue to download
                try:
                    cached_file.unlink()
                    logger.info(f"Removed mismatched cache: {cached_file}")
                except:
                    pass
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Cache Mismatch",
                        f"⚠️ File cache tidak cocok\n⬇️ Mengunduh ulang..."
                    )
                )
            else:
                logger.info(f"✓ Cache verified: {track_info.title} (confidence: {verification.confidence:.2f})")
                
                # Check if this cached file needs to be uploaded to FTP
                try:
                    from services.storage import get_cloud_cache
                    cloud_cache = get_cloud_cache()
                    if cloud_cache.is_enabled:
                        # Check if file exists in FTP
                        if not await cloud_cache.exists(track_info.artist, track_info.title):
                            async def _upload_cache_to_ftp():
                                try:
                                    success = await cloud_cache.upload(cached_file, track_info.artist, track_info.title)
                                    if success:
                                        logger.info(f"☁️ Local cache uploaded to FTP: {track_info.title}")
                                    else:
                                        logger.warning(f"⚠️ FTP upload from cache failed: {track_info.title}")
                                except Exception as e:
                                    logger.error(f"❌ FTP upload error: {e}")
                            
                            asyncio.create_task(_upload_cache_to_ftp())
                            logger.info(f"☁️ Syncing local cache to FTP: {track_info.title}")
                        else:
                            logger.debug(f"✓ Already in FTP cache: {track_info.title}")
                except Exception as e:
                    logger.debug(f"FTP cache check skipped: {e}")
                
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
        
        # ========================================
        # TIER 1: Cloud Cache (REMOTE CACHE) 
        # Check FTP first for previously downloaded tracks
        # ========================================
        try:
            from services.storage import get_cloud_cache
            cloud_cache = get_cloud_cache()
            
            if cloud_cache.is_enabled:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Checking Cloud Cache",
                        f"☁️ Checking FTP cache...\n**{track_info.title}**"
                    )
                )
                
                if await cloud_cache.exists(track_info.artist, track_info.title):
                    logger.info(f"☁️ Found in FTP cache: {track_info.title}")
                    
                    # Download from FTP
                    cache_path = await cloud_cache.download(track_info.artist, track_info.title)
                    
                    if cache_path and cache_path.exists():
                        result = AudioResult(
                            file_path=cache_path,
                            title=track_info.title,
                            artist=track_info.artist,
                            duration=track_info.duration,
                            source="Cloud Cache",
                            bitrate=256,
                            format='opus',
                            sample_rate=48000,
                            delete_after_play=True  # Clean up after playback
                        )
                        logger.info(f"☁️ Loaded from FTP cache: {cache_path.name}")
                        return result
        except Exception as e:
            logger.warning(f"FTP cache check failed: {e}")
        
        # ========================================
        # TIER 2: yt-dlp Direct Download (PRIMARY)
        # Download via yt-dlp, then upload to FTP
        # ========================================
        try:
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Downloading",
                    f"📥 Downloading via yt-dlp...\n**{track_info.title}**"
                )
            )
            
            # Force yt-dlp (skip MusicDL internally)
            result = await self.youtube_downloader._download_from_ytdlp(track_info)
            
            if result and result.file_path and result.file_path.exists():
                result.source = "YouTube Music"
                
                # Verify downloaded file
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Verifying",
                        f"✅ Memverifikasi audio...\n**{track_info.title}**"
                    )
                )
                from utils.track_verifier import TrackVerifier
                verification = await TrackVerifier.verify_track(result.file_path, track_info)
                
                if verification.success:
                    logger.info(f"✓ Downloaded & verified via yt-dlp: {result.title} (confidence: {verification.confidence:.2f})")
                    
                    # Upload to FTP cache in background
                    try:
                        from services.storage import get_cloud_cache
                        cloud_cache = get_cloud_cache()
                        if cloud_cache.is_enabled:
                            # Use wrapper to ensure logs are shown
                            async def _safe_ftp_upload():
                                try:
                                    success = await cloud_cache.upload(result.file_path, track_info.artist, track_info.title)
                                    if success:
                                        logger.info(f"☁️ FTP upload complete: {track_info.title}")
                                    else:
                                        logger.warning(f"⚠️ FTP upload returned False: {track_info.title}")
                                except Exception as upload_error:
                                    logger.error(f"❌ FTP upload error: {upload_error}")
                            
                            asyncio.create_task(_safe_ftp_upload())
                            logger.info(f"☁️ FTP upload started: {track_info.title}")
                        else:
                            logger.debug("FTP cache not enabled, skipping upload")
                    except Exception as e:
                        logger.warning(f"FTP upload setup failed: {e}")
                    
                    return result
                else:
                    logger.warning(f"yt-dlp verification failed: {verification.message}")
                    raise Exception(f"Verification failed: {verification.message}")
        
        except Exception as e:
            errors.append({"source": "yt-dlp", "error": str(e)})
            logger.warning(f"yt-dlp download failed: {e}")
        
        # ========================================
        # TIER 3: MusicDL (LAST RESORT)
        # Only if yt-dlp fails, try MusicDL
        # ========================================
        try:
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "Trying Alternative",
                    f"🎵 Trying MusicDL...\n**{track_info.title}**"
                )
            )
            
            from services.audio.musicdl_handler import get_musicdl_handler
            musicdl = get_musicdl_handler()
            
            if musicdl.is_available:
                query = f"{track_info.artist} - {track_info.title}"
                song_info = await musicdl.search_best_quality(query)
                
                if song_info:
                    # Download
                    downloaded_file = await musicdl.download(song_info, self.youtube_downloader.download_dir)
                    
                    if downloaded_file and downloaded_file.exists():
                        result = AudioResult(
                            file_path=downloaded_file,
                            title=track_info.title,
                            artist=track_info.artist,
                            duration=track_info.duration,
                            source="MusicDL",
                            bitrate=256,
                            format=song_info.get('ext', 'unknown'),
                            sample_rate=48000
                        )
                        
                        # Verify
                        from utils.track_verifier import TrackVerifier
                        verification = await TrackVerifier.verify_track(result.file_path, track_info)
                        
                        if verification.success:
                            logger.info(f"✓ Downloaded & verified via MusicDL: {result.title}")
                            
                            # Upload to FTP
                            try:
                                from services.storage import get_cloud_cache
                                cloud_cache = get_cloud_cache()
                                if cloud_cache.is_enabled:
                                    asyncio.create_task(
                                        cloud_cache.upload(result.file_path, track_info.artist, track_info.title)
                                    )
                            except:
                                pass
                            
                            return result
                        else:
                            logger.warning(f"MusicDL verification failed: {verification.message}")
            
            raise Exception("MusicDL not available or no results")
        
        except Exception as e:
            errors.append({"source": "MusicDL", "error": str(e)})
            logger.warning(f"MusicDL download failed: {e}")
        
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
            
            # CRITICAL: Check if bot is already playing (multiple checks for reliability)
            voice_connection = self.bot.voice_manager.connections.get(guild_id)
            
            # Also check Discord's actual voice client state
            discord_voice_client = interaction.guild.voice_client
            
            is_already_playing = False
            
            # Check 1: Our managed connection
            if voice_connection and voice_connection.is_connected() and voice_connection.is_playing():
                is_already_playing = True
                logger.info(f"[PlayCheck] Already playing via voice_manager")
            
            # Check 2: Discord's actual voice client (fallback)
            elif discord_voice_client and discord_voice_client.is_connected() and discord_voice_client.is_playing():
                is_already_playing = True
                logger.info(f"[PlayCheck] Already playing via Discord voice_client")
            
            # Check 3: Check if we have an active player
            elif hasattr(self.bot, 'players') and guild_id in self.bot.players:
                player = self.bot.players[guild_id]
                if player and hasattr(player, 'is_playing') and player.is_playing:
                    is_already_playing = True
                    logger.info(f"[PlayCheck] Already playing via bot.players")
            
            if is_already_playing:
                logger.info(f"✓ Bot is already playing, will queue all tracks from new playlist")
            
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
            """Called when first track is ready - STREAM immediately (faster!)"""
            nonlocal first_track_played, tracks_queued
            
            # CRITICAL: If bot already playing, queue this track instead of interrupting
            if is_already_playing:
                # Bot already playing, queue first track too
                track.voice_channel_id = voice_channel.id
                track.requested_by = interaction.user.display_name
                track.requested_by_id = interaction.user.id
                queue_cog.queues[guild_id].append(track)
                tracks_queued += 1
                logger.info(f"📋 Queued first track (bot already playing): {track.title}")
                first_track_played = True  # Skip playback flow
                return
            
            # Try streaming first for instant playback
            stream_url = None
            use_streaming = False
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "🌐 Streaming First Track",
                    f"**{track.title}** - *{track.artist}*"
                )
            )
            
            try:
                stream_url = await self.youtube_downloader.get_stream_url(track)
                if stream_url:
                    use_streaming = True
                    logger.info(f"✓ Got stream URL for playlist first track")
                    
                    # Start background download to FTP cache (FLAC via MusicDL)
                    asyncio.create_task(
                        self.youtube_downloader.background_download_for_cache(
                            track.artist, track.title
                        )
                    )
                    logger.info(f"📥 Background download started: {track.title} → FTP")
            except Exception as e:
                logger.warning(f"Stream failed: {e}, falling back to download")
            
            # Fallback to download if streaming fails
            audio_result = None
            if not use_streaming:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Downloading First Track",
                        f"**{track.title}** - *{track.artist}*"
                    )
                )
                audio_result = await self._download_with_fallback(track, loader)
                
                if not audio_result or not audio_result.is_success:
                    logger.error("Failed to download first track")
                    return
            
            # Process metadata
            metadata = await self.metadata_processor.process(
                track,
                audio_result,  # Can be None for streaming mode
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=False,  # Spotify has good artwork
                voice_channel_id=voice_channel.id
            )
            
            # Store stream_url in metadata if streaming
            if use_streaming and stream_url:
                metadata.stream_url = stream_url
            
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
            
            # Start playback - streaming or file-based
            if use_streaming and stream_url:
                await player.start_from_stream(stream_url, volume=volume)
                logger.info(f"🌐 Streaming playlist first track: {track.title}")
            else:
                await player.start(volume=volume)
                logger.info(f"🎵 Playing playlist first track: {track.title}")
            
            first_track_played = True
            
            # ========================================
            # IMMEDIATELY prepare next 3 tracks while playing
            # ========================================
            async def prepare_upcoming_tracks():
                """Prepare next tracks in background while first track plays"""
                await asyncio.sleep(2)  # Wait for queue to populate
                
                queue_items = queue_cog.queues.get(guild_id, [])
                if len(queue_items) > 0:
                    from services.audio.playlist_cache import get_playlist_cache
                    cache = get_playlist_cache()
                    
                    logger.info(f"🔄 Preparing next {min(3, len(queue_items))} tracks...")
                    await cache.prepare_next_tracks(0, queue_items)
            
            asyncio.create_task(prepare_upcoming_tracks())
        
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
            """Called when first track is ready - STREAM immediately (faster!)"""
            nonlocal first_track_played
            
            if is_already_playing:
                # Bot already playing, queue this track too
                track.voice_channel_id = voice_channel.id
                queue_cog.queues[guild_id].append(track)
                return
            
            # Try streaming first for instant playback
            stream_url = None
            use_streaming = False
            
            await self._safe_loader_update(loader, 
                embed=EmbedBuilder.create_loading(
                    "🌐 Streaming First Track",
                    f"**{track.title}** - *{track.artist}*"
                )
            )
            
            try:
                stream_url = await self.youtube_downloader.get_stream_url(track)
                if stream_url:
                    use_streaming = True
                    logger.info(f"✓ Got stream URL for YouTube playlist first track")
                    
                    # Start background download to FTP cache
                    asyncio.create_task(
                        self.youtube_downloader.background_download_for_cache(
                            track.artist, track.title
                        )
                    )
                    logger.info(f"📥 Background download started: {track.title} → FTP")
            except Exception as e:
                logger.warning(f"Stream failed: {e}, falling back to download")
            
            # Fallback to download if streaming fails
            audio_result = None
            if not use_streaming:
                await self._safe_loader_update(loader, 
                    embed=EmbedBuilder.create_loading(
                        "Downloading First Track",
                        f"**{track.title}** - *{track.artist}*"
                    )
                )
                audio_result = await self._download_with_fallback(track, loader)
                
                if not audio_result or not audio_result.is_success:
                    logger.error("Failed to download first YouTube track")
                    return
            
            # Process metadata
            metadata = await self.metadata_processor.process(
                track,
                audio_result,  # Can be None for streaming mode
                requested_by=interaction.user.display_name,
                requested_by_id=interaction.user.id,
                prefer_apple_artwork=True,  # Get Apple Music artwork for YouTube
                voice_channel_id=voice_channel.id
            )
            
            # Store stream_url in metadata if streaming
            if use_streaming and stream_url:
                metadata.stream_url = stream_url
            
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
            
            # Start playback - streaming or file-based
            if use_streaming and stream_url:
                await player.start_from_stream(stream_url, volume=volume)
                logger.info(f"🌐 Streaming YouTube playlist first track: {track.title}")
            else:
                await player.start(volume=volume)
                logger.info(f"🎵 Playing YouTube playlist first track: {track.title}")
            
            first_track_played = True
            
            # Immediately prepare next 3 tracks while playing
            async def prepare_upcoming_tracks():
                await asyncio.sleep(2)  # Wait for queue to populate
                queue_items = queue_cog.queues.get(guild_id, [])
                if len(queue_items) > 0:
                    from services.audio.playlist_cache import get_playlist_cache
                    cache = get_playlist_cache()
                    logger.info(f"🔄 Preparing next {min(3, len(queue_items))} tracks...")
                    await cache.prepare_next_tracks(0, queue_items)
            
            asyncio.create_task(prepare_upcoming_tracks())
        
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
