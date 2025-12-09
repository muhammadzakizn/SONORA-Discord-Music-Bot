"""
Download Manager for Audio, Lyrics, Artwork
Supports single and batch downloads
"""

import os
import asyncio
import aiohttp
from pathlib import Path
from typing import List, Dict, Optional
import logging
from mutagen.oggopus import OggOpus
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC
from mutagen.mp3 import MP3
from mutagen.flac import FLAC, Picture
import shutil

logger = logging.getLogger(__name__)

class DownloadManager:
    """Manage downloads for audio, lyrics, and artwork"""
    
    AUDIO_FORMATS = {
        'opus': {'ext': '.opus', 'quality': 'high'},
        'mp3': {'ext': '.mp3', 'quality': 'high'},
        'flac': {'ext': '.flac', 'quality': 'lossless'}
    }
    
    LYRICS_FORMATS = {
        'lrc': {'ext': '.lrc', 'synced': True},
        'txt': {'ext': '.txt', 'synced': False}
    }
    
    ARTWORK_FORMATS = {
        'jpg': {'ext': '.jpg', 'quality': 'high'},
        'png': {'ext': '.png', 'quality': 'high'}
    }
    
    def __init__(self, download_dir: str = "exports"):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.download_dir / "audio").mkdir(exist_ok=True)
        (self.download_dir / "lyrics").mkdir(exist_ok=True)
        (self.download_dir / "artwork").mkdir(exist_ok=True)
        (self.download_dir / "full").mkdir(exist_ok=True)
    
    async def download_audio_only(
        self, 
        track_info: Dict, 
        format: str = 'opus'
    ) -> Optional[str]:
        """
        Download audio file only
        
        Args:
            track_info: {
                'title': str,
                'artist': str,
                'url': str,
                'file_path': str (source file in downloads/)
            }
            format: Audio format (opus, mp3, flac)
        
        Returns:
            Path to exported file or None
        """
        try:
            source_file = track_info.get('file_path')
            if not source_file or not Path(source_file).exists():
                logger.error(f"Source file not found: {source_file}")
                return None
            
            # Generate output filename
            safe_title = self._sanitize_filename(f"{track_info['artist']} - {track_info['title']}")
            output_file = self.download_dir / "audio" / f"{safe_title}{self.AUDIO_FORMATS[format]['ext']}"
            
            # Convert if needed
            if format == 'opus':
                # Just copy the opus file
                shutil.copy2(source_file, output_file)
            elif format == 'mp3':
                # Convert opus to mp3 using ffmpeg
                await self._convert_audio(source_file, output_file, 'mp3')
            elif format == 'flac':
                # Convert opus to flac
                await self._convert_audio(source_file, output_file, 'flac')
            
            logger.info(f"Audio exported: {output_file}")
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to download audio: {e}")
            return None
    
    async def download_lyrics_only(
        self,
        track_info: Dict,
        lyrics: str,
        format: str = 'lrc'
    ) -> Optional[str]:
        """
        Download lyrics file only
        
        Args:
            track_info: Track information
            lyrics: Lyrics text
            format: Lyrics format (lrc, txt)
        
        Returns:
            Path to lyrics file or None
        """
        try:
            safe_title = self._sanitize_filename(f"{track_info['artist']} - {track_info['title']}")
            output_file = self.download_dir / "lyrics" / f"{safe_title}{self.LYRICS_FORMATS[format]['ext']}"
            
            # Write lyrics to file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(lyrics)
            
            logger.info(f"Lyrics exported: {output_file}")
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to download lyrics: {e}")
            return None
    
    async def download_artwork_only(
        self,
        track_info: Dict,
        artwork_url: str,
        format: str = 'jpg'
    ) -> Optional[str]:
        """
        Download artwork/album cover only
        
        Args:
            track_info: Track information
            artwork_url: URL to artwork image
            format: Image format (jpg, png)
        
        Returns:
            Path to artwork file or None
        """
        try:
            safe_title = self._sanitize_filename(f"{track_info['artist']} - {track_info['title']}")
            output_file = self.download_dir / "artwork" / f"{safe_title}{self.ARTWORK_FORMATS[format]['ext']}"
            
            # Download image
            async with aiohttp.ClientSession() as session:
                async with session.get(artwork_url) as response:
                    if response.status == 200:
                        with open(output_file, 'wb') as f:
                            f.write(await response.read())
                    else:
                        logger.error(f"Failed to download artwork: HTTP {response.status}")
                        return None
            
            logger.info(f"Artwork exported: {output_file}")
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to download artwork: {e}")
            return None
    
    async def download_full_package(
        self,
        track_info: Dict,
        lyrics: Optional[str] = None,
        artwork_url: Optional[str] = None,
        audio_format: str = 'mp3'
    ) -> Optional[str]:
        """
        Download complete package: audio with embedded metadata, lyrics, and artwork
        
        Args:
            track_info: Track information
            lyrics: Lyrics text (optional)
            artwork_url: Artwork URL (optional)
            audio_format: Audio format (mp3 recommended for metadata)
        
        Returns:
            Path to audio file with embedded metadata or None
        """
        try:
            safe_title = self._sanitize_filename(f"{track_info['artist']} - {track_info['title']}")
            output_file = self.download_dir / "full" / f"{safe_title}.{audio_format}"
            
            # First, get audio file
            source_file = track_info.get('file_path')
            if not source_file or not Path(source_file).exists():
                logger.error(f"Source file not found: {source_file}")
                return None
            
            # Convert to target format
            if audio_format == 'mp3':
                await self._convert_audio(source_file, output_file, 'mp3')
                
                # Embed metadata
                audio = MP3(output_file, ID3=ID3)
                
                # Add ID3 tags
                try:
                    audio.add_tags()
                except:
                    pass
                
                audio['TIT2'] = TIT2(encoding=3, text=track_info['title'])
                audio['TPE1'] = TPE1(encoding=3, text=track_info['artist'])
                
                if track_info.get('album'):
                    audio['TALB'] = TALB(encoding=3, text=track_info['album'])
                
                # Embed artwork
                if artwork_url:
                    artwork_data = await self._download_image_data(artwork_url)
                    if artwork_data:
                        audio['APIC'] = APIC(
                            encoding=3,
                            mime='image/jpeg',
                            type=3,  # Cover (front)
                            desc='Cover',
                            data=artwork_data
                        )
                
                # Embed lyrics (unsync lyrics)
                if lyrics:
                    from mutagen.id3 import USLT
                    audio['USLT'] = USLT(encoding=3, lang='eng', desc='', text=lyrics)
                
                audio.save()
                
            elif audio_format == 'flac':
                await self._convert_audio(source_file, output_file, 'flac')
                
                audio = FLAC(output_file)
                audio['TITLE'] = track_info['title']
                audio['ARTIST'] = track_info['artist']
                
                if track_info.get('album'):
                    audio['ALBUM'] = track_info['album']
                
                # Embed artwork
                if artwork_url:
                    artwork_data = await self._download_image_data(artwork_url)
                    if artwork_data:
                        picture = Picture()
                        picture.type = 3  # Cover (front)
                        picture.mime = 'image/jpeg'
                        picture.desc = 'Cover'
                        picture.data = artwork_data
                        audio.add_picture(picture)
                
                # FLAC doesn't support embedded lyrics, save separately
                if lyrics:
                    lyrics_file = output_file.with_suffix('.lrc')
                    with open(lyrics_file, 'w', encoding='utf-8') as f:
                        f.write(lyrics)
                
                audio.save()
            
            else:  # opus
                shutil.copy2(source_file, output_file)
                
                audio = OggOpus(output_file)
                audio['TITLE'] = track_info['title']
                audio['ARTIST'] = track_info['artist']
                
                if track_info.get('album'):
                    audio['ALBUM'] = track_info['album']
                
                audio.save()
                
                # Opus doesn't support embedded artwork/lyrics well, save separately
                if artwork_url:
                    artwork_file = output_file.with_suffix('.jpg')
                    await self.download_artwork_only(track_info, artwork_url, 'jpg')
                
                if lyrics:
                    lyrics_file = output_file.with_suffix('.lrc')
                    with open(lyrics_file, 'w', encoding='utf-8') as f:
                        f.write(lyrics)
            
            logger.info(f"Full package exported: {output_file}")
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to download full package: {e}")
            return None
    
    async def batch_download(
        self,
        tracks: List[Dict],
        download_type: str = 'audio',  # 'audio', 'lyrics', 'artwork', 'full'
        format: str = 'opus',
        progress_callback = None
    ) -> List[str]:
        """
        Batch download multiple tracks
        
        Args:
            tracks: List of track info dicts
            download_type: Type of download
            format: File format
            progress_callback: Async callback for progress updates
        
        Returns:
            List of downloaded file paths
        """
        results = []
        total = len(tracks)
        
        for i, track in enumerate(tracks):
            try:
                if download_type == 'audio':
                    result = await self.download_audio_only(track, format)
                elif download_type == 'lyrics':
                    result = await self.download_lyrics_only(track, track.get('lyrics', ''), format)
                elif download_type == 'artwork':
                    result = await self.download_artwork_only(track, track.get('artwork_url', ''), format)
                elif download_type == 'full':
                    result = await self.download_full_package(
                        track,
                        track.get('lyrics'),
                        track.get('artwork_url'),
                        format
                    )
                
                if result:
                    results.append(result)
                
                # Progress callback
                if progress_callback:
                    await progress_callback(i + 1, total)
                
            except Exception as e:
                logger.error(f"Failed to download track {track.get('title')}: {e}")
        
        return results
    
    async def _convert_audio(self, input_file: str, output_file: str, format: str):
        """Convert audio using ffmpeg"""
        try:
            cmd = [
                'ffmpeg', '-i', str(input_file),
                '-c:a', 'libmp3lame' if format == 'mp3' else 'flac',
                '-b:a', '320k' if format == 'mp3' else '0',
                '-y',  # Overwrite
                str(output_file)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
        except Exception as e:
            logger.error(f"FFmpeg conversion failed: {e}")
            raise
    
    async def _download_image_data(self, url: str) -> Optional[bytes]:
        """Download image and return bytes"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.read()
            return None
        except:
            return None
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem"""
        # Remove invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '')
        
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        
        return filename.strip()


# Global instance
download_manager = DownloadManager()
