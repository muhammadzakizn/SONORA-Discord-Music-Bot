"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, Info, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, NotificationPriority, getPriorityColor } from '@/lib/notifications';

interface NotificationToastProps {
    notification: Notification;
    onClose: () => void;
    onRead: () => void;
    duration?: number;
    isDark?: boolean;
}

export function NotificationToast({
    notification,
    onClose,
    onRead,
    duration = 5000,
    isDark = true,
}: NotificationToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(100);

    // Auto-dismiss timer
    useEffect(() => {
        if (duration <= 0) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining <= 0) {
                handleClose();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleClick = () => {
        onRead();
        if (notification.url) {
            window.open(notification.url, '_blank');
        }
        handleClose();
    };

    const getPriorityIcon = (priority: NotificationPriority) => {
        switch (priority) {
            case 'urgent':
                return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'important':
                return <Bell className="w-5 h-5 text-orange-400" />;
            case 'normal':
                return <Info className="w-5 h-5 text-gray-400" />;
            case 'low':
                return <Sparkles className="w-5 h-5 text-blue-400" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    const priorityColor = getPriorityColor(notification.priority);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn(
                        "relative w-full max-w-sm overflow-hidden rounded-xl shadow-2xl",
                        "backdrop-blur-xl border",
                        isDark
                            ? "bg-neutral-900/95 border-neutral-700"
                            : "bg-white/95 border-neutral-200"
                    )}
                    style={{
                        borderLeftColor: priorityColor,
                        borderLeftWidth: '4px',
                    }}
                >
                    {/* Progress bar */}
                    {duration > 0 && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
                            <motion.div
                                className="h-full"
                                style={{
                                    backgroundColor: priorityColor,
                                    width: `${progress}%`,
                                }}
                                transition={{ duration: 0.05 }}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div
                        className="p-4 cursor-pointer"
                        onClick={handleClick}
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon or Image */}
                            {notification.image ? (
                                <img
                                    src={notification.image}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover"
                                />
                            ) : (
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    isDark ? "bg-white/10" : "bg-gray-100"
                                )}>
                                    {getPriorityIcon(notification.priority)}
                                </div>
                            )}

                            {/* Text content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={cn(
                                        "font-semibold text-sm truncate",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {notification.title}
                                    </h4>
                                    {notification.url && (
                                        <ExternalLink className={cn(
                                            "w-3 h-3 flex-shrink-0",
                                            isDark ? "text-white/40" : "text-gray-400"
                                        )} />
                                    )}
                                </div>
                                <p className={cn(
                                    "text-sm mt-1 line-clamp-2",
                                    isDark ? "text-white/70" : "text-gray-600"
                                )}>
                                    {notification.body}
                                </p>
                                <span className={cn(
                                    "text-xs mt-1 inline-block",
                                    isDark ? "text-white/40" : "text-gray-400"
                                )}>
                                    Just now
                                </span>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClose();
                                }}
                                className={cn(
                                    "p-1 rounded-lg transition-colors flex-shrink-0",
                                    isDark
                                        ? "hover:bg-white/10 text-white/50 hover:text-white"
                                        : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Toast container for multiple toasts
interface ToastContainerProps {
    toasts: Array<{ id: string; notification: Notification }>;
    onClose: (id: string) => void;
    onRead: (id: string) => void;
    isDark?: boolean;
}

export function ToastContainer({ toasts, onClose, onRead, isDark = true }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
            <AnimatePresence mode="sync">
                {toasts.map(({ id, notification }) => (
                    <div key={id} className="pointer-events-auto">
                        <NotificationToast
                            notification={notification}
                            onClose={() => onClose(id)}
                            onRead={() => onRead(id)}
                            isDark={isDark}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
