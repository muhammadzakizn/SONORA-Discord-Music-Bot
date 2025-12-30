"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    Notification as AppNotification,
    NotificationSettings,
    NotificationPriority,
    NotificationType,
    NotificationSound,
    getNotifications,
    saveNotification,
    markAsRead as markAsReadStorage,
    markAllAsRead as markAllAsReadStorage,
    deleteNotification as deleteNotificationStorage,
    deleteAllNotifications as deleteAllNotificationsStorage,
    getUnreadCount,
    cleanupOldNotifications,
    getNotificationSettings,
    saveNotificationSettings,
    generateNotificationId,
} from '@/lib/notifications';

// Sound file path - single unified notification sound
const SOUND_FILE = '/sounds/notification.ogg';

// Map sound types to whether they should play
const SOUND_ENABLED: Record<NotificationSound, boolean> = {
    default: true,
    changelog: true,
    urgent: true,
    none: false,
};

interface NotificationContextType {
    // State
    notifications: AppNotification[];
    unreadCount: number;
    settings: NotificationSettings;
    isOpen: boolean;

    // Actions
    addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    deleteAllNotifications: () => void;
    updateSettings: (settings: Partial<NotificationSettings>) => void;
    playSound: (sound: NotificationSound) => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
    refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: React.ReactNode;
    userId?: string;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [settings, setSettings] = useState<NotificationSettings>({
        enabled: true,
        soundEnabled: true,
        changelogEnabled: true,
        urgentOnly: false,
    });
    const [isOpen, setIsOpen] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load notifications and settings on mount
    useEffect(() => {
        const loadData = () => {
            const storedNotifications = getNotifications(userId);
            const storedSettings = getNotificationSettings(userId);

            setNotifications(storedNotifications);
            setUnreadCount(getUnreadCount(userId));
            setSettings(storedSettings);

            // Cleanup old notifications
            cleanupOldNotifications(userId);
        };

        loadData();
    }, [userId]);

    // Refresh notifications
    const refreshNotifications = useCallback(() => {
        const storedNotifications = getNotifications(userId);
        setNotifications(storedNotifications);
        setUnreadCount(getUnreadCount(userId));
    }, [userId]);

    // Play notification sound
    const playSound = useCallback((sound: NotificationSound) => {
        if (!settings.soundEnabled || !SOUND_ENABLED[sound]) return;

        try {
            // Create audio element if not exists
            if (!audioRef.current) {
                audioRef.current = new Audio();
            }

            audioRef.current.src = SOUND_FILE;
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(err => {
                console.warn('Could not play notification sound:', err);
            });
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [settings.soundEnabled]);

    // Add notification
    const addNotification = useCallback((notificationData: Omit<AppNotification, 'id' | 'createdAt'>) => {
        // Check if notifications are enabled
        if (!settings.enabled) return;

        // Check changelog setting
        if (notificationData.type === 'changelog' && !settings.changelogEnabled) return;

        // Check urgent only setting
        if (settings.urgentOnly && notificationData.priority !== 'urgent') return;

        const notification: AppNotification = {
            ...notificationData,
            id: generateNotificationId(),
            createdAt: new Date().toISOString(),
        };

        // Save to storage
        saveNotification(notification, userId);

        // Update state
        setNotifications(prev => [notification, ...prev].slice(0, 100));
        setUnreadCount(prev => prev + 1);

        // Play sound
        playSound(notification.sound);

        // Show browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
            try {
                new window.Notification(notification.title, {
                    body: notification.body,
                    icon: notification.image || '/icons/icon-192.png',
                    tag: notification.id,
                });
            } catch (error) {
                console.warn('Could not show browser notification:', error);
            }
        }
    }, [settings, userId, playSound]);

    // Poll for new notifications from API (for dev dashboard sent notifications)
    useEffect(() => {
        let lastChecked = Date.now();

        const pollNotifications = async () => {
            try {
                const response = await fetch(`/api/push/pending?since=${lastChecked}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.notifications && data.notifications.length > 0) {
                        data.notifications.forEach((notif: {
                            id: string;
                            title: string;
                            body: string;
                            type?: NotificationType;
                            priority?: NotificationPriority;
                            sound?: NotificationSound;
                            image?: string;
                            url?: string;
                        }) => {
                            addNotification({
                                title: notif.title,
                                body: notif.body,
                                type: notif.type || 'general',
                                priority: notif.priority || 'normal',
                                sound: notif.sound || 'default',
                                image: notif.image,
                                url: notif.url,
                            });
                        });
                        lastChecked = Date.now();
                    }
                }
            } catch (error) {
                // Silently ignore poll errors
            }
        };

        // Poll every 3 seconds for faster notification delivery
        const interval = setInterval(pollNotifications, 3000);

        // Initial poll after a short delay
        const timeout = setTimeout(pollNotifications, 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [addNotification]);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        markAsReadStorage(id, userId);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [userId]);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        markAllAsReadStorage(userId);
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || now })));
        setUnreadCount(0);
    }, [userId]);

    // Delete notification
    const deleteNotification = useCallback((id: string) => {
        const notification = notifications.find(n => n.id === id);
        deleteNotificationStorage(id, userId);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notification && !notification.readAt) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [notifications, userId]);

    // Delete all notifications
    const deleteAllNotifications = useCallback(() => {
        deleteAllNotificationsStorage(userId);
        setNotifications([]);
        setUnreadCount(0);
    }, [userId]);

    // Update settings
    const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        saveNotificationSettings(updated, userId);
    }, [settings, userId]);

    // Toggle open
    const toggleOpen = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        settings,
        isOpen,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        updateSettings,
        playSound,
        toggleOpen,
        setOpen: setIsOpen,
        refreshNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

// Optional hook that doesn't throw if not in provider
export function useNotificationsOptional() {
    return useContext(NotificationContext);
}
