"""Statistics and history commands"""

import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

from ui.embeds import EmbedBuilder
from config.logging_config import get_logger

logger = get_logger('commands.stats')


class StatsCommands(commands.Cog):
    """Statistics and history commands"""
    
    def __init__(self, bot: commands.Bot):
        """Initialize stats commands"""
        self.bot = bot
        logger.info("Stats commands initialized")
    
    @app_commands.command(name="stats", description="Show your listening statistics")
    async def stats(self, interaction: discord.Interaction):
        """Show user statistics"""
        await interaction.response.defer()
        
        try:
            db = self.bot.db_manager
            user_id = interaction.user.id
            guild_id = interaction.guild.id
            
            # Get user stats
            stats = await db.get_user_stats(user_id, guild_id)
            
            # Create embed
            embed = discord.Embed(
                title=f"📊 Statistics for {interaction.user.display_name}",
                color=0x1DB954
            )
            
            embed.add_field(
                name="Total Plays",
                value=f"🎵 {stats['total_plays']} tracks",
                inline=True
            )
            
            # Format total duration
            hours = int(stats['total_duration'] // 3600)
            minutes = int((stats['total_duration'] % 3600) // 60)
            embed.add_field(
                name="Total Listening Time",
                value=f"⏱️ {hours}h {minutes}m",
                inline=True
            )
            
            # Top artists
            if stats['top_artists']:
                top_artists_str = "\n".join([
                    f"{i+1}. **{artist['artist']}** - {artist['count']} plays"
                    for i, artist in enumerate(stats['top_artists'][:5])
                ])
                embed.add_field(
                    name="🎤 Top Artists",
                    value=top_artists_str or "No data yet",
                    inline=False
                )
            
            # Recent tracks
            if stats['recent_tracks']:
                recent_str = "\n".join([
                    f"• {track['title']} - {track['artist']}"
                    for track in stats['recent_tracks'][:5]
                ])
                embed.add_field(
                    name="🕐 Recently Played",
                    value=recent_str or "No recent tracks",
                    inline=False
                )
            
            embed.set_thumbnail(url=interaction.user.display_avatar.url)
            embed.set_footer(text=f"Guild: {interaction.guild.name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    "Failed to retrieve statistics"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="history", description="Show recent play history")
    async def history(
        self, 
        interaction: discord.Interaction,
        limit: Optional[int] = 10
    ):
        """Show play history"""
        await interaction.response.defer()
        
        try:
            db = self.bot.db_manager
            
            # Get history
            history = await db.get_play_history(
                guild_id=interaction.guild.id,
                limit=min(limit, 25)  # Cap at 25
            )
            
            if not history:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_info(
                        "No History",
                        "No play history found for this server"
                    ),
                    ephemeral=True
                )
                return
            
            # Create embed
            embed = discord.Embed(
                title=f"📜 Recent Play History",
                description=f"Last {len(history)} tracks played",
                color=0x3498DB
            )
            
            for item in history[:10]:  # Show max 10 in embed
                # Format timestamp
                from datetime import datetime
                played_at = datetime.fromisoformat(item['played_at'])
                time_ago = self._format_time_ago(played_at)
                
                embed.add_field(
                    name=f"🎵 {item['title']}",
                    value=f"By **{item['artist']}** • Played by {item['username']}\n"
                          f"⏱️ {time_ago}",
                    inline=False
                )
            
            embed.set_footer(text=f"Guild: {interaction.guild.name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get history: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    "Failed to retrieve history"
                ),
                ephemeral=True
            )
    
    @app_commands.command(name="top", description="Show server's top tracks")
    async def top_tracks(
        self, 
        interaction: discord.Interaction,
        days: Optional[int] = 7
    ):
        """Show top tracks"""
        await interaction.response.defer()
        
        try:
            db = self.bot.db_manager
            guild_id = interaction.guild.id
            
            # Get analytics
            analytics = await db.get_guild_analytics(guild_id, days)
            
            if analytics['total_plays'] == 0:
                await interaction.followup.send(
                    embed=EmbedBuilder.create_info(
                        "No Data",
                        f"No tracks played in the last {days} days"
                    ),
                    ephemeral=True
                )
                return
            
            # Create embed
            embed = discord.Embed(
                title=f"🔥 Top Tracks - Last {days} Days",
                color=0x1DB954
            )
            
            embed.add_field(
                name="📊 Stats",
                value=f"**Total Plays:** {analytics['total_plays']}\n"
                      f"**Unique Users:** {analytics['unique_users']}",
                inline=False
            )
            
            # Top tracks
            if analytics['top_tracks']:
                top_tracks_str = "\n".join([
                    f"{i+1}. **{track['title']}** by {track['artist']}\n"
                    f"   └ {track['plays']} plays"
                    for i, track in enumerate(analytics['top_tracks'][:10])
                ])
                embed.add_field(
                    name="🎵 Most Played",
                    value=top_tracks_str,
                    inline=False
                )
            
            # Peak hours
            if analytics['peak_hours']:
                peak_hours_str = ", ".join([
                    f"{hour['hour']}:00 ({hour['plays']})"
                    for hour in analytics['peak_hours'][:3]
                ])
                embed.add_field(
                    name="⏰ Peak Hours",
                    value=peak_hours_str,
                    inline=False
                )
            
            embed.set_footer(text=f"Guild: {interaction.guild.name}")
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to get top tracks: {e}", exc_info=True)
            await interaction.followup.send(
                embed=EmbedBuilder.create_error(
                    "Error",
                    "Failed to retrieve top tracks"
                ),
                ephemeral=True
            )
    
    def _format_time_ago(self, dt) -> str:
        """Format datetime as 'X ago' string"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        diff = (now - dt).total_seconds()
        
        if diff < 60:
            return "Just now"
        elif diff < 3600:
            minutes = int(diff // 60)
            return f"{minutes}m ago"
        elif diff < 86400:
            hours = int(diff // 3600)
            return f"{hours}h ago"
        else:
            days = int(diff // 86400)
            return f"{days}d ago"


async def setup(bot: commands.Bot):
    """Setup function for cog"""
    await bot.add_cog(StatsCommands(bot))
