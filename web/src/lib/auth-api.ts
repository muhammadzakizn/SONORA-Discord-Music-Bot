/**
 * 🔐 Auth API Client
 * Client-side functions to interact with Auth API
 */

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

interface AuthUser {
  id: number;
  discord_id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  mfa_enabled: boolean;
  role: string;
  created_at: string;
  last_login?: string;
}

interface CheckUserResponse {
  exists: boolean;
  user?: AuthUser;
  mfa_methods?: string[];
}

interface MFASetupResponse {
  success: boolean;
  qr_code?: string;
  secret?: string;
  encrypted_secret?: string;
  message?: string;
  error?: string;
}

interface MFAVerifyResponse {
  success: boolean;
  message?: string;
  backup_codes?: string[];
  remaining_codes?: number;
  error?: string;
}

interface TrustedDevice {
  id: number;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  created_at: string;
  last_used: string;
  expires_at: string;
}

export type { AuthUser, CheckUserResponse, MFASetupResponse, MFAVerifyResponse, TrustedDevice };

/**
 * Check if user exists in auth database
 */
export async function checkAuthUser(discordId: string): Promise<CheckUserResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/user/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Check user error:', error);
    return { exists: false };
  }
}

/**
 * Register new user from Discord OAuth
 */
export async function registerAuthUser(data: {
  discord_id: string;
  username: string;
  email?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; user_id?: number; error?: string }> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Register user error:', error);
    return { success: false, error: 'Failed to register user' };
  }
}

/**
 * Setup TOTP authenticator
 * Will try Bot API first, fallback to Next.js API route
 */
export async function setupTOTP(userId: number | string): Promise<MFASetupResponse> {
  // Try Bot API first
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, qr_code: data.qr_code, secret: data.secret };
    }
  } catch (error) {
    console.warn('Bot API TOTP setup failed, using fallback:', error);
  }
  
  // Fallback to Next.js API route
  try {
    const response = await fetch('/api/mfa/totp/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(userId) }),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, qr_code: data.qrCode, secret: data.secret };
    }
    return { success: false, error: 'Failed to setup TOTP' };
  } catch (error) {
    console.error('TOTP setup error:', error);
    return { success: false, error: 'Failed to setup TOTP' };
  }
}

/**
 * Verify TOTP setup with code from authenticator app
 * Will try Bot API first, fallback to Next.js API route
 */
export async function verifyTOTPSetup(
  userId: number | string,
  code: string,
  secret: string
): Promise<MFAVerifyResponse> {
  // Try Bot API first
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/verify-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code, secret }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Bot API TOTP verify failed, using fallback:', error);
  }
  
  // Fallback to Next.js API route
  try {
    const response = await fetch('/api/mfa/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(userId), code, secret }), // Include secret for stateless verification
    });
    if (response.ok) {
      const data = await response.json();
      // Generate mock backup codes for fallback mode
      const mockBackupCodes = Array.from({ length: 10 }, () => 
        `${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`
      );
      return { success: data.valid, backup_codes: mockBackupCodes };
    }
    return { success: false, error: 'Invalid code' };
  } catch (error) {
    console.error('TOTP verify setup error:', error);
    return { success: false, error: 'Failed to verify TOTP' };
  }
}

// Helper function for mock backup codes
function randomChars(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}


/**
 * Verify TOTP code during login
 */
export async function verifyTOTP(userId: number, code: string): Promise<MFAVerifyResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    });
    return await response.json();
  } catch (error) {
    console.error('TOTP verify error:', error);
    return { success: false, error: 'Failed to verify TOTP' };
  }
}

/**
 * Generate new backup codes
 */
export async function generateBackupCodes(userId: number): Promise<MFAVerifyResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/backup-codes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Generate backup codes error:', error);
    return { success: false, error: 'Failed to generate backup codes' };
  }
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(userId: number, code: string): Promise<MFAVerifyResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/backup-codes/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    });
    return await response.json();
  } catch (error) {
    console.error('Backup code verify error:', error);
    return { success: false, error: 'Failed to verify backup code' };
  }
}

/**
 * Check if current device is trusted
 */
export async function checkTrustedDevice(userId: number): Promise<{ is_trusted: boolean }> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/trusted-devices/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Check trusted device error:', error);
    return { is_trusted: false };
  }
}

/**
 * Add current device as trusted
 */
export async function addTrustedDevice(
  userId: number,
  deviceName?: string
): Promise<{ success: boolean; device_id?: number }> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/trusted-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, device_name: deviceName }),
    });
    return await response.json();
  } catch (error) {
    console.error('Add trusted device error:', error);
    return { success: false };
  }
}

/**
 * Get list of trusted devices
 */
export async function getTrustedDevices(userId: number): Promise<TrustedDevice[]> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/trusted-devices?user_id=${userId}`);
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Get trusted devices error:', error);
    return [];
  }
}

/**
 * Remove trusted device
 */
export async function removeTrustedDevice(
  userId: number,
  deviceId: number
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(
      `${BOT_API_URL}/api/auth/trusted-devices/${deviceId}?user_id=${userId}`,
      { method: 'DELETE' }
    );
    return await response.json();
  } catch (error) {
    console.error('Remove trusted device error:', error);
    return { success: false };
  }
}

/**
 * Get user's MFA methods
 */
export async function getMFAMethods(userId: number): Promise<{ method_type: string; is_active: boolean }[]> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/methods?user_id=${userId}`);
    const data = await response.json();
    return data.methods || [];
  } catch (error) {
    console.error('Get MFA methods error:', error);
    return [];
  }
}

/**
 * Get backup codes count
 */
export async function getBackupCodesCount(userId: number): Promise<{ unused: number; used: number; total: number }> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/backup-codes/count?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Get backup codes count error:', error);
    return { unused: 0, used: 0, total: 0 };
  }
}

/**
 * Get login history
 */
export async function getLoginHistory(userId: number, limit: number = 20): Promise<unknown[]> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/login-history?user_id=${userId}&limit=${limit}`);
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Get login history error:', error);
    return [];
  }
}

// ==================== DISCORD DM MFA (BUTTON APPROVAL) ====================

interface DiscordSendResponse {
  success: boolean;
  request_id?: string;  // For polling approval status
  message?: string;
  expires_in?: number;
  dev_mode?: boolean;
  dev_code?: string;  // Only in dev mode
  error?: string;
}

interface ApprovalStatusResponse {
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'not_found';
}

/**
 * Send Discord DM approval request with buttons
 * Returns request_id for polling status (does NOT send code directly)
 * Uses Next.js API proxy to reach bot API
 */
export async function sendDiscordDMCode(
  userId: number | string,
  discordId: string,
  deviceInfo?: string
): Promise<DiscordSendResponse> {
  try {
    // Use relative URL to go through Next.js proxy (server-side can reach localhost:5000)
    const response = await fetch('/api/mfa/discord/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        discord_id: discordId,
        device_info: deviceInfo || `${navigator.platform} - ${navigator.userAgent.split(' ').slice(-2).join(' ')}`
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Send Discord approval request error:', error);
    return { success: false, error: 'Failed to send Discord DM. Bot may be offline.' };
  }
}

/**
 * Check MFA approval status
 * Poll this every 1-2 seconds after sendDiscordDMCode
 * Uses Next.js API proxy to reach bot API
 */
export async function checkMFAApprovalStatus(requestId: string): Promise<ApprovalStatusResponse> {
  try {
    // Use relative URL to go through Next.js proxy
    const response = await fetch(`/api/mfa/discord/status?request_id=${requestId}`);
    return await response.json();
  } catch (error) {
    console.error('Check MFA approval status error:', error);
    return { status: 'not_found' };
  }
}



/**
 * Verify Discord DM code
 * Uses Next.js API proxy to reach bot API
 */
export async function verifyDiscordDMCode(
  userId: number | string,
  code: string
): Promise<MFAVerifyResponse> {
  try {
    // Use relative URL to go through Next.js proxy
    const response = await fetch('/api/mfa/discord/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    });
    if (response.ok) {
      return await response.json();
    }
    return { success: false, error: 'Invalid code' };
  } catch (error) {
    console.error('Verify Discord DM code error:', error);
    return { success: false, error: 'Failed to verify code' };
  }
}

/**
 * Setup Discord DM as MFA method
 */
export async function setupDiscordMFA(userId: number | string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/discord/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Setup Discord MFA error:', error);
    return { success: false, error: 'Failed to setup Discord MFA' };
  }
}
