"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact";
    timeout?: number; // Timeout in seconds (default: 10)
}

declare global {
    interface Window {
        turnstile: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    "error-callback"?: () => void;
                    "expired-callback"?: () => void;
                    theme?: string;
                    size?: string;
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

type CaptchaStatus = "loading" | "ready" | "error" | "verified" | "timeout";

export default function Turnstile({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = "dark",
    size = "normal",
    timeout = 10,
}: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [status, setStatus] = useState<CaptchaStatus>("loading");
    const [retryCount, setRetryCount] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleVerify = useCallback((token: string) => {
        setStatus("verified");
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        onVerify(token);
    }, [onVerify]);

    const handleError = useCallback(() => {
        console.error("[Turnstile] Widget error");
        setStatus("error");
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        onError?.();
    }, [onError]);

    const resetWidget = useCallback(() => {
        // Remove existing widget
        if (widgetIdRef.current && window.turnstile) {
            try {
                window.turnstile.remove(widgetIdRef.current);
            } catch (e) {
                // Ignore errors
            }
            widgetIdRef.current = null;
        }
        setStatus("loading");
        setRetryCount(prev => prev + 1);
    }, []);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

        try {
            setStatus("loading");

            // Set timeout for loading
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                if (status === "loading") {
                    console.warn("[Turnstile] Timeout - auto refreshing");
                    setStatus("timeout");
                    // Auto-refresh after timeout
                    setTimeout(() => resetWidget(), 1000);
                }
            }, timeout * 1000);

            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: handleVerify,
                "error-callback": handleError,
                "expired-callback": () => {
                    console.log("[Turnstile] Token expired");
                    onExpire?.();
                    setStatus("loading");
                },
                theme,
                size,
            });

            setStatus("ready");
        } catch (error) {
            console.error("[Turnstile] Render error:", error);
            setStatus("error");
        }
    }, [siteKey, handleVerify, handleError, onExpire, theme, size, timeout, status, resetWidget]);

    useEffect(() => {
        // If already loaded, render immediately
        if (window.turnstile && isLoaded) {
            renderWidget();
        }
    }, [isLoaded, renderWidget, retryCount]);

    useEffect(() => {
        // Set up callback for when script loads
        window.onTurnstileLoad = () => {
            setIsLoaded(true);
        };

        // Check if already loaded
        if (window.turnstile) {
            setIsLoaded(true);
        }

        return () => {
            // Cleanup widget on unmount
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-3">
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
                strategy="lazyOnload"
                onLoad={() => {
                    if (window.turnstile) {
                        setIsLoaded(true);
                    }
                }}
            />

            {/* Loading state */}
            {(status === "loading" && !widgetIdRef.current) && (
                <div className="flex flex-col items-center gap-2 py-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin" />
                        <Loader2 className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-sm text-white/60">Loading verification...</p>
                </div>
            )}

            {/* Timeout state */}
            {status === "timeout" && (
                <div className="flex flex-col items-center gap-2 py-4">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-sm text-amber-400">Refreshing CAPTCHA...</p>
                </div>
            )}

            {/* Error state with retry button */}
            {status === "error" && (
                <div className="flex flex-col items-center gap-3 py-4">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                    <p className="text-sm text-red-400 text-center">
                        Verification failed to load
                    </p>
                    <button
                        onClick={resetWidget}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            )}

            {/* Container for Turnstile widget - do NOT use data-* attributes here
                as we manually render the widget via turnstile.render() */}
            <div
                ref={containerRef}
                className={`cf-turnstile flex justify-center transition-opacity ${status === "loading" && !widgetIdRef.current ? "opacity-0 h-0" : "opacity-100"
                    }`}
            />

            {/* Verified state */}
            {status === "verified" && (
                <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Verified</span>
                </div>
            )}
        </div>
    );
}

