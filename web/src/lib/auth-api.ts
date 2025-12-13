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
 */
export async function setupTOTP(userId: number): Promise<MFASetupResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    console.error('TOTP setup error:', error);
    return { success: false, error: 'Failed to setup TOTP' };
  }
}

/**
 * Verify TOTP setup with code from authenticator app
 */
export async function verifyTOTPSetup(
  userId: number,
  code: string,
  secret: string
): Promise<MFAVerifyResponse> {
  try {
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/verify-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code, secret }),
    });
    return await response.json();
  } catch (error) {
    console.error('TOTP verify setup error:', error);
    return { success: false, error: 'Failed to verify TOTP' };
  }
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
