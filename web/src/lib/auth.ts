/**
 * SONORA Authentication Utilities
 */

export type UserRole = "admin" | "developer" | null;

interface AuthSession {
  role: UserRole;
  timestamp: number;
  discordUser?: {
    id: string;
    username: string;
    avatar: string;
  };
}

// Session timeout: 24 hours
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  // Check developer session
  const devAuth = localStorage.getItem('sonora-dev-auth');
  if (devAuth) {
    try {
      const session = JSON.parse(atob(devAuth)) as AuthSession;
      if (Date.now() - session.timestamp < SESSION_TIMEOUT) {
        return { ...session, role: 'developer' };
      }
      // Session expired
      localStorage.removeItem('sonora-dev-auth');
    } catch {
      localStorage.removeItem('sonora-dev-auth');
    }
  }

  // Check admin session
  const adminAuth = localStorage.getItem('sonora-admin-auth');
  if (adminAuth) {
    try {
      const session = JSON.parse(atob(adminAuth)) as AuthSession;
      if (Date.now() - session.timestamp < SESSION_TIMEOUT) {
        return { ...session, role: 'admin' };
      }
      // Session expired
      localStorage.removeItem('sonora-admin-auth');
    } catch {
      localStorage.removeItem('sonora-admin-auth');
    }
  }

  return null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getUserRole(): UserRole {
  return getSession()?.role ?? null;
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sonora-dev-auth');
  localStorage.removeItem('sonora-admin-auth');
  window.location.href = '/login';
}

export function setAdminSession(discordUser: { id: string; username: string; avatar: string }) {
  if (typeof window === 'undefined') return;
  const session: AuthSession = {
    role: 'admin',
    timestamp: Date.now(),
    discordUser,
  };
  localStorage.setItem('sonora-admin-auth', btoa(JSON.stringify(session)));
}

export function requireAuth(allowedRoles: UserRole[] = ['admin', 'developer']): boolean {
  const session = getSession();
  if (!session) return false;
  return allowedRoles.includes(session.role);
}
