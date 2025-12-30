// Web Push Configuration
import webpush from 'web-push';

// VAPID keys for Web Push authentication
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@sonora.muhammadzakizn.com';

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    data?: {
        url?: string;
        [key: string]: unknown;
    };
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
    requireInteraction?: boolean;
    silent?: boolean;
}

/**
 * Send push notification to a subscription endpoint
 */
export async function sendPushNotification(
    subscription: PushSubscription,
    payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return { success: false, error: 'VAPID keys not configured' };
        }

        const result = await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );

        return { success: result.statusCode === 201 };
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        
        // Handle expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
            return { success: false, error: 'Subscription expired or invalid' };
        }

        console.error('Push notification error:', err.message);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Send push notification to multiple subscriptions
 */
export async function sendPushToMultiple(
    subscriptions: PushSubscription[],
    payload: PushPayload
): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = await Promise.allSettled(
        subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
            successful++;
        } else {
            failed++;
            if (result.status === 'fulfilled' && result.value.error) {
                errors.push(`Sub ${index}: ${result.value.error}`);
            } else if (result.status === 'rejected') {
                errors.push(`Sub ${index}: ${result.reason}`);
            }
        }
    });

    return { successful, failed, errors };
}

export { webpush, VAPID_PUBLIC_KEY };
