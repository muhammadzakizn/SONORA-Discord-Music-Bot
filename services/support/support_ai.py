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

🎵 MUSIC PLAYBACK:
- /play [query] - Play music from YouTube, YouTube Music, Spotify, SoundCloud
- /pause - Pause current track
- /resume - Resume playback
- /skip - Skip to next track
- /stop - Stop and clear queue
- /queue - View current queue
- /nowplaying - Show current track info
- /seek [time] - Jump to specific time
- /volume [1-100] - Adjust volume
- /loop [off/track/queue] - Loop settings
- /shuffle - Shuffle the queue
- /remove [position] - Remove track from queue
- /clear - Clear entire queue
- /previous - Play previous track

🎤 LYRICS:
- Apple Music-style synced lyrics
- Word-by-word karaoke highlighting
- Support for Korean, Japanese, Chinese with romanization
- Multiple sources: Apple Music, QQ Music, Musixmatch

🎛️ AUDIO EFFECTS:
- /equalizer - Preset equalizers (Bass Boost, Treble, etc.)
- /bassboost - Enhanced bass
- /nightcore - Nightcore effect
- /vaporwave - Slowed + reverb

📊 STATISTICS:
- /stats - Your listening statistics
- /history - Play history
- Seekback/Recap - Annual music summary

🌐 WEB DASHBOARD:
- Full control via sonora.muhammadzakizn.com
- Real-time Now Playing display
- Queue management
- Lyrics with karaoke mode
- Light/Dark theme

📱 PWA SUPPORT:
- Installable as mobile app
- Offline support
- Push notifications

Your capabilities:
1. Answer questions about SONORA features (USE THE LIST ABOVE!)
2. Detect when user wants to give feedback/saran (ask them to fill form)
3. Detect when user has technical issue/bug/error (ask them to fill issue report)
4. Detect when user needs human support (offer to connect with developer)

Intent detection rules:
- If user mentions "bug", "error", "not working", "broken", "problem", "masalah", "rusak" → ISSUE
- If user mentions "suggestion", "wish", "would be nice", "saran", "harap", "tambahkan fitur" → FEEDBACK
- If user asks "what features", "fitur apa", "bisa apa", "commands" → QUESTION (answer with feature list!)
- If user asks to "talk to human", "developer", "CS" → LIVE_SUPPORT

IMPORTANT: 
- When user asks about features, ANSWER WITH THE FEATURE LIST ABOVE.
- You are ONLY for support. If asked to play music, explain this DM is for support only.
- Respond in the same language the user uses (Indonesian/English)."""

    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY', '')
        self._model = None
        self._client = None
        self._initialized = False
        
    async def _ensure_initialized(self) -> bool:
        """Initialize Gemini client if not already done"""
        if self._initialized:
            return True
            
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set, AI support disabled")
            return False
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            
            # Try different model names (API versions vary)
            model_names = [
                'gemini-2.0-flash',      # Latest 2026
                'gemini-1.5-flash',      # Previous version
                'gemini-pro',            # Fallback
                'models/gemini-2.0-flash-001',  # With prefix
                'models/gemini-1.5-flash-latest',
            ]
            
            for model_name in model_names:
                try:
                    self._model = genai.GenerativeModel(model_name)
                    # Test if model works
                    test_response = self._model.generate_content("Hi", generation_config={"max_output_tokens": 5})
                    self._initialized = True
                    logger.info(f"Gemini AI initialized for support (model: {model_name})")
                    return True
                except Exception as model_error:
                    logger.debug(f"Model {model_name} not available: {model_error}")
                    continue
            
            logger.error("No Gemini model available")
            return False
        except ImportError:
            logger.error("google-generativeai not installed. Run: pip install google-generativeai")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            return False
    
    async def detect_intent(self, message: str) -> UserIntent:
        """
        Detect user intent from message.
        Uses keyword matching first, then AI if unclear.
        """
        msg_lower = message.lower()
        
        # Check for feature QUESTIONS first (these should go to AI, not feedback form)
        question_patterns = [
            'apa saja', 'apa aja', 'fitur apa', 'fiturnya apa', 'bisa apa', 
            'what can', 'what features', 'commands apa', 'command apa',
            'gimana cara', 'how to', 'cara pakai', 'how do i', 'bagaimana',
            'apa itu', 'what is'
        ]
        for pattern in question_patterns:
            if pattern in msg_lower:
                return UserIntent.QUESTION
        
        # Quick keyword detection for issues (should be first)
        issue_keywords = ['bug', 'error', 'not working', 'broken', 'problem', 'crash', 
                         'fix', 'issue', 'masalah', 'rusak', 'tidak bisa', 'gagal', 'hang']
        for kw in issue_keywords:
            if kw in msg_lower:
                return UserIntent.ISSUE
        
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
        
        # For questions, use Gemini AI
        if not await self._ensure_initialized():
            return (
                "Maaf, AI sedang tidak tersedia. Silakan hubungi developer langsung.",
                intent
            )
        
        try:
            # Build conversation
            chat = self._model.start_chat(history=[])
            
            # Send system prompt + user message
            prompt = f"{self.SYSTEM_PROMPT}\n\nUser ({user_name}): {message}\n\nRespond briefly and helpfully:"
            
            # Generate response
            response = await asyncio.to_thread(
                lambda: chat.send_message(prompt)
            )
            
            return (response.text.strip(), intent)
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
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
