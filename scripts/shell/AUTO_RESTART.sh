#!/bin/bash
# Auto-restart script for Discord Music Bot

BOT_DIR="/Users/muham/Documents/SONORA - Discord Audio Bot/SONORA7.2.0"
LOG_FILE="$BOT_DIR/logs/bot_restart.log"
PID_FILE="$BOT_DIR/.bot.pid"

cd "$BOT_DIR"

# Function to start bot
start_bot() {
    echo "[$(date)] Starting bot..." | tee -a "$LOG_FILE"
    
    # Kill any existing instances
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo "[$(date)] Killing old instance (PID: $OLD_PID)" | tee -a "$LOG_FILE"
            kill -9 "$OLD_PID"
        fi
    fi
    
    # Start bot in background
    nohup python3 main.py >> "$LOG_FILE" 2>&1 &
    BOT_PID=$!
    
    echo $BOT_PID > "$PID_FILE"
    echo "[$(date)] Bot started with PID: $BOT_PID" | tee -a "$LOG_FILE"
}

# Function to check if bot is running
check_bot() {
    if [ ! -f "$PID_FILE" ]; then
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Main loop
echo "[$(date)] Auto-restart script started" | tee -a "$LOG_FILE"

while true; do
    if ! check_bot; then
        echo "[$(date)] Bot is not running! Restarting..." | tee -a "$LOG_FILE"
        start_bot
        sleep 10  # Wait for bot to initialize
    fi
    
    sleep 30  # Check every 30 seconds
done
