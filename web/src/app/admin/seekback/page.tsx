"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Music2,
    User,
    Disc,
    Clock,
    Play,
    Users,
    Music
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import NavLiquidGlass from "@/components/nav/NavLiquidGlass";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

interface SeekbackStats {
    total_plays: number;
    total_duration: number;
    unique_artists: number;
    unique_albums: number;
    unique_songs: number;
    year: number;
    month: number | null;
}

interface TopArtist {
    rank: number;
    artist: string;
    play_count: number;
    total_duration: number;
    sample_artwork: string | null;
}

interface TopAlbum {
    rank: number;
    album: string;
    artist: string;
    play_count: number;
    total_duration: number;
    artwork_url: string | null;
}

interface TopTrack {
    rank: number;
    title: string;
    artist: string;
    play_count: number;
    total_duration: number;
    artwork_url: string | null;
}

// Format duration helper
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
}

// Format large duration for hero
function formatHeroDuration(seconds: number): { value: string; unit: string } {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return { value: hours.toString(), unit: hours === 1 ? "hour" : "hours" };
    }
    return { value: minutes.toString(), unit: minutes === 1 ? "minute" : "minutes" };
}

export default function SeekbackPage() {
    const { isDark } = useSettings();
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const monthScrollRef = useRef<HTMLDivElement>(null);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(
        parseInt(searchParams.get("year") || currentYear.toString())
    );
    const [selectedMonth, setSelectedMonth] = useState<number | null>(
        searchParams.get("month") ? parseInt(searchParams.get("month")!) : null
    );

    const [stats, setStats] = useState<SeekbackStats | null>(null);
    const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
    const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableMonths, setAvailableMonths] = useState<number[]>([]);

    // Fetch all data
    useEffect(() => {
        if (!user?.discord_id) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    user_id: user.discord_id,
                    year: selectedYear.toString()
                });
                if (selectedMonth) {
                    params.append("month", selectedMonth.toString());
                }

                // Fetch stats
                const statsRes = await fetch(`/api/bot/seekback/stats?${params}`);
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                // Fetch top artists
                const artistsRes = await fetch(`/api/bot/seekback/top-artists?${params}&limit=5`);
                if (artistsRes.ok) {
                    const data = await artistsRes.json();
                    setTopArtists(data.artists || []);
                }

                // Fetch top albums
                const albumsRes = await fetch(`/api/bot/seekback/top-albums?${params}&limit=5`);
                if (albumsRes.ok) {
                    const data = await albumsRes.json();
                    setTopAlbums(data.albums || []);
                }

                // Fetch top tracks (reuse existing endpoint)
                const tracksParams = new URLSearchParams({
                    user_id: user.discord_id,
                    year: selectedYear.toString(),
                    month: selectedMonth?.toString() || currentMonth.toString()
                });
                const tracksRes = await fetch(`/api/bot/top-tracks/monthly?${tracksParams}`);
                if (tracksRes.ok) {
                    const data = await tracksRes.json();
                    setTopTracks(data.tracks || []);
                }

                // Fetch available months
                const monthsRes = await fetch(`/api/bot/history/months?user_id=${user.discord_id}`);
                if (monthsRes.ok) {
                    const data = await monthsRes.json();
                    const yearMonths = (data.months || [])
                        .filter((m: { year: number }) => m.year === selectedYear)
                        .map((m: { month: number }) => m.month);
                    setAvailableMonths(yearMonths);
                }
            } catch (err) {
                console.error("Failed to fetch seekback data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user?.discord_id, selectedYear, selectedMonth, currentMonth]);

    const duration = formatHeroDuration(stats?.total_duration || 0);
    const periodLabel = selectedMonth
        ? MONTHS[selectedMonth - 1]
        : selectedYear.toString();

    return (
        <div className={cn(
            "min-h-screen",
            isDark
                ? "bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white"
                : "bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900"
        )}>
            {/* Header */}
            <div className={cn(
                "sticky top-0 z-40 backdrop-blur-xl border-b",
                isDark
                    ? "bg-zinc-900/80 border-zinc-800"
                    : "bg-white/80 border-gray-200"
            )}>
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                                isDark
                                    ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[#C4314B] to-amber-500 bg-clip-text text-transparent">
                            Seekback&apos;{selectedYear.toString().slice(-2)}
                        </h1>
                        <div className="w-24" /> {/* Spacer */}
                    </div>
                </div>
            </div>

            {/* Year and Month Selector */}
            <div className={cn(
                "sticky top-[73px] z-30 backdrop-blur-xl border-b",
                isDark
                    ? "bg-zinc-900/80 border-zinc-800"
                    : "bg-white/80 border-gray-200"
            )}>
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                        {/* Year */}
                        <span className="text-amber-500 font-bold">{selectedYear}</span>

                        {/* Month scroll */}
                        <div className="flex items-center gap-2 flex-1">
                            <button
                                onClick={() => {
                                    if (monthScrollRef.current) {
                                        monthScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                                    }
                                }}
                                className={cn(
                                    "p-1 rounded-full",
                                    isDark ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div
                                ref={monthScrollRef}
                                className="flex gap-4 overflow-x-auto scrollbar-hide flex-1"
                                style={{ scrollbarWidth: 'none' }}
                            >
                                {/* All Year option */}
                                <button
                                    onClick={() => setSelectedMonth(null)}
                                    className={cn(
                                        "px-4 py-2 rounded-full whitespace-nowrap transition-all",
                                        selectedMonth === null
                                            ? "bg-white text-black font-semibold"
                                            : isDark
                                                ? "text-zinc-400 hover:text-white"
                                                : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    All Year
                                </button>

                                {MONTHS.map((month, idx) => {
                                    const monthNum = idx + 1;
                                    const isAvailable = availableMonths.includes(monthNum);
                                    const isSelected = selectedMonth === monthNum;

                                    return (
                                        <button
                                            key={month}
                                            onClick={() => isAvailable && setSelectedMonth(monthNum)}
                                            disabled={!isAvailable}
                                            className={cn(
                                                "px-4 py-2 rounded-full whitespace-nowrap transition-all",
                                                isSelected
                                                    ? "bg-white text-black font-semibold"
                                                    : isAvailable
                                                        ? isDark
                                                            ? "text-zinc-400 hover:text-white"
                                                            : "text-gray-500 hover:text-gray-900"
                                                        : "text-zinc-700 cursor-not-allowed opacity-50"
                                            )}
                                        >
                                            {month.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => {
                                    if (monthScrollRef.current) {
                                        monthScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                                    }
                                }}
                                className={cn(
                                    "p-1 rounded-full",
                                    isDark ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-[#C4314B] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Hero Section - Total Listening Time */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-12"
                        >
                            <p className={cn(
                                "text-lg mb-2",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                You listened for
                            </p>
                            <h2 className="text-6xl sm:text-7xl md:text-8xl font-black mb-2">
                                <span className="bg-gradient-to-r from-[#C4314B] to-amber-500 bg-clip-text text-transparent">
                                    {duration.value}
                                </span>
                                <span className={isDark ? "text-zinc-400" : "text-gray-500"}>
                                    {" "}{duration.unit}
                                </span>
                            </h2>
                            <p className={cn(
                                "text-lg",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                in {periodLabel}
                            </p>
                        </motion.section>

                        {/* Stats Grid */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        >
                            {[
                                { icon: Play, label: "Plays", value: stats?.total_plays || 0 },
                                { icon: Music, label: "Songs", value: stats?.unique_songs || 0 },
                                { icon: Users, label: "Artists", value: stats?.unique_artists || 0 },
                                { icon: Disc, label: "Albums", value: stats?.unique_albums || 0 },
                            ].map((stat, idx) => (
                                <div
                                    key={stat.label}
                                    className={cn(
                                        "p-6 rounded-2xl text-center",
                                        isDark
                                            ? "bg-zinc-800/50 border border-zinc-700"
                                            : "bg-white border border-gray-200 shadow-sm"
                                    )}
                                >
                                    <stat.icon className={cn(
                                        "w-6 h-6 mx-auto mb-2",
                                        isDark ? "text-zinc-500" : "text-gray-400"
                                    )} />
                                    <p className="text-3xl font-bold">{stat.value}</p>
                                    <p className={cn(
                                        "text-sm",
                                        isDark ? "text-zinc-500" : "text-gray-500"
                                    )}>{stat.label}</p>
                                </div>
                            ))}
                        </motion.section>

                        {/* Top Artists */}
                        {topArtists.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-2xl font-bold mb-6">Top Artists</h3>
                                <div className="space-y-4">
                                    {topArtists.map((artist, idx) => (
                                        <div
                                            key={artist.artist}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl",
                                                isDark
                                                    ? "bg-zinc-800/50 border border-zinc-700"
                                                    : "bg-white border border-gray-200"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-2xl font-bold w-8",
                                                idx === 0
                                                    ? "bg-gradient-to-b from-yellow-300 to-amber-600 bg-clip-text text-transparent"
                                                    : idx === 1
                                                        ? "bg-gradient-to-b from-gray-200 to-gray-500 bg-clip-text text-transparent"
                                                        : idx === 2
                                                            ? "bg-gradient-to-b from-amber-500 to-amber-800 bg-clip-text text-transparent"
                                                            : isDark ? "text-zinc-500" : "text-gray-400"
                                            )}>
                                                {artist.rank}
                                            </span>
                                            <div className={cn(
                                                "w-14 h-14 rounded-full overflow-hidden flex-shrink-0",
                                                isDark ? "bg-zinc-700" : "bg-gray-200"
                                            )}>
                                                {artist.sample_artwork ? (
                                                    <Image
                                                        src={artist.sample_artwork}
                                                        alt={artist.artist}
                                                        width={56}
                                                        height={56}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className={cn(
                                                            "w-6 h-6",
                                                            isDark ? "text-zinc-500" : "text-gray-400"
                                                        )} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">{artist.artist}</p>
                                                <p className={cn(
                                                    "text-sm",
                                                    isDark ? "text-zinc-500" : "text-gray-500"
                                                )}>
                                                    {formatDuration(artist.total_duration)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Top Songs */}
                        {topTracks.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h3 className="text-2xl font-bold mb-6">Top Songs</h3>
                                <div className="space-y-3">
                                    {topTracks.slice(0, 10).map((track) => (
                                        <div
                                            key={`${track.rank}-${track.title}`}
                                            className={cn(
                                                "flex items-center gap-4 p-3 rounded-xl",
                                                isDark
                                                    ? "bg-zinc-800/50 border border-zinc-700"
                                                    : "bg-white border border-gray-200"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-lg font-bold w-6 text-center",
                                                track.rank <= 3
                                                    ? track.rank === 1
                                                        ? "bg-gradient-to-b from-yellow-300 to-amber-600 bg-clip-text text-transparent"
                                                        : track.rank === 2
                                                            ? "bg-gradient-to-b from-gray-200 to-gray-500 bg-clip-text text-transparent"
                                                            : "bg-gradient-to-b from-amber-500 to-amber-800 bg-clip-text text-transparent"
                                                    : isDark ? "text-zinc-500" : "text-gray-400"
                                            )}>
                                                {track.rank}
                                            </span>
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0",
                                                isDark ? "bg-zinc-700" : "bg-gray-200"
                                            )}>
                                                {track.artwork_url ? (
                                                    <Image
                                                        src={track.artwork_url}
                                                        alt={track.title}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Music2 className={cn(
                                                            "w-5 h-5",
                                                            isDark ? "text-zinc-500" : "text-gray-400"
                                                        )} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{track.title}</p>
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    isDark ? "text-zinc-500" : "text-gray-500"
                                                )}>
                                                    {track.artist}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "text-sm",
                                                isDark ? "text-zinc-500" : "text-gray-500"
                                            )}>
                                                {track.play_count} plays
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Top Albums */}
                        {topAlbums.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h3 className="text-2xl font-bold mb-6">Top Albums</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {topAlbums.map((album) => (
                                        <div key={`${album.album}-${album.artist}`} className="space-y-2">
                                            <div className={cn(
                                                "aspect-square rounded-xl overflow-hidden",
                                                isDark ? "bg-zinc-800" : "bg-gray-200"
                                            )}>
                                                {album.artwork_url ? (
                                                    <Image
                                                        src={album.artwork_url}
                                                        alt={album.album}
                                                        width={200}
                                                        height={200}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Disc className={cn(
                                                            "w-12 h-12",
                                                            isDark ? "text-zinc-600" : "text-gray-400"
                                                        )} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm truncate">{album.album}</p>
                                                <p className={cn(
                                                    "text-xs truncate",
                                                    isDark ? "text-zinc-500" : "text-gray-500"
                                                )}>
                                                    {album.artist}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Empty State */}
                        {!isLoading && stats?.total_plays === 0 && (
                            <div className="text-center py-20">
                                <Music2 className={cn(
                                    "w-16 h-16 mx-auto mb-4",
                                    isDark ? "text-zinc-600" : "text-gray-400"
                                )} />
                                <p className={cn(
                                    "text-lg",
                                    isDark ? "text-zinc-500" : "text-gray-500"
                                )}>
                                    No listening data for {periodLabel}
                                </p>
                                <p className={cn(
                                    "text-sm mt-2",
                                    isDark ? "text-zinc-600" : "text-gray-400"
                                )}>
                                    Use SONORA to play music and your stats will appear here!
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <NavLiquidGlass />
        </div>
    );
}
