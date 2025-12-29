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

// Transform user for notification targeting
function transformUser(user: AuthUser) {
    return {
        id: user.discord_id,
        username: user.username,
        displayName: user.username,
        avatar: user.avatar_url || null,
        // For now, all users are "never_granted" since we don't track push subscriptions yet
        // In production, this would check if user has a push subscription
        notificationStatus: 'never_granted' as NotificationStatus,
    };
}

export async function GET(request: NextRequest) {
    try {
        // Get query params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

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
            const users = (data.users || []).map(transformUser);

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
