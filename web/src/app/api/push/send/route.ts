import { NextRequest, NextResponse } from 'next/server';
import { NotificationPriority, NotificationType, NotificationSound } from '@/lib/notifications';
import { sendPushToMultiple, PushPayload, PushSubscription } from '@/lib/webpush';
import fs from 'fs';

// Simple in-memory notification history (use database in production)
const notificationHistory: NotificationRecord[] = [];
const SUBSCRIPTIONS_FILE = '/tmp/push-subscriptions.json';

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  sound: NotificationSound;
  image?: string;
  url?: string;
  sentAt: string;
  sentBy: string;
  targetType: 'all' | 'specific' | 'segment';
  targetUsers?: string[];
  recipientCount: number;
  clickCount: number;
  pushSent?: number;
  pushFailed?: number;
}

function readSubscriptions(): Record<string, { endpoint: string; keys: { p256dh: string; auth: string }; userId?: string }> {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
        }
    } catch (error) {
        console.warn('Error reading subscriptions:', error);
    }
    return {};
}

// POST - Send notification (developer only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      body: notifBody, 
      type = 'general',
      priority = 'normal',
      sound = 'default',
      image, 
      url, 
      targetType, 
      targetUsers 
    } = body;

    if (!title || !notifBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Create notification record
    const notification: NotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body: notifBody,
      type,
      priority,
      sound,
      image,
      url: url || '/',
      sentAt: new Date().toISOString(),
      sentBy: 'admin',
      targetType: targetType || 'all',
      targetUsers,
      recipientCount: targetType === 'all' ? 0 : (targetUsers?.length || 0),
      clickCount: 0,
      pushSent: 0,
      pushFailed: 0,
    };

    // Store in history
    notificationHistory.unshift(notification);
    if (notificationHistory.length > 100) {
      notificationHistory.pop();
    }

    // Create push payload
    const pushPayload: PushPayload = {
      title: notification.title,
      body: notification.body,
      icon: '/sonora-logo.png',
      badge: '/sonora-logo.png',
      image: notification.image,
      tag: `sonora-${notification.type}-${notification.id}`,
      data: {
        url: notification.url,
        notificationId: notification.id,
        type: notification.type,
        sound: notification.sound,
      },
      requireInteraction: notification.priority === 'urgent',
      silent: notification.sound === 'none',
    };

    // Get subscriptions and send push notifications
    const allSubscriptions = readSubscriptions();
    let subscriptionsToSend: PushSubscription[] = [];

    if (targetType === 'all') {
      subscriptionsToSend = Object.values(allSubscriptions).map(s => ({
        endpoint: s.endpoint,
        expirationTime: null,
        keys: s.keys,
      }));
    } else if (targetType === 'specific' && targetUsers?.length) {
      subscriptionsToSend = Object.values(allSubscriptions)
        .filter(s => s.userId && targetUsers.includes(s.userId))
        .map(s => ({
          endpoint: s.endpoint,
          expirationTime: null,
          keys: s.keys,
        }));
    }

    // Send push notifications
    if (subscriptionsToSend.length > 0) {
      const pushResult = await sendPushToMultiple(subscriptionsToSend, pushPayload);
      notification.pushSent = pushResult.successful;
      notification.pushFailed = pushResult.failed;
      notification.recipientCount = pushResult.successful;
    }

    // Also queue for polling fallback
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/push/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          priority: notification.priority,
          sound: notification.sound,
          image: notification.image,
          url: notification.url,
        }),
      });
    } catch (error) {
      console.warn('Failed to queue notification for polling:', error);
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      notification,
      pushStats: {
        sent: notification.pushSent,
        failed: notification.pushFailed,
        total: subscriptionsToSend.length,
      },
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// GET - Get notification history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type');
  const priority = searchParams.get('priority');

  let filtered = notificationHistory;
  
  // Filter by type
  if (type) {
    filtered = filtered.filter(n => n.type === type);
  }
  
  // Filter by priority
  if (priority) {
    filtered = filtered.filter(n => n.priority === priority);
  }

  const notifications = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    notifications,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
  });
}
