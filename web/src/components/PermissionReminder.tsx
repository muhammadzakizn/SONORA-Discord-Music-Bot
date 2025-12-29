"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertCircle, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    shouldShowPermissionReminder,
    dismissPermissionReminder,
    requestNotificationPermission,
    areNotificationsBlocked,
} from '@/lib/permissions';

interface PermissionReminderProps {
    isDark?: boolean;
    onDismiss?: () => void;
}

export function PermissionReminder({ isDark = true, onDismiss }: PermissionReminderProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'requesting'>('default');

    useEffect(() => {
        // Check if we should show the reminder
        const timer = setTimeout(() => {
            if (shouldShowPermissionReminder()) {
                setIsVisible(true);

                // Update status
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    setNotificationStatus(Notification.permission as 'default' | 'granted' | 'denied');
                }
            }
        }, 2000); // Show after 2 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        setNotificationStatus('requesting');
        const granted = await requestNotificationPermission();
        setNotificationStatus(granted ? 'granted' : 'denied');

        if (granted) {
            // Close after showing success
            setTimeout(() => handleDismiss(), 1500);
        }
    };

    const handleDismiss = (dontAskAgain = false) => {
        dismissPermissionReminder(dontAskAgain);
        setIsVisible(false);
        onDismiss?.();
    };

    if (!isVisible) return null;

    const isBlocked = areNotificationsBlocked();

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[9998]"
                        onClick={() => handleDismiss()}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl overflow-hidden",
                            isDark
                                ? "bg-neutral-900 border-t border-neutral-700"
                                : "bg-white border-t border-gray-200"
                        )}
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className={cn(
                                "w-10 h-1 rounded-full",
                                isDark ? "bg-white/20" : "bg-gray-300"
                            )} />
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center",
                                    notificationStatus === 'granted'
                                        ? "bg-green-500/20"
                                        : notificationStatus === 'denied' || isBlocked
                                            ? "bg-red-500/20"
                                            : isDark ? "bg-pink-500/20" : "bg-pink-100"
                                )}>
                                    {notificationStatus === 'granted' ? (
                                        <Check className="w-8 h-8 text-green-500" />
                                    ) : notificationStatus === 'denied' || isBlocked ? (
                                        <AlertCircle className="w-8 h-8 text-red-500" />
                                    ) : (
                                        <Bell className="w-8 h-8 text-pink-500" />
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className={cn(
                                "text-xl font-bold text-center mb-2",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                {notificationStatus === 'granted'
                                    ? "Notifications Enabled!"
                                    : isBlocked
                                        ? "Notifications Blocked"
                                        : "Enable Notifications"}
                            </h2>

                            {/* Description */}
                            <p className={cn(
                                "text-center mb-6",
                                isDark ? "text-white/60" : "text-gray-600"
                            )}>
                                {notificationStatus === 'granted'
                                    ? "You'll now receive important updates and announcements."
                                    : isBlocked
                                        ? "Please enable notifications in your browser settings to receive updates."
                                        : "Stay updated with important announcements, changelog updates, and more."}
                            </p>

                            {/* Permission checklist */}
                            {notificationStatus !== 'granted' && !isBlocked && (
                                <div className={cn(
                                    "rounded-xl p-4 mb-6 space-y-3",
                                    isDark ? "bg-white/5" : "bg-gray-100"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            isDark ? "bg-white/10" : "bg-white"
                                        )}>
                                            <Bell className={cn("w-4 h-4", isDark ? "text-white/70" : "text-gray-600")} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                                Push Notifications
                                            </p>
                                            <p className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>
                                                Receive alerts even when not on the page
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            isDark ? "bg-white/10" : "bg-white"
                                        )}>
                                            <Volume2 className={cn("w-4 h-4", isDark ? "text-white/70" : "text-gray-600")} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                                Notification Sounds
                                            </p>
                                            <p className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>
                                                Customizable alert sounds
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="space-y-3">
                                {notificationStatus !== 'granted' && !isBlocked && (
                                    <button
                                        onClick={handleEnable}
                                        disabled={notificationStatus === 'requesting'}
                                        className={cn(
                                            "w-full py-3 px-4 rounded-xl font-semibold transition-colors",
                                            "bg-pink-600 hover:bg-pink-700 text-white",
                                            notificationStatus === 'requesting' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {notificationStatus === 'requesting' ? 'Requesting...' : 'Enable Now'}
                                    </button>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleDismiss()}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl font-medium transition-colors",
                                            isDark
                                                ? "bg-white/10 hover:bg-white/20 text-white"
                                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                        )}
                                    >
                                        {notificationStatus === 'granted' || isBlocked ? 'Close' : 'Remind Me Later'}
                                    </button>

                                    {notificationStatus !== 'granted' && !isBlocked && (
                                        <button
                                            onClick={() => handleDismiss(true)}
                                            className={cn(
                                                "py-3 px-4 rounded-xl font-medium transition-colors",
                                                isDark
                                                    ? "text-white/50 hover:text-white/70"
                                                    : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            Don't Ask
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
