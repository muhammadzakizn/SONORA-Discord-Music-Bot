# Quick Start Guide - Discord Music Bot

## Prerequisites

Before you begin, ensure you have:

1. **Python 3.10+** installed
2. **FFmpeg** installed with libopus support
3. **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
4. **Spotify API Credentials** from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
5. **Genius API Token** from [Genius API Clients](https://genius.com/api-clients)

## Installation

### Linux/macOS

```bash
# 1. Clone or download the project
cd discord-music-bot

# 2. Run installation script
chmod +x scripts/install.sh
./scripts/install.sh

# 3. Edit .env file with your credentials
nano .env  # or use your preferred editor
```

### Windows

```batch
# 1. Clone or download the project
cd discord-music-bot

# 2. Run installation script
scripts\install.bat

# 3. Edit .env file with your credentials
notepad .env
```

## Configuration

### 1. Setup Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section
4. Click "Add Bot"
5. Copy the bot token
6. Enable these intents:
   - Message Content Intent
   - Server Members Intent
   - Presence Intent

### 2. Setup Spotify API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy Client ID and Client Secret

### 3. Setup Genius API

1. Go to [Genius API Clients](https://genius.com/api-clients)
2. Create a new API client
3. Copy the access token

### 4. Configure .env File

Edit `.env` file with your credentials:

```env
DISCORD_TOKEN=your_discord_bot_token_here
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GENIUS_API_TOKEN=your_genius_api_token
```

### 5. Add Cookies (Optional but Recommended)

For better quality and reliability, add cookie files:

**Apple Music Cookies** (`cookies/apple_music_cookies.txt`):
- Login to Apple Music in your browser
- Export cookies using browser extension (e.g., "Get cookies.txt")
- Save as `cookies/apple_music_cookies.txt`

**YouTube Music Cookies** (`cookies/youtube_music_cookies.txt`):
- Login to YouTube Music in your browser
- Export cookies
- Save as `cookies/youtube_music_cookies.txt`

## Running the Bot

### Linux/macOS

```bash
./scripts/start.sh
```

### Windows

```batch
scripts\start.bat
```

### Manual Start

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Run bot
python main.py
```

## Inviting Bot to Server

1. Go to Discord Developer Portal
2. Select your application
3. Go to "OAuth2" → "URL Generator"
4. Select scopes:
   - `bot`
   - `applications.commands`
5. Select bot permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Connect
   - Speak
   - Use Voice Activity
6. Copy the generated URL
7. Open URL in browser and invite bot to your server

## Using the Bot

Once the bot is online, use these commands:

- `/play <url or query>` - Play music
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/stop` - Stop and disconnect
- `/skip` - Skip current track
- `/queue` - Show queue
- `/clear` - Clear queue

## Example Usage

```
/play never gonna give you up
/play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
/play https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## Troubleshooting

### Bot doesn't respond

- Check bot is online (green status)
- Verify bot has permissions in channel
- Check bot has slash commands enabled
- Try re-inviting bot with correct permissions

### Voice connection timeout

- Check your internet connection
- Verify FFmpeg is installed: `ffmpeg -version`
- Check bot has "Connect" and "Speak" permissions

### Download fails

- Verify Spotify credentials are correct
- Check cookies are valid (re-export if expired)
- Try different source (YouTube fallback)

### Rate limit errors

- Bot automatically handles rate limits
- If persistent, reduce concurrent operations
- Check Discord API status

## Getting Help

- Check [README.md](../README.md) for full documentation
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guide
- Open an issue on GitHub
- Check logs in `logs/bot.log`

## Next Steps

- Customize bot settings in `config/settings.py`
- Explore advanced features
- Contribute to the project!

---

**Enjoy your music! 🎵**
