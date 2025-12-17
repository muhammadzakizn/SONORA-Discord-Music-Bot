"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from "react";

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact";
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

export default function Turnstile({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = "dark",
    size = "normal",
}: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

        try {
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: onVerify,
                "error-callback": onError,
                "expired-callback": onExpire,
                theme,
                size,
            });
        } catch (error) {
            console.error("[Turnstile] Render error:", error);
        }
    }, [siteKey, onVerify, onError, onExpire, theme, size]);

    useEffect(() => {
        // If already loaded, render immediately
        if (window.turnstile && isLoaded) {
            renderWidget();
        }
    }, [isLoaded, renderWidget]);

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
        };
    }, []);

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
                strategy="lazyOnload"
                onLoad={() => {
                    if (window.turnstile) {
                        setIsLoaded(true);
                    }
                }}
            />
            {/* Container for Turnstile widget - do NOT use data-* attributes here
                as we manually render the widget via turnstile.render() */}
            <div
                ref={containerRef}
                className="cf-turnstile flex justify-center"
            />
        </>
    );
}
