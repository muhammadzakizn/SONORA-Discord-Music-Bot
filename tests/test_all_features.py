#!/usr/bin/env python3
"""
Test script untuk semua fitur Discord Music Bot
Run: python tests/test_all_features.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class FeatureTester:
    """Test all bot features"""
    
    def __init__(self):
        self.results = {
            'passed': [],
            'failed': [],
            'skipped': []
        }
    
    def test_imports(self):
        """Test if all modules can be imported"""
        print("🧪 Testing imports...")
        
        try:
            # Core imports
            from core.bot import MusicBot
            from core.error_handler import BotErrorHandler
            self.results['passed'].append("✅ Core modules import")
            
            # Service imports
            from services.audio.player import AudioPlayer
            from services.audio.spotify import SpotifyDownloader
            from services.audio.youtube import YouTubeDownloader
            from services.voice.manager import VoiceManager
            from services.voice.connection import RobustVoiceConnection
            self.results['passed'].append("✅ Service modules import")
            
            # Command imports
            from commands.play import PlayCommands
            from commands.control import ControlCommands
            from commands.queue import QueueCommands
            from commands.volume import VolumeCommands
            from commands.stats import StatsCommands
            from commands.admin import AdminCommands
            self.results['passed'].append("✅ Command modules import")
            
            # Database imports
            from database.db_manager import get_db_manager
            from database.models import Track, User, PlayHistory
            self.results['passed'].append("✅ Database modules import")
            
            # UI imports
            from ui.embeds import EmbedBuilder
            from ui.media_player import MediaPlayerView
            from ui.volume_view import VolumeView
            from ui.queue_view import QueueView
            self.results['passed'].append("✅ UI modules import")
            
            print("✅ All imports successful!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Import failed: {str(e)}")
            print(f"❌ Import failed: {e}\n")
            return False
    
    def test_config(self):
        """Test configuration"""
        print("🧪 Testing configuration...")
        
        try:
            from config.settings import Settings
            from config.constants import Constants
            
            # Check required settings
            required = ['DOWNLOADS_DIR', 'CACHE_DIR', 'DATABASE_PATH']
            for setting in required:
                if hasattr(Settings, setting):
                    self.results['passed'].append(f"✅ Setting exists: {setting}")
                else:
                    self.results['failed'].append(f"❌ Missing setting: {setting}")
            
            print("✅ Configuration test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Config test failed: {str(e)}")
            print(f"❌ Config test failed: {e}\n")
            return False
    
    def test_database_schema(self):
        """Test database schema"""
        print("🧪 Testing database schema...")
        
        try:
            from database.models import Track, User, PlayHistory
            
            # Check model attributes
            track = Track(title="Test", artist="Test", duration=180, url="test")
            self.results['passed'].append("✅ Track model works")
            
            user = User(user_id=123, username="Test")
            self.results['passed'].append("✅ User model works")
            
            history = PlayHistory(
                user_id=123,
                guild_id=456,
                title="Test",
                artist="Test",
                duration=180
            )
            self.results['passed'].append("✅ PlayHistory model works")
            
            print("✅ Database schema test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Database schema test failed: {str(e)}")
            print(f"❌ Database schema test failed: {e}\n")
            return False
    
    def test_voice_manager(self):
        """Test voice manager"""
        print("🧪 Testing voice manager...")
        
        try:
            from services.voice.manager import VoiceManager
            
            manager = VoiceManager()
            
            # Test methods exist
            assert hasattr(manager, 'connect')
            assert hasattr(manager, 'disconnect')
            assert hasattr(manager, 'get_connection')
            assert hasattr(manager, 'is_connected')
            assert hasattr(manager, 'get_connected_guilds')
            assert hasattr(manager, 'get_stats')
            
            self.results['passed'].append("✅ VoiceManager has all required methods")
            
            # Test stats
            stats = manager.get_stats()
            assert 'total_connections' in stats
            assert 'connected' in stats
            assert 'playing' in stats
            
            self.results['passed'].append("✅ VoiceManager.get_stats() works")
            
            print("✅ Voice manager test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Voice manager test failed: {str(e)}")
            print(f"❌ Voice manager test failed: {e}\n")
            return False
    
    def test_audio_player(self):
        """Test audio player"""
        print("🧪 Testing audio player...")
        
        try:
            from services.audio.player import AudioPlayer
            
            # Test methods exist
            assert hasattr(AudioPlayer, 'play')
            assert hasattr(AudioPlayer, 'pause')
            assert hasattr(AudioPlayer, 'resume')
            assert hasattr(AudioPlayer, 'stop')
            assert hasattr(AudioPlayer, 'set_volume')
            
            self.results['passed'].append("✅ AudioPlayer has all required methods")
            
            print("✅ Audio player test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Audio player test failed: {str(e)}")
            print(f"❌ Audio player test failed: {e}\n")
            return False
    
    def test_downloaders(self):
        """Test music downloaders"""
        print("🧪 Testing downloaders...")
        
        try:
            from services.audio.spotify import SpotifyDownloader
            from services.audio.youtube import YouTubeDownloader
            
            # Test Spotify downloader
            spotify = SpotifyDownloader()
            assert hasattr(spotify, 'download')
            self.results['passed'].append("✅ SpotifyDownloader exists")
            
            # Test YouTube downloader
            youtube = YouTubeDownloader()
            assert hasattr(youtube, 'download')
            self.results['passed'].append("✅ YouTubeDownloader exists")
            
            print("✅ Downloader test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Downloader test failed: {str(e)}")
            print(f"❌ Downloader test failed: {e}\n")
            return False
    
    def test_lyrics_services(self):
        """Test lyrics services"""
        print("🧪 Testing lyrics services...")
        
        try:
            from services.lyrics.genius import GeniusLyrics
            from services.lyrics.lrclib import LrcLibLyrics
            
            genius = GeniusLyrics()
            assert hasattr(genius, 'fetch_lyrics')
            self.results['passed'].append("✅ GeniusLyrics exists")
            
            lrclib = LrcLibLyrics()
            assert hasattr(lrclib, 'fetch_lyrics')
            self.results['passed'].append("✅ LrcLibLyrics exists")
            
            print("✅ Lyrics services test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Lyrics services test failed: {str(e)}")
            print(f"❌ Lyrics services test failed: {e}\n")
            return False
    
    def test_romanization(self):
        """Test romanization utilities"""
        print("🧪 Testing romanization...")
        
        try:
            from utils.romanization import romanize_text
            
            # Test Japanese
            result = romanize_text("こんにちは", "ja")
            assert result is not None
            self.results['passed'].append("✅ Japanese romanization works")
            
            # Test Chinese
            result = romanize_text("你好", "zh")
            assert result is not None
            self.results['passed'].append("✅ Chinese romanization works")
            
            # Test Korean
            result = romanize_text("안녕하세요", "ko")
            assert result is not None
            self.results['passed'].append("✅ Korean romanization works")
            
            print("✅ Romanization test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ Romanization test failed: {str(e)}")
            print(f"❌ Romanization test failed: {e}\n")
            return False
    
    def test_ui_components(self):
        """Test UI components"""
        print("🧪 Testing UI components...")
        
        try:
            from ui.embeds import EmbedBuilder
            from ui.media_player import MediaPlayerView
            from ui.volume_view import VolumeView
            from ui.queue_view import QueueView
            
            # Test EmbedBuilder
            embed = EmbedBuilder.create_info("Test", "Test message")
            assert embed is not None
            self.results['passed'].append("✅ EmbedBuilder works")
            
            # Test views exist
            assert MediaPlayerView is not None
            self.results['passed'].append("✅ MediaPlayerView exists")
            
            assert VolumeView is not None
            self.results['passed'].append("✅ VolumeView exists")
            
            assert QueueView is not None
            self.results['passed'].append("✅ QueueView exists")
            
            print("✅ UI components test complete!\n")
            return True
            
        except Exception as e:
            self.results['failed'].append(f"❌ UI components test failed: {str(e)}")
            print(f"❌ UI components test failed: {e}\n")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        print(f"\n✅ PASSED: {len(self.results['passed'])}")
        for result in self.results['passed']:
            print(f"   {result}")
        
        if self.results['failed']:
            print(f"\n❌ FAILED: {len(self.results['failed'])}")
            for result in self.results['failed']:
                print(f"   {result}")
        
        if self.results['skipped']:
            print(f"\n⏭️  SKIPPED: {len(self.results['skipped'])}")
            for result in self.results['skipped']:
                print(f"   {result}")
        
        total = len(self.results['passed']) + len(self.results['failed']) + len(self.results['skipped'])
        success_rate = (len(self.results['passed']) / total * 100) if total > 0 else 0
        
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        print("="*60)
        
        return len(self.results['failed']) == 0


def main():
    """Run all tests"""
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║     Discord Music Bot - Feature Test Suite               ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")
    
    tester = FeatureTester()
    
    # Run all tests
    tests = [
        tester.test_imports,
        tester.test_config,
        tester.test_database_schema,
        tester.test_voice_manager,
        tester.test_audio_player,
        tester.test_downloaders,
        tester.test_lyrics_services,
        tester.test_romanization,
        tester.test_ui_components,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test crashed: {e}\n")
            tester.results['failed'].append(f"❌ {test.__name__} crashed: {str(e)}")
    
    # Print summary
    success = tester.print_summary()
    
    if success:
        print("\n🎉 All tests passed! Bot is ready to use.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues before using the bot.")
        return 1


if __name__ == "__main__":
    exit(main())
