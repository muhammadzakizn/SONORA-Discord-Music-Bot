"use client";

import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";

type TimePeriod = "morning" | "afternoon" | "evening" | "night" | "midnight";

// Get time period based on hour
function getTimePeriod(hour: number): TimePeriod {
    if (hour >= 4 && hour < 11) return "morning";
    if (hour >= 11 && hour < 15) return "afternoon";
    if (hour >= 15 && hour < 18) return "evening";
    if (hour >= 18 && hour < 21) return "night";
    return "midnight";
}

// Morning Ambient - Sunrise glow with clouds
function MorningAmbient() {
    return (
        <>
            {/* Sunrise gradient glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-radial from-amber-400/20 via-orange-300/10 to-transparent opacity-60" />

            {/* Sun peeking from corner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-yellow-300/40 via-amber-400/30 to-orange-500/20 blur-3xl"
            />

            {/* Floating clouds */}
            <motion.div
                animate={{ x: [0, 30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-[20%] w-40 h-12 bg-white/15 rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, -20, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 right-[10%] w-32 h-10 bg-white/10 rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, 25, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 right-[40%] w-48 h-14 bg-white/12 rounded-full blur-2xl"
            />
            <motion.div
                animate={{ x: [0, -15, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-32 right-[30%] w-36 h-10 bg-white/8 rounded-full blur-xl"
            />

            {/* Light rays */}
            <motion.div
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 right-20 w-2 h-40 bg-gradient-to-b from-amber-300/30 to-transparent rotate-[20deg] blur-sm"
            />
            <motion.div
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-0 right-40 w-2 h-32 bg-gradient-to-b from-amber-300/25 to-transparent rotate-[15deg] blur-sm"
            />
        </>
    );
}

// Afternoon Ambient - Bright sky with light clouds
function AfternoonAmbient() {
    return (
        <>
            {/* Bright sky gradient */}
            <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-gradient-radial from-sky-400/15 via-blue-300/10 to-transparent" />

            {/* Sun glow */}
            <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-yellow-300/30 to-amber-400/20 blur-3xl"
            />

            {/* Light fluffy clouds */}
            <motion.div
                animate={{ x: [0, 40, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 right-[15%] w-44 h-12 bg-white/12 rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, -30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 right-[35%] w-36 h-10 bg-white/10 rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 right-[50%] w-40 h-11 bg-white/8 rounded-full blur-2xl"
            />
        </>
    );
}

// Evening Ambient - Full-page sunset gradient with clouds
function EveningAmbient() {
    return (
        <>
            {/* Full-page sunset gradient background */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse 120% 80% at 80% 20%, rgba(251, 146, 60, 0.25) 0%, transparent 50%),
                        radial-gradient(ellipse 100% 60% at 60% 10%, rgba(239, 68, 68, 0.2) 0%, transparent 40%),
                        radial-gradient(ellipse 80% 50% at 90% 30%, rgba(234, 179, 8, 0.15) 0%, transparent 35%),
                        linear-gradient(180deg, 
                            rgba(234, 88, 12, 0.12) 0%, 
                            rgba(220, 38, 38, 0.08) 20%,
                            rgba(0, 0, 0, 0) 50%
                        )
                    `
                }}
            />

            {/* Large sun glow in top-right */}
            <motion.div
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.6, 0.8, 0.6]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.4) 0%, rgba(239, 68, 68, 0.2) 40%, transparent 70%)'
                }}
            />

            {/* Secondary warm glow */}
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-40 w-64 h-64 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, transparent 70%)'
                }}
            />

            {/* Scattered wispy clouds across page */}
            <motion.div
                animate={{ x: [0, 30, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[5%] left-[10%] w-[300px] h-16 bg-gradient-to-r from-orange-300/10 via-white/8 to-transparent rounded-full blur-2xl"
            />
            <motion.div
                animate={{ x: [0, -20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[8%] right-[30%] w-[250px] h-12 bg-gradient-to-r from-rose-300/8 via-white/6 to-transparent rounded-full blur-2xl"
            />
            <motion.div
                animate={{ x: [0, 25, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[15%] left-[25%] w-[200px] h-10 bg-gradient-to-r from-amber-200/8 via-white/5 to-transparent rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, -15, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[12%] right-[15%] w-[180px] h-8 bg-gradient-to-r from-orange-200/10 to-transparent rounded-full blur-xl"
            />
            <motion.div
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] left-[50%] w-[220px] h-10 bg-white/5 rounded-full blur-2xl"
            />
            <motion.div
                animate={{ x: [0, -25, 0] }}
                transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[25%] right-[40%] w-[160px] h-8 bg-rose-200/6 rounded-full blur-xl"
            />

            {/* Flying birds */}
            <motion.svg
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: [-30, -200], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 15, repeat: Infinity, repeatDelay: 12 }}
                className="absolute top-[10%] right-[30%] w-6 h-3 text-gray-700/30"
                viewBox="0 0 24 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M1 6 Q6 1, 12 6 Q18 1, 23 6" />
            </motion.svg>
            <motion.svg
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: [-20, -180], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 12, repeat: Infinity, repeatDelay: 18, delay: 5 }}
                className="absolute top-[15%] right-[25%] w-5 h-2.5 text-gray-700/25"
                viewBox="0 0 24 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M1 6 Q6 1, 12 6 Q18 1, 23 6" />
            </motion.svg>
        </>
    );
}

// Night Ambient - Dark sky with moon glow and stars
function NightAmbient() {
    return (
        <>
            {/* Night sky gradient */}
            <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-indigo-950/30 via-slate-900/20 to-transparent" />

            {/* Moon glow */}
            <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-5 right-16 w-40 h-40 rounded-full bg-gradient-to-br from-slate-200/20 to-slate-400/10 blur-3xl"
            />

            {/* Crescent moon */}
            <motion.div
                animate={{ rotate: [0, 3, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 right-24 w-16 h-16 rounded-full bg-gradient-to-br from-slate-100/40 to-slate-300/30 shadow-[0_0_40px_rgba(226,232,240,0.2)]"
            >
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-950/90 to-slate-900/90" />
            </motion.div>

            {/* Twinkling stars scattered across */}
            {[
                { left: "10%", top: "20%", size: 2, delay: 0 },
                { left: "25%", top: "8%", size: 1.5, delay: 0.5 },
                { left: "40%", top: "25%", size: 2, delay: 1 },
                { left: "55%", top: "12%", size: 1.5, delay: 0.3 },
                { left: "70%", top: "30%", size: 2, delay: 0.8 },
                { left: "85%", top: "15%", size: 1.5, delay: 0.2 },
                { left: "15%", top: "35%", size: 1, delay: 1.2 },
                { left: "35%", top: "5%", size: 1.5, delay: 0.6 },
                { left: "60%", top: "35%", size: 1, delay: 0.9 },
                { left: "80%", top: "40%", size: 1.5, delay: 0.4 },
            ].map((star, i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: star.delay }}
                    className="absolute bg-white rounded-full"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: star.size * 2,
                        height: star.size * 2
                    }}
                />
            ))}

            {/* Subtle night clouds */}
            <motion.div
                animate={{ x: [0, 20, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-[30%] w-48 h-8 bg-slate-700/10 rounded-full blur-2xl"
            />
        </>
    );
}

// Midnight Ambient - Deep night with full moon and shooting stars
function MidnightAmbient() {
    return (
        <>
            {/* Deep night gradient */}
            <div className="absolute top-0 right-0 w-full h-[350px] bg-gradient-to-b from-slate-950/40 via-indigo-950/30 to-transparent" />

            {/* Full moon glow */}
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-slate-200/25 to-slate-400/15 blur-3xl"
            />

            {/* Full moon */}
            <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 right-28 w-20 h-20 rounded-full bg-gradient-to-br from-slate-200/50 to-slate-400/40 shadow-[0_0_60px_rgba(226,232,240,0.25)]"
            >
                {/* Moon craters */}
                <div className="absolute top-4 left-3 w-3 h-3 rounded-full bg-slate-400/20" />
                <div className="absolute bottom-5 right-4 w-4 h-4 rounded-full bg-slate-400/15" />
            </motion.div>

            {/* Many twinkling stars */}
            {[
                { left: "5%", top: "15%", size: 1.5, delay: 0 },
                { left: "12%", top: "30%", size: 2, delay: 0.3 },
                { left: "20%", top: "8%", size: 1.5, delay: 0.6 },
                { left: "28%", top: "22%", size: 1, delay: 0.9 },
                { left: "35%", top: "5%", size: 2, delay: 0.2 },
                { left: "42%", top: "28%", size: 1.5, delay: 0.5 },
                { left: "50%", top: "12%", size: 1, delay: 0.8 },
                { left: "58%", top: "35%", size: 2, delay: 0.1 },
                { left: "65%", top: "18%", size: 1.5, delay: 0.4 },
                { left: "72%", top: "40%", size: 1, delay: 0.7 },
                { left: "78%", top: "25%", size: 2, delay: 1 },
                { left: "88%", top: "38%", size: 1.5, delay: 0.35 },
                { left: "8%", top: "42%", size: 1, delay: 0.55 },
                { left: "48%", top: "45%", size: 1.5, delay: 0.75 },
            ].map((star, i) => (
                <motion.div
                    key={i}
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, delay: star.delay }}
                    className="absolute bg-white rounded-full"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: star.size * 2,
                        height: star.size * 2
                    }}
                />
            ))}

            {/* Shooting stars */}
            <motion.div
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{ x: 150, y: 100, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 8 }}
                className="absolute top-10 left-[20%] w-16 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-45 blur-[0.5px]"
            />
            <motion.div
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{ x: 120, y: 80, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 12, delay: 4 }}
                className="absolute top-5 left-[50%] w-12 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-[50deg] blur-[0.5px]"
            />

            {/* Dark clouds drifting */}
            <motion.div
                animate={{ x: [0, 30, 0] }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-36 right-[25%] w-56 h-10 bg-slate-800/15 rounded-full blur-2xl"
            />
            <motion.div
                animate={{ x: [0, -25, 0] }}
                transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-[45%] w-40 h-8 bg-slate-800/10 rounded-full blur-2xl"
            />
        </>
    );
}

interface TimeAmbientBackgroundProps {
    className?: string;
}

export function TimeAmbientBackground({ className }: TimeAmbientBackgroundProps) {
    const [mounted, setMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState(new Date().getHours());

    useEffect(() => {
        setMounted(true);
        setCurrentHour(new Date().getHours());

        const interval = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const timePeriod = useMemo(() => getTimePeriod(currentHour), [currentHour]);

    if (!mounted) return null;

    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className || ''}`}>
            {timePeriod === "morning" && <MorningAmbient />}
            {timePeriod === "afternoon" && <AfternoonAmbient />}
            {timePeriod === "evening" && <EveningAmbient />}
            {timePeriod === "night" && <NightAmbient />}
            {timePeriod === "midnight" && <MidnightAmbient />}
        </div>
    );
}
