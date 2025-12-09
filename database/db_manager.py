"""Database manager for persistent storage"""

import sqlite3
import asyncio
import aiosqlite
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('database')


class DatabaseManager:
    """
    Database manager for bot persistent storage
    
    Features:
    - Play history tracking
    - User preferences (volume, equalizer)
    - Guild configurations
    - Statistics & analytics
    """
    
    # Whitelist of allowed column names for user preferences (SQL injection prevention)
    ALLOWED_PREFERENCE_KEYS = frozenset({
        'preferred_volume',
        'equalizer_preset',
        'auto_romanize'
    })
    
    # Whitelist of allowed column names for guild settings (SQL injection prevention)
    ALLOWED_GUILD_SETTING_KEYS = frozenset({
        'prefix',
        'dj_role_id',
        'auto_disconnect_empty',
        'auto_disconnect_timeout',
        'max_queue_size',
        'default_volume',
        'announce_songs'
    })
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialize database manager
        
        Args:
            db_path: Path to SQLite database file (default: BASE_DIR/bot.db)
        """
        self.db_path = db_path or Settings.BASE_DIR / 'bot.db'
        self.db: Optional[aiosqlite.Connection] = None
        logger.info(f"Database manager initialized: {self.db_path}")
    
    async def connect(self) -> None:
        """Connect to database and create tables if needed"""
        try:
            self.db = await aiosqlite.connect(str(self.db_path))
            # Enable foreign keys
            await self.db.execute("PRAGMA foreign_keys = ON")
            await self._create_tables()
            logger.info("✓ Database connected and tables initialized")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from database"""
        if self.db:
            await self.db.close()
            self.db = None
            logger.info("Database disconnected")
    
    async def _create_tables(self) -> None:
        """Create database tables if they don't exist"""
        
        # Play history table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS play_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                duration REAL NOT NULL,
                source TEXT NOT NULL,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed BOOLEAN DEFAULT 1
            )
        """)
        
        # User preferences table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY,
                guild_id INTEGER NOT NULL,
                preferred_volume INTEGER DEFAULT 100,
                equalizer_preset TEXT DEFAULT 'flat',
                auto_romanize BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Guild settings table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id INTEGER PRIMARY KEY,
                prefix TEXT DEFAULT '/',
                dj_role_id INTEGER,
                auto_disconnect_empty BOOLEAN DEFAULT 1,
                auto_disconnect_timeout INTEGER DEFAULT 300,
                max_queue_size INTEGER DEFAULT 100,
                default_volume INTEGER DEFAULT 100,
                announce_songs BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Favorites table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                guild_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                url TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, title, artist)
            )
        """)
        
        # Queue history table (for analytics)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS queue_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER NOT NULL,
                date DATE NOT NULL,
                total_tracks INTEGER DEFAULT 0,
                total_duration REAL DEFAULT 0,
                unique_users INTEGER DEFAULT 0,
                UNIQUE(guild_id, date)
            )
        """)
        
        # Create indexes for performance
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_play_history_guild 
            ON play_history(guild_id, played_at DESC)
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_play_history_user 
            ON play_history(user_id, played_at DESC)
        """)
        
        await self.db.commit()
        logger.info("✓ Database tables created/verified")
    
    # ==================== PLAY HISTORY ====================
    
    async def add_play_history(
        self,
        guild_id: int,
        user_id: int,
        username: str,
        title: str,
        artist: str,
        duration: float,
        source: str,
        album: Optional[str] = None,
        completed: bool = True
    ) -> int:
        """
        Add play history entry
        
        Args:
            guild_id: Guild ID
            user_id: User ID
            username: Username
            title: Track title
            artist: Artist name
            duration: Track duration in seconds
            source: Audio source (Spotify, YouTube, etc)
            album: Album name (optional)
            completed: Whether track was played to completion
        
        Returns:
            Entry ID
        """
        cursor = await self.db.execute("""
            INSERT INTO play_history 
            (guild_id, user_id, username, title, artist, album, duration, source, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (guild_id, user_id, username, title, artist, album, duration, source, completed))
        
        await self.db.commit()
        logger.debug(f"Added play history: {title} by {artist}")
        return cursor.lastrowid
    
    async def find_track_in_history(
        self,
        title: str,
        artist: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Find track in play history (untuk cek apakah sudah pernah di-download)
        
        Args:
            title: Track title
            artist: Artist name (optional)
        
        Returns:
            Track info if found, None otherwise
        """
        query = "SELECT * FROM play_history WHERE title = ?"
        params = [title]
        
        if artist:
            query += " AND artist = ?"
            params.append(artist)
        
        query += " ORDER BY played_at DESC LIMIT 1"
        
        async with self.db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
        
        return None
    
    async def get_play_history(
        self,
        guild_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get play history
        
        Args:
            guild_id: Filter by guild (optional)
            user_id: Filter by user (optional)
            limit: Maximum number of entries
        
        Returns:
            List of play history entries
        """
        query = "SELECT * FROM play_history WHERE 1=1"
        params = []
        
        if guild_id:
            query += " AND guild_id = ?"
            params.append(guild_id)
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY played_at DESC LIMIT ?"
        params.append(limit)
        
        async with self.db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    async def get_user_stats(self, user_id: int, guild_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get user listening statistics
        
        Args:
            user_id: User ID
            guild_id: Filter by guild (optional)
        
        Returns:
            Statistics dictionary
        """
        query_base = "FROM play_history WHERE user_id = ?"
        params = [user_id]
        
        if guild_id:
            query_base += " AND guild_id = ?"
            params.append(guild_id)
        
        # Total plays
        async with self.db.execute(f"SELECT COUNT(*) {query_base}", params) as cursor:
            total_plays = (await cursor.fetchone())[0]
        
        # Total duration
        async with self.db.execute(f"SELECT SUM(duration) {query_base}", params) as cursor:
            total_duration = (await cursor.fetchone())[0] or 0
        
        # Top artists
        async with self.db.execute(f"""
            SELECT artist, COUNT(*) as count 
            {query_base}
            GROUP BY artist 
            ORDER BY count DESC 
            LIMIT 5
        """, params) as cursor:
            top_artists = [{"artist": row[0], "count": row[1]} for row in await cursor.fetchall()]
        
        # Recent tracks
        async with self.db.execute(f"""
            SELECT title, artist, played_at 
            {query_base}
            ORDER BY played_at DESC 
            LIMIT 10
        """, params) as cursor:
            recent_tracks = [
                {"title": row[0], "artist": row[1], "played_at": row[2]} 
                for row in await cursor.fetchall()
            ]
        
        return {
            "total_plays": total_plays,
            "total_duration": total_duration,
            "top_artists": top_artists,
            "recent_tracks": recent_tracks
        }
    
    # ==================== USER PREFERENCES ====================
    
    async def get_user_preferences(self, user_id: int, guild_id: int) -> Dict[str, Any]:
        """
        Get user preferences
        
        Args:
            user_id: User ID
            guild_id: Guild ID
        
        Returns:
            Preferences dictionary
        """
        async with self.db.execute("""
            SELECT * FROM user_preferences 
            WHERE user_id = ? AND guild_id = ?
        """, (user_id, guild_id)) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            else:
                # Return defaults
                return {
                    "preferred_volume": 100,
                    "equalizer_preset": "flat",
                    "auto_romanize": True
                }
    
    async def set_user_preference(
        self,
        user_id: int,
        guild_id: int,
        key: str,
        value: Any
    ) -> None:
        """
        Set user preference
        
        Args:
            user_id: User ID
            guild_id: Guild ID
            key: Preference key (must be in ALLOWED_PREFERENCE_KEYS)
            value: Preference value
        
        Raises:
            ValueError: If key is not in allowed whitelist
        """
        # SQL injection prevention: validate key against whitelist
        if key not in self.ALLOWED_PREFERENCE_KEYS:
            raise ValueError(
                f"Invalid preference key: '{key}'. "
                f"Allowed keys: {', '.join(sorted(self.ALLOWED_PREFERENCE_KEYS))}"
            )
        
        await self.db.execute(f"""
            INSERT INTO user_preferences (user_id, guild_id, {key})
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                {key} = excluded.{key},
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, guild_id, value))
        
        await self.db.commit()
        logger.debug(f"Set user preference: {user_id} - {key}={value}")
    
    # ==================== GUILD SETTINGS ====================
    
    async def get_guild_settings(self, guild_id: int) -> Dict[str, Any]:
        """
        Get guild settings
        
        Args:
            guild_id: Guild ID
        
        Returns:
            Settings dictionary
        """
        async with self.db.execute("""
            SELECT * FROM guild_settings WHERE guild_id = ?
        """, (guild_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            else:
                # Return defaults
                return {
                    "prefix": "/",
                    "dj_role_id": None,
                    "auto_disconnect_empty": True,
                    "auto_disconnect_timeout": 300,
                    "max_queue_size": 100,
                    "default_volume": 100,
                    "announce_songs": True
                }
    
    async def set_guild_setting(
        self,
        guild_id: int,
        key: str,
        value: Any
    ) -> None:
        """
        Set guild setting
        
        Args:
            guild_id: Guild ID
            key: Setting key (must be in ALLOWED_GUILD_SETTING_KEYS)
            value: Setting value
        
        Raises:
            ValueError: If key is not in allowed whitelist
        """
        # SQL injection prevention: validate key against whitelist
        if key not in self.ALLOWED_GUILD_SETTING_KEYS:
            raise ValueError(
                f"Invalid guild setting key: '{key}'. "
                f"Allowed keys: {', '.join(sorted(self.ALLOWED_GUILD_SETTING_KEYS))}"
            )
        
        await self.db.execute(f"""
            INSERT INTO guild_settings (guild_id, {key})
            VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET
                {key} = excluded.{key},
                updated_at = CURRENT_TIMESTAMP
        """, (guild_id, value))
        
        await self.db.commit()
        logger.debug(f"Set guild setting: {guild_id} - {key}={value}")
    
    # ==================== FAVORITES ====================
    
    async def add_favorite(
        self,
        user_id: int,
        guild_id: int,
        title: str,
        artist: str,
        url: Optional[str] = None
    ) -> bool:
        """
        Add track to favorites
        
        Args:
            user_id: User ID
            guild_id: Guild ID
            title: Track title
            artist: Artist name
            url: Track URL (optional)
        
        Returns:
            True if added, False if already exists
        """
        try:
            await self.db.execute("""
                INSERT INTO favorites (user_id, guild_id, title, artist, url)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, guild_id, title, artist, url))
            await self.db.commit()
            logger.info(f"Added favorite: {title} by {artist}")
            return True
        except sqlite3.IntegrityError:
            logger.debug("Track already in favorites")
            return False
    
    async def remove_favorite(
        self,
        user_id: int,
        title: str,
        artist: str
    ) -> bool:
        """
        Remove track from favorites
        
        Args:
            user_id: User ID
            title: Track title
            artist: Artist name
        
        Returns:
            True if removed, False if not found
        """
        cursor = await self.db.execute("""
            DELETE FROM favorites 
            WHERE user_id = ? AND title = ? AND artist = ?
        """, (user_id, title, artist))
        await self.db.commit()
        return cursor.rowcount > 0
    
    async def get_favorites(self, user_id: int, guild_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get user's favorite tracks
        
        Args:
            user_id: User ID
            guild_id: Filter by guild (optional)
        
        Returns:
            List of favorite tracks
        """
        query = "SELECT * FROM favorites WHERE user_id = ?"
        params = [user_id]
        
        if guild_id:
            query += " AND guild_id = ?"
            params.append(guild_id)
        
        query += " ORDER BY added_at DESC"
        
        async with self.db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    # ==================== ANALYTICS ====================
    
    async def get_guild_analytics(self, guild_id: int, days: int = 7) -> Dict[str, Any]:
        """
        Get guild analytics for last N days
        
        Args:
            guild_id: Guild ID
            days: Number of days to analyze
        
        Returns:
            Analytics dictionary
        """
        # Total plays in period
        async with self.db.execute("""
            SELECT COUNT(*) FROM play_history
            WHERE guild_id = ? AND played_at >= datetime('now', '-' || ? || ' days')
        """, (guild_id, days)) as cursor:
            total_plays = (await cursor.fetchone())[0]
        
        # Unique users
        async with self.db.execute("""
            SELECT COUNT(DISTINCT user_id) FROM play_history
            WHERE guild_id = ? AND played_at >= datetime('now', '-' || ? || ' days')
        """, (guild_id, days)) as cursor:
            unique_users = (await cursor.fetchone())[0]
        
        # Most played tracks
        async with self.db.execute("""
            SELECT title, artist, COUNT(*) as plays
            FROM play_history
            WHERE guild_id = ? AND played_at >= datetime('now', '-' || ? || ' days')
            GROUP BY title, artist
            ORDER BY plays DESC
            LIMIT 10
        """, (guild_id, days)) as cursor:
            top_tracks = [
                {"title": row[0], "artist": row[1], "plays": row[2]}
                for row in await cursor.fetchall()
            ]
        
        # Peak hours (hour of day with most plays)
        async with self.db.execute("""
            SELECT strftime('%H', played_at) as hour, COUNT(*) as plays
            FROM play_history
            WHERE guild_id = ? AND played_at >= datetime('now', '-' || ? || ' days')
            GROUP BY hour
            ORDER BY plays DESC
            LIMIT 5
        """, (guild_id, days)) as cursor:
            peak_hours = [
                {"hour": int(row[0]), "plays": row[1]}
                for row in await cursor.fetchall()
            ]
        
        return {
            "total_plays": total_plays,
            "unique_users": unique_users,
            "top_tracks": top_tracks,
            "peak_hours": peak_hours,
            "period_days": days
        }


# Singleton instance
_db_manager: Optional[DatabaseManager] = None


def get_db_manager() -> DatabaseManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager
