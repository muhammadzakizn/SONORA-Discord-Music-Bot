#!/bin/bash
# Installation script for Discord Music Bot

set -e

echo "======================================"
echo "Discord Music Bot - Installation"
echo "======================================"
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

required_version="3.10"
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 10) else 1)"; then
    echo "❌ Python 3.10+ required. Current: $python_version"
    exit 1
fi
echo "✓ Python version OK"
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip
echo "✓ pip upgraded"
echo ""

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "✓ Python dependencies installed"
echo ""

# Check FFmpeg
echo "Checking FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    ffmpeg_version=$(ffmpeg -version 2>&1 | head -n 1)
    echo "✓ FFmpeg found: $ffmpeg_version"
else
    echo "❌ FFmpeg not found!"
    echo "Please install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
fi
echo ""

# Check configuration
echo "Checking configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo "⚠️  Please edit .env and add your credentials!"
else
    echo "✓ .env file exists"
fi
echo ""

# Check cookies
echo "Checking cookies..."
if [ ! -f "cookies/apple_music_cookies.txt" ]; then
    echo "⚠️  Apple Music cookies not found"
    echo "   Add cookies/apple_music_cookies.txt for Apple Music support"
fi

if [ ! -f "cookies/spotify_cookies.txt" ]; then
    echo "⚠️  Spotify cookies not found (optional)"
fi

if [ ! -f "cookies/youtube_music_cookies.txt" ]; then
    echo "⚠️  YouTube Music cookies not found (optional)"
fi
echo ""

# Run validation
echo "Running validation..."
python3 tmp_rovodev_validate_files.py
echo ""

echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Add cookie files to cookies/ directory"
echo "3. Run: python3 main.py"
echo ""
