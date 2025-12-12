"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { isDeveloperByDiscord } from '@/config/access-control';

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email: string | null;
}

export interface UserGuild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: number;
}

export interface UserSession {
    user: DiscordUser;
    guilds: UserGuild[];
    accessToken: string;
    timestamp: number;
}

interface SessionContextType {
    session: UserSession | null;
    user: DiscordUser | null;
    displayName: string;
    guilds: UserGuild[];
    managedGuilds: UserGuild[];
    isLoggedIn: boolean;
    isLoading: boolean;
    isMfaVerified: boolean;
    isDeveloper: boolean;
    logout: () => void;
    refreshSession: () => void;
    setDisplayName: (name: string) => void;
    setMfaVerified: (verified: boolean) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

// Permission bits
const ADMINISTRATOR = 0x8;
const MANAGE_GUILD = 0x20;

// Helper to get session from cookie
function getSessionFromCookie(): UserSession | null {
    if (typeof window === 'undefined') return null;

    try {
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(c => c.trim().startsWith('sonora-admin-session='));
        if (!sessionCookie) return null;

        const encodedSession = sessionCookie.split('=')[1];
        const decoded = atob(encodedSession);
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

// Helper to get MFA verification status
function getMfaStatus(userId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const stored = localStorage.getItem(`sonora-mfa-verified-${userId}`);
        if (!stored) return false;
        const data = JSON.parse(stored);
        // MFA valid for 30 days
        if (Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(`sonora-mfa-verified-${userId}`);
            return false;
        }
        return data.verified;
    } catch {
        return false;
    }
}

// Helper to store MFA verification status
function storeMfaStatus(userId: string, verified: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`sonora-mfa-verified-${userId}`, JSON.stringify({
            verified,
            timestamp: Date.now(),
        }));
    } catch {
        // Ignore errors
    }
}

// Helper to get stored display name
function getStoredDisplayName(userId: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(`sonora-display-name-${userId}`);
    } catch {
        return null;
    }
}

// Helper to store display name
function storeDisplayName(userId: string, name: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(`sonora-display-name-${userId}`, name);
    } catch {
        // Ignore errors
    }
}

// Generate Discord avatar URL
export function getAvatarUrl(user: DiscordUser): string {
    if (user.avatar) {
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }
    // Default avatar based on discriminator or user ID
    const defaultIndex = user.discriminator === '0'
        ? Number((BigInt(user.id) >> BigInt(22)) % BigInt(6))
        : parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

// Generate server icon URL
export function getServerIconUrl(guild: UserGuild): string | null {
    if (guild.icon) {
        return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
    }
    return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<UserSession | null>(null);
    const [displayName, setDisplayNameState] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isMfaVerified, setIsMfaVerifiedState] = useState(false);

    const refreshSession = useCallback(() => {
        const userSession = getSessionFromCookie();
        setSession(userSession);

        // Load stored display name or use Discord username
        if (userSession?.user) {
            const storedName = getStoredDisplayName(userSession.user.id);
            setDisplayNameState(storedName || userSession.user.username);

            // Load MFA status
            const mfaStatus = getMfaStatus(userSession.user.id);
            setIsMfaVerifiedState(mfaStatus);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    const logout = useCallback(() => {
        document.cookie = 'sonora-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setSession(null);
        setDisplayNameState('');
        setIsMfaVerifiedState(false);
        window.location.href = '/login';
    }, []);

    const setDisplayName = useCallback((name: string) => {
        if (session?.user) {
            storeDisplayName(session.user.id, name);
            setDisplayNameState(name);
        }
    }, [session?.user]);

    const setMfaVerified = useCallback((verified: boolean) => {
        if (session?.user) {
            storeMfaStatus(session.user.id, verified);
            setIsMfaVerifiedState(verified);
        }
    }, [session?.user]);

    // Check if user is developer
    const isDeveloper = session?.user
        ? isDeveloperByDiscord(session.user.username)
        : false;

    // Filter guilds where user is owner or has admin/manage_guild permission
    const managedGuilds = session?.guilds.filter(guild =>
        guild.owner ||
        (guild.permissions & ADMINISTRATOR) === ADMINISTRATOR ||
        (guild.permissions & MANAGE_GUILD) === MANAGE_GUILD
    ) || [];

    return (
        <SessionContext.Provider
            value={{
                session,
                user: session?.user || null,
                displayName,
                guilds: session?.guilds || [],
                managedGuilds,
                isLoggedIn: !!session,
                isLoading,
                isMfaVerified,
                isDeveloper,
                logout,
                refreshSession,
                setDisplayName,
                setMfaVerified,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}
