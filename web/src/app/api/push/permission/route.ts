import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for notification permission status
// In production, this should be in a database
const permissionStore: Map<string, {
    status: 'allowed' | 'denied' | 'disabled' | 'never_granted';
    updatedAt: number;
}> = new Map();

// Export for use by other routes
export function getPermissionStatus(userId: string): 'allowed' | 'denied' | 'disabled' | 'never_granted' {
    const stored = permissionStore.get(userId);
    return stored?.status || 'never_granted';
}

export function getAllPermissions(): Map<string, {
    status: 'allowed' | 'denied' | 'disabled' | 'never_granted';
    updatedAt: number;
}> {
    return permissionStore;
}

// POST - Update user's notification permission status
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, status } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const validStatuses = ['allowed', 'denied', 'disabled', 'never_granted'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: allowed, denied, disabled, or never_granted' },
                { status: 400 }
            );
        }

        // Store the permission status
        permissionStore.set(userId, {
            status,
            updatedAt: Date.now(),
        });

        console.log(`[Permission] Updated user ${userId} notification status to: ${status}`);

        return NextResponse.json({
            success: true,
            userId,
            status,
            message: 'Permission status updated',
        });
    } catch (error) {
        console.error('Update permission error:', error);
        return NextResponse.json(
            { error: 'Failed to update permission status' },
            { status: 500 }
        );
    }
}

// GET - Get permission status for a user
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        // Return all permissions if no userId specified
        const allPermissions: Record<string, string> = {};
        for (const [id, data] of permissionStore) {
            allPermissions[id] = data.status;
        }
        return NextResponse.json({ permissions: allPermissions });
    }

    const status = getPermissionStatus(userId);
    return NextResponse.json({
        userId,
        status,
    });
}
