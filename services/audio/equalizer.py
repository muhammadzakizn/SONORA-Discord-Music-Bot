"""
Audio Equalizer System
Provides EQ presets and custom EQ settings
"""

import json
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from config.logging_config import get_logger

logger = get_logger('audio.equalizer')


@dataclass
class EqualizerSettings:
    """Equalizer settings (10-band)"""
    # Frequency bands (Hz): 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
    band_32hz: float = 0.0      # Bass
    band_64hz: float = 0.0      # Bass
    band_125hz: float = 0.0     # Bass
    band_250hz: float = 0.0     # Low Mid
    band_500hz: float = 0.0     # Mid
    band_1khz: float = 0.0      # Mid
    band_2khz: float = 0.0      # High Mid
    band_4khz: float = 0.0      # High
    band_8khz: float = 0.0      # High
    band_16khz: float = 0.0     # Treble
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'EqualizerSettings':
        """Create from dictionary"""
        return cls(**data)
    
    def to_ffmpeg_filter(self) -> str:
        """
        Convert EQ settings to FFmpeg equalizer filter
        
        Returns:
            FFmpeg filter string
        """
        # FFmpeg equalizer format: equalizer=f=freq:t=q:w=width:g=gain
        # We'll use superequalizer (10-band graphic equalizer)
        filters = []
        
        bands = [
            (32, self.band_32hz),
            (64, self.band_64hz),
            (125, self.band_125hz),
            (250, self.band_250hz),
            (500, self.band_500hz),
            (1000, self.band_1khz),
            (2000, self.band_2khz),
            (4000, self.band_4khz),
            (8000, self.band_8khz),
            (16000, self.band_16khz)
        ]
        
        for freq, gain in bands:
            if gain != 0.0:
                # equalizer=f=frequency:t=h:width=width:g=gain
                # t=h for high-shelf, t=l for low-shelf, default for peak
                filters.append(f"equalizer=f={freq}:t=q:w=200:g={gain}")
        
        if not filters:
            return ""
        
        return ",".join(filters)


class EqualizerPresets:
    """Predefined EQ presets"""
    
    FLAT = EqualizerSettings(
        # No changes (flat response)
    )
    
    BASS_BOOST = EqualizerSettings(
        band_32hz=8.0,
        band_64hz=6.0,
        band_125hz=4.0,
        band_250hz=2.0,
        band_500hz=0.0,
        band_1khz=0.0,
        band_2khz=0.0,
        band_4khz=0.0,
        band_8khz=0.0,
        band_16khz=0.0
    )
    
    TREBLE_BOOST = EqualizerSettings(
        band_32hz=0.0,
        band_64hz=0.0,
        band_125hz=0.0,
        band_250hz=0.0,
        band_500hz=0.0,
        band_1khz=0.0,
        band_2khz=2.0,
        band_4khz=4.0,
        band_8khz=6.0,
        band_16khz=8.0
    )
    
    VOCAL_BOOST = EqualizerSettings(
        band_32hz=-2.0,
        band_64hz=-1.0,
        band_125hz=0.0,
        band_250hz=2.0,
        band_500hz=4.0,
        band_1khz=6.0,
        band_2khz=4.0,
        band_4khz=2.0,
        band_8khz=0.0,
        band_16khz=-1.0
    )
    
    ROCK = EqualizerSettings(
        band_32hz=5.0,
        band_64hz=4.0,
        band_125hz=3.0,
        band_250hz=1.0,
        band_500hz=-1.0,
        band_1khz=-2.0,
        band_2khz=0.0,
        band_4khz=2.0,
        band_8khz=3.0,
        band_16khz=4.0
    )
    
    POP = EqualizerSettings(
        band_32hz=-1.0,
        band_64hz=0.0,
        band_125hz=2.0,
        band_250hz=4.0,
        band_500hz=5.0,
        band_1khz=5.0,
        band_2khz=4.0,
        band_4khz=2.0,
        band_8khz=0.0,
        band_16khz=-1.0
    )
    
    CLASSICAL = EqualizerSettings(
        band_32hz=4.0,
        band_64hz=3.0,
        band_125hz=2.0,
        band_250hz=2.0,
        band_500hz=0.0,
        band_1khz=-2.0,
        band_2khz=-2.0,
        band_4khz=0.0,
        band_8khz=2.0,
        band_16khz=3.0
    )
    
    JAZZ = EqualizerSettings(
        band_32hz=3.0,
        band_64hz=2.0,
        band_125hz=0.0,
        band_250hz=2.0,
        band_500hz=-1.0,
        band_1khz=-2.0,
        band_2khz=-1.0,
        band_4khz=0.0,
        band_8khz=2.0,
        band_16khz=3.0
    )
    
    ELECTRONIC = EqualizerSettings(
        band_32hz=6.0,
        band_64hz=5.0,
        band_125hz=3.0,
        band_250hz=0.0,
        band_500hz=-2.0,
        band_1khz=-2.0,
        band_2khz=0.0,
        band_4khz=3.0,
        band_8khz=5.0,
        band_16khz=6.0
    )
    
    @classmethod
    def get_preset(cls, name: str) -> Optional[EqualizerSettings]:
        """Get preset by name"""
        presets = {
            'flat': cls.FLAT,
            'bass_boost': cls.BASS_BOOST,
            'treble_boost': cls.TREBLE_BOOST,
            'vocal_boost': cls.VOCAL_BOOST,
            'rock': cls.ROCK,
            'pop': cls.POP,
            'classical': cls.CLASSICAL,
            'jazz': cls.JAZZ,
            'electronic': cls.ELECTRONIC
        }
        return presets.get(name.lower())
    
    @classmethod
    def get_all_presets(cls) -> Dict[str, EqualizerSettings]:
        """Get all available presets"""
        return {
            'Flat': cls.FLAT,
            'Bass Boost': cls.BASS_BOOST,
            'Treble Boost': cls.TREBLE_BOOST,
            'Vocal Boost': cls.VOCAL_BOOST,
            'Rock': cls.ROCK,
            'Pop': cls.POP,
            'Classical': cls.CLASSICAL,
            'Jazz': cls.JAZZ,
            'Electronic': cls.ELECTRONIC
        }


class EqualizerManager:
    """Manage EQ settings per guild"""
    
    def __init__(self):
        """Initialize EQ manager"""
        self.guild_settings: Dict[int, EqualizerSettings] = {}
        self.custom_presets: Dict[int, Dict[str, EqualizerSettings]] = {}  # guild_id -> {name: settings}
        logger.info("EqualizerManager initialized")
    
    def get_settings(self, guild_id: int) -> EqualizerSettings:
        """
        Get current EQ settings for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Current EQ settings (default: Flat)
        """
        return self.guild_settings.get(guild_id, EqualizerPresets.FLAT)
    
    def set_settings(self, guild_id: int, settings: EqualizerSettings):
        """
        Set EQ settings for guild
        
        Args:
            guild_id: Guild ID
            settings: EQ settings
        """
        self.guild_settings[guild_id] = settings
        logger.info(f"EQ settings updated for guild {guild_id}")
    
    def set_preset(self, guild_id: int, preset_name: str) -> bool:
        """
        Apply preset to guild
        
        Args:
            guild_id: Guild ID
            preset_name: Preset name
        
        Returns:
            True if successful, False if preset not found
        """
        preset = EqualizerPresets.get_preset(preset_name)
        if preset:
            self.set_settings(guild_id, preset)
            return True
        
        # Check custom presets
        if guild_id in self.custom_presets:
            if preset_name in self.custom_presets[guild_id]:
                self.set_settings(guild_id, self.custom_presets[guild_id][preset_name])
                return True
        
        return False
    
    def save_custom_preset(self, guild_id: int, name: str, settings: EqualizerSettings):
        """
        Save custom preset for guild
        
        Args:
            guild_id: Guild ID
            name: Preset name
            settings: EQ settings
        """
        if guild_id not in self.custom_presets:
            self.custom_presets[guild_id] = {}
        
        self.custom_presets[guild_id][name] = settings
        logger.info(f"Saved custom preset '{name}' for guild {guild_id}")
    
    def delete_custom_preset(self, guild_id: int, name: str) -> bool:
        """
        Delete custom preset
        
        Args:
            guild_id: Guild ID
            name: Preset name
        
        Returns:
            True if deleted, False if not found
        """
        if guild_id in self.custom_presets:
            if name in self.custom_presets[guild_id]:
                del self.custom_presets[guild_id][name]
                logger.info(f"Deleted custom preset '{name}' from guild {guild_id}")
                return True
        return False
    
    def get_custom_presets(self, guild_id: int) -> Dict[str, EqualizerSettings]:
        """
        Get custom presets for guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Dictionary of custom presets
        """
        return self.custom_presets.get(guild_id, {})
    
    def get_ffmpeg_filter(self, guild_id: int) -> str:
        """
        Get FFmpeg filter string for guild's EQ settings
        
        Args:
            guild_id: Guild ID
        
        Returns:
            FFmpeg filter string
        """
        settings = self.get_settings(guild_id)
        return settings.to_ffmpeg_filter()


# Global instance
_equalizer_manager = None

def get_equalizer_manager() -> EqualizerManager:
    """Get global equalizer manager instance"""
    global _equalizer_manager
    if _equalizer_manager is None:
        _equalizer_manager = EqualizerManager()
    return _equalizer_manager
