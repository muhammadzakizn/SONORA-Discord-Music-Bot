// Push Subscription Management API - File-based storage
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

const SUBSCRIPTIONS_FILE = '/tmp/push-subscriptions.json';

interface StoredSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
    userId?: string;
    createdAt: number;
}

function readSubscriptions(): Record<string, StoredSubscription> {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
        }
    } catch (error) {
        console.warn('Error reading subscriptions:', error);
    }
    return {};
}

function writeSubscriptions(data: Record<string, StoredSubscription>) {
    try {
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.warn('Error writing subscriptions:', error);
    }
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscription, userId } = body;

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json(
                { error: 'Invalid subscription' },
                { status: 400 }
            );
        }

        const subscriptions = readSubscriptions();
        const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').slice(0, 64);
        
        subscriptions[subscriptionId] = {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
            userId,
            createdAt: Date.now(),
        };

        writeSubscriptions(subscriptions);

        return NextResponse.json({
            success: true,
            subscriptionId,
            message: 'Successfully subscribed to push notifications',
        });
    } catch (error) {
        console.error('Push subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscriptionId, endpoint } = body;

        const subscriptions = readSubscriptions();
        
        if (subscriptionId && subscriptions[subscriptionId]) {
            delete subscriptions[subscriptionId];
            writeSubscriptions(subscriptions);
        } else if (endpoint) {
            const id = Buffer.from(endpoint).toString('base64').slice(0, 64);
            if (subscriptions[id]) {
                delete subscriptions[id];
                writeSubscriptions(subscriptions);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully unsubscribed',
        });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        return NextResponse.json(
            { error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
}

// GET - Get subscription status or all subscriptions
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userId = searchParams.get('userId');
    const all = searchParams.get('all');

    const subscriptions = readSubscriptions();

    if (endpoint) {
        const subscriptionId = Buffer.from(endpoint).toString('base64').slice(0, 64);
        const isSubscribed = !!subscriptions[subscriptionId];
        return NextResponse.json({ subscribed: isSubscribed });
    }

    if (userId) {
        const userSubs = Object.values(subscriptions).filter(s => s.userId === userId);
        return NextResponse.json({ subscriptions: userSubs, count: userSubs.length });
    }

    if (all === 'true') {
        return NextResponse.json({
            subscriptions: Object.values(subscriptions),
            count: Object.keys(subscriptions).length,
        });
    }

    return NextResponse.json({
        subscriptionCount: Object.keys(subscriptions).length,
    });
}
