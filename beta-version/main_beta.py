#!/usr/bin/env python3
"""
Discord Music Bot - Beta Version
Commands use -beta suffix to run alongside stable version
"""

import sys
import os
import signal
import asyncio
from pathlib import Path
import discord
from discord.ext import commands

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import Settings
from config.logging_config import setup_logging, get_logger
from core.bot import MusicBot

# Beta-specific configuration
LOCK_FILE = Path(__file__).parent / '.bot_beta_instance.lock'
COMMAND_SUFFIX = "-beta"
BETA_VERSION = "3.4.0-beta"

logger = get_logger('beta')

# Web dashboard configuration for beta
ENABLE_WEB_DASHBOARD = os.getenv('ENABLE_WEB_DASHBOARD', 'true').lower() == 'true'
WEB_DASHBOARD_HOST = os.getenv('WEB_DASHBOARD_HOST', '0.0.0.0')
WEB_DASHBOARD_PORT = int(os.getenv('WEB_DASHBOARD_PORT', '5001'))  # Different port for beta


class BetaMusicBot(MusicBot):
    """Beta version of Music Bot with -beta suffix on commands"""
    
    def __init__(self):
        """Initialize beta bot"""
        super().__init__()
        self.command_suffix = COMMAND_SUFFIX
        self.beta_version = BETA_VERSION
        logger.info(f"🧪 Beta bot initialized with suffix: {COMMAND_SUFFIX}")
    
    async def setup_hook(self):
        """Setup hook for beta bot"""
        logger.info("🧪 Running beta setup hook...")
        
        # Connect to database
        await self.db_manager.connect()
        
        # Load commands with beta suffix
        await self.load_beta_commands()
    
    async def load_beta_commands(self):
        """Load commands and rename them with -beta suffix"""
        try:
            logger.info("Loading beta commands...")
            
            # Load command cogs (they will register with original names first)
            await self.load_extension('commands.play')
            await self.load_extension('commands.control')
            await self.load_extension('commands.queue')
            await self.load_extension('commands.volume')
            await self.load_extension('commands.stats')
            await self.load_extension('commands.admin')
            
            # Now rename all commands to add -beta suffix
            await self.rename_commands_with_suffix()
            
            logger.info(f"✓ Beta commands loaded with suffix: {COMMAND_SUFFIX}")
        
        except Exception as e:
            logger.error(f"Failed to load beta commands: {e}", exc_info=True)
    
    async def rename_commands_with_suffix(self):
        """Rename all registered commands to add -beta suffix"""
        renamed_commands = []
        
        # Get all registered commands
        for command in self.tree.get_commands():
            old_name = command.name
            new_name = f"{old_name}{COMMAND_SUFFIX}"
            
            # Update command name
            command.name = new_name
            renamed_commands.append(f"{old_name} → {new_name}")
            
            logger.debug(f"Renamed command: {old_name} → {new_name}")
        
        logger.info(f"✓ Renamed {len(renamed_commands)} commands with suffix")
        return renamed_commands


def check_and_kill_existing_instance(logger):
    """Check if another beta instance is running and kill it"""
    if LOCK_FILE.exists():
        try:
            with open(LOCK_FILE, 'r') as f:
                old_pid = int(f.read().strip())
            
            try:
                os.kill(old_pid, 0)
                logger.warning(f"⚠️  Found existing beta instance (PID: {old_pid})")
                logger.info("🔄 Terminating old beta instance...")
                
                try:
                    os.kill(old_pid, signal.SIGTERM)
                    import time
                    time.sleep(2)
                    
                    try:
                        os.kill(old_pid, 0)
                        logger.warning("⚠️  Old instance still running, force killing...")
                        os.kill(old_pid, signal.SIGKILL)
                        time.sleep(0.5)
                    except ProcessLookupError:
                        pass
                    
                    logger.info("✓ Old beta instance terminated")
                
                except ProcessLookupError:
                    logger.debug("Old instance already terminated")
            
            except ProcessLookupError:
                logger.debug("Lock file exists but process not running")
        
        except Exception as e:
            logger.warning(f"Could not check/kill old instance: {e}")
        
        try:
            LOCK_FILE.unlink()
        except:
            pass
    
    try:
        with open(LOCK_FILE, 'w') as f:
            f.write(str(os.getpid()))
        logger.debug(f"Created lock file (PID: {os.getpid()})")
    except Exception as e:
        logger.error(f"Could not create lock file: {e}")


def cleanup_lock_file():
    """Remove lock file on exit"""
    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
    except:
        pass


def main():
    """Main entry point for beta bot"""
    logger = setup_logging()
    
    check_and_kill_existing_instance(logger)
    
    logger.info("=" * 80)
    logger.info(f"🧪 SONORA Bot {BETA_VERSION} - BETA VERSION STARTING...")
    logger.info(f"⚠️  WARNING: Commands use {COMMAND_SUFFIX} suffix!")
    logger.info(f"📝 Example: /play{COMMAND_SUFFIX}, /pause{COMMAND_SUFFIX}, /queue{COMMAND_SUFFIX}")
    logger.info("=" * 80)
    
    # Load Opus library
    import discord
    if not discord.opus.is_loaded():
        try:
            discord.opus.load_opus()
            logger.info("✓ Opus library loaded")
        except Exception as e:
            logger.warning(f"Trying to find opus: {e}")
            
            opus_paths = [
                '/opt/homebrew/lib/libopus.dylib',
                '/usr/local/lib/libopus.dylib',
                '/opt/homebrew/opt/opus/lib/libopus.dylib',
            ]
            
            for path in opus_paths:
                try:
                    discord.opus.load_opus(path)
                    if discord.opus.is_loaded():
                        logger.info(f"✓ Opus loaded from: {path}")
                        break
                except:
                    continue
    
    # Validate configuration
    if not Settings.validate():
        logger.error("Configuration validation failed!")
        sys.exit(1)
    
    logger.info("✓ Configuration validated")
    
    # Create and run beta bot
    try:
        bot = BetaMusicBot()
        
        # Start web dashboard if enabled
        if ENABLE_WEB_DASHBOARD:
            try:
                from web.app import set_bot_instance, start_web_server_thread
                
                set_bot_instance(bot)
                import time
                bot._start_time = time.time()
                
                web_thread = start_web_server_thread(
                    host=WEB_DASHBOARD_HOST,
                    port=WEB_DASHBOARD_PORT
                )
                
                logger.info(f"✓ Beta web dashboard: http://{WEB_DASHBOARD_HOST}:{WEB_DASHBOARD_PORT}")
            except Exception as e:
                logger.warning(f"Failed to start web dashboard: {e}")
        
        # Run bot
        bot.run_bot()
    
    except KeyboardInterrupt:
        logger.info("Beta bot stopped by user (Ctrl+C)")
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        cleanup_lock_file()


if __name__ == "__main__":
    main()
