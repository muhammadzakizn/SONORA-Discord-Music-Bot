"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { WEB_VERSION, CHANGELOG, getVersionChangelog } from '@/constants/version';

interface UpdateContextType {
    // State
    updateAvailable: boolean;
    waitingWorker: ServiceWorker | null;
    currentVersion: string;
    newVersion: string | null;
    postponeCount: number;
    isUpdating: boolean;
    updateProgress: number;
    updateComplete: boolean;

    // Actions
    triggerUpdate: () => void;
    postponeUpdate: () => void;
    dismissSuccess: () => void;
    getChangelog: () => typeof CHANGELOG[0] | undefined;
}

const UpdateContext = createContext<UpdateContextType | null>(null);

const POSTPONE_KEY = 'sonora-update-postpone-count';
const MAX_POSTPONE = 3;

export function UpdateProvider({ children }: { children: ReactNode }) {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [newVersion, setNewVersion] = useState<string | null>(null);
    const [postponeCount, setPostponeCount] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateComplete, setUpdateComplete] = useState(false);

    // Load postpone count from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(POSTPONE_KEY);
            if (stored) {
                setPostponeCount(parseInt(stored, 10) || 0);
            }
        }
    }, []);

    // Check for Service Worker updates
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const checkForUpdates = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Listen for new waiting worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available!
                            setWaitingWorker(newWorker);
                            setUpdateAvailable(true);
                            // For demo, we use same version - in production, SW would pass version
                            setNewVersion(WEB_VERSION);
                        }
                    });
                });

                // Check if there's already a waiting worker
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setUpdateAvailable(true);
                    setNewVersion(WEB_VERSION);
                }
            } catch (error) {
                console.error('[Update] Error checking for updates:', error);
            }
        };

        checkForUpdates();
    }, []);

    // Trigger the update
    const triggerUpdate = useCallback(() => {
        if (!waitingWorker) return;

        setIsUpdating(true);
        setUpdateProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUpdateProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + Math.random() * 15;
            });
        }, 200);

        // Tell SW to skip waiting and activate
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearInterval(progressInterval);
            setUpdateProgress(100);
            setIsUpdating(false);
            setUpdateComplete(true);
            setUpdateAvailable(false);

            // Reset postpone count
            localStorage.removeItem(POSTPONE_KEY);
            setPostponeCount(0);

            // Auto refresh after 15 seconds
            setTimeout(() => {
                window.location.reload();
            }, 15000);
        });
    }, [waitingWorker]);

    // Postpone the update
    const postponeUpdate = useCallback(() => {
        const newCount = Math.min(postponeCount + 1, MAX_POSTPONE);
        setPostponeCount(newCount);
        localStorage.setItem(POSTPONE_KEY, String(newCount));

        // Just hide the dialog, don't clear update available
        // Next time settings is opened, it will show again
    }, [postponeCount]);

    // Dismiss success dialog
    const dismissSuccess = useCallback(() => {
        setUpdateComplete(false);
        window.location.reload();
    }, []);

    // Get changelog for new version
    const getChangelog = useCallback(() => {
        if (!newVersion) return undefined;
        return getVersionChangelog(newVersion);
    }, [newVersion]);

    // Can postpone only if under limit
    const canPostpone = postponeCount < MAX_POSTPONE;

    return (
        <UpdateContext.Provider
            value={{
                updateAvailable,
                waitingWorker,
                currentVersion: WEB_VERSION,
                newVersion,
                postponeCount,
                isUpdating,
                updateProgress: Math.min(updateProgress, 100),
                updateComplete,
                triggerUpdate,
                postponeUpdate: canPostpone ? postponeUpdate : triggerUpdate, // Force update if at limit
                dismissSuccess,
                getChangelog,
            }}
        >
            {children}
        </UpdateContext.Provider>
    );
}

export function useUpdate() {
    const context = useContext(UpdateContext);
    if (!context) {
        throw new Error('useUpdate must be used within UpdateProvider');
    }
    return context;
}
