"""
YTDLP Audio API Blueprint
REST API endpoints for audio streaming via yt-dlp

Endpoints:
- GET /api/ytdlp/search - Search tracks on YouTube Music
- GET /api/ytdlp/stream-url - Get fresh stream URL
- GET /api/ytdlp/download - Download audio file
- GET /api/ytdlp/stream - Proxy audio streaming
"""

import asyncio
import os
import tempfile
import time
from pathlib import Path
from flask import Blueprint, jsonify, request, Response, send_file
from functools import wraps

from config.logging_config import get_logger
from config.settings import Settings

logger = get_logger('api.ytdlp')

# Create blueprint
ytdlp_bp = Blueprint('ytdlp', __name__, url_prefix='/api/ytdlp')


def async_route(f):
    """Decorator to run async functions in Flask routes"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper


def get_youtube_downloader():
    """Get or create YouTubeDownloader instance"""
    from services.audio.youtube import YouTubeDownloader
    return YouTubeDownloader(Settings.DOWNLOADS_DIR)


# ==================== ENDPOINTS ====================


@ytdlp_bp.route('/search', methods=['GET'])
@async_route
async def api_ytdlp_search():
    """
    Search for a track on YouTube Music
    
    Query params:
        q (str): Search query (required)
    
    Returns:
        JSON with track info: title, artist, duration, url, thumbnail_url, track_id
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({"error": "Missing 'q' parameter"}), 400
    
    logger.info(f"[YTDLP API] Search: {query}")
    
    try:
        downloader = get_youtube_downloader()
        result = await downloader.search(query)
        
        if result:
            return jsonify({
                "success": True,
                "track": {
                    "title": result.title,
                    "artist": result.artist,
                    "album": result.album,
                    "duration": result.duration,
                    "url": result.url,
                    "thumbnail_url": result.thumbnail_url,
                    "track_id": result.track_id
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": "No results found"
            }), 404
            
    except Exception as e:
        logger.error(f"[YTDLP API] Search error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@ytdlp_bp.route('/stream-url', methods=['GET'])
@async_route
async def api_ytdlp_stream_url():
    """
    Get fresh stream URL for a track (avoids expired URLs)
    
    Query params:
        title (str): Track title
        artist (str): Artist name
        url (str): Direct YouTube Music URL (optional, if provided title/artist are ignored)
    
    Returns:
        JSON with stream_url, format, and estimated expiry
    """
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()
    url = request.args.get('url', '').strip()
    
    if not url and not title:
        return jsonify({"error": "Missing 'title' or 'url' parameter"}), 400
    
    logger.info(f"[YTDLP API] Get stream URL: {title or url}")
    
    try:
        from database.models import TrackInfo
        
        downloader = get_youtube_downloader()
        
        # Create track info
        if url:
            # Direct URL provided
            track_info = TrackInfo(
                title=title or "Unknown",
                artist=artist or "Unknown",
                url=url
            )
        else:
            # Search first to get URL
            search_result = await downloader.search(f"{artist} {title}")
            if not search_result:
                return jsonify({
                    "success": False,
                    "error": "Track not found"
                }), 404
            track_info = search_result
        
        # Get fresh stream URL
        stream_url = await downloader.get_stream_url(track_info)
        
        # If stream URL failed (403), try with proxy
        used_proxy = False
        if not stream_url and Settings.YOUTUBE_PROXY:
            logger.info(f"[YTDLP API] Stream URL failed, trying with proxy")
            stream_url = await downloader.get_stream_url_with_proxy(track_info, Settings.YOUTUBE_PROXY)
            used_proxy = True
        
        if stream_url:
            return jsonify({
                "success": True,
                "stream_url": stream_url,
                "format": "audio/webm",  # Usually webm or m4a
                "expires_in": 21600,  # ~6 hours (YouTube default)
                "fetched_at": int(time.time()),
                "used_proxy": used_proxy
            })
        else:
            return jsonify({
                "success": False,
                "error": "Could not get stream URL (403 or unavailable)"
            }), 503
            
    except Exception as e:
        logger.error(f"[YTDLP API] Stream URL error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@ytdlp_bp.route('/download', methods=['GET'])
@async_route
async def api_ytdlp_download():
    """
    Download audio file and serve it
    
    Query params:
        title (str): Track title
        artist (str): Artist name  
        url (str): Direct YouTube Music URL (optional)
        format (str): Output format - opus, mp3, m4a (default: opus)
    
    Returns:
        Audio file as binary download
    """
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()
    url = request.args.get('url', '').strip()
    output_format = request.args.get('format', 'opus').lower()
    
    if not url and not title:
        return jsonify({"error": "Missing 'title' or 'url' parameter"}), 400
    
    if output_format not in ['opus', 'mp3', 'm4a', 'webm', 'ogg']:
        return jsonify({"error": "Invalid format. Use: opus, mp3, m4a, webm, ogg"}), 400
    
    logger.info(f"[YTDLP API] Download: {title or url} (format: {output_format})")
    
    try:
        from database.models import TrackInfo
        
        downloader = get_youtube_downloader()
        
        # Create or search for track
        if url:
            track_info = TrackInfo(
                title=title or "Unknown",
                artist=artist or "Unknown",
                url=url
            )
        else:
            # Search first
            search_result = await downloader.search(f"{artist} {title}")
            if not search_result:
                return jsonify({
                    "success": False,
                    "error": "Track not found"
                }), 404
            track_info = search_result
        
        # Download the file
        result = await downloader.download(track_info)
        
        if result and result.file_path and result.file_path.exists():
            file_path = result.file_path
            
            # Determine MIME type
            mime_types = {
                'opus': 'audio/opus',
                'mp3': 'audio/mpeg',
                'm4a': 'audio/mp4',
                'webm': 'audio/webm',
                'ogg': 'audio/ogg'
            }
            actual_ext = file_path.suffix.lstrip('.')
            mime_type = mime_types.get(actual_ext, 'audio/opus')
            
            # Generate safe filename
            safe_filename = f"{result.artist} - {result.title}.{actual_ext}"
            safe_filename = "".join(c for c in safe_filename if c.isalnum() or c in (' ', '-', '_', '.')).strip()
            
            logger.info(f"[YTDLP API] Serving file: {file_path.name}")
            
            # Send file and schedule cleanup after response
            response = send_file(
                file_path,
                mimetype=mime_type,
                as_attachment=True,
                download_name=safe_filename
            )
            
            # Schedule file cleanup after 60 seconds (allow download to complete)
            def cleanup_later():
                import threading
                def do_cleanup():
                    try:
                        time.sleep(60)
                        if file_path.exists():
                            file_path.unlink()
                            logger.info(f"[YTDLP API] Cleaned up: {file_path.name}")
                    except Exception as e:
                        logger.warning(f"Cleanup failed: {e}")
                
                threading.Thread(target=do_cleanup, daemon=True).start()
            
            cleanup_later()
            
            return response
        else:
            return jsonify({
                "success": False,
                "error": "Download failed"
            }), 500
            
    except Exception as e:
        logger.error(f"[YTDLP API] Download error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@ytdlp_bp.route('/stream', methods=['GET'])
@async_route
async def api_ytdlp_stream():
    """
    Proxy audio stream (fetch fresh URL and stream content)
    
    Query params:
        title (str): Track title
        artist (str): Artist name
        url (str): Direct YouTube Music URL (optional)
    
    Returns:
        Audio stream with proper headers for playback
    """
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()
    url = request.args.get('url', '').strip()
    
    if not url and not title:
        return jsonify({"error": "Missing 'title' or 'url' parameter"}), 400
    
    logger.info(f"[YTDLP API] Stream: {title or url}")
    
    try:
        from database.models import TrackInfo
        import aiohttp
        
        downloader = get_youtube_downloader()
        
        # Create or search for track
        if url:
            # If title/artist are Unknown/empty, search to get proper metadata
            if not title or title == "Unknown" or not artist or artist == "Unknown":
                # Try to get metadata from URL
                search_result = await downloader.search(url)
                if search_result:
                    track_info = search_result
                    logger.info(f"[YTDLP API] Got metadata from URL: {track_info.title} - {track_info.artist}")
                else:
                    track_info = TrackInfo(
                        title=title or "Unknown",
                        artist=artist or "Unknown",
                        url=url
                    )
            else:
                track_info = TrackInfo(
                    title=title,
                    artist=artist,
                    url=url
                )
        else:
            # Search first
            search_result = await downloader.search(f"{artist} {title}")
            if not search_result:
                return jsonify({
                    "success": False,
                    "error": "Track not found"
                }), 404
            track_info = search_result
        
        # Get fresh stream URL
        stream_url = await downloader.get_stream_url(track_info)
        
        if not stream_url:
            # Fallback: download and stream file
            logger.info("[YTDLP API] Stream URL failed, falling back to download+stream")
            
            result = await downloader.download(track_info)
            if result and result.file_path and result.file_path.exists():
                file_path = result.file_path
                
                def generate():
                    try:
                        with open(file_path, 'rb') as f:
                            while chunk := f.read(8192):
                                yield chunk
                    finally:
                        # Cleanup after streaming
                        try:
                            if file_path.exists():
                                file_path.unlink()
                        except:
                            pass
                
                actual_ext = file_path.suffix.lstrip('.')
                mime_types = {
                    'opus': 'audio/opus',
                    'mp3': 'audio/mpeg',
                    'm4a': 'audio/mp4',
                    'webm': 'audio/webm',
                    'ogg': 'audio/ogg'
                }
                mime_type = mime_types.get(actual_ext, 'audio/opus')
                
                return Response(
                    generate(),
                    mimetype=mime_type,
                    headers={
                        'Content-Disposition': f'inline; filename="{track_info.title}.{actual_ext}"',
                        'Accept-Ranges': 'bytes'
                    }
                )
            else:
                return jsonify({
                    "success": False,
                    "error": "Stream not available"
                }), 503
        
        # Proxy the stream URL with pre-buffering
        logger.info(f"[YTDLP API] Proxying stream from YouTube with 6-second buffer")
        
        # Use synchronous requests for streaming proxy since we're in Flask
        import requests
        
        # Pre-buffer configuration
        BUFFER_SECONDS = 6
        CHUNK_SIZE = 8192
        # Assuming ~128kbps audio = 16KB/second
        # 6 seconds = ~96KB of pre-buffer
        PREBUFFER_SIZE = 16 * 1024 * BUFFER_SECONDS  # ~96KB
        
        # Setup proxy for requests if configured
        proxies = None
        if Settings.YOUTUBE_PROXY:
            proxy_url = Settings.YOUTUBE_PROXY
            proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            logger.info(f"[YTDLP API] Using proxy for stream: {proxy_url}")
        
        def generate():
            try:
                with requests.get(stream_url, stream=True, timeout=30, proxies=proxies) as r:
                    r.raise_for_status()
                    
                    # Pre-buffer: collect initial chunks before streaming
                    prebuffer = b''
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            prebuffer += chunk
                            if len(prebuffer) >= PREBUFFER_SIZE:
                                break
                    
                    logger.info(f"[YTDLP API] Pre-buffered {len(prebuffer)} bytes ({BUFFER_SECONDS}s)")
                    
                    # Send pre-buffered data first
                    yield prebuffer
                    
                    # Continue streaming the rest
                    for chunk in r.iter_content(chunk_size=CHUNK_SIZE):
                        if chunk:
                            yield chunk
            except Exception as e:
                logger.error(f"[YTDLP API] Stream proxy error: {e}")
        
        return Response(
            generate(),
            mimetype='audio/webm',
            headers={
                'Content-Disposition': f'inline; filename="{track_info.title}.webm"',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
                'X-Prebuffer-Seconds': str(BUFFER_SECONDS),
                'X-Proxy-Used': 'true' if proxies else 'false'
            }
        )
            
    except Exception as e:
        logger.error(f"[YTDLP API] Stream error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@ytdlp_bp.route('/info', methods=['GET'])
def api_ytdlp_info():
    """
    Get YTDLP API info and status
    
    Returns:
        JSON with API version, cookies status, etc.
    """
    try:
        # Check cookies
        yt_cookies = Settings.get_youtube_cookies()
        cookies_exist = yt_cookies and yt_cookies.exists()
        cookies_size = yt_cookies.stat().st_size if cookies_exist else 0
        
        return jsonify({
            "api_version": "1.0.0",
            "status": "online",
            "cookies": {
                "available": cookies_exist,
                "size_bytes": cookies_size
            },
            "endpoints": [
                {
                    "path": "/api/ytdlp/search",
                    "method": "GET",
                    "params": ["q"],
                    "description": "Search tracks on YouTube Music"
                },
                {
                    "path": "/api/ytdlp/stream-url",
                    "method": "GET",
                    "params": ["title", "artist", "url"],
                    "description": "Get fresh stream URL"
                },
                {
                    "path": "/api/ytdlp/download",
                    "method": "GET",
                    "params": ["title", "artist", "url", "format"],
                    "description": "Download audio file"
                },
                {
                    "path": "/api/ytdlp/stream",
                    "method": "GET",
                    "params": ["title", "artist", "url"],
                    "description": "Proxy audio stream"
                }
            ]
        })
    except Exception as e:
        logger.error(f"[YTDLP API] Info error: {e}")
        return jsonify({"error": str(e)}), 500
