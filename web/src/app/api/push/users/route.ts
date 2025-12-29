import { NextRequest, NextResponse } from 'next/server';

// Mock user data - in production, this would come from database
// Each user has their notification subscription status
const mockUsers = [
    {
        id: "123456789012345678",
        username: "musiclover",
        displayName: "Music Lover",
        avatar: null,
        notificationStatus: "allowed" as const,
    },
    {
        id: "234567890123456789",
        username: "djmaster",
        displayName: "DJ Master",
        avatar: null,
        notificationStatus: "allowed" as const,
    },
    {
        id: "345678901234567890",
        username: "audiofile",
        displayName: "Audiofile",
        avatar: null,
        notificationStatus: "disabled" as const,
    },
    {
        id: "456789012345678901",
        username: "beatmaker",
        displayName: "Beat Maker",
        avatar: null,
        notificationStatus: "denied" as const,
    },
    {
        id: "567890123456789012",
        username: "soundwave",
        displayName: "Sound Wave",
        avatar: null,
        notificationStatus: "never_granted" as const,
    },
    {
        id: "678901234567890123",
        username: "vibecheck",
        displayName: "Vibe Check",
        avatar: null,
        notificationStatus: "allowed" as const,
    },
];

export async function GET(request: NextRequest) {
    try {
        // In production, fetch from database with notification subscription status
        // For now, try to get from bot API and merge with notification settings
        
        const botResponse = await fetch(`${process.env.BOT_API_URL || 'http://localhost:5000'}/api/users`, {
            headers: { 'X-API-Key': process.env.BOT_API_KEY || '' },
        }).catch(() => null);

        if (botResponse?.ok) {
            const botData = await botResponse.json();
            // Transform and add notification status from stored settings
            const users = (botData.users || []).map((u: {
                id: string;
                username?: string;
                displayName?: string;
                avatar?: string;
            }) => ({
                id: u.id,
                username: u.username || `User ${u.id}`,
                displayName: u.displayName || u.username || `User ${u.id}`,
                avatar: u.avatar,
                // In production, look up notification subscription status from database
                notificationStatus: 'never_granted',
            }));

            return NextResponse.json({ users, total: users.length });
        }

        // Fallback to mock data for development
        return NextResponse.json({ 
            users: mockUsers, 
            total: mockUsers.length 
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        // Return mock data on error
        return NextResponse.json({ 
            users: mockUsers, 
            total: mockUsers.length 
        });
    }
}
