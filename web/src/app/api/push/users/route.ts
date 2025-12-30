import { NextRequest, NextResponse } from 'next/server';

// Notification status types
type NotificationStatus = 'allowed' | 'denied' | 'disabled' | 'never_granted';

// User interface from auth database
interface AuthUser {
    id: number;
    discord_id: string;
    username: string;
    avatar_url?: string;
    status: string;
    role: string;
    mfa_enabled?: boolean;
    created_at?: string;
    last_login?: string;
}

// In-memory permission store (same as permission/route.ts - shared in production via DB)
const permissionStore: Map<string, NotificationStatus> = new Map();

// Transform user for notification targeting
function transformUser(user: AuthUser, permissions: Map<string, NotificationStatus>) {
    return {
        id: user.discord_id,
        username: user.username,
        displayName: user.username,
        avatar: user.avatar_url || null,
        notificationStatus: permissions.get(user.discord_id) || 'never_granted' as NotificationStatus,
    };
}

export async function GET(request: NextRequest) {
    try {
        // Get query params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Fetch permission statuses from permission API
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const permResponse = await fetch(`${baseUrl}/api/push/permission`, {
                cache: 'no-store',
            });
            if (permResponse.ok) {
                const permData = await permResponse.json();
                if (permData.permissions) {
                    for (const [userId, status] of Object.entries(permData.permissions)) {
                        permissionStore.set(userId, status as NotificationStatus);
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch permissions:', e);
        }

        // Fetch users from bot's auth API
        const botApiUrl = process.env.BOT_API_URL || 'http://localhost:5000';
        const response = await fetch(`${botApiUrl}/api/auth/users?limit=${limit}&offset=${offset}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (response.ok) {
            const data = await response.json();
            const users = (data.users || []).map((u: AuthUser) => transformUser(u, permissionStore));

            return NextResponse.json({
                users,
                total: data.total || users.length,
                source: 'database',
            });
        }

        // Fallback if bot API not available
        console.warn('Bot API not available, returning empty user list');
        return NextResponse.json({
            users: [],
            total: 0,
            source: 'fallback',
            message: 'Bot API not available',
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({
            users: [],
            total: 0,
            source: 'error',
            error: 'Failed to fetch users',
        }, { status: 500 });
    }
}
