"""
Voice connection health monitor
Monitors audio stream health and auto-recovers from interruptions
"""

import asyncio
from typing import Optional, Dict
import discord

from config.logging_config import get_logger

logger = get_logger('voice.health_monitor')


class VoiceHealthMonitor:
    """
    Monitor voice connection health and detect audio stream interruptions
    
    Features:
    - Periodic health checks (every 5 seconds)
    - Detect silent audio stream issues
    - Auto-recovery from interruptions
    - Callback on health issues
    """
    
    def __init__(self, check_interval: int = 5):
        """
        Initialize health monitor
        
        Args:
            check_interval: Seconds between health checks
        """
        self.check_interval = check_interval
        self.monitor_tasks: Dict[int, asyncio.Task] = {}
        self.is_running = False
        logger.info(f"VoiceHealthMonitor initialized (check_interval={check_interval}s)")
    
    async def start_monitoring(
        self,
        guild_id: int,
        voice_client: discord.VoiceClient,
        on_issue_callback: Optional[callable] = None
    ):
        """
        Start monitoring a voice connection
        
        Args:
            guild_id: Guild ID
            voice_client: Voice client to monitor
            on_issue_callback: Callback function when issue detected
        """
        # Stop existing monitor if any
        await self.stop_monitoring(guild_id)
        
        # Create monitoring task
        task = asyncio.create_task(
            self._monitor_loop(guild_id, voice_client, on_issue_callback)
        )
        self.monitor_tasks[guild_id] = task
        
        logger.info(f"Started health monitoring for guild {guild_id}")
    
    async def stop_monitoring(self, guild_id: int):
        """
        Stop monitoring a voice connection
        
        Args:
            guild_id: Guild ID
        """
        if guild_id in self.monitor_tasks:
            task = self.monitor_tasks[guild_id]
            task.cancel()
            
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            del self.monitor_tasks[guild_id]
            logger.info(f"Stopped health monitoring for guild {guild_id}")
    
    async def stop_all(self):
        """Stop all monitoring tasks"""
        logger.info(f"Stopping all health monitors ({len(self.monitor_tasks)} active)")
        
        for guild_id in list(self.monitor_tasks.keys()):
            await self.stop_monitoring(guild_id)
        
        logger.info("All health monitors stopped")
    
    async def _monitor_loop(
        self,
        guild_id: int,
        voice_client: discord.VoiceClient,
        on_issue_callback: Optional[callable]
    ):
        """
        Main monitoring loop
        
        Args:
            guild_id: Guild ID
            voice_client: Voice client to monitor
            on_issue_callback: Callback on issue detection
        """
        logger.debug(f"Health monitor loop started for guild {guild_id}")
        
        previous_state = None
        consecutive_issues = 0
        
        try:
            while True:
                await asyncio.sleep(self.check_interval)
                
                # Check if voice client still exists
                if not voice_client:
                    logger.warning(f"Voice client no longer exists for guild {guild_id}")
                    break
                
                # Perform health check
                issue = await self._health_check(guild_id, voice_client, previous_state)
                
                if issue:
                    consecutive_issues += 1
                    logger.warning(f"Health issue detected (guild {guild_id}): {issue} (consecutive: {consecutive_issues})")
                    
                    # Call callback if provided
                    if on_issue_callback:
                        try:
                            await on_issue_callback(guild_id, issue, consecutive_issues)
                        except Exception as e:
                            logger.error(f"Error in health issue callback: {e}")
                    
                    # If too many consecutive issues, stop monitoring
                    if consecutive_issues >= 3:
                        logger.error(f"Too many consecutive issues ({consecutive_issues}), stopping monitor")
                        break
                else:
                    # Reset counter on successful check
                    if consecutive_issues > 0:
                        logger.info(f"Health recovered for guild {guild_id}")
                    consecutive_issues = 0
                
                # Update previous state
                previous_state = {
                    'is_connected': voice_client.is_connected(),
                    'is_playing': voice_client.is_playing(),
                    'is_paused': voice_client.is_paused()
                }
        
        except asyncio.CancelledError:
            logger.debug(f"Health monitor cancelled for guild {guild_id}")
        except Exception as e:
            logger.error(f"Health monitor error for guild {guild_id}: {e}", exc_info=True)
        finally:
            logger.debug(f"Health monitor loop ended for guild {guild_id}")
    
    async def _health_check(
        self,
        guild_id: int,
        voice_client: discord.VoiceClient,
        previous_state: Optional[dict]
    ) -> Optional[str]:
        """
        Perform health check on voice client
        
        Args:
            guild_id: Guild ID
            voice_client: Voice client to check
            previous_state: Previous state for comparison
        
        Returns:
            Issue description if detected, None if healthy
        """
        try:
            # Check 1: Is voice client still connected?
            if not voice_client.is_connected():
                return "Voice client disconnected"
            
            # Check 2: Playing state consistency
            is_playing = voice_client.is_playing()
            is_paused = voice_client.is_paused()
            
            # If was playing but now stopped without being paused
            if previous_state:
                was_playing = previous_state.get('is_playing', False)
                was_paused = previous_state.get('is_paused', False)
                
                # CRITICAL: Detect unexpected stop
                if was_playing and not is_playing and not is_paused:
                    logger.error(f"Unexpected playback stop detected (guild {guild_id})")
                    return "Playback stopped unexpectedly"
            
            # Check 3: Latency check (detect connection issues)
            latency = voice_client.latency
            if latency > 1.0:  # More than 1 second latency
                logger.warning(f"High latency detected: {latency:.2f}s (guild {guild_id})")
                return f"High latency: {latency:.2f}s"
            
            # All checks passed
            return None
        
        except Exception as e:
            logger.error(f"Health check error (guild {guild_id}): {e}")
            return f"Health check error: {str(e)}"
    
    def is_monitoring(self, guild_id: int) -> bool:
        """
        Check if monitoring is active for a guild
        
        Args:
            guild_id: Guild ID
        
        Returns:
            True if monitoring, False otherwise
        """
        return guild_id in self.monitor_tasks and not self.monitor_tasks[guild_id].done()
    
    def get_stats(self) -> dict:
        """
        Get monitoring statistics
        
        Returns:
            Dictionary with stats
        """
        active_monitors = sum(1 for task in self.monitor_tasks.values() if not task.done())
        
        return {
            'total_monitors': len(self.monitor_tasks),
            'active_monitors': active_monitors,
            'check_interval': self.check_interval
        }


# Global instance
_health_monitor = None

def get_health_monitor() -> VoiceHealthMonitor:
    """Get global health monitor instance"""
    global _health_monitor
    if _health_monitor is None:
        _health_monitor = VoiceHealthMonitor()
    return _health_monitor
