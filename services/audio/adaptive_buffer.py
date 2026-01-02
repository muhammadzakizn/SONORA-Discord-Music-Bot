"""
Adaptive Streaming Buffer - Network speed detection and dynamic buffer adjustment

This module provides intelligent buffering for streaming audio:
- Fast network: 0-1 second buffer (instant playback)
- Medium network: 2-3 second buffer
- Slow network: 4-6 second buffer

The buffer time is calculated based on actual download speed measured
from the stream URL's first few chunks.
"""

import asyncio
import aiohttp
import time
from dataclasses import dataclass
from typing import Optional, Tuple
from config.logging_config import get_logger

logger = get_logger('audio.adaptive_buffer')


@dataclass
class NetworkSpeed:
    """Network speed measurement result"""
    bytes_per_second: float
    latency_ms: float
    buffer_recommended: float  # Recommended buffer in seconds
    quality: str  # 'fast', 'medium', 'slow', 'very_slow'
    
    @property
    def mbps(self) -> float:
        """Speed in Mbps"""
        return (self.bytes_per_second * 8) / (1024 * 1024)


class AdaptiveBuffer:
    """
    Adaptive buffer system that measures network speed and determines
    optimal buffer time for streaming audio.
    
    Speed thresholds (for 256kbps audio = ~32KB/s minimum):
    - Fast: > 500 KB/s (buffer: 0-1s)
    - Medium: 100-500 KB/s (buffer: 2-3s)  
    - Slow: 50-100 KB/s (buffer: 4-5s)
    - Very Slow: < 50 KB/s (buffer: 6s)
    """
    
    # Speed thresholds in bytes/second
    SPEED_FAST = 500 * 1024       # 500 KB/s
    SPEED_MEDIUM = 100 * 1024     # 100 KB/s
    SPEED_SLOW = 50 * 1024        # 50 KB/s
    
    # Buffer times in seconds
    BUFFER_FAST = 1.0
    BUFFER_MEDIUM = 3.0
    BUFFER_SLOW = 5.0
    BUFFER_VERY_SLOW = 6.0
    
    # Minimum audio to pre-buffer (in seconds of audio)
    # 256kbps = 32KB/s, so 3s of audio = ~96KB
    MIN_PREBUFFER_SECONDS = 3
    MIN_PREBUFFER_BYTES = 32 * 1024 * MIN_PREBUFFER_SECONDS  # ~96KB
    
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_speed: Optional[NetworkSpeed] = None
        self._speed_cache_time: float = 0
        self._cache_duration = 60  # Cache speed result for 60 seconds
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session
    
    async def close(self):
        """Close session"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def measure_stream_speed(
        self, 
        stream_url: str,
        sample_bytes: int = 64 * 1024  # Download 64KB sample
    ) -> NetworkSpeed:
        """
        Measure download speed from stream URL.
        
        Downloads a small sample and calculates speed.
        
        Args:
            stream_url: URL to measure
            sample_bytes: How many bytes to download for measurement
            
        Returns:
            NetworkSpeed with measured values
        """
        # Check cache first
        if self._last_speed and (time.time() - self._speed_cache_time) < self._cache_duration:
            logger.debug(f"Using cached speed: {self._last_speed.quality}")
            return self._last_speed
        
        try:
            session = await self._get_session()
            
            # Measure latency (time to first byte)
            start_time = time.time()
            
            async with session.get(stream_url, headers={'Range': f'bytes=0-{sample_bytes-1}'}) as response:
                first_byte_time = time.time()
                latency_ms = (first_byte_time - start_time) * 1000
                
                # Download sample
                downloaded = 0
                download_start = time.time()
                
                async for chunk in response.content.iter_chunked(8192):
                    downloaded += len(chunk)
                    if downloaded >= sample_bytes:
                        break
                
                download_time = time.time() - download_start
                
                # Calculate speed
                if download_time > 0:
                    bytes_per_second = downloaded / download_time
                else:
                    bytes_per_second = float('inf')
                
                # Determine quality and buffer
                if bytes_per_second >= self.SPEED_FAST:
                    quality = 'fast'
                    buffer = self.BUFFER_FAST
                elif bytes_per_second >= self.SPEED_MEDIUM:
                    quality = 'medium'
                    buffer = self.BUFFER_MEDIUM
                elif bytes_per_second >= self.SPEED_SLOW:
                    quality = 'slow'
                    buffer = self.BUFFER_SLOW
                else:
                    quality = 'very_slow'
                    buffer = self.BUFFER_VERY_SLOW
                
                result = NetworkSpeed(
                    bytes_per_second=bytes_per_second,
                    latency_ms=latency_ms,
                    buffer_recommended=buffer,
                    quality=quality
                )
                
                # Cache result
                self._last_speed = result
                self._speed_cache_time = time.time()
                
                logger.info(
                    f"Network speed: {result.mbps:.1f} Mbps, "
                    f"latency: {latency_ms:.0f}ms, "
                    f"quality: {quality}, "
                    f"buffer: {buffer}s"
                )
                
                return result
                
        except asyncio.TimeoutError:
            logger.warning("Speed test timeout - assuming slow network")
            return NetworkSpeed(
                bytes_per_second=30 * 1024,  # Assume ~30 KB/s
                latency_ms=5000,
                buffer_recommended=self.BUFFER_VERY_SLOW,
                quality='very_slow'
            )
        except Exception as e:
            logger.warning(f"Speed test failed: {e} - using default buffer")
            return NetworkSpeed(
                bytes_per_second=100 * 1024,  # Assume ~100 KB/s
                latency_ms=1000,
                buffer_recommended=self.BUFFER_MEDIUM,
                quality='medium'
            )
    
    async def prebuffer_stream(
        self,
        stream_url: str,
        min_seconds: float = 3.0
    ) -> Tuple[bytes, NetworkSpeed]:
        """
        Pre-buffer audio data from stream.
        
        Downloads enough audio data to ensure smooth playback start.
        
        Args:
            stream_url: Stream URL to prebuffer
            min_seconds: Minimum seconds of audio to buffer
            
        Returns:
            Tuple of (prebuffered_data, network_speed)
        """
        # Calculate bytes needed (256kbps = 32KB/s)
        bytes_needed = int(32 * 1024 * min_seconds)
        
        try:
            session = await self._get_session()
            
            start_time = time.time()
            prebuffered = bytearray()
            
            async with session.get(stream_url) as response:
                first_byte_time = time.time()
                latency_ms = (first_byte_time - start_time) * 1000
                
                async for chunk in response.content.iter_chunked(8192):
                    prebuffered.extend(chunk)
                    
                    if len(prebuffered) >= bytes_needed:
                        break
                
                download_time = time.time() - first_byte_time
                bytes_per_second = len(prebuffered) / download_time if download_time > 0 else float('inf')
                
                # Determine quality
                if bytes_per_second >= self.SPEED_FAST:
                    quality = 'fast'
                    buffer = self.BUFFER_FAST
                elif bytes_per_second >= self.SPEED_MEDIUM:
                    quality = 'medium'
                    buffer = self.BUFFER_MEDIUM
                elif bytes_per_second >= self.SPEED_SLOW:
                    quality = 'slow'
                    buffer = self.BUFFER_SLOW
                else:
                    quality = 'very_slow'
                    buffer = self.BUFFER_VERY_SLOW
                
                speed = NetworkSpeed(
                    bytes_per_second=bytes_per_second,
                    latency_ms=latency_ms,
                    buffer_recommended=buffer,
                    quality=quality
                )
                
                logger.info(
                    f"Prebuffered {len(prebuffered)/1024:.1f}KB "
                    f"({len(prebuffered)/32/1024:.1f}s of audio) "
                    f"at {speed.mbps:.1f} Mbps ({quality})"
                )
                
                return bytes(prebuffered), speed
                
        except Exception as e:
            logger.error(f"Prebuffer failed: {e}")
            return bytes(), NetworkSpeed(
                bytes_per_second=100 * 1024,
                latency_ms=1000,
                buffer_recommended=self.BUFFER_MEDIUM,
                quality='medium'
            )
    
    async def get_optimal_buffer(self, stream_url: str) -> float:
        """
        Get optimal buffer time for a stream URL.
        
        Quick method that just returns the recommended buffer time.
        
        Args:
            stream_url: Stream URL to test
            
        Returns:
            Recommended buffer time in seconds
        """
        speed = await self.measure_stream_speed(stream_url)
        return speed.buffer_recommended


# Global instance
_adaptive_buffer: Optional[AdaptiveBuffer] = None


def get_adaptive_buffer() -> AdaptiveBuffer:
    """Get or create global AdaptiveBuffer instance"""
    global _adaptive_buffer
    if _adaptive_buffer is None:
        _adaptive_buffer = AdaptiveBuffer()
    return _adaptive_buffer
