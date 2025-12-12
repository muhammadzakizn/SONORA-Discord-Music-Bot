"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { WifiOff, Home, Activity, RefreshCw } from 'lucide-react';

interface BotStatus {
    online: boolean;
    latency?: number;
    version?: string;
    lastCheck: Date;
    guilds?: number;
    activeVoice?: number;
}

interface BotStatusContextType {
    status: BotStatus;
    isLoading: boolean;
    error: string | null;
    checkStatus: () => Promise<void>;
    dismissOfflineDialog: () => void;
}

const defaultStatus: BotStatus = {
    online: false,
    lastCheck: new Date(),
};

const BotStatusContext = createContext<BotStatusContextType>({
    status: defaultStatus,
    isLoading: true,
    error: null,
    checkStatus: async () => { },
    dismissOfflineDialog: () => { },
});

export const useBotStatus = () => useContext(BotStatusContext);

interface BotStatusProviderProps {
    children: ReactNode;
}

// Offline Dialog Component
function OfflineDialog({
    isOpen,
    error,
    onRetry,
    onDismiss,
    isRetrying
}: {
    isOpen: boolean;
    error: string | null;
    onRetry: () => void;
    onDismiss: () => void;
    isRetrying: boolean;
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Blur Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={onDismiss}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 w-full max-w-md p-6 rounded-2xl bg-zinc-900/95 border border-white/[0.1] shadow-2xl"
                    >
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <WifiOff className="w-8 h-8 text-red-400" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-white text-center mb-2">
                            System Offline
                        </h2>

                        {/* Description */}
                        <p className="text-white/60 text-center mb-6">
                            {error || "Unable to connect to SONORA bot. The bot may be restarting or experiencing issues."}
                        </p>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={onRetry}
                                disabled={isRetrying}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#7B1E3C] hover:bg-[#9B2E4C] text-white font-medium transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
                                {isRetrying ? 'Reconnecting...' : 'Try Again'}
                            </button>

                            <div className="flex gap-3">
                                <Link
                                    href="/"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                                >
                                    <Home className="w-5 h-5" />
                                    Home
                                </Link>

                                <Link
                                    href="/status"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                                >
                                    <Activity className="w-5 h-5" />
                                    Status
                                </Link>
                            </div>
                        </div>

                        {/* Dismiss hint */}
                        <p className="text-white/30 text-xs text-center mt-4">
                            Click outside to dismiss
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function BotStatusProvider({ children }: BotStatusProviderProps) {
    const [status, setStatus] = useState<BotStatus>(defaultStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showOfflineDialog, setShowOfflineDialog] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);

    const checkStatus = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/bot/health', {
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                setStatus({
                    online: data.status === 'healthy' || data.online === true,
                    latency: data.latency,
                    version: data.version,
                    guilds: data.guilds,
                    activeVoice: data.active_voice,
                    lastCheck: new Date(),
                });
                setError(null);
                setConsecutiveFailures(0);
                setShowOfflineDialog(false);
            } else {
                handleFailure('Bot is not responding');
            }
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    handleFailure('Connection timeout');
                } else {
                    handleFailure('Unable to connect to bot');
                }
            } else {
                handleFailure('Connection error');
            }
        } finally {
            setIsLoading(false);
            setIsRetrying(false);
        }
    }, []);

    const handleFailure = (errorMessage: string) => {
        setStatus(prev => ({
            ...prev,
            online: false,
            lastCheck: new Date(),
        }));
        setError(errorMessage);
        setConsecutiveFailures(prev => {
            const newCount = prev + 1;
            // Show dialog after 2 consecutive failures
            if (newCount >= 2) {
                setShowOfflineDialog(true);
            }
            return newCount;
        });
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        await checkStatus();
    };

    const dismissOfflineDialog = () => {
        setShowOfflineDialog(false);
    };

    // Initial check
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Heartbeat interval - check every 30 seconds
    useEffect(() => {
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [checkStatus]);

    // Listen for online/offline events
    useEffect(() => {
        const handleOnline = () => {
            console.log('[BotStatus] Network is online, checking bot status...');
            checkStatus();
        };

        const handleOffline = () => {
            console.log('[BotStatus] Network is offline');
            setStatus(prev => ({
                ...prev,
                online: false,
                lastCheck: new Date(),
            }));
            setError('No internet connection');
            setShowOfflineDialog(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkStatus]);

    return (
        <BotStatusContext.Provider value={{ status, isLoading, error, checkStatus, dismissOfflineDialog }}>
            {children}
            <OfflineDialog
                isOpen={showOfflineDialog}
                error={error}
                onRetry={handleRetry}
                onDismiss={dismissOfflineDialog}
                isRetrying={isRetrying}
            />
        </BotStatusContext.Provider>
    );
}
