"""
Active Audio Files Registry

Tracks which audio files are currently being used by which guild.
Prevents accidental deletion of active files by cleanup processes.
"""

from pathlib import Path
from typing import Dict, Set
import threading

from config.logging_config import get_logger

logger = get_logger('audio.registry')


class AudioFileRegistry:
    """
    Registry to track active audio files per guild.
    
    Prevents:
    - Startup cleanup from deleting active files
    - FTP failure cleanup from deleting playing files
    - Cross-server deletion issues
    """
    
    def __init__(self):
        self._active_files: Dict[int, Set[Path]] = {}  # guild_id -> set of file paths
        self._lock = threading.Lock()
        logger.info("AudioFileRegistry initialized")
    
    def register(self, guild_id: int, file_path: Path) -> None:
        """Register a file as active for a guild."""
        with self._lock:
            if guild_id not in self._active_files:
                self._active_files[guild_id] = set()
            self._active_files[guild_id].add(file_path)
            logger.debug(f"[Registry] Registered: {file_path.name} for guild {guild_id}")
    
    def unregister(self, guild_id: int, file_path: Path) -> None:
        """Unregister a file (no longer active)."""
        with self._lock:
            if guild_id in self._active_files:
                self._active_files[guild_id].discard(file_path)
                logger.debug(f"[Registry] Unregistered: {file_path.name} for guild {guild_id}")
    
    def is_active(self, file_path: Path) -> bool:
        """Check if a file is currently active (used by any guild)."""
        with self._lock:
            for guild_id, files in self._active_files.items():
                if file_path in files:
                    return True
            return False
    
    def get_active_for_guild(self, guild_id: int) -> Set[Path]:
        """Get all active files for a guild."""
        with self._lock:
            return self._active_files.get(guild_id, set()).copy()
    
    def get_all_active(self) -> Set[Path]:
        """Get all active files across all guilds."""
        with self._lock:
            all_files = set()
            for files in self._active_files.values():
                all_files.update(files)
            return all_files
    
    def clear_guild(self, guild_id: int) -> None:
        """Clear all active files for a guild."""
        with self._lock:
            if guild_id in self._active_files:
                del self._active_files[guild_id]
                logger.debug(f"[Registry] Cleared all files for guild {guild_id}")


# Global registry instance
_registry: AudioFileRegistry = None


def get_audio_registry() -> AudioFileRegistry:
    """Get or create global AudioFileRegistry instance."""
    global _registry
    if _registry is None:
        _registry = AudioFileRegistry()
    return _registry
