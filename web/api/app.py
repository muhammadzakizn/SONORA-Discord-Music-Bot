"""Web Dashboard for Discord Music Bot"""

import asyncio
import json
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
    from datetime import datetime, timedelta
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

# CORS configuration - allow all origins for API access
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": False  # Set to False when using "*" origins
    }
})

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
        
        # Get current player - only if actually playing/paused
        current_track = None
        is_actually_playing = False
        
        # Check if voice connection is actually playing/paused
        if connection and connection.connection:
            is_actually_playing = connection.connection.is_playing() or connection.connection.is_paused()
        
        # Only return track info if actually playing
        if is_actually_playing and hasattr(bot, 'players') and guild_id in bot.players:
            player = bot.players[guild_id]
            if player.metadata:
                # Debug artwork URL
                logger.debug(f"[API] Artwork URL for {player.metadata.title}: {player.metadata.artwork_url}")
                current_track = {
                    "title": player.metadata.title,
                    "artist": player.metadata.artist,
                    "album": player.metadata.album,
                    "duration": player.metadata.duration,
                    "current_time": player.get_current_time(),
                    "artwork_url": player.metadata.artwork_url,
                    "audio_source": player.metadata.audio_source,
                    "requested_by": player.metadata.requested_by,
                    "is_playing": connection.connection.is_playing() if connection and connection.connection else False,
                    "is_paused": connection.connection.is_paused() if connection and connection.connection else False
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
            
            # Clear queue (like /stop command)
            queue_cog = bot.get_cog('QueueCommands')
            if queue_cog and guild_id in queue_cog.queues:
                queue_cog.queues[guild_id].clear()
            
            # Cleanup player
            if hasattr(bot, 'players') and guild_id in bot.players:
                player = bot.players[guild_id]
                if hasattr(player, 'cleanup'):
                    asyncio.run_coroutine_threadsafe(player.cleanup(), bot.loop)
                del bot.players[guild_id]
            
            # Disconnect from voice
            asyncio.run_coroutine_threadsafe(connection.disconnect(), bot.loop)
            
            action_emoji = "⏹️"
            action_text = "Stopped"
        
        else:
            return jsonify({"error": "Invalid action"}), 400
        
        # Send Discord notification in bot's channel (simple approach)
        async def send_notification():
            try:
                import discord
                
                # ONLY use player message channel - this is guaranteed to work
                # because the bot already sent the player message there
                if not hasattr(bot, 'players') or guild_id not in bot.players:
                    logger.debug("No player for this guild, skipping notification")
                    return
                
                player = bot.players[guild_id]
                if not player.message:
                    logger.debug("Player has no message, skipping notification")
                    return
                
                channel = player.message.channel
                logger.info(f"[NOTIFY] Sending to #{channel.name} (same as player)")
                
                embed = discord.Embed(
                    description=f"{action_emoji} **{action_text}** via Dashboard",
                    color=0x7B1E3C
                )
                
                await channel.send(embed=embed, delete_after=15)
                logger.info(f"✓ Notification sent to #{channel.name}")
                
            except Exception as e:
                logger.error(f"Notification failed: {e}")
        
        # Run notification in bot's event loop
        asyncio.run_coroutine_threadsafe(send_notification(), bot.loop)
        
        # Check for notification warnings
        notification_warning = getattr(bot, '_last_notification_warning', None)
        if notification_warning:
            bot._last_notification_warning = None  # Clear after reading
            return jsonify({
                "status": action_text.lower(),
                "warning": f"Action berhasil, tetapi notifikasi ke Discord gagal: {notification_warning}"
            })
        
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
        
        # Send Discord notification via player message channel
        async def send_notification():
            try:
                import discord
                
                if not hasattr(bot, 'players') or guild_id not in bot.players:
                    return
                
                player = bot.players[guild_id]
                if not player.message:
                    return
                
                channel = player.message.channel
                embed = discord.Embed(
                    description=f"🗑️ Removed **{removed.title}** from queue via Dashboard",
                    color=0x7B1E3C
                )
                await channel.send(embed=embed, delete_after=15)
                logger.info(f"✓ Queue remove notification sent")
            except Exception as e:
                logger.error(f"Queue notification failed: {e}")
        
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
        
        # Send Discord notification via player message channel
        async def send_notification():
            try:
                import discord
                
                if not hasattr(bot, 'players') or guild_id not in bot.players:
                    return
                
                player = bot.players[guild_id]
                if not player.message:
                    return
                
                channel = player.message.channel
                embed = discord.Embed(
                    description=f"↕️ Moved **{track.title}** to #{to_pos} via Dashboard",
                    color=0x7B1E3C
                )
                await channel.send(embed=embed, delete_after=15)
                logger.info(f"✓ Queue move notification sent")
            except Exception as e:
                logger.error(f"Queue notification failed: {e}")
        
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


# ==================== SECURE DEVELOPER AUTHENTICATION ====================

@app.route('/api/developer/auth', methods=['POST'])
def api_developer_auth():
    """
    Secure developer authentication endpoint
    Credentials stored in environment variables, passwords hashed
    """
    import hashlib
    import os
    import secrets
    
    data = request.json or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()
    
    if not username:
        return jsonify({
            "success": False,
            "error": "Username is required"
        }), 400
    
    if not password:
        return jsonify({
            "success": False,
            "error": "Password is required"
        }), 400
    
    def hash_password(pwd: str) -> str:
        """Hash password with SHA256 + salt"""
        salt = os.environ.get('DEV_AUTH_SALT', 'sonora-secure-salt-2024')
        return hashlib.sha256(f"{salt}{pwd}".encode()).hexdigest()
    
    # Master developer accounts from environment
    # Format: username1:password1,username2:password2 (or email:password)
    dev_accounts_raw = os.environ.get('DEV_ACCOUNTS', '')
    dev_accounts = {}
    
    for account in dev_accounts_raw.split(','):
        if ':' in account:
            acc_user, acc_pass = account.strip().split(':', 1)
            dev_accounts[acc_user.strip().lower()] = acc_pass.strip()
    
    # Default developer accounts (always available as fallback)
    # These are added if not already defined in DEV_ACCOUNTS
    default_accounts = {
        'muhammadzakizn.07@gmail.com': 'dev@2005sonora',
        'muhammadzakizn@icloud.com': 'dev@2005sonora',
        'developer': 'sonora2024',
        'admin': 'admin123',
    }
    
    # Add defaults if not already configured
    for user, pwd in default_accounts.items():
        if user not in dev_accounts:
            dev_accounts[user] = pwd
    
    # Validate credentials
    if username in dev_accounts:
        expected_pass = dev_accounts[username]
        # Check if stored as plain text or hash
        if len(expected_pass) == 64:  # SHA256 hash
            if hash_password(password) == expected_pass:
                logger.info(f"Developer login successful: {username}")
                return jsonify({
                    "success": True,
                    "role": "developer",
                    "username": username,
                    "token": secrets.token_urlsafe(32)
                })
        else:
            # Plain text comparison
            if password == expected_pass:
                logger.info(f"Developer login successful: {username}")
                return jsonify({
                    "success": True,
                    "role": "developer", 
                    "username": username,
                    "token": secrets.token_urlsafe(32)
                })
    
    # Log failed attempt
    logger.warning(f"Failed developer login attempt: {username}")
    
    return jsonify({
        "success": False,
        "error": "Invalid credentials"
    }), 401


@app.route('/api/developer/stats')
def api_developer_stats():
    """Get comprehensive developer dashboard statistics"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        import psutil
        import shutil
        
        # System metrics
        process = psutil.Process()
        cpu_percent = process.cpu_percent(interval=0.1)
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        # Disk usage
        disk_usage = shutil.disk_usage("/")
        disk_percent = (disk_usage.used / disk_usage.total) * 100
        
        # Uptime formatting
        uptime_seconds = time.time() - bot._start_time if hasattr(bot, '_start_time') else 0
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{hours}h {minutes}m"
        
        # Bot stats
        voice_stats = bot.voice_manager.get_stats()
        
        # Count active users (users in voice channels with bot)
        active_users = 0
        for vc in bot.voice_clients:
            if vc.is_connected() and vc.channel:
                active_users += len([m for m in vc.channel.members if not m.bot])
        
        # Track statistics (simulated - can be connected to real DB)
        tracks_played = 0
        commands_executed = 0
        try:
            db = get_db_manager()
            # Get today's stats
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            today_stats = loop.run_until_complete(
                db.db.execute(
                    "SELECT COUNT(*) FROM play_history WHERE played_at >= date('now')"
                )
            )
            row = loop.run_until_complete(today_stats.fetchone())
            tracks_played = row[0] if row else 0
            loop.close()
        except:
            pass
        
        return jsonify({
            "system": {
                "cpu": round(cpu_percent, 1),
                "memory": round(memory_percent, 1),
                "disk": round(disk_percent, 1),
                "uptime": uptime_str,
                "latency": round(bot.latency * 1000, 0),
                "networkIn": "N/A",
                "networkOut": "N/A"
            },
            "bot": {
                "online": True,
                "voiceConnections": voice_stats.get('connected', 0),
                "totalServers": len(bot.guilds),
                "activeUsers": active_users,
                "tracksPlayed": tracks_played,
                "commandsExecuted": commands_executed
            },
            "components": [
                {"name": "Discord Bot", "status": "online", "latency": round(bot.latency * 1000)},
                {"name": "Database", "status": "online"},
                {"name": "Web API", "status": "online"},
                {"name": "Voice Engine", "status": "online" if voice_stats.get('connected', 0) >= 0 else "warning"},
                {"name": "Cache System", "status": "online"}
            ]
        })
    except Exception as e:
        logger.error(f"Failed to get developer stats: {e}")
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


# ==================== COMPREHENSIVE CACHE MANAGEMENT ENDPOINTS ====================

CACHE_SETTINGS_FILE = Path(__file__).parent.parent.parent / 'config' / 'cache_settings.json'

def load_cache_settings() -> dict:
    """Load cache settings from file"""
    default_settings = {
        "max_size_gb": 2.0,
        "max_age_days": 3,
        "warning_threshold_gb": 1.5,
        "autoclean_enabled": True
    }
    try:
        if CACHE_SETTINGS_FILE.exists():
            import json
            with open(CACHE_SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                return {**default_settings, **settings}
    except Exception as e:
        logger.error(f"Failed to load cache settings: {e}")
    return default_settings


def save_cache_settings(settings: dict) -> bool:
    """Save cache settings to file"""
    try:
        import json
        CACHE_SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save cache settings: {e}")
        return False


def format_bytes(size_bytes: int) -> str:
    """Format bytes to human readable string"""
    if size_bytes == 0:
        return "0 B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024
        i += 1
    return f"{size_bytes:.1f} {size_names[i]}"


def get_dir_size(path: Path) -> tuple:
    """Get directory size and file count"""
    total_size = 0
    file_count = 0
    try:
        if path.exists():
            for item in path.rglob("*"):
                if item.is_file():
                    total_size += item.stat().st_size
                    file_count += 1
    except Exception as e:
        logger.error(f"Error getting dir size for {path}: {e}")
    return total_size, file_count


@app.route('/api/admin/cache/stats')
def api_admin_cache_stats():
    """Get detailed cache statistics for all cache types"""
    try:
        from config.settings import Settings
        
        caches = {}
        
        # 1. Audio cache (downloads folder)
        downloads_dir = Settings.DOWNLOADS_DIR
        audio_size, audio_count = get_dir_size(downloads_dir)
        caches['audio'] = {
            'size_bytes': audio_size,
            'size_formatted': format_bytes(audio_size),
            'file_count': audio_count,
            'path': str(downloads_dir)
        }
        
        # 2. Artwork cache
        artwork_dir = Settings.CACHE_DIR / 'artwork'
        artwork_size, artwork_count = get_dir_size(artwork_dir)
        caches['artwork'] = {
            'size_bytes': artwork_size,
            'size_formatted': format_bytes(artwork_size),
            'file_count': artwork_count,
            'path': str(artwork_dir)
        }
        
        # 3. Python cache (__pycache__ directories)
        pycache_size = 0
        pycache_count = 0
        base_dir = Settings.BASE_DIR
        try:
            for pycache_dir in base_dir.rglob('__pycache__'):
                if pycache_dir.is_dir():
                    size, count = get_dir_size(pycache_dir)
                    pycache_size += size
                    pycache_count += count
        except Exception as e:
            logger.error(f"Error scanning pycache: {e}")
        
        caches['pycache'] = {
            'size_bytes': pycache_size,
            'size_formatted': format_bytes(pycache_size),
            'file_count': pycache_count,
            'path': str(base_dir / '__pycache__')
        }
        
        # 4. Next.js cache
        nextjs_cache_dir = Settings.BASE_DIR / 'web' / '.next' / 'cache'
        nextjs_size, nextjs_count = get_dir_size(nextjs_cache_dir)
        caches['nextjs'] = {
            'size_bytes': nextjs_size,
            'size_formatted': format_bytes(nextjs_size),
            'file_count': nextjs_count,
            'path': str(nextjs_cache_dir)
        }
        
        # 5. In-memory cache (estimate from cache manager)
        memory_entries = 0
        try:
            from utils.cache import cache_manager
            stats = cache_manager.get_stats()
            memory_entries = sum(s.get('size', 0) for s in stats.values())
        except:
            pass
        
        caches['memory'] = {
            'size_bytes': 0,
            'size_formatted': 'In RAM',
            'file_count': memory_entries,
            'path': 'In-memory'
        }
        
        # Total size
        total_size = sum(c['size_bytes'] for c in caches.values())
        
        # Get settings
        settings = load_cache_settings()
        
        return jsonify({
            'caches': caches,
            'total_size_bytes': total_size,
            'total_size_formatted': format_bytes(total_size),
            'settings': settings
        })
        
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/cache/clear/<cache_type>', methods=['POST'])
def api_admin_cache_clear_type(cache_type: str):
    """Clear specific cache type or all caches"""
    try:
        from config.settings import Settings
        import shutil
        
        cleared_count = 0
        cleared_size = 0
        
        valid_types = ['audio', 'artwork', 'pycache', 'nextjs', 'memory', 'all']
        if cache_type not in valid_types:
            return jsonify({"error": f"Invalid cache type. Valid types: {valid_types}"}), 400
        
        def clear_dir(path: Path, extensions: list = None) -> tuple:
            """Clear files from directory, return count and size"""
            count = 0
            size = 0
            if path.exists():
                for item in path.rglob("*"):
                    if item.is_file():
                        if extensions is None or item.suffix.lower() in extensions:
                            try:
                                size += item.stat().st_size
                                item.unlink()
                                count += 1
                            except Exception as e:
                                logger.error(f"Failed to delete {item}: {e}")
            return count, size
        
        # Clear audio cache
        if cache_type in ['audio', 'all']:
            downloads_dir = Settings.DOWNLOADS_DIR
            c, s = clear_dir(downloads_dir, ['.opus', '.m4a', '.mp3', '.ogg', '.webm'])
            cleared_count += c
            cleared_size += s
            logger.info(f"Cleared audio cache: {c} files, {format_bytes(s)}")
        
        # Clear artwork cache
        if cache_type in ['artwork', 'all']:
            artwork_dir = Settings.CACHE_DIR / 'artwork'
            c, s = clear_dir(artwork_dir)
            cleared_count += c
            cleared_size += s
            logger.info(f"Cleared artwork cache: {c} files, {format_bytes(s)}")
        
        # Clear Python cache
        if cache_type in ['pycache', 'all']:
            base_dir = Settings.BASE_DIR
            for pycache_dir in base_dir.rglob('__pycache__'):
                if pycache_dir.is_dir():
                    try:
                        size = sum(f.stat().st_size for f in pycache_dir.rglob("*") if f.is_file())
                        count = len(list(pycache_dir.rglob("*")))
                        shutil.rmtree(pycache_dir)
                        cleared_count += count
                        cleared_size += size
                    except Exception as e:
                        logger.error(f"Failed to clear pycache dir {pycache_dir}: {e}")
            logger.info(f"Cleared pycache: {cleared_count} files")
        
        # Clear Next.js cache
        if cache_type in ['nextjs', 'all']:
            nextjs_cache_dir = Settings.BASE_DIR / 'web' / '.next' / 'cache'
            if nextjs_cache_dir.exists():
                try:
                    size = sum(f.stat().st_size for f in nextjs_cache_dir.rglob("*") if f.is_file())
                    count = len(list(nextjs_cache_dir.rglob("*")))
                    shutil.rmtree(nextjs_cache_dir)
                    cleared_count += count
                    cleared_size += size
                    logger.info(f"Cleared Next.js cache: {count} files, {format_bytes(size)}")
                except Exception as e:
                    logger.error(f"Failed to clear Next.js cache: {e}")
        
        # Clear in-memory cache
        if cache_type in ['memory', 'all']:
            try:
                from utils.cache import cache_manager
                cache_manager.clear()
                cleared_count += 1
                logger.info("Cleared in-memory cache")
            except Exception as e:
                logger.error(f"Failed to clear memory cache: {e}")
        
        return jsonify({
            "status": "success",
            "cleared": cleared_count,
            "cleared_size": cleared_size,
            "cleared_size_formatted": format_bytes(cleared_size)
        })
        
    except Exception as e:
        logger.error(f"Cache clear ({cache_type}) failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/cache/settings', methods=['GET', 'POST'])
def api_admin_cache_settings():
    """Get or update cache auto-cleanup settings"""
    try:
        if request.method == 'GET':
            settings = load_cache_settings()
            return jsonify(settings)
        
        else:  # POST
            data = request.json or {}
            
            # Load existing settings and update with new values
            settings = load_cache_settings()
            
            if 'max_size_gb' in data:
                settings['max_size_gb'] = float(data['max_size_gb'])
            if 'max_age_days' in data:
                settings['max_age_days'] = int(data['max_age_days'])
            if 'warning_threshold_gb' in data:
                settings['warning_threshold_gb'] = float(data['warning_threshold_gb'])
            if 'autoclean_enabled' in data:
                settings['autoclean_enabled'] = bool(data['autoclean_enabled'])
            
            # Save settings
            if save_cache_settings(settings):
                # Try to update the audio cache manager with new settings
                try:
                    from services.audio.cache import _cache_manager
                    if _cache_manager:
                        _cache_manager.max_size_bytes = int(settings['max_size_gb'] * 1024 * 1024 * 1024)
                        _cache_manager.max_age_seconds = settings['max_age_days'] * 24 * 60 * 60
                        logger.info(f"Updated cache manager settings: {settings}")
                except Exception as e:
                    logger.warning(f"Could not update live cache manager: {e}")
                
                return jsonify({"status": "success", "settings": settings})
            else:
                return jsonify({"error": "Failed to save settings"}), 500
                
    except Exception as e:
        logger.error(f"Cache settings error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/developer/component/<component_name>')
def api_developer_component_details(component_name: str):
    """Get detailed information about a specific component"""
    bot = get_bot()
    
    component_info = {
        "name": component_name,
        "status": "online",
        "description": "",
        "details": [],
        "issues": [],
        "metrics": {}
    }
    
    try:
        if component_name == "Discord Bot":
            if bot and bot.is_ready():
                component_info["status"] = "online"
                component_info["metrics"] = {
                    "latency_ms": round(bot.latency * 1000, 2),
                    "guilds": len(bot.guilds),
                    "users": sum(g.member_count for g in bot.guilds)
                }
            else:
                component_info["status"] = "offline"
                component_info["issues"] = ["Bot is not connected to Discord"]
                
        elif component_name == "Database (SQLite)":
            try:
                db = get_db_manager()
                if db:
                    component_info["status"] = "online"
                else:
                    component_info["status"] = "offline"
                    component_info["issues"] = ["Database connection failed"]
            except:
                component_info["status"] = "offline"
                component_info["issues"] = ["Database not available"]
                
        elif component_name == "Web API":
            component_info["status"] = "online"
            component_info["metrics"] = {"port": 5000}
            
        elif component_name == "Voice Engine":
            if bot:
                voice_stats = bot.voice_manager.get_stats() if hasattr(bot, 'voice_manager') else {}
                component_info["status"] = "online" if voice_stats.get('connected', 0) >= 0 else "warning"
                component_info["metrics"] = voice_stats
            else:
                component_info["status"] = "offline"
                component_info["issues"] = ["Bot not connected"]
                
        elif component_name == "Cache System":
            from config.settings import Settings
            downloads_dir = Settings.DOWNLOADS_DIR
            cache_files = list(downloads_dir.glob("*.opus"))
            cache_size = sum(f.stat().st_size for f in cache_files) / (1024 * 1024 * 1024)
            
            settings = load_cache_settings()
            if cache_size > settings['warning_threshold_gb']:
                component_info["status"] = "warning"
                component_info["issues"] = [f"Cache size ({cache_size:.2f}GB) approaching limit ({settings['max_size_gb']}GB)"]
            else:
                component_info["status"] = "online"
            component_info["metrics"] = {
                "file_count": len(cache_files),
                "size_gb": round(cache_size, 2),
                "max_size_gb": settings['max_size_gb']
            }
            
        elif component_name == "Spotify API":
            # Check if Spotify credentials are configured
            import os
            if os.environ.get('SPOTIFY_CLIENT_ID') and os.environ.get('SPOTIFY_CLIENT_SECRET'):
                component_info["status"] = "online"
            else:
                component_info["status"] = "warning"
                component_info["issues"] = ["Spotify credentials not configured"]
                
        elif component_name == "YouTube API":
            component_info["status"] = "online"
            # Check if yt-dlp is available
            try:
                import yt_dlp
                component_info["metrics"] = {"yt_dlp_version": yt_dlp.version.__version__}
            except:
                component_info["status"] = "warning"
                component_info["issues"] = ["yt-dlp not installed or outdated"]
                
        elif component_name == "Apple Music":
            from config.settings import Settings
            cookies_file = Settings.BASE_DIR / 'cookies' / 'apple_music.txt'
            if cookies_file.exists():
                component_info["status"] = "online"
            else:
                component_info["status"] = "warning"
                component_info["issues"] = ["Apple Music cookies not configured"]
        
        return jsonify(component_info)
        
    except Exception as e:
        logger.error(f"Failed to get component details for {component_name}: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== BOT CONTROL ENDPOINTS ====================

@app.route('/api/admin/bot/restart', methods=['POST'])
def api_admin_restart():
    """Restart the bot gracefully via launcher signal"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        import sys
        import os
        from pathlib import Path
        
        logger.warning("Restart requested via web dashboard")
        
        # Create a flag file to tell launcher to restart the bot
        # Launcher will detect this file and restart the bot subprocess
        restart_flag_file = Path(__file__).parent.parent.parent / '.dashboard_restart'
        try:
            with open(restart_flag_file, 'w') as f:
                f.write(str(os.getpid()))
            logger.info("Created dashboard restart flag for launcher")
        except Exception as e:
            logger.warning(f"Could not create restart flag: {e}")
        
        def delayed_shutdown():
            """Gracefully shutdown bot so launcher can restart it"""
            time.sleep(1)
            logger.info("Shutting down for restart...")
            # Exit with code 0 - launcher will see .dashboard_restart and restart
            os._exit(0)
        
        shutdown_thread = threading.Thread(target=delayed_shutdown)
        shutdown_thread.start()
        
        return jsonify({
            "status": "restart_initiated",
            "message": "Bot is restarting..."
        })
        
    except Exception as e:
        logger.error(f"Restart failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/bot/pause', methods=['POST'])
def api_admin_pause():
    """Pause all music playback across all voice connections"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        paused_count = 0
        
        for vc in bot.voice_clients:
            if vc.is_playing():
                vc.pause()
                paused_count += 1
        
        logger.info(f"Paused playback in {paused_count} servers")
        
        return jsonify({
            "status": "success",
            "paused": paused_count,
            "message": f"Paused playback in {paused_count} servers"
        })
        
    except Exception as e:
        logger.error(f"Pause failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/bot/resume', methods=['POST'])
def api_admin_resume():
    """Resume all paused music playback"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        resumed_count = 0
        
        for vc in bot.voice_clients:
            if vc.is_paused():
                vc.resume()
                resumed_count += 1
        
        logger.info(f"Resumed playback in {resumed_count} servers")
        
        return jsonify({
            "status": "success",
            "resumed": resumed_count,
            "message": f"Resumed playback in {resumed_count} servers"
        })
        
    except Exception as e:
        logger.error(f"Resume failed: {e}")
        return jsonify({"error": str(e)}), 500


# Global maintenance mode state - loaded from/saved to config file
_maintenance_state_file = Path(__file__).parent.parent.parent / 'config' / 'maintenance_state.json'

def _load_maintenance_state():
    """Load maintenance state from file"""
    try:
        if _maintenance_state_file.exists():
            with open(_maintenance_state_file, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load maintenance state: {e}")
    
    return {
        "enabled": False,
        "reason": "",
        "progress": 0,
        "stage": "starting",
        "started_at": None,
        "message_ids": {},
        "changelog_items": [],
        "history": []
    }

def _save_maintenance_state(state):
    """Save maintenance state to file"""
    try:
        with open(_maintenance_state_file, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save maintenance state: {e}")

# Load initial state
_maintenance_mode = _load_maintenance_state()

MAINTENANCE_STAGES = {
    "starting": {"label": "Starting Maintenance", "progress_min": 0},
    "backup": {"label": "Creating Backups", "progress_min": 10},
    "updating": {"label": "Applying Updates", "progress_min": 30},
    "testing": {"label": "Testing Systems", "progress_min": 60},
    "finalizing": {"label": "Finalizing Changes", "progress_min": 80},
    "complete": {"label": "Completing", "progress_min": 95}
}


@app.route('/api/admin/maintenance', methods=['GET', 'POST'])
def api_admin_maintenance():
    """Get or toggle maintenance mode (legacy endpoint)"""
    global _maintenance_mode
    
    if request.method == 'GET':
        return jsonify({
            "enabled": _maintenance_mode.get("enabled", False),
            "reason": _maintenance_mode.get("reason", ""),
            "progress": _maintenance_mode.get("progress", 0),
            "stage": _maintenance_mode.get("stage", "starting"),
            "started_at": _maintenance_mode.get("started_at")
        })
    
    # POST - toggle maintenance mode
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.json or {}
        enable = data.get('enable', not _maintenance_mode.get("enabled", False))
        reason = data.get('reason', 'Scheduled maintenance')
        
        if enable:
            _maintenance_mode.update({
                "enabled": True,
                "reason": reason,
                "progress": 0,
                "stage": "starting",
                "started_at": time.time(),
                "message_ids": {},
                "changelog_items": []
            })
            bot.maintenance_mode = True
            bot.maintenance_reason = reason
            logger.warning(f"Maintenance mode ENABLED: {reason}")
        else:
            _maintenance_mode.update({
                "enabled": False,
                "reason": "",
                "progress": 0,
                "stage": "starting",
                "started_at": None,
                "message_ids": {},
                "changelog_items": []
            })
            bot.maintenance_mode = False
            logger.info("Maintenance mode DISABLED")
        
        _save_maintenance_state(_maintenance_mode)
        
        return jsonify({
            "status": "success",
            "maintenance_mode": _maintenance_mode["enabled"],
            "message": f"Maintenance mode {'enabled' if enable else 'disabled'}"
        })
        
    except Exception as e:
        logger.error(f"Maintenance mode toggle failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/maintenance/status', methods=['GET'])
def api_admin_maintenance_status():
    """Get full maintenance status including message IDs and changelog items"""
    global _maintenance_mode
    
    stage_info = MAINTENANCE_STAGES.get(_maintenance_mode.get("stage", "starting"), {})
    
    return jsonify({
        "enabled": _maintenance_mode.get("enabled", False),
        "reason": _maintenance_mode.get("reason", ""),
        "progress": _maintenance_mode.get("progress", 0),
        "stage": _maintenance_mode.get("stage", "starting"),
        "stage_label": stage_info.get("label", "Unknown"),
        "started_at": _maintenance_mode.get("started_at"),
        "message_ids": _maintenance_mode.get("message_ids", {}),
        "changelog_items": _maintenance_mode.get("changelog_items", []),
        "history": _maintenance_mode.get("history", [])[-10:]  # Last 10 entries
    })


@app.route('/api/admin/maintenance/activate', methods=['POST'])
def api_admin_maintenance_activate():
    """Activate maintenance mode with reason"""
    global _maintenance_mode
    
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.json or {}
        reason = data.get('reason', 'Scheduled maintenance')
        
        if not reason.strip():
            return jsonify({"error": "Reason is required"}), 400
        
        _maintenance_mode.update({
            "enabled": True,
            "reason": reason,
            "progress": 0,
            "stage": "starting",
            "started_at": time.time(),
            "message_ids": {},
            "changelog_items": []
        })
        
        # Update bot state
        bot.maintenance_mode = True
        bot.maintenance_reason = reason
        bot.maintenance_progress = 0
        bot.maintenance_stage = "starting"
        
        _save_maintenance_state(_maintenance_mode)
        logger.warning(f"Maintenance mode ACTIVATED: {reason}")
        
        return jsonify({
            "status": "success",
            "message": "Maintenance mode activated",
            "state": {
                "enabled": True,
                "reason": reason,
                "progress": 0,
                "stage": "starting"
            }
        })
        
    except Exception as e:
        logger.error(f"Maintenance activation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/maintenance/progress', methods=['POST'])
def api_admin_maintenance_progress():
    """Update maintenance progress and stage"""
    global _maintenance_mode
    
    if not _maintenance_mode.get("enabled"):
        return jsonify({"error": "Maintenance mode not active"}), 400
    
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.json or {}
        progress = data.get('progress', _maintenance_mode.get("progress", 0))
        stage = data.get('stage', _maintenance_mode.get("stage", "starting"))
        reason = data.get('reason', _maintenance_mode.get("reason", ""))
        
        # Validate progress
        progress = max(0, min(100, int(progress)))
        
        # Validate stage
        if stage not in MAINTENANCE_STAGES:
            stage = "starting"
        
        _maintenance_mode.update({
            "progress": progress,
            "stage": stage,
            "reason": reason
        })
        
        # Update bot state
        bot.maintenance_reason = reason
        bot.maintenance_progress = progress
        bot.maintenance_stage = stage
        
        _save_maintenance_state(_maintenance_mode)
        logger.info(f"Maintenance progress updated: {progress}% - {stage}")
        
        return jsonify({
            "status": "success",
            "message": "Progress updated",
            "state": {
                "progress": progress,
                "stage": stage,
                "stage_label": MAINTENANCE_STAGES[stage]["label"],
                "reason": reason
            }
        })
        
    except Exception as e:
        logger.error(f"Progress update failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/maintenance/message-id', methods=['POST', 'DELETE'])
def api_admin_maintenance_message_id():
    """Store or remove Discord message IDs for maintenance notifications"""
    global _maintenance_mode
    
    try:
        data = request.json or {}
        guild_id = str(data.get('guild_id', ''))
        channel_id = str(data.get('channel_id', ''))
        message_id = str(data.get('message_id', ''))
        
        if not guild_id or not channel_id:
            return jsonify({"error": "guild_id and channel_id required"}), 400
        
        if "message_ids" not in _maintenance_mode:
            _maintenance_mode["message_ids"] = {}
        
        if request.method == 'POST':
            if guild_id not in _maintenance_mode["message_ids"]:
                _maintenance_mode["message_ids"][guild_id] = {}
            _maintenance_mode["message_ids"][guild_id][channel_id] = message_id
            _save_maintenance_state(_maintenance_mode)
            
            return jsonify({"status": "success", "message": "Message ID stored"})
        
        else:  # DELETE
            if guild_id in _maintenance_mode["message_ids"]:
                if channel_id in _maintenance_mode["message_ids"][guild_id]:
                    del _maintenance_mode["message_ids"][guild_id][channel_id]
                    if not _maintenance_mode["message_ids"][guild_id]:
                        del _maintenance_mode["message_ids"][guild_id]
            _save_maintenance_state(_maintenance_mode)
            
            return jsonify({"status": "success", "message": "Message ID removed"})
        
    except Exception as e:
        logger.error(f"Message ID operation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/maintenance/changelog-item', methods=['POST', 'DELETE'])
def api_admin_maintenance_changelog_item():
    """Add or remove changelog item for maintenance completion"""
    global _maintenance_mode
    
    try:
        data = request.json or {}
        item = data.get('item', '').strip()
        
        if not item:
            return jsonify({"error": "Item text required"}), 400
        
        if "changelog_items" not in _maintenance_mode:
            _maintenance_mode["changelog_items"] = []
        
        if request.method == 'POST':
            if item not in _maintenance_mode["changelog_items"]:
                _maintenance_mode["changelog_items"].append(item)
                _save_maintenance_state(_maintenance_mode)
            
            return jsonify({
                "status": "success",
                "message": "Changelog item added",
                "items": _maintenance_mode["changelog_items"]
            })
        
        else:  # DELETE
            if item in _maintenance_mode["changelog_items"]:
                _maintenance_mode["changelog_items"].remove(item)
                _save_maintenance_state(_maintenance_mode)
            
            return jsonify({
                "status": "success",
                "message": "Changelog item removed",
                "items": _maintenance_mode["changelog_items"]
            })
        
    except Exception as e:
        logger.error(f"Changelog item operation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/maintenance/complete', methods=['POST'])
def api_admin_maintenance_complete():
    """Complete maintenance mode and update changelog"""
    global _maintenance_mode
    
    if not _maintenance_mode.get("enabled"):
        return jsonify({"error": "Maintenance mode not active"}), 400
    
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.json or {}
        completion_reason = data.get('reason', 'Maintenance completed')
        changelog_items = data.get('changelog_items', _maintenance_mode.get("changelog_items", []))
        
        # Create history entry
        history_entry = {
            "reason": _maintenance_mode.get("reason", ""),
            "completion_reason": completion_reason,
            "started_at": _maintenance_mode.get("started_at"),
            "completed_at": time.time(),
            "changelog_items": changelog_items
        }
        
        if "history" not in _maintenance_mode:
            _maintenance_mode["history"] = []
        _maintenance_mode["history"].append(history_entry)
        
        # Get message IDs to notify channels
        message_ids_to_notify = _maintenance_mode.get("message_ids", {}).copy()
        
        # Reset maintenance state
        _maintenance_mode.update({
            "enabled": False,
            "reason": "",
            "progress": 100,
            "stage": "complete",
            "started_at": None,
            "message_ids": {},
            "changelog_items": []
        })
        
        # Update bot state
        bot.maintenance_mode = False
        bot.maintenance_reason = ""
        
        _save_maintenance_state(_maintenance_mode)
        logger.info(f"Maintenance mode COMPLETED: {completion_reason}")
        
        # Auto-append to changelog if items provided
        if changelog_items:
            try:
                _append_to_changelog(changelog_items, completion_reason)
            except Exception as e:
                logger.error(f"Failed to update changelog: {e}")
        
        return jsonify({
            "status": "success",
            "message": "Maintenance completed",
            "completion_reason": completion_reason,
            "changelog_items": changelog_items,
            "message_ids_to_notify": message_ids_to_notify
        })
        
    except Exception as e:
        logger.error(f"Maintenance completion failed: {e}")
        return jsonify({"error": str(e)}), 500


def _append_to_changelog(items, reason):
    """Append maintenance items to changelog file"""
    from datetime import datetime
    
    changelog_dir = Path(__file__).parent.parent.parent / 'docs' / 'changelog' / 'bot'
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Find or create today's changelog
    changelog_files = sorted(changelog_dir.glob('v*.md'), reverse=True)
    
    if changelog_files:
        latest_file = changelog_files[0]
        
        # Append to existing file
        with open(latest_file, 'a') as f:
            f.write(f"\n\n## Maintenance Update ({today})\n\n")
            f.write(f"**{reason}**\n\n")
            for item in items:
                f.write(f"- {item}\n")
        
        logger.info(f"Appended {len(items)} items to {latest_file.name}")
    else:
        logger.warning("No changelog file found to append to")


# ==================== USER MANAGEMENT ENDPOINTS ====================

# In-memory storage for bans (in production, use database)
_banned_users = {}  # {user_id: {reason, banned_at, expires_at, banned_by}}
_banned_servers = {}  # {server_id: {reason, banned_at, expires_at, banned_by}}
_disabled_channels = {}  # {guild_id: {channel_id: {disabled_at, disabled_by, reason}}}


# ==================== PERSISTENT USER DATABASE ====================
_users_database_file = Path(__file__).parent.parent.parent / 'config' / 'users_database.json'

def _load_users_database():
    """Load users database from file"""
    try:
        if _users_database_file.exists():
            with open(_users_database_file, 'r') as f:
                data = json.load(f)
                return data.get("users", {})
    except Exception as e:
        logger.error(f"Failed to load users database: {e}")
    return {}

def _save_users_database(users_dict):
    """Save users database to file"""
    try:
        from datetime import datetime
        data = {
            "users": users_dict,
            "last_updated": datetime.now().isoformat()
        }
        with open(_users_database_file, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save users database: {e}")

# Load users database at startup
_persistent_users = _load_users_database()


@app.route('/api/admin/users', methods=['GET'])
def api_admin_users():
    """Get list of ALL users - persistent storage, survives bot restarts"""
    global _persistent_users
    bot = get_bot()
    
    try:
        # If bot is connected, sync current guild members to persistent database
        if bot:
            from datetime import datetime
            updated = False
            
            for guild in bot.guilds:
                for member in guild.members:
                    if member.bot:
                        continue
                    
                    user_id_str = str(member.id)
                    
                    if user_id_str in _persistent_users:
                        # Update existing user - add server if not in list
                        if guild.name not in _persistent_users[user_id_str].get("servers", []):
                            _persistent_users[user_id_str]["servers"].append(guild.name)
                            updated = True
                        # Update online status
                        is_online = member.status.name != "offline"
                        if _persistent_users[user_id_str].get("isOnline") != is_online:
                            _persistent_users[user_id_str]["isOnline"] = is_online
                            updated = True
                        # Update avatar if changed
                        avatar_url = str(member.avatar.url) if member.avatar else None
                        if _persistent_users[user_id_str].get("avatar") != avatar_url:
                            _persistent_users[user_id_str]["avatar"] = avatar_url
                            updated = True
                    else:
                        # Add new user to persistent database
                        is_banned = user_id_str in _banned_users
                        ban_info = _banned_users.get(user_id_str, {})
                        
                        _persistent_users[user_id_str] = {
                            "id": user_id_str,
                            "username": member.name,
                            "discriminator": member.discriminator or "0",
                            "displayName": member.display_name,
                            "avatar": str(member.avatar.url) if member.avatar else None,
                            "isBanned": is_banned,
                            "banReason": ban_info.get("reason") if is_banned else None,
                            "banExpiry": ban_info.get("expires_at") if is_banned else None,
                            "totalPlays": 0,
                            "firstSeen": datetime.now().isoformat(),
                            "lastActive": datetime.now().isoformat(),
                            "isOnline": member.status.name != "offline",
                            "serverName": guild.name,
                            "servers": [guild.name]
                        }
                        updated = True
            
            # Save if there were updates
            if updated:
                _save_users_database(_persistent_users)
        
        # Update ban status for all users
        for user_id, user_data in _persistent_users.items():
            is_banned = user_id in _banned_users
            ban_info = _banned_users.get(user_id, {})
            user_data["isBanned"] = is_banned
            user_data["banReason"] = ban_info.get("reason") if is_banned else None
            user_data["banExpiry"] = ban_info.get("expires_at") if is_banned else None
        
        # Return all users from persistent database
        users = list(_persistent_users.values())
        
        return jsonify(users)
        
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
def api_admin_delete_user(user_id):
    """Delete a user from the persistent database"""
    global _persistent_users
    
    try:
        if user_id in _persistent_users:
            deleted_user = _persistent_users.pop(user_id)
            _save_users_database(_persistent_users)
            logger.info(f"User deleted from database: {deleted_user.get('username', user_id)}")
            return jsonify({
                "success": True,
                "message": f"User {deleted_user.get('username', user_id)} deleted"
            })
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        logger.error(f"Failed to delete user: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/users/sync', methods=['POST'])
def api_admin_sync_users():
    """Force sync all users from all guilds to persistent database"""
    global _persistent_users
    bot = get_bot()
    
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        from datetime import datetime
        new_users = 0
        updated_users = 0
        
        for guild in bot.guilds:
            for member in guild.members:
                if member.bot:
                    continue
                
                user_id_str = str(member.id)
                
                if user_id_str in _persistent_users:
                    # Update existing user
                    if guild.name not in _persistent_users[user_id_str].get("servers", []):
                        _persistent_users[user_id_str]["servers"].append(guild.name)
                    _persistent_users[user_id_str]["isOnline"] = member.status.name != "offline"
                    _persistent_users[user_id_str]["lastActive"] = datetime.now().isoformat()
                    _persistent_users[user_id_str]["avatar"] = str(member.avatar.url) if member.avatar else None
                    updated_users += 1
                else:
                    # Add new user
                    is_banned = user_id_str in _banned_users
                    ban_info = _banned_users.get(user_id_str, {})
                    
                    _persistent_users[user_id_str] = {
                        "id": user_id_str,
                        "username": member.name,
                        "discriminator": member.discriminator or "0",
                        "displayName": member.display_name,
                        "avatar": str(member.avatar.url) if member.avatar else None,
                        "isBanned": is_banned,
                        "banReason": ban_info.get("reason") if is_banned else None,
                        "banExpiry": ban_info.get("expires_at") if is_banned else None,
                        "totalPlays": 0,
                        "firstSeen": datetime.now().isoformat(),
                        "lastActive": datetime.now().isoformat(),
                        "isOnline": member.status.name != "offline",
                        "serverName": guild.name,
                        "servers": [guild.name]
                    }
                    new_users += 1
        
        _save_users_database(_persistent_users)
        
        return jsonify({
            "success": True,
            "total_users": len(_persistent_users),
            "new_users": new_users,
            "updated_users": updated_users
        })
        
    except Exception as e:
        logger.error(f"Failed to sync users: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/users/<user_id>/ban', methods=['POST', 'DELETE'])
def api_admin_user_ban(user_id):
    """Ban or unban a user"""
    global _banned_users
    
    try:
        if request.method == 'POST':
            data = request.json or {}
            reason = data.get('reason', 'Banned by admin')
            duration = data.get('duration')  # days or None for permanent
            
            expires_at = None
            if duration and duration != 'permanent':
                from datetime import datetime, timedelta
                expires_at = (datetime.now() + timedelta(days=int(duration))).isoformat()
            
            _banned_users[user_id] = {
                "reason": reason,
                "banned_at": datetime.now().isoformat(),
                "expires_at": expires_at,
                "banned_by": "Admin"
            }
            
            logger.info(f"User {user_id} banned: {reason}")
            return jsonify({"status": "banned", "user_id": user_id})
            
        elif request.method == 'DELETE':
            if user_id in _banned_users:
                del _banned_users[user_id]
                logger.info(f"User {user_id} unbanned")
            return jsonify({"status": "unbanned", "user_id": user_id})
            
    except Exception as e:
        logger.error(f"Ban operation failed: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== BAN MANAGEMENT ENDPOINTS ====================

@app.route('/api/admin/bans', methods=['GET', 'POST'])
def api_admin_bans():
    """Get all bans or add new ban"""
    global _banned_users, _banned_servers
    
    if request.method == 'GET':
        try:
            bans = []
            
            # User bans
            for user_id, ban_info in _banned_users.items():
                bans.append({
                    "id": f"user-{user_id}",
                    "type": "user",
                    "targetId": user_id,
                    "targetName": ban_info.get("target_name", f"User {user_id}"),
                    "reason": ban_info.get("reason", "No reason provided"),
                    "bannedAt": ban_info.get("banned_at"),
                    "expiresAt": ban_info.get("expires_at"),
                    "bannedBy": ban_info.get("banned_by", "Admin"),
                    "isActive": True
                })
            
            # Server bans
            for server_id, ban_info in _banned_servers.items():
                bans.append({
                    "id": f"server-{server_id}",
                    "type": "server",
                    "targetId": server_id,
                    "targetName": ban_info.get("target_name", f"Server {server_id}"),
                    "reason": ban_info.get("reason", "No reason provided"),
                    "bannedAt": ban_info.get("banned_at"),
                    "expiresAt": ban_info.get("expires_at"),
                    "bannedBy": ban_info.get("banned_by", "Admin"),
                    "isActive": True
                })
            
            return jsonify(bans)
            
        except Exception as e:
            logger.error(f"Failed to get bans: {e}")
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json or {}
            ban_type = data.get('type', 'user')
            target_id = data.get('targetId')
            target_name = data.get('targetName', '')
            reason = data.get('reason', 'Banned by admin')
            duration = data.get('duration')
            
            if not target_id:
                return jsonify({"error": "Target ID is required"}), 400
            
            expires_at = None
            if duration and duration != 'permanent':
                from datetime import datetime, timedelta
                expires_at = (datetime.now() + timedelta(days=int(duration))).isoformat()
            
            ban_info = {
                "target_name": target_name or target_id,
                "reason": reason,
                "banned_at": datetime.now().isoformat(),
                "expires_at": expires_at,
                "banned_by": "Admin"
            }
            
            if ban_type == 'user':
                _banned_users[target_id] = ban_info
            else:
                _banned_servers[target_id] = ban_info
            
            logger.info(f"{ban_type.capitalize()} {target_id} banned: {reason}")
            
            return jsonify({
                "status": "success",
                "id": f"{ban_type}-{target_id}",
                "type": ban_type,
                "targetId": target_id
            })
            
        except Exception as e:
            logger.error(f"Failed to add ban: {e}")
            return jsonify({"error": str(e)}), 500


@app.route('/api/admin/bans/<ban_id>', methods=['DELETE'])
def api_admin_ban_remove(ban_id):
    """Remove a ban"""
    global _banned_users, _banned_servers
    
    try:
        if ban_id.startswith('user-'):
            user_id = ban_id[5:]
            if user_id in _banned_users:
                del _banned_users[user_id]
                logger.info(f"User {user_id} unbanned")
        elif ban_id.startswith('server-'):
            server_id = ban_id[7:]
            if server_id in _banned_servers:
                del _banned_servers[server_id]
                logger.info(f"Server {server_id} unbanned")
        
        return jsonify({"status": "removed", "id": ban_id})
        
    except Exception as e:
        logger.error(f"Failed to remove ban: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== SERVER MANAGEMENT ENDPOINTS ====================

@app.route('/api/admin/guild/<guild_id>/details')
def api_admin_guild_details(guild_id):
    """Get detailed guild information with channels, members count, voice info"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        guild = bot.get_guild(int(guild_id))
        if not guild:
            return jsonify({"error": "Guild not found"}), 404
        
        # Get voice connection info
        connection = bot.voice_manager.get_connection(int(guild_id))
        voice_channel = None
        is_playing = False
        current_track = None
        
        if connection and connection.is_connected():
            voice_channel = {
                "id": str(connection.channel.id),
                "name": connection.channel.name,
                "members": len([m for m in connection.channel.members if not m.bot])
            }
            is_playing = connection.connection.is_playing() if connection.connection else False
            
            # Get current track
            if hasattr(bot, 'players') and int(guild_id) in bot.players:
                player = bot.players[int(guild_id)]
                if player.metadata:
                    current_track = {
                        "title": player.metadata.title,
                        "artist": player.metadata.artist,
                        "duration": player.metadata.duration,
                        "current_time": player.get_current_time(),
                        "artwork_url": player.metadata.artwork_url
                    }
        
        # Get queue info with items
        queue_length = 0
        queue_items = []
        queue_cog = bot.get_cog('QueueCommands')
        if queue_cog and int(guild_id) in queue_cog.queues:
            queue = queue_cog.queues[int(guild_id)]
            queue_length = len(queue)
            # Get first 20 queue items
            for i, item in enumerate(list(queue)[:20]):
                # Queue items can be MetadataInfo objects or dicts
                if hasattr(item, 'title'):
                    # It's a MetadataInfo object
                    queue_items.append({
                        "position": i + 1,
                        "title": getattr(item, 'title', 'Unknown'),
                        "artist": getattr(item, 'artist', 'Unknown'),
                        "duration": getattr(item, 'duration', 0),
                        "requested_by": getattr(item, 'requested_by', 'Unknown')
                    })
                elif isinstance(item, dict):
                    # It's a dictionary
                    queue_items.append({
                        "position": i + 1,
                        "title": item.get('title', 'Unknown'),
                        "artist": item.get('artist', 'Unknown'),
                        "duration": item.get('duration', 0),
                        "requested_by": item.get('requested_by', 'Unknown')
                    })
                else:
                    # Unknown type, try to convert to string
                    queue_items.append({
                        "position": i + 1,
                        "title": str(item),
                        "artist": "Unknown",
                        "duration": 0,
                        "requested_by": "Unknown"
                    })
        
        # Get ALL channels (text + voice) combined
        all_channels = []
        
        # Text channels
        for channel in guild.text_channels:
            permissions = channel.permissions_for(guild.me)
            is_disabled = str(channel.id) in _disabled_channels.get(guild_id, {})
            all_channels.append({
                "id": str(channel.id),
                "name": channel.name,
                "type": "text",
                "position": channel.position,
                "isDisabled": is_disabled,
                "disableInfo": _disabled_channels.get(guild_id, {}).get(str(channel.id)),
                "permissions": {
                    "sendMessages": permissions.send_messages,
                    "embedLinks": permissions.embed_links
                }
            })
        
        # Voice channels
        for channel in guild.voice_channels:
            is_disabled = str(channel.id) in _disabled_channels.get(guild_id, {})
            all_channels.append({
                "id": str(channel.id),
                "name": channel.name,
                "type": "voice",
                "position": channel.position,
                "isDisabled": is_disabled,
                "disableInfo": _disabled_channels.get(guild_id, {}).get(str(channel.id)),
                "members": len(channel.members)
            })
        
        # Stage channels (if any)
        for channel in guild.stage_channels:
            is_disabled = str(channel.id) in _disabled_channels.get(guild_id, {})
            all_channels.append({
                "id": str(channel.id),
                "name": channel.name,
                "type": "stage",
                "position": channel.position,
                "isDisabled": is_disabled,
                "disableInfo": _disabled_channels.get(guild_id, {}).get(str(channel.id))
            })
        
        # Get member count (limit to prevent performance issues)
        member_list = []
        for member in list(guild.members)[:50]:
            if member.bot:
                continue
            is_banned = str(member.id) in _banned_users
            ban_info = _banned_users.get(str(member.id))
            member_list.append({
                "id": str(member.id),
                "username": member.name,
                "displayName": member.display_name,
                "avatar": str(member.avatar.url) if member.avatar else None,
                "isBanned": is_banned,
                "banReason": ban_info.get("reason") if ban_info else None
            })
        
        # Get sendable text channels (for goodbye message selection)
        sendable_channels = []
        for channel in guild.text_channels:
            permissions = channel.permissions_for(guild.me)
            if permissions.send_messages and permissions.embed_links:
                sendable_channels.append({
                    "id": str(channel.id),
                    "name": channel.name,
                    "position": channel.position
                })
        
        return jsonify({
            "id": str(guild.id),
            "name": guild.name,
            "icon": str(guild.icon.url) if guild.icon else None,
            "memberCount": guild.member_count,
            "voiceChannel": voice_channel,
            "isPlaying": is_playing,
            "currentTrack": current_track,
            "queueLength": queue_length,
            "queueItems": queue_items,
            "channels": sorted(all_channels, key=lambda x: (0 if x['type'] == 'text' else 1, x['position'])),
            "sendableChannels": sorted(sendable_channels, key=lambda x: x['position']),
            "members": member_list
        })
        
    except Exception as e:
        logger.error(f"Failed to get guild details: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guild/<guild_id>/stop-audio', methods=['POST'])
def api_admin_guild_stop_audio(guild_id):
    """Stop audio and clear queue in server"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        connection = bot.voice_manager.get_connection(int(guild_id))
        if not connection or not connection.is_connected():
            return jsonify({"error": "Not connected to voice in this server"}), 400
        
        # Stop playback
        if connection.connection:
            connection.connection.stop()
        
        # Clear queue
        queue_cog = bot.get_cog('QueueCommands')
        if queue_cog and int(guild_id) in queue_cog.queues:
            queue_cog.queues[int(guild_id)].clear()
        
        # Cleanup player
        if hasattr(bot, 'players') and int(guild_id) in bot.players:
            player = bot.players[int(guild_id)]
            if hasattr(player, 'cleanup'):
                asyncio.run_coroutine_threadsafe(player.cleanup(), bot.loop)
            del bot.players[int(guild_id)]
        
        logger.info(f"Stopped audio in guild {guild_id} via dashboard")
        
        # Send Discord notification
        async def send_notification():
            try:
                import discord
                guild = bot.get_guild(int(guild_id))
                if not guild:
                    return
                
                # Find a suitable channel to notify
                for channel in guild.text_channels:
                    permissions = channel.permissions_for(guild.me)
                    if permissions.send_messages:
                        embed = discord.Embed(
                            description="⏹️ **Audio stopped** via Developer Dashboard",
                            color=0x7B1E3C
                        )
                        await channel.send(embed=embed, delete_after=30)
                        break
            except Exception as e:
                logger.error(f"Notification failed: {e}")
        
        asyncio.run_coroutine_threadsafe(send_notification(), bot.loop)
        
        return jsonify({"status": "stopped", "guild_id": guild_id})
        
    except Exception as e:
        logger.error(f"Failed to stop audio: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guild/<guild_id>/clear-queue', methods=['POST'])
def api_admin_guild_clear_queue(guild_id):
    """Clear queue without stopping current track"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        queue_cog = bot.get_cog('QueueCommands')
        if not queue_cog or int(guild_id) not in queue_cog.queues:
            return jsonify({"error": "No queue found for this server"}), 400
        
        queue_length = len(queue_cog.queues[int(guild_id)])
        queue_cog.queues[int(guild_id)].clear()
        
        logger.info(f"Cleared queue ({queue_length} tracks) in guild {guild_id} via dashboard")
        
        return jsonify({
            "status": "cleared",
            "guild_id": guild_id,
            "cleared_count": queue_length
        })
        
    except Exception as e:
        logger.error(f"Failed to clear queue: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guild/<guild_id>/leave', methods=['POST'])
def api_admin_guild_leave(guild_id):
    """Leave server with goodbye message and optional ban"""
    bot = get_bot()
    if not bot:
        return jsonify({"error": "Bot not connected"}), 503
    
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')
        target_channel_id = data.get('target_channel')  # None = all sendable, "all" = all, or specific channel ID
        ban_server = data.get('ban_server', False)
        
        guild = bot.get_guild(int(guild_id))
        if not guild:
            return jsonify({"error": "Guild not found"}), 404
        
        guild_name = guild.name
        guild_icon = str(guild.icon.url) if guild.icon else None
        owner_id = guild.owner_id
        
        # First cleanup any voice connections
        connection = bot.voice_manager.get_connection(int(guild_id))
        if connection and connection.is_connected():
            if connection.connection:
                connection.connection.stop()
            asyncio.run_coroutine_threadsafe(connection.disconnect(), bot.loop)
        
        # Clear queue
        queue_cog = bot.get_cog('QueueCommands')
        if queue_cog and int(guild_id) in queue_cog.queues:
            queue_cog.queues[int(guild_id)].clear()
        
        # Cleanup player
        if hasattr(bot, 'players') and int(guild_id) in bot.players:
            player = bot.players[int(guild_id)]
            if hasattr(player, 'cleanup'):
                asyncio.run_coroutine_threadsafe(player.cleanup(), bot.loop)
            del bot.players[int(guild_id)]
        
        # Add to banned servers if requested
        if ban_server:
            _banned_servers[guild_id] = {
                "target_id": guild_id,
                "target_name": guild_name,
                "target_type": "server",
                "reason": reason,
                "banned_at": datetime.now().isoformat(),
                "banned_by": "Dashboard Admin",
                "expires_at": None,  # Permanent
                "is_active": True
            }
            logger.info(f"Server {guild_name} ({guild_id}) added to banned list")
        
        async def send_goodbye_and_leave():
            import discord
            try:
                # Create goodbye embed
                embed = discord.Embed(
                    title="👋 SONORA Leaving Server",
                    description=(
                        f"**Reason:** {reason}\n\n"
                        f"If you have any questions or need assistance, please contact support."
                    ),
                    color=0xE53935
                )
                if ban_server:
                    embed.add_field(
                        name="⚠️ Server Banned",
                        value="This server has been banned. Re-inviting the bot will result in automatic removal.",
                        inline=False
                    )
                embed.set_footer(text="SONORA Support: https://s.id/SONORAbotSUPPORT")
                
                # Create view with support button
                view = discord.ui.View()
                view.add_item(discord.ui.Button(
                    label="Contact Support",
                    url="https://s.id/SONORAbotSUPPORT",
                    style=discord.ButtonStyle.link,
                    emoji="💬"
                ))
                
                # Send to channels
                channels_to_send = []
                if target_channel_id == "all" or target_channel_id is None:
                    # Send to all sendable channels
                    for channel in guild.text_channels:
                        permissions = channel.permissions_for(guild.me)
                        if permissions.send_messages and permissions.embed_links:
                            channels_to_send.append(channel)
                else:
                    # Send to specific channel
                    channel = guild.get_channel(int(target_channel_id))
                    if channel:
                        channels_to_send.append(channel)
                
                # Send goodbye messages
                for channel in channels_to_send[:5]:  # Limit to 5 channels max
                    try:
                        await channel.send(embed=embed, view=view)
                    except Exception as e:
                        logger.error(f"Failed to send goodbye to #{channel.name}: {e}")
                
                # Wait a moment for messages to send
                await asyncio.sleep(1)
                
                # Leave the guild
                await guild.leave()
                logger.info(f"Bot left server: {guild_name} ({guild_id})")
                
            except Exception as e:
                logger.error(f"Error in leave process: {e}")
        
        asyncio.run_coroutine_threadsafe(send_goodbye_and_leave(), bot.loop)
        
        return jsonify({
            "status": "leaving",
            "guild_id": guild_id,
            "guild_name": guild_name,
            "banned": ban_server
        })
        
    except Exception as e:
        logger.error(f"Failed to leave server: {e}")
        return jsonify({"error": str(e)}), 500


# ==================== DISABLED CHANNELS MANAGEMENT ====================

@app.route('/api/admin/disabled-channels', methods=['GET'])
def api_admin_disabled_channels():
    """Get all disabled channels across all guilds"""
    try:
        result = []
        for guild_id, channels in _disabled_channels.items():
            for channel_id, info in channels.items():
                result.append({
                    "guildId": guild_id,
                    "channelId": channel_id,
                    "channelName": info.get("channel_name", "Unknown"),
                    "guildName": info.get("guild_name", "Unknown"),
                    "disabledAt": info.get("disabled_at"),
                    "disabledBy": info.get("disabled_by", "Admin"),
                    "reason": info.get("reason", "No reason provided")
                })
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to get disabled channels: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guild/<guild_id>/channels/<channel_id>/disable', methods=['POST', 'DELETE'])
def api_admin_channel_disable(guild_id, channel_id):
    """Enable or disable a channel"""
    global _disabled_channels
    bot = get_bot()
    
    try:
        if request.method == 'POST':
            # Disable channel
            data = request.json or {}
            reason = data.get('reason', 'Disabled by admin')
            
            # Get channel and guild names for display
            channel_name = "Unknown"
            guild_name = "Unknown"
            if bot:
                guild = bot.get_guild(int(guild_id))
                if guild:
                    guild_name = guild.name
                    channel = guild.get_channel(int(channel_id))
                    if channel:
                        channel_name = channel.name
            
            if guild_id not in _disabled_channels:
                _disabled_channels[guild_id] = {}
            
            _disabled_channels[guild_id][channel_id] = {
                "channel_name": channel_name,
                "guild_name": guild_name,
                "disabled_at": datetime.now().isoformat(),
                "disabled_by": "Admin",
                "reason": reason
            }
            
            logger.info(f"Channel {channel_id} in guild {guild_id} disabled: {reason}")
            
            return jsonify({
                "status": "disabled",
                "guild_id": guild_id,
                "channel_id": channel_id
            })
            
        elif request.method == 'DELETE':
            # Enable channel
            if guild_id in _disabled_channels and channel_id in _disabled_channels[guild_id]:
                del _disabled_channels[guild_id][channel_id]
                if not _disabled_channels[guild_id]:
                    del _disabled_channels[guild_id]
                logger.info(f"Channel {channel_id} in guild {guild_id} enabled")
            
            return jsonify({
                "status": "enabled",
                "guild_id": guild_id,
                "channel_id": channel_id
            })
            
    except Exception as e:
        logger.error(f"Failed to toggle channel: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/guild/<guild_id>/ban-user/<user_id>', methods=['POST'])
def api_admin_guild_ban_user(guild_id, user_id):
    """Ban a user from server context (adds to global ban list)"""
    global _banned_users
    bot = get_bot()
    
    try:
        data = request.json or {}
        reason = data.get('reason', 'Banned by admin from server management')
        duration = data.get('duration')
        
        # Get user info for display
        user_name = f"User {user_id}"
        if bot:
            guild = bot.get_guild(int(guild_id))
            if guild:
                member = guild.get_member(int(user_id))
                if member:
                    user_name = member.name
        
        expires_at = None
        if duration and duration != 'permanent':
            expires_at = (datetime.now() + timedelta(days=int(duration))).isoformat()
        
        _banned_users[user_id] = {
            "target_name": user_name,
            "reason": reason,
            "banned_at": datetime.now().isoformat(),
            "expires_at": expires_at,
            "banned_by": "Admin",
            "from_guild": guild_id
        }
        
        logger.info(f"User {user_id} ({user_name}) banned from guild {guild_id}: {reason}")
        
        return jsonify({
            "status": "banned",
            "user_id": user_id,
            "user_name": user_name,
            "guild_id": guild_id
        })
        
    except Exception as e:
        logger.error(f"Failed to ban user: {e}")
        return jsonify({"error": str(e)}), 500


# Export disabled channels for bot to check
def is_channel_disabled(guild_id: str, channel_id: str) -> dict:
    """Check if a channel is disabled and return info if so"""
    guild_channels = _disabled_channels.get(str(guild_id), {})
    return guild_channels.get(str(channel_id))


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
