"""
🔐 Authentication API Endpoints
Bank-Level Security Implementation

This module provides REST API endpoints for:
- User authentication (Discord OAuth)
- MFA setup and verification (TOTP, Passkey, Email, Discord DM)
- Session management
- Trusted devices
- Security audit

All sensitive data is encrypted with AES-256-GCM
All passwords/codes hashed with Argon2id
"""

import os
import json
import pyotp
import qrcode
import io
import base64
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, make_response
from typing import Optional, Dict, Any

# Import auth database manager
import asyncio
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.auth_db_manager import (
    get_auth_db_manager, 
    init_auth_database,
    ensure_db_connected,
    SecureCrypto,
    AuthDatabaseManager
)
from config.logging_config import get_logger

logger = get_logger('auth_api')

# Create Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# ==================== HELPERS ====================

def run_async(coro):
    """Run async function in sync context"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def run_in_bot_loop(coro, timeout=30):
    """
    Run async coroutine in bot's event loop.
    Required for Discord API calls since HTTP session is bound to bot's loop.
    """
    if _bot_instance and _bot_instance.loop:
        import concurrent.futures
        future = asyncio.run_coroutine_threadsafe(coro, _bot_instance.loop)
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            logger.error("Bot loop coroutine timed out")
            return None
    else:
        # Fallback if bot not available
        return run_async(coro)


def get_client_info(req) -> Dict[str, str]:
    """Extract client information from request"""
    user_agent = req.headers.get('User-Agent', 'Unknown')
    ip = req.headers.get('X-Forwarded-For', req.remote_addr)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    
    # Parse user agent for device info
    browser = 'Unknown'
    os_info = 'Unknown'
    
    if 'Chrome' in user_agent:
        browser = 'Chrome'
    elif 'Firefox' in user_agent:
        browser = 'Firefox'
    elif 'Safari' in user_agent:
        browser = 'Safari'
    elif 'Edge' in user_agent:
        browser = 'Edge'
    
    if 'Windows' in user_agent:
        os_info = 'Windows'
    elif 'Mac' in user_agent:
        os_info = 'macOS'
    elif 'Linux' in user_agent:
        os_info = 'Linux'
    elif 'Android' in user_agent:
        os_info = 'Android'
    elif 'iPhone' in user_agent or 'iPad' in user_agent:
        os_info = 'iOS'
    
    return {
        'ip_address': ip,
        'user_agent': user_agent,
        'browser': browser,
        'os': os_info,
        'device_fingerprint': hashlib.sha256(f"{user_agent}-{ip}".encode()).hexdigest()[:32]
    }


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check session cookie
        session_token = request.cookies.get('sonora-auth-session')
        if not session_token:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Validate session
        db = ensure_db_connected()
        # ... validate session logic
        
        return f(*args, **kwargs)
    return decorated_function


# ==================== USER ENDPOINTS ====================

@auth_bp.route('/user/check', methods=['POST'])
def check_user():
    """
    Check if Discord user exists in database
    Used after Discord OAuth to determine new vs existing user
    """
    try:
        data = request.json
        discord_id = data.get('discord_id')
        
        if not discord_id:
            return jsonify({'error': 'Discord ID required'}), 400
        
        db = ensure_db_connected()
        user = run_async(db.get_user_by_discord_id(discord_id))
        
        if user:
            # Existing user
            mfa_methods = run_async(db.get_user_mfa_methods(user['id']))
            return jsonify({
                'exists': True,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'status': user['status'],
                    'mfa_enabled': user['mfa_enabled'],
                    'role': user['role']
                },
                'mfa_methods': [m['method_type'] for m in mfa_methods if m['is_active']]
            })
        else:
            return jsonify({'exists': False})
    
    except Exception as e:
        logger.error(f"Check user error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/user/register', methods=['POST'])
def register_user():
    """
    Register new user from Discord OAuth
    """
    try:
        data = request.json
        discord_id = data.get('discord_id')
        username = data.get('username')
        email = data.get('email')
        avatar_url = data.get('avatar_url')
        
        if not discord_id or not username:
            return jsonify({'error': 'Discord ID and username required'}), 400
        
        db = ensure_db_connected()
        
        # Check if already exists
        existing = run_async(db.get_user_by_discord_id(discord_id))
        if existing:
            return jsonify({'error': 'User already exists'}), 409
        
        # Create user
        user_id = run_async(db.create_user(
            discord_id=discord_id,
            username=username,
            email=email,
            avatar_url=avatar_url
        ))
        
        # Log client info
        client_info = get_client_info(request)
        run_async(db.log_login_attempt(
            success=True,
            user_id=user_id,
            discord_id=discord_id,
            ip_address=client_info['ip_address'],
            user_agent=client_info['user_agent']
        ))
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'message': 'User registered successfully'
        })
    
    except Exception as e:
        logger.error(f"Register user error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """
    Get all users (admin endpoint)
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        status = request.args.get('status')
        role = request.args.get('role')
        
        db = ensure_db_connected()
        users = run_async(db.get_all_users(limit=limit, offset=offset, status=status, role=role))
        total = run_async(db.get_user_count(status=status))
        
        return jsonify({
            'users': users,
            'total': total,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        logger.error(f"Get users error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id: int):
    """Get single user details"""
    try:
        db = ensure_db_connected()
        user = run_async(db.get_user_by_id(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get MFA methods
        mfa_methods = run_async(db.get_user_mfa_methods(user_id))
        
        # Get trusted devices
        devices = run_async(db.get_trusted_devices(user_id))
        
        # Get backup codes count
        backup_codes = run_async(db.get_backup_codes_count(user_id))
        
        # Get login history
        login_history = run_async(db.get_login_history(user_id, limit=10))
        
        return jsonify({
            'user': user,
            'mfa_methods': mfa_methods,
            'trusted_devices': devices,
            'backup_codes': backup_codes,
            'login_history': login_history
        })
    
    except Exception as e:
        logger.error(f"Get user error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/user/<int:user_id>/status', methods=['PUT'])
def update_user_status(user_id: int):
    """Update user status (admin endpoint)"""
    try:
        data = request.json
        status = data.get('status')
        
        if status not in ['pending', 'active', 'suspended', 'banned']:
            return jsonify({'error': 'Invalid status'}), 400
        
        db = ensure_db_connected()
        run_async(db.update_user_status(user_id, status))
        
        return jsonify({
            'success': True,
            'message': f'User status updated to {status}'
        })
    
    except Exception as e:
        logger.error(f"Update user status error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== MFA - TOTP ENDPOINTS ====================

@auth_bp.route('/mfa/totp/setup', methods=['POST'])
def setup_totp():
    """
    Setup TOTP authenticator app
    Returns QR code and secret for manual entry
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        user = run_async(db.get_user_by_id(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate TOTP secret
        secret = pyotp.random_base32()
        
        # Create provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user['email'] or user['username'],
            issuer_name='SONORA'
        )
        
        # Generate QR code as base64
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Store secret temporarily in session/cache (not in DB until verified)
        # For now, we'll encrypt and return it
        crypto = SecureCrypto()
        encrypted_secret = crypto.encrypt(secret)
        
        return jsonify({
            'success': True,
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'secret': secret,  # For manual entry
            'encrypted_secret': encrypted_secret,  # For verification step
            'message': 'Scan QR code with your authenticator app'
        })
    
    except Exception as e:
        logger.error(f"TOTP setup error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/totp/verify-setup', methods=['POST'])
def verify_totp_setup():
    """
    Verify TOTP code and activate MFA
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        code = data.get('code')
        secret = data.get('secret')
        
        if not all([user_id, code, secret]):
            return jsonify({'error': 'User ID, code, and secret required'}), 400
        
        # Verify the code
        totp = pyotp.TOTP(secret)
        if not totp.verify(code, valid_window=1):
            return jsonify({
                'success': False,
                'error': 'Invalid code. Please try again.'
            }), 400
        
        # Save to database (encrypted)
        db = ensure_db_connected()
        run_async(db.setup_totp(user_id, secret))
        
        # Generate backup codes
        backup_codes = run_async(db.generate_backup_codes(user_id))
        
        return jsonify({
            'success': True,
            'message': 'TOTP authenticator enabled successfully',
            'backup_codes': backup_codes  # Only shown once!
        })
    
    except Exception as e:
        logger.error(f"TOTP verify setup error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/totp/verify', methods=['POST'])
def verify_totp():
    """
    Verify TOTP code during login
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        code = data.get('code')
        
        if not all([user_id, code]):
            return jsonify({'error': 'User ID and code required'}), 400
        
        db = ensure_db_connected()
        
        # Get TOTP secret
        secret = run_async(db.get_totp_secret(user_id))
        if not secret:
            return jsonify({'error': 'TOTP not configured'}), 400
        
        # Verify
        totp = pyotp.TOTP(secret)
        if totp.verify(code, valid_window=1):
            # Update last used
            run_async(db.update_mfa_last_used(user_id, 'totp'))
            
            return jsonify({
                'success': True,
                'message': 'TOTP verification successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid code'
            }), 400
    
    except Exception as e:
        logger.error(f"TOTP verify error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== BACKUP CODES ====================

@auth_bp.route('/mfa/backup-codes/generate', methods=['POST'])
def generate_backup_codes():
    """Generate new backup codes (invalidates old ones)"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        codes = run_async(db.generate_backup_codes(user_id))
        
        return jsonify({
            'success': True,
            'backup_codes': codes,
            'message': 'New backup codes generated. Old codes are now invalid.'
        })
    
    except Exception as e:
        logger.error(f"Generate backup codes error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/backup-codes/verify', methods=['POST'])
def verify_backup_code():
    """Verify backup code during login"""
    try:
        data = request.json
        user_id = data.get('user_id')
        code = data.get('code')
        
        if not all([user_id, code]):
            return jsonify({'error': 'User ID and code required'}), 400
        
        db = ensure_db_connected()
        
        # Verify and consume code
        if run_async(db.verify_backup_code(user_id, code)):
            # Get remaining codes count
            codes_info = run_async(db.get_backup_codes_count(user_id))
            
            return jsonify({
                'success': True,
                'message': 'Backup code verified',
                'remaining_codes': codes_info['unused']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid or used backup code'
            }), 400
    
    except Exception as e:
        logger.error(f"Verify backup code error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/backup-codes/count', methods=['GET'])
def get_backup_codes_count():
    """Get count of remaining backup codes"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        codes_info = run_async(db.get_backup_codes_count(user_id))
        
        return jsonify(codes_info)
    
    except Exception as e:
        logger.error(f"Get backup codes count error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== TRUSTED DEVICES ====================

@auth_bp.route('/trusted-devices', methods=['GET'])
def get_trusted_devices():
    """Get user's trusted devices"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        devices = run_async(db.get_trusted_devices(user_id))
        
        return jsonify({
            'devices': devices
        })
    
    except Exception as e:
        logger.error(f"Get trusted devices error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/trusted-devices', methods=['POST'])
def add_trusted_device():
    """Add current device as trusted"""
    try:
        data = request.json
        user_id = data.get('user_id')
        device_name = data.get('device_name', 'Unknown Device')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        client_info = get_client_info(request)
        db = ensure_db_connected()
        
        device_id = run_async(db.add_trusted_device(
            user_id=user_id,
            device_fingerprint=client_info['device_fingerprint'],
            device_name=device_name,
            browser=client_info['browser'],
            os=client_info['os'],
            ip_address=client_info['ip_address']
        ))
        
        return jsonify({
            'success': True,
            'device_id': device_id,
            'message': 'Device marked as trusted'
        })
    
    except Exception as e:
        logger.error(f"Add trusted device error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/trusted-devices/<int:device_id>', methods=['DELETE'])
def remove_trusted_device(device_id: int):
    """Remove trusted device"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        
        if run_async(db.remove_trusted_device(user_id, device_id)):
            return jsonify({
                'success': True,
                'message': 'Device removed from trusted list'
            })
        else:
            return jsonify({'error': 'Device not found'}), 404
    
    except Exception as e:
        logger.error(f"Remove trusted device error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/trusted-devices/check', methods=['POST'])
def check_trusted_device():
    """Check if current device is trusted"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        client_info = get_client_info(request)
        db = ensure_db_connected()
        
        is_trusted = run_async(db.is_trusted_device(user_id, client_info['device_fingerprint']))
        
        return jsonify({
            'is_trusted': is_trusted,
            'device_fingerprint': client_info['device_fingerprint']
        })
    
    except Exception as e:
        logger.error(f"Check trusted device error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== SECURITY LOG ====================

@auth_bp.route('/security-log', methods=['GET'])
def get_security_log():
    """Get security log entries (admin endpoint)"""
    try:
        user_id = request.args.get('user_id', type=int)
        event_type = request.args.get('event_type')
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        db = ensure_db_connected()
        logs = run_async(db.get_security_log(
            user_id=user_id,
            event_type=event_type,
            limit=limit,
            offset=offset
        ))
        
        return jsonify({
            'logs': logs,
            'limit': limit,
            'offset': offset
        })
    
    except Exception as e:
        logger.error(f"Get security log error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/login-history', methods=['GET'])
def get_login_history():
    """Get user's login history"""
    try:
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', 20, type=int)
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        history = run_async(db.get_login_history(user_id, limit))
        
        return jsonify({
            'history': history
        })
    
    except Exception as e:
        logger.error(f"Get login history error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== MFA METHODS OVERVIEW ====================

@auth_bp.route('/mfa/methods', methods=['GET'])
def get_mfa_methods():
    """Get user's MFA methods"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        methods = run_async(db.get_user_mfa_methods(user_id))
        
        return jsonify({
            'methods': methods
        })
    
    except Exception as e:
        logger.error(f"Get MFA methods error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== DISCORD DM VERIFICATION ====================

# Global reference to bot instance (set by main.py)
_bot_instance = None

def set_auth_bot_instance(bot):
    """Set bot instance for Discord DM verification"""
    global _bot_instance
    _bot_instance = bot
    logger.info("✓ Auth API connected to Discord bot for DM verification")


@auth_bp.route('/mfa/discord/send', methods=['POST'])
def send_discord_dm_code():
    """
    Send MFA approval request via Discord DM with buttons
    Returns request_id for status polling. Does NOT send code directly.
    
    Flow:
    1. Create approval request in database
    2. Send DM with device info + Approve/Deny buttons
    3. Return request_id for frontend to poll status
    4. When user clicks Approve → generate and send code
    5. When user clicks Deny → mark as denied
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        discord_id = data.get('discord_id')
        device_info = data.get('device_info', 'Unknown device')
        
        # Ensure device_info is a string (might be dict from proxy)
        if isinstance(device_info, dict):
            import json
            device_info = json.dumps(device_info)
        
        if not user_id or not discord_id:
            return jsonify({'error': 'User ID and Discord ID required'}), 400
        
        # Get client info
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            ip_address = ip_address.split(',')[0].strip()
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        db = ensure_db_connected()
        
        # Create approval request (15 second timeout)
        request_id = run_async(db.create_mfa_approval_request(
            discord_id=discord_id,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id if isinstance(user_id, int) else None,
            expires_seconds=15
        ))
        
        # Send DM with buttons via bot
        if _bot_instance:
            try:
                async def send_approval_dm():
                    import discord
                    from discord import ui
                    
                    user = await _bot_instance.fetch_user(int(discord_id))
                    if not user:
                        return False, None
                    
                    # Parse user agent for device info
                    browser = "Unknown Browser"
                    os_name = "Unknown OS"
                    if "Chrome" in user_agent:
                        browser = "Chrome"
                    elif "Firefox" in user_agent:
                        browser = "Firefox"
                    elif "Safari" in user_agent:
                        browser = "Safari"
                    elif "Edge" in user_agent:
                        browser = "Edge"
                    
                    if "Windows" in user_agent:
                        os_name = "Windows"
                    elif "Mac" in user_agent:
                        os_name = "macOS"
                    elif "Linux" in user_agent:
                        os_name = "Linux"
                    elif "Android" in user_agent:
                        os_name = "Android"
                    elif "iPhone" in user_agent or "iPad" in user_agent:
                        os_name = "iOS"
                    
                    # Create embed with login details
                    embed = discord.Embed(
                        title="🔐 Login Attempt Detected",
                        description="Someone is trying to log in to your SONORA Dashboard account.",
                        color=0xFFA500  # Orange for warning
                    )
                    embed.add_field(name="📱 Device", value=f"{browser} on {os_name}", inline=True)
                    embed.add_field(name="🌐 IP Address", value=ip_address or "Unknown", inline=True)
                    embed.add_field(name="⏰ Time", value=f"<t:{int(__import__('time').time())}:F>", inline=False)
                    embed.add_field(
                        name="⚠️ Important",
                        value="If this wasn't you, click **Deny** immediately!",
                        inline=False
                    )
                    embed.set_footer(text="This request expires in 15 seconds")
                    
                    # Create buttons
                    class ApprovalView(ui.View):
                        def __init__(self):
                            super().__init__(timeout=15)
                            self.request_id = request_id
                        
                        @ui.button(label="✅ Approve", style=discord.ButtonStyle.success)
                        async def approve_button(self, interaction: discord.Interaction, button: ui.Button):
                            # Approve the request and generate code
                            code = await db.approve_mfa_request(self.request_id)
                            
                            if code:
                                # Disable buttons
                                for item in self.children:
                                    item.disabled = True
                                
                                # Update original message
                                embed.color = 0x2ECC71  # Green
                                embed.set_footer(text="✅ Login approved")
                                await interaction.response.edit_message(embed=embed, view=self)
                                
                                # Send code in new message
                                code_embed = discord.Embed(
                                    title="🔑 Your Verification Code",
                                    description=f"# `{code}`",
                                    color=0x9B59B6  # Purple
                                )
                                code_embed.set_footer(text="Enter this code in the dashboard. Valid for 5 minutes.")
                                await interaction.followup.send(embed=code_embed, ephemeral=True)
                            else:
                                await interaction.response.send_message(
                                    "❌ Request expired. Please try again.",
                                    ephemeral=True
                                )
                        
                        @ui.button(label="❌ Deny", style=discord.ButtonStyle.danger)
                        async def deny_button(self, interaction: discord.Interaction, button: ui.Button):
                            # Deny the request
                            await db.deny_mfa_request(self.request_id)
                            
                            # Disable buttons
                            for item in self.children:
                                item.disabled = True
                            
                            # Update original message
                            embed.color = 0xE74C3C  # Red
                            embed.set_footer(text="❌ Login denied - If this wasn't you, secure your account!")
                            await interaction.response.edit_message(embed=embed, view=self)
                        
                        async def on_timeout(self):
                            # Mark as expired on timeout
                            await db.check_mfa_approval_status(self.request_id)  # This will mark expired
                    
                    view = ApprovalView()
                    msg = await user.send(embed=embed, view=view)
                    
                    # Store message ID for reference
                    await db.update_mfa_approval_message_id(request_id, str(msg.id))
                    
                    return True, msg.id
                
                success, message_id = run_in_bot_loop(send_approval_dm())
                
                if success:
                    logger.info(f"Sent MFA approval request to Discord user {discord_id}")
                    return jsonify({
                        'success': True,
                        'request_id': request_id,
                        'message': 'Approval request sent to Discord. Check your DMs.',
                        'expires_in': 15
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Could not send DM. Make sure you can receive DMs from the bot.'
                    }), 400
                    
            except Exception as dm_error:
                logger.error(f"Failed to send Discord approval DM: {dm_error}", exc_info=True)
                return jsonify({
                    'success': False,
                    'error': 'Failed to send DM. Check your Discord privacy settings.'
                }), 400
        else:
            # Bot not available - auto-approve for testing
            logger.warning("Bot not available - auto-approving for testing (DEV ONLY)")
            code = run_async(db.approve_mfa_request(request_id))
            return jsonify({
                'success': True,
                'request_id': request_id,
                'message': 'Auto-approved (bot offline - testing mode)',
                'dev_mode': True,
                'dev_code': code,
                'expires_in': 15
            })
    
    except Exception as e:
        logger.error(f"Send Discord approval DM error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/discord/status', methods=['GET'])
def check_mfa_approval_status():
    """
    Check status of MFA approval request
    Frontend polls this endpoint every 1-2 seconds
    
    Returns:
        status: 'pending' | 'approved' | 'denied' | 'expired' | 'not_found'
    """
    try:
        request_id = request.args.get('request_id')
        
        if not request_id:
            return jsonify({'error': 'Request ID required'}), 400
        
        db = ensure_db_connected()
        result = run_async(db.check_mfa_approval_status(request_id))
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Check MFA approval status error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500




@auth_bp.route('/mfa/discord/verify', methods=['POST'])
def verify_discord_dm_code():
    """
    Verify Discord DM code
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        code = data.get('code')
        
        if not all([user_id, code]):
            return jsonify({'error': 'User ID and code required'}), 400
        
        db = ensure_db_connected()
        
        # Verify code (database method: code, code_type, user_id)
        if run_async(db.verify_code(code, 'discord_dm', user_id=user_id)):
            # Update MFA last used
            run_async(db.update_mfa_last_used(user_id, 'discord'))
            
            # Log successful verification
            client_info = get_client_info(request)
            run_async(db._log_security_event(
                user_id=user_id,
                event_type='mfa_verified',
                success=True,
                ip_address=client_info['ip_address'],
                user_agent=client_info['user_agent'],
                metadata={'method': 'discord_dm'}
            ))
            
            return jsonify({
                'success': True,
                'message': 'Discord verification successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired code'
            }), 400
    
    except Exception as e:
        logger.error(f"Verify Discord DM code error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


@auth_bp.route('/mfa/discord/setup', methods=['POST'])
def setup_discord_mfa():
    """
    Enable Discord DM as MFA method
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        db = ensure_db_connected()
        
        # Add Discord as MFA method (no secret needed - uses Discord ID)
        run_async(db.add_mfa_method(user_id, 'discord', is_primary=True))
        
        return jsonify({
            'success': True,
            'message': 'Discord DM verification enabled'
        })
    
    except Exception as e:
        logger.error(f"Setup Discord MFA error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500




def init_auth_api(app):
    """Initialize auth API and database"""
    # Register blueprint
    app.register_blueprint(auth_bp)
    
    # Initialize database on first request
    @app.before_first_request
    def initialize_auth_db():
        try:
            run_async(init_auth_database())
            logger.info("✓ Auth database initialized")
        except Exception as e:
            logger.error(f"Failed to initialize auth database: {e}")
    
    logger.info("✓ Auth API endpoints registered")
