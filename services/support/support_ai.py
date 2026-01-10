"""
Support AI Handler using Google Gemini

AI-powered customer support chatbot for SONORA Discord bot.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from enum import Enum
import os

logger = logging.getLogger('discord_music_bot.support.ai')


class UserIntent(Enum):
    """Detected user intents from messages"""
    QUESTION = "question"           # General question about SONORA
    FEEDBACK = "feedback"           # Suggestions, feature requests
    ISSUE = "issue"                 # Bug report, technical issue
    LIVE_SUPPORT = "live_support"   # Request to talk to human
    GREETING = "greeting"           # Hello, hi, etc
    THANKS = "thanks"               # Thank you messages
    UNKNOWN = "unknown"             # Can't determine


class SupportAI:
    """AI handler for customer support using Google Gemini"""
    
    SYSTEM_PROMPT = """You are SONORA's AI customer support assistant. SONORA is a premium Discord music bot.

Your personality:
- Friendly, helpful, and professional
- You speak naturally, not robotic
- Keep responses concise but informative
- Use minimal emotes (only when appropriate)

SONORA Complete Feature List:

🎵 MUSIC PLAYBACK COMMANDS:
- /play [query] - Play music from YouTube, YouTube Music, Spotify, Apple Music, Deezer
- /pause - Pause current track
- /resume - Resume playback
- /skip - Skip to next track in queue
- /stop - Stop playback and disconnect from voice
- /nowplaying - Show current track info with artwork
- /seek [time] - Jump to specific time (e.g., /seek 1:30)
- /previous - Play previous track

📋 QUEUE & LOOP COMMANDS:
- /queue - View current queue with interactive controls
- /shuffle - Shuffle the queue randomly
- /clear - Clear entire queue
- /move [from] [to] - Move track position in queue
- /loop track - Repeat current track continuously
- /loop queue - Repeat entire queue after all tracks finish
- /loop off - Disable loop mode
Loop uses cached audio for bandwidth savings!

🔊 AUDIO SETTINGS:
- /volume [0-200] - Adjust volume (100 = normal, 200 = 2x boost)
- /equalizer - Open equalizer presets menu
  Presets: Bass Boost, Treble, Vocal Boost, Electronic, Rock, Pop, Classical, Nightcore, Vaporwave

🎤 LYRICS FEATURES:
- Apple Music-style synced lyrics with word-by-word karaoke highlighting
- Fullscreen lyrics mode with beautiful animations
- Support for Korean, Japanese, Chinese with romanization (pinyin, romaji)
- Multiple sources: Apple Music, QQ Music/Lyricify, LRCLIB, Musixmatch
- Smart lyrics caching for instant display

📊 STATISTICS & HISTORY:
- /stats - Your personal listening statistics
- /history - View play history
- Seekback - Annual music recap (like Spotify Wrapped)

ℹ️ INFO & SUPPORT:
- /help [command] - Show help guide, or ask AI about specific command
- /website - View website features
- /donate - Support the developer
- /support - Get AI assistance or contact developer

🌐 SONORA WEBSITE FEATURES (sonora.muhammadzakizn.com):

📱 Main Pages:
- Home - Landing page with feature showcase
- Now Playing - Real-time display of current track
- Queue - Interactive queue management
- Lyrics - Fullscreen synced lyrics viewer
- Stats/Seekback - Personal listening statistics and annual recap
- Changelog - Version history and updates
- Docs - Full documentation and guides
- Support - Contact form and FAQ

🔒 Security & Privacy:
- Discord OAuth2 authentication (secure login)
- No password stored - only Discord tokens
- HTTPS encryption on all connections
- No tracking or third-party analytics
- Audio streams are not stored - only cached locally
- Privacy-focused: no personal data sold or shared

⚙️ Settings & Features:
- Dark/Light theme toggle
- Multi-language support (ID/EN)
- Responsive design (mobile, tablet, desktop)
- PWA installable (add to home screen)
- Real-time updates via WebSocket
- Offline support for cached content

🎛️ Dashboard Features:
- Control playback from browser
- View and manage queue
- See lyrics with karaoke mode
- Volume and equalizer controls
- Multi-server support

Your capabilities:
1. Answer questions about SONORA features (USE THE LISTS ABOVE!)
2. Explain how any command works
3. Guide users on website features and navigation
4. Detect when user wants to give feedback/saran (ask them to fill form)
5. Detect when user has technical issue/bug/error (ask them to fill issue report)
6. Detect when user needs human support (offer to connect with developer)

Intent detection rules:
- If user mentions "bug", "error", "not working", "broken", "problem", "masalah", "rusak" → ISSUE
- If user mentions "suggestion", "wish", "would be nice", "saran", "harap", "tambahkan fitur" → FEEDBACK
- If user asks "what features", "fitur apa", "bisa apa", "commands" → QUESTION (answer with feature list!)
- If user asks about "website", "web", "dashboard", "halaman" → QUESTION (explain web features)
- If user asks about "security", "keamanan", "privacy", "privasi" → QUESTION (explain security)
- If user asks to "talk to human", "developer", "CS" → LIVE_SUPPORT

IMPORTANT: 
- When user asks about features, ANSWER WITH THE FEATURE LIST ABOVE.
- When user asks about a specific command, explain it in detail with examples.
- When user asks about website, explain relevant pages and features.
- You are ONLY for support. If asked to play music, explain this DM is for support only.
- Respond in the same language the user uses (Indonesian/English)."""


    def __init__(self):
        # Support multiple AI providers (priority order)
        self.groq_key = os.getenv('GROQ_API_KEY', '')  # FREE! 14,400 requests/day
        self.deepseek_key = os.getenv('DEEPSEEK_API_KEY', '')
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        
        self._client = None
        self._model = None
        self._provider = None  # 'groq', 'deepseek', 'gemini', or None
        self._initialized = False
        
    async def _ensure_initialized(self) -> bool:
        """Initialize AI client - tries Groq first (FREE), then DeepSeek, then Gemini"""
        if self._initialized:
            return True
        
        # Provider 1: Groq (FREE - 14,400 requests/day!)
        if self.groq_key:
            try:
                from openai import OpenAI
                
                self._client = OpenAI(
                    api_key=self.groq_key,
                    base_url="https://api.groq.com/openai/v1"
                )
                # Use llama model - fast and free!
                self._model = 'llama-3.3-70b-versatile'
                self._provider = 'groq'
                self._initialized = True
                logger.info(f"AI Support initialized with Groq FREE (model: {self._model})")
                return True
                
            except ImportError:
                logger.warning("openai package not installed. Run: pip install openai")
            except Exception as e:
                logger.warning(f"Groq init failed: {e}")
        
        # Provider 2: DeepSeek (uses OpenAI SDK)
        if self.deepseek_key:
            try:
                from openai import OpenAI
                
                self._client = OpenAI(
                    api_key=self.deepseek_key,
                    base_url="https://api.deepseek.com"
                )
                self._model = 'deepseek-chat'
                self._provider = 'deepseek'
                self._initialized = True
                logger.info(f"AI Support initialized with DeepSeek (model: {self._model})")
                return True
                
            except ImportError:
                logger.warning("openai package not installed. Run: pip install openai")
            except Exception as e:
                logger.warning(f"DeepSeek init failed: {e}")
        
        # Provider 3: Gemini (google-genai)
        if self.gemini_key:
            try:
                from google import genai
                
                self._client = genai.Client(api_key=self.gemini_key)
                self._model = 'gemini-2.0-flash'
                self._provider = 'gemini'
                self._initialized = True
                logger.info(f"AI Support initialized with Gemini (model: {self._model})")
                return True
                
            except ImportError:
                logger.debug("google-genai not installed")
            except Exception as e:
                logger.warning(f"Gemini init failed: {e}")
        
        # No API keys configured
        if not self.groq_key and not self.deepseek_key and not self.gemini_key:
            logger.warning("No AI API key configured. Set GROQ_API_KEY, DEEPSEEK_API_KEY, or GEMINI_API_KEY")
        else:
            logger.error("All AI providers failed to initialize")
        
        return False
    
    async def detect_intent(self, message: str) -> UserIntent:
        """
        Detect user intent from message.
        Uses keyword matching first, then AI if unclear.
        """
        msg_lower = message.lower()
        
        # Check for ISSUE keywords FIRST (higher priority than questions)
        issue_keywords = ['bug', 'error', 'not working', 'broken', 'problem', 'crash', 
                         'fix', 'issue', 'masalah', 'rusak', 'tidak bisa', 'gagal', 'hang',
                         'report', 'lapor', 'laporkan', 'komplain', 'complaint']
        for kw in issue_keywords:
            if kw in msg_lower:
                return UserIntent.ISSUE
        
        # Check for feature QUESTIONS (these should go to AI)
        question_patterns = [
            'apa saja', 'apa aja', 'fitur apa', 'fiturnya apa', 'bisa apa', 
            'what can', 'what features', 'commands apa', 'command apa',
            'gimana cara', 'how to', 'cara pakai', 'how do i', 'bagaimana',
            'apa itu', 'what is'
        ]
        for pattern in question_patterns:
            if pattern in msg_lower:
                return UserIntent.QUESTION
        
        # Feedback keywords (specific phrases that indicate wanting to suggest)
        feedback_keywords = ['saran saya', 'suggestion', 'i wish', 'would be nice', 
                            'tolong tambah', 'please add', 'bisa ditambah', 'feedback',
                            'mau kasih saran', 'mau usul']
        for kw in feedback_keywords:
            if kw in msg_lower:
                return UserIntent.FEEDBACK
        
        # Live support keywords
        live_keywords = ['human', 'real person', 'customer service', 'developer', 
                        'dev', 'manusia', 'orang asli', 'mau bicara']
        for kw in live_keywords:
            if kw in msg_lower:
                return UserIntent.LIVE_SUPPORT
        
        # Greeting keywords (must be exact or close)
        greeting_keywords = ['hi', 'hello', 'hey', 'halo', 'hai', 'helo']
        for kw in greeting_keywords:
            if msg_lower.strip() in [kw, f'{kw}!', f'{kw}.', f'{kw} sonora']:
                return UserIntent.GREETING
        
        # Thanks keywords
        thanks_keywords = ['thank', 'thanks', 'terima kasih', 'makasih', 'thx']
        for kw in thanks_keywords:
            if kw in msg_lower:
                return UserIntent.THANKS
        
        # Default to question for anything else (let AI handle it)
        return UserIntent.QUESTION
    
    async def generate_response(
        self, 
        message: str, 
        user_name: str,
        conversation_history: list = None
    ) -> Tuple[str, UserIntent]:
        """
        Generate AI response for user message.
        
        Returns:
            Tuple of (response text, detected intent)
        """
        intent = await self.detect_intent(message)
        
        # Handle special intents with predefined responses
        if intent == UserIntent.GREETING:
            return (
                f"Hai {user_name}! Aku SONORA AI Assistant. Ada yang bisa aku bantu?\n\n"
                "Kamu bisa:\n"
                "• Tanya tentang fitur SONORA\n"
                "• Beri saran/feedback\n"
                "• Laporkan masalah\n"
                "• Hubungi developer",
                intent
            )
        
        if intent == UserIntent.THANKS:
            return (
                "Sama-sama! Jika ada pertanyaan lain, jangan ragu untuk bertanya.",
                intent
            )
        
        if intent == UserIntent.FEEDBACK:
            return (
                "Terima kasih ingin memberi feedback! Untuk mencatat saran/kritik kamu dengan baik, "
                "silakan isi form feedback dengan klik tombol di bawah.",
                intent
            )
        
        if intent == UserIntent.ISSUE:
            return (
                "Maaf mendengar ada masalah. Untuk membantu menyelesaikan ini, "
                "silakan isi form laporan masalah dengan detail. Klik tombol di bawah.",
                intent
            )
        
        if intent == UserIntent.LIVE_SUPPORT:
            return (
                "Tentu, aku bisa menghubungkan kamu dengan developer SONORA. "
                "Silakan isi form di bawah untuk membuka tiket support.",
                intent
            )
        
        # For questions, use AI
        if not await self._ensure_initialized():
            return (
                "Maaf, AI sedang tidak tersedia. Silakan hubungi developer langsung.",
                intent
            )
        
        try:
            # Send system prompt + user message
            prompt = f"{self.SYSTEM_PROMPT}\n\nUser ({user_name}): {message}\n\nRespond briefly and helpfully:"
            
            if self._provider in ('groq', 'deepseek'):
                # Groq and DeepSeek use OpenAI SDK
                response = await asyncio.to_thread(
                    lambda: self._client.chat.completions.create(
                        model=self._model,
                        messages=[
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user", "content": message}
                        ],
                        max_tokens=500
                    )
                )
                return (response.choices[0].message.content.strip(), intent)
                
            elif self._provider == 'gemini':
                # Gemini uses google-genai
                response = await asyncio.to_thread(
                    lambda: self._client.models.generate_content(
                        model=self._model,
                        contents=prompt
                    )
                )
                return (response.text.strip(), intent)
            
            else:
                return ("AI provider tidak dikenali.", UserIntent.UNKNOWN)
            
        except Exception as e:
            logger.error(f"AI API error ({self._provider}): {e}")
            return (
                "Maaf, terjadi kesalahan. Coba lagi nanti atau hubungi developer.",
                UserIntent.UNKNOWN
            )
    
    async def is_available(self) -> bool:
        """Check if AI is available"""
        return await self._ensure_initialized()


# Singleton instance
_ai_instance: Optional[SupportAI] = None


def get_support_ai() -> SupportAI:
    """Get or create support AI instance"""
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = SupportAI()
    return _ai_instance
