"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TimePeriod = "morning" | "afternoon" | "evening" | "night" | "midnight";

interface TimeBasedGreetingProps {
    displayName: string;
    isDark: boolean;
}

// Greeting messages pool for each time period
const greetings: Record<TimePeriod, string[]> = {
    morning: [
        "Good morning!",
        "Rise and shine!",
        "A brand new day!",
        "Fresh start today!",
        "Morning vibes!",
    ],
    afternoon: [
        "Good afternoon!",
        "Keep it up!",
        "Halfway there!",
        "Stay productive!",
        "Afternoon energy!",
    ],
    evening: [
        "Good evening!",
        "Almost there!",
        "Evening calm",
        "Wrapping up?",
        "Sunset vibes!",
    ],
    night: [
        "Good night!",
        "Peaceful night",
        "Relax a bit",
        "Night owl?",
        "Starry night!",
    ],
    midnight: [
        "Still awake?",
        "Night owl mode",
        "Burning midnight oil?",
        "Late night session",
        "The quiet hours",
    ],
};

// Get time period based on hour
function getTimePeriod(hour: number): TimePeriod {
    if (hour >= 4 && hour < 11) return "morning";
    if (hour >= 11 && hour < 15) return "afternoon";
    if (hour >= 15 && hour < 18) return "evening";
    if (hour >= 18 && hour < 21) return "night";
    return "midnight";
}

// Get random greeting from pool
function getRandomGreeting(period: TimePeriod): string {
    const pool = greetings[period];
    return pool[Math.floor(Math.random() * pool.length)];
}

// Morning Illustration - Sunrise with clouds
function MorningIllustration() {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32">
            {/* Sky gradient */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-300 via-orange-400 to-rose-400 opacity-30" />

            {/* Sun */}
            <motion.div
                initial={{ y: 10, opacity: 0.8 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_40px_rgba(251,191,36,0.6)]"
            />

            {/* Sun rays */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.3, scale: 0.8 }}
                    animate={{ opacity: 0.7, scale: 1 }}
                    transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, repeatType: "reverse" }}
                    className="absolute bottom-8 left-1/2 w-1 h-6 bg-gradient-to-t from-amber-400 to-transparent origin-bottom"
                    style={{ transform: `translateX(-50%) rotate(${i * 45}deg)` }}
                />
            ))}

            {/* Clouds */}
            <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 right-0 w-12 h-5 bg-white/60 rounded-full blur-[1px]"
            />
            <motion.div
                animate={{ x: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 left-0 w-10 h-4 bg-white/50 rounded-full blur-[1px]"
            />
        </div>
    );
}

// Afternoon Illustration - Bright sun
function AfternoonIllustration() {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32">
            {/* Sky */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-sky-300 to-blue-400 opacity-20" />

            {/* Sun */}
            <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_60px_rgba(251,191,36,0.5)]"
            />

            {/* Rays */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-gradient-to-t from-amber-400/60 to-transparent origin-bottom"
                    style={{ transform: `translate(-50%, -100%) rotate(${i * 30}deg) translateY(-24px)` }}
                />
            ))}
        </div>
    );
}

// Evening Illustration - Sunset
function EveningIllustration() {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32">
            {/* Sky gradient */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-400 via-rose-500 to-purple-600 opacity-30" />

            {/* Setting sun */}
            <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-16 md:w-18 md:h-18 rounded-full bg-gradient-to-br from-orange-400 via-rose-500 to-red-600 shadow-[0_0_50px_rgba(251,113,133,0.5)]"
            />

            {/* Horizon line */}
            <div className="absolute bottom-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-300/50 to-transparent" />

            {/* Birds */}
            <motion.svg
                animate={{ x: [0, 20, 0], y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 right-4 w-6 h-4 text-gray-700/40"
                viewBox="0 0 24 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M1 6 Q6 1, 12 6 Q18 1, 23 6" />
            </motion.svg>
        </div>
    );
}

// Night Illustration - Crescent moon with stars
function NightIllustration() {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32">
            {/* Sky */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-indigo-900 to-slate-900 opacity-30" />

            {/* Moon */}
            <motion.div
                animate={{ rotate: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-300 shadow-[0_0_30px_rgba(226,232,240,0.4)]"
            >
                {/* Moon crater shadow */}
                <div className="absolute top-1 right-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-indigo-900/90 to-slate-900/90" />
            </motion.div>

            {/* Stars */}
            {[[2, 16], [18, 8], [6, 22], [22, 20], [14, 4]].map(([left, top], i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full"
                    style={{ left: `${left}%`, top: `${top}%` }}
                />
            ))}
        </div>
    );
}

// Midnight Illustration - Full moon with twinkling stars
function MidnightIllustration() {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32">
            {/* Deep night sky */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-950 to-indigo-950 opacity-40" />

            {/* Full moon */}
            <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_40px_rgba(226,232,240,0.3)]"
            >
                {/* Moon texture */}
                <div className="absolute top-3 left-2 w-2 h-2 rounded-full bg-slate-400/30" />
                <div className="absolute bottom-4 right-3 w-3 h-3 rounded-full bg-slate-400/20" />
            </motion.div>

            {/* Twinkling stars */}
            {[[5, 10], [15, 5], [80, 15], [85, 25], [10, 75], [20, 85], [75, 80], [90, 70]].map(([left, top], i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{ left: `${left}%`, top: `${top}%` }}
                />
            ))}

            {/* Shooting star */}
            <motion.div
                initial={{ x: -20, y: 0, opacity: 0 }}
                animate={{ x: 40, y: 30, opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                className="absolute top-2 left-4 w-8 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-45"
            />
        </div>
    );
}

// Illustration selector component
function TimeIllustration({ period }: { period: TimePeriod }) {
    switch (period) {
        case "morning":
            return <MorningIllustration />;
        case "afternoon":
            return <AfternoonIllustration />;
        case "evening":
            return <EveningIllustration />;
        case "night":
            return <NightIllustration />;
        case "midnight":
            return <MidnightIllustration />;
    }
}

export function TimeBasedGreeting({ displayName, isDark }: TimeBasedGreetingProps) {
    const [mounted, setMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState(new Date().getHours());

    // Only run on client to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
        setCurrentHour(new Date().getHours());

        // Update every minute
        const interval = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const timePeriod = useMemo(() => getTimePeriod(currentHour), [currentHour]);

    // Get greeting only once per mount to avoid constant changes
    const greeting = useMemo(() => {
        if (!mounted) return "Welcome!";
        return getRandomGreeting(timePeriod);
    }, [mounted, timePeriod]);

    if (!mounted) {
        // SSR fallback
        return (
            <div className={cn(
                "p-6 rounded-2xl bg-gradient-to-r border",
                isDark
                    ? "from-[#7B1E3C]/20 to-[#C4314B]/20 border-[#7B1E3C]/30"
                    : "from-[#7B1E3C]/10 to-[#C4314B]/10 border-[#7B1E3C]/20"
            )}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>
                            Welcome!
                        </p>
                        <h2 className={cn("text-2xl md:text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            {displayName}
                        </h2>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "p-6 rounded-2xl bg-gradient-to-r border overflow-hidden relative",
                isDark
                    ? "from-[#7B1E3C]/20 to-[#C4314B]/20 border-[#7B1E3C]/30"
                    : "from-[#7B1E3C]/10 to-[#C4314B]/10 border-[#7B1E3C]/20"
            )}
        >
            <div className="flex items-center justify-between">
                {/* Text content */}
                <div className="flex-1">
                    <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className={cn(
                            "text-base md:text-lg font-medium",
                            isDark ? "text-zinc-300" : "text-gray-600"
                        )}
                    >
                        {greeting}
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                            "text-2xl md:text-3xl font-bold mt-1",
                            isDark ? "text-white" : "text-gray-900"
                        )}
                    >
                        {displayName}
                    </motion.h2>
                </div>

                {/* Illustration */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", damping: 15 }}
                    className="flex-shrink-0 ml-4"
                >
                    <TimeIllustration period={timePeriod} />
                </motion.div>
            </div>
        </motion.div>
    );
}
