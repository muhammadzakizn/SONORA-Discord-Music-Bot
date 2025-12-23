"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
            "relative flex-shrink-0 rounded-xl overflow-hidden",
            "w-28 h-36 sm:w-36 sm:h-48 md:w-44 md:h-56",
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
    const [isFetching, setIsFetching] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Generate cache key for localStorage
    const cacheKey = `artwork_${track.title}_${track.artist}`.replace(/[^a-zA-Z0-9]/g, '_');

    // Check localStorage cache first, then use track.artwork_url, or fetch
    const [artworkUrl, setArtworkUrl] = useState<string | null>(() => {
        if (track.artwork_url) return track.artwork_url;
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { url, timestamp } = JSON.parse(cached);
                // Cache valid for 7 days
                if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return url;
                }
            }
        }
        return null;
    });

    // Fetch artwork dynamically if not available (with 30s timeout)
    useEffect(() => {
        // Only fetch once if no artwork_url and not in cache
        if (!artworkUrl && !hasFetched && !imageError) {
            setHasFetched(true);
            setIsFetching(true);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                setImageError(true);
                setIsFetching(false);
            }, 30000); // 30 second timeout

            fetch(`/api/bot/artwork/search?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`, {
                signal: controller.signal
            })
                .then(res => res.json())
                .then(data => {
                    clearTimeout(timeoutId);
                    if (data.found && data.artwork_url) {
                        setArtworkUrl(data.artwork_url);
                        // Save to localStorage cache
                        try {
                            localStorage.setItem(cacheKey, JSON.stringify({
                                url: data.artwork_url,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            // localStorage might be full
                        }
                    } else {
                        setImageError(true);
                    }
                    setIsFetching(false);
                })
                .catch(() => {
                    clearTimeout(timeoutId);
                    setImageError(true);
                    setIsFetching(false);
                });
        }
    }, [track.title, track.artist, artworkUrl, hasFetched, imageError, cacheKey]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group",
                "w-28 sm:w-36 md:w-44"
            )}
            onClick={onClick}
        >
            {/* Album Art */}
            <div className="relative aspect-square rounded-xl overflow-hidden">
                {/* Shimmer while loading or fetching */}
                {(isFetching || (artworkUrl && !imageLoaded && !imageError)) && (
                    <div className="absolute inset-0">
                        <ShimmerCard isDark={isDark} />
                    </div>
                )}

                {artworkUrl && !imageError ? (
                    <Image
                        src={artworkUrl}
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
                ) : !isFetching && (
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

                {/* Rank Number - Spotify style */}
                <span
                    className={cn(
                        "absolute top-2 left-2 text-3xl sm:text-4xl font-black",
                        track.rank === 1
                            ? "bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 bg-clip-text text-transparent"
                            : track.rank === 2
                                ? "bg-gradient-to-b from-gray-200 via-gray-300 to-gray-500 bg-clip-text text-transparent"
                                : track.rank === 3
                                    ? "bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 bg-clip-text text-transparent"
                                    : "bg-gradient-to-b from-white via-gray-300 to-gray-500 bg-clip-text text-transparent"
                    )}
                    style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7), 2px 2px 4px rgba(0,0,0,1)',
                        WebkitTextStroke: '1px rgba(0,0,0,0.3)'
                    }}
                >
                    {track.rank}
                </span>

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
    const router = useRouter();
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => router.push(`/admin/seekback?year=${selectedYear}&month=${selectedMonth}`)}
                >
                    <h3 className={cn(
                        "font-semibold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        Top 10 Tracks
                    </h3>
                    <span className={cn(
                        "text-sm",
                        isDark ? "text-zinc-400" : "text-gray-500"
                    )}>
                        · {topTracks?.month_name || MONTHS[selectedMonth - 1]} {selectedYear}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#C4314B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
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

            {/* Tracks carousel */}
            {isLoading ? (
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <ShimmerCard key={i} isDark={isDark} />
                    ))}
                </div>
            ) : error ? (
                <div className={cn(
                    "py-8 text-center",
                    isDark ? "text-zinc-500" : "text-gray-400"
                )}>
                    <p className="mb-1">Could not load top tracks</p>
                    <p className="text-sm">Use SONORA to play music and your stats will appear here!</p>
                </div>
            ) : !topTracks || topTracks.tracks.length === 0 ? (
                <div className={cn(
                    "py-8 text-center",
                    isDark ? "text-zinc-500" : "text-gray-400"
                )}>
                    <p className="mb-1">No tracks played in {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                    <p className="text-sm">Use SONORA to play music and your stats will appear here!</p>
                </div>
            ) : (
                <div className="relative group/carousel">
                    {/* Left scroll button */}
                    <button
                        onClick={() => scroll('left')}
                        className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg",
                            "opacity-0 group-hover/carousel:opacity-100 transition-opacity",
                            "hover:scale-110 transition-transform",
                            isDark
                                ? "bg-zinc-800/90 hover:bg-zinc-700 text-white"
                                : "bg-white/90 hover:bg-gray-100 text-gray-900"
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Carousel */}
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1"
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

                    {/* Right scroll button */}
                    <button
                        onClick={() => scroll('right')}
                        className={cn(
                            "absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg",
                            "opacity-0 group-hover/carousel:opacity-100 transition-opacity",
                            "hover:scale-110 transition-transform",
                            isDark
                                ? "bg-zinc-800/90 hover:bg-zinc-700 text-white"
                                : "bg-white/90 hover:bg-gray-100 text-gray-900"
                        )}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
