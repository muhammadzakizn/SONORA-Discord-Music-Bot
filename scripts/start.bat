@echo off
REM Start script for Discord Music Bot (Windows)

echo Starting Discord Music Bot...

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found!
    echo Run: scripts\install.bat first
    pause
    exit /b 1
)

REM Run bot
python main.py
pause
