"""Playlist processor for handling playlists and albums"""

import asyncio
from typing import List, Optional
from pathlib import Path

from database.models import TrackInfo
from utils.validators import URLValidator
from config.logging_config import get_logger

logger = get_logger('audio.playlist_processor')

# Lazy import to avoid circular dependency
def get_apple_music_handler():
    from services.audio.apple_music_handler import get_apple_music_handler as _get_handler
    return _get_handler()


class PlaylistProcessor:
    """Process playlists and albums from various sources"""
    
    def __init__(self, spotify_downloader, youtube_downloader):
        """
        Initialize playlist processor
        
        Args:
            spotify_downloader: SpotifyDownloader instance
            youtube_downloader: YouTubeDownloader instance
        """
        self.spotify = spotify_downloader
        self.youtube = youtube_downloader
        logger.info("Playlist processor initialized")
    
    async def process_url(self, url: str) -> List[TrackInfo]:
        """
        Process URL and extract tracks
        
        Args:
            url: URL to process (can be track, playlist, or album)
        
        Returns:
            List of TrackInfo objects
        """
        url_type = URLValidator.get_url_type(url)
        
        if url_type == 'spotify':
            return await self._process_spotify_url(url)
        elif url_type in ['youtube', 'youtube_music']:
            return await self._process_youtube_url(url)
        elif url_type == 'apple_music':
            return await self._process_apple_music_url(url)
        else:
            # Single track from search
            logger.debug(f"Processing as search query: {url}")
            track = await self.spotify.search(url)
            return [track] if track else []
    
    async def _process_spotify_url(self, url: str) -> List[TrackInfo]:
        """
        Process Spotify URL (track, playlist, or album)
        
        Args:
            url: Spotify URL
        
        Returns:
            List of TrackInfo
        """
        spotify_data = URLValidator.extract_spotify_id(url)
        
        if not spotify_data:
            logger.warning(f"Could not extract Spotify ID from: {url}")
            return []
        
        content_type, content_id = spotify_data
        logger.info(f"Processing Spotify {content_type}: {content_id}")
        
        try:
            if content_type == 'track':
                # Single track
                track = await self.spotify.search(url)
                return [track] if track else []
            
            elif content_type == 'playlist':
                # Playlist - get track info WITHOUT downloading
                # Audio will be downloaded from YouTube Music (faster, no rate limits)
                tracks = await self._get_spotify_playlist_info_only(url)
                
                if not tracks:
                    logger.warning("⚠️ Spotify playlist fetch failed (rate limit or connection issue)")
                    logger.info("💡 Try again in a few minutes, or use YouTube playlist URL")
                    return []
                
                # Mark tracks for YouTube Music download (not Spotify)
                for track in tracks:
                    track.url = None  # Will force YouTube Music download
                
                logger.info(f"Found {len(tracks)} tracks in Spotify playlist (will download from YouTube Music)")
                return tracks
            
            elif content_type == 'album':
                # Album - get track info only (same as playlist to avoid rate limits)
                tracks = await self._get_spotify_playlist_info_only(url)
                
                if not tracks:
                    logger.warning("⚠️ Spotify album fetch failed (rate limit or connection issue)")
                    logger.info("💡 Try again in a few minutes, or search for individual tracks")
                    return []
                
                logger.info(f"Found {len(tracks)} tracks in Spotify album (info only)")
                return tracks
        
        except Exception as e:
            logger.error(f"Failed to process Spotify URL: {e}", exc_info=True)
            return []
        
        return []
    
    async def _get_spotify_playlist_info_batch(self, playlist_url: str, offset: int = 0, limit: int = 2) -> List[TrackInfo]:
        """
        Get LIMITED tracks from playlist (batch processing to avoid rate limits)
        
        Args:
            playlist_url: Spotify playlist URL or ID
            offset: Starting position (0-based)
            limit: Number of tracks to get (default 2 for minimal API calls)
        
        Returns:
            List of TrackInfo with basic info (will download from YouTube Music later)
        """
        try:
            # Extract playlist ID
            import re
            match = re.search(r'playlist/([a-zA-Z0-9]+)', playlist_url)
            if not match:
                logger.error(f"Could not extract playlist ID from: {playlist_url}")
                return []
            
            playlist_id = match.group(1)
            
            # Use Spotify API directly via spotdl with limit/offset
            # This is MUCH faster than 'spotdl save' for entire playlist
            import tempfile
            import json
            
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.spotdl', delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                # Use 'save' but only for a URL that will fetch limited tracks
                # We'll use a workaround: fetch specific track URLs
                # For now, use the full URL but limit processing
                command = [
                    'spotdl',
                    'save',
                    f'https://open.spotify.com/playlist/{playlist_id}',
                    '--save-file', temp_path
                ]
                
                # Shorter timeout since we only want few tracks
                stdout, stderr, returncode = await self.spotify._run_command(command, timeout=30)
                
                if returncode != 0:
                    if 'rate' in stderr.lower() or 'limit' in stderr.lower():
                        logger.error(f"Spotify rate limit reached.")
                    else:
                        logger.error(f"Failed to get playlist tracks: {stderr}")
                    return []
                
                # Read and parse track info - but only return limited number
                with open(temp_path, 'r') as f:
                    content = f.read().strip()
                    
                    if not content:
                        return []
                    
                    tracks_data = json.loads(content)
                    
                    if not isinstance(tracks_data, list):
                        return []
                    
                    # Apply offset and limit
                    tracks_data = tracks_data[offset:offset+limit]
                    
                    tracks = []
                    for track_data in tracks_data:
                        if not isinstance(track_data, dict):
                            continue
                        
                        # Extract artist(s)
                        artists = track_data.get('artists', [])
                        if isinstance(artists, list):
                            artist = ', '.join(artists)
                        else:
                            artist = track_data.get('artist', 'Unknown')
                        
                        # Create TrackInfo with SEARCH INFO (not Spotify URL)
                        track = TrackInfo(
                            title=track_data.get('name', 'Unknown'),
                            artist=artist,
                            album=track_data.get('album_name', None),
                            duration=track_data.get('duration', 0),
                            url=None,  # No URL = will search YouTube Music
                            track_id=None
                        )
                        tracks.append(track)
                    
                    return tracks
            
            finally:
                import os
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        except Exception as e:
            logger.error(f"Error getting Spotify playlist batch: {e}", exc_info=True)
            return []
    
    async def _get_spotify_playlist_info_only(self, playlist_url: str) -> List[TrackInfo]:
        """
        Get playlist track info WITHOUT downloading - just metadata
        This is faster and avoids rate limits
        
        Args:
            playlist_url: Spotify playlist URL or ID
        
        Returns:
            List of TrackInfo with basic info (will download from YouTube Music later)
        """
        try:
            # Use save command to get track info only (fast, minimal API calls)
            import tempfile
            import json
            
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.spotdl', delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                command = [
                    'spotdl',
                    'save',
                    playlist_url,
                    '--save-file', temp_path
                ]
                
                stdout, stderr, returncode = await self.spotify._run_command(command, timeout=90)
                
                if returncode != 0:
                    if 'rate' in stderr.lower() or 'limit' in stderr.lower():
                        logger.error(f"Spotify rate limit reached. Please try again in a few minutes.")
                    else:
                        logger.error(f"Failed to get playlist tracks: {stderr}")
                    return []
                
                # Read and parse track info
                with open(temp_path, 'r') as f:
                    content = f.read().strip()
                    
                    if not content:
                        return []
                    
                    tracks_data = json.loads(content)
                    
                    if not isinstance(tracks_data, list):
                        return []
                    
                    tracks = []
                    for track_data in tracks_data:
                        if not isinstance(track_data, dict):
                            continue
                        
                        # Extract artist(s)
                        artists = track_data.get('artists', [])
                        if isinstance(artists, list):
                            artist = ', '.join(artists)
                        else:
                            artist = track_data.get('artist', 'Unknown')
                        
                        # Create TrackInfo with SEARCH INFO (not Spotify URL)
                        # This way we'll download from YouTube Music later
                        track = TrackInfo(
                            title=track_data.get('name', 'Unknown'),
                            artist=artist,
                            album=track_data.get('album_name', None),
                            duration=track_data.get('duration', 0),
                            url=None,  # No URL = will search YouTube Music
                            track_id=None
                        )
                        tracks.append(track)
                    
                    return tracks
            
            finally:
                import os
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        except Exception as e:
            logger.error(f"Error getting Spotify playlist info: {e}", exc_info=True)
            return []
    
    async def _get_spotify_playlist_tracks(self, playlist_url: str) -> List[TrackInfo]:
        """
        Get all tracks from Spotify playlist
        
        Args:
            playlist_url: Spotify playlist URL
        
        Returns:
            List of TrackInfo
        """
        try:
            # Use spotdl 'save' to get playlist info without downloading
            import tempfile
            import json
            
            # Create temp file for save output
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.spotdl', delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                command = [
                    'spotdl',
                    'save',
                    playlist_url,
                    '--save-file', temp_path
                ]
                
                stdout, stderr, returncode = await self.spotify._run_command(command, timeout=90)
                
                if returncode != 0:
                    # Check if it's a rate limit error
                    if 'rate' in stderr.lower() or 'limit' in stderr.lower():
                        logger.error(f"Spotify rate limit reached. Please try again in a few minutes.")
                    else:
                        logger.error(f"Failed to get playlist tracks: {stderr}")
                    return []
                
                # Read the saved file - spotdl saves as single JSON array
                with open(temp_path, 'r') as f:
                    content = f.read().strip()
                    
                    if not content:
                        logger.warning("Empty save file from spotdl")
                        return []
                    
                    try:
                        # Parse as JSON array
                        tracks_data = json.loads(content)
                        
                        if not isinstance(tracks_data, list):
                            logger.error(f"Expected list, got {type(tracks_data)}")
                            return []
                        
                        tracks = []
                        for track_data in tracks_data:
                            # Skip if not a dict
                            if not isinstance(track_data, dict):
                                logger.debug(f"Skipping non-dict item: {type(track_data)}")
                                continue
                            
                            # Extract artist(s)
                            artists = track_data.get('artists', [])
                            if isinstance(artists, list):
                                artist = ', '.join(artists)
                            else:
                                artist = track_data.get('artist', 'Unknown')
                            
                            track = TrackInfo(
                                title=track_data.get('name', 'Unknown'),
                                artist=artist,
                                album=track_data.get('album_name', None),
                                duration=track_data.get('duration', 0),
                                url=track_data.get('url', None),
                                track_id=track_data.get('song_id', None)
                            )
                            tracks.append(track)
                        
                        return tracks
                    
                    except json.JSONDecodeError as e:
                        logger.error(f"Could not parse save file as JSON: {e}")
                        logger.debug(f"Content preview: {content[:200]}")
                        return []
            
            finally:
                # Clean up temp file
                import os
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        except Exception as e:
            logger.error(f"Error getting Spotify playlist tracks: {e}", exc_info=True)
            return []
    
    async def _get_spotify_album_tracks(self, album_url: str) -> List[TrackInfo]:
        """
        Get all tracks from Spotify album
        
        Args:
            album_url: Spotify album URL
        
        Returns:
            List of TrackInfo
        """
        # Similar to playlist processing
        return await self._get_spotify_playlist_tracks(album_url)
    
    async def _process_youtube_url(self, url: str) -> List[TrackInfo]:
        """
        Process YouTube URL (video or playlist)
        
        Args:
            url: YouTube URL
        
        Returns:
            List of TrackInfo
        """
        # Check if it's a playlist
        playlist_id = URLValidator.extract_youtube_playlist_id(url)
        
        if playlist_id:
            logger.info(f"Processing YouTube playlist: {playlist_id}")
            return await self._get_youtube_playlist_tracks(url)
        else:
            # Single video
            logger.info("Processing single YouTube video")
            track = await self.youtube.search(url)
            return [track] if track else []
    
    async def _get_youtube_playlist_tracks(self, playlist_url: str) -> List[TrackInfo]:
        """
        Get all tracks from YouTube playlist (info only, download later)
        
        Args:
            playlist_url: YouTube playlist URL
        
        Returns:
            List of TrackInfo with url=None (will download from YouTube Music on-demand)
        """
        try:
            # Use yt-dlp to get playlist info
            command = [
                'yt-dlp',
                '--flat-playlist',
                '--dump-json',
                playlist_url
            ]
            
            stdout, stderr, returncode = await self.youtube._run_command(command, timeout=60)
            
            if returncode != 0:
                logger.error(f"Failed to get YouTube playlist: {stderr}")
                return []
            
            # Parse each line as JSON (yt-dlp outputs one JSON per line)
            import json
            tracks = []
            for line in stdout.strip().split('\n'):
                if not line:
                    continue
                
                try:
                    video_data = json.loads(line)
                    
                    # Extract title and artist
                    title_full = video_data.get('title', 'Unknown')
                    
                    # Try to parse "Artist - Title" format
                    if ' - ' in title_full:
                        parts = title_full.split(' - ', 1)
                        artist = parts[0]
                        title = parts[1]
                    else:
                        artist = video_data.get('uploader', 'Unknown')
                        title = title_full
                    
                    # Return TrackInfo with url=None to download on-demand
                    # This is consistent with Spotify playlist behavior
                    track = TrackInfo(
                        title=title,
                        artist=artist,
                        duration=video_data.get('duration', 0),
                        url=None,  # Will search and download on-demand
                        track_id=video_data.get('id', None)
                    )
                    tracks.append(track)
                
                except json.JSONDecodeError:
                    continue
            
            logger.info(f"Found {len(tracks)} tracks in YouTube playlist (info only)")
            return tracks
        
        except Exception as e:
            logger.error(f"Error getting YouTube playlist tracks: {e}", exc_info=True)
            return []
    
    async def _process_apple_music_url(self, url: str) -> List[TrackInfo]:
        """
        Process Apple Music URL (track, album, or playlist)
        
        Args:
            url: Apple Music URL
        
        Returns:
            List of TrackInfo
        """
        apple_data = URLValidator.extract_apple_music_id(url)
        
        if not apple_data:
            logger.warning(f"Could not extract Apple Music ID from: {url}")
            return []
        
        content_type, content_id, track_id = apple_data
        logger.info(f"Processing Apple Music {content_type}: {content_id}")
        
        try:
            if content_type == 'track':
                # Single track - search on Spotify using Apple Music URL
                # Spotify can often find tracks from Apple Music URLs
                track = await self.spotify.search(url)
                if track:
                    return [track]
                
                # Fallback: Try YouTube search
                logger.debug("Spotify search failed, trying YouTube")
                track = await self.youtube.search(url)
                return [track] if track else []
            
            elif content_type == 'album':
                # Album - use gamdl to get tracks (metadata only, fast)
                logger.info(f"Processing Apple Music album: {content_id}")
                
                # Use AppleMusicHandler with gamdl
                am_handler = get_apple_music_handler()
                tracks = await am_handler.get_album_tracks(url)
                
                if tracks:
                    logger.info(f"✅ Found {len(tracks)} tracks from Apple Music album")
                    
                    # Convert to TrackInfo format with MINIMAL info
                    # Full metadata will be fetched just-in-time when track is about to play
                    track_infos = []
                    for track_data in tracks:
                        track_info = TrackInfo(
                            title=track_data.get('title', 'Unknown'),
                            artist=track_data.get('artist', ''),  # May be empty from gamdl
                            album=track_data.get('album', ''),
                            url=None,  # No URL = will search YouTube Music on-demand
                            track_id=None
                        )
                        # Store original track data for just-in-time enrichment
                        if not hasattr(track_info, '_apple_music_data'):
                            track_info._apple_music_data = track_data
                        
                        track_infos.append(track_info)
                    
                    logger.info(f"💡 Album ready for streaming playback (just-in-time processing)")
                    return track_infos
                
                logger.warning("⚠️ Could not get Apple Music album tracks")
                return []
            
            elif content_type == 'playlist':
                # Playlist - use gamdl to get tracks (metadata only, fast)
                logger.info(f"Processing Apple Music playlist: {content_id}")
                
                # Use AppleMusicHandler with gamdl
                am_handler = get_apple_music_handler()
                tracks = await am_handler.get_playlist_tracks(url)
                
                if tracks:
                    logger.info(f"✅ Found {len(tracks)} tracks from Apple Music playlist")
                    
                    # Convert to TrackInfo format with MINIMAL info
                    # Full metadata will be fetched just-in-time when track is about to play
                    track_infos = []
                    for track_data in tracks:
                        # Store raw track data in TrackInfo for later enrichment
                        track_info = TrackInfo(
                            title=track_data.get('title', 'Unknown'),
                            artist=track_data.get('artist', ''),  # May be empty from gamdl
                            album=track_data.get('album', ''),
                            url=None,  # No URL = will search YouTube Music on-demand
                            track_id=None
                        )
                        # Store original track data for just-in-time enrichment
                        if not hasattr(track_info, '_apple_music_data'):
                            track_info._apple_music_data = track_data
                        
                        track_infos.append(track_info)
                    
                    logger.info(f"💡 Playlist ready for streaming playback (just-in-time processing)")
                    return track_infos
                
                logger.warning("⚠️ Could not get Apple Music playlist tracks")
                return []
        
        except Exception as e:
            logger.error(f"Failed to process Apple Music URL: {e}", exc_info=True)
            return []
        
        return []
    
    async def _get_apple_music_album_tracks(self, album_url: str) -> List[TrackInfo]:
        """
        Get all tracks from Apple Music album (info only, download later)
        
        Args:
            album_url: Apple Music album URL
        
        Returns:
            List of TrackInfo with url=None (will download from YouTube Music on-demand)
        """
        try:
            # spotdl can handle Apple Music URLs directly
            # It will search for equivalent tracks on Spotify
            # Use info-only method to avoid rate limits
            return await self._get_spotify_playlist_info_only(album_url)
        
        except Exception as e:
            logger.error(f"Error getting Apple Music album tracks: {e}", exc_info=True)
            return []
    
    async def _get_apple_music_playlist_tracks(self, playlist_url: str) -> List[TrackInfo]:
        """
        Get all tracks from Apple Music playlist
        
        Args:
            playlist_url: Apple Music playlist URL
        
        Returns:
            List of TrackInfo
        """
        # Try spotdl first
        tracks = await self._get_apple_music_album_tracks(playlist_url)
        
        # Check if spotdl limitation (only 1 track from playlist)
        if tracks and len(tracks) == 1:
            logger.warning("⚠️ spotdl only returned 1 track from Apple Music playlist")
            logger.info("🔄 Falling back to YouTube Music search")
            
            # Extract playlist name from URL for search
            import re
            match = re.search(r'/playlist/([^/]+)/', playlist_url)
            playlist_name = match.group(1) if match else "playlist"
            
            # Search on YouTube Music instead
            # Format: "playlist_name" to find the playlist
            search_query = f"{playlist_name} playlist"
            logger.info(f"Searching YouTube Music for: {search_query}")
            
            # Return empty for now - user will get warning to use Spotify/YouTube URL
            # In future, could implement YouTube Music playlist API
            logger.warning("🔴 Apple Music playlists have limited support via spotdl")
            logger.warning("💡 Recommendation: Use Spotify or YouTube playlist URL instead")
            
            return tracks  # Return the 1 track we got
        
        return tracks
