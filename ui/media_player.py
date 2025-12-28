"""Synchronized media player with perfect sync"""

import asyncio
import time
import discord
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from discord.ext import commands

from database.models import MetadataInfo
from services.audio.player import OptimizedAudioPlayer
from services.audio.file_registry import get_audio_registry
from utils.formatters import ProgressBarFormatter
from .embeds import EmbedBuilder
from .loading import SafeLoadingManager
from config.logging_config import get_logger

logger = get_logger('ui.media_player')


class SynchronizedMediaPlayer:
    """
    Synchronized media player dengan zero drift
    
    Features:
    - Perfect sync between audio, progress bar, and lyrics
    - Rate limit safe updates (every 2 seconds)
    - Automatic cleanup on finish
    - Auto-play next track from queue
    """
    
    def __init__(
        self,
        voice_client: discord.VoiceClient,
        message: discord.Message,
        metadata: MetadataInfo,
        bot: Optional['commands.Bot'] = None,
        guild_id: Optional[int] = None
    ):
        """
        Initialize media player
        
        Args:
            voice_client: Discord voice client
            message: Discord message for player UI
            metadata: Track metadata
            bot: Bot instance for queue access (optional)
            guild_id: Guild ID for queue management (optional)
        """
        self.voice = voice_client
        self.message = message
        self.metadata = metadata
        self.bot = bot
        self.guild_id = guild_id
        self.start_time: Optional[float] = None
        self.is_playing = False
        self.is_paused = False
        self._transitioning_to_next = False  # Prevent double-call of _play_next_from_queue
        self.update_task: Optional[asyncio.Task] = None
        self.prefetch_task: Optional[asyncio.Task] = None  # Background pre-fetching
        self.prefetched_metadata: Optional[MetadataInfo] = None  # Cache for next track
        
        logger.debug(f"SynchronizedMediaPlayer initialized for: {metadata.title}")
    
    async def start(self, volume: float = 1.0) -> None:
        """
        Start playback dengan perfect sync
        
        Args:
            volume: Initial volume (0.0 to 2.0, default: 1.0)
        """
        try:
            # Create audio source with volume control and equalizer
            audio_source = OptimizedAudioPlayer.create_audio_source(
                self.metadata.audio_path,
                volume=volume,
                guild_id=self.guild_id
            )
            
            # Register audio file as active to prevent deletion
            if self.guild_id and self.metadata.audio_path:
                registry = get_audio_registry()
                registry.register(self.guild_id, self.metadata.audio_path)
                logger.debug(f"Registered active file: {self.metadata.audio_path.name}")
            
            # Record start time SEBELUM play
            self.start_time = time.time()
            self.is_playing = True
            self.is_paused = False
            self._transitioning_to_next = False  # Reset transition flag
            
            # Start playback
            await OptimizedAudioPlayer.play_audio(
                self.voice,
                audio_source,
                after_callback=self._on_end
            )
            
            # Start update loop
            self.update_task = asyncio.create_task(self._update_loop())
            
            # Start background pre-fetching for next track (5 seconds delay)
            if self.bot and self.guild_id:
                self.prefetch_task = asyncio.create_task(self._prefetch_next_track())
            
            # Update voice channel status
            await self._update_voice_channel_status(
                f"🎵 Now Playing: {self.metadata.title[:30]} - {self.metadata.artist[:20]}"
            )
            
            # Notify dashboard that playback started (for synchronized lyrics)
            await self._notify_dashboard_playing()
            
            logger.info(f"Playback started: {self.metadata.title} (volume={volume})")
        
        except Exception as e:
            logger.error(f"Failed to start playback: {e}", exc_info=True)
            self.is_playing = False
            raise
    
    async def start_from_stream(self, stream_url: str, volume: float = 1.0) -> None:
        """
        Start playback from stream URL (no download required).
        
        This enables instant playback by streaming directly from URL.
        Used for single tracks and first track of playlists.
        
        Args:
            stream_url: Direct audio stream URL
            volume: Initial volume (0.0 to 2.0, default: 1.0)
        """
        try:
            logger.info(f"Starting stream playback: {self.metadata.title}")
            
            # Create audio source from URL with volume control
            # FFmpeg will handle streaming from URL
            ffmpeg_options = {
                'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
                'options': '-vn'  # No video
            }
            
            audio_source = discord.FFmpegPCMAudio(
                stream_url,
                **ffmpeg_options
            )
            
            # Apply volume transformer
            audio_source = discord.PCMVolumeTransformer(audio_source, volume=volume)
            
            # Record start time
            self.start_time = time.time()
            self.is_playing = True
            self.is_paused = False
            self._transitioning_to_next = False
            self._is_streaming = True  # Mark as streaming mode
            
            # Start playback
            def after_callback(error):
                self._on_end(error)
            
            self.voice.play(audio_source, after=after_callback)
            
            # Start update loop
            self.update_task = asyncio.create_task(self._update_loop())
            
            # Update voice channel status
            await self._update_voice_channel_status(
                f"🎵 Streaming: {self.metadata.title[:30]} - {self.metadata.artist[:20]}"
            )
            
            logger.info(f"🌐 Stream playback started: {self.metadata.title}")
        
        except Exception as e:
            logger.error(f"Failed to start stream playback: {e}", exc_info=True)
            self.is_playing = False
            raise
    
    def set_volume(self, volume: float) -> bool:
        """
        Set playback volume
        
        Args:
            volume: Volume level (0.0 to 2.0)
        
        Returns:
            True if successful, False otherwise
        """
        return OptimizedAudioPlayer.set_volume(self.voice, volume)
    
    async def pause(self) -> bool:
        """Pause playback"""
        logger.info(f"🔍 Pause called - current state: is_playing={self.is_playing}, is_paused={self.is_paused}")
        if OptimizedAudioPlayer.pause(self.voice):
            self.is_paused = True
            logger.info(f"✅ Playback paused - is_paused set to: {self.is_paused}")
            return True
        logger.warning("❌ Pause failed - voice client not playing")
        return False
    
    async def resume(self) -> bool:
        """Resume playback"""
        logger.info(f"🔍 Resume called - current state: is_playing={self.is_playing}, is_paused={self.is_paused}")
        if OptimizedAudioPlayer.resume(self.voice):
            self.is_paused = False
            logger.info(f"✅ Playback resumed - is_paused set to: {self.is_paused}")
            return True
        logger.warning("❌ Resume failed - voice client not paused")
        return False
    
    async def stop(self) -> None:
        """Stop playback and cancel background tasks"""
        self.is_playing = False
        OptimizedAudioPlayer.stop(self.voice)
        
        if self.update_task:
            self.update_task.cancel()
        
        if self.prefetch_task:
            self.prefetch_task.cancel()
            logger.debug("Pre-fetch task cancelled")
        
        logger.info("Playback stopped")
    
    async def _update_loop(self) -> None:
        """
        Update progress bar dan lyrics dengan smooth sync
        - Updates every 1 second for smooth progress bar and lyrics
        - Calculates precise timing using system time
        - PAUSES updates when playback is paused
        """
        last_update = 0
        pause_time = None  # Track when pause started
        update_interval = 1.0  # Update every 1 second for smooth sync
        
        try:
            while self.is_playing:
                now = time.time()
                
                # Skip updates if paused
                if self.is_paused:
                    # Record pause time to adjust start_time later
                    if pause_time is None:
                        pause_time = now
                    
                    # Sleep and continue (don't update UI while paused)
                    await asyncio.sleep(0.5)
                    continue
                
                # Resumed from pause - adjust start time
                if pause_time is not None:
                    # Calculate how long we were paused
                    pause_duration = now - pause_time
                    # Adjust start time to account for pause
                    self.start_time += pause_duration
                    pause_time = None
                    logger.debug(f"Resumed, adjusted timing by {pause_duration:.1f}s")
                
                # Update every 1 second (smooth enough, rate limit safe)
                if now - last_update >= update_interval:
                    # Calculate current time with millisecond precision
                    if self.start_time:
                        current_time = now - self.start_time
                    else:
                        current_time = 0
                    
                    # Check if finished
                    # Convert duration to float if string
                    duration = self.metadata.duration
                    if isinstance(duration, str):
                        try:
                            duration = float(duration)
                        except (ValueError, TypeError):
                            duration = 0
                    
                    if current_time >= duration:
                        self.is_playing = False
                        break
                    
                    # Get current lyrics (3 lines)
                    lyrics_lines = self._get_lyrics_at_time(current_time)
                    
                    # Generate progress bar (shorter length for mobile compatibility)
                    # Use the already-converted duration from above
                    progress_bar = ProgressBarFormatter.generate_with_time(
                        current_time,
                        duration,  # Use converted duration (not self.metadata.duration)
                        length=12  # Shortened from 20 to 12 for mobile
                    )
                    
                    # Build embed
                    embed = EmbedBuilder.create_now_playing(
                        metadata=self.metadata,
                        current_time=current_time,
                        progress_bar=progress_bar,
                        lyrics_lines=lyrics_lines,
                        guild_id=self.guild_id
                    )
                    
                    # Update message
                    try:
                        await self.message.edit(embed=embed)
                        last_update = now
                    except discord.NotFound:
                        # Message was deleted, stop updating
                        logger.debug("Player message deleted, stopping updates")
                        self.is_playing = False
                        break
                    except discord.HTTPException as e:
                        if e.code == 429:  # Rate limited
                            retry_after = getattr(e, 'retry_after', 2)
                            logger.warning(f"Rate limited, waiting {retry_after}s")
                            await asyncio.sleep(retry_after)
                            # Adjust update interval if rate limited too often
                            update_interval = max(1.5, update_interval)
                        elif e.code == 10008:  # Unknown Message
                            logger.debug("Player message no longer exists, stopping updates")
                            self.is_playing = False
                            break
                        else:
                            logger.error(f"Failed to update player: {e}")
                
                # Sleep with shorter interval for more responsive updates
                await asyncio.sleep(0.2)  # Check status every 200ms for precision
        
        except asyncio.CancelledError:
            logger.debug("Update loop cancelled")
        except Exception as e:
            logger.error(f"Error in update loop: {e}", exc_info=True)
    
    def _get_lyrics_at_time(self, current_time: float) -> list:
        """
        Get 3 baris lyrics untuk waktu sekarang
        
        Args:
            current_time: Current playback time
        
        Returns:
            List of 3 lyrics lines
        """
        if not self.metadata.lyrics:
            return ["", "", ""]
        
        return self.metadata.lyrics.get_lines_at_time(current_time, count=3)
    
    def _on_end(self, error: Optional[Exception]) -> None:
        """
        Callback setelah playback selesai (natural finish or skip)
        
        Args:
            error: Error if any occurred during playback
        """
        self.is_playing = False
        
        # Cancel background tasks
        if self.update_task:
            self.update_task.cancel()
        
        if self.prefetch_task:
            self.prefetch_task.cancel()
            logger.debug("Pre-fetch task cancelled on playback end")
        
        if error:
            logger.error(f"Playback error: {error}")
            completed = False
        else:
            logger.info("Playback finished")
            completed = True
        
        # ALWAYS cleanup audio files after playback (storage optimization)
        self._cleanup_audio_file()
        
        # Save play history to database
        if self.bot and self.guild_id and self.metadata:
            try:
                loop = self.bot.loop
                if loop and not loop.is_closed():
                    # Schedule database save
                    asyncio.run_coroutine_threadsafe(
                        self._save_play_history(completed),
                        loop
                    )
            except Exception as e:
                logger.error(f"Failed to save play history: {e}")
        
        # Auto-play next track from queue (works for both natural finish and skip)
        # Note: This callback runs in FFmpeg thread, so we need to schedule coroutine properly
        if self.bot and self.guild_id:
            # Prevent double-calling (race condition fix)
            if self._transitioning_to_next:
                logger.debug("Already transitioning to next track, skipping duplicate call")
                return
            self._transitioning_to_next = True
            
            try:
                logger.info("Scheduling next track from queue...")
                # Get the event loop from the bot
                loop = self.bot.loop
                
                # Validate loop is available and not closed
                if not loop or loop.is_closed():
                    logger.error("Bot event loop is not available or closed")
                    self._transitioning_to_next = False
                    return
                
                # Schedule coroutine in the bot's event loop from this thread
                future = asyncio.run_coroutine_threadsafe(self._play_next_from_queue(), loop)
                logger.debug(f"Next track scheduled: {future}")
            except Exception as e:
                logger.error(f"Failed to schedule next track: {e}", exc_info=True)
                self._transitioning_to_next = False
        else:
            logger.warning(f"Cannot schedule next track: bot={self.bot}, guild_id={self.guild_id}")
    
    async def _notify_dashboard_playing(self) -> None:
        """
        Notify dashboard that playback has started.
        This triggers lyrics sync to begin.
        """
        if not self.guild_id or not self.metadata:
            return
        
        try:
            from web.api.track_state import get_track_state_manager
            
            state_manager = get_track_state_manager()
            
            # Set track as playing with metadata
            state_manager.set_preparing(
                self.guild_id,
                title=self.metadata.title,
                artist=self.metadata.artist,
                album=self.metadata.album,
                duration=self.metadata.duration,
                artwork_url=self.metadata.artwork_url
            )
            
            # Add lyrics if available
            if self.metadata.lyrics:
                state_manager.set_lyrics(self.guild_id, {
                    "plain": getattr(self.metadata.lyrics, 'plain', None),
                    "synced": getattr(self.metadata.lyrics, 'synced', None),
                    "source": getattr(self.metadata.lyrics, 'source', None)
                })
            
            # Set ready and start playing (no wait for ACK on initial play)
            state_manager.set_ready(self.guild_id)
            state_manager.set_playing(self.guild_id)
            
            logger.info(f"Dashboard notified: PLAYING - {self.metadata.title}")
            
        except Exception as e:
            logger.warning(f"Dashboard notification failed: {e}")
    
    async def _notify_dashboard_ended(self) -> None:
        """Notify dashboard that playback ended"""
        if not self.guild_id:
            return
        
        try:
            from web.api.track_state import get_track_state_manager
            
            state_manager = get_track_state_manager()
            state_manager.set_ended(self.guild_id)
            logger.debug(f"Dashboard notified: ENDED - guild {self.guild_id}")
            
        except Exception as e:
            logger.warning(f"Dashboard end notification failed: {e}")
    
    def get_current_time(self) -> float:
        """Get current playback time"""
        if self.start_time and self.is_playing and not self.is_paused:
            # Calculate actual playback time, accounting for pauses
            if not hasattr(self, '_pause_start_time'):
                self._pause_start_time = None
                self._total_pause_time = 0.0
            
            current_time = time.time() - self.start_time - self._total_pause_time
            return max(0.0, current_time)
        elif self.is_paused and hasattr(self, '_paused_at_time'):
            # Return the time when paused
            return self._paused_at_time
        return 0.0
    
    def _cleanup_audio_file(self) -> None:
        """
        Delete audio files after playback to save storage.
        
        ALWAYS deletes the audio file after playback to conserve disk space.
        This is called in _on_end after playback finishes.
        
        Two-pronged approach:
        1. Delete known audio_path if exists
        2. Search and delete matching files in downloads folder (for streaming mode)
        """
        deleted = False
        
        # Method 1: Delete known audio_path
        if self.metadata and self.metadata.audio_path:
            try:
                audio_path = self.metadata.audio_path
                
                # Unregister from active files first
                if self.guild_id:
                    registry = get_audio_registry()
                    registry.unregister(self.guild_id, audio_path)
                    logger.debug(f"Unregistered file: {audio_path.name}")
                
                if audio_path.exists():
                    file_size = audio_path.stat().st_size
                    file_size_mb = file_size / (1024 * 1024)
                    audio_path.unlink()
                    logger.info(f"🗑️ Deleted (audio_path): {audio_path.name} ({file_size_mb:.1f}MB)")
                    deleted = True
            except Exception as e:
                logger.warning(f"Failed to cleanup audio_path: {e}")
        
        # Method 2: Aggressively search downloads folder for matching files
        # This catches: streaming mode downloads, background cache downloads, etc.
        if self.metadata:
            try:
                from config.settings import Settings
                from pathlib import Path
                import re
                
                downloads_dir = Settings.DOWNLOADS_DIR
                if downloads_dir.exists():
                    # Create search pattern from artist and title
                    artist = self.metadata.artist or ""
                    title = self.metadata.title or ""
                    
                    # Sanitize for filename matching
                    def sanitize(s):
                        return re.sub(r'[^\w\s-]', '', s.lower()).strip()
                    
                    artist_clean = sanitize(artist)
                    title_clean = sanitize(title)
                    
                    # Search for matching files
                    for ext in ['*.opus', '*.m4a', '*.mp3', '*.flac', '*.webm']:
                        for f in downloads_dir.glob(ext):
                            try:
                                filename_clean = sanitize(f.stem)
                                
                                # Match if both artist and title are in filename
                                if artist_clean and title_clean:
                                    if artist_clean in filename_clean and title_clean in filename_clean:
                                        file_size = f.stat().st_size
                                        file_size_mb = file_size / (1024 * 1024)
                                        f.unlink()
                                        logger.info(f"🗑️ Deleted (pattern match): {f.name} ({file_size_mb:.1f}MB)")
                                        deleted = True
                            except:
                                pass
                    
                    # Also check playlist_cache folder
                    playlist_cache = downloads_dir / "playlist_cache"
                    if playlist_cache.exists():
                        for ext in ['*.opus', '*.m4a', '*.mp3', '*.flac', '*.webm']:
                            for f in playlist_cache.glob(ext):
                                try:
                                    filename_clean = sanitize(f.stem)
                                    if artist_clean and title_clean:
                                        if artist_clean in filename_clean or title_clean in filename_clean:
                                            file_size = f.stat().st_size
                                            file_size_mb = file_size / (1024 * 1024)
                                            f.unlink()
                                            logger.info(f"🗑️ Deleted (playlist cache): {f.name} ({file_size_mb:.1f}MB)")
                                            deleted = True
                                except:
                                    pass
                    
            except Exception as e:
                logger.warning(f"Aggressive cleanup failed: {e}")
        
        if not deleted and self.metadata:
            logger.debug(f"No files to cleanup for: {self.metadata.title}")
    
    async def _save_play_history(self, completed: bool = True) -> None:
        """
        Save play history to database
        
        Args:
            completed: Whether track was played to completion
        """
        try:
            if not self.bot or not self.metadata:
                return
            
            db = self.bot.db_manager
            
            # Convert duration to float for database
            duration_float = self.metadata.duration
            if isinstance(duration_float, str):
                try:
                    duration_float = float(duration_float)
                except (ValueError, TypeError):
                    duration_float = 0
            
            await db.add_play_history(
                guild_id=self.guild_id,
                user_id=self.metadata.requested_by_id or 0,
                username=self.metadata.requested_by or "Unknown",
                title=self.metadata.title,
                artist=self.metadata.artist,
                duration=duration_float,  # Use converted float
                source=str(self.metadata.audio_source),
                album=self.metadata.album,
                artwork_url=getattr(self.metadata, 'artwork_url', None),
                completed=completed
            )
            
            logger.debug(f"Saved play history: {self.metadata.title}")
        except Exception as e:
            logger.error(f"Failed to save play history: {e}", exc_info=True)
    
    async def _update_voice_channel_status(self, status: str):
        """
        Update voice channel status
        
        Args:
            status: Status text (max 500 chars, but keep short for visibility)
        """
        try:
            if self.voice and self.voice.channel:
                # Truncate to safe length
                status = status[:80]  # Discord voice status limit
                await self.voice.channel.edit(status=status)
                logger.debug(f"Updated voice channel status: {status}")
        except Exception as e:
            logger.debug(f"Could not update voice channel status: {e}")
    
    async def _clear_voice_channel_status(self):
        """Clear voice channel status"""
        try:
            if self.voice and self.voice.channel:
                await self.voice.channel.edit(status=None)
                logger.debug("Cleared voice channel status")
        except Exception as e:
            logger.debug(f"Could not clear voice channel status: {e}")
    
    async def _prefetch_next_track(self) -> None:
        """
        Continuously pre-download tracks from queue in background.
        Downloads and processes tracks one by one, replacing TrackInfo with MetadataInfo
        so they're ready to play instantly when user skips or current track ends.
        
        In ONE_TRACK_ONE_PROCESS mode, only prefetches 1 track at a time.
        """
        try:
            # Wait 2 seconds after playback starts before beginning pre-download
            await asyncio.sleep(2)
            
            queue_cog = self.bot.get_cog('QueueCommands')
            if not queue_cog:
                logger.debug("Queue system not available for pre-fetching")
                return
            
            play_cog = self.bot.get_cog('PlayCommand')
            if not play_cog:
                logger.warning("PlayCommand not available for pre-fetching")
                return
            
            # Determine max prefetch based on ONE_TRACK_ONE_PROCESS setting
            from config.settings import Settings
            if Settings.ONE_TRACK_ONE_PROCESS:
                max_prefetch = 1  # Only 1 track ahead in sequential mode
                logger.info("📦 ONE_TRACK_ONE_PROCESS mode: prefetching 1 track only")
            else:
                max_prefetch = 5  # Normal mode: pre-download up to 5 tracks
            
            processed_count = 0
            
            from database.models import TrackInfo, MetadataInfo
            
            while self.is_playing and processed_count < max_prefetch:
                # Check if there are tracks in queue
                if self.guild_id not in queue_cog.queues or not queue_cog.queues[self.guild_id]:
                    logger.debug("Queue empty, stopping pre-fetch")
                    break
                
                queue = queue_cog.queues[self.guild_id]
                
                # Find first unprocessed track (TrackInfo, not MetadataInfo)
                track_index = None
                track_to_process = None
                
                for i, item in enumerate(queue):
                    if isinstance(item, TrackInfo):
                        # Skip tracks that already failed prefetch
                        if getattr(item, '_prefetch_failed', False):
                            continue
                        track_index = i
                        track_to_process = item
                        break
                
                if track_to_process is None:
                    logger.info(f"✅ All {len(queue)} tracks in queue are pre-downloaded!")
                    break
                
                logger.info(f"🔄 Pre-downloading track {processed_count + 1}: {track_to_process.title}")
                
                try:
                    # Download audio in background
                    audio_result = await play_cog._download_with_fallback(track_to_process, None)
                    
                    if not audio_result or not audio_result.is_success:
                        logger.warning(f"Pre-download failed: {track_to_process.title} - skipping to next")
                        # Mark as failed by setting a flag so we skip it next iteration
                        track_to_process._prefetch_failed = True
                        processed_count += 1  # Count as processed (failed) to prevent infinite loop
                        await asyncio.sleep(1)
                        continue
                    
                    # Process metadata (artwork + lyrics)
                    voice_ch_id = getattr(track_to_process, 'voice_channel_id', None)
                    # Preserve original requester from TrackInfo
                    orig_requested_by = getattr(track_to_process, 'requested_by', None)
                    orig_requested_by_id = getattr(track_to_process, 'requested_by_id', 0)
                    
                    processed_metadata = await play_cog.metadata_processor.process(
                        track_to_process,
                        audio_result,
                        requested_by=orig_requested_by or "Auto-queue",
                        requested_by_id=orig_requested_by_id or 0,
                        prefer_apple_artwork=True,
                        voice_channel_id=voice_ch_id
                    )
                    
                    # Replace TrackInfo in queue with processed MetadataInfo
                    if track_index is not None and track_index < len(queue):
                        queue[track_index] = processed_metadata
                        processed_count += 1
                        logger.info(f"✅ Pre-downloaded: {processed_metadata.title} ({processed_count}/{max_prefetch})")
                    
                    # Store first pre-fetched as prefetched_metadata for instant play
                    if processed_count == 1:
                        self.prefetched_metadata = processed_metadata
                    
                    # Small delay between downloads to avoid rate limiting
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"Pre-download error for {track_to_process.title}: {e} - skipping")
                    # Mark as failed to prevent infinite retry loop
                    track_to_process._prefetch_failed = True
                    processed_count += 1  # Count as processed (failed) to prevent infinite loop
                    await asyncio.sleep(1)
                    continue
            
            if processed_count > 0:
                logger.info(f"🎵 Background pre-download complete: {processed_count} tracks ready!")
            
        except asyncio.CancelledError:
            logger.debug("Pre-fetch task cancelled")
        except Exception as e:
            logger.warning(f"Pre-fetch error: {e}")
    
    async def _play_next_from_queue(self) -> None:
        """
        Play next track from queue automatically
        Uses pre-fetched track if available for instant playback
        """
        try:
            # ========================================
            # CLEANUP: Delete finished track's audio file
            # CRITICAL: Always delete to save storage!
            # ========================================
            if self.metadata and self.metadata.audio_path:
                try:
                    finished_file = self.metadata.audio_path
                    if finished_file.exists():
                        file_size = finished_file.stat().st_size
                        file_size_mb = file_size / (1024 * 1024)
                        finished_file.unlink()
                        logger.info(f"🗑️ Auto-deleted after next track: {finished_file.name} ({file_size_mb:.1f}MB)")
                except Exception as e:
                    logger.warning(f"Cleanup failed: {e}")
            
            # Check if voice is still connected
            if not self.voice or not self.voice.is_connected():
                logger.info("Voice not connected, skipping next track")
                self._transitioning_to_next = False
                return
            
            # Check if player was stopped
            if not self.is_playing and not self._transitioning_to_next:
                logger.info("Player stopped, skipping next track")
                return
            
            queue_cog = self.bot.get_cog('QueueCommands')
            if not queue_cog:
                logger.debug("Queue system not available")
                return
            
            # Get next track from queue
            next_item = queue_cog.get_next(self.guild_id)
            
            if not next_item:
                logger.info("Queue is empty, waiting 5s before disconnect...")
                
                # Clear voice channel status
                await self._clear_voice_channel_status()
                
                # Wait 5 seconds for new commands
                await asyncio.sleep(5)
                
                # Check again if something was queued during wait
                next_item_check = queue_cog.get_next(self.guild_id) if queue_cog else None
                if next_item_check:
                    logger.info("New track queued during wait, continuing playback")
                    # Put it back and continue
                    if self.guild_id in queue_cog.queues:
                        queue_cog.queues[self.guild_id].insert(0, next_item_check)
                    # Continue to play next
                else:
                    # Still empty, disconnect
                    logger.info("No new commands, disconnecting to save bandwidth...")
                    
                    # Disconnect from voice
                    try:
                        if self.voice and self.voice.is_connected():
                            await self.voice.disconnect()
                            logger.info("✓ Disconnected from voice channel")
                    except Exception as e:
                        logger.warning(f"Error disconnecting: {e}")
                    
                    # Clean up connection from voice manager
                    if self.bot and hasattr(self.bot, 'voice_manager'):
                        if self.guild_id in self.bot.voice_manager.connections:
                            del self.bot.voice_manager.connections[self.guild_id]
                    
                    # Clean up player reference
                    if self.bot and hasattr(self.bot, 'players'):
                        if self.guild_id in self.bot.players:
                            del self.bot.players[self.guild_id]
                    
                    # Send thank you message with Support button
                    try:
                        from discord import ui
                        
                        class SupportView(discord.ui.View):
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
                                self.add_item(discord.ui.Button(
                                    label="🌐 Website",
                                    url="https://sonora.muhammadzakizn.com",
                                    style=discord.ButtonStyle.link
                                ))
                        
                        embed = discord.Embed(
                            title="👋 Sampai Jumpa!",
                            description=(
                                f"Selesai memutar: **{self.metadata.title}**\n\n"
                                "Terima kasih sudah menggunakan **SONORA**! 🎵\n\n"
                                "Jika kamu menyukai bot ini, pertimbangkan untuk mendukung developer "
                                "agar SONORA terus berkembang dengan fitur-fitur baru! 💖\n\n"
                                "*Bot telah disconnect untuk menghemat bandwidth.*"
                            ),
                            color=discord.Color.from_rgb(123, 30, 60)  # Maroon
                        )
                        embed.set_footer(text="SONORA • Premium Discord Music Bot")
                        
                        await self.message.edit(embed=embed, view=SupportView())
                    except discord.HTTPException:
                        pass  # Message no longer exists or cannot be edited
                    
                    return
            
            logger.info(f"Auto-playing next from queue: {next_item.title}")
            
            # CRITICAL: Check voice channel status (FIFO + Empty VC skip logic)
            voice_channel_id = getattr(next_item, 'voice_channel_id', None)
            requested_by_id = getattr(next_item, 'requested_by_id', None)
            
            # Default to current voice channel if not tracked
            target_voice_channel = None
            
            if voice_channel_id:
                # Get guild
                guild = self.bot.get_guild(self.guild_id)
                if guild:
                    # Get voice channel
                    voice_channel = guild.get_channel(voice_channel_id)
                    
                    if voice_channel:
                        # CRITICAL: Check if voice channel has ANY human users (real-time check)
                        human_members = [m for m in voice_channel.members if not m.bot]
                        
                        if len(human_members) == 0:
                            # Voice channel is EMPTY - SKIP this track
                            logger.info(f"⏭️ Skipping: Voice channel '{voice_channel.name}' is empty (no users)")
                            
                            # Send skip notification
                            try:
                                if hasattr(self.message, 'channel'):
                                    await self.message.channel.send(
                                        embed=EmbedBuilder.create_warning(
                                            "Track Skipped",
                                            f"⏭️ Skipped: **{next_item.title}**\n"
                                            f"Reason: Voice channel '{voice_channel.name}' is empty"
                                        ),
                                        delete_after=5
                                    )
                            except discord.HTTPException:
                                pass  # Could not send skip notification
                            
                            # Recursively try next track
                            return await self._play_next_from_queue()
                        
                        # Voice channel HAS users
                        logger.info(f"✓ Voice channel '{voice_channel.name}' has {len(human_members)} user(s)")
                        
                        # Additional check: Is requester still there? (optional, for logging)
                        if requested_by_id:
                            member = guild.get_member(requested_by_id)
                            if member and member.voice and member.voice.channel.id == voice_channel_id:
                                logger.debug(f"  ✓ Requester is still in voice channel")
                            else:
                                logger.debug(f"  ℹ️  Requester left, but channel has other users")
                        
                        # Set as target voice channel
                        target_voice_channel = voice_channel
                    else:
                        logger.warning(f"Voice channel {voice_channel_id} not found, trying next track")
                        # Voice channel deleted - skip this track
                        return await self._play_next_from_queue()
                else:
                    logger.warning(f"Guild {self.guild_id} not found")
            else:
                logger.debug("No voice channel tracking for this track, staying in current channel")
            
            # Check if bot needs to move to target channel
            if target_voice_channel:
                current_connection = self.bot.voice_manager.connections.get(self.guild_id)
                if current_connection and current_connection.is_connected():
                    current_channel = current_connection.connection.channel
                    
                    if current_channel.id != target_voice_channel.id:
                        # Bot needs to MOVE to different voice channel
                        logger.info(f"🔄 Moving bot from {current_channel.name} to {target_voice_channel.name}")
                        
                        # Notify old channel
                        try:
                            await current_channel.send(
                                embed=EmbedBuilder.create_warning(
                                    "Bot Moving",
                                    f"🔄 Moving to **{target_voice_channel.name}**\n"
                                    f"Next song requested there"
                                ),
                                delete_after=5
                            )
                        except discord.HTTPException:
                            pass  # Could not send move notification
                        
                        # Disconnect from current channel
                        await current_connection.disconnect()
                        
                        # Connect to new channel
                        await current_connection.connect(target_voice_channel)
                        
                        # CRITICAL: Update player's voice reference to new connection
                        self.voice = current_connection.connection
                        
                        # Wait for connection to stabilize
                        await asyncio.sleep(1.0)  # Increased from 0.5 to 1.0
                        
                        logger.info(f"✓ Moved to {target_voice_channel.name}")
                    else:
                        logger.debug(f"Bot already in correct channel: {current_channel.name}")
                else:
                    logger.warning("Connection not found or not connected, cannot move")
            else:
                logger.debug("Staying in current voice channel")
            
            # Check if it's TrackInfo (needs download) or MetadataInfo (ready to play)
            from database.models import TrackInfo, MetadataInfo
            
            # Initialize loading message variable
            loading_msg = None
            
            # CHECK: Use pre-fetched metadata if available (INSTANT PLAYBACK!)
            if self.prefetched_metadata and self.prefetched_metadata.title == next_item.title:
                logger.info(f"⚡ Using pre-fetched track (instant playback): {next_item.title}")
                next_metadata = self.prefetched_metadata
                self.prefetched_metadata = None  # Clear cache
            
            elif isinstance(next_item, TrackInfo):
                # Need to download and process this track
                logger.info(f"Processing next track: {next_item.title}")
                
                # ========================================
                # SHOW LOADING MESSAGE - Let user know bot is processing
                # ========================================
                loading_msg = None
                try:
                    if hasattr(self.message, 'channel'):
                        loading_embed = EmbedBuilder.create_loading(
                            "⏭️ Loading Next Track...",
                            f"**{next_item.title}**\n*{next_item.artist}*\n\n"
                            f"📡 Getting stream URL..."
                        )
                        loading_msg = await self.message.channel.send(embed=loading_embed)
                except discord.HTTPException:
                    pass  # Could not send loading message
                
                play_cog = self.bot.get_cog('PlayCommand')
                if not play_cog:
                    logger.error("PlayCommand not available for download")
                    if loading_msg:
                        try:
                            await loading_msg.delete()
                        except:
                            pass
                    return
                
                try:
                    audio_result = None
                    stream_url = None
                    use_streaming = False
                    
                    # ========================================
                    # STEP 1: Check if already prepared in cache
                    # ========================================
                    queue_items = queue_cog.queues.get(self.guild_id, [])
                    current_queue_idx = 0  # Assume this is first in queue
                    
                    try:
                        from services.audio.playlist_cache import get_playlist_cache
                        playlist_cache = get_playlist_cache()
                        
                        # Get cached track if available
                        cached_track = playlist_cache.get_cached_track(current_queue_idx)
                        
                        if cached_track and cached_track.audio_path:
                            logger.info(f"✓ Using CACHED track: {next_item.title}")
                            from config.constants import AudioSource
                            from database.models import AudioResult as AR
                            audio_result = AR(
                                file_path=cached_track.audio_path,
                                title=next_item.title,
                                artist=next_item.artist,
                                duration=next_item.duration,
                                source=AudioSource.YOUTUBE_MUSIC,
                                bitrate=256,
                                format='opus',
                                sample_rate=48000
                            )
                        else:
                            # Check FTP directly
                            from services.storage.ftp_storage import get_ftp_cache
                            ftp_cache = get_ftp_cache()
                            
                            if ftp_cache.is_enabled and await ftp_cache.exists(next_item.artist, next_item.title):
                                logger.info(f"☁️ Found in FTP: {next_item.title}")
                                from config.settings import Settings
                                cache_path = Settings.DOWNLOADS_DIR / f"ftp_{next_item.artist}_{next_item.title}.opus"
                                
                                if await ftp_cache.download(next_item.artist, next_item.title, cache_path):
                                    from config.constants import AudioSource
                                    from database.models import AudioResult as AR
                                    audio_result = AR(
                                        file_path=cache_path,
                                        title=next_item.title,
                                        artist=next_item.artist,
                                        duration=next_item.duration,
                                        source=AudioSource.YOUTUBE_MUSIC,
                                        bitrate=256,
                                        format='opus',
                                        sample_rate=48000
                                    )
                                    logger.info(f"☁️ Loaded from FTP: {cache_path.name}")
                    except Exception as e:
                        logger.warning(f"Cache check failed: {e}")
                    
                    # ========================================
                    # STEP 2: If not cached, stream with 6s buffer
                    # ========================================
                    if not audio_result:
                        logger.info(f"🌐 Streaming: {next_item.title}")
                        
                        try:
                            stream_url = await play_cog.youtube_downloader.get_stream_url(next_item)
                            if stream_url:
                                use_streaming = True
                                logger.info(f"✓ Got stream URL, buffering 6s...")
                                await asyncio.sleep(6)
                                
                                # Background: download to FTP cache
                                asyncio.create_task(
                                    play_cog.youtube_downloader.background_download_for_cache(
                                        next_item.artist, next_item.title
                                    )
                                )
                        except Exception as e:
                            logger.warning(f"Streaming failed: {e}")
                    
                    # ========================================
                    # STEP 3: Fallback to download if no stream
                    # ========================================
                    if not audio_result and not use_streaming:
                        logger.info(f"Downloading: {next_item.title}")
                        audio_result = await play_cog._download_with_fallback(next_item, None)
                    
                    if not audio_result and not use_streaming:
                        logger.error(f"Failed all methods: {next_item.title}")
                        if loading_msg:
                            try:
                                await loading_msg.delete()
                            except:
                                pass
                        return await self._play_next_from_queue()
                    
                    # Update loading message - processing metadata
                    try:
                        if loading_msg:
                            loading_embed = EmbedBuilder.create_loading(
                                "⏭️ Loading Next Track...",
                                f"**{next_item.title}**\n*{next_item.artist}*\n\n"
                                f"🎨 Processing metadata & artwork..."
                            )
                            await loading_msg.edit(embed=loading_embed)
                    except discord.HTTPException:
                        pass
                    
                    # Process metadata
                    voice_ch_id = getattr(next_item, 'voice_channel_id', None)
                    orig_requested_by = getattr(next_item, 'requested_by', None)
                    orig_requested_by_id = getattr(next_item, 'requested_by_id', 0)
                    
                    next_metadata = await play_cog.metadata_processor.process(
                        next_item,
                        audio_result,
                        requested_by=orig_requested_by or "Queue",
                        requested_by_id=orig_requested_by_id or 0,
                        prefer_apple_artwork=True,
                        voice_channel_id=voice_ch_id
                    )
                    
                    if use_streaming and stream_url:
                        next_metadata.stream_url = stream_url
                    
                    # ========================================
                    # STEP 4: Trigger on_track_started to prepare next
                    # ========================================
                    try:
                        from services.audio.playlist_cache import get_playlist_cache
                        playlist_cache = get_playlist_cache()
                        asyncio.create_task(
                            playlist_cache.on_track_started(current_queue_idx, queue_items)
                        )
                    except Exception as e:
                        logger.debug(f"on_track_started failed: {e}")
                    
                except Exception as e:
                    logger.error(f"Failed to process next track: {e}")
                    return await self._play_next_from_queue()
                
            elif isinstance(next_item, MetadataInfo):
                # Already processed, ready to play
                next_metadata = next_item
            else:
                logger.error(f"Unknown queue item type: {type(next_item)}")
                return
            
            # Get volume setting
            volume = 1.0
            volume_cog = self.bot.get_cog('VolumeCommands')
            if volume_cog:
                volume_level = volume_cog.get_volume(self.guild_id)
                volume = volume_level / 100.0
            
            # Delete old player message and create new one
            # This keeps the player fresh and accessible at bottom of chat
            from .menu_view import MediaPlayerView
            view = MediaPlayerView(self.bot, self.guild_id, timeout=None)
            
            try:
                # Delete old message first
                await self.message.delete()
                logger.debug("Deleted old player message")
            except Exception as e:
                logger.warning(f"Could not delete old message: {e}")
            
            # Send new player message
            try:
                player_msg = await self.message.channel.send(
                    embed=EmbedBuilder.create_now_playing(
                        metadata=next_metadata,
                        progress_bar="",
                        lyrics_lines=["", "", ""],
                        guild_id=self.guild_id
                    ),
                    view=view
                )
                self.message = player_msg
                
                # Store player message for future deletion
                if hasattr(self.bot, 'player_messages'):
                    self.bot.player_messages[self.guild_id] = player_msg
                
                # Delete loading message now that player is ready
                if loading_msg:
                    try:
                        await loading_msg.delete()
                    except:
                        pass
                
                logger.info(f"✓ Created new player message for: {next_metadata.title}")
            except Exception as e:
                logger.error(f"Failed to send new player message: {e}")
                if loading_msg:
                    try:
                        await loading_msg.delete()
                    except:
                        pass
                return
            
            # Update metadata
            self.metadata = next_metadata
            
            # Update player reference - CRITICAL: always set this for lyrics/API to work
            if not hasattr(self.bot, 'players'):
                self.bot.players = {}
            self.bot.players[self.guild_id] = self
            
            # Update voice channel status
            await self._update_voice_channel_status(
                f"🎵 NOW PLAYING: {next_metadata.title[:30]} - {next_metadata.artist[:20]}"
            )
            
            # Start playback - streaming or file-based
            if hasattr(next_metadata, 'stream_url') and next_metadata.stream_url:
                await self.start_from_stream(next_metadata.stream_url, volume=volume)
                logger.info(f"🌐 Streaming from queue: {next_metadata.title}")
            else:
                await self.start(volume=volume)
                logger.info(f"🎵 Playing from queue: {next_metadata.title}")
            
        except Exception as e:
            logger.error(f"Failed to play next from queue: {e}", exc_info=True)
