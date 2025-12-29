import { NextRequest, NextResponse } from 'next/server';
import { NotificationPriority, NotificationType, NotificationSound } from '@/lib/notifications';

// Simple in-memory notification history (use database in production)
const notificationHistory: NotificationRecord[] = [];

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
      sentBy: 'admin', // Would get from session
      targetType: targetType || 'all',
      targetUsers,
      recipientCount: targetType === 'all' ? 0 : (targetUsers?.length || 0),
      clickCount: 0,
    };

    // Store in history
    notificationHistory.unshift(notification);
    
    // Keep only last 100 notifications
    if (notificationHistory.length > 100) {
      notificationHistory.pop();
    }

    // In production, you would use web-push library to send actual push notifications
    // For now, return success with the notification ID
    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      notification,
      message: 'Notification queued for sending',
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
