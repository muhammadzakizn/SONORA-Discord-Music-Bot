"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Music2,
    User,
    Disc
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useSession } from "@/contexts/SessionContext";
import NavLiquidGlass from "@/components/NavLiquidGlass";

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

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} minutes`;
}

function formatMinutes(seconds: number): number {
    return Math.round(seconds / 60);
}

export default function SeekbackPage() {
    const { isDark } = useSettings();
    const { user } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const monthScrollRef = useRef<HTMLDivElement>(null);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(
        parseInt(searchParams.get("year") || currentYear.toString())
    );
    const [selectedMonth, setSelectedMonth] = useState<number | null>(
        searchParams.get("month") ? parseInt(searchParams.get("month")!) : currentMonth
    );

    const [stats, setStats] = useState<SeekbackStats | null>(null);
    const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
    const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableMonths, setAvailableMonths] = useState<number[]>([]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    year: selectedYear.toString()
                });
                if (selectedMonth) {
                    params.append("month", selectedMonth.toString());
                }

                const [statsRes, artistsRes, albumsRes, tracksRes, monthsRes] = await Promise.all([
                    fetch(`/api/bot/seekback/stats?${params}`),
                    fetch(`/api/bot/seekback/top-artists?${params}&limit=5`),
                    fetch(`/api/bot/seekback/top-albums?${params}&limit=5`),
                    fetch(`/api/bot/top-tracks/monthly?user_id=${user.id}&year=${selectedYear}&month=${selectedMonth || currentMonth}`),
                    fetch(`/api/bot/history/months?user_id=${user.id}`)
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (artistsRes.ok) setTopArtists((await artistsRes.json()).artists || []);
                if (albumsRes.ok) setTopAlbums((await albumsRes.json()).albums || []);
                if (tracksRes.ok) setTopTracks((await tracksRes.json()).tracks || []);
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
    }, [user?.id, selectedYear, selectedMonth, currentMonth]);

    // Collect all artworks for floating display
    const allArtworks = [
        ...topArtists.filter(a => a.sample_artwork).map(a => ({ url: a.sample_artwork!, size: a.rank === 1 ? 'lg' : 'sm' })),
        ...topAlbums.filter(a => a.artwork_url).map(a => ({ url: a.artwork_url!, size: 'md' as const })),
        ...topTracks.filter(t => t.artwork_url).slice(0, 3).map(t => ({ url: t.artwork_url!, size: 'sm' as const }))
    ].slice(0, 6);

    const periodLabel = selectedMonth ? MONTHS[selectedMonth - 1] : selectedYear.toString();
    const totalMinutes = formatMinutes(stats?.total_duration || 0);

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Simple Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Image
                            src="/seekback-logo.png"
                            alt="Seekback"
                            width={28}
                            height={28}
                            className="w-7 h-7 invert"
                        />
                        <span className="font-semibold">&apos;{selectedYear.toString().slice(-2)}</span>
                    </div>
                    <div className="w-10" />
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-16 pb-32">
                {isLoading ? (
                    <div className="flex justify-center py-40">
                        <div className="w-10 h-10 border-4 border-[#C4314B] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Hero Section with Floating Artworks */}
                        <section className="relative min-h-[80vh] flex flex-col px-4 overflow-hidden">
                            {/* Month Selector - Inside Hero */}
                            <div className="relative z-20 max-w-4xl mx-auto w-full pt-4 pb-8">
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-amber-500 font-bold text-sm">{selectedYear}</span>
                                    <button
                                        onClick={() => monthScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                                        className="text-zinc-500 hover:text-white"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div
                                        ref={monthScrollRef}
                                        className="flex gap-4 overflow-x-auto scrollbar-hide"
                                        style={{ scrollbarWidth: 'none' }}
                                    >
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
                                                        "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all",
                                                        isSelected
                                                            ? "bg-white text-black font-semibold"
                                                            : isAvailable
                                                                ? "text-zinc-400 hover:text-white"
                                                                : "text-zinc-700 cursor-not-allowed"
                                                    )}
                                                >
                                                    {month.slice(0, 3)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => monthScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                                        className="text-zinc-500 hover:text-white"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Glow Effect */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(251, 191, 36, 0.18) 0%, transparent 70%)'
                                }}
                            />

                            {/* Floating Album Arts */}
                            <AnimatePresence>
                                {allArtworks.map((art, idx) => {
                                    const positions = [
                                        { top: '8%', left: '5%', size: 100 },
                                        { top: '5%', left: '45%', size: 140 },
                                        { top: '15%', right: '8%', size: 60 },
                                        { bottom: '25%', left: '8%', size: 120 },
                                        { bottom: '20%', left: '40%', size: 80 },
                                        { bottom: '30%', right: '5%', size: 90 },
                                    ][idx] || { top: '50%', left: '50%', size: 80 };

                                    return (
                                        <motion.div
                                            key={art.url}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                                            className="absolute rounded-xl overflow-hidden shadow-2xl"
                                            style={{
                                                ...positions,
                                                width: positions.size,
                                                height: positions.size,
                                            }}
                                        >
                                            <Image
                                                src={art.url}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* Hero Text */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative z-10 max-w-3xl mx-auto text-center sm:text-left px-4"
                            >
                                <p className="text-zinc-400 text-lg mb-2">You listened for</p>
                                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-2">
                                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                                        {totalMinutes.toLocaleString()}
                                    </span>
                                    <span className="text-zinc-400"> minutes</span>
                                </h1>
                                <p className="text-zinc-400 text-xl">in {periodLabel}.</p>
                            </motion.div>
                        </section>

                        {/* Top Artists Section */}
                        {topArtists.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                className="px-4 py-12 max-w-7xl mx-auto"
                            >
                                <h2 className="text-2xl font-bold mb-8">Top Artists</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* #1 Artist - Large */}
                                    {topArtists[0] && (
                                        <div className="md:row-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 p-6">
                                            <div className="flex items-end gap-4">
                                                <span className="text-6xl font-black bg-gradient-to-b from-yellow-300 to-amber-600 bg-clip-text text-transparent">
                                                    1
                                                </span>
                                                <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                                                    {topArtists[0].sample_artwork ? (
                                                        <Image
                                                            src={topArtists[0].sample_artwork}
                                                            alt={topArtists[0].artist}
                                                            width={128}
                                                            height={128}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User className="w-12 h-12 text-zinc-600" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <p className="text-xl font-bold truncate">{topArtists[0].artist}</p>
                                                <p className="text-zinc-500">{formatDuration(topArtists[0].total_duration)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Artists */}
                                    {topArtists.slice(1).map((artist, idx) => (
                                        <div
                                            key={artist.artist}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/30"
                                        >
                                            <span className={cn(
                                                "text-2xl font-bold w-8",
                                                idx === 0
                                                    ? "bg-gradient-to-b from-gray-200 to-gray-500 bg-clip-text text-transparent"
                                                    : idx === 1
                                                        ? "bg-gradient-to-b from-amber-500 to-amber-800 bg-clip-text text-transparent"
                                                        : "text-zinc-600"
                                            )}>
                                                {artist.rank}
                                            </span>
                                            <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
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
                                                        <User className="w-6 h-6 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">{artist.artist}</p>
                                                <p className="text-sm text-zinc-500">{formatDuration(artist.total_duration)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Top Songs & Albums Grid */}
                        <motion.section
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="px-4 py-12 max-w-7xl mx-auto"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Top Songs */}
                                {topTracks.length > 0 && (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-6">Top Songs</h2>
                                        <div className="space-y-3">
                                            {topTracks.slice(0, 5).map((track) => (
                                                <div key={`${track.rank}-${track.title}`} className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "text-lg font-bold w-6",
                                                        track.rank === 1
                                                            ? "bg-gradient-to-b from-yellow-300 to-amber-600 bg-clip-text text-transparent"
                                                            : track.rank === 2
                                                                ? "bg-gradient-to-b from-gray-200 to-gray-500 bg-clip-text text-transparent"
                                                                : track.rank === 3
                                                                    ? "bg-gradient-to-b from-amber-500 to-amber-800 bg-clip-text text-transparent"
                                                                    : "text-zinc-600"
                                                    )}>
                                                        {track.rank}
                                                    </span>
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
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
                                                                <Music2 className="w-5 h-5 text-zinc-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{track.title}</p>
                                                        <p className="text-sm text-zinc-500 truncate">{track.artist}</p>
                                                    </div>
                                                    <span className="text-sm text-zinc-600">{track.play_count} plays</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Top Albums */}
                                {topAlbums.length > 0 && (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-6">Top Albums</h2>
                                        <div className="space-y-3">
                                            {topAlbums.slice(0, 5).map((album) => (
                                                <div key={`${album.rank}-${album.album}`} className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "text-lg font-bold w-6",
                                                        album.rank === 1
                                                            ? "bg-gradient-to-b from-yellow-300 to-amber-600 bg-clip-text text-transparent"
                                                            : album.rank === 2
                                                                ? "bg-gradient-to-b from-gray-200 to-gray-500 bg-clip-text text-transparent"
                                                                : album.rank === 3
                                                                    ? "bg-gradient-to-b from-amber-500 to-amber-800 bg-clip-text text-transparent"
                                                                    : "text-zinc-600"
                                                    )}>
                                                        {album.rank}
                                                    </span>
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                                        {album.artwork_url ? (
                                                            <Image
                                                                src={album.artwork_url}
                                                                alt={album.album}
                                                                width={48}
                                                                height={48}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Disc className="w-5 h-5 text-zinc-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{album.album}</p>
                                                        <p className="text-sm text-zinc-500 truncate">{album.artist}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.section>

                        {/* Empty State */}
                        {stats?.total_plays === 0 && (
                            <div className="text-center py-20">
                                <Music2 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                                <p className="text-lg text-zinc-500">No listening data for {periodLabel}</p>
                                <p className="text-sm text-zinc-600 mt-2">Use SONORA to play music!</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <NavLiquidGlass />
        </div>
    );
}
