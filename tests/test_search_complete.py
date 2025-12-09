#!/usr/bin/env python3
"""Complete search test with fallback"""

import asyncio
import sys
sys.path.insert(0, '.')

from services.audio.spotify import SpotifyDownloader
from services.audio.youtube import YouTubeDownloader
from config.settings import Settings

async def test_complete_search():
    print('=' * 60)
    print('COMPLETE SEARCH TEST - Spotify + YouTube Fallback')
    print('=' * 60)
    
    spotify = SpotifyDownloader(Settings.DOWNLOADS_DIR)
    youtube = YouTubeDownloader(Settings.DOWNLOADS_DIR)
    
    queries = [
        'Face Down',
        'Shape of You',
        'Blinding Lights',
        'some_random_nonexistent_song_12345'
    ]
    
    for query in queries:
        print(f'\n{"="*60}')
        print(f'Query: "{query}"')
        print('-' * 60)
        
        # Try Spotify
        print('1. Trying Spotify...')
        spotify_result = await spotify.search(query)
        
        if spotify_result:
            print(f'   ✓ FOUND: {spotify_result.title} - {spotify_result.artist}')
            print(f'   URL: {spotify_result.url}')
        else:
            print('   ✗ Not found on Spotify')
            
            # Fallback to YouTube
            print('2. Falling back to YouTube...')
            youtube_result = await youtube.search(query)
            
            if youtube_result:
                print(f'   ✓ FOUND: {youtube_result.title} - {youtube_result.artist}')
                print(f'   URL: {youtube_result.url}')
            else:
                print('   ✗ Not found on YouTube either')
                print('   ❌ NO RESULTS')

if __name__ == '__main__':
    asyncio.run(test_complete_search())
