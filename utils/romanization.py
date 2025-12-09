"""
Romanization utilities for non-latin scripts
Supports: Japanese, Korean, Chinese, Cyrillic, Arabic, etc.
"""

import re
from typing import Optional
from config.logging_config import get_logger

logger = get_logger('utils.romanization')


class RomanizationHelper:
    """Helper class for romanizing non-latin scripts"""
    
    def __init__(self):
        """Initialize romanization helper"""
        self.kakasi = None  # Japanese
        self.pinyin = None  # Chinese
        
        # Try to import libraries
        self._init_japanese()
        self._init_chinese()
    
    def _init_japanese(self):
        """Initialize Japanese romanization"""
        try:
            from pykakasi import kakasi
            self.kakasi = kakasi()
            logger.info("Japanese romanization (pykakasi) initialized")
        except ImportError:
            logger.warning("pykakasi not available - Japanese romanization disabled")
    
    def _init_chinese(self):
        """Initialize Chinese romanization"""
        try:
            from pypinyin import lazy_pinyin, Style
            self.pinyin = lazy_pinyin
            self.pinyin_style = Style.NORMAL
            logger.info("Chinese romanization (pypinyin) initialized")
        except ImportError:
            logger.debug("pypinyin not available - Chinese romanization disabled")
    
    def detect_script(self, text: str) -> str:
        """
        Detect script type of text
        
        Args:
            text: Text to detect
        
        Returns:
            Script type: 'japanese', 'chinese', 'korean', 'cyrillic', 'arabic', 'thai', 'latin', 'mixed'
        """
        if not text:
            return 'latin'
        
        # Unicode ranges
        has_hiragana = bool(re.search(r'[\u3040-\u309F]', text))
        has_katakana = bool(re.search(r'[\u30A0-\u30FF]', text))
        has_kanji = bool(re.search(r'[\u4E00-\u9FFF]', text))
        has_hangul = bool(re.search(r'[\uAC00-\uD7AF]', text))
        has_cyrillic = bool(re.search(r'[\u0400-\u04FF]', text))
        has_arabic = bool(re.search(r'[\u0600-\u06FF]', text))
        has_thai = bool(re.search(r'[\u0E00-\u0E7F]', text))
        
        # Detect Japanese (hiragana or katakana present = definitely Japanese)
        if has_hiragana or has_katakana:
            return 'japanese'
        
        # Detect Korean
        if has_hangul:
            return 'korean'
        
        # Detect Cyrillic
        if has_cyrillic:
            return 'cyrillic'
        
        # Detect Arabic
        if has_arabic:
            return 'arabic'
        
        # Detect Thai
        if has_thai:
            return 'thai'
        
        # Kanji only - ambiguous, but default to Japanese for better romanization
        # (pykakasi handles Japanese kanji better than pypinyin)
        if has_kanji:
            return 'japanese'  # Default to Japanese for kanji-only text
        
        # Check if latin
        has_latin = bool(re.search(r'[A-Za-z]', text))
        if has_latin:
            return 'latin'
        
        return 'mixed'
    
    def romanize_japanese(self, text: str) -> Optional[str]:
        """
        Romanize Japanese text to romaji
        
        Args:
            text: Japanese text
        
        Returns:
            Romanized text or None if failed
        """
        if not self.kakasi:
            return None
        
        try:
            result = self.kakasi.convert(text)
            romanized = ' '.join([item['hepburn'] for item in result])
            return romanized
        except Exception as e:
            logger.error(f"Japanese romanization failed: {e}")
            return None
    
    def romanize_chinese(self, text: str) -> Optional[str]:
        """
        Romanize Chinese text to pinyin
        
        Args:
            text: Chinese text
        
        Returns:
            Pinyin or None if failed
        """
        if not self.pinyin:
            return None
        
        try:
            pinyin_list = self.pinyin(text, style=self.pinyin_style)
            return ' '.join(pinyin_list)
        except Exception as e:
            logger.error(f"Chinese romanization failed: {e}")
            return None
    
    def romanize_korean(self, text: str) -> Optional[str]:
        """
        Romanize Korean text to romanization (Revised Romanization)
        
        Args:
            text: Korean text
        
        Returns:
            Romanized text or None if failed
        """
        # Method 1: Try korean-romanizer (best quality)
        try:
            from korean_romanizer.romanizer import Romanizer
            romanizer = Romanizer(text)
            romanized = romanizer.romanize()
            if romanized and romanized != text:
                return romanized
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"korean-romanizer failed: {e}")
        
        # Method 2: Try hangul-romanize
        try:
            from hangul_romanize import Transliter
            from hangul_romanize.rule import academic
            transliter = Transliter(academic)
            romanized = transliter.translit(text)
            if romanized and romanized != text:
                return romanized
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"hangul-romanize failed: {e}")
        
        # Method 3: Manual Hangul romanization (fallback)
        try:
            romanized = self._manual_hangul_romanization(text)
            if romanized and romanized != text:
                return romanized
        except Exception as e:
            logger.debug(f"Manual romanization failed: {e}")
        
        logger.debug("Korean romanization not available (install korean-romanizer)")
        return None
    
    def _manual_hangul_romanization(self, text: str) -> Optional[str]:
        """
        Manual Hangul to Latin romanization (basic implementation)
        Based on Revised Romanization of Korean
        
        Args:
            text: Korean text
        
        Returns:
            Romanized text or None if failed
        """
        # Hangul syllable structure: Initial + Medial + Final
        # Unicode: 0xAC00 (가) to 0xD7A3 (힣)
        
        # Initial consonants (초성)
        initials = [
            'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp',
            's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
        ]
        
        # Medial vowels (중성)
        medials = [
            'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
            'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
        ]
        
        # Final consonants (종성)
        finals = [
            '', 'k', 'k', 'k', 'n', 'n', 'n', 'l', 'l', 'l',
            'l', 'l', 'l', 'l', 'm', 'p', 'p', 'k', 's', 'ss',
            'ng', 'j', 'ch', 'k', 't', 'p', 'h'
        ]
        
        result = []
        
        for char in text:
            code = ord(char)
            
            # Check if it's a Hangul syllable
            if 0xAC00 <= code <= 0xD7A3:
                # Decompose syllable
                code -= 0xAC00
                initial_idx = code // (21 * 28)
                medial_idx = (code % (21 * 28)) // 28
                final_idx = code % 28
                
                # Romanize
                romanized = initials[initial_idx] + medials[medial_idx] + finals[final_idx]
                result.append(romanized)
            else:
                # Keep non-Hangul characters as-is
                result.append(char)
        
        return ''.join(result)
    
    def romanize_cyrillic(self, text: str) -> Optional[str]:
        """
        Romanize Cyrillic text (Russian, etc.)
        
        Args:
            text: Cyrillic text
        
        Returns:
            Romanized text or None if failed
        """
        # Simple Cyrillic to Latin mapping
        cyrillic_map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
            'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
            'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
            'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
            'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '',
            'э': 'e', 'ю': 'yu', 'я': 'ya',
            # Uppercase
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
            'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
            'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
            'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
            'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch',
            'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
            'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        }
        
        result = []
        for char in text:
            if char in cyrillic_map:
                result.append(cyrillic_map[char])
            else:
                result.append(char)
        
        romanized = ''.join(result)
        return romanized if romanized != text else None
    
    def romanize_text(self, text: str) -> Optional[str]:
        """
        Auto-detect and romanize text
        
        Args:
            text: Text in any script
        
        Returns:
            Romanized text or None if not needed/failed
        """
        if not text or not text.strip():
            return None
        
        # Detect script
        script = self.detect_script(text)
        
        # If already latin, no need to romanize
        if script == 'latin':
            return None
        
        # Romanize based on script
        if script == 'japanese':
            romanized = self.romanize_japanese(text)
            # Fallback to Chinese if Japanese fails and text is kanji-only
            if not romanized and re.search(r'[\u4E00-\u9FFF]', text):
                romanized = self.romanize_chinese(text)
            return romanized
        elif script == 'chinese':
            return self.romanize_chinese(text)
        elif script == 'korean':
            return self.romanize_korean(text)
        elif script == 'cyrillic':
            return self.romanize_cyrillic(text)
        else:
            logger.debug(f"Romanization not supported for script: {script}")
            return None
    
    def needs_romanization(self, text: str) -> bool:
        """
        Check if text needs romanization
        
        Args:
            text: Text to check
        
        Returns:
            True if text contains non-latin characters
        """
        script = self.detect_script(text)
        return script != 'latin'


# Global instance
_romanization_helper = None

def get_romanization_helper() -> RomanizationHelper:
    """Get global romanization helper instance"""
    global _romanization_helper
    if _romanization_helper is None:
        _romanization_helper = RomanizationHelper()
    return _romanization_helper


def romanize_lyrics_line(text: str) -> Optional[str]:
    """
    Convenience function to romanize a lyrics line
    
    Args:
        text: Lyrics line text
    
    Returns:
        Romanized text or None if not needed
    """
    helper = get_romanization_helper()
    return helper.romanize_text(text)
