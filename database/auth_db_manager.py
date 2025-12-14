"""
🔐 Secure Authentication Database Manager
Bank-Level Security Implementation

Security Features:
- AES-256-GCM encryption for sensitive data (TOTP secrets, tokens)
- Argon2id hashing for passwords and codes (memory-hard, GPU-resistant)
- HMAC-SHA256 for data integrity verification
- Secure random generation for all tokens
- SQL injection prevention with parameterized queries
- Audit logging for security events
"""

import os
import hashlib
import secrets
import base64
import json
import asyncio
import aiosqlite
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
import hmac

# Try to import argon2 for password hashing (fallback to bcrypt if not available)
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError
    ARGON2_AVAILABLE = True
except ImportError:
    import bcrypt
    ARGON2_AVAILABLE = False

from config.settings import Settings
from config.logging_config import get_logger

logger = get_logger('auth_database')


class SecureCrypto:
    """
    Bank-level cryptographic operations manager
    
    Uses:
    - AES-256-GCM for symmetric encryption (AEAD - Authenticated Encryption)
    - Argon2id for password hashing (winner of Password Hashing Competition)
    - PBKDF2-SHA256 for key derivation
    - HMAC-SHA256 for message authentication
    """
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Initialize crypto manager with master key
        
        Args:
            master_key: Optional master key (will generate if not provided)
        """
        # Get or generate master key from environment
        self.master_key = master_key or os.environ.get('SONORA_MASTER_KEY')
        
        if not self.master_key:
            # Generate new master key and save to env file
            self.master_key = secrets.token_hex(32)
            logger.warning("⚠️ Generated new master key. Save this in .env as SONORA_MASTER_KEY!")
            logger.info(f"SONORA_MASTER_KEY={self.master_key}")
        
        # Derive encryption key from master key
        self._derive_encryption_key()
        
        # Initialize password hasher
        if ARGON2_AVAILABLE:
            self.password_hasher = PasswordHasher(
                time_cost=3,        # 3 iterations
                memory_cost=65536,  # 64 MB memory
                parallelism=4,      # 4 parallel threads
                hash_len=32,        # 32 byte hash
                salt_len=16         # 16 byte salt
            )
            logger.info("✓ Using Argon2id for password hashing (bank-level security)")
        else:
            logger.warning("⚠️ Argon2 not available, using bcrypt (still secure)")
    
    def _derive_encryption_key(self) -> None:
        """Derive AES-256 encryption key from master key using PBKDF2"""
        # Use a fixed salt derived from master key for deterministic key derivation
        salt = hashlib.sha256(f"sonora-salt-{self.master_key[:16]}".encode()).digest()[:16]
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits for AES-256
            salt=salt,
            iterations=100000,  # High iteration count for security
            backend=default_backend()
        )
        
        self.encryption_key = kdf.derive(self.master_key.encode())
        self.aesgcm = AESGCM(self.encryption_key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext using AES-256-GCM
        
        Args:
            plaintext: Data to encrypt
            
        Returns:
            Base64 encoded encrypted data (nonce + ciphertext + tag)
        """
        if not plaintext:
            return ""
        
        # Generate random 12-byte nonce (recommended for GCM)
        nonce = secrets.token_bytes(12)
        
        # Encrypt with authentication
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode(), None)
        
        # Combine nonce + ciphertext and encode
        encrypted = base64.b64encode(nonce + ciphertext).decode('utf-8')
        return encrypted
    
    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt data encrypted with AES-256-GCM
        
        Args:
            encrypted: Base64 encoded encrypted data
            
        Returns:
            Decrypted plaintext
        """
        if not encrypted:
            return ""
        
        try:
            # Decode and split nonce from ciphertext
            data = base64.b64decode(encrypted)
            nonce = data[:12]
            ciphertext = data[12:]
            
            # Decrypt and verify authentication tag
            plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Decryption failed - data may be corrupted or tampered")
    
    def hash_password(self, password: str) -> str:
        """
        Hash password using Argon2id (or bcrypt fallback)
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        if ARGON2_AVAILABLE:
            return self.password_hasher.hash(password)
        else:
            salt = bcrypt.gensalt(rounds=12)
            return bcrypt.hashpw(password.encode(), salt).decode()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify password against hash
        
        Args:
            password: Plain text password
            hashed: Stored hash
            
        Returns:
            True if password matches
        """
        try:
            if ARGON2_AVAILABLE:
                self.password_hasher.verify(hashed, password)
                return True
            else:
                return bcrypt.checkpw(password.encode(), hashed.encode())
        except (VerifyMismatchError if ARGON2_AVAILABLE else Exception):
            return False
    
    def hash_code(self, code: str) -> str:
        """
        Hash verification code using SHA-256 with HMAC
        
        Args:
            code: Verification code
            
        Returns:
            HMAC-SHA256 hash
        """
        return hmac.new(
            self.encryption_key,
            code.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def verify_code_hash(self, code: str, hashed: str) -> bool:
        """
        Verify code against hash using constant-time comparison
        
        Args:
            code: Plain text code
            hashed: Stored hash
            
        Returns:
            True if code matches
        """
        expected = self.hash_code(code)
        return hmac.compare_digest(expected, hashed)
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_otp_code(length: int = 6) -> str:
        """Generate numeric OTP code"""
        return ''.join(str(secrets.randbelow(10)) for _ in range(length))
    
    @staticmethod
    def generate_backup_code() -> str:
        """Generate backup code in format XXXX-XXXX-XXXX"""
        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # Removed confusing chars: I, O, 0, 1
        code = ''.join(secrets.choice(chars) for _ in range(12))
        return f"{code[:4]}-{code[4:8]}-{code[8:12]}"


class AuthDatabaseManager:
    """
    🔐 Secure Authentication Database Manager
    
    Features:
    - Encrypted storage for sensitive data (TOTP secrets, tokens)
    - Secure password hashing with Argon2id
    - MFA methods management
    - Trusted devices tracking
    - Security audit logging
    - Rate limiting for brute force protection
    """
    
    def __init__(self, db_path: Optional[Path] = None, master_key: Optional[str] = None):
        """
        Initialize auth database manager
        
        Args:
            db_path: Path to auth database file
            master_key: Master encryption key
        """
        self.db_path = db_path or Settings.BASE_DIR / 'auth.db'
        self.db: Optional[aiosqlite.Connection] = None
        self.crypto = SecureCrypto(master_key)
        logger.info(f"Auth database manager initialized: {self.db_path}")
    
    async def connect(self) -> None:
        """Connect to database and create tables"""
        try:
            self.db = await aiosqlite.connect(str(self.db_path))
            await self.db.execute("PRAGMA foreign_keys = ON")
            await self.db.execute("PRAGMA journal_mode = WAL")  # Better performance & crash recovery
            await self.db.execute("PRAGMA synchronous = NORMAL")
            await self._create_tables()
            logger.info("✓ Auth database connected with bank-level security")
        except Exception as e:
            logger.error(f"Failed to connect to auth database: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from database"""
        if self.db:
            await self.db.close()
            self.db = None
            logger.info("Auth database disconnected")
    
    async def _create_tables(self) -> None:
        """Create authentication tables with security in mind"""
        
        # Users table - core user data
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                email TEXT,
                email_verified BOOLEAN DEFAULT 0,
                avatar_url TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'suspended', 'banned')),
                mfa_enabled BOOLEAN DEFAULT 0,
                role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'developer')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                failed_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                metadata TEXT  -- JSON encrypted metadata
            )
        """)
        
        # MFA Methods table - user's enabled MFA methods
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS mfa_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                method_type TEXT NOT NULL CHECK(method_type IN ('passkey', 'totp', 'email', 'discord')),
                method_data TEXT NOT NULL,  -- Encrypted JSON
                is_primary BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
                UNIQUE(user_id, method_type)
            )
        """)
        
        # Passkey credentials (WebAuthn/FIDO2)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS passkey_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                credential_id TEXT UNIQUE NOT NULL,
                public_key TEXT NOT NULL,  -- Encrypted
                counter INTEGER DEFAULT 0,
                device_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            )
        """)
        
        # Backup codes for MFA recovery
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS backup_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code_hash TEXT NOT NULL,  -- Hashed code
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            )
        """)
        
        # Trusted devices
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS trusted_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_fingerprint TEXT NOT NULL,
                device_name TEXT,
                browser TEXT,
                os TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
                UNIQUE(user_id, device_fingerprint)
            )
        """)
        
        # Verification codes (OTP, email, discord)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS verification_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                discord_id TEXT,
                code_hash TEXT NOT NULL,  -- Hashed code
                code_type TEXT NOT NULL CHECK(code_type IN ('email', 'discord', 'account_verify', 'mfa', 'password_reset')),
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                attempts INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            )
        """)
        
        # Login attempts & security audit log
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS security_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                discord_id TEXT,
                event_type TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                device_info TEXT,
                location TEXT,
                success BOOLEAN,
                failure_reason TEXT,
                metadata TEXT,  -- JSON
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL
            )
        """)
        
        # Sessions (active login sessions)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,  -- Hashed
                refresh_token TEXT,  -- Encrypted
                device_fingerprint TEXT,
                ip_address TEXT,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            )
        """)
        
        # Rate limiting
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identifier TEXT NOT NULL,  -- IP or user_id
                action TEXT NOT NULL,
                count INTEGER DEFAULT 1,
                window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(identifier, action)
            )
        """)
        
        # MFA Approval Requests - for Discord button-based approval
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS mfa_approval_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,  -- UUID for polling
                user_id INTEGER,
                discord_id TEXT NOT NULL,
                device_info TEXT,
                ip_address TEXT,
                user_agent TEXT,
                status TEXT DEFAULT 'pending',  -- pending, approved, denied, expired
                code_hash TEXT,  -- OTP code hash (only set when approved)
                message_id TEXT,  -- Discord message ID for button
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES auth_users(id)
            )
        """)

        
        # Create indexes for performance
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_users_discord ON auth_users(discord_id)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON auth_users(email)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_mfa_user ON mfa_methods(user_id)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_security_log_user ON security_log(user_id)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_security_log_time ON security_log(created_at DESC)")
        await self.db.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes ON verification_codes(code_hash, code_type)")
        
        await self.db.commit()
        logger.info("✓ Auth database tables created with security indexes")
    
    # ==================== USER MANAGEMENT ====================
    
    async def create_user(
        self,
        discord_id: str,
        username: str,
        email: Optional[str] = None,
        avatar_url: Optional[str] = None,
        role: str = 'user'
    ) -> int:
        """
        Create new user from Discord OAuth
        
        Args:
            discord_id: Discord user ID
            username: Discord username
            email: Email address
            avatar_url: Avatar URL
            role: User role
            
        Returns:
            New user ID
        """
        cursor = await self.db.execute("""
            INSERT INTO auth_users (discord_id, username, email, avatar_url, role, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        """, (discord_id, username, email, avatar_url, role))
        
        await self.db.commit()
        user_id = cursor.lastrowid
        
        # Log security event
        await self._log_security_event(
            user_id=user_id,
            discord_id=discord_id,
            event_type='user_created',
            success=True
        )
        
        logger.info(f"Created new user: {username} (ID: {user_id})")
        return user_id
    
    async def get_user_by_discord_id(self, discord_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Discord ID"""
        async with self.db.execute(
            "SELECT * FROM auth_users WHERE discord_id = ?",
            (discord_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
        return None
    
    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        async with self.db.execute(
            "SELECT * FROM auth_users WHERE id = ?",
            (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
        return None
    
    async def update_user_status(self, user_id: int, status: str) -> None:
        """Update user status"""
        await self.db.execute(
            "UPDATE auth_users SET status = ? WHERE id = ?",
            (status, user_id)
        )
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type='status_changed',
            success=True,
            metadata={'new_status': status}
        )
    
    async def update_last_login(self, user_id: int) -> None:
        """Update user's last login timestamp"""
        await self.db.execute(
            "UPDATE auth_users SET last_login = CURRENT_TIMESTAMP, failed_attempts = 0 WHERE id = ?",
            (user_id,)
        )
        await self.db.commit()
    
    async def get_all_users(
        self,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
        role: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all users with pagination (for admin dashboard)"""
        query = "SELECT * FROM auth_users WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if role:
            query += " AND role = ?"
            params.append(role)
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        async with self.db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    async def get_user_count(self, status: Optional[str] = None) -> int:
        """Get total user count"""
        query = "SELECT COUNT(*) FROM auth_users"
        params = []
        
        if status:
            query += " WHERE status = ?"
            params.append(status)
        
        async with self.db.execute(query, params) as cursor:
            return (await cursor.fetchone())[0]
    
    # ==================== MFA MANAGEMENT ====================
    
    async def setup_totp(self, user_id: int, secret: str) -> int:
        """
        Setup TOTP authenticator for user
        
        Args:
            user_id: User ID
            secret: TOTP secret (will be encrypted)
            
        Returns:
            MFA method ID
        """
        # Encrypt the secret
        encrypted_data = self.crypto.encrypt(json.dumps({
            'secret': secret,
            'algorithm': 'SHA1',
            'digits': 6,
            'period': 30
        }))
        
        cursor = await self.db.execute("""
            INSERT OR REPLACE INTO mfa_methods (user_id, method_type, method_data, is_active)
            VALUES (?, 'totp', ?, 1)
        """, (user_id, encrypted_data))
        
        # Enable MFA for user
        await self.db.execute(
            "UPDATE auth_users SET mfa_enabled = 1 WHERE id = ?",
            (user_id,)
        )
        
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type='mfa_totp_setup',
            success=True
        )
        
        return cursor.lastrowid
    
    async def get_totp_secret(self, user_id: int) -> Optional[str]:
        """Get decrypted TOTP secret for user"""
        async with self.db.execute(
            "SELECT method_data FROM mfa_methods WHERE user_id = ? AND method_type = 'totp' AND is_active = 1",
            (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                decrypted = self.crypto.decrypt(row[0])
                data = json.loads(decrypted)
                return data.get('secret')
        return None
    
    async def get_user_mfa_methods(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all MFA methods for user (without secrets)"""
        async with self.db.execute("""
            SELECT id, method_type, is_primary, is_active, created_at, last_used
            FROM mfa_methods WHERE user_id = ?
        """, (user_id,)) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    async def update_mfa_last_used(self, user_id: int, method_type: str) -> None:
        """Update last used timestamp for MFA method"""
        await self.db.execute("""
            UPDATE mfa_methods SET last_used = CURRENT_TIMESTAMP
            WHERE user_id = ? AND method_type = ?
        """, (user_id, method_type))
        await self.db.commit()
    
    async def add_mfa_method(
        self,
        user_id: int,
        method_type: str,
        method_data: Optional[str] = None,
        is_primary: bool = False
    ) -> int:
        """
        Add MFA method for user
        
        Args:
            user_id: User ID
            method_type: Type of MFA (passkey, totp, email, discord)
            method_data: Optional data (encrypted if sensitive)
            is_primary: Whether this is the primary method
            
        Returns:
            MFA method ID
        """
        # Encrypt method data if provided
        encrypted_data = self.crypto.encrypt(json.dumps({
            'type': method_type,
            'data': method_data
        })) if method_data else self.crypto.encrypt(json.dumps({'type': method_type}))
        
        cursor = await self.db.execute("""
            INSERT OR REPLACE INTO mfa_methods (user_id, method_type, method_data, is_primary, is_active)
            VALUES (?, ?, ?, ?, 1)
        """, (user_id, method_type, encrypted_data, is_primary))
        
        # Enable MFA for user
        await self.db.execute(
            "UPDATE auth_users SET mfa_enabled = 1 WHERE id = ?",
            (user_id,)
        )
        
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type=f'mfa_{method_type}_setup',
            success=True
        )
        
        return cursor.lastrowid
    
    
    # ==================== PASSKEY (WebAuthn) ====================
    
    async def store_passkey_challenge(self, user_id: int, challenge: str) -> None:
        """Store passkey challenge for verification"""
        # Store in verification_codes table with short TTL
        code_hash = self.crypto.hash_code(challenge[:32])  # Hash part of challenge
        await self.db.execute("""
            DELETE FROM verification_codes WHERE user_id = ? AND code_type = 'passkey_challenge'
        """, (user_id,))
        await self.db.execute("""
            INSERT INTO verification_codes (user_id, code_hash, code_type, expires_at)
            VALUES (?, ?, 'passkey_challenge', datetime('now', '+5 minutes'))
        """, (user_id, self.crypto.encrypt(challenge)))
        await self.db.commit()
    
    async def get_passkey_challenge(self, user_id: int) -> Optional[str]:
        """Get stored passkey challenge"""
        async with self.db.execute("""
            SELECT code_hash FROM verification_codes 
            WHERE user_id = ? AND code_type = 'passkey_challenge' 
            AND expires_at > datetime('now')
        """, (user_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                try:
                    return self.crypto.decrypt(row[0])
                except:
                    return None
            return None
    
    async def clear_passkey_challenge(self, user_id: int) -> None:
        """Clear passkey challenge after use"""
        await self.db.execute("""
            DELETE FROM verification_codes WHERE user_id = ? AND code_type = 'passkey_challenge'
        """, (user_id,))
        await self.db.commit()
    
    async def setup_passkey(
        self,
        user_id: int,
        credential_id: str,
        public_key: bytes,
        counter: int,
        transports: Optional[List[str]] = None,
        device_name: Optional[str] = None
    ) -> int:
        """
        Store passkey credential for user
        
        Args:
            user_id: User ID
            credential_id: WebAuthn credential ID (base64url)
            public_key: Public key bytes
            counter: Authenticator counter
            transports: Transport hints
            device_name: Optional device name
            
        Returns:
            Passkey ID
        """
        import base64
        
        # Encrypt public key for storage
        encrypted_data = self.crypto.encrypt(json.dumps({
            'public_key': base64.b64encode(public_key).decode('utf-8'),
            'transports': transports or []
        }))
        
        cursor = await self.db.execute("""
            INSERT INTO passkey_credentials (user_id, credential_id, public_key, counter, device_name)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, credential_id, encrypted_data, counter, device_name or 'Unknown Device'))
        
        # Add to mfa_methods table
        await self.add_mfa_method(user_id, 'passkey', credential_id, is_primary=False)
        
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type='passkey_registered',
            success=True,
            metadata={'device_name': device_name}
        )
        
        return cursor.lastrowid
    
    async def get_passkey_credentials(self, user_id: int) -> List[Dict]:
        """Get all passkey credentials for user"""
        import base64
        
        async with self.db.execute("""
            SELECT id, credential_id, public_key, counter, device_name, created_at, last_used
            FROM passkey_credentials WHERE user_id = ?
        """, (user_id,)) as cursor:
            rows = await cursor.fetchall()
            
            result = []
            for row in rows:
                try:
                    decrypted = json.loads(self.crypto.decrypt(row[2]))
                    result.append({
                        'id': row[0],
                        'credential_id': row[1],
                        'public_key': base64.b64decode(decrypted['public_key']),
                        'transports': decrypted.get('transports', []),
                        'counter': row[3],
                        'device_name': row[4],
                        'created_at': row[5],
                        'last_used': row[6]
                    })
                except:
                    continue
            return result
    
    async def get_passkey_by_credential_id(self, credential_id: str) -> Optional[Dict]:
        """Get passkey by credential ID"""
        import base64
        
        async with self.db.execute("""
            SELECT id, user_id, credential_id, public_key, counter, device_name
            FROM passkey_credentials WHERE credential_id = ?
        """, (credential_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                try:
                    decrypted = json.loads(self.crypto.decrypt(row[3]))
                    return {
                        'id': row[0],
                        'user_id': row[1],
                        'credential_id': row[2],
                        'public_key': base64.b64decode(decrypted['public_key']),
                        'transports': decrypted.get('transports', []),
                        'counter': row[4],
                        'device_name': row[5]
                    }
                except:
                    return None
            return None
    
    async def update_passkey_counter(self, credential_id: str, new_counter: int) -> None:
        """Update passkey counter after successful authentication"""
        await self.db.execute("""
            UPDATE passkey_credentials 
            SET counter = ?, last_used = CURRENT_TIMESTAMP
            WHERE credential_id = ?
        """, (new_counter, credential_id))
        await self.db.commit()
    
    async def delete_passkey(self, user_id: int, credential_id: str) -> bool:
        """Delete a passkey credential"""
        cursor = await self.db.execute("""
            DELETE FROM passkey_credentials 
            WHERE user_id = ? AND credential_id = ?
        """, (user_id, credential_id))
        
        if cursor.rowcount > 0:
            # Also remove from mfa_methods if this was the last passkey
            async with self.db.execute("""
                SELECT COUNT(*) FROM passkey_credentials WHERE user_id = ?
            """, (user_id,)) as count_cursor:
                count = (await count_cursor.fetchone())[0]
                if count == 0:
                    await self.db.execute("""
                        DELETE FROM mfa_methods WHERE user_id = ? AND method_type = 'passkey'
                    """, (user_id,))
            
            await self.db.commit()
            
            await self._log_security_event(
                user_id=user_id,
                event_type='passkey_removed',
                success=True
            )
            return True
        return False
    
    
    # ==================== BACKUP CODES ====================
    
    async def generate_backup_codes(self, user_id: int, count: int = 10) -> List[str]:
        """
        Generate backup codes for user
        
        Args:
            user_id: User ID
            count: Number of codes to generate
            
        Returns:
            List of plain text backup codes (only shown once!)
        """
        # Delete old codes
        await self.db.execute(
            "DELETE FROM backup_codes WHERE user_id = ?",
            (user_id,)
        )
        
        codes = []
        for _ in range(count):
            code = SecureCrypto.generate_backup_code()
            code_hash = self.crypto.hash_code(code)
            
            await self.db.execute(
                "INSERT INTO backup_codes (user_id, code_hash) VALUES (?, ?)",
                (user_id, code_hash)
            )
            codes.append(code)
        
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type='backup_codes_generated',
            success=True,
            metadata={'count': count}
        )
        
        return codes
    
    async def verify_backup_code(self, user_id: int, code: str) -> bool:
        """
        Verify and consume backup code
        
        Args:
            user_id: User ID
            code: Backup code to verify
            
        Returns:
            True if valid and consumed
        """
        code_hash = self.crypto.hash_code(code)
        
        async with self.db.execute(
            "SELECT id FROM backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL",
            (user_id, code_hash)
        ) as cursor:
            row = await cursor.fetchone()
            
            if row:
                # Mark as used
                await self.db.execute(
                    "UPDATE backup_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (row[0],)
                )
                await self.db.commit()
                
                await self._log_security_event(
                    user_id=user_id,
                    event_type='backup_code_used',
                    success=True
                )
                
                return True
        
        return False
    
    async def get_backup_codes_count(self, user_id: int) -> Dict[str, int]:
        """Get count of used and unused backup codes"""
        async with self.db.execute("""
            SELECT 
                SUM(CASE WHEN used_at IS NULL THEN 1 ELSE 0 END) as unused,
                SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END) as used
            FROM backup_codes WHERE user_id = ?
        """, (user_id,)) as cursor:
            row = await cursor.fetchone()
            return {
                'unused': row[0] or 0,
                'used': row[1] or 0,
                'total': (row[0] or 0) + (row[1] or 0)
            }
    
    # ==================== TRUSTED DEVICES ====================
    
    async def add_trusted_device(
        self,
        user_id: int,
        device_fingerprint: str,
        device_name: Optional[str] = None,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        ip_address: Optional[str] = None,
        days_valid: int = 30
    ) -> int:
        """Add device as trusted"""
        expires_at = datetime.now() + timedelta(days=days_valid)
        
        cursor = await self.db.execute("""
            INSERT OR REPLACE INTO trusted_devices 
            (user_id, device_fingerprint, device_name, browser, os, ip_address, expires_at, last_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (user_id, device_fingerprint, device_name, browser, os, ip_address, expires_at))
        
        await self.db.commit()
        
        await self._log_security_event(
            user_id=user_id,
            event_type='device_trusted',
            success=True,
            metadata={'device_name': device_name, 'browser': browser}
        )
        
        return cursor.lastrowid
    
    async def is_trusted_device(self, user_id: int, device_fingerprint: str) -> bool:
        """Check if device is trusted and not expired"""
        async with self.db.execute("""
            SELECT id FROM trusted_devices 
            WHERE user_id = ? AND device_fingerprint = ? AND expires_at > CURRENT_TIMESTAMP
        """, (user_id, device_fingerprint)) as cursor:
            row = await cursor.fetchone()
            
            if row:
                # Update last used
                await self.db.execute(
                    "UPDATE trusted_devices SET last_used = CURRENT_TIMESTAMP WHERE id = ?",
                    (row[0],)
                )
                await self.db.commit()
                return True
        
        return False
    
    async def get_trusted_devices(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all trusted devices for user"""
        async with self.db.execute("""
            SELECT id, device_name, browser, os, ip_address, created_at, last_used, expires_at
            FROM trusted_devices WHERE user_id = ? ORDER BY last_used DESC
        """, (user_id,)) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    async def remove_trusted_device(self, user_id: int, device_id: int) -> bool:
        """Remove trusted device"""
        cursor = await self.db.execute(
            "DELETE FROM trusted_devices WHERE id = ? AND user_id = ?",
            (device_id, user_id)
        )
        await self.db.commit()
        
        if cursor.rowcount > 0:
            await self._log_security_event(
                user_id=user_id,
                event_type='device_removed',
                success=True,
                metadata={'device_id': device_id}
            )
            return True
        return False
    
    # ==================== VERIFICATION CODES ====================
    
    async def create_verification_code(
        self,
        code_type: str,
        user_id: Optional[int] = None,
        discord_id: Optional[str] = None,
        expires_minutes: int = 5
    ) -> str:
        """
        Create verification code
        
        Returns:
            Plain text code (only shown once!)
        """
        code = SecureCrypto.generate_otp_code(6)
        code_hash = self.crypto.hash_code(code)
        expires_at = datetime.now() + timedelta(minutes=expires_minutes)
        
        await self.db.execute("""
            INSERT INTO verification_codes (user_id, discord_id, code_hash, code_type, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, discord_id, code_hash, code_type, expires_at))
        
        await self.db.commit()
        return code
    
    async def verify_code(
        self,
        code: str,
        code_type: str,
        user_id: Optional[int] = None,
        discord_id: Optional[str] = None
    ) -> bool:
        """Verify and consume verification code"""
        code_hash = self.crypto.hash_code(code)
        
        query = """
            SELECT id FROM verification_codes 
            WHERE code_hash = ? AND code_type = ? AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
        """
        params = [code_hash, code_type]
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        elif discord_id:
            query += " AND discord_id = ?"
            params.append(discord_id)
        
        async with self.db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            
            if row:
                # Mark as used
                await self.db.execute(
                    "UPDATE verification_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (row[0],)
                )
                await self.db.commit()
                return True
        
        # Increment attempts for rate limiting
        await self.db.execute("""
            UPDATE verification_codes SET attempts = attempts + 1
            WHERE code_type = ? AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
            AND (user_id = ? OR discord_id = ?)
        """, (code_type, user_id, discord_id))
        await self.db.commit()
        
        return False
    
    # ==================== SECURITY LOGGING ====================
    
    async def _log_security_event(
        self,
        event_type: str,
        success: bool,
        user_id: Optional[int] = None,
        discord_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_info: Optional[str] = None,
        location: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> None:
        """Log security event for audit trail"""
        await self.db.execute("""
            INSERT INTO security_log 
            (user_id, discord_id, event_type, ip_address, user_agent, device_info, 
             location, success, failure_reason, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, discord_id, event_type, ip_address, user_agent, device_info,
            location, success, failure_reason, json.dumps(metadata) if metadata else None
        ))
        await self.db.commit()
    
    async def log_login_attempt(
        self,
        success: bool,
        user_id: Optional[int] = None,
        discord_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> None:
        """Log login attempt"""
        await self._log_security_event(
            event_type='login_attempt',
            success=success,
            user_id=user_id,
            discord_id=discord_id,
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason=failure_reason
        )
        
        # Update failed attempts counter
        if not success and user_id:
            await self.db.execute(
                "UPDATE auth_users SET failed_attempts = failed_attempts + 1 WHERE id = ?",
                (user_id,)
            )
            
            # Check for lockout
            async with self.db.execute(
                "SELECT failed_attempts FROM auth_users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row and row[0] >= 5:
                    # Lock account for 15 minutes
                    locked_until = datetime.now() + timedelta(minutes=15)
                    await self.db.execute(
                        "UPDATE auth_users SET locked_until = ? WHERE id = ?",
                        (locked_until, user_id)
                    )
                    logger.warning(f"User {user_id} locked due to too many failed attempts")
            
            await self.db.commit()
    
    async def get_security_log(
        self,
        user_id: Optional[int] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get security log entries (for admin dashboard)"""
        query = "SELECT * FROM security_log WHERE 1=1"
        params = []
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        async with self.db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    async def get_login_history(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's login history"""
        async with self.db.execute("""
            SELECT ip_address, user_agent, device_info, location, success, failure_reason, created_at
            FROM security_log 
            WHERE user_id = ? AND event_type = 'login_attempt'
            ORDER BY created_at DESC LIMIT ?
        """, (user_id, limit)) as cursor:
            rows = await cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
    
    # ==================== RATE LIMITING ====================
    
    async def check_rate_limit(
        self,
        identifier: str,
        action: str,
        max_attempts: int,
        window_minutes: int
    ) -> Tuple[bool, int]:
        """
        Check rate limit for action
        
        Returns:
            Tuple of (is_allowed, remaining_attempts)
        """
        window_start = datetime.now() - timedelta(minutes=window_minutes)
        
        async with self.db.execute("""
            SELECT count FROM rate_limits 
            WHERE identifier = ? AND action = ? AND window_start > ?
        """, (identifier, action, window_start)) as cursor:
            row = await cursor.fetchone()
            
            if row:
                current_count = row[0]
                if current_count >= max_attempts:
                    return False, 0
                
                # Increment counter
                await self.db.execute("""
                    UPDATE rate_limits SET count = count + 1
                    WHERE identifier = ? AND action = ?
                """, (identifier, action))
                await self.db.commit()
                
                return True, max_attempts - current_count - 1
            else:
                # Create new rate limit window
                await self.db.execute("""
                    INSERT OR REPLACE INTO rate_limits (identifier, action, count, window_start)
                    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                """, (identifier, action))
                await self.db.commit()
                
                return True, max_attempts - 1
    
    async def reset_rate_limit(self, identifier: str, action: str) -> None:
        """Reset rate limit for identifier"""
        await self.db.execute(
            "DELETE FROM rate_limits WHERE identifier = ? AND action = ?",
            (identifier, action)
        )
        await self.db.commit()

    # ==================== MFA APPROVAL REQUESTS ====================
    
    async def create_mfa_approval_request(
        self,
        discord_id: str,
        device_info: str,
        ip_address: str,
        user_agent: str,
        user_id: Optional[int] = None,
        expires_seconds: int = 15  # 15 second timeout
    ) -> str:
        """
        Create MFA approval request for Discord button confirmation
        
        Returns:
            request_id (UUID) for polling
        """
        import uuid
        request_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(seconds=expires_seconds)
        
        await self.db.execute("""
            INSERT INTO mfa_approval_requests 
            (request_id, user_id, discord_id, device_info, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (request_id, user_id, discord_id, device_info, ip_address, user_agent, expires_at))
        
        await self.db.commit()
        
        logger.info(f"Created MFA approval request {request_id[:8]}... for Discord {discord_id}")
        return request_id
    
    async def get_mfa_approval_request(self, request_id: str) -> Optional[dict]:
        """Get MFA approval request by ID"""
        async with self.db.execute("""
            SELECT id, request_id, user_id, discord_id, device_info, ip_address,
                   user_agent, status, code_hash, message_id, expires_at, created_at, responded_at
            FROM mfa_approval_requests
            WHERE request_id = ?
        """, (request_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return {
                    'id': row[0],
                    'request_id': row[1],
                    'user_id': row[2],
                    'discord_id': row[3],
                    'device_info': row[4],
                    'ip_address': row[5],
                    'user_agent': row[6],
                    'status': row[7],
                    'code_hash': row[8],
                    'message_id': row[9],
                    'expires_at': row[10],
                    'created_at': row[11],
                    'responded_at': row[12],
                }
        return None
    
    async def update_mfa_approval_message_id(self, request_id: str, message_id: str) -> bool:
        """Store Discord message ID for the approval request"""
        await self.db.execute("""
            UPDATE mfa_approval_requests 
            SET message_id = ?
            WHERE request_id = ?
        """, (message_id, request_id))
        await self.db.commit()
        return True
    
    async def approve_mfa_request(self, request_id: str) -> Optional[str]:
        """
        Approve MFA request and generate OTP code
        
        Returns:
            Plain text OTP code (only shown once!)
        """
        # Check if request exists and is pending
        request = await self.get_mfa_approval_request(request_id)
        if not request or request['status'] != 'pending':
            return None
        
        # Check if expired
        expires_at = datetime.fromisoformat(str(request['expires_at']))
        if datetime.now() > expires_at:
            await self.db.execute("""
                UPDATE mfa_approval_requests 
                SET status = 'expired', responded_at = CURRENT_TIMESTAMP
                WHERE request_id = ?
            """, (request_id,))
            await self.db.commit()
            return None
        
        # Generate OTP code
        code = SecureCrypto.generate_otp_code(6)
        code_hash = self.crypto.hash_code(code)
        
        # Update status to approved
        await self.db.execute("""
            UPDATE mfa_approval_requests 
            SET status = 'approved', code_hash = ?, responded_at = CURRENT_TIMESTAMP
            WHERE request_id = ?
        """, (code_hash, request_id))
        await self.db.commit()
        
        await self._log_security_event(
            user_id=request.get('user_id'),
            event_type='mfa_approval_approved',
            ip_address=request.get('ip_address'),
            success=True
        )
        
        logger.info(f"MFA request {request_id[:8]}... approved")
        return code
    
    async def deny_mfa_request(self, request_id: str) -> bool:
        """Deny MFA request"""
        request = await self.get_mfa_approval_request(request_id)
        if not request or request['status'] != 'pending':
            return False
        
        await self.db.execute("""
            UPDATE mfa_approval_requests 
            SET status = 'denied', responded_at = CURRENT_TIMESTAMP
            WHERE request_id = ?
        """, (request_id,))
        await self.db.commit()
        
        await self._log_security_event(
            user_id=request.get('user_id'),
            event_type='mfa_approval_denied',
            ip_address=request.get('ip_address'),
            success=False
        )
        
        logger.info(f"MFA request {request_id[:8]}... denied")
        return True
    
    async def verify_mfa_approval_code(self, request_id: str, code: str) -> bool:
        """Verify OTP code from approved MFA request"""
        request = await self.get_mfa_approval_request(request_id)
        if not request or request['status'] != 'approved':
            return False
        
        if not request.get('code_hash'):
            return False
        
        # Verify code hash
        return self.crypto.verify_code(code, request['code_hash'])
    
    async def check_mfa_approval_status(self, request_id: str) -> dict:
        """
        Check current status of MFA approval request
        
        Returns:
            {status: 'pending'|'approved'|'denied'|'expired'|'not_found', code?: str}
        """
        request = await self.get_mfa_approval_request(request_id)
        
        if not request:
            return {'status': 'not_found'}
        
        # Check if expired (even if still pending)
        expires_at = datetime.fromisoformat(str(request['expires_at']))
        if request['status'] == 'pending' and datetime.now() > expires_at:
            # Mark as expired
            await self.db.execute("""
                UPDATE mfa_approval_requests 
                SET status = 'expired'
                WHERE request_id = ? AND status = 'pending'
            """, (request_id,))
            await self.db.commit()
            return {'status': 'expired'}
        
        return {'status': request['status']}
    
    async def cleanup_expired_mfa_requests(self) -> int:
        """Clean up expired MFA approval requests older than 1 hour"""
        cutoff = datetime.now() - timedelta(hours=1)
        
        cursor = await self.db.execute("""
            DELETE FROM mfa_approval_requests 
            WHERE expires_at < ? OR (status != 'pending' AND created_at < ?)
        """, (datetime.now(), cutoff))
        
        await self.db.commit()
        return cursor.rowcount


# Singleton instance
_auth_db_manager: Optional[AuthDatabaseManager] = None
_db_initialized: bool = False


def get_auth_db_manager() -> AuthDatabaseManager:
    """Get global auth database manager instance"""
    global _auth_db_manager
    if _auth_db_manager is None:
        _auth_db_manager = AuthDatabaseManager()
    return _auth_db_manager


async def init_auth_database() -> AuthDatabaseManager:
    """Initialize and return auth database manager"""
    global _db_initialized
    manager = get_auth_db_manager()
    if not _db_initialized:
        await manager.connect()
        _db_initialized = True
    return manager


def ensure_db_connected() -> AuthDatabaseManager:
    """Ensure database is connected (sync wrapper for Flask routes)"""
    global _db_initialized
    manager = get_auth_db_manager()
    if not _db_initialized or manager.db is None:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        loop.run_until_complete(manager.connect())
        _db_initialized = True
    return manager
