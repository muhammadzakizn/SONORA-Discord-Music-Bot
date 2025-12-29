/**
 * Notification Storage & Management Utilities
 * Handles localStorage storage, priority levels, and notification history
 */

// Notification priority levels
export type NotificationPriority = 'urgent' | 'important' | 'normal' | 'low';

// Notification types
export type NotificationType = 'general' | 'changelog' | 'announcement' | 'personal';

// Sound types
export type NotificationSound = 'default' | 'changelog' | 'urgent' | 'none';

// Notification interface
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  sound: NotificationSound;
  image?: string;
  url?: string;
  createdAt: string;
  readAt?: string;
  sentBy?: string;
}

// User notification preferences
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  changelogEnabled: boolean;
  urgentOnly: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS: 'sonora_notifications',
  SETTINGS: 'sonora_notification_settings',
  LAST_CLEANUP: 'sonora_notifications_cleanup',
};

// Constants
const MAX_NOTIFICATIONS = 100;
const CLEANUP_DAYS = 30;

/**
 * Get all stored notifications for current user
 */
export function getNotifications(userId?: string): Notification[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const notifications = JSON.parse(stored) as Notification[];
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

/**
 * Save notification to storage
 */
export function saveNotification(notification: Notification, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const notifications = getNotifications(userId);
    
    // Check if already exists
    const existingIndex = notifications.findIndex(n => n.id === notification.id);
    if (existingIndex >= 0) {
      notifications[existingIndex] = notification;
    } else {
      notifications.unshift(notification);
    }
    
    // Keep only max notifications
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save notification:', error);
  }
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const notifications = getNotifications(userId);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.readAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(notifications));
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const notifications = getNotifications(userId);
    const now = new Date().toISOString();
    
    notifications.forEach(n => {
      if (!n.readAt) n.readAt = now;
    });
    
    localStorage.setItem(key, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const notifications = getNotifications(userId);
    const filtered = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
}

/**
 * Delete all notifications
 */
export function deleteAllNotifications(userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    localStorage.setItem(key, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to delete all notifications:', error);
  }
}

/**
 * Get unread count
 */
export function getUnreadCount(userId?: string): number {
  const notifications = getNotifications(userId);
  return notifications.filter(n => !n.readAt).length;
}

/**
 * Cleanup old notifications (older than CLEANUP_DAYS)
 */
export function cleanupOldNotifications(userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cleanupKey = userId 
      ? `${STORAGE_KEYS.LAST_CLEANUP}_${userId}` 
      : STORAGE_KEYS.LAST_CLEANUP;
    
    // Check if cleanup was done recently (within 24 hours)
    const lastCleanup = localStorage.getItem(cleanupKey);
    if (lastCleanup) {
      const lastCleanupTime = new Date(lastCleanup).getTime();
      const now = Date.now();
      if (now - lastCleanupTime < 24 * 60 * 60 * 1000) return;
    }
    
    const key = userId ? `${STORAGE_KEYS.NOTIFICATIONS}_${userId}` : STORAGE_KEYS.NOTIFICATIONS;
    const notifications = getNotifications(userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
    
    const filtered = notifications.filter(n => 
      new Date(n.createdAt).getTime() > cutoffDate.getTime()
    );
    
    localStorage.setItem(key, JSON.stringify(filtered));
    localStorage.setItem(cleanupKey, new Date().toISOString());
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
  }
}

/**
 * Get notification settings
 */
export function getNotificationSettings(userId?: string): NotificationSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, soundEnabled: true, changelogEnabled: true, urgentOnly: false };
  }
  
  try {
    const key = userId ? `${STORAGE_KEYS.SETTINGS}_${userId}` : STORAGE_KEYS.SETTINGS;
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { enabled: true, soundEnabled: true, changelogEnabled: true, urgentOnly: false };
    }
    return JSON.parse(stored) as NotificationSettings;
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return { enabled: true, soundEnabled: true, changelogEnabled: true, urgentOnly: false };
  }
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings: NotificationSettings, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = userId ? `${STORAGE_KEYS.SETTINGS}_${userId}` : STORAGE_KEYS.SETTINGS;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save notification settings:', error);
  }
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Older': [],
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    
    if (date >= today) {
      groups['Today'].push(notification);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(notification);
    } else if (date >= weekAgo) {
      groups['This Week'].push(notification);
    } else {
      groups['Older'].push(notification);
    }
  });
  
  return groups;
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'urgent': return '#ef4444'; // red
    case 'important': return '#f97316'; // orange
    case 'normal': return '#6b7280'; // gray
    case 'low': return '#3b82f6'; // blue
    default: return '#6b7280';
  }
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: NotificationPriority): string {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'important': return 'Important';
    case 'normal': return 'Normal';
    case 'low': return 'Low Priority';
    default: return 'Normal';
  }
}

/**
 * Generate unique notification ID
 */
export function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
