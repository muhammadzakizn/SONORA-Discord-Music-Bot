"""
Analytics Tracker for Discord Music Bot
Tracks commands, platforms, and play methods
"""

import aiosqlite
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

class AnalyticsTracker:
    """Track and analyze bot usage"""
    
    def __init__(self, db_path: str = "bot.db"):
        self.db_path = db_path
        
    async def init_tables(self):
        """Initialize analytics tables"""
        async with aiosqlite.connect(self.db_path) as db:
            # Read schema file
            schema_path = Path(__file__).parent.parent / "database" / "analytics_schema.sql"
            if schema_path.exists():
                with open(schema_path) as f:
                    await db.executescript(f.read())
                await db.commit()
                logger.info("Analytics tables initialized")
    
    # Command Tracking
    async def track_command(self, command_name: str, user_id: int, guild_id: int):
        """Track command usage"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    "INSERT INTO command_usage (command_name, user_id, guild_id) VALUES (?, ?, ?)",
                    (command_name, user_id, guild_id)
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to track command: {e}")
    
    async def get_command_stats(self, days: int = 30) -> List[Dict]:
        """Get most used commands"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                since = datetime.now() - timedelta(days=days)
                
                cursor = await db.execute("""
                    SELECT command_name, COUNT(*) as count
                    FROM command_usage
                    WHERE timestamp >= ?
                    GROUP BY command_name
                    ORDER BY count DESC
                    LIMIT 10
                """, (since,))
                
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get command stats: {e}")
            return []
    
    # Platform Tracking
    async def track_platform(self, platform: str, track_title: str, user_id: int, guild_id: int):
        """Track platform usage (spotify, youtube, apple_music)"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    "INSERT INTO platform_usage (platform, track_title, user_id, guild_id) VALUES (?, ?, ?, ?)",
                    (platform, track_title, user_id, guild_id)
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to track platform: {e}")
    
    async def get_platform_stats(self, days: int = 30) -> List[Dict]:
        """Get platform distribution"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                since = datetime.now() - timedelta(days=days)
                
                cursor = await db.execute("""
                    SELECT platform, COUNT(*) as count
                    FROM platform_usage
                    WHERE timestamp >= ?
                    GROUP BY platform
                    ORDER BY count DESC
                """, (since,))
                
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get platform stats: {e}")
            return []
    
    # Play Method Tracking
    async def track_play_method(self, method: str, track_title: str, user_id: int, guild_id: int):
        """Track play method (playlist, search, direct_url, album)"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    "INSERT INTO play_method (method, track_title, user_id, guild_id) VALUES (?, ?, ?, ?)",
                    (method, track_title, user_id, guild_id)
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to track play method: {e}")
    
    async def get_play_method_stats(self, days: int = 30) -> List[Dict]:
        """Get play method distribution"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                since = datetime.now() - timedelta(days=days)
                
                cursor = await db.execute("""
                    SELECT method, COUNT(*) as count
                    FROM play_method
                    WHERE timestamp >= ?
                    GROUP BY method
                    ORDER BY count DESC
                """, (since,))
                
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get play method stats: {e}")
            return []
    
    # User Preferences
    async def get_user_preferences(self, user_id: int) -> Dict:
        """Get user preferences"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    "SELECT * FROM user_preferences WHERE user_id = ?",
                    (user_id,)
                )
                row = await cursor.fetchone()
                
                if row:
                    return dict(row)
                else:
                    # Create default preferences
                    await db.execute(
                        "INSERT INTO user_preferences (user_id) VALUES (?)",
                        (user_id,)
                    )
                    await db.commit()
                    return {
                        'user_id': user_id,
                        'romanization_enabled': 1,
                        'translation_language': None,
                        'theme': 'dark'
                    }
        except Exception as e:
            logger.error(f"Failed to get user preferences: {e}")
            return {}
    
    async def update_user_preferences(self, user_id: int, **kwargs):
        """Update user preferences"""
        try:
            # Build update query
            fields = []
            values = []
            for key, value in kwargs.items():
                fields.append(f"{key} = ?")
                values.append(value)
            
            if not fields:
                return
            
            values.append(user_id)
            query = f"UPDATE user_preferences SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(query, values)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to update user preferences: {e}")
    
    # Download History
    async def track_download(self, user_id: int, track_title: str, track_artist: str,
                           download_type: str, format: str, file_path: str, file_size: int):
        """Track download"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO download_history 
                    (user_id, track_title, track_artist, download_type, format, file_path, file_size)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, track_title, track_artist, download_type, format, file_path, file_size))
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to track download: {e}")
    
    async def get_download_history(self, user_id: Optional[int] = None, limit: int = 50) -> List[Dict]:
        """Get download history"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                
                if user_id:
                    cursor = await db.execute("""
                        SELECT * FROM download_history
                        WHERE user_id = ?
                        ORDER BY timestamp DESC
                        LIMIT ?
                    """, (user_id, limit))
                else:
                    cursor = await db.execute("""
                        SELECT * FROM download_history
                        ORDER BY timestamp DESC
                        LIMIT ?
                    """, (limit,))
                
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get download history: {e}")
            return []


# Global instance
analytics = AnalyticsTracker()
