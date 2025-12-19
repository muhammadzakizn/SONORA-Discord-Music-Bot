"""
Apple Music Lyrics Fetcher using Manzana approach
Fetches time-synced lyrics from Apple Music API with TTML format
"""

import re
import requests
import os
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup

from .base import BaseLyricsFetcher
from database.models import LyricsData, TrackInfo, LyricLine
from config.constants import LyricsSource
from config.logging_config import get_logger
from utils.romanization import romanize_lyrics_line

logger = get_logger('lyrics.applemusic')


class AppleMusicFetcher(BaseLyricsFetcher):
    """
    Apple Music lyrics fetcher with TTML support
    
    Features:
    - Line-level timing from TTML
    - Syllable-level timing when available
    - High quality lyrics from Apple Music database
    """
    
    def __init__(self, cookies_path: str = None):
        """Initialize Apple Music fetcher"""
        super().__init__()
        self.source = LyricsSource.SYNCED
        self.session = requests.Session()
        self.access_token = None
        self.media_user_token = None
        self.storefront = "us"  # Default, will be updated
        self.language = "en"
        
        # Try to load cookies
        if cookies_path and os.path.exists(cookies_path):
            self._load_media_token(cookies_path)
    
    def _load_media_token(self, cookies_path: str):
        """Load media-user-token from cookies file"""
        try:
            with open(cookies_path, 'r') as f:
                for line in f:
                    if 'media-user-token' in line and '.music.apple.com' in line:
                        parts = line.strip().split('\t')
                        if len(parts) >= 7:
                            self.media_user_token = parts[-1]
                            logger.info("Loaded Apple Music media-user-token")
                            break
        except Exception as e:
            logger.error(f"Failed to load Apple Music cookies: {e}")
    
    def _get_access_token(self) -> Optional[str]:
        """Fetch access token from Apple Music website"""
        if self.access_token:
            return self.access_token
        
        try:
            resp = requests.get('https://music.apple.com/us/browse')
            if resp.status_code != 200:
                logger.error("Failed to get Apple Music homepage")
                return None
            
            # Find index.js URL
            match = re.search(r'(?<=index)(.*?)(?=\.js")', resp.text)
            if not match:
                logger.error("Could not find Apple Music JS file")
                return None
            
            index_js = match.group(1)
            resp = requests.get(f'https://music.apple.com/assets/index{index_js}.js')
            
            # Extract token
            match = re.search(r'(?=eyJh)(.*?)(?=")', resp.text)
            if match:
                self.access_token = match.group(1)
                logger.info("Fetched Apple Music access token")
                return self.access_token
            
            logger.error("Could not extract Apple Music access token")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get Apple Music access token: {e}")
            return None
    
    def _get_storefront(self) -> bool:
        """Get user's storefront from Apple Music API"""
        if not self.media_user_token:
            logger.warning("No media-user-token available")
            return False
        
        access_token = self._get_access_token()
        if not access_token:
            return False
        
        try:
            headers = {
                'authorization': f'Bearer {access_token}',
                'media-user-token': self.media_user_token,
                'origin': 'https://music.apple.com'
            }
            
            resp = requests.get(
                'https://amp-api.music.apple.com/v1/me/storefront',
                headers=headers
            )
            
            if resp.status_code == 200:
                data = resp.json()
                self.storefront = data['data'][0]['id']
                self.language = data['data'][0]['attributes'].get('defaultLanguageTag', 'en')
                logger.info(f"Apple Music storefront: {self.storefront}")
                return True
            else:
                logger.error(f"Failed to get storefront: {resp.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Storefront error: {e}")
            return False
    
    def _search_song(self, title: str, artist: str) -> Optional[str]:
        """Search for a song on Apple Music and return song ID"""
        access_token = self._get_access_token()
        if not access_token:
            return None
        
        try:
            headers = {
                'authorization': f'Bearer {access_token}',
                'media-user-token': self.media_user_token,
                'origin': 'https://music.apple.com'
            }
            
            params = {
                'term': f'{title} {artist}',
                'types': 'songs',
                'limit': '5'
            }
            
            resp = requests.get(
                f'https://amp-api.music.apple.com/v1/catalog/{self.storefront}/search',
                headers=headers,
                params=params
            )
            
            if resp.status_code == 200:
                data = resp.json()
                songs = data.get('results', {}).get('songs', {}).get('data', [])
                
                if songs:
                    # Find best match
                    for song in songs:
                        song_title = song['attributes']['name'].lower()
                        song_artist = song['attributes']['artistName'].lower()
                        
                        if title.lower() in song_title or song_title in title.lower():
                            if artist.lower() in song_artist or song_artist in artist.lower():
                                return song['id']
                    
                    # Return first result if no exact match
                    return songs[0]['id']
            
            return None
            
        except Exception as e:
            logger.error(f"Apple Music search error: {e}")
            return None
    
    def _fetch_lyrics(self, song_id: str) -> Optional[str]:
        """Fetch TTML lyrics for a song"""
        access_token = self._get_access_token()
        if not access_token:
            return None
        
        try:
            headers = {
                'authorization': f'Bearer {access_token}',
                'media-user-token': self.media_user_token,
                'origin': 'https://music.apple.com'
            }
            
            params = {
                'include[songs]': 'lyrics,syllable-lyrics',
                'l': self.language
            }
            
            resp = requests.get(
                f'https://amp-api.music.apple.com/v1/catalog/{self.storefront}/songs/{song_id}',
                headers=headers,
                params=params
            )
            
            if resp.status_code == 200:
                data = resp.json()
                track = data['data'][0]
                rels = track.get('relationships', {})
                
                if 'lyrics' in rels and rels['lyrics']['data']:
                    return rels['lyrics']['data'][0]['attributes'].get('ttml', '')
            
            return None
            
        except Exception as e:
            logger.error(f"Apple Music lyrics fetch error: {e}")
            return None
    
    def _parse_ttml(self, ttml: str) -> Optional[LyricsData]:
        """Parse TTML lyrics into LyricsData"""
        if not ttml:
            return None
        
        try:
            soup = BeautifulSoup(ttml, 'lxml')
            lines = []
            
            # Check timing type
            tt = soup.find('tt')
            timing_type = tt.get('itunes:timing', 'Line') if tt else 'Line'
            has_syllable = timing_type == 'Syllable' or '<span' in ttml
            
            for p in soup.find_all('p'):
                text = p.get_text().strip()
                if not text:
                    continue
                
                # Parse timing
                begin = p.get('begin', '0')
                end = p.get('end', '0')
                
                start_time = self._parse_time(begin)
                end_time = self._parse_time(end)
                
                # Parse word timing if available
                words = []
                if has_syllable:
                    spans = p.find_all('span', attrs={'begin': True, 'end': True})
                    for span in spans:
                        word_text = span.get_text()
                        word_start = self._parse_time(span.get('begin', '0'))
                        word_end = self._parse_time(span.get('end', '0'))
                        
                        if word_text.strip():
                            words.append({
                                'text': word_text.strip(),
                                'start_time': word_start,
                                'end_time': word_end
                            })
                
                # Estimate word timing if not available
                if not words and text:
                    word_list = text.split()
                    if word_list:
                        line_duration = end_time - start_time
                        word_duration = line_duration / len(word_list) if word_list else 0
                        
                        for i, word in enumerate(word_list):
                            words.append({
                                'text': word,
                                'start_time': start_time + (i * word_duration),
                                'end_time': start_time + ((i + 1) * word_duration)
                            })
                
                # Romanize if needed
                romanized = romanize_lyrics_line(text)
                
                lines.append(LyricLine(
                    text=text,
                    start_time=start_time,
                    end_time=end_time,
                    romanized=romanized,
                    words=words
                ))
            
            if lines:
                return LyricsData(
                    lines=lines,
                    source=LyricsSource.SYNCED,
                    is_synced=True,
                    offset=0.0,
                    has_syllable_timing=has_syllable  # True only when real syllable timing exists
                )
            
            return None
            
        except Exception as e:
            logger.error(f"TTML parse error: {e}")
            return None
    
    def _parse_time(self, time_str: str) -> float:
        """Parse TTML time string to seconds"""
        if not time_str:
            return 0.0
        
        time_str = str(time_str).replace('s', '')
        
        try:
            if ':' in time_str:
                parts = time_str.split(':')
                if len(parts) == 2:
                    mins, secs = parts
                    return float(mins) * 60 + float(secs)
                elif len(parts) == 3:
                    hours, mins, secs = parts
                    return float(hours) * 3600 + float(mins) * 60 + float(secs)
            else:
                return float(time_str)
        except:
            return 0.0
    
    async def fetch(self, track_info: TrackInfo) -> Optional[LyricsData]:
        """
        Fetch lyrics from Apple Music
        
        Args:
            track_info: Track information
        
        Returns:
            LyricsData if found
        """
        if not self.media_user_token:
            logger.warning("Apple Music: No media-user-token available")
            return None
        
        try:
            logger.info(f"Fetching Apple Music lyrics: {track_info.title} - {track_info.artist}")
            
            # Get storefront if not set
            if not self._get_storefront():
                return None
            
            # Search for song
            song_id = self._search_song(track_info.title, track_info.artist)
            if not song_id:
                logger.warning(f"Apple Music: Song not found: {track_info.title}")
                return None
            
            logger.info(f"Apple Music: Found song ID {song_id}")
            
            # Fetch lyrics
            ttml = self._fetch_lyrics(song_id)
            if not ttml:
                logger.warning(f"Apple Music: No lyrics for song ID {song_id}")
                return None
            
            logger.info(f"Apple Music: Got TTML lyrics ({len(ttml)} chars)")
            
            # Parse TTML
            lyrics_data = self._parse_ttml(ttml)
            if lyrics_data:
                logger.info(f"Apple Music: Parsed {len(lyrics_data.lines)} lines")
                return lyrics_data
            
            return None
            
        except Exception as e:
            logger.error(f"Apple Music fetch error: {e}")
            return None
    
    async def search(self, query: str) -> Optional[LyricsData]:
        """Search for lyrics by query"""
        parts = query.split(' - ', 1)
        if len(parts) == 2:
            title, artist = parts
        else:
            title = query
            artist = ''
        
        track_info = TrackInfo(
            title=title.strip(),
            artist=artist.strip() or 'Unknown',
            duration=0
        )
        
        return await self.fetch(track_info)


# Backwards compatibility
AppleMusicLyricsFetcher = AppleMusicFetcher
