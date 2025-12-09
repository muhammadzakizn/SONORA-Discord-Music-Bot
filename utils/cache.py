"""Caching utilities using cachetools"""

import time
from typing import Any, Optional, Callable
from cachetools import TTLCache
from functools import wraps
import hashlib
import json

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('cache')


class CacheManager:
    """Cache manager untuk artwork, lyrics, dan metadata"""
    
    def __init__(self):
        """Initialize cache manager with TTL caches"""
        # Artwork cache (URL -> image data)
        self.artwork_cache = TTLCache(
            maxsize=100,
            ttl=Settings.CACHE_TTL
        )
        
        # Lyrics cache (track_id -> lyrics data)
        self.lyrics_cache = TTLCache(
            maxsize=200,
            ttl=7200  # 2 hours
        )
        
        # Metadata cache (track_id -> metadata)
        self.metadata_cache = TTLCache(
            maxsize=200,
            ttl=Settings.CACHE_TTL
        )
        
        # Track info cache (query -> track info)
        self.track_info_cache = TTLCache(
            maxsize=500,
            ttl=3600  # 1 hour
        )
        
        logger.info("Cache manager initialized")
    
    @staticmethod
    def generate_cache_key(*args, **kwargs) -> str:
        """
        Generate cache key from arguments
        
        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            Cache key (hash string)
        """
        # Combine all arguments into a single string
        key_data = {
            'args': args,
            'kwargs': kwargs
        }
        
        # Create hash
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, cache_name: str, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            cache_name: Name of cache (artwork, lyrics, metadata, track_info)
            key: Cache key
        
        Returns:
            Cached value or None if not found
        """
        cache = getattr(self, f'{cache_name}_cache', None)
        if cache is None:
            logger.warning(f"Cache '{cache_name}' not found")
            return None
        
        value = cache.get(key)
        if value is not None:
            logger.debug(f"Cache hit for {cache_name}: {key[:20]}...")
        else:
            logger.debug(f"Cache miss for {cache_name}: {key[:20]}...")
        
        return value
    
    def set(self, cache_name: str, key: str, value: Any) -> None:
        """
        Set value in cache
        
        Args:
            cache_name: Name of cache
            key: Cache key
            value: Value to cache
        """
        cache = getattr(self, f'{cache_name}_cache', None)
        if cache is None:
            logger.warning(f"Cache '{cache_name}' not found")
            return
        
        cache[key] = value
        logger.debug(f"Cached {cache_name}: {key[:20]}...")
    
    def clear(self, cache_name: Optional[str] = None) -> None:
        """
        Clear cache
        
        Args:
            cache_name: Name of cache to clear, or None to clear all
        """
        if cache_name:
            cache = getattr(self, f'{cache_name}_cache', None)
            if cache:
                cache.clear()
                logger.info(f"Cleared {cache_name} cache")
        else:
            # Clear all caches
            for attr_name in dir(self):
                if attr_name.endswith('_cache'):
                    cache = getattr(self, attr_name)
                    if isinstance(cache, TTLCache):
                        cache.clear()
            logger.info("Cleared all caches")
    
    def get_stats(self) -> dict:
        """
        Get cache statistics
        
        Returns:
            Dictionary with cache stats
        """
        stats = {}
        
        for attr_name in dir(self):
            if attr_name.endswith('_cache'):
                cache = getattr(self, attr_name)
                if isinstance(cache, TTLCache):
                    cache_name = attr_name.replace('_cache', '')
                    stats[cache_name] = {
                        'size': len(cache),
                        'maxsize': cache.maxsize,
                        'ttl': cache.ttl
                    }
        
        return stats


def cached(cache_manager: CacheManager, cache_name: str, key_func: Optional[Callable] = None):
    """
    Decorator for caching function results
    
    Args:
        cache_manager: CacheManager instance
        cache_name: Name of cache to use
        key_func: Optional function to generate cache key from arguments
    
    Example:
        @cached(cache_manager, 'metadata', lambda track_id: track_id)
        async def get_metadata(track_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = CacheManager.generate_cache_key(*args, **kwargs)
            
            # Check cache
            cached_value = cache_manager.get(cache_name, cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function
            result = await func(*args, **kwargs)
            
            # Store in cache
            if result is not None:
                cache_manager.set(cache_name, cache_key, result)
            
            return result
        
        return wrapper
    return decorator


# Global cache manager instance
cache_manager = CacheManager()
