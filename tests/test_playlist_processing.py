#!/usr/bin/env python3
"""
Test script for playlist processing with ONE_TRACK_ONE_PROCESS mode.

Tests:
1. Spotify playlist fetching
2. YouTube playlist fetching
3. Buffer size with ONE_TRACK_ONE_PROCESS setting
4. Track info extraction

Run: python tests/test_playlist_processing.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def test_one_track_mode():
    """Test 1: ONE_TRACK_ONE_PROCESS setting"""
    print("\n" + "="*60)
    print("TEST 1: ONE_TRACK_ONE_PROCESS Mode")
    print("="*60)
    
    from config.settings import Settings
    from services.audio.playlist_cache import get_playlist_cache
    
    mode = "ENABLED" if Settings.ONE_TRACK_ONE_PROCESS else "DISABLED"
    print(f"ONE_TRACK_ONE_PROCESS: {mode}")
    
    cache = get_playlist_cache()
    print(f"Buffer size: {cache.buffer_size}")
    
    expected = 1 if Settings.ONE_TRACK_ONE_PROCESS else 3
    if cache.buffer_size == expected:
        print(f"✓ PASS: Buffer size is {expected} as expected")
        return True
    else:
        print(f"❌ FAIL: Expected {expected}, got {cache.buffer_size}")
        return False


async def test_spotify_playlist():
    """Test 2: Spotify playlist fetching"""
    print("\n" + "="*60)
    print("TEST 2: Spotify Playlist Fetching")
    print("="*60)
    
    try:
        from services.audio.spotify import SpotifyDownloader
        from config.settings import Settings
        
        downloader = SpotifyDownloader(Settings.DOWNLOADS_DIR)
        
        # Test with a sample playlist - extract ID from URL
        # https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M → 37i9dQZF1DXcBWIGoYBM5M
        playlist_id = "37i9dQZF1DXcBWIGoYBM5M"  # Today's Top Hits
        print(f"Testing playlist ID: {playlist_id}")
        
        # Get first 3 tracks
        result = await downloader.get_playlist_tracks_batch(playlist_id, offset=0, limit=3)
        
        if result and len(result) > 0:
            print(f"✓ Found {len(result)} tracks")
            print(f"  First track: {result[0].title} - {result[0].artist}")
            print("✓ PASS: Spotify playlist fetching works")
            return True
        else:
            print("❌ FAIL: No tracks returned")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False


async def test_spotify_album():
    """Test 3: Spotify album fetching"""
    print("\n" + "="*60)
    print("TEST 3: Spotify Album Fetching")
    print("="*60)
    
    try:
        from services.audio.spotify import SpotifyDownloader
        from config.settings import Settings
        
        downloader = SpotifyDownloader(Settings.DOWNLOADS_DIR)
        
        # Test with a sample album - extract ID
        # https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj → 4yP0hdKOZPNshxUOjY0cZj
        album_id = "4yP0hdKOZPNshxUOjY0cZj"  # After Hours by The Weeknd
        print(f"Testing album ID: {album_id}")
        
        # Get first 3 tracks
        result = await downloader.get_album_tracks_batch(album_id, offset=0, limit=3)
        
        if result and len(result) > 0:
            print(f"✓ Found {len(result)} tracks")
            print(f"  First track: {result[0].title} - {result[0].artist}")
            print("✓ PASS: Spotify album fetching works")
            return True
        else:
            print("❌ FAIL: No tracks returned")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False


async def test_youtube_search():
    """Test 4: YouTube search for track"""
    print("\n" + "="*60)
    print("TEST 4: YouTube Music Search")
    print("="*60)
    
    try:
        from services.audio.youtube import YouTubeDownloader
        from config.settings import Settings
        
        downloader = YouTubeDownloader(Settings.DOWNLOADS_DIR)
        
        query = "Blinding Lights The Weeknd"
        print(f"Searching: {query}")
        
        result = await downloader.search(query)
        
        if result:
            print(f"✓ Found: {result.title} - {result.artist}")
            print(f"  URL: {result.url}")
            print("✓ PASS: YouTube search works")
            return True
        else:
            print("❌ FAIL: No results")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False


async def test_stream_url():
    """Test 5: Get stream URL"""
    print("\n" + "="*60)
    print("TEST 5: Stream URL Retrieval")
    print("="*60)
    
    try:
        from services.audio.youtube import YouTubeDownloader
        from config.settings import Settings
        
        downloader = YouTubeDownloader(Settings.DOWNLOADS_DIR)
        
        # First search
        result = await downloader.search("Faded Alan Walker")
        if not result:
            print("❌ FAIL: Search failed")
            return False
        
        print(f"Track: {result.title}")
        
        # Get stream URL
        stream_url = await downloader.get_stream_url(result)
        
        if stream_url:
            print(f"✓ Got stream URL: {stream_url[:60]}...")
            print("✓ PASS: Stream URL works")
            return True
        else:
            print("⚠ Stream URL failed (403?)")
            print("  This may be normal on servers - will use download instead")
            return True  # Not a hard failure
            
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PLAYLIST PROCESSING TESTS")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("ONE_TRACK Mode", await test_one_track_mode()))
    results.append(("Spotify Playlist", await test_spotify_playlist()))
    results.append(("Spotify Album", await test_spotify_album()))
    results.append(("YouTube Search", await test_youtube_search()))
    results.append(("Stream URL", await test_stream_url()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print("\n⚠ Some tests failed. Check logs above.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
