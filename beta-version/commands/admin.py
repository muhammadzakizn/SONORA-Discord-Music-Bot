"""Admin commands for bot management"""

import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional
import asyncio
import os
import psutil
from datetime import datetime

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.admin')


class AdminCommands(commands.Cog):
    """Admin commands for bot management"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize admin commands"""
        self.bot = bot
        self.maintenance_mode = False
        self.maintenance_reason = None
        logger.info("Admin commands initialized")
    
    def is_bot_admin():
        """Check if user is bot admin (server owner or has admin permissions)"""
        async def predicate(interaction: discord.Interaction):
            # Check if user is server owner
            if interaction.guild.owner_id == interaction.user.id:
                return True
            
            # Check if user has administrator permission
            if interaction.user.guild_permissions.administrator:
                return True
            
            await interaction.response.send_message(
                embed=EmbedBuilder.create_error(
                    "Permission Denied",
                    "⛔ You need administrator permissions to use this command"
                ),
                ephemeral=True
            )
            return False
        
        return app_commands.check(predicate)
    
    # ADMIN COMMANDS MOVED TO WEB PANEL
    # Use web dashboard at /admin for these features:
    # - Maintenance mode
    # - Broadcast messages
    # - Activity stats
    # - Top users
    # - Cache management
    # - Health checks
    # - Bot control (pause/stop/restart)
    
    # @app_commands.command(name="maintenance", description="Toggle maintenance mode")
    @app_commands.describe(
        mode="Enable or disable maintenance mode",
        reason="Reason for maintenance (optional)"
    )
    @is_bot_admin()
    async def maintenance(
        self, 
        interaction: discord.Interaction,
        mode: bool,
        reason: Optional[str] = "Scheduled maintenance"
    ):
        """Toggle maintenance mode"""
        self.maintenance_mode = mode
        self.maintenance_reason = reason if mode else None
        
        if mode:
            # Pause all playback
            for guild_id in list(self.bot.voice_manager.connections.keys()):
                connection = self.bot.voice_manager.get_connection(guild_id)
                if connection and connection.is_playing():
                    connection.connection.pause()
            
            embed = discord.Embed(
                title="🔧 Maintenance Mode Enabled",
                description=f"**Reason:** {reason}\n\n"
                           f"All playback has been paused.\n"
                           f"New commands will be temporarily disabled.",
                color=0xFFA500
            )
            embed.set_footer(text=f"Enabled by {interaction.user.display_name}")
            
        else:
            embed = discord.Embed(
                title="✅ Maintenance Mode Disabled",
                description="Bot is now back to normal operation.\n"
                           "Users can resume using commands.",
                color=0x1DB954
            )
            embed.set_footer(text=f"Disabled by {interaction.user.display_name}")
        
        await interaction.response.send_message(embed=embed)
        logger.info(f"Maintenance mode {'enabled' if mode else 'disabled'} by {interaction.user.name}")
    
    # BROADCAST COMMAND REMOVED FOR SECURITY
    # Broadcast feature is now ONLY available via Web Admin Panel
    # Access: http://localhost:5000/admin
    # Reason: Prevent abuse by regular members
    # 
    # This command has been intentionally disabled to ensure only
    # authorized admins can send broadcast messages via the secure
    # web dashboard interface.
    
    @app_commands.command(name="activity", description="View bot activity and usage statistics")
    @app_commands.describe(
        period="Time period in days (default: 7)"
    )
    @is_bot_admin()
    async def activity(
        self, 
        interaction: discord.Interaction,
        period: int = 7
    ):
        """View bot activity statistics"""
        await interaction.response.defer()
        
        try:
            db = self.bot.db_manager
            
            # Get overall stats
            total_plays_query = await db.db.execute(
                "SELECT COUNT(*) FROM play_history WHERE played_at >= datetime('now', '-' || ? || ' days')",
                (period,)
            )
            total_plays = (await total_plays_query.fetchone())[0]
            
            # Get unique users
            unique_users_query = await db.db.execute(
                "SELECT COUNT(DISTINCT user_id) FROM play_history WHERE played_at >= datetime('now', '-' || ? || ' days')",
                (period,)
            )
            unique_users = (await unique_users_query.fetchone())[0]
            
            # Get unique guilds
            unique_guilds_query = await db.db.execute(
                "SELECT COUNT(DISTINCT guild_id) FROM play_history WHERE played_at >= datetime('now', '-' || ? || ' days')",
                (period,)
            )
            unique_guilds = (await unique_guilds_query.fetchone())[0]
            
            # Get total duration
            total_duration_query = await db.db.execute(
                "SELECT SUM(duration) FROM play_history WHERE played_at >= datetime('now', '-' || ? || ' days')",
                (period,)
            )
            total_duration = (await total_duration_query.fetchone())[0] or 0
            
            # Get most active users
            active_users_query = await db.db.execute("""
                SELECT username, user_id, COUNT(*) as plays
                FROM play_history
                WHERE played_at >= datetime('now', '-' || ? || ' days')
                GROUP BY user_id
                ORDER BY plays DESC
                LIMIT 5
            """, (period,))
            active_users = await active_users_query.fetchall()
            
            # Get most played tracks
            top_tracks_query = await db.db.execute("""
                SELECT title, artist, COUNT(*) as plays
                FROM play_history
                WHERE played_at >= datetime('now', '-' || ? || ' days')
                GROUP BY title, artist
                ORDER BY plays DESC
                LIMIT 5
            """, (period,))
            top_tracks = await top_tracks_query.fetchall()
            
            # Create embed
            embed = discord.Embed(
                title=f"📊 Bot Activity - Last {period} Days",
                color=0x1DB954,
                timestamp=datetime.now()
            )
            
            # Overall stats
            hours = int(total_duration // 3600)
            minutes = int((total_duration % 3600) // 60)
            
            embed.add_field(
                name="📈 Overall Statistics",
                value=f"**Total Plays:** {total_plays:,}\n"
                      f"**Unique Users:** {unique_users:,}\n"
                      f"**Active Guilds:** {unique_guilds:,}\n"
                      f"**Total Playtime:** {hours}h {minutes}m",
                inline=False
            )
            
            # Most active users
            if active_users:
                users_text = "\n".join([
                    f"{i+1}. **{user[0]}** - {user[2]} plays"
                    for i, user in enumerate(active_users)
                ])
                embed.add_field(
                    name="👥 Most Active Users",
                    value=users_text,
                    inline=False
                )
            
            # Most played tracks
            if top_tracks:
                tracks_text = "\n".join([
                    f"{i+1}. **{track[0]}** by {track[1]} - {track[2]} plays"
                    for i, track in enumerate(top_tracks)
                ])
                embed.add_field(
                    name="🎵 Most Played Tracks",
                    value=tracks_text,
                    inline=False
                )
            
            embed.set_footer(text=f"Requested by {interaction.user.display_name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get activity stats: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    f"Failed to retrieve activity statistics: {str(e)}"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="topusers", description="View most active users")
    @app_commands.describe(
        limit="Number of users to show (default: 10)",
        days="Time period in days (default: 30)"
    )
    @is_bot_admin()
    async def topusers(
        self, 
        interaction: discord.Interaction,
        limit: int = 10,
        days: int = 30
    ):
        """View most active users"""
        await interaction.response.defer()
        
        try:
            db = self.bot.db_manager
            
            query = await db.db.execute("""
                SELECT 
                    username,
                    user_id,
                    COUNT(*) as total_plays,
                    SUM(duration) as total_duration,
                    COUNT(DISTINCT guild_id) as guilds_active
                FROM play_history
                WHERE played_at >= datetime('now', '-' || ? || ' days')
                GROUP BY user_id
                ORDER BY total_plays DESC
                LIMIT ?
            """, (days, limit))
            
            users = await query.fetchall()
            
            if not users:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_info(
                        "No Data",
                        f"No activity found in the last {days} days"
                    ),
                    ephemeral=True
                )
                return
            
            embed = discord.Embed(
                title=f"👥 Top {len(users)} Most Active Users",
                description=f"Last {days} days",
                color=0x1DB954,
                timestamp=datetime.now()
            )
            
            for i, user in enumerate(users, 1):
                username, user_id, plays, duration, guilds = user
                hours = int(duration // 3600)
                minutes = int((duration % 3600) // 60)
                
                # Try to get user object
                try:
                    user_obj = await self.bot.fetch_user(user_id)
                    avatar_url = user_obj.display_avatar.url
                except:
                    avatar_url = None
                
                medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
                
                embed.add_field(
                    name=f"{medal} {username}",
                    value=f"**Plays:** {plays:,}\n"
                          f"**Playtime:** {hours}h {minutes}m\n"
                          f"**Active in:** {guilds} server(s)",
                    inline=True
                )
            
            embed.set_footer(text=f"Requested by {interaction.user.display_name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get top users: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    f"Failed to retrieve top users: {str(e)}"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="cache", description="View cache status and available songs")
    @is_bot_admin()
    async def cache(self, interaction: discord.Interaction):
        """View cache status"""
        await interaction.response.defer()
        
        try:
            from config.settings import Settings
            
            # Get downloads directory size and files
            downloads_dir = Settings.DOWNLOADS_DIR
            cache_dir = Settings.CACHE_DIR
            
            # Count files and size
            download_files = list(downloads_dir.glob("*.opus"))
            download_count = len(download_files)
            download_size = sum(f.stat().st_size for f in download_files) / (1024 * 1024)  # MB
            
            # Cache directory
            cache_files = list(cache_dir.rglob("*"))
            cache_count = len([f for f in cache_files if f.is_file()])
            cache_size = sum(f.stat().st_size for f in cache_files if f.is_file()) / (1024 * 1024)  # MB
            
            # Create embed
            embed = discord.Embed(
                title="💾 Cache Status",
                color=0x3498DB,
                timestamp=datetime.now()
            )
            
            embed.add_field(
                name="📥 Downloaded Songs",
                value=f"**Count:** {download_count} files\n"
                      f"**Size:** {download_size:.2f} MB\n"
                      f"**Location:** `downloads/`",
                inline=False
            )
            
            embed.add_field(
                name="🗂️ Cache Files",
                value=f"**Count:** {cache_count} files\n"
                      f"**Size:** {cache_size:.2f} MB\n"
                      f"**Location:** `cache/`",
                inline=False
            )
            
            # Recent downloads (last 10)
            if download_files:
                recent_files = sorted(download_files, key=lambda f: f.stat().st_mtime, reverse=True)[:10]
                files_text = "\n".join([
                    f"• {f.stem[:50]}" 
                    for f in recent_files
                ])
                embed.add_field(
                    name="🎵 Recent Downloads (Last 10)",
                    value=files_text if files_text else "No files",
                    inline=False
                )
            
            embed.set_footer(text=f"Requested by {interaction.user.display_name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get cache status: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    f"Failed to retrieve cache status: {str(e)}"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="health", description="View comprehensive bot health status")
    @is_bot_admin()
    async def health(self, interaction: discord.Interaction):
        """View bot health status"""
        await interaction.response.defer()
        
        try:
            # Get system info
            process = psutil.Process()
            cpu_percent = process.cpu_percent(interval=1)
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            
            # Get bot info
            latency_ms = round(self.bot.latency * 1000, 2)
            uptime = datetime.now().timestamp() - getattr(self.bot, '_start_time', datetime.now().timestamp())
            uptime_hours = int(uptime // 3600)
            uptime_minutes = int((uptime % 3600) // 60)
            
            # Voice connections
            voice_stats = self.bot.voice_manager.get_stats()
            
            # Database status
            try:
                db_size = os.path.getsize(self.bot.db_manager.db_path) / (1024 * 1024)
                db_status = "✅ Connected"
            except:
                db_size = 0
                db_status = "❌ Error"
            
            # Create embed
            embed = discord.Embed(
                title="🏥 Bot Health Status",
                color=0x1DB954,
                timestamp=datetime.now()
            )
            
            # System metrics
            embed.add_field(
                name="💻 System Resources",
                value=f"**CPU Usage:** {cpu_percent:.1f}%\n"
                      f"**Memory:** {memory_mb:.1f} MB\n"
                      f"**Uptime:** {uptime_hours}h {uptime_minutes}m",
                inline=True
            )
            
            # Bot metrics
            embed.add_field(
                name="🤖 Bot Metrics",
                value=f"**Latency:** {latency_ms} ms\n"
                      f"**Guilds:** {len(self.bot.guilds)}\n"
                      f"**Users:** {sum(g.member_count for g in self.bot.guilds):,}",
                inline=True
            )
            
            # Voice status
            embed.add_field(
                name="🔊 Voice Status",
                value=f"**Connections:** {voice_stats['connected']}\n"
                      f"**Playing:** {voice_stats['playing']}\n"
                      f"**Total:** {voice_stats['total_connections']}",
                inline=True
            )
            
            # Database status
            embed.add_field(
                name="🗄️ Database",
                value=f"**Status:** {db_status}\n"
                      f"**Size:** {db_size:.2f} MB\n"
                      f"**Type:** SQLite",
                inline=True
            )
            
            # Module status
            cogs = list(self.bot.cogs.keys())
            embed.add_field(
                name="📦 Loaded Modules",
                value=f"**Count:** {len(cogs)}\n"
                      f"**Modules:** {', '.join(cogs[:5])}"
                      f"{', ...' if len(cogs) > 5 else ''}",
                inline=True
            )
            
            # Maintenance status
            maintenance_status = "🔧 Active" if self.maintenance_mode else "✅ Normal"
            embed.add_field(
                name="⚙️ Maintenance",
                value=f"**Status:** {maintenance_status}\n"
                      f"**Reason:** {self.maintenance_reason or 'N/A'}",
                inline=True
            )
            
            # Overall health indicator
            health_score = 100
            if cpu_percent > 50: health_score -= 20
            if memory_mb > 500: health_score -= 10
            if latency_ms > 500: health_score -= 20
            if self.maintenance_mode: health_score -= 30
            
            health_emoji = "🟢" if health_score >= 80 else "🟡" if health_score >= 60 else "🔴"
            embed.description = f"**Overall Health: {health_emoji} {health_score}%**"
            
            embed.set_footer(text=f"Requested by {interaction.user.display_name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get health status: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    f"Failed to retrieve health status: {str(e)}"
                ),
                ephemeral=True
            )


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(AdminCommands(bot))
