"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    ChevronLeft,
    ChevronRight,
    Music2,
    Calendar,
    TrendingUp,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

// Types
interface TopTrack {
    rank: number;
    title: string;
    artist: string;
    album?: string;
    artwork_url?: string;
    play_count: number;
    total_duration: number;
}

interface MonthlyTopTracks {
    year: number;
    month: number;
    month_name: string;
    total_plays: number;
    total_duration: number;
    tracks: TopTrack[];
}

interface HistoryMonth {
    year: number;
    month: number;
    track_count: number;
}

interface TopTracksCarouselProps {
    userId?: string | number;
}

// Format duration in minutes
function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
}

// Month names
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Shimmer loading placeholder
function ShimmerCard({ isDark }: { isDark: boolean }) {
    return (
        <div className={cn(
            "relative flex-shrink-0 w-36 h-48 rounded-xl overflow-hidden",
            isDark ? "bg-zinc-800" : "bg-gray-200"
        )}>
            <div className="absolute inset-0 shimmer-effect" />
            <style jsx>{`
        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)'} 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
        </div>
    );
}

// Track card component
function TrackCard({
    track,
    isDark,
    onClick
}: {
    track: TopTrack;
    isDark: boolean;
    onClick?: () => void;
}) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative flex-shrink-0 w-36 rounded-xl overflow-hidden cursor-pointer group",
                "transition-transform duration-200 hover:scale-105"
            )}
            onClick={onClick}
        >
            {/* Album Art */}
            <div className="relative aspect-square rounded-xl overflow-hidden">
                {track.artwork_url && !imageError ? (
                    <>
                        {!imageLoaded && <ShimmerCard isDark={isDark} />}
                        <Image
                            src={track.artwork_url}
                            alt={track.title}
                            fill
                            className={cn(
                                "object-cover transition-opacity duration-300",
                                imageLoaded ? "opacity-100" : "opacity-0"
                            )}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            sizes="144px"
                        />
                    </>
                ) : (
                    <div className={cn(
                        "w-full h-full flex items-center justify-center",
                        isDark
                            ? "bg-gradient-to-br from-zinc-800 to-zinc-900"
                            : "bg-gradient-to-br from-gray-200 to-gray-300"
                    )}>
                        <Music2 className={cn(
                            "w-12 h-12",
                            isDark ? "text-zinc-600" : "text-gray-400"
                        )} />
                    </div>
                )}

                {/* Rank Badge */}
                <div className={cn(
                    "absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center",
                    "font-bold text-sm shadow-lg",
                    track.rank === 1
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black"
                        : track.rank === 2
                            ? "bg-gradient-to-br from-gray-300 to-gray-400 text-black"
                            : track.rank === 3
                                ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                                : "bg-black/60 backdrop-blur-sm text-white"
                )}>
                    {track.rank}
                </div>

                {/* Play count overlay */}
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 p-2",
                    "bg-gradient-to-t from-black/80 to-transparent",
                    "opacity-0 group-hover:opacity-100 transition-opacity"
                )}>
                    <div className="flex items-center gap-1 text-white text-xs">
                        <TrendingUp className="w-3 h-3" />
                        <span>{track.play_count} plays</span>
                    </div>
                </div>
            </div>

            {/* Track Info */}
            <div className="mt-2 px-1">
                <p className={cn(
                    "text-sm font-medium truncate",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    {track.title}
                </p>
                <p className={cn(
                    "text-xs truncate",
                    isDark ? "text-zinc-400" : "text-gray-500"
                )}>
                    {track.artist}
                </p>
            </div>
        </motion.div>
    );
}

export default function TopTracksCarousel({ userId }: TopTracksCarouselProps) {
    const { isDark } = useSettings();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [topTracks, setTopTracks] = useState<MonthlyTopTracks | null>(null);
    const [availableMonths, setAvailableMonths] = useState<HistoryMonth[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [showMonthSelector, setShowMonthSelector] = useState(false);

    // Fetch available months
    useEffect(() => {
        if (!userId) return;

        const fetchMonths = async () => {
            try {
                const res = await fetch(`/api/bot/history/months?user_id=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableMonths(data.months || []);
                }
            } catch (err) {
                console.error("Failed to fetch available months:", err);
            }
        };

        fetchMonths();
    }, [userId]);

    // Fetch top tracks for selected month
    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const fetchTopTracks = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/api/bot/top-tracks/monthly?user_id=${userId}&year=${selectedYear}&month=${selectedMonth}`
                );

                if (!res.ok) {
                    throw new Error("Failed to fetch top tracks");
                }

                const data: MonthlyTopTracks = await res.json();
                setTopTracks(data);
            } catch (err) {
                console.error("Failed to fetch top tracks:", err);
                setError("Could not load top tracks");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTopTracks();
    }, [userId, selectedYear, selectedMonth]);

    // Scroll handlers
    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = 300;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Get unique years from available months
    const availableYears = [...new Set(availableMonths.map(m => m.year))].sort((a, b) => b - a);

    // If no userId, don't render
    if (!userId) return null;

    return (
        <div className={cn(
            "rounded-2xl p-6 border",
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setShowMonthSelector(!showMonthSelector)}
                >
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-[#7B1E3C]/20" : "bg-[#7B1E3C]/10"
                    )}>
                        <TrendingUp className="w-5 h-5 text-[#C4314B]" />
                    </div>
                    <div>
                        <h3 className={cn(
                            "font-semibold flex items-center gap-2",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Top 10 Tracks
                            <Calendar className="w-4 h-4 text-[#C4314B] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className={cn(
                            "text-sm",
                            isDark ? "text-zinc-400" : "text-gray-500"
                        )}>
                            {topTracks?.month_name || MONTHS[selectedMonth - 1]} {selectedYear}
                        </p>
                    </div>
                </div>

                {/* Scroll buttons */}
                {topTracks && topTracks.tracks.length > 3 && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                isDark
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                            )}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                isDark
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                            )}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Month/Year Selector */}
            <AnimatePresence>
                {showMonthSelector && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-zinc-800" : "bg-gray-100"
                        )}>
                            {/* Year selector */}
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                {availableYears.length > 0 ? (
                                    availableYears.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => setSelectedYear(year)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                                                selectedYear === year
                                                    ? "bg-[#7B1E3C] text-white"
                                                    : isDark
                                                        ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                                        : "bg-white text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {year}
                                        </button>
                                    ))
                                ) : (
                                    <button
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium bg-[#7B1E3C] text-white"
                                        )}
                                    >
                                        {new Date().getFullYear()}
                                    </button>
                                )}
                            </div>

                            {/* Month selector */}
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {MONTHS.map((month, idx) => {
                                    const monthNum = idx + 1;
                                    const hasData = availableMonths.some(
                                        m => m.year === selectedYear && m.month === monthNum
                                    );

                                    return (
                                        <button
                                            key={month}
                                            onClick={() => {
                                                setSelectedMonth(monthNum);
                                                setShowMonthSelector(false);
                                            }}
                                            disabled={!hasData && availableYears.length > 0}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                selectedMonth === monthNum && selectedYear === selectedYear
                                                    ? "bg-[#7B1E3C] text-white"
                                                    : hasData || availableYears.length === 0
                                                        ? isDark
                                                            ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                                            : "bg-white text-gray-600 hover:bg-gray-200"
                                                        : isDark
                                                            ? "bg-zinc-700/50 text-zinc-600 cursor-not-allowed"
                                                            : "bg-gray-50 text-gray-400 cursor-not-allowed"
                                            )}
                                        >
                                            {month.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats */}
            {topTracks && topTracks.tracks.length > 0 && (
                <div className="flex gap-4 mb-4">
                    <div className={cn(
                        "flex items-center gap-2 text-sm",
                        isDark ? "text-zinc-400" : "text-gray-500"
                    )}>
                        <TrendingUp className="w-4 h-4" />
                        <span>{topTracks.total_plays} total plays</span>
                    </div>
                    <div className={cn(
                        "flex items-center gap-2 text-sm",
                        isDark ? "text-zinc-400" : "text-gray-500"
                    )}>
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(topTracks.total_duration)}</span>
                    </div>
                </div>
            )}

            {/* Tracks carousel */}
            {isLoading ? (
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <ShimmerCard key={i} isDark={isDark} />
                    ))}
                </div>
            ) : error ? (
                <div className={cn(
                    "py-12 text-center",
                    isDark ? "text-zinc-500" : "text-gray-400"
                )}>
                    <p>{error}</p>
                </div>
            ) : !topTracks || topTracks.tracks.length === 0 ? (
                <div className={cn(
                    "py-12 text-center",
                    isDark ? "text-zinc-500" : "text-gray-400"
                )}>
                    <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tracks played in {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                    <p className="text-sm mt-1">Play some music to see your stats!</p>
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {topTracks.tracks.map(track => (
                        <TrackCard
                            key={`${track.rank}-${track.title}`}
                            track={track}
                            isDark={isDark}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
