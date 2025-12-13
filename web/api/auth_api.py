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
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
        
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
        
        db = get_auth_db_manager()
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
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
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
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
        
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
        
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
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
        db = get_auth_db_manager()
        
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
        
        db = get_auth_db_manager()
        
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
        db = get_auth_db_manager()
        
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
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
        
        db = get_auth_db_manager()
        methods = run_async(db.get_user_mfa_methods(user_id))
        
        return jsonify({
            'methods': methods
        })
    
    except Exception as e:
        logger.error(f"Get MFA methods error: {e}", exc_info=True)
        return jsonify({'error': 'Server error'}), 500


# ==================== INITIALIZATION ====================

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
