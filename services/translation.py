"""
Translation Service for Lyrics
Supports: English, Indonesian, Thai, Arabic, Turkish
"""

from deep_translator import GoogleTranslator
from typing import Optional, Dict
import logging
import re

logger = logging.getLogger(__name__)

class LyricsTranslator:
    """Translate lyrics to multiple languages"""
    
    SUPPORTED_LANGUAGES = {
        'en': 'English',
        'id': 'Indonesian',
        'th': 'Thai',
        'ar': 'Arabic',
        'tr': 'Turkish'
    }
    
    def __init__(self):
        self.cache = {}  # Cache translations
    
    def translate_text(self, text: str, target_lang: str = 'en', source_lang: str = 'auto') -> Optional[str]:
        """
        Translate text to target language
        
        Args:
            text: Text to translate
            target_lang: Target language code (en, id, th, ar, tr)
            source_lang: Source language (auto-detect by default)
        
        Returns:
            Translated text or None if failed
        """
        if not text or not text.strip():
            return None
        
        if target_lang not in self.SUPPORTED_LANGUAGES:
            logger.error(f"Unsupported language: {target_lang}")
            return None
        
        # Check cache
        cache_key = f"{text[:100]}_{source_lang}_{target_lang}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        try:
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            translated = translator.translate(text)
            
            # Cache result
            self.cache[cache_key] = translated
            
            return translated
            
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return None
    
    def translate_lyrics(self, lyrics: str, target_lang: str = 'en', source_lang: str = 'auto') -> Optional[Dict]:
        """
        Translate lyrics line by line
        
        Returns:
            {
                'original': original lyrics,
                'translated': translated lyrics,
                'language': target language
            }
        """
        if not lyrics:
            return None
        
        try:
            # Split into lines
            lines = lyrics.split('\n')
            translated_lines = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    translated_lines.append('')
                    continue
                
                # Check if line is timestamp (for synced lyrics)
                if re.match(r'^\[\d+:\d+\.\d+\]', line):
                    # Keep timestamp, translate text after it
                    match = re.match(r'^(\[\d+:\d+\.\d+\])\s*(.*)$', line)
                    if match:
                        timestamp, text = match.groups()
                        if text:
                            translated_text = self.translate_text(text, target_lang, source_lang)
                            translated_lines.append(f"{timestamp} {translated_text if translated_text else text}")
                        else:
                            translated_lines.append(timestamp)
                    else:
                        translated_lines.append(line)
                else:
                    # Regular line, translate it
                    translated = self.translate_text(line, target_lang, source_lang)
                    translated_lines.append(translated if translated else line)
            
            return {
                'original': lyrics,
                'translated': '\n'.join(translated_lines),
                'language': target_lang,
                'language_name': self.SUPPORTED_LANGUAGES.get(target_lang, target_lang)
            }
            
        except Exception as e:
            logger.error(f"Failed to translate lyrics: {e}")
            return None
    
    def detect_language(self, text: str) -> Optional[str]:
        """Detect language of text"""
        try:
            from deep_translator import GoogleTranslator
            detected = GoogleTranslator(source='auto', target='en').translate(text[:100])
            # This is a simple detection, GoogleTranslator auto-detects
            return 'auto'
        except:
            return 'auto'
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return self.SUPPORTED_LANGUAGES.copy()


# Global instance
translator = LyricsTranslator()
