"""Logging configuration for the application"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from .settings import Settings


class WinError995Filter(logging.Filter):
    """Filter to suppress harmless Windows ProactorEventLoop pipe errors"""
    
    SUPPRESS_PATTERNS = [
        'Error on reading from the event loop self pipe',
        'WinError 995',
        'The I/O operation has been aborted',
        'ConnectionResetError',
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Return False to suppress the log record, True to allow it"""
        message = record.getMessage()
        for pattern in self.SUPPRESS_PATTERNS:
            if pattern in message:
                return False
        return True


def setup_logging(
    level: int = logging.INFO,
    log_to_file: bool = True,
    log_to_console: bool = True
) -> logging.Logger:
    """
    Setup logging configuration
    
    Args:
        level: Logging level (default: INFO)
        log_to_file: Whether to log to file (default: True)
        log_to_console: Whether to log to console (default: True)
    
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger('discord_music_bot')
    logger.setLevel(level)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(simple_formatter)
        # Add Windows pipe error filter (harmless asyncio errors)
        if sys.platform == 'win32':
            console_handler.addFilter(WinError995Filter())
        logger.addHandler(console_handler)
    
    # Suppress asyncio logger errors on Windows (ProactorEventLoop pipe errors)
    if sys.platform == 'win32':
        asyncio_logger = logging.getLogger('asyncio')
        asyncio_logger.addFilter(WinError995Filter())
    
    # File handlers
    if log_to_file:
        # Ensure logs directory exists
        Settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Main log file (INFO and above)
        main_handler = RotatingFileHandler(
            Settings.LOGS_DIR / 'bot.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        main_handler.setLevel(logging.INFO)
        main_handler.setFormatter(detailed_formatter)
        logger.addHandler(main_handler)
        
        # Error log file (ERROR and above)
        error_handler = RotatingFileHandler(
            Settings.LOGS_DIR / 'errors.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        logger.addHandler(error_handler)
        
        # Audio operations log
        audio_handler = RotatingFileHandler(
            Settings.LOGS_DIR / 'audio.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=3,
            encoding='utf-8'
        )
        audio_handler.setLevel(logging.DEBUG)
        audio_handler.setFormatter(detailed_formatter)
        
        # Create audio logger
        audio_logger = logging.getLogger('discord_music_bot.audio')
        audio_logger.addHandler(audio_handler)
    
    logger.info("Logging system initialized")
    return logger


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name (default: root music bot logger)
    
    Returns:
        Logger instance
    """
    if name:
        return logging.getLogger(f'discord_music_bot.{name}')
    return logging.getLogger('discord_music_bot')
