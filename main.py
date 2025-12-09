#!/usr/bin/env python3
"""
Discord Music Bot - Main Entry Point
Version 3.0 - Production Ready
"""

import sys
import os
import signal
import asyncio
from pathlib import Path
import discord

from config.settings import Settings
from config.logging_config import setup_logging
from core.bot import MusicBot

# Lock file to ensure single instance
LOCK_FILE = Path(__file__).parent / '.bot_instance.lock'

# Web dashboard flag
ENABLE_WEB_DASHBOARD = os.getenv('ENABLE_WEB_DASHBOARD', 'true').lower() == 'true'
WEB_DASHBOARD_HOST = os.getenv('WEB_DASHBOARD_HOST', '0.0.0.0')
WEB_DASHBOARD_PORT = int(os.getenv('WEB_DASHBOARD_PORT', '5000'))


def check_and_kill_existing_instance(logger):
    """Check if another instance is running and kill it"""
    if LOCK_FILE.exists():
        try:
            # Read PID from lock file
            with open(LOCK_FILE, 'r') as f:
                old_pid = int(f.read().strip())
            
            # Check if process is still running
            try:
                os.kill(old_pid, 0)  # Check if process exists (doesn't actually kill)
                logger.warning(f"⚠️  Found existing bot instance (PID: {old_pid})")
                logger.info("🔄 Terminating old instance...")
                
                # Try graceful shutdown first
                try:
                    os.kill(old_pid, signal.SIGTERM)
                    import time
                    time.sleep(2)
                    
                    # Check if still running
                    try:
                        os.kill(old_pid, 0)
                        # Still running, force kill
                        logger.warning("⚠️  Old instance still running, force killing...")
                        os.kill(old_pid, signal.SIGKILL)
                        time.sleep(0.5)
                    except ProcessLookupError:
                        pass  # Successfully terminated
                    
                    logger.info("✓ Old instance terminated")
                    
                except ProcessLookupError:
                    logger.debug("Old instance already terminated")
                
            except ProcessLookupError:
                # Process not running, just clean up lock file
                logger.debug("Lock file exists but process not running")
        
        except Exception as e:
            logger.warning(f"Could not check/kill old instance: {e}")
        
        # Remove old lock file
        try:
            LOCK_FILE.unlink()
        except OSError as e:
            logger.debug(f"Could not remove old lock file: {e}")
    
    # Create new lock file with current PID
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
    except OSError as e:
        # Ignore cleanup errors during shutdown
        pass

def main():
    """Main entry point"""
    # Setup logging
    logger = setup_logging()
    
    # Check and terminate any existing instance
    check_and_kill_existing_instance(logger)
    
    logger.info("=" * 60)
    logger.info("Discord Music Bot v3.0 - Starting...")
    logger.info("=" * 60)
    
    # Load Opus library (CRITICAL for voice)
    import discord
    if not discord.opus.is_loaded():
        try:
            discord.opus.load_opus()
            logger.info("✓ Opus library loaded")
        except Exception as e:
            logger.warning(f"Failed to load opus library: {e}")
            logger.warning("Trying to find opus in system...")
            
            # Try OS-specific paths from settings
            opus_paths = Settings.get_opus_paths()
            
            for path in opus_paths:
                try:
                    discord.opus.load_opus(path)
                    if discord.opus.is_loaded():
                        logger.info(f"✓ Opus loaded from: {path}")
                        break
                except Exception as opus_err:
                    logger.debug(f"Failed to load opus from {path}: {opus_err}")
                    continue
            
            if not discord.opus.is_loaded():
                logger.error("❌ Opus library not loaded! Voice may not work.")
                logger.error("Install with: brew install opus (macOS) or apt install libopus0 (Linux)")
    
    # Validate configuration
    if not Settings.validate():
        logger.error("Configuration validation failed! Exiting...")
        sys.exit(1)
    
    # Create and run bot
    try:
        bot = MusicBot()
        
        # Start web dashboard if enabled
        if ENABLE_WEB_DASHBOARD:
            try:
                from web.api.app import set_bot_instance, start_web_server_thread
                
                # Set bot instance for web dashboard API
                set_bot_instance(bot)
                
                # Store start time for uptime calculation
                import time
                bot._start_time = time.time()
                
                # Start Flask API server in background (for backend endpoints)
                web_thread = start_web_server_thread(
                    host=WEB_DASHBOARD_HOST,
                    port=WEB_DASHBOARD_PORT
                )
                
                logger.info(f"✓ API server started: http://{WEB_DASHBOARD_HOST}:{WEB_DASHBOARD_PORT}")
                
                # Start Next.js frontend (if available)
                import subprocess
                import threading
                
                next_dir = Path(__file__).parent / 'web'
                if (next_dir / 'package.json').exists():
                    def start_nextjs():
                        try:
                            subprocess.run(
                                ['npm', 'run', 'dev'],
                                cwd=str(next_dir),
                                capture_output=True
                            )
                        except Exception as e:
                            logger.warning(f"Next.js dashboard failed: {e}")
                    
                    next_thread = threading.Thread(target=start_nextjs, daemon=True)
                    next_thread.start()
                    logger.info("✓ Web dashboard started: http://localhost:3000")
                
            except ImportError as e:
                logger.warning(f"Web dashboard dependencies not installed: {e}")
                logger.warning("Install with: pip install flask flask-cors flask-socketio")
            except Exception as e:
                logger.error(f"Failed to start web dashboard: {e}")

        
        # Run bot
        bot.run_bot()
    
    except KeyboardInterrupt:
        logger.info("Bot stopped by user (Ctrl+C)")
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        # Always cleanup lock file on exit
        cleanup_lock_file()


if __name__ == "__main__":
    main()
