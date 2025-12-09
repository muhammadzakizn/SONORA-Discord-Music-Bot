"use client";

import { ReactNode, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

export function ThemeWrapper({ children }: { children: ReactNode }) {
    const { isDark, fontSize, dyslexicFont, highContrast, reducedMotion, language } = useSettings();

    useEffect(() => {
        // Apply theme to html element
        const html = document.documentElement;

        // Theme
        if (isDark) {
            html.classList.add("dark");
            html.classList.remove("light");
        } else {
            html.classList.add("light");
            html.classList.remove("dark");
        }

        // Font size
        html.classList.remove("text-normal", "text-large", "text-xlarge");
        html.classList.add(`text-${fontSize}`);

        // Dyslexic font
        if (dyslexicFont) {
            html.classList.add("dyslexic-font");
        } else {
            html.classList.remove("dyslexic-font");
        }

        // High contrast
        if (highContrast) {
            html.classList.add("high-contrast");
        } else {
            html.classList.remove("high-contrast");
        }

        // Reduced motion
        if (reducedMotion) {
            html.classList.add("reduce-motion");
        } else {
            html.classList.remove("reduce-motion");
        }

        // Language direction
        const dir = language === "ar" ? "rtl" : "ltr";
        html.setAttribute("dir", dir);
        html.setAttribute("lang", language);

    }, [isDark, fontSize, dyslexicFont, highContrast, reducedMotion, language]);

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-300",
            isDark ? "bg-black text-white" : "bg-white text-gray-900"
        )}>
            {children}
        </div>
    );
}
