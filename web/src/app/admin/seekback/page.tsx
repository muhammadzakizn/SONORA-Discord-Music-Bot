"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

export default function SeekbackPage() {
    const { isDark } = useSettings();

    return (
        <div
            className={cn(
                "min-h-screen w-full",
                isDark ? "bg-black" : "bg-white"
            )}
        >
            {/* Empty canvas - ready for rebuild */}
        </div>
    );
}
