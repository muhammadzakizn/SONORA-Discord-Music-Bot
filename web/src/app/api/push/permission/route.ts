import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// File path for permission storage (works in Vercel with /tmp)
const PERMISSION_FILE = '/tmp/notification-permissions.json';

type PermissionStatus = 'allowed' | 'denied' | 'disabled' | 'never_granted';

interface PermissionData {
    [userId: string]: {
        status: PermissionStatus;
        updatedAt: number;
    };
}

// Read permissions from file
function readPermissions(): PermissionData {
    try {
        if (fs.existsSync(PERMISSION_FILE)) {
            const data = fs.readFileSync(PERMISSION_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('Error reading permissions file:', error);
    }
    return {};
}

// Write permissions to file
function writePermissions(data: PermissionData): void {
    try {
        fs.writeFileSync(PERMISSION_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing permissions file:', error);
    }
}

// Export for use by other routes
export function getPermissionStatus(userId: string): PermissionStatus {
    const permissions = readPermissions();
    return permissions[userId]?.status || 'never_granted';
}

export function getAllPermissions(): Record<string, PermissionStatus> {
    const permissions = readPermissions();
    const result: Record<string, PermissionStatus> = {};
    for (const [userId, data] of Object.entries(permissions)) {
        result[userId] = data.status;
    }
    return result;
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

        const validStatuses: PermissionStatus[] = ['allowed', 'denied', 'disabled', 'never_granted'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be: allowed, denied, disabled, or never_granted' },
                { status: 400 }
            );
        }

        // Read current permissions
        const permissions = readPermissions();
        
        // Update permission
        permissions[userId] = {
            status,
            updatedAt: Date.now(),
        };
        
        // Write back
        writePermissions(permissions);

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
        const allPermissions = getAllPermissions();
        return NextResponse.json({ permissions: allPermissions });
    }

    const status = getPermissionStatus(userId);
    return NextResponse.json({
        userId,
        status,
    });
}
