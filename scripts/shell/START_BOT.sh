#!/bin/bash
# Simple start script for Discord Music Bot

BOT_DIR="/Users/muham/Documents/SONORA - Discord Audio Bot/SONORA7.2.0"
cd "$BOT_DIR"

echo "🎵 Starting Discord Music Bot..."
echo "📁 Working directory: $BOT_DIR"
echo "🌐 Web Dashboard: http://localhost:5001"
echo "🛠️  Admin Panel: http://localhost:5001/admin"
echo ""
echo "Press Ctrl+C to stop the bot"
echo "─────────────────────────────────────"

# Run bot
python3 main.py
