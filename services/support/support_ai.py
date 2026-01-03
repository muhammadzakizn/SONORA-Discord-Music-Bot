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
- Keep responses concise (2-3 sentences max)
- Use minimal emotes (only when appropriate)

Key information about SONORA:
- High-quality music playback from YouTube Music, Spotify
- Apple Music-style lyrics display
- Cloud caching for faster playback
- Equalizer and audio effects
- Dashboard at sonora.muhammadzakizn.com

Your capabilities:
1. Answer questions about SONORA features
2. Detect when user wants to give feedback (ask them to fill form)
3. Detect when user has technical issue (ask them to fill issue report)
4. Detect when user needs human support (offer to connect with developer)

Intent detection rules:
- If user mentions "bug", "error", "not working", "broken", "problem" → ISSUE
- If user mentions "suggestion", "feature", "wish", "would be nice", "feedback" → FEEDBACK
- If user asks to "talk to human", "real person", "customer service", "CS" → LIVE_SUPPORT
- If user asks about features, how to use, pricing → QUESTION
- If user says "hi", "hello", "hey" → GREETING

IMPORTANT: You are ONLY for support. If asked to play music or do bot commands, politely explain that this DM is for support only.

Respond in the same language the user uses. If Indonesian, respond in Indonesian. If English, respond in English."""

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
            self._model = genai.GenerativeModel('gemini-1.5-flash')
            self._initialized = True
            logger.info("Gemini AI initialized for support")
            return True
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
        
        # Quick keyword detection
        issue_keywords = ['bug', 'error', 'not working', 'broken', 'problem', 'crash', 'fix', 'issue', 'masalah', 'rusak', 'tidak bisa', 'gagal']
        feedback_keywords = ['suggestion', 'feature', 'wish', 'would be nice', 'feedback', 'saran', 'fitur', 'harap', 'tambah']
        live_keywords = ['human', 'real person', 'customer service', 'cs', 'support', 'developer', 'dev', 'manusia', 'orang asli']
        greeting_keywords = ['hi', 'hello', 'hey', 'halo', 'hai', 'helo']
        thanks_keywords = ['thank', 'thanks', 'terima kasih', 'makasih', 'thx']
        
        for kw in issue_keywords:
            if kw in msg_lower:
                return UserIntent.ISSUE
        
        for kw in feedback_keywords:
            if kw in msg_lower:
                return UserIntent.FEEDBACK
        
        for kw in live_keywords:
            if kw in msg_lower:
                return UserIntent.LIVE_SUPPORT
        
        for kw in greeting_keywords:
            if msg_lower.strip() in [kw, f'{kw}!', f'{kw}.']:
                return UserIntent.GREETING
        
        for kw in thanks_keywords:
            if kw in msg_lower:
                return UserIntent.THANKS
        
        # Default to question for anything else
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
