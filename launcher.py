#!/usr/bin/env python3
"""
SONORA Bot - Smart Launcher
Production-ready for Pterodactyl (Linux, venv, non-root)
"""

import os
import sys
import subprocess
from pathlib import Path
import time

# Check if running on Windows
IS_WINDOWS = os.name == 'nt'

# Fix Windows console encoding for emoji/unicode and ANSI colors
if IS_WINDOWS:
    # Enable UTF-8 output
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    # Enable ANSI escape sequence processing on Windows
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# Add Deno to PATH for yt-dlp EJS challenge solver
# yt-dlp requires Deno/Node for YouTube signature solving since v2025.11.12
if IS_WINDOWS:  # Windows
    deno_bin = Path.home() / 'AppData' / 'Local' / 'deno'
    if deno_bin.exists():
        os.environ['PATH'] = f"{deno_bin};{os.environ.get('PATH', '')}"
else:  # Linux/macOS
    deno_bin = Path.home() / '.deno' / 'bin'
    if deno_bin.exists():
        os.environ['PATH'] = f"{deno_bin}:{os.environ.get('PATH', '')}"

# Cloudflare Tunnel token for HTTPS API access
os.environ['CLOUDFLARE_TUNNEL_TOKEN'] = "eyJhIjoiYzAxZjBkYjYzMDY0YjJjOWFhMmQ3NjIxYjMxYTJkNWMiLCJ0IjoiOTg5MDJmZWMtMmFmYy00Y2U2LTg2NDktZDQ5ODIzZjdkZjRjIiwicyI6Ik5UbGhOekkwTnprdFpXVmxZeTAwWXpJeUxUZ3lNVGN0WldRNFltVmhPVGd6WkRWbCJ9"

# Configuration
WEB_PORT = 9072  # Port for web dashboard (legacy, now on Vercel)
BOT_API_PORT = 9072  # Port for bot API (use public port since Vercel needs access)
LYRICIFY_API_PORT = 5050  # Port for LyricifyApi C# microservice
WEB_DIR = Path('web')
LYRICIFY_DIR = Path('LyricifyApi')

# Colors - disabled on Windows for compatibility
class Colors:
    if IS_WINDOWS:
        # No colors on Windows (PowerShell ISE doesn't support ANSI)
        GREEN = ''
        BLUE = ''
        YELLOW = ''
        RED = ''
        CYAN = ''
        MAGENTA = ''
        WHITE = ''
        BOLD = ''
        END = ''
    else:
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
    print("""
=========================================================
                   SONORA MUSIC BOT                      
           Discord Audio Bot - Version 3.24.0            
                  Windows RDP Server                     
=========================================================
    """)

def print_menu():
    print(f"{Colors.BOLD}Select Option:{Colors.END}\n")
    print(f"{Colors.GREEN}1. {Colors.BOLD}[>] Start Production (Bot + API){Colors.END}")
    print(f"   - Bot with Flask API for Vercel dashboard")
    print(f"   - API Port: {BOT_API_PORT}")
    print(f"   - Web: https://sonora.muhammadzakizn.com (Vercel)")
    print()
    print(f"{Colors.BLUE}2. {Colors.BOLD}[>] Start Bot Only{Colors.END}")
    print(f"   - Discord bot without API server")
    print()
    print(f"{Colors.CYAN}3. {Colors.BOLD}[*] Configuration{Colors.END}")
    print(f"   - Edit environment files")
    print()
    print(f"{Colors.RED}4. {Colors.BOLD}[X] Exit{Colors.END}")
    print()

def check_requirements():
    """Check if required files exist"""
    required_files = ['main.py', 'requirements.txt', '.env']
    missing = [f for f in required_files if not Path(f).exists()]
    
    if missing:
        print(f"{Colors.RED}[X] Missing required files:{Colors.END}")
        for f in missing:
            print(f"   - {f}")
        return False
    return True

def check_web_build():
    """Check if web dashboard is built"""
    next_dir = WEB_DIR / '.next'
    if not next_dir.exists():
        print(f"{Colors.YELLOW}[!]  Web dashboard not built. Run option 2 first.{Colors.END}")
        return False
    return True

def cleanup_processes():
    """Kill any existing bot/web processes before starting"""
    print(f"{Colors.YELLOW}[..] Cleaning up existing processes...{Colors.END}")
    
    if os.name == 'nt':  # Windows
        # Use taskkill on Windows
        subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI', 'WINDOWTITLE eq *main.py*'], 
                       capture_output=True, shell=True)
        subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe'], 
                       capture_output=True, shell=True)
    else:  # Linux/macOS
        # Kill existing processes (works without root)
        subprocess.run(['pkill', '-f', 'next'], capture_output=True)
        subprocess.run(['pkill', '-f', 'npm'], capture_output=True)
        subprocess.run(['pkill', '-f', 'python3 main.py'], capture_output=True)
        subprocess.run(['pkill', '-f', 'cloudflared'], capture_output=True)
        subprocess.run(['pkill', '-f', 'LyricifyApi'], capture_output=True)
    
    # Remove Next.js lock files
    for lock_file in [WEB_DIR / '.next/dev/lock', WEB_DIR / '.next/build/lock']:
        if lock_file.exists():
            try:
                lock_file.unlink()
            except:
                pass
    
    time.sleep(1)
    print(f"{Colors.GREEN}[OK] Cleanup complete{Colors.END}\n")

def build_web():
    """Build web dashboard for production"""
    print(f"{Colors.YELLOW}{Colors.BOLD}[B] Building Web Dashboard...{Colors.END}\n")
    
    if not WEB_DIR.exists():
        print(f"{Colors.RED}[X] Web directory not found{Colors.END}")
        return False
    
    # Install dependencies
    print(f"{Colors.CYAN}[B] Installing dependencies...{Colors.END}")
    result = subprocess.run(['npm', 'install'], cwd=WEB_DIR)
    if result.returncode != 0:
        print(f"{Colors.RED}[X] npm install failed{Colors.END}")
        return False
    
    # Build production
    print(f"{Colors.CYAN}[B] Building production bundle...{Colors.END}")
    result = subprocess.run(['npm', 'run', 'build'], cwd=WEB_DIR)
    if result.returncode != 0:
        print(f"{Colors.RED}[X] Build failed{Colors.END}")
        return False
    
    print(f"{Colors.GREEN}✅ Web dashboard built successfully!{Colors.END}")
    return True

def run_production():
    """Run Bot + API in production mode (Web is on Vercel)"""
    cleanup_processes()
    
    print(f"{Colors.GREEN}{Colors.BOLD}[>] Starting SONORA Production (Bot + API)...{Colors.END}\n")
    
    # Restart signal file - checked by launcher to auto-restart bot
    restart_signal_file = Path('.restart_signal')
    
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = str(BOT_API_PORT)  # Bot API on public port
    env['DATABASE_PATH'] = 'bot.db'
    env['NODE_ENV'] = 'production'
    env['PORT'] = str(WEB_PORT)
    
    # Python command - 'python' on Windows, 'python3' on Linux/macOS
    python_cmd = 'python' if os.name == 'nt' else 'python3'
    
    # Start Bot with API on public port (accessible from Vercel)
    print(f"{Colors.CYAN}Starting Discord Bot with API...{Colors.END}")
    proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
    time.sleep(3)
    print(f"{Colors.GREEN}[OK] Bot started with API on port {BOT_API_PORT}{Colors.END}")
    
    # Start LyricifyApi C# microservice (for QQ Music syllable lyrics)
    proc_lyricify = None
    lyricify_binary = (LYRICIFY_DIR / 'publish' / 'linux-x64-single' / 'LyricifyApi').resolve()
    lyricify_workdir = (LYRICIFY_DIR / 'publish' / 'linux-x64-single').resolve()
    
    if lyricify_binary.exists() and lyricify_binary.is_file():
        # Use pre-built Linux binary (no .NET SDK required)
        print(f"{Colors.CYAN}Starting LyricifyApi (pre-built binary)...{Colors.END}")
        try:
            # Make sure it's executable
            subprocess.run(['chmod', '+x', str(lyricify_binary)], capture_output=True)
            
            # Start with stderr captured for debugging
            proc_lyricify = subprocess.Popen(
                [str(lyricify_binary)],
                cwd=str(lyricify_workdir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False
            )
            time.sleep(3)
            if proc_lyricify.poll() is None:
                print(f"{Colors.GREEN}[OK] LyricifyApi started on port {LYRICIFY_API_PORT}{Colors.END}")
                # Redirect to devnull after successful start
            else:
                # Failed to start - show error
                _, stderr = proc_lyricify.communicate(timeout=2)
                error_msg = stderr.decode('utf-8', errors='ignore')[:500] if stderr else "Unknown error"
                print(f"{Colors.YELLOW}[!]  LyricifyApi failed to start:{Colors.END}")
                print(f"{Colors.YELLOW}    {error_msg}{Colors.END}")
                proc_lyricify = None
        except Exception as e:
            print(f"{Colors.YELLOW}[!]  LyricifyApi error: {e}{Colors.END}")
            proc_lyricify = None
    elif LYRICIFY_DIR.exists() and (LYRICIFY_DIR / 'LyricifyApi.csproj').exists():
        # Try dotnet if available
        print(f"{Colors.CYAN}Starting LyricifyApi (via dotnet)...{Colors.END}")
        try:
            dotnet_check = subprocess.run(['which', 'dotnet'], capture_output=True)
            if dotnet_check.returncode == 0:
                proc_lyricify = subprocess.Popen(
                    ['dotnet', 'run', '--no-build'],
                    cwd=str(LYRICIFY_DIR),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                time.sleep(3)
                if proc_lyricify.poll() is None:
                    print(f"{Colors.GREEN}[OK] LyricifyApi started on port {LYRICIFY_API_PORT}{Colors.END}")
                else:
                    print(f"{Colors.YELLOW}[!]  LyricifyApi failed to start{Colors.END}")
                    proc_lyricify = None
            else:
                print(f"{Colors.YELLOW}[!]  .NET SDK not installed and no pre-built binary{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}[!]  LyricifyApi error: {e}{Colors.END}")
            proc_lyricify = None
    else:
        print(f"{Colors.YELLOW}[!]  LyricifyApi not found - Syllable lyrics disabled{Colors.END}")
    
    # Web Dashboard now runs on Vercel (https://sonora.muhammadzakizn.com)
    # No need to start local web dashboard
    proc_web = None
    
    # Start Cloudflare Tunnel for HTTPS API access
    proc_tunnel = None
    tunnel_token = os.getenv('CLOUDFLARE_TUNNEL_TOKEN', '')
    
    # Find cloudflared - check local folder first, then system PATH
    cloudflared_path = None
    if IS_WINDOWS:
        # On Windows, check system PATH (installed via Chocolatey)
        import shutil
        cloudflared_exe = shutil.which('cloudflared')
        if cloudflared_exe:
            cloudflared_path = Path(cloudflared_exe)
        else:
            # Check common Chocolatey install locations
            choco_paths = [
                Path('C:/ProgramData/chocolatey/bin/cloudflared.exe'),
                Path('C:/ProgramData/chocolatey/lib/cloudflared/tools/cloudflared.exe'),
            ]
            for p in choco_paths:
                if p.exists():
                    cloudflared_path = p
                    break
    else:
        # On Linux, check project folder first
        local_cloudflared = Path('cloudflared')
        if local_cloudflared.exists():
            cloudflared_path = local_cloudflared
        else:
            # Check system PATH
            import shutil
            cloudflared_exe = shutil.which('cloudflared')
            if cloudflared_exe:
                cloudflared_path = Path(cloudflared_exe)
    
    if cloudflared_path and cloudflared_path.exists() and tunnel_token:
        print(f"{Colors.CYAN}Starting Cloudflare Tunnel...{Colors.END}")
        print(f"{Colors.CYAN}   Using: {cloudflared_path}{Colors.END}")
        try:
            proc_tunnel = subprocess.Popen(
                [str(cloudflared_path), 'tunnel', 'run', '--token', tunnel_token],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(3)
            if proc_tunnel.poll() is None:
                print(f"{Colors.GREEN}[OK] Cloudflare Tunnel started (HTTPS API enabled){Colors.END}")
            else:
                print(f"{Colors.YELLOW}[!]  Cloudflare Tunnel failed to start{Colors.END}")
                proc_tunnel = None
        except Exception as e:
            print(f"{Colors.YELLOW}[!]  Cloudflare Tunnel error: {e}{Colors.END}")
            proc_tunnel = None
    elif not cloudflared_path or not cloudflared_path.exists():
        print(f"{Colors.YELLOW}[!]  cloudflared not found (install via: choco install cloudflared){Colors.END}")
        print(f"{Colors.YELLOW}   API only accessible via HTTP (waguri.caliphdev.com:{BOT_API_PORT}){Colors.END}")
    elif not tunnel_token:
        print(f"{Colors.YELLOW}[!]  CLOUDFLARE_TUNNEL_TOKEN not set in environment{Colors.END}")
        print(f"{Colors.YELLOW}   API only accessible via HTTP (waguri.caliphdev.com:{BOT_API_PORT}){Colors.END}")
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.GREEN}  ✅ SONORA Production Running!{Colors.END}")
    print(f"{Colors.CYAN}  [W] Web Dashboard: https://sonora.muhammadzakizn.com{Colors.END}")
    if proc_tunnel:
        print(f"{Colors.CYAN}  [P] Bot API (HTTPS): https://api-sonora.muhammadzakizn.com{Colors.END}")
    else:
        print(f"{Colors.CYAN}  [P] Bot API (HTTP):  http://waguri.caliphdev.com:{BOT_API_PORT}{Colors.END}")
    print(f"{Colors.YELLOW}  Press Ctrl+C to stop all services{Colors.END}")
    print(f"{Colors.GREEN}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}\n")
    
    try:
        while True:
            # Check for restart signal from dashboard
            if restart_signal_file.exists():
                print(f"\n{Colors.YELLOW}[~] Restart signal detected from dashboard...{Colors.END}")
                try:
                    restart_signal_file.unlink()
                except:
                    pass
                
                # Gracefully stop the bot
                print(f"{Colors.CYAN}Stopping current bot instance...{Colors.END}")
                proc_bot.terminate()
                try:
                    proc_bot.wait(timeout=5)
                except:
                    proc_bot.kill()
                
                time.sleep(1)
                
                # Start new bot instance
                print(f"{Colors.CYAN}Starting new bot instance...{Colors.END}")
                proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
                time.sleep(3)
                print(f"{Colors.GREEN}[OK] Bot restarted successfully!{Colors.END}\n")
                continue
            
            # Check if bot has crashed (not from restart signal)
            if proc_bot.poll() is not None:
                # Check if this was a dashboard restart (flag file exists)
                dashboard_restart = Path('.dashboard_restart').exists()
                if dashboard_restart:
                    print(f"\n{Colors.YELLOW}[~] Dashboard restart in progress...{Colors.END}")
                    try:
                        Path('.dashboard_restart').unlink()
                    except:
                        pass
                    
                    time.sleep(1)
                    print(f"{Colors.CYAN}Starting new bot instance...{Colors.END}")
                    proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
                    time.sleep(3)
                    print(f"{Colors.GREEN}[OK] Bot restarted successfully!{Colors.END}\n")
                    continue
                else:
                    print(f"\n{Colors.RED}Bot has stopped unexpectedly!{Colors.END}")
                    break
            
            # Web is now on Vercel, so we only monitor bot process
            # (proc_web is None in production mode)
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stopping all services...{Colors.END}")
    finally:
        proc_bot.terminate()
        if proc_web is not None:
            proc_web.terminate()
        if proc_tunnel is not None:
            proc_tunnel.terminate()
        if proc_lyricify is not None:
            proc_lyricify.terminate()
        try:
            proc_bot.wait(timeout=5)
            if proc_web is not None:
                proc_web.wait(timeout=5)
            if proc_tunnel is not None:
                proc_tunnel.wait(timeout=3)
            if proc_lyricify is not None:
                proc_lyricify.wait(timeout=3)
        except:
            proc_bot.kill()
            if proc_web is not None:
                proc_web.kill()
            if proc_tunnel is not None:
                proc_tunnel.kill()
            if proc_lyricify is not None:
                proc_lyricify.kill()
        # Clean up signal files
        for sig_file in [restart_signal_file, Path('.dashboard_restart')]:
            try:
                sig_file.unlink()
            except:
                pass
        print(f"{Colors.GREEN}✅ All services stopped.{Colors.END}")

def run_bot_only():
    """Run SONORA Bot only"""
    cleanup_processes()
    
    print(f"{Colors.BLUE}{Colors.BOLD}[>] Starting SONORA Bot...{Colors.END}\n")
    print(f"{Colors.CYAN}[N] Commands: /play, /pause, /queue, /lyrics, etc.{Colors.END}")
    print(f"{Colors.CYAN}[P] API: http://localhost:{BOT_API_PORT}{Colors.END}\n")
    
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = str(BOT_API_PORT)
    env['DATABASE_PATH'] = 'bot.db'
    
    # Python command - 'python' on Windows, 'python3' on Linux/macOS
    python_cmd = 'python' if os.name == 'nt' else 'python3'
    
    proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
    
    try:
        while True:
            # Check if bot has stopped
            if proc_bot.poll() is not None:
                # Check if this was a dashboard restart
                dashboard_restart = Path('.dashboard_restart').exists()
                if dashboard_restart:
                    print(f"\n{Colors.YELLOW}[~] Dashboard restart in progress...{Colors.END}")
                    try:
                        Path('.dashboard_restart').unlink()
                    except:
                        pass
                    
                    time.sleep(1)
                    print(f"{Colors.CYAN}Starting new bot instance...{Colors.END}")
                    proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
                    time.sleep(3)
                    print(f"{Colors.GREEN}[OK] Bot restarted successfully!{Colors.END}\n")
                    continue
                else:
                    print(f"\n{Colors.RED}Bot has stopped!{Colors.END}")
                    break
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stopping SONORA Bot...{Colors.END}")
        proc_bot.terminate()
        try:
            proc_bot.wait(timeout=5)
        except:
            proc_bot.kill()
    finally:
        # Clean up flag file
        try:
            Path('.dashboard_restart').unlink()
        except:
            pass
        print(f"{Colors.YELLOW}SONORA Bot stopped.{Colors.END}")

def run_web_production():
    """Run Web Dashboard only (Production)"""
    cleanup_processes()
    
    if not check_web_build():
        print(f"{Colors.RED}[X] Build the web dashboard first (option 2){Colors.END}")
        return
    
    print(f"{Colors.WHITE}{Colors.BOLD}[W] Starting Web Dashboard (Production)...{Colors.END}\n")
    print(f"{Colors.YELLOW}[!]  Note: Bot must be running for full functionality{Colors.END}\n")
    
    env = os.environ.copy()
    env['NODE_ENV'] = 'production'
    env['PORT'] = str(WEB_PORT)
    
    try:
        subprocess.run(
            ['npm', 'run', 'start', '--', '-p', str(WEB_PORT)],
            cwd=WEB_DIR,
            env=env
        )
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Web Dashboard stopped.{Colors.END}")

def run_development():
    """Run in development mode with hot-reload"""
    cleanup_processes()
    
    print(f"{Colors.MAGENTA}{Colors.BOLD}[T] Starting Development Mode...{Colors.END}\n")
    
    env = os.environ.copy()
    env['BOT_VERSION'] = 'stable'
    env['WEB_DASHBOARD_PORT'] = str(BOT_API_PORT)
    env['DATABASE_PATH'] = 'bot.db'
    
    # Python command - 'python' on Windows, 'python3' on Linux/macOS
    python_cmd = 'python' if os.name == 'nt' else 'python3'
    
    # Start Bot
    print(f"{Colors.CYAN}Starting Discord Bot...{Colors.END}")
    proc_bot = subprocess.Popen([python_cmd, 'main.py'], env=env)
    time.sleep(3)
    
    # Start Web Dashboard (Development)
    print(f"{Colors.CYAN}Starting Web Dashboard (Development)...{Colors.END}")
    proc_web = subprocess.Popen(['npm', 'run', 'dev'], cwd=WEB_DIR)
    time.sleep(4)
    
    print(f"\n{Colors.MAGENTA}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}")
    print(f"{Colors.MAGENTA}  [T] Development Mode Running!{Colors.END}")
    print(f"{Colors.CYAN}  [W] Web Dashboard: http://localhost:3000{Colors.END}")
    print(f"{Colors.CYAN}  [P] Bot API:       http://localhost:{BOT_API_PORT}{Colors.END}")
    print(f"{Colors.YELLOW}  Press Ctrl+C to stop{Colors.END}")
    print(f"{Colors.MAGENTA}{Colors.BOLD}═══════════════════════════════════════════════════════════{Colors.END}\n")
    
    try:
        while proc_bot.poll() is None and proc_web.poll() is None:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Stopping...{Colors.END}")
    finally:
        proc_bot.terminate()
        proc_web.terminate()
        try:
            proc_bot.wait(timeout=5)
            proc_web.wait(timeout=5)
        except:
            proc_bot.kill()
            proc_web.kill()

def configuration_menu():
    """Configuration menu"""
    while True:
        print(f"\n{Colors.CYAN}{Colors.BOLD}[*]  Configuration Menu{Colors.END}\n")
        print(f"1. Edit .env (Bot)")
        print(f"2. Edit web/.env.local (Web)")
        print(f"3. View configuration")
        print(f"4. Back to main menu")
        print()
        
        choice = input(f"{Colors.BOLD}Select option: {Colors.END}")
        
        if choice == '1':
            # Try nano, then vi
            if subprocess.run(['which', 'nano'], capture_output=True).returncode == 0:
                subprocess.run(['nano', '.env'])
            else:
                subprocess.run(['vi', '.env'])
        elif choice == '2':
            if subprocess.run(['which', 'nano'], capture_output=True).returncode == 0:
                subprocess.run(['nano', 'web/.env.local'])
            else:
                subprocess.run(['vi', 'web/.env.local'])
        elif choice == '3':
            print(f"\n{Colors.CYAN}Bot (.env):{Colors.END}")
            if Path('.env').exists():
                subprocess.run(['grep', '-v', '^#', '.env'])
            print(f"\n{Colors.CYAN}Web (web/.env.local):{Colors.END}")
            if Path('web/.env.local').exists():
                subprocess.run(['grep', '-v', '^#', 'web/.env.local'])
        elif choice == '4':
            break

def main():
    """Main launcher"""
    if not check_requirements():
        sys.exit(1)
    
    while True:
        print_banner()
        print_menu()
        
        choice = input(f"{Colors.BOLD}Enter your choice (1-4): {Colors.END}")
        
        if choice == '1':
            run_production()
        elif choice == '2':
            run_bot_only()
        elif choice == '3':
            configuration_menu()
        elif choice == '4':
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
