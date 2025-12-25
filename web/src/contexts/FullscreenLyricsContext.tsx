"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface FullscreenLyricsContextType {
    isFullscreenLyricsOpen: boolean;
    setFullscreenLyricsOpen: (open: boolean) => void;
}

const FullscreenLyricsContext = createContext<FullscreenLyricsContextType | null>(null);

export function FullscreenLyricsProvider({ children }: { children: ReactNode }) {
    const [isFullscreenLyricsOpen, setFullscreenLyricsOpen] = useState(false);

    return (
        <FullscreenLyricsContext.Provider value={{ isFullscreenLyricsOpen, setFullscreenLyricsOpen }}>
            {children}
        </FullscreenLyricsContext.Provider>
    );
}

export function useFullscreenLyrics() {
    const context = useContext(FullscreenLyricsContext);
    if (!context) {
        // Return a default value if used outside provider (for backward compatibility)
        return {
            isFullscreenLyricsOpen: false,
            setFullscreenLyricsOpen: () => { },
        };
    }
    return context;
}
