"""Lyrics fetching services"""

from .base import BaseLyricsFetcher
from .genius import GeniusLyricsFetcher
from .musixmatch import MusixmatchLyricsFetcher

__all__ = ['BaseLyricsFetcher', 'GeniusLyricsFetcher', 'MusixmatchLyricsFetcher']
