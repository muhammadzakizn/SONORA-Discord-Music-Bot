"""
Apple Music Handler with gamdl
Handles Apple Music playlist/album by using gamdl to fetch track info
and downloading audio from YouTube Music for better performance
"""

import re
import asyncio
import subprocess
from typing import List, Dict, Optional
from pathlib import Path
from ytmusicapi import YTMusic

from config.logging_config import get_logger

logger = get_logger('apple_music_handler')


class AppleMusicHandler:
    """Handle Apple Music playlists/albums with YouTube Music fallback"""
    
    def __init__(self):
        self.cookies_path = Path('cookies/apple_music_cookies.txt')
        self.ytmusic = YTMusic()
        
        if not self.cookies_path.exists():
            logger.warning("Apple Music cookies not found at cookies/apple_music_cookies.txt")
        else:
            logger.info("Apple Music cookies loaded")
    
    async def get_tracks_from_url(self, url: str) -> List[Dict[str, str]]:
        """
        Get all tracks from Apple Music playlist or album using gamdl
        
        Args:
            url: Apple Music playlist or album URL
            
        Returns:
            List of track info dicts with title, artist, album
        """
        url_type = 'playlist' if 'playlist' in url else 'album'
        logger.info(f"📋 Fetching Apple Music {url_type} with gamdl...")
        
        if not self.cookies_path.exists():
            logger.error("Cannot fetch Apple Music: cookies not found")
            return []
        
        try:
            # Run gamdl to get track list (will start downloading but we'll kill it)
            process = await asyncio.create_subprocess_exec(
                'gamdl',
                '--cookies-path', str(self.cookies_path),
                url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            tracks = []
            total_tracks = 0
            last_artist = ''  # Store artist from previous line
            
            # Read output line by line
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                line = line.decode('utf-8').strip()
                
                # Remove ANSI color codes
                line = re.sub(r'\x1b\[[0-9;]*m', '', line)
                
                # Try to extract artist from path (appears in skip/warning messages)
                # Format: path: /Apple Music/Artist/Album/Track.m4a
                artist_match = re.search(r'path:.*?/Apple Music/([^/]+)/', line)
                if artist_match:
                    last_artist = artist_match.group(1).strip()
                
                # Look for track info: [Track X/Y] Downloading "Song Name"
                match = re.search(r'\[Track (\d+)/(\d+)\] Downloading "([^"]+)"', line)
                if match:
                    track_num = int(match.group(1))
                    total = int(match.group(2))
                    title = match.group(3)
                    
                    if total_tracks == 0:
                        total_tracks = total
                        logger.info(f"✅ Found {total_tracks} tracks in Apple Music {url_type}")
                    
                    # Use artist from previous line (path from skip/warning message)
                    artist = last_artist if last_artist else ''
                    
                    if artist:
                        logger.debug(f"Track {track_num}: {title} - {artist}")
                    
                    tracks.append({
                        'title': title,
                        'artist': artist,  # Extracted from path
                        'album': '',
                        'track_num': track_num
                    })
                    
                    # Reset last_artist for next track
                    last_artist = ''
                    
                    # Log progress
                    if track_num % 5 == 0 or track_num == 1:
                        logger.info(f"📋 Extracted {track_num}/{total_tracks} track names...")
                    
                    # For playlists 100-200 songs: Get ALL track names (fast, no download)
                    # For smaller playlists: Process normally
                    # Strategy: Collect all track names first, enrich one by one later
                    if len(tracks) >= total_tracks:
                        logger.info(f"✅ Got all {len(tracks)} track names from {url_type}")
                        process.kill()
                        break
            
            # Wait for process to finish
            try:
                await asyncio.wait_for(process.wait(), timeout=2)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
            
            if tracks:
                logger.info(f"✅ Successfully extracted {len(tracks)} track names from Apple Music {url_type}")
                
                # STREAMING MODE: Return tracks with basic info only
                # They will be enriched ONE BY ONE when needed (just-in-time processing)
                # This is MUCH faster for large playlists (100-200 songs)
                logger.info(f"💡 Tracks will be processed one by one (streaming mode)")
                logger.info(f"📋 Total: {len(tracks)} tracks ready for sequential processing")
                
                return tracks  # Return immediately without batch enrichment
            else:
                logger.warning("❌ No tracks found in gamdl output")
                return []
                
        except Exception as e:
            logger.error(f"Error running gamdl: {e}")
            return []
    
    async def get_playlist_tracks(self, playlist_url: str) -> List[Dict[str, str]]:
        """Get all tracks from Apple Music playlist"""
        return await self.get_tracks_from_url(playlist_url)
    
    async def get_album_tracks(self, album_url: str) -> List[Dict[str, str]]:
        """
        Get all tracks from Apple Music album
        Uses same gamdl method as playlist
        """
        return await self.get_tracks_from_url(album_url)
    
    async def enrich_single_track(self, track: Dict) -> Dict:
        """
        Enrich a single track with YouTube Music metadata (just-in-time)
        
        Args:
            track: Track dict with title and optionally artist
            
        Returns:
            Enriched track dict with full metadata
        """
        title = track.get('title', '')
        artist = track.get('artist', '')  # Artist dari Apple Music (CORRECT!)
        
        logger.info(f"🔍 Searching YouTube Music for: {title} - {artist}")
        
        ytmusic_data = await self._search_ytmusic(title, artist)
        
        if ytmusic_data:
            # IMPORTANT: Preserve original artist from Apple Music if available
            # Only use YouTube Music artist if Apple Music didn't provide one
            final_artist = artist if artist else ytmusic_data['artist']
            
            enriched = {
                'title': ytmusic_data['title'],
                'artist': final_artist,  # Use Apple Music artist (more accurate!)
                'album': ytmusic_data['album'],
                'track_num': track.get('track_num', 0),
                'videoId': ytmusic_data['videoId'],
                'duration': ytmusic_data['duration']
            }
            
            if artist and artist != ytmusic_data['artist']:
                logger.info(f"✅ Found: {enriched['title']} - {final_artist} (kept Apple Music artist)")
            else:
                logger.info(f"✅ Found: {enriched['title']} - {enriched['artist']}")
            
            return enriched
        else:
            # Keep original if search failed
            logger.warning(f"⚠️ Not found on YouTube Music: {title}")
            return track
    
    async def _search_ytmusic(self, title: str, artist: str = '') -> Optional[Dict]:
        """
        Search a track on YouTube Music
        
        Args:
            title: Track title
            artist: Artist name (optional)
            
        Returns:
            Track metadata dict or None
        """
        try:
            # Build search query
            query = f"{artist} {title}" if artist else title
            
            # Search on YouTube Music
            results = await asyncio.to_thread(
                self.ytmusic.search,
                query,
                filter='songs',
                limit=1
            )
            
            if not results:
                return None
            
            result = results[0]
            return {
                'title': result.get('title', title),
                'artist': result['artists'][0]['name'] if result.get('artists') else artist,
                'album': result.get('album', {}).get('name', '') if result.get('album') else '',
                'duration': result.get('duration', ''),
                'videoId': result.get('videoId', ''),
                'thumbnails': result.get('thumbnails', [])
            }
            
        except Exception as e:
            logger.debug(f"YTMusic search error for '{title}': {e}")
            return None
    
    async def _enrich_tracks_with_ytmusic(self, tracks: List[Dict]) -> List[Dict]:
        """
        Enrich tracks with YouTube Music metadata (parallel search)
        
        Args:
            tracks: List of track dicts from gamdl (title, artist)
            
        Returns:
            List of enriched track dicts
        """
        logger.info(f"🔍 Searching {len(tracks)} tracks on YouTube Music...")
        
        # Create search tasks for all tracks
        tasks = []
        for track in tracks:
            task = self._search_ytmusic(track['title'], track.get('artist', ''))
            tasks.append(task)
        
        # Execute all searches in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Merge results with original track data
        enriched = []
        for i, (track, ytmusic_data) in enumerate(zip(tracks, results), 1):
            if isinstance(ytmusic_data, Exception):
                logger.warning(f"Search failed for track {i}: {track['title']}")
                enriched.append(track)
                continue
            
            if ytmusic_data:
                # Merge YTMusic data
                enriched_track = {
                    'title': ytmusic_data['title'],
                    'artist': ytmusic_data['artist'],
                    'album': ytmusic_data['album'],
                    'track_num': track.get('track_num', i),
                    'videoId': ytmusic_data['videoId'],
                    'duration': ytmusic_data['duration']
                }
                enriched.append(enriched_track)
                
                if i % 5 == 0 or i == len(tracks):
                    logger.info(f"📋 Enriched {i}/{len(tracks)} tracks...")
            else:
                # Keep original if search failed
                enriched.append(track)
        
        return enriched


# Global instance
_apple_music_handler = None

def get_apple_music_handler() -> AppleMusicHandler:
    """Get or create global AppleMusicHandler instance"""
    global _apple_music_handler
    if _apple_music_handler is None:
        _apple_music_handler = AppleMusicHandler()
    return _apple_music_handler
