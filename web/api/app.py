"""Web Dashboard for Discord Music Bot"""

import asyncio
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
from typing import Optional
import threading
import time

from config.logging_config import get_logger
from database.db_manager import get_db_manager
# ==================== v3.3.0 NEW IMPORTS ====================
try:
    from datetime import datetime
    from web.auth import auth_manager, login_required, admin_required, public_or_authenticated
    from utils.analytics import analytics
    from services.translation import translator
    from services.download_manager import download_manager
    V3_3_FEATURES = True
except ImportError:
    # v3.3.0 features are optional - using dummy decorators
    V3_3_FEATURES = False
    # Dummy decorators
    def login_required(f): return f
    def admin_required(f): return f  
    def public_or_authenticated(f): return f


logger = get_logger('web.dashboard')

# Flask app
app = Flask(__name__, 
           template_folder='templates',
           static_folder='static')
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
CORS(app)

# SocketIO disabled for server deployment - using REST API only
# WebSocket features handled by Next.js frontend if needed
socketio = None

# Global bot reference (will be set by main.py)
_bot_instance = None


def set_bot_instance(bot):
    """Set bot instance for web dashboard"""
    global _bot_instance
    _bot_instance = bot
    logger.info("Bot instance set for web dashboard")


def get_bot():
    """Get bot instance"""
    return _bot_instance


# ==================== ROUTES ====================

@app.route('/')
@public_or_authenticated
def index():
    """Dashboard home page"""
    return render_template('dashboard.html', is_admin=auth_manager.is_admin() if V3_3_FEATURES else False, is_authenticated=auth_manager.is_authenticated() if V3_3_FEATURES else False)


@app.route('/admin')
@admin_required
def admin():
    """Admin panel page"""
    return render_template('admin.html', is_admin=True, is_authenticated=True)


@app.route('/api/health')
def api_health():
    """Lightweight health check endpoint for PWA and monitoring"""
    bot = get_bot()
    
    if not bot:
        return jsonify({
            "status": "offline",
            "online": False,
            "message": "Bot not connected"
        }), 503
    
    try:
        return jsonify({
            "status": "healthy",
            "online": True,
            "latency": round(bot.latency * 1000, 2),
            "guilds": len(bot.guilds),
            "active_voice": len([vc for vc in bot.voice_clients if vc.is_connected()]),
            "version": getattr(bot, 'version', '1.0.0'),
            "uptime": time.time() - bot._start_time if hasattr(bot, '_start_time') else 0
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "error",
            "online": False,
            "message": str(e)
        }), 500


@app.route('/api/status')
def api_status():
    """Get bot status"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        stats = bot.voice_manager.get_stats()
        
        return jsonify({
            "status": "online",
            "guilds": len(bot.guilds),
            "users": sum(len(guild.members) for guild in bot.guilds),
            "voice_connections": stats['connected'],
            "playing": stats['playing'],
            "uptime": time.time() - bot._start_time if hasattr(bot, '_start_time') else 0,
            "latency": round(bot.latency * 1000, 2)  # ms
        })
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/guilds')
def api_guilds():
    """Get all guilds"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        guilds = []
        for guild in bot.guilds:
            # Check if playing in this guild
            connection = bot.voice_manager.get_connection(guild.id)
            is_playing = connection and connection.is_playing()
            
            # Get current track if playing
            current_track = None
            if hasattr(bot, 'players') and guild.id in bot.players:
                player = bot.players[guild.id]
                if player.metadata:
                    current_track = {
                        "title": player.metadata.title,
                        "artist": player.metadata.artist,
                        "duration": player.metadata.duration,
                        "current_time": player.get_current_time()
                    }
            
            guilds.append({
                "id": str(guild.id),  # String to prevent JS precision loss
                "name": guild.name,
                "icon": str(guild.icon.url) if guild.icon else None,
                "member_count": guild.member_count,
                "is_playing": is_playing,
                "current_track": current_track
            })
        
        return jsonify(guilds)
    except Exception as e:
        logger.error(f"Failed to get guilds: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/guild/<int:guild_id>')
def api_guild_detail(guild_id: int):
    """Get guild details"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        guild = bot.get_guild(guild_id)
        if not guild:
            return jsonify({"error": "Guild not found"}), 404
        
        # Get voice connection
        connection = bot.voice_manager.get_connection(guild_id)
        voice_channel = connection.channel if connection else None
        
        # Get current player
        current_track = None
        if hasattr(bot, 'players') and guild_id in bot.players:
            player = bot.players[guild_id]
            if player.metadata:
                current_track = {
                    "title": player.metadata.title,
                    "artist": player.metadata.artist,
                    "album": player.metadata.album,
                    "duration": player.metadata.duration,
                    "current_time": player.get_current_time(),
                    "artwork_url": player.metadata.artwork_url,
                    "audio_source": player.metadata.audio_source,
                    "requested_by": player.metadata.requested_by,
                    "is_playing": player.is_playing,
                    "is_paused": player.is_paused
                }
        
        # Get queue
        queue = []
        queue_cog = bot.get_cog('QueueCommands')
        if queue_cog and guild_id in queue_cog.queues:
            for idx, item in enumerate(queue_cog.queues[guild_id]):
                # Check if item is TrackInfo or MetadataInfo
                from database.models import TrackInfo, MetadataInfo
                
                if isinstance(item, (TrackInfo, MetadataInfo)):
                    queue.append({
                        "position": idx + 1,
                        "title": item.title,
                        "artist": item.artist,
                        "duration": item.duration
                    })
        
        return jsonify({
            "id": str(guild.id),  # String to prevent JS precision loss
            "name": guild.name,
            "icon": str(guild.icon.url) if guild.icon else None,
            "member_count": guild.member_count,
            "voice_channel": voice_channel.name if voice_channel else None,
            "is_playing": connection and connection.is_playing(),
            "current_track": current_track,
            "queue": queue,
            "queue_length": len(queue)
        })
    except Exception as e:
        logger.error(f"Failed to get guild detail: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/history')
def api_history():
    """Get play history"""
    try:
        db = get_db_manager()
        
        # Get query parameters
        guild_id = request.args.get('guild_id', type=int)
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        history = loop.run_until_complete(
            db.get_play_history(guild_id, user_id, limit)
        )
        loop.close()
        
        return jsonify(history)
    except Exception as e:
        logger.error(f"Failed to get history: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/stats/user/<int:user_id>')
def api_user_stats(user_id: int):
    """Get user statistics"""
    try:
        db = get_db_manager()
        guild_id = request.args.get('guild_id', type=int)
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stats = loop.run_until_complete(
            db.get_user_stats(user_id, guild_id)
        )
        loop.close()
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Failed to get user stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/stats/guild/<int:guild_id>')
def api_guild_stats(guild_id: int):
    """Get guild analytics"""
    try:
        db = get_db_manager()
        days = request.args.get('days', 7, type=int)
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        analytics = loop.run_until_complete(
            db.get_guild_analytics(guild_id, days)
        )
        loop.close()
        
        return jsonify(analytics)
    except Exception as e:
        logger.error(f"Failed to get guild stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/control/<int:guild_id>/<action>', methods=['POST'])
def api_control(guild_id: int, action: str):
    """Control playback with Discord notification"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    # Get username from request body for notification
    data = request.get_json(silent=True) or {}
    username = data.get('username', 'Admin')
    
    try:
        connection = bot.voice_manager.get_connection(guild_id)
        if not connection or not connection.is_connected():
            return jsonify({"error": "Not connected to voice"}), 400
        
        # Track action for Discord notification
        action_emoji = ""
        action_text = ""
        
        if action == 'pause':
            if connection.connection.is_playing():
                connection.connection.pause()
                
                # Update player state
                if hasattr(bot, 'players') and guild_id in bot.players:
                    bot.players[guild_id].is_paused = True
                
                action_emoji = "⏸️"
                action_text = "Paused"
            else:
                return jsonify({"error": "Not playing"}), 400
        
        elif action == 'resume':
            if connection.connection.is_paused():
                connection.connection.resume()
                
                # Update player state
                if hasattr(bot, 'players') and guild_id in bot.players:
                    bot.players[guild_id].is_paused = False
                
                action_emoji = "▶️"
                action_text = "Resumed"
            else:
                return jsonify({"error": "Not paused"}), 400
        
        elif action == 'skip':
            if connection.connection.is_playing() or connection.connection.is_paused():
                connection.connection.stop()
                action_emoji = "⏭️"
                action_text = "Skipped"
            else:
                return jsonify({"error": "Nothing playing"}), 400
        
        elif action == 'stop':
            connection.connection.stop()
            # Run disconnect in bot's event loop
            loop = bot.loop
            asyncio.run_coroutine_threadsafe(connection.disconnect(), loop)
            action_emoji = "⏹️"
            action_text = "Stopped"
        
        else:
            return jsonify({"error": "Invalid action"}), 400
        
        # Send Discord notification in bot's channel
        async def send_notification():
            try:
                import discord
                guild = bot.get_guild(guild_id)
                if not guild:
                    return
                
                # Find the text channel where bot was last active or system channel
                channel = None
                
                # Try to find a text channel in the same category as voice channel
                if connection.channel:
                    for ch in guild.text_channels:
                        if ch.category == connection.channel.category:
                            channel = ch
                            break
                
                # Fallback to system channel or first text channel
                if not channel:
                    channel = guild.system_channel or (guild.text_channels[0] if guild.text_channels else None)
                
                if channel:
                    embed = discord.Embed(
                        description=f"{action_emoji} **{action_text}** via Web Dashboard\n"
                                   f"👤 By **{username}**",
                        color=0x7B1E3C
                    )
                    embed.set_footer(text="SONORA Admin Dashboard")
                    await channel.send(embed=embed, delete_after=30)
            except Exception as e:
                logger.error(f"Failed to send Discord notification: {e}")
        
        # Run notification in bot's event loop
        asyncio.run_coroutine_threadsafe(send_notification(), bot.loop)
        
        return jsonify({"status": action_text.lower()})
    
    except Exception as e:
        logger.error(f"Control action failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/queue/<int:guild_id>/remove/<int:position>', methods=['POST'])
def api_queue_remove(guild_id: int, position: int):
    """Remove track from queue by position (1-indexed)"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    data = request.get_json(silent=True) or {}
    username = data.get('username', 'Admin')
    
    try:
        queue_cog = bot.get_cog('QueueCommands')
        if not queue_cog or guild_id not in queue_cog.queues:
            return jsonify({"error": "Queue is empty"}), 400
        
        queue = queue_cog.queues[guild_id]
        idx = position - 1  # Convert to 0-indexed
        
        if idx < 0 or idx >= len(queue):
            return jsonify({"error": "Invalid position"}), 400
        
        # Remove track
        removed = queue.pop(idx)
        
        # Send Discord notification
        async def send_notification():
            try:
                import discord
                guild = bot.get_guild(guild_id)
                if not guild:
                    return
                
                channel = guild.system_channel or (guild.text_channels[0] if guild.text_channels else None)
                if channel:
                    embed = discord.Embed(
                        description=f"🗑️ Removed **{removed.title}** from queue\n"
                                   f"👤 By **{username}** via Web Dashboard",
                        color=0x7B1E3C
                    )
                    await channel.send(embed=embed, delete_after=30)
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")
        
        asyncio.run_coroutine_threadsafe(send_notification(), bot.loop)
        
        return jsonify({
            "status": "removed",
            "title": removed.title,
            "new_queue_length": len(queue)
        })
    
    except Exception as e:
        logger.error(f"Queue remove failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/queue/<int:guild_id>/move', methods=['POST'])
def api_queue_move(guild_id: int):
    """Move track to different position in queue"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    data = request.get_json(silent=True) or {}
    from_pos = data.get('from_position', 0)
    to_pos = data.get('to_position', 0)
    username = data.get('username', 'Admin')
    
    try:
        queue_cog = bot.get_cog('QueueCommands')
        if not queue_cog or guild_id not in queue_cog.queues:
            return jsonify({"error": "Queue is empty"}), 400
        
        queue = queue_cog.queues[guild_id]
        from_idx = from_pos - 1
        to_idx = to_pos - 1
        
        if from_idx < 0 or from_idx >= len(queue):
            return jsonify({"error": "Invalid from position"}), 400
        if to_idx < 0 or to_idx >= len(queue):
            return jsonify({"error": "Invalid to position"}), 400
        
        # Move track
        track = queue.pop(from_idx)
        queue.insert(to_idx, track)
        
        # Send Discord notification
        async def send_notification():
            try:
                import discord
                guild = bot.get_guild(guild_id)
                if not guild:
                    return
                
                channel = guild.system_channel or (guild.text_channels[0] if guild.text_channels else None)
                if channel:
                    embed = discord.Embed(
                        description=f"↕️ Moved **{track.title}** from #{from_pos} to #{to_pos}\n"
                                   f"👤 By **{username}** via Web Dashboard",
                        color=0x7B1E3C
                    )
                    await channel.send(embed=embed, delete_after=30)
            except Exception as e:
                logger.error(f"Failed to send notification: {e}")
        
        asyncio.run_coroutine_threadsafe(send_notification(), bot.loop)
        
        return jsonify({
            "status": "moved",
            "title": track.title,
            "from": from_pos,
            "to": to_pos
        })
    
    except Exception as e:
        logger.error(f"Queue move failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/health')
def api_admin_health():
    """Get comprehensive bot health status"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        import psutil
        from datetime import datetime
        
        # System metrics
        process = psutil.Process()
        cpu_percent = process.cpu_percent(interval=0.1)
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / (1024 * 1024)
        
        # Bot metrics
        uptime = time.time() - bot._start_time if hasattr(bot, '_start_time') else 0
        voice_stats = bot.voice_manager.get_stats()
        
        # Database size
        try:
            db_size = os.path.getsize(bot.db_manager.db_path) / (1024 * 1024)
        except:
            db_size = 0
        
        # Module/cog status
        cogs = list(bot.cogs.keys())
        
        return jsonify({
            "system": {
                "cpu_percent": round(cpu_percent, 2),
                "memory_mb": round(memory_mb, 2),
                "uptime_seconds": round(uptime, 2)
            },
            "bot": {
                "latency_ms": round(bot.latency * 1000, 2),
                "guilds": len(bot.guilds),
                "users": sum(g.member_count for g in bot.guilds)
            },
            "voice": voice_stats,
            "database": {
                "size_mb": round(db_size, 2),
                "status": "connected"
            },
            "modules": {
                "loaded": cogs,
                "count": len(cogs)
            }
        })
    except Exception as e:
        logger.error(f"Failed to get health status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/cache')
def api_admin_cache():
    """Get cache status"""
    try:
        from config.settings import Settings
        from pathlib import Path
        
        downloads_dir = Settings.DOWNLOADS_DIR
        cache_dir = Settings.CACHE_DIR
        
        # Downloads
        download_files = list(downloads_dir.glob("*.opus"))
        download_count = len(download_files)
        download_size = sum(f.stat().st_size for f in download_files) / (1024 * 1024)
        
        # Cache
        cache_files = list(cache_dir.rglob("*"))
        cache_count = len([f for f in cache_files if f.is_file()])
        cache_size = sum(f.stat().st_size for f in cache_files if f.is_file()) / (1024 * 1024)
        
        # Recent downloads
        recent_files = sorted(download_files, key=lambda f: f.stat().st_mtime, reverse=True)[:20]
        recent_list = [{"name": f.stem, "size_mb": round(f.stat().st_size / (1024 * 1024), 2)} for f in recent_files]
        
        return jsonify({
            "downloads": {
                "count": download_count,
                "size_mb": round(download_size, 2),
                "recent": recent_list
            },
            "cache": {
                "count": cache_count,
                "size_mb": round(cache_size, 2)
            }
        })
    except Exception as e:
        logger.error(f"Failed to get cache status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/activity')
def api_admin_activity():
    """Get detailed activity statistics"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        db = get_db_manager()
        days = request.args.get('days', 7, type=int)
        
        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Total stats
        total_query = loop.run_until_complete(
            db.db.execute(
                "SELECT COUNT(*), SUM(duration) FROM play_history WHERE played_at >= datetime('now', '-' || ? || ' days')",
                (days,)
            )
        )
        total_plays, total_duration = loop.run_until_complete(total_query.fetchone())
        
        # Top users
        users_query = loop.run_until_complete(
            db.db.execute("""
                SELECT username, user_id, COUNT(*) as plays, SUM(duration) as duration
                FROM play_history
                WHERE played_at >= datetime('now', '-' || ? || ' days')
                GROUP BY user_id
                ORDER BY plays DESC
                LIMIT 10
            """, (days,))
        )
        top_users = loop.run_until_complete(users_query.fetchall())
        
        # Top tracks
        tracks_query = loop.run_until_complete(
            db.db.execute("""
                SELECT title, artist, COUNT(*) as plays
                FROM play_history
                WHERE played_at >= datetime('now', '-' || ? || ' days')
                GROUP BY title, artist
                ORDER BY plays DESC
                LIMIT 10
            """, (days,))
        )
        top_tracks = loop.run_until_complete(tracks_query.fetchall())
        
        loop.close()
        
        return jsonify({
            "period_days": days,
            "total_plays": total_plays or 0,
            "total_duration": total_duration or 0,
            "top_users": [
                {"username": u[0], "user_id": u[1], "plays": u[2], "duration": u[3]}
                for u in top_users
            ],
            "top_tracks": [
                {"title": t[0], "artist": t[1], "plays": t[2]}
                for t in top_tracks
            ]
        })
    except Exception as e:
        logger.error(f"Failed to get activity: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guilds/channels')
def api_admin_guilds_channels():
    """Get all guilds with their channels and permissions"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        guilds_data = []
        
        for guild in bot.guilds:
            channels_data = []
            
            # Get text channels
            for channel in guild.text_channels:
                # Check permissions
                permissions = channel.permissions_for(guild.me)
                
                channels_data.append({
                    "id": str(channel.id),
                    "name": channel.name,
                    "type": "text",
                    "position": channel.position,
                    "permissions": {
                        "send_messages": permissions.send_messages,
                        "embed_links": permissions.embed_links,
                        "mention_everyone": permissions.mention_everyone
                    }
                })
            
            guilds_data.append({
                "id": str(guild.id),
                "name": guild.name,
                "icon": str(guild.icon.url) if guild.icon else None,
                "channels": sorted(channels_data, key=lambda x: x['position'])
            })
        
        return jsonify(guilds_data)
    except Exception as e:
        logger.error(f"Failed to get guilds/channels: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/broadcast', methods=['POST'])
def api_admin_broadcast():
    """Send broadcast message to selected channels"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        from datetime import datetime
        import discord
        
        data = request.json
        message = data.get('message', '').strip()
        guild_ids = data.get('guild_ids', [])  # List of guild IDs (as strings)
        channel_ids = data.get('channel_ids', [])  # List of channel IDs (as strings)
        mention_type = data.get('mention_type', 'none')  # 'none', 'everyone', 'here'
        all_channels = data.get('all_channels', False)
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        logger.info(f"Broadcast request: message={message[:50]}, all_channels={all_channels}, guilds={len(guild_ids)}, channels={len(channel_ids)}")
        
        results = []
        sent_count = 0
        failed_count = 0
        
        # Run broadcast in bot's event loop
        loop = bot.loop
        
        async def send_broadcasts():
            nonlocal sent_count, failed_count
            
            # If all_channels is true, send to ALL text channels in ALL guilds
            if all_channels:
                logger.info(f"Broadcasting to ALL channels in {len(bot.guilds)} guilds")
                
                for guild in bot.guilds:
                    for channel in guild.text_channels:
                        # Check permissions
                        permissions = channel.permissions_for(guild.me)
                        
                        if not permissions.send_messages:
                            results.append({
                                "guild": guild.name,
                                "channel": channel.name,
                                "status": "failed",
                                "reason": "No send_messages permission"
                            })
                            failed_count += 1
                            continue
                        
                        # Check mention permission if needed
                        if mention_type in ['everyone', 'here'] and not permissions.mention_everyone:
                            results.append({
                                "guild": guild.name,
                                "channel": channel.name,
                                "status": "failed",
                                "reason": "No mention_everyone permission"
                            })
                            failed_count += 1
                            continue
                        
                        # Send message
                        try:
                            embed = discord.Embed(
                                title="📢 Broadcast Message",
                                description=message,
                                color=0x3498DB,
                                timestamp=datetime.now()
                            )
                            embed.set_footer(text="Admin Broadcast")
                            
                            # Send with or without mention
                            if mention_type == 'everyone':
                                await channel.send(content="@everyone", embed=embed)
                            elif mention_type == 'here':
                                await channel.send(content="@here", embed=embed)
                            else:
                                await channel.send(embed=embed)
                            
                            results.append({
                                "guild": guild.name,
                                "channel": channel.name,
                                "status": "success"
                            })
                            sent_count += 1
                            
                            # Small delay to avoid rate limits
                            await asyncio.sleep(0.5)
                            
                        except Exception as e:
                            results.append({
                                "guild": guild.name,
                                "channel": channel.name,
                                "status": "failed",
                                "reason": str(e)[:100]
                            })
                            failed_count += 1
            
            # Otherwise, send to specific selected channels
            else:
                logger.info(f"Broadcasting to selected channels: {len(channel_ids)} channels")
                
                # If no channels selected, send to first available channel in each selected guild
                if not channel_ids and guild_ids:
                    logger.info("No channels selected, using first available channel in each guild")
                    
                    for guild in bot.guilds:
                        guild_id_str = str(guild.id)
                        
                        if guild_id_str not in guild_ids:
                            continue
                        
                        # Find first available channel
                        target_channel = None
                        for channel in guild.text_channels:
                            permissions = channel.permissions_for(guild.me)
                            if permissions.send_messages:
                                target_channel = channel
                                break
                        
                        if not target_channel:
                            results.append({
                                "guild": guild.name,
                                "channel": "N/A",
                                "status": "failed",
                                "reason": "No available text channels"
                            })
                            failed_count += 1
                            continue
                        
                        # Send to this channel
                        try:
                            embed = discord.Embed(
                                title="📢 Broadcast Message",
                                description=message,
                                color=0x3498DB,
                                timestamp=datetime.now()
                            )
                            embed.set_footer(text="Admin Broadcast")
                            
                            if mention_type == 'everyone':
                                await target_channel.send(content="@everyone", embed=embed)
                            elif mention_type == 'here':
                                await target_channel.send(content="@here", embed=embed)
                            else:
                                await target_channel.send(embed=embed)
                            
                            results.append({
                                "guild": guild.name,
                                "channel": target_channel.name,
                                "status": "success"
                            })
                            sent_count += 1
                            
                            await asyncio.sleep(0.5)
                            
                        except Exception as e:
                            results.append({
                                "guild": guild.name,
                                "channel": target_channel.name,
                                "status": "failed",
                                "reason": str(e)[:100]
                            })
                            failed_count += 1
                
                # Send to specific channels
                elif channel_ids:
                    for channel_id_str in channel_ids:
                        try:
                            channel_id = int(channel_id_str)
                            channel = bot.get_channel(channel_id)
                            
                            if not channel:
                                results.append({
                                    "guild": "Unknown",
                                    "channel": f"ID:{channel_id_str}",
                                    "status": "failed",
                                    "reason": "Channel not found"
                                })
                                failed_count += 1
                                continue
                            
                            guild = channel.guild
                            permissions = channel.permissions_for(guild.me)
                            
                            if not permissions.send_messages:
                                results.append({
                                    "guild": guild.name,
                                    "channel": channel.name,
                                    "status": "failed",
                                    "reason": "No send_messages permission"
                                })
                                failed_count += 1
                                continue
                            
                            if mention_type in ['everyone', 'here'] and not permissions.mention_everyone:
                                results.append({
                                    "guild": guild.name,
                                    "channel": channel.name,
                                    "status": "failed",
                                    "reason": "No mention_everyone permission"
                                })
                                failed_count += 1
                                continue
                            
                            # Send message
                            embed = discord.Embed(
                                title="📢 Broadcast Message",
                                description=message,
                                color=0x3498DB,
                                timestamp=datetime.now()
                            )
                            embed.set_footer(text="Admin Broadcast")
                            
                            if mention_type == 'everyone':
                                await channel.send(content="@everyone", embed=embed)
                            elif mention_type == 'here':
                                await channel.send(content="@here", embed=embed)
                            else:
                                await channel.send(embed=embed)
                            
                            results.append({
                                "guild": guild.name,
                                "channel": channel.name,
                                "status": "success"
                            })
                            sent_count += 1
                            
                            await asyncio.sleep(0.5)
                            
                        except Exception as e:
                            results.append({
                                "guild": "Unknown",
                                "channel": f"ID:{channel_id_str}",
                                "status": "failed",
                                "reason": str(e)[:100]
                            })
                            failed_count += 1
                
                # No channels and no guilds selected
                else:
                    logger.warning("No channels or guilds selected for broadcast")
        
        # Execute broadcast
        logger.info("Executing broadcast...")
        future = asyncio.run_coroutine_threadsafe(send_broadcasts(), loop)
        future.result(timeout=60)  # Wait max 60 seconds
        
        logger.info(f"Broadcast complete: sent={sent_count}, failed={failed_count}")
        
        return jsonify({
            "success": True,
            "sent": sent_count,
            "failed": failed_count,
            "total_guilds": len(bot.guilds),
            "results": results[:50]  # Limit to 50 results for response size
        })
        
    except Exception as e:
        logger.error(f"Broadcast failed: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/logs')
def api_admin_logs():
    """Get recent log entries"""
    try:
        from pathlib import Path
        from config.settings import Settings
        
        log_type = request.args.get('type', 'all')  # all, error, warning, info
        lines = request.args.get('lines', 100, type=int)
        lines = min(lines, 1000)  # Max 1000 lines
        
        log_dir = Settings.BASE_DIR / 'logs'
        log_entries = []
        
        # Read all log files
        for log_file in sorted(log_dir.glob('*.log'), key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    file_lines = f.readlines()
                    
                    # Get last N lines
                    for line in file_lines[-lines:]:
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Filter by type
                        if log_type != 'all':
                            if log_type.upper() not in line:
                                continue
                        
                        # Parse log line
                        # Format: "HH:MM:SS - LEVEL - Message"
                        parts = line.split(' - ', 2)
                        if len(parts) >= 3:
                            timestamp = parts[0]
                            level = parts[1]
                            message = parts[2]
                        else:
                            timestamp = ""
                            level = "INFO"
                            message = line
                        
                        log_entries.append({
                            "timestamp": timestamp,
                            "level": level,
                            "message": message,
                            "file": log_file.name
                        })
                
                if len(log_entries) >= lines:
                    break
                    
            except Exception as e:
                logger.error(f"Failed to read log file {log_file}: {e}")
                continue
        
        # Return most recent first
        return jsonify({
            "logs": log_entries[-lines:],
            "total": len(log_entries)
        })
        
    except Exception as e:
        logger.error(f"Failed to get logs: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/shutdown', methods=['POST'])
@admin_required
def api_admin_shutdown():
    """Shutdown the bot gracefully"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        import signal
        import os
        
        logger.warning("Shutdown requested via web dashboard")
        
        # Schedule shutdown in a separate thread to allow response to be sent
        def delayed_shutdown():
            time.sleep(1)
            os.kill(os.getpid(), signal.SIGTERM)
        
        shutdown_thread = threading.Thread(target=delayed_shutdown)
        shutdown_thread.start()
        
        return jsonify({
            "status": "shutdown_initiated",
            "message": "Bot is shutting down..."
        })
        
    except Exception as e:
        logger.error(f"Shutdown failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/cache/clear', methods=['POST'])
@admin_required
def api_admin_cache_clear():
    """Clear download cache"""
    try:
        from config.settings import Settings
        import shutil
        
        cache_dir = Settings.CACHE_DIR
        downloads_dir = Settings.DOWNLOADS_DIR
        
        cleared_count = 0
        
        # Clear cache files
        if cache_dir.exists():
            for item in cache_dir.iterdir():
                if item.is_file():
                    item.unlink()
                    cleared_count += 1
        
        # Clear old downloads (keep recent ones)
        if downloads_dir.exists():
            import time as time_module
            current_time = time_module.time()
            for item in downloads_dir.glob("*.opus"):
                # Delete files older than 24 hours
                if current_time - item.stat().st_mtime > 86400:
                    item.unlink()
                    cleared_count += 1
        
        logger.info(f"Cache cleared: {cleared_count} files removed")
        
        return jsonify({
            "status": "success",
            "cleared": cleared_count
        })
        
    except Exception as e:
        logger.error(f"Cache clear failed: {e}")
        return jsonify({"error": str(e)}), 500



# ==================== WEBSOCKET EVENTS (DISABLED) ====================
# SocketIO is disabled for server deployment
# WebSocket features are handled by Next.js frontend polling instead

# ==================== BACKGROUND TASKS ====================

def broadcast_updates():
    """Broadcast status updates - disabled when SocketIO is None"""
    pass  # SocketIO disabled for server deployment




# ==================== v3.3.0 NEW ROUTES ====================

if V3_3_FEATURES:
    @app.route('/login', methods=['GET'])
    def login_page():
        return render_template('login.html')
    
    @app.route('/manifest.json')
    def manifest():
        return send_from_directory('.', 'manifest.json')
    
    @app.route('/sw.js')  
    def service_worker():
        return send_from_directory('.', 'sw.js')

# ==================== v3.3.0 AUTHENTICATION API ====================

if V3_3_FEATURES:
    @app.route('/api/login', methods=['POST'])
    def api_login():
        data = request.json
        result = auth_manager.login(data.get('username'), data.get('password'))
        return jsonify(result) if result['success'] else (jsonify(result), 401)
    
    @app.route('/api/logout', methods=['POST'])
    def api_logout():
        auth_manager.logout()
        return jsonify({'success': True})
    
    @app.route('/api/auth/status', methods=['GET'])
    def api_auth_status():
        return jsonify({
            'authenticated': auth_manager.is_authenticated(),
            'role': session.get('role'),
            'username': session.get('username')
        })

# ==================== v3.3.0 ANALYTICS API ====================

if V3_3_FEATURES:
    @app.route('/api/analytics/commands', methods=['GET'])
    def api_analytics_commands():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_command_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/analytics/platforms', methods=['GET'])
    def api_analytics_platforms():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_platform_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/api/analytics/play-methods', methods=['GET'])
    def api_analytics_play_methods():
        days = int(request.args.get('days', 30))
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def get_stats():
            await analytics.init_tables()
            return await analytics.get_play_method_stats(days)
        
        try:
            future = asyncio.run_coroutine_threadsafe(get_stats(), bot.loop)
            return jsonify(future.result(timeout=5))
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ==================== v3.3.0 TRANSLATION API ====================

if V3_3_FEATURES:
    @app.route('/api/translate', methods=['POST'])
    def api_translate_lyrics():
        data = request.json
        lyrics = data.get('lyrics', '')
        target_lang = data.get('target_lang', 'en')
        
        if not lyrics:
            return jsonify({"error": "No lyrics provided"}), 400
        
        result = translator.translate_lyrics(lyrics, target_lang)
        return jsonify(result) if result else (jsonify({"error": "Translation failed"}), 500)
    
    @app.route('/api/translate/languages', methods=['GET'])
    def api_translate_languages():
        return jsonify(translator.get_supported_languages())


def start_background_tasks():
    """Start background tasks for real-time updates - disabled without SocketIO"""
    pass  # Background tasks disabled when SocketIO is None


# ==================== RUN SERVER ====================

def run_web_server(host: str = '0.0.0.0', port: int = 5000):
    """
    Run web dashboard server
    
    Args:
        host: Host to bind to
        port: Port to bind to
    """
    logger.info(f"Starting web dashboard on http://{host}:{port}")
    
    # Background tasks disabled (SocketIO not available)
    # start_background_tasks()
    
    # Silence Flask internal logs
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # Run server - use plain Flask
    app.run(host=host, port=port, debug=False, threaded=True, use_reloader=False)


def start_web_server_thread(host: str = '0.0.0.0', port: int = 5000):
    """
    Start web server in background thread
    
    Args:
        host: Host to bind to
        port: Port to bind to
    """
    thread = threading.Thread(
        target=run_web_server,
        args=(host, port),
        daemon=True,
        name="WebDashboard"
    )
    thread.start()
    # Silent start - no log message
    return thread

# ==================== v3.3.0 ADMIN CONTROLS API ====================

if V3_3_FEATURES:
    @app.route('/api/admin/maintenance', methods=['POST'])
    def api_admin_maintenance():
        """Toggle maintenance mode"""
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        data = request.json
        enable = data.get('enable', False)
        reason = data.get('reason', 'Server maintenance in progress. Please try again later.')
        
        # Set maintenance mode flag and reason
        bot.maintenance_mode = enable
        bot.maintenance_reason = reason
        
        logger.info(f"Maintenance mode {'enabled' if enable else 'disabled'}, reason: {reason}")
        
        return jsonify({
            'success': True,
            'maintenance_mode': enable,
            'reason': reason,
            'message': f"Maintenance mode {'enabled' if enable else 'disabled'}"
        })
    
    @app.route('/api/admin/bot/pause', methods=['POST'])
    def api_admin_bot_pause():
        """Pause all bot music playback"""
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def pause_all():
            count = 0
            for guild_id, connection in list(bot.voice_manager.connections.items()):
                if connection.is_playing():
                    connection.pause()
                    count += 1
            return count
        
        try:
            future = asyncio.run_coroutine_threadsafe(pause_all(), bot.loop)
            count = future.result(timeout=5)
            
            return jsonify({
                'success': True,
                'paused': count,
                'message': f"Paused playback in {count} servers"
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/admin/bot/resume', methods=['POST'])
    def api_admin_bot_resume():
        """Resume all bot music playback"""
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def resume_all():
            count = 0
            for guild_id, connection in list(bot.voice_manager.connections.items()):
                if connection.is_paused():
                    connection.resume()
                    count += 1
            return count
        
        try:
            future = asyncio.run_coroutine_threadsafe(resume_all(), bot.loop)
            count = future.result(timeout=5)
            
            return jsonify({
                'success': True,
                'resumed': count,
                'message': f"Resumed playback in {count} servers"
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/admin/bot/stop-all', methods=['POST'])
    def api_admin_bot_stop_all():
        """Stop and disconnect from all voice channels"""
        bot = get_bot()
        if not bot:
            return jsonify({"error": "Bot not connected"}), 503
        
        async def stop_all():
            count = 0
            for guild_id in list(bot.voice_manager.connections.keys()):
                await bot.voice_manager.disconnect(guild_id)
                count += 1
            return count
        
        try:
            future = asyncio.run_coroutine_threadsafe(stop_all(), bot.loop)
            count = future.result(timeout=10)
            
            return jsonify({
                'success': True,
                'stopped': count,
                'message': f"Stopped and disconnected from {count} servers"
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/admin/bot/restart', methods=['POST'])
    def api_admin_bot_restart():
        """Restart bot (requires supervisor/systemd)"""
        import os
        import signal
        
        logger.warning("Bot restart requested via web panel")
        
        # Send signal to restart (if using systemd/supervisor)
        def restart_bot():
            import time
            time.sleep(2)  # Give time for response
            os.kill(os.getpid(), signal.SIGTERM)
        
        import threading
        threading.Thread(target=restart_bot, daemon=True).start()
        
        return jsonify({
            'success': True,
            'message': 'Bot restart initiated. Will restart in 2 seconds.'
        })
    
    @app.route('/api/admin/system/shutdown', methods=['POST'])
    def api_admin_system_shutdown():
        """Shutdown bot completely"""
        import os
        import signal
        
        logger.warning("Bot shutdown requested via web panel")
        
        def shutdown_bot():
            import time
            time.sleep(2)
            os.kill(os.getpid(), signal.SIGTERM)
        
        import threading
        threading.Thread(target=shutdown_bot, daemon=True).start()
        
        return jsonify({
            'success': True,
            'message': 'Bot shutdown initiated. Will shutdown in 2 seconds.'
        })


# ==================== VERIFICATION API ====================

# In-memory storage for verification codes
_verification_codes = {}

@app.route('/api/verify/send-dm', methods=['POST'])
def api_verify_send_dm():
    """Send verification code via Discord DM"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.json
        user_id = data.get('userId')
        code = data.get('code')
        
        if not user_id or not code:
            return jsonify({"error": "User ID and code are required"}), 400
        
        logger.info(f"Sending verification code to user {user_id}")
        
        # Store the code for verification
        _verification_codes[str(user_id)] = {
            'code': code,
            'expires_at': time.time() + 5 * 60  # 5 minutes
        }
        
        # Send DM via bot
        loop = bot.loop
        
        async def send_verification_dm():
            try:
                user = await bot.fetch_user(int(user_id))
                if not user:
                    return False, "User not found"
                
                import discord
                embed = discord.Embed(
                    title="🔐 SONORA Verification Code",
                    description=f"Your verification code is:\n\n# `{code}`\n\nThis code will expire in 5 minutes.",
                    color=0x9B59B6  # Purple
                )
                embed.set_footer(text="SONORA Admin Dashboard • Do not share this code")
                
                await user.send(embed=embed)
                return True, "Sent successfully"
            except discord.Forbidden:
                return False, "Cannot send DM - user has DMs disabled"
            except Exception as e:
                return False, str(e)
        
        future = asyncio.run_coroutine_threadsafe(send_verification_dm(), loop)
        success, message = future.result(timeout=10)
        
        if success:
            logger.info(f"Verification code sent to user {user_id}")
            return jsonify({"success": True, "message": "Verification code sent to Discord DM"})
        else:
            logger.warning(f"Failed to send DM to user {user_id}: {message}")
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Failed to send verification DM: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/verify/check', methods=['POST'])
def api_verify_check():
    """Verify the code entered by user"""
    try:
        data = request.json
        user_id = data.get('userId')
        code = data.get('code')
        
        if not user_id or not code:
            return jsonify({"verified": False, "error": "User ID and code are required"}), 400
        
        stored = _verification_codes.get(str(user_id))
        
        if not stored:
            return jsonify({"verified": False, "error": "No verification code found. Please request a new one."}), 400
        
        if time.time() > stored['expires_at']:
            del _verification_codes[str(user_id)]
            return jsonify({"verified": False, "error": "Verification code has expired. Please request a new one."}), 400
        
        if stored['code'] != code:
            return jsonify({"verified": False, "error": "Invalid verification code"}), 400
        
        # Code is valid - remove it
        del _verification_codes[str(user_id)]
        logger.info(f"User {user_id} verified successfully")
        
        return jsonify({"verified": True, "message": "Verification successful"})
        
    except Exception as e:
        logger.error(f"Verification check failed: {e}")
        return jsonify({"error": str(e)}), 500
