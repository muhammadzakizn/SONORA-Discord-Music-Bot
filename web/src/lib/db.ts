/**
 * SONORA Database Layer - Cloud Compatible (In-Memory)
 * 
 * This is a cloud-compatible version that uses cookies for session storage.
 * For local development with persistent storage, use a database service.
 */

// Types only - no actual database needed for Vercel deployment
// Sessions are stored in cookies (already implemented in OAuth callback)

export interface DbUser {
    id: string;
    discord_id: string;
    username: string;
    display_name: string | null;
    avatar_hash: string | null;
    email: string | null;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
    tutorial_completed: boolean;
}

export interface DbSession {
    id: string;
    user_id: string;
    access_token: string | null;
    refresh_token: string | null;
    verified: boolean;
    verified_at: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface DbUserServer {
    id: string;
    user_id: string;
    server_id: string;
    server_name: string;
    server_icon: string | null;
    is_owner: boolean;
    is_admin: boolean;
    bot_installed: boolean;
    updated_at: string;
}

export interface DbVerificationCode {
    id: string;
    user_id: string;
    code: string;
    expires_at: string;
    used: boolean;
    used_at: string | null;
    created_at: string;
}

// In-memory storage for verification codes (serverless-compatible)
// Note: This resets on cold starts, but verification codes are short-lived anyway
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// Verification codes operations
export const verificationDb = {
    // Generate verification code
    generate: (userId: string): string => {
        // Delete existing unused codes for this user
        verificationCodes.delete(userId);
        
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        
        verificationCodes.set(userId, { code, expiresAt });
        
        return code;
    },

    // Verify code
    verify: (userId: string, code: string): boolean => {
        const stored = verificationCodes.get(userId);
        
        if (!stored) return false;
        if (stored.expiresAt < Date.now()) {
            verificationCodes.delete(userId);
            return false;
        }
        if (stored.code !== code) return false;
        
        // Mark as used by deleting
        verificationCodes.delete(userId);
        return true;
    },

    // Check if user has pending verification
    hasPending: (userId: string): boolean => {
        const stored = verificationCodes.get(userId);
        if (!stored) return false;
        if (stored.expiresAt < Date.now()) {
            verificationCodes.delete(userId);
            return false;
        }
        return true;
    }
};

// Stub implementations for compatibility - actual data is in cookies
export const userDb = {
    findOrCreate: (): DbUser | null => null,
    getByDiscordId: (): DbUser | null => null,
    getById: (): DbUser | null => null,
    updateDisplayName: (): void => {},
    completeTutorial: (): void => {},
    isTutorialCompleted: (): boolean => false
};

export const sessionDb = {
    create: (): DbSession | null => null,
    getById: (): DbSession | null => null,
    getByUserId: (): DbSession[] => [],
    verify: (): void => {},
    delete: (): void => {},
    deleteAllForUser: (): void => {}
};

export const userServersDb = {
    syncServers: (): void => {},
    getByUserId: (): DbUserServer[] => [],
    updateBotStatus: (): void => {}
};

// Export a no-op default for compatibility
export default {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {},
    pragma: () => {}
};
