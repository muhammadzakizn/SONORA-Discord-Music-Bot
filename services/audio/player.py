"""Optimized audio player for Discord"""

import discord
from pathlib import Path
from typing import Optional, Callable
import asyncio

from config.settings import Settings
from config.logging_config import get_logger
from services.audio.equalizer import get_equalizer_manager

logger = get_logger('audio.player')


class OptimizedAudioPlayer:
    """
    Optimized audio player using FFmpegOpusAudio
    CPU usage: ~2% per channel (vs 10% dengan PCMAudio)
    """
    
    @staticmethod
    def create_audio_source(
        file_path: Path,
        bitrate: int = None,
        volume: float = 1.0,
        guild_id: int = None
    ) -> discord.AudioSource:
        """
        Create audio source optimized for Discord with volume control
        
        Args:
            file_path: Path to audio file
            bitrate: Bitrate in kbps (default: from settings)
            volume: Volume level (0.0 to 2.0, default: 1.0)
        
        Returns:
            Audio source with volume control
        
        NOTE: FFmpegOpusAudio cannot be wrapped with PCMVolumeTransformer.
        Use FFmpegPCMAudio for volume control, or FFmpegOpusAudio without volume.
        """
        if bitrate is None:
            bitrate = Settings.AUDIO_BITRATE
        
        try:
            # Get equalizer settings for this guild
            eq_manager = get_equalizer_manager()
            eq_settings = None
            eq_filter = ""
            if guild_id:
                eq_settings = eq_manager.get_settings(guild_id)
                eq_filter = eq_settings.to_ffmpeg_filter()
            
            # Build FFmpeg options with equalizer
            audio_filter = '-vn -ar 48000 -ac 2'
            
            if eq_filter:
                # Apply equalizer filter
                audio_filter = f'-vn -af "{eq_filter}" -ar 48000 -ac 2'
                logger.info(f"Applying equalizer filter")
            
            ffmpeg_options = {
                'options': audio_filter
            }
            
            # Use FFmpegPCMAudio for volume control support
            audio_source = discord.FFmpegPCMAudio(
                source=str(file_path),
                **ffmpeg_options
            )
            
            # Wrap with volume transformer
            audio_source = discord.PCMVolumeTransformer(audio_source, volume=volume)
            
            logger.debug(f"Created audio source: {file_path.name} @ {bitrate}kbps, volume={volume}")
            
            return audio_source
        
        except Exception as e:
            logger.error(f"Failed to create audio source: {e}", exc_info=True)
            raise
    
    @staticmethod
    def set_volume(voice_client: discord.VoiceClient, volume: float) -> bool:
        """
        Set volume of current playback
        
        Args:
            voice_client: Discord voice client
            volume: Volume level (0.0 to 2.0)
        
        Returns:
            True if volume set, False otherwise
        """
        try:
            if voice_client.source and isinstance(voice_client.source, discord.PCMVolumeTransformer):
                voice_client.source.volume = volume
                logger.info(f"Volume set to {volume}")
                return True
            else:
                logger.warning("Cannot set volume: source is not PCMVolumeTransformer")
                return False
        except Exception as e:
            logger.error(f"Failed to set volume: {e}")
            return False
    
    @staticmethod
    async def play_audio(
        voice_client: discord.VoiceClient,
        audio_source: discord.AudioSource,
        after_callback: Optional[Callable] = None
    ) -> None:
        """
        Play audio with error handling
        
        Args:
            voice_client: Discord voice client
            audio_source: Audio source to play
            after_callback: Callback function after playback ends
        
        Raises:
            Exception if playback fails
        """
        try:
            # Verify voice client is connected
            if not voice_client.is_connected():
                raise ConnectionError("Voice client is not connected")
            
            # Stop any current playback
            if voice_client.is_playing():
                voice_client.stop()
                await asyncio.sleep(0.5)  # Wait for stop
            
            # Create wrapper for callback with error handling
            def safe_callback(error):
                if error:
                    logger.error(f"Playback error: {error}")
                
                if after_callback:
                    try:
                        after_callback(error)
                    except Exception as e:
                        logger.error(f"Callback error: {e}", exc_info=True)
            
            # Start playback
            voice_client.play(audio_source, after=safe_callback)
            
            logger.info("Audio playback started")
        
        except Exception as e:
            logger.error(f"Failed to play audio: {e}", exc_info=True)
            raise
    
    @staticmethod
    def pause(voice_client: discord.VoiceClient) -> bool:
        """
        Pause playback
        
        Args:
            voice_client: Discord voice client
        
        Returns:
            True if paused, False otherwise
        """
        if voice_client.is_playing():
            voice_client.pause()
            logger.info("Playback paused")
            return True
        return False
    
    @staticmethod
    def resume(voice_client: discord.VoiceClient) -> bool:
        """
        Resume playback
        
        Args:
            voice_client: Discord voice client
        
        Returns:
            True if resumed, False otherwise
        """
        if voice_client.is_paused():
            voice_client.resume()
            logger.info("Playback resumed")
            return True
        return False
    
    @staticmethod
    def stop(voice_client: discord.VoiceClient) -> bool:
        """
        Stop playback
        
        Args:
            voice_client: Discord voice client
        
        Returns:
            True if stopped, False otherwise
        """
        if voice_client.is_playing() or voice_client.is_paused():
            voice_client.stop()
            logger.info("Playback stopped")
            return True
        return False
    
    @staticmethod
    def get_playback_state(voice_client: discord.VoiceClient) -> str:
        """
        Get current playback state
        
        Args:
            voice_client: Discord voice client
        
        Returns:
            State as string: 'playing', 'paused', 'stopped'
        """
        if voice_client.is_playing():
            return 'playing'
        elif voice_client.is_paused():
            return 'paused'
        else:
            return 'stopped'
