#!/usr/bin/env python3
"""
SONORA Bot - Smart Launcher
Allows running Stable and Beta versions simultaneously
"""

import os
import sys
import signal
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
║                    SONORA BOT LAUNCHER                       ║
║                   Version Selection System                   ║
╚══════════════════════════════════════════════════════════════╝
{Colors.END}
    """)

def print_menu():
    print(f"{Colors.BOLD}Select Version to Run:{Colors.END}\n")
    print(f"{Colors.GREEN}1. {Colors.BOLD}🟢 STABLE Version{Colors.END}")
    print(f"   └─ Production-ready, tested features")
    print(f"   └─ Commands: /play, /pause, /queue, etc.")
    print(f"   └─ Port: 5000 | DB: bot.db")
    print()
    print(f"{Colors.YELLOW}2. {Colors.BOLD}🧪 BETA Version{Colors.END}")
    print(f"   └─ Testing new features (may be unstable)")
    print(f"   └─ Commands: /play-beta, /pause-beta, /queue-beta, etc.")
    print(f"   └─ Port: 5001 | DB: bot_beta.db")
    print()
    print(f"{Colors.CYAN}3. {Colors.BOLD}🔄 Run BOTH (Stable + Beta){Colors.END}")
    print(f"   └─ Run both versions simultaneously")
    print(f"   └─ Compare features side-by-side")
    print()
    print(f"{Colors.MAGENTA}4. {Colors.BOLD}📊 Promote Beta → Stable{Colors.END}")
    print(f"   └─ Deploy tested beta features to stable")
    print(f"   └─ Automated promotion workflow")
    print()
    print(f"{Colors.BLUE}5. {Colors.BOLD}⚙️  Configuration Menu{Colors.END}")
    print(f"   └─ Manage environments, tokens, settings")
    print()
    print(f"{Colors.WHITE}6. {Colors.BOLD}🌐 Web Dashboard + Tunnel{Colors.END}")
    print(f"   └─ Start web dashboard with Cloudflare tunnel")
    print(f"   └─ Secure public access with DDoS protection")
    print()
    print(f"{Colors.RED}7. {Colors.BOLD}❌ Exit{Colors.END}")
    print()

def check_requirements():
    """Check if required files exist"""
    required_files = [
        'main.py',
        'requirements.txt',
        '.env'
    ]
    
    missing = []
    for file in required_files:
        if not Path(file).exists():
            missing.append(file)
    
    if missing:
        print(f"{Colors.RED}❌ Missing required files:{Colors.END}")
        for f in missing:
            print(f"   - {f}")
        return False
    
    return True

def run_stable():
    """Run stable version"""
    print(f"\n{Colors.GREEN}{Colors.BOLD}🟢 Starting STABLE Version...{Colors.END}\n")
    
    # Set environment
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = '5000'
    env['DATABASE_PATH'] = 'bot.db'
    
    try:
        subprocess.run(['python3', 'main.py'], env=env)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stable version stopped.{Colors.END}")

def run_beta():
    """Run beta version"""
    print(f"\n{Colors.YELLOW}{Colors.BOLD}🧪 Starting BETA Version with Command Suffix...{Colors.END}\n")
    print(f"{Colors.CYAN}📝 Beta commands: /play-beta, /pause-beta, /queue-beta{Colors.END}")
    print(f"{Colors.YELLOW}⚠️  Commands are DIFFERENT from stable version!{Colors.END}\n")
    
    # Set environment
    env = os.environ.copy()
    env['BOT_VERSION'] = 'beta'
    env['WEB_DASHBOARD_PORT'] = '5001'
    env['WEB_DASHBOARD_HOST'] = '127.0.0.1'  # Force localhost
    env['DATABASE_PATH'] = 'bot_beta.db'
    env['COMMAND_SUFFIX'] = '-beta'
    
    # ALWAYS use suffix version
    beta_main = Path('beta-version/main_beta_with_suffix.py')
    
    if not beta_main.exists():
        print(f"{Colors.RED}❌ ERROR: main_beta_with_suffix.py not found!{Colors.END}")
        print(f"{Colors.YELLOW}Expected at: {beta_main}{Colors.END}")
        return
    
    print(f"{Colors.GREEN}✓ Using: {beta_main}{Colors.END}\n")
    
    try:
        subprocess.run(['python3', str(beta_main)], env=env)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Beta version stopped.{Colors.END}")

def run_both():
    """Run both versions simultaneously"""
    print(f"\n{Colors.CYAN}{Colors.BOLD}🔄 Starting BOTH Versions...{Colors.END}\n")
    
    # Start stable in background
    print(f"{Colors.GREEN}Starting Stable version (background)...{Colors.END}")
    env_stable = os.environ.copy()
    env_stable['BOT_VERSION'] = 'stable'
    env_stable['WEB_DASHBOARD_PORT'] = '5000'
    env_stable['DATABASE_PATH'] = 'bot.db'
    
    proc_stable = subprocess.Popen(
        ['python3', 'main.py'],
        env=env_stable,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    time.sleep(3)  # Wait for stable to start
    
    # Start beta in foreground
    print(f"{Colors.YELLOW}Starting Beta version (foreground)...{Colors.END}\n")
    env_beta = os.environ.copy()
    env_beta['BOT_VERSION'] = 'beta'
    env_beta['WEB_DASHBOARD_PORT'] = '5001'
    env_beta['DATABASE_PATH'] = 'bot_beta.db'
    env_beta['COMMAND_SUFFIX'] = '-beta'
    
    beta_main = Path('beta-version/main_beta.py')
    
    try:
        if beta_main.exists():
            subprocess.run(['python3', str(beta_main)], env=env_beta)
        else:
            print(f"{Colors.RED}❌ Beta version not found.{Colors.END}")
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stopping both versions...{Colors.END}")
    finally:
        # Stop stable version
        proc_stable.terminate()
        proc_stable.wait(timeout=5)
        print(f"{Colors.GREEN}✅ Both versions stopped.{Colors.END}")

def promote_to_stable():
    """Promote beta features to stable"""
    print(f"\n{Colors.MAGENTA}{Colors.BOLD}📊 Beta → Stable Promotion Workflow{Colors.END}\n")
    
    print(f"{Colors.YELLOW}This will:{Colors.END}")
    print(f"  1. Backup current stable version")
    print(f"  2. Run automated tests on beta")
    print(f"  3. Merge beta features to stable")
    print(f"  4. Update version number")
    print(f"  5. Create release tag")
    print()
    
    confirm = input(f"{Colors.BOLD}Continue? (yes/no): {Colors.END}").lower()
    
    if confirm == 'yes':
        print(f"\n{Colors.CYAN}Starting promotion workflow...{Colors.END}")
        subprocess.run(['python3', 'scripts/promote_beta.py'])
    else:
        print(f"{Colors.YELLOW}Promotion cancelled.{Colors.END}")

def configuration_menu():
    """Configuration menu"""
    while True:
        print(f"\n{Colors.BLUE}{Colors.BOLD}⚙️  Configuration Menu{Colors.END}\n")
        print(f"1. Edit Stable .env")
        print(f"2. Edit Beta .env")
        print(f"3. View current configuration")
        print(f"4. Reset Beta environment")
        print(f"5. Back to main menu")
        print()
        
        choice = input(f"{Colors.BOLD}Select option: {Colors.END}")
        
        if choice == '1':
            subprocess.run(['nano', '.env'])
        elif choice == '2':
            subprocess.run(['nano', 'beta-version/.env.beta'])
        elif choice == '3':
            print(f"\n{Colors.CYAN}Current Configuration:{Colors.END}")
            print(f"\n{Colors.GREEN}Stable:{Colors.END}")
            subprocess.run(['grep', '-v', '^#', '.env'])
            print(f"\n{Colors.YELLOW}Beta:{Colors.END}")
            beta_env = Path('beta-version/.env.beta')
            if beta_env.exists():
                subprocess.run(['grep', '-v', '^#', str(beta_env)])
        elif choice == '4':
            confirm = input(f"{Colors.RED}Reset beta database? (yes/no): {Colors.END}")
            if confirm.lower() == 'yes':
                beta_db = Path('beta-version/bot_beta.db')
                if beta_db.exists():
                    beta_db.unlink()
                    print(f"{Colors.GREEN}✅ Beta database reset.{Colors.END}")
        elif choice == '5':
            break

def run_web_with_tunnel():
    """Start web dashboard with Cloudflare tunnel"""
    print(f"\n{Colors.WHITE}{Colors.BOLD}🌐 Starting Web Dashboard with Tunnel...{Colors.END}\n")
    
    # Check if cloudflared is installed
    try:
        subprocess.run(['which', 'cloudflared'], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print(f"{Colors.RED}❌ cloudflared is not installed!{Colors.END}")
        print(f"\n{Colors.YELLOW}Install with:{Colors.END}")
        print(f"  brew install cloudflare/cloudflare/cloudflared")
        print(f"\n{Colors.YELLOW}Then login:{Colors.END}")
        print(f"  cloudflared tunnel login")
        return
    
    print(f"{Colors.CYAN}Select startup mode:{Colors.END}")
    print(f"1. Start web dashboard only (localhost:3000)")
    print(f"2. Start web dashboard + Quick tunnel (temporary public URL)")
    print(f"3. Start Stable bot + Web dashboard + Tunnel")
    print(f"4. Back to main menu")
    print()
    
    choice = input(f"{Colors.BOLD}Choice: {Colors.END}")
    
    web_dir = Path('web')
    
    if choice == '1':
        # Start Next.js dev server
        print(f"\n{Colors.GREEN}Starting Next.js development server...{Colors.END}")
        try:
            subprocess.run(['npm', 'run', 'dev'], cwd=web_dir)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Web server stopped.{Colors.END}")
    
    elif choice == '2':
        # Start Next.js and tunnel
        print(f"\n{Colors.GREEN}Starting Next.js + Cloudflare Tunnel...{Colors.END}")
        print(f"{Colors.CYAN}Your public URL will appear below.{Colors.END}\n")
        
        # Start Next.js in background
        proc_web = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=web_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        time.sleep(5)  # Wait for Next.js to start
        
        try:
            # Start tunnel in foreground
            subprocess.run(['cloudflared', 'tunnel', '--url', 'http://localhost:3000'])
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Stopping services...{Colors.END}")
        finally:
            proc_web.terminate()
            proc_web.wait(timeout=5)
            print(f"{Colors.GREEN}✅ All services stopped.{Colors.END}")
    
    elif choice == '3':
        # Start bot + web + tunnel
        print(f"\n{Colors.GREEN}Starting Stable Bot + Web Dashboard + Tunnel...{Colors.END}")
        
        # Start stable bot
        env_stable = os.environ.copy()
        env_stable['BOT_VERSION'] = 'stable'
        env_stable['WEB_DASHBOARD_PORT'] = '5000'
        env_stable['DATABASE_PATH'] = 'bot.db'
        
        proc_bot = subprocess.Popen(
            ['python3', 'main.py'],
            env=env_stable,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        time.sleep(3)
        print(f"{Colors.GREEN}✓ Bot started{Colors.END}")
        
        # Start Next.js
        proc_web = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=web_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        time.sleep(5)
        print(f"{Colors.GREEN}✓ Web dashboard started{Colors.END}")
        
        try:
            # Start tunnel
            print(f"\n{Colors.CYAN}Starting Cloudflare Tunnel...{Colors.END}")
            print(f"{Colors.CYAN}Your public URL will appear below.{Colors.END}\n")
            subprocess.run(['cloudflared', 'tunnel', '--url', 'http://localhost:3000'])
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Stopping all services...{Colors.END}")
        finally:
            proc_bot.terminate()
            proc_web.terminate()
            proc_bot.wait(timeout=5)
            proc_web.wait(timeout=5)
            print(f"{Colors.GREEN}✅ All services stopped.{Colors.END}")
    
    elif choice == '4':
        return
    else:
        print(f"{Colors.RED}Invalid choice.{Colors.END}")

def main():
    """Main launcher"""
    if not check_requirements():
        sys.exit(1)
    
    while True:
        print_banner()
        print_menu()
        
        choice = input(f"{Colors.BOLD}Enter your choice (1-7): {Colors.END}")
        
        if choice == '1':
            run_stable()
        elif choice == '2':
            run_beta()
        elif choice == '3':
            run_both()
        elif choice == '4':
            promote_to_stable()
        elif choice == '5':
            configuration_menu()
        elif choice == '6':
            run_web_with_tunnel()
        elif choice == '7':
            print(f"\n{Colors.CYAN}Thank you for using SONORA Bot! 👋{Colors.END}\n")
            sys.exit(0)
        else:
            print(f"\n{Colors.RED}Invalid choice. Please try again.{Colors.END}\n")
            time.sleep(1)
        
        input(f"\n{Colors.BOLD}Press Enter to continue...{Colors.END}")
        os.system('clear' if os.name != 'nt' else 'cls')

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Launcher interrupted. Goodbye! 👋{Colors.END}\n")
        sys.exit(0)

