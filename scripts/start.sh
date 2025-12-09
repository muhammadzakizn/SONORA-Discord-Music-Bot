#!/bin/bash
# Start script for Discord Music Bot

set -e

echo "Starting Discord Music Bot..."

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found!"
    echo "Run: ./scripts/install.sh first"
    exit 1
fi

# Run bot
python3 main.py
