/**
 * Permission Utilities
 * Handles browser permissions for notifications, sounds, etc.
 */

// Storage keys
const STORAGE_KEYS = {
  PERMISSION_SETUP_COMPLETED: 'sonora_permission_setup',
  PERMISSION_REMINDER_DISMISSED: 'sonora_permission_dismissed',
  PERMISSION_DONT_ASK_AGAIN: 'sonora_permission_dont_ask',
  PERMISSION_REMINDER_SESSION: 'sonora_permission_session',
};

export interface PermissionStatus {
  notifications: 'granted' | 'denied' | 'default';
  notificationSound: boolean;
  hasCompletedSetup: boolean;
}

/**
 * Check all permissions status
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  if (typeof window === 'undefined') {
    return {
      notifications: 'default',
      notificationSound: true,
      hasCompletedSetup: false,
    };
  }

  const notificationPermission = 'Notification' in window 
    ? Notification.permission 
    : 'denied';
  
  const hasCompletedSetup = localStorage.getItem(STORAGE_KEYS.PERMISSION_SETUP_COMPLETED) === 'true';
  
  // Sound is always "allowed" in browser, it's a user preference not a permission
  const notificationSound = true;

  return {
    notifications: notificationPermission as 'granted' | 'denied' | 'default',
    notificationSound,
    hasCompletedSetup,
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Check if should show permission reminder
 */
export function shouldShowPermissionReminder(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Don't show if notifications are already granted
  if ('Notification' in window && Notification.permission === 'granted') {
    return false;
  }

  // Don't show if user said "don't ask again"
  if (localStorage.getItem(STORAGE_KEYS.PERMISSION_DONT_ASK_AGAIN) === 'true') {
    return false;
  }

  // Only show once per session
  if (sessionStorage.getItem(STORAGE_KEYS.PERMISSION_REMINDER_SESSION) === 'true') {
    return false;
  }

  return true;
}

/**
 * Dismiss permission reminder
 */
export function dismissPermissionReminder(dontAskAgain = false): void {
  if (typeof window === 'undefined') return;

  // Mark as shown for this session
  sessionStorage.setItem(STORAGE_KEYS.PERMISSION_REMINDER_SESSION, 'true');

  // If user said don't ask again, save permanently
  if (dontAskAgain) {
    localStorage.setItem(STORAGE_KEYS.PERMISSION_DONT_ASK_AGAIN, 'true');
  }
}

/**
 * Mark permission setup as completed
 */
export function markPermissionSetupCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PERMISSION_SETUP_COMPLETED, 'true');
}

/**
 * Check if permission setup was completed
 */
export function hasCompletedPermissionSetup(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.PERMISSION_SETUP_COMPLETED) === 'true';
}

/**
 * Reset all permission preferences (for testing)
 */
export function resetPermissionPreferences(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PERMISSION_SETUP_COMPLETED);
  localStorage.removeItem(STORAGE_KEYS.PERMISSION_REMINDER_DISMISSED);
  localStorage.removeItem(STORAGE_KEYS.PERMISSION_DONT_ASK_AGAIN);
  sessionStorage.removeItem(STORAGE_KEYS.PERMISSION_REMINDER_SESSION);
}

/**
 * Get permission-friendly message
 */
export function getPermissionMessage(permission: 'granted' | 'denied' | 'default'): string {
  switch (permission) {
    case 'granted':
      return 'Allowed';
    case 'denied':
      return 'Blocked';
    case 'default':
      return 'Not set';
    default:
      return 'Unknown';
  }
}

/**
 * Check if notifications are blocked (user denied)
 */
export function areNotificationsBlocked(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return true;
  }
  return Notification.permission === 'denied';
}
