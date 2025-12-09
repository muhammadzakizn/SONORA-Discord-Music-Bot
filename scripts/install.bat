@echo off
REM Installation script for Discord Music Bot (Windows)

echo ======================================
echo Discord Music Bot - Installation
echo ======================================
echo.

REM Check Python
echo Checking Python version...
python --version
if errorlevel 1 (
    echo Error: Python not found!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)
echo Python OK
echo.

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install requirements
echo Installing Python dependencies...
pip install -r requirements.txt
echo Dependencies installed
echo.

REM Check FFmpeg
echo Checking FFmpeg...
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo Warning: FFmpeg not found!
    echo Please install FFmpeg from https://ffmpeg.org/download.html
    echo Add FFmpeg to PATH
) else (
    echo FFmpeg found
)
echo.

REM Check configuration
if not exist ".env" (
    echo Warning: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo Created .env file
    echo Please edit .env and add your credentials!
) else (
    echo .env file exists
)
echo.

REM Check cookies
if not exist "cookies\apple_music_cookies.txt" (
    echo Warning: Apple Music cookies not found
    echo Add cookies\apple_music_cookies.txt for Apple Music support
)
echo.

echo ======================================
echo Installation Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Edit .env file with your credentials
echo 2. Add cookie files to cookies\ directory
echo 3. Run: python main.py
echo.
pause
