"""
Deezer Cookie Utilities

Read Deezer ARL token from cookie file for Lavalink integration.
"""

import os
from pathlib import Path
from typing import Optional

from config.logging_config import get_logger
from config.settings import Settings

logger = get_logger('deezer_utils')


def get_deezer_arl() -> Optional[str]:
    """
    Get Deezer ARL token from cookie file or environment variable.
    
    Priority:
    1. Environment variable DEEZER_ARL (if set)
    2. Cookie file: cookies/deezer_cookies.txt
    
    Cookie file format (Netscape/Mozilla format):
    .deezer.com	TRUE	/	TRUE	0	arl	YOUR_ARL_TOKEN_HERE
    
    Or simple format (just the ARL value):
    arl=YOUR_ARL_TOKEN_HERE
    
    Returns:
        ARL token string or None if not found
    """
    # Check environment variable first
    env_arl = Settings.DEEZER_ARL
    if env_arl and env_arl != 'your_deezer_arl_token_here':
        logger.debug("Using Deezer ARL from environment variable")
        return env_arl
    
    # Try to read from cookie file
    cookie_file = Settings.COOKIES_DIR / 'deezer_cookies.txt'
    
    if not cookie_file.exists():
        logger.debug(f"Deezer cookie file not found: {cookie_file}")
        return None
    
    try:
        content = cookie_file.read_text(encoding='utf-8')
        
        # Try to extract ARL from different formats
        arl = _extract_arl_from_content(content)
        
        if arl:
            logger.info(f"✓ Loaded Deezer ARL from {cookie_file.name} ({len(arl)} chars)")
            return arl
        else:
            logger.warning(f"Could not find 'arl' in {cookie_file}")
            return None
            
    except Exception as e:
        logger.error(f"Error reading Deezer cookie file: {e}")
        return None


def _extract_arl_from_content(content: str) -> Optional[str]:
    """
    Extract ARL token from cookie file content.
    
    Supports:
    - Netscape cookie format
    - JSON format
    - Simple key=value format
    - Just the raw ARL value
    
    Args:
        content: Cookie file content
        
    Returns:
        ARL token or None
    """
    import re
    import json
    
    content = content.strip()
    
    # Format 1: Simple "arl=VALUE" or "arl: VALUE"
    match = re.search(r'arl[=:]\s*([a-zA-Z0-9]+)', content)
    if match:
        return match.group(1)
    
    # Format 2: Netscape format (tab-separated)
    # .deezer.com	TRUE	/	TRUE	0	arl	VALUE
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        parts = line.split('\t')
        if len(parts) >= 7 and parts[5] == 'arl':
            return parts[6]
    
    # Format 3: JSON format
    try:
        data = json.loads(content)
        if isinstance(data, list):
            for cookie in data:
                if cookie.get('name') == 'arl':
                    return cookie.get('value')
        elif isinstance(data, dict):
            if 'arl' in data:
                return data['arl']
    except json.JSONDecodeError:
        pass
    
    # Format 4: Raw ARL value (if content is just the token)
    # ARL tokens are typically 192 characters, alphanumeric
    if len(content) >= 100 and content.isalnum():
        return content
    
    return None


def update_lavalink_config(lavalink_dir: Path) -> bool:
    """
    Update Lavalink application.yml with Deezer ARL from cookie file.
    
    Call this before starting Lavalink server to inject the ARL.
    
    Args:
        lavalink_dir: Path to Lavalink directory containing application.yml
        
    Returns:
        True if config was updated successfully
    """
    config_path = lavalink_dir / 'application.yml'
    
    if not config_path.exists():
        logger.error(f"Lavalink config not found: {config_path}")
        return False
    
    arl = get_deezer_arl()
    if not arl:
        logger.warning("No Deezer ARL available, Lavalink config unchanged")
        return False
    
    try:
        import re
        content = config_path.read_text(encoding='utf-8')
        
        # Replace ARL placeholder or existing ARL
        # Pattern: arl: "..." or arl: '...' or arl: ...
        new_content = re.sub(
            r'(arl:\s*)["\']?[^"\'\n]*["\']?',
            f'arl: "{arl}"',
            content
        )
        
        if new_content != content:
            config_path.write_text(new_content, encoding='utf-8')
            logger.info(f"✓ Updated Lavalink config with Deezer ARL")
            return True
        else:
            logger.debug("Lavalink config already up to date")
            return True
            
    except Exception as e:
        logger.error(f"Failed to update Lavalink config: {e}")
        return False


# Quick test
if __name__ == "__main__":
    arl = get_deezer_arl()
    if arl:
        print(f"Found ARL: {arl[:20]}...{arl[-10:]}")
    else:
        print("No ARL found")
