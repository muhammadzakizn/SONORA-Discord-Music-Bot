"use client";

import React, { useState, useEffect } from 'react';
import { useBotStatus } from '@/contexts/BotStatusProvider';

export default function BotStatusBanner() {
    const { status, isLoading, error, checkStatus } = useBotStatus();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Show banner when bot is offline and not loading
        if (!isLoading && !status.online && !isDismissed) {
            setIsVisible(true);
        } else if (status.online) {
            setIsVisible(false);
            setIsDismissed(false); // Reset dismissed state when back online
        }
    }, [status.online, isLoading, isDismissed]);

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
    };

    const handleRetry = async () => {
        await checkStatus();
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] animate-slide-down"
            role="alert"
            aria-live="polite"
        >
            <div className="bg-gradient-to-r from-red-900/95 via-red-800/95 to-red-900/95 backdrop-blur-md border-b border-red-500/30 shadow-lg shadow-red-900/20">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Status indicator */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span className="font-semibold text-white text-sm sm:text-base">
                                    System Offline
                                </span>
                                <span className="text-red-200/80 text-xs sm:text-sm">
                                    {error || 'Bot is not responding'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRetry}
                                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                <span className="hidden sm:inline">Retry</span>
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="p-1.5 text-red-200/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                                aria-label="Dismiss"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Last check time */}
                    <div className="mt-1 text-xs text-red-200/50">
                        Last checked: {status.lastCheck?.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
