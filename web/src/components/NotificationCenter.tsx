"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    X,
    Trash2,
    Check,
    CheckCheck,
    Settings,
    ExternalLink,
    AlertTriangle,
    Info,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Notification as AppNotification,
    NotificationPriority,
    groupNotificationsByDate,
    getPriorityColor,
    getPriorityLabel,
} from '@/lib/notifications';
import { useNotificationsOptional } from '@/contexts/NotificationContext';
import { useSession } from '@/contexts/SessionContext';
import { requestNotificationPermission, areNotificationsBlocked } from '@/lib/permissions';
import Link from 'next/link';

interface NotificationCenterProps {
    isDark?: boolean;
}

export function NotificationCenter({ isDark = true }: NotificationCenterProps) {
    const ctx = useNotificationsOptional();
    const { user } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied' | 'requesting'>('default');
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on click outside (not on scroll)
    useEffect(() => {
        let isScrolling = false;
        let scrollTimeout: NodeJS.Timeout;

        const handleScroll = () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };

        const handleClick = (e: MouseEvent) => {
            // Don't close if user was scrolling
            if (isScrolling) return;

            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Use click instead of mousedown to avoid closing during scroll
            document.addEventListener('click', handleClick);
            // Track scroll events
            document.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
            clearTimeout(scrollTimeout);
        };
    }, [isOpen]);

    // Check permission status on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionStatus(Notification.permission as 'default' | 'granted' | 'denied');
        }
    }, []);

    // Handle bell click - always open panel
    const handleBellClick = () => {
        // Just toggle the panel open/closed - no blocking
        setShowPermissionPrompt(false);
        setIsOpen(!isOpen);
    };

    // Request permission
    const handleRequestPermission = async () => {
        setPermissionStatus('requesting');
        const granted = await requestNotificationPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');

        // Save permission status to API for tracking
        if (user?.id) {
            try {
                await fetch('/api/push/permission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        status: granted ? 'allowed' : 'denied',
                    }),
                });
            } catch (error) {
                console.warn('Failed to save notification permission status:', error);
            }
        }

        // Subscribe to push notifications if permission granted
        if (granted && user?.id) {
            try {
                // Register service worker
                const registration = await navigator.serviceWorker.ready;

                // Get VAPID public key
                const vapidResponse = await fetch('/api/push/vapid');
                const vapidData = await vapidResponse.json();

                if (vapidData.publicKey) {
                    // Subscribe to push
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
                    });

                    // Save subscription to server
                    await fetch('/api/push/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            subscription: subscription.toJSON(),
                            userId: user.id,
                        }),
                    });

                    console.log('Push subscription created successfully');
                }
            } catch (error) {
                console.warn('Failed to subscribe to push notifications:', error);
            }
        }

        if (granted) {
            setShowPermissionPrompt(false);
            setIsOpen(true);
        }
    };

    // Helper to convert VAPID key
    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    if (!ctx) {
        // Render a disabled bell if not in provider
        return (
            <button
                className={cn(
                    "relative p-2 rounded-xl transition-colors",
                    isDark ? "hover:bg-white/[0.08]" : "hover:bg-gray-100"
                )}
                disabled
            >
                <Bell className={cn("w-5 h-5", isDark ? "text-white/50" : "text-gray-400")} />
            </button>
        );
    }

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        settings,
    } = ctx;

    const groupedNotifications = groupNotificationsByDate(notifications);

    const getPriorityIcon = (priority: NotificationPriority) => {
        switch (priority) {
            case 'urgent':
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'important':
                return <Bell className="w-4 h-4 text-orange-400" />;
            case 'normal':
                return <Info className="w-4 h-4 text-gray-400" />;
            case 'low':
                return <Sparkles className="w-4 h-4 text-blue-400" />;
            default:
                return null;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={handleBellClick}
                className={cn(
                    "relative p-2 rounded-xl transition-colors",
                    isDark ? "hover:bg-white/[0.08]" : "hover:bg-gray-100",
                    isOpen && (isDark ? "bg-white/[0.08]" : "bg-gray-100")
                )}
            >
                <Bell className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />

                {/* Unread badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Permission needed indicator */}
                {permissionStatus !== 'granted' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full" />
                )}
            </button>

            {/* Permission Prompt Dropdown */}
            <AnimatePresence>
                {showPermissionPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute top-full right-0 mt-2 w-80 p-4",
                            "rounded-xl shadow-2xl border",
                            isDark
                                ? "bg-neutral-900/95 backdrop-blur-xl border-neutral-700"
                                : "bg-white border-gray-200"
                        )}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                                areNotificationsBlocked()
                                    ? "bg-red-500/20"
                                    : isDark ? "bg-pink-500/20" : "bg-pink-100"
                            )}>
                                <Bell className={cn(
                                    "w-6 h-6",
                                    areNotificationsBlocked() ? "text-red-500" : "text-pink-500"
                                )} />
                            </div>

                            <h3 className={cn(
                                "font-semibold mb-1",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                {areNotificationsBlocked() ? "Notifications Blocked" : "Enable Notifications"}
                            </h3>

                            <p className={cn(
                                "text-sm mb-4",
                                isDark ? "text-white/60" : "text-gray-600"
                            )}>
                                {areNotificationsBlocked()
                                    ? "Please enable in browser settings"
                                    : "Get updates about new features and announcements"}
                            </p>

                            <div className="flex gap-2 w-full">
                                {!areNotificationsBlocked() && (
                                    <button
                                        onClick={handleRequestPermission}
                                        disabled={permissionStatus === 'requesting'}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-lg font-medium transition-colors",
                                            "bg-pink-600 hover:bg-pink-700 text-white",
                                            permissionStatus === 'requesting' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {permissionStatus === 'requesting' ? 'Requesting...' : 'Enable'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowPermissionPrompt(false)}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg font-medium transition-colors",
                                        isDark
                                            ? "bg-white/10 hover:bg-white/20 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    )}
                                >
                                    {areNotificationsBlocked() ? 'Close' : 'Later'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute top-full right-0 mt-2 w-96 max-h-[70vh] overflow-hidden",
                            "rounded-xl shadow-2xl border",
                            isDark
                                ? "bg-neutral-900/95 backdrop-blur-xl border-neutral-700"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Header */}
                        <div className={cn(
                            "sticky top-0 z-10 flex flex-col border-b",
                            isDark ? "bg-neutral-900/95 border-neutral-700" : "bg-white border-gray-200"
                        )}>
                            {/* Permission banner - show if not granted */}
                            {typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission !== 'granted' && (
                                <div className={cn(
                                    "flex items-center justify-between px-3 py-2 text-xs border-b",
                                    areNotificationsBlocked()
                                        ? "bg-red-500/10 border-red-500/20"
                                        : "bg-yellow-500/10 border-yellow-500/20"
                                )}>
                                    <span className={areNotificationsBlocked() ? "text-red-400" : "text-yellow-400"}>
                                        {areNotificationsBlocked()
                                            ? "Notifications blocked in browser"
                                            : "Enable notifications for alerts"
                                        }
                                    </span>
                                    {!areNotificationsBlocked() && (
                                        <button
                                            onClick={handleRequestPermission}
                                            disabled={permissionStatus === 'requesting'}
                                            className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500 hover:bg-yellow-600 text-black transition-colors"
                                        >
                                            {permissionStatus === 'requesting' ? '...' : 'Enable'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Title row */}
                            <div className="flex items-center justify-between p-4">
                                <h3 className={cn(
                                    "font-semibold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    Notifications
                                </h3>
                                <div className="flex items-center gap-1">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1",
                                                isDark
                                                    ? "hover:bg-white/10 text-white/60 hover:text-white"
                                                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                            )}
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={deleteAllNotifications}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-colors",
                                                isDark
                                                    ? "hover:bg-red-500/20 text-white/60 hover:text-red-400"
                                                    : "hover:bg-red-50 text-gray-500 hover:text-red-500"
                                            )}
                                            title="Clear all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <Link
                                        href="/admin/settings"
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors",
                                            isDark
                                                ? "hover:bg-white/10 text-white/60 hover:text-white"
                                                : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                        )}
                                        title="Settings"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Content - with data-notification-panel to prevent auto-close on scroll */}
                        <div
                            className="overflow-y-auto max-h-[calc(70vh-60px)]"
                            data-notification-panel
                        >
                            {notifications.length === 0 ? (
                                <div className={cn(
                                    "flex flex-col items-center justify-center py-12 px-4",
                                    isDark ? "text-white/40" : "text-gray-400"
                                )}>
                                    <Bell className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {Object.entries(groupedNotifications).map(([group, notifs]) => {
                                        if (notifs.length === 0) return null;

                                        return (
                                            <div key={group}>
                                                {/* Group header */}
                                                <div className={cn(
                                                    "px-4 py-2 text-xs font-semibold uppercase tracking-wider",
                                                    isDark ? "text-white/40" : "text-gray-400"
                                                )}>
                                                    {group}
                                                </div>

                                                {/* Notifications */}
                                                {notifs.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={cn(
                                                            "group relative px-4 py-3 transition-colors cursor-pointer",
                                                            !notification.readAt && (isDark ? "bg-white/5" : "bg-blue-50/50"),
                                                            isDark ? "hover:bg-white/10" : "hover:bg-gray-50"
                                                        )}
                                                        onClick={() => {
                                                            markAsRead(notification.id);
                                                            if (notification.url) {
                                                                window.open(notification.url, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        {/* Priority indicator */}
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1"
                                                            style={{ backgroundColor: getPriorityColor(notification.priority) }}
                                                        />

                                                        <div className="flex items-start gap-3 pl-2">
                                                            {/* Icon or Image */}
                                                            {notification.image ? (
                                                                <img
                                                                    src={notification.image}
                                                                    alt=""
                                                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                                                    isDark ? "bg-white/10" : "bg-gray-100"
                                                                )}>
                                                                    {getPriorityIcon(notification.priority)}
                                                                </div>
                                                            )}

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className={cn(
                                                                        "text-sm truncate",
                                                                        !notification.readAt ? "font-semibold" : "font-medium",
                                                                        isDark ? "text-white" : "text-gray-900"
                                                                    )}>
                                                                        {notification.title}
                                                                    </h4>
                                                                    {notification.url && (
                                                                        <ExternalLink className={cn(
                                                                            "w-3 h-3 flex-shrink-0",
                                                                            isDark ? "text-white/30" : "text-gray-300"
                                                                        )} />
                                                                    )}
                                                                </div>
                                                                <p className={cn(
                                                                    "text-xs mt-0.5 line-clamp-2",
                                                                    isDark ? "text-white/60" : "text-gray-600"
                                                                )}>
                                                                    {notification.body}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn(
                                                                        "text-xs",
                                                                        isDark ? "text-white/40" : "text-gray-400"
                                                                    )}>
                                                                        {formatTime(notification.createdAt)}
                                                                    </span>
                                                                    {!notification.readAt && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Delete button (shows on hover) */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteNotification(notification.id);
                                                                }}
                                                                className={cn(
                                                                    "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                                                                    isDark
                                                                        ? "hover:bg-red-500/20 text-white/50 hover:text-red-400"
                                                                        : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                                                                )}
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
