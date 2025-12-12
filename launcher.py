#!/usr/bin/env python3
"""
SONORA Bot - Smart Launcher
"""

import os
import sys
import subprocess
from pathlib import Path
import time

class Colors:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════╗
║                      SONORA MUSIC BOT                        ║
║               Discord Audio Bot - Version 3.4.0              ║
╚══════════════════════════════════════════════════════════════╝
{Colors.END}
    """)

def print_menu():
    print(f"{Colors.BOLD}Select Option:{Colors.END}\n")
    print(f"{Colors.GREEN}1. {Colors.BOLD}🚀 Start Bot + Web Dashboard (Recommended){Colors.END}")
    print(f"   └─ Runs both bot and web dashboard together")
    print(f"   └─ Bot API: 5000 | Web: 3000")
    print()
    print(f"{Colors.YELLOW}2. {Colors.BOLD}🎵 Start Bot Only{Colors.END}")
    print(f"   └─ Discord bot without web dashboard")
    print()
    print(f"{Colors.WHITE}3. {Colors.BOLD}🌐 Start Web Dashboard Only{Colors.END}")
    print(f"   └─ For testing web UI (requires bot running)")
    print()
    print(f"{Colors.BLUE}4. {Colors.BOLD}⚙️  Configuration{Colors.END}")
    print(f"   └─ Edit environment file")
    print()
    print(f"{Colors.RED}5. {Colors.BOLD}❌ Exit{Colors.END}")
    print()

def check_requirements():
    """Check if required files exist"""
    required_files = ['main.py', 'requirements.txt', '.env']
    missing = [f for f in required_files if not Path(f).exists()]
    
    if missing:
        print(f"{Colors.RED}❌ Missing required files:{Colors.END}")
        for f in missing:
            print(f"   - {f}")
        return False
    return True

def cleanup_processes():
    """Kill any existing bot/web processes before starting"""
    print(f"{Colors.YELLOW}🧹 Cleaning up existing processes...{Colors.END}")
    
    # Kill existing processes
    subprocess.run(['pkill', '-f', 'next dev'], capture_output=True)
    subprocess.run(['pkill', '-f', 'npm run dev'], capture_output=True)
    subprocess.run(['pkill', '-f', 'python3 main.py'], capture_output=True)
    
    # Remove Next.js lock file
    lock_file = Path('web/.next/dev/lock')
    if lock_file.exists():
        lock_file.unlink()
    
    # Small delay to ensure processes are terminated
    time.sleep(1)
    print(f"{Colors.GREEN}✓ Cleanup complete{Colors.END}\n")

def run_bot_and_web():
    """Run SONORA Bot + Web Dashboard together"""
    cleanup_processes()
    
    print(f"{Colors.GREEN}{Colors.BOLD}🚀 Starting SONORA Bot + Web Dashboard...{Colors.END}\n")
    
    web_dir = Path('web')
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = '5000'
    env['DATABASE_PATH'] = 'bot.db'
    
    # Start Bot
    print(f"{Colors.CYAN}Starting Discord Bot...{Colors.END}")
    proc_bot = subprocess.Popen(['python3', 'main.py'], env=env)
    time.sleep(3)
    print(f"{Colors.GREEN}✓ Bot started (API: http://localhost:5000){Colors.END}")
    
    # Start Web Dashboard
    print(f"{Colors.CYAN}Starting Web Dashboard...{Colors.END}")
    proc_web = subprocess.Popen(['npm', 'run', 'dev'], cwd=web_dir)
    time.sleep(4)
    print(f"{Colors.GREEN}✓ Web Dashboard started{Colors.END}")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.GREEN}  ✅ All services running!{Colors.END}")
    print(f"{Colors.CYAN}  🌐 Web Dashboard: http://localhost:3000{Colors.END}")
    print(f"{Colors.CYAN}  🔌 Bot API:       http://localhost:5000{Colors.END}")
    print(f"{Colors.YELLOW}  Press Ctrl+C to stop all services{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}\n")
    
    try:
        while proc_bot.poll() is None and proc_web.poll() is None:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stopping all services...{Colors.END}")
    finally:
        proc_bot.terminate()
        proc_web.terminate()
        try:
            proc_bot.wait(timeout=5)
            proc_web.wait(timeout=5)
        except:
            proc_bot.kill()
            proc_web.kill()
        print(f"{Colors.GREEN}✅ All services stopped.{Colors.END}")

def run_bot_only():
    """Run SONORA Bot only"""
    cleanup_processes()
    
    print(f"{Colors.YELLOW}{Colors.BOLD}🎵 Starting SONORA Bot...{Colors.END}\n")
    print(f"{Colors.CYAN}📝 Commands: /play, /pause, /queue, /lyrics, etc.{Colors.END}")
    print(f"{Colors.CYAN}🔌 API: http://localhost:5000{Colors.END}\n")
    
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = '5000'
    env['DATABASE_PATH'] = 'bot.db'
    
    try:
        subprocess.run(['python3', 'main.py'], env=env)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}SONORA Bot stopped.{Colors.END}")

def run_web_only():
    """Run Web Dashboard only"""
    cleanup_processes()
    
    print(f"{Colors.WHITE}{Colors.BOLD}🌐 Starting Web Dashboard...{Colors.END}\n")
    print(f"{Colors.YELLOW}⚠️  Note: Bot must be running for full functionality{Colors.END}\n")
    
    try:
        subprocess.run(['npm', 'run', 'dev'], cwd=Path('web'))
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Web Dashboard stopped.{Colors.END}")

def configuration_menu():
    """Configuration menu"""
    while True:
        print(f"\n{Colors.BLUE}{Colors.BOLD}⚙️  Configuration Menu{Colors.END}\n")
        print(f"1. Edit .env (Bot)")
        print(f"2. Edit web/.env.local (Web)")
        print(f"3. View configuration")
        print(f"4. Back to main menu")
        print()
        
        choice = input(f"{Colors.BOLD}Select option: {Colors.END}")
        
        if choice == '1':
            subprocess.run(['nano', '.env'])
        elif choice == '2':
            subprocess.run(['nano', 'web/.env.local'])
        elif choice == '3':
            print(f"\n{Colors.CYAN}Bot (.env):{Colors.END}")
            subprocess.run(['grep', '-v', '^#', '.env'])
        elif choice == '4':
            break

def main():
    """Main launcher"""
    if not check_requirements():
        sys.exit(1)
    
    while True:
        print_banner()
        print_menu()
        
        choice = input(f"{Colors.BOLD}Enter your choice (1-5): {Colors.END}")
        
        if choice == '1':
            run_bot_and_web()
        elif choice == '2':
            run_bot_only()
        elif choice == '3':
            run_web_only()
        elif choice == '4':
            configuration_menu()
        elif choice == '5':
            print(f"\n{Colors.CYAN}Thank you for using SONORA Bot! 👋{Colors.END}\n")
            sys.exit(0)
        else:
            print(f"\n{Colors.RED}Invalid choice.{Colors.END}\n")
            time.sleep(1)
        
        input(f"\n{Colors.BOLD}Press Enter to continue...{Colors.END}")
        os.system('clear' if os.name != 'nt' else 'cls')

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Goodbye! 👋{Colors.END}\n")
        sys.exit(0)
