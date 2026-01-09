# Lavalink Server Setup Guide

## Prerequisites
- Java 17+ installed
- 512MB+ RAM available
- Deezer account (for FLAC quality)

## Step 1: Install Java 17

### Windows (PowerShell as Admin)
```powershell
# Install via winget
winget install Microsoft.OpenJDK.17

# Verify
java -version
```

### Linux
```bash
sudo apt update
sudo apt install openjdk-17-jre-headless
java -version
```

## Step 2: Download Lavalink

```powershell
# Create directory
mkdir C:\Lavalink
cd C:\Lavalink

# Download latest Lavalink JAR
Invoke-WebRequest -Uri "https://github.com/lavalink-devs/Lavalink/releases/download/4.0.8/Lavalink.jar" -OutFile "Lavalink.jar"
```

## Step 3: Download LavaSrc Plugin

```powershell
# Create plugins directory
mkdir C:\Lavalink\plugins
cd C:\Lavalink\plugins

# Download LavaSrc (for Deezer/Spotify/Apple Music)
Invoke-WebRequest -Uri "https://github.com/topi314/LavaSrc/releases/download/4.0.1/lavasrc-plugin-4.0.1.jar" -OutFile "lavasrc-plugin-4.0.1.jar"
```

## Step 4: Configure Lavalink

Copy the `application.yml` from your SONORA project:
```powershell
Copy-Item "C:\SONORA\lavalink\application.yml" "C:\Lavalink\application.yml"
```

Edit `C:\Lavalink\application.yml`:
1. Update `deezer.arl` with your ARL token
2. Update `spotify.clientId` and `spotify.clientSecret`

## Step 5: Get Deezer ARL Token

1. Open browser → Login to deezer.com
2. Press F12 → Application tab
3. Cookies → deezer.com → find `arl`
4. Copy the value (long string)

## Step 6: Start Lavalink Server

```powershell
cd C:\Lavalink
java -Xmx1G -jar Lavalink.jar
```

Expected output:
```
[main] INFO  lavalink.server.Launcher - Starting Lavalink
[main] INFO  lavalink.server.Launcher - Lavalink is ready to accept connections.
```

## Step 7: Update SONORA .env

Add to your `.env`:
```env
LAVALINK_ENABLED=true
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
DEEZER_ARL=your_arl_token_here
LAVALINK_DEFAULT_SOURCE=dzsearch
```

## Step 8: Install wavelink

```powershell
pip install wavelink
```

## Step 9: Restart SONORA Bot

```powershell
cd C:\SONORA
git pull origin main
pip install -r requirements.txt
python launcher.py
```

## Verification

Check logs for:
```
✓ Connected to Lavalink at localhost:2333
✓ Using Lavalink for audio (Deezer FLAC)
```

## Troubleshooting

### "Connection refused"
- Ensure Lavalink server is running
- Check port 2333 is not blocked

### "Invalid ARL token"
- Re-extract ARL from browser cookies
- Make sure you're logged into Deezer

### "No results"
- Try YouTube fallback: set `LAVALINK_DEFAULT_SOURCE=ytmsearch`
