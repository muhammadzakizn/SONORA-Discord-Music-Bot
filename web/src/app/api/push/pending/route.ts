import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory pending notifications queue
// In production, use Redis or database
const pendingNotifications: Map<string, {
    id: string;
    title: string;
    body: string;
    type?: string;
    priority?: string;
    sound?: string;
    image?: string;
    url?: string;
    sentAt: number;
    delivered: Set<string>;
}> = new Map();

// GET - Get pending notifications for a user (polling)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0');
    
    const now = Date.now();
    const clientId = request.headers.get('x-client-id') || 'default';
    
    // Get notifications sent after 'since' timestamp that haven't been delivered to this client
    const pending = [];
    
    for (const [id, notif] of pendingNotifications) {
        // Only include if sent after 'since' and not yet delivered to this client
        if (notif.sentAt > since && !notif.delivered.has(clientId)) {
            pending.push({
                id: notif.id,
                title: notif.title,
                body: notif.body,
                type: notif.type,
                priority: notif.priority,
                sound: notif.sound,
                image: notif.image,
                url: notif.url,
            });
            // Mark as delivered to this client
            notif.delivered.add(clientId);
        }
    }
    
    // Clean up old notifications (older than 1 minute)
    const oneMinuteAgo = now - 60000;
    for (const [id, notif] of pendingNotifications) {
        if (notif.sentAt < oneMinuteAgo) {
            pendingNotifications.delete(id);
        }
    }
    
    return NextResponse.json({
        notifications: pending,
        timestamp: now,
    });
}

// POST - Add notification to pending queue (called by /api/push/send)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, title, body: notifBody, type, priority, sound, image, url } = body;
        
        if (!id || !title || !notifBody) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        pendingNotifications.set(id, {
            id,
            title,
            body: notifBody,
            type,
            priority,
            sound,
            image,
            url,
            sentAt: Date.now(),
            delivered: new Set(),
        });
        
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to queue notification' }, { status: 500 });
    }
}
