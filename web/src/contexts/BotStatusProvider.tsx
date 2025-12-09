"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

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
});

export const useBotStatus = () => useContext(BotStatusContext);

interface BotStatusProviderProps {
    children: ReactNode;
}

export function BotStatusProvider({ children }: BotStatusProviderProps) {
    const [status, setStatus] = useState<BotStatus>(defaultStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkStatus = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/health', {
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
            } else {
                setStatus(prev => ({
                    ...prev,
                    online: false,
                    lastCheck: new Date(),
                }));
                setError('Bot is not responding');
            }
        } catch (err) {
            setStatus(prev => ({
                ...prev,
                online: false,
                lastCheck: new Date(),
            }));

            if (err instanceof Error) {
                if (err.name === 'AbortError') {
                    setError('Connection timeout');
                } else {
                    setError('Unable to connect to bot');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

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
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkStatus]);

    return (
        <BotStatusContext.Provider value={{ status, isLoading, error, checkStatus }}>
            {children}
        </BotStatusContext.Provider>
    );
}
