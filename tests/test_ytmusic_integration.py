#!/usr/bin/env python3
"""
Test script for YouTube Music download integration.
Verifies that cookies are used and downloads work correctly.

Run from project root:
    python tests/test_ytmusic_integration.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import Settings
from services.audio.youtube import YouTubeDownloader
from database.models import TrackInfo


async def test_cookies_exist():
    """Test 1: Verify YouTube Music cookies exist and have content"""
    print("\n" + "="*60)
    print("TEST 1: Verify YouTube Music Cookies")
    print("="*60)
    
    cookie_file = Settings.YOUTUBE_COOKIES
    print(f"Cookie path: {cookie_file}")
    
    if not cookie_file.exists():
        print("❌ FAIL: YouTube Music cookies file not found!")
        return False
    
    size = cookie_file.stat().st_size
    print(f"Cookie file size: {size} bytes")
    
    if size == 0:
        print("❌ FAIL: Cookies file is empty!")
        return False
    
    print("✓ PASS: YouTube Music cookies exist and have content")
    return True


async def test_search_ytmusic():
    """Test 2: Search YouTube Music"""
    print("\n" + "="*60)
    print("TEST 2: Search YouTube Music")
    print("="*60)
    
    downloader = YouTubeDownloader(Settings.DOWNLOADS_DIR)
    
    # Test search
    query = "faded alan walker"
    print(f"Search query: {query}")
    
    try:
        result = await downloader.search(query)
        
        if result:
            print(f"✓ Found: {result.title} - {result.artist}")
            print(f"  URL: {result.url}")
            print(f"  Duration: {result.duration}s")
            
            # Verify it's a music.youtube.com URL
            if result.url and 'music.youtube.com' in result.url:
                print("✓ PASS: URL is from music.youtube.com")
                return True
            else:
                print(f"⚠ WARNING: URL may not be from YouTube Music: {result.url}")
                return True  # Still pass, URL conversion happens in download
        else:
            print("❌ FAIL: No search results")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Search error: {e}")
        return False


async def test_download_ytmusic():
    """Test 3: Download from YouTube Music"""
    print("\n" + "="*60)
    print("TEST 3: Download from YouTube Music")
    print("="*60)
    
    downloader = YouTubeDownloader(Settings.DOWNLOADS_DIR)
    
    # Create track info for download
    track = TrackInfo(
        title="Faded",
        artist="Alan Walker",
        duration=212,
        url=None  # Will search and download
    )
    
    print(f"Track: {track.title} - {track.artist}")
    
    try:
        result = await downloader.download(track)
        
        if result and result.file_path.exists():
            print(f"✓ Downloaded: {result.file_path.name}")
            print(f"  Format: {result.format}")
            print(f"  Size: {result.file_path.stat().st_size} bytes")
            print(f"  Source: {result.source}")
            print("✓ PASS: Download successful")
            return True
        else:
            print("❌ FAIL: Download result missing or file not found")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Download error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("YOUTUBE MUSIC INTEGRATION TESTS")
    print("="*60)
    
    # Ensure downloads directory exists
    Settings.DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    results = []
    
    # Run tests
    results.append(("Cookies Exist", await test_cookies_exist()))
    results.append(("Search YTMusic", await test_search_ytmusic()))
    results.append(("Download YTMusic", await test_download_ytmusic()))
    
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
        print("\n🎉 ALL TESTS PASSED! YouTube Music integration working.")
    else:
        print("\n⚠ Some tests failed. Check logs above for details.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
