# SONORA Discord Music Bot - Server Deployment Guide

## Quick Start for Pterodactyl Panel

### 1. Upload Files
Upload all project files to your Pterodactyl server.

### 2. Install System Dependencies
```bash
# Ubuntu/Debian
apt update
apt install -y python3 python3-pip nodejs npm ffmpeg libopus0

# Verify versions
python3 --version  # Should be 3.10+
node --version     # Should be 18+
ffmpeg -version    # Should be 6.0+
```

### 3. Configure Environment
```bash
# Copy environment template
cp .env.server .env

# Edit with your credentials
nano .env
```

**Required values:**
- `DISCORD_TOKEN` - Your bot token
- `DISCORD_CLIENT_SECRET` - OAuth secret from Discord Developer Portal
- `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET` - From Spotify Developer
- `NEXT_PUBLIC_APP_URL` - Your server's public URL (e.g., `http://123.45.67.89:3000`)

### 4. First Time Setup
```bash
# Make script executable
chmod +x scripts/start-server.sh

# Install dependencies and build
./scripts/start-server.sh all
```

### 5. Start Server
```bash
./scripts/start-server.sh run
```

### 6. Configure Discord OAuth Redirect
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 → Redirects
4. Add: `http://YOUR_SERVER_IP:3000/api/auth/discord/callback`
5. Save Changes

---

## Pterodactyl Startup Command

Use this as your startup command in Pterodactyl Panel:

```bash
cd /home/container && ./scripts/start-server.sh run
```

Or for first-time setup:
```bash
cd /home/container && ./scripts/start-server.sh all
```

---

## Ports

| Service | Port | Access |
|---------|------|--------|
| Web Dashboard | 3000 | Public |
| Bot API | 5000 | Internal only |

**Important:** Only expose port 3000 to the public. Port 5000 should remain internal.

---

## Troubleshooting

### "Opus not loaded"
```bash
apt install libopus0 libopus-dev
```

### "FFmpeg not found"
```bash
apt install ffmpeg
```

### "Module not found"
```bash
pip install -r requirements.txt
npm install
```

### Bot not connecting to Discord
- Check your `DISCORD_TOKEN` is correct
- Ensure the bot has proper intents enabled in Discord Developer Portal

---

## With Reverse Proxy (Recommended for Production)

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name sonora.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With SSL (Certbot)
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d sonora.yourdomain.com
```
