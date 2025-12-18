"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Square,
    ChevronDown,
    ListMusic,
    Music,
    Languages,
    MoreHorizontal,
    Eye,
    EyeOff,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricWord {
    text: string;
    start_time: number;
    end_time: number;
}

interface LyricLine {
    text: string;
    start_time: number;
    end_time: number;
    romanized?: string | null;
    words: LyricWord[];
}

interface LyricsData {
    is_synced: boolean;
    source: string;
    offset: number;
    lines: LyricLine[];
    total_lines: number;
}

interface TrackInfo {
    title: string;
    artist: string;
    album?: string;
    artwork_url?: string;
    duration: number;
    requested_by?: string;
}

interface QueueItem {
    position: number;
    title: string;
    artist: string;
    duration: number;
}

interface FullscreenLyricsPlayerProps {
    guildId: string;
    isOpen: boolean;
    onClose: () => void;
    queue?: QueueItem[];
    onControl: (action: string) => Promise<void>;
}

const API_BASE = '/api/bot';

export default function FullscreenLyricsPlayer({
    guildId,
    isOpen,
    onClose,
    queue = [],
    onControl,
}: FullscreenLyricsPlayerProps) {
    const [track, setTrack] = useState<TrackInfo | null>(null);
    const [lyrics, setLyrics] = useState<LyricsData | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(true);
    const [showRomanization, setShowRomanization] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [isControlling, setIsControlling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lyricsSource, setLyricsSource] = useState<'auto' | 'musixmatch' | 'lrclib'>('auto');
    const [currentSource, setCurrentSource] = useState<string>('');

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);
    const lastFetchTime = useRef<number>(0);
    const serverTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Find current line index based on time
    const currentLineIndex = useMemo(() => {
        if (!lyrics?.lines.length) return -1;

        for (let i = 0; i < lyrics.lines.length; i++) {
            const line = lyrics.lines[i];
            if (currentTime >= line.start_time && currentTime <= line.end_time) {
                return i;
            }
        }

        // Find next upcoming line
        for (let i = 0; i < lyrics.lines.length; i++) {
            if (lyrics.lines[i].start_time > currentTime) {
                return i - 1;
            }
        }

        return lyrics.lines.length - 1;
    }, [lyrics, currentTime]);

    // Fetch lyrics data
    const fetchLyrics = useCallback(async () => {
        try {
            const sourceParam = lyricsSource !== 'auto' ? `?source=${lyricsSource}` : '';
            const response = await fetch(`${API_BASE}/guild/${guildId}/lyrics${sourceParam}`);
            const data = await response.json();

            if (data.error && !data.track) {
                setError(data.error);
                return;
            }

            setError(null);
            setTrack(data.track);
            setLyrics(data.lyrics);
            setIsPlaying(data.is_playing);
            setIsPaused(data.is_paused);
            setCurrentSource(data.lyrics_source || data.lyrics?.source || '');

            // Update current time from server - this is the source of truth
            lastFetchTime.current = Date.now();
            serverTimeRef.current = data.current_time || 0;
            setCurrentTime(data.current_time || 0);
        } catch (err) {
            console.error("Failed to fetch lyrics:", err);
            setError("Failed to load lyrics");
        }
    }, [guildId]);

    // Smooth time interpolation between fetches - improved sync
    useEffect(() => {
        if (!isOpen || !isPlaying || isPaused) return;

        let lastFrameTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const deltaSeconds = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            // Interpolate time locally for smooth animation
            setCurrentTime(prev => prev + deltaSeconds);
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isOpen, isPlaying, isPaused]);

    // Fetch lyrics on open and poll more frequently for better sync
    useEffect(() => {
        if (!isOpen) return;

        fetchLyrics();
        const interval = setInterval(fetchLyrics, 1000); // Poll every second for better sync

        return () => clearInterval(interval);
    }, [isOpen, fetchLyrics]);

    // Scroll to current line
    useEffect(() => {
        if (currentLineRef.current && lyricsContainerRef.current) {
            currentLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [currentLineIndex]);

    // Handle control actions
    const handleControl = async (action: string) => {
        setIsControlling(true);
        try {
            await onControl(action);
            await fetchLyrics();
        } finally {
            setTimeout(() => setIsControlling(false), 300);
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.floor(Math.abs(seconds) % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Get word progress with easing for smoother animation
    const getWordProgress = (word: LyricWord) => {
        if (currentTime < word.start_time) return 0;
        if (currentTime >= word.end_time) return 1;

        const linear = (currentTime - word.start_time) / (word.end_time - word.start_time);
        // Apply easing for smoother glow
        return Math.sin(linear * Math.PI / 2); // Ease out sine
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex"
            >
                {/* Apple Music Style Animated Background */}
                <div className="absolute inset-0 overflow-hidden bg-black">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />

                    {/* Animated Color Orbs */}
                    <div
                        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-60 animate-orb-1"
                        style={{
                            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
                            top: '-20%',
                            left: '-10%',
                        }}
                    />
                    <div
                        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-50 animate-orb-2"
                        style={{
                            background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)',
                            top: '30%',
                            right: '-15%',
                        }}
                    />
                    <div
                        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-40 animate-orb-3"
                        style={{
                            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
                            bottom: '-10%',
                            left: '20%',
                        }}
                    />
                    <div
                        className="absolute w-[450px] h-[450px] rounded-full blur-[90px] opacity-45 animate-orb-4"
                        style={{
                            background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
                            bottom: '20%',
                            right: '10%',
                        }}
                    />

                    {track?.artwork_url && (
                        <img
                            src={track.artwork_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover scale-150 blur-[150px] opacity-30 mix-blend-overlay"
                        />
                    )}

                    <div className="absolute inset-0 opacity-[0.03] bg-noise" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex h-full w-full">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="w-6 h-6 text-white" />
                    </button>

                    {/* Settings buttons */}
                    <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                        <button
                            onClick={() => setShowRomanization(!showRomanization)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showRomanization ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                            )}
                            title="Romanization"
                        >
                            <Languages className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showQueue ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                            )}
                            title="Queue"
                        >
                            <ListMusic className="w-5 h-5" />
                        </button>
                    </div>

                    {/* LEFT PANEL - Album Art + Controls */}
                    <div className="w-[420px] flex-shrink-0 flex flex-col justify-center px-12 py-8">
                        {/* Album Art */}
                        <div className="mb-8">
                            {track?.artwork_url ? (
                                <img
                                    src={track.artwork_url}
                                    alt={track.title}
                                    className="w-full aspect-square rounded-xl shadow-2xl object-cover"
                                />
                            ) : (
                                <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center shadow-2xl">
                                    <Music className="w-24 h-24 text-white/80" />
                                </div>
                            )}
                        </div>

                        {/* Track Info - Apple Music Style */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-white text-xl font-semibold truncate flex-1">
                                    {track?.title || "Unknown Track"}
                                </h2>
                                <div className="flex items-center gap-1">
                                    <button className="p-1.5 text-white/60 hover:text-white transition-colors">
                                        <Star className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="p-1.5 text-white/60 hover:text-white transition-colors relative"
                                    >
                                        <MoreHorizontal className="w-5 h-5" />

                                        {/* Dropdown Menu */}
                                        {showMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 z-50">
                                                {/* Lyrics Source Selector */}
                                                <div className="px-4 py-2 border-b border-white/10 mb-2">
                                                    <p className="text-xs text-white/40 mb-2">Lyrics Source</p>
                                                    <div className="flex gap-1">
                                                        {(['auto', 'musixmatch', 'lrclib'] as const).map((src) => (
                                                            <button
                                                                key={src}
                                                                onClick={() => {
                                                                    setLyricsSource(src);
                                                                }}
                                                                className={`px-2 py-1 text-xs rounded-md transition-colors ${lyricsSource === src
                                                                        ? 'bg-white/20 text-white'
                                                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {src === 'auto' ? 'Auto' : src === 'musixmatch' ? 'Musixmatch' : 'LRCLIB'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {currentSource && (
                                                        <p className="text-xs text-white/30 mt-1">Current: {currentSource}</p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setShowLyrics(!showLyrics);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors"
                                                >
                                                    {showLyrics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    <span className="text-sm">{showLyrics ? "Hide Lyrics" : "Show Lyrics"}</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowRomanization(!showRomanization);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 flex items-center gap-3 text-white/80 hover:bg-white/10 transition-colors"
                                                >
                                                    <Languages className="w-4 h-4" />
                                                    <span className="text-sm">{showRomanization ? "Hide Romanization" : "Show Romanization"}</span>
                                                </button>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <p className="text-white/60 text-sm truncate mt-0.5">
                                {track?.artist || "Unknown Artist"} — {track?.album || "Unknown Album"}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all">
                                <motion.div
                                    className="h-full bg-white rounded-full"
                                    style={{
                                        width: `${track?.duration ? (currentTime / track.duration) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-white/50 text-xs mt-1.5">
                                <span>{formatTime(currentTime)}</span>
                                <span>-{formatTime((track?.duration || 0) - currentTime)}</span>
                            </div>
                        </div>

                        {/* Audio Quality Badge */}
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-1.5 text-white/40 text-xs">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                                <span>Streaming</span>
                            </div>
                        </div>

                        {/* Controls - Apple Music Style */}
                        <div className="flex items-center justify-center gap-8">
                            <button
                                onClick={() => handleControl(isPaused ? "resume" : "pause")}
                                disabled={isControlling}
                                className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                {isPaused ? (
                                    <Play className="w-8 h-8 text-white" fill="white" />
                                ) : (
                                    <Pause className="w-8 h-8 text-white" fill="white" />
                                )}
                            </button>
                            <button
                                onClick={() => handleControl("skip")}
                                disabled={isControlling}
                                className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                <SkipForward className="w-8 h-8 text-white" fill="white" />
                            </button>
                            <button
                                onClick={() => handleControl("stop")}
                                disabled={isControlling}
                                className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                <Square className="w-7 h-7 text-rose-400" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL - Lyrics */}
                    {showLyrics && (
                        <div className="flex-1 flex flex-col justify-center overflow-hidden">
                            <div
                                ref={lyricsContainerRef}
                                className="overflow-y-auto scrollbar-hide px-12 py-20 max-h-full"
                            >
                                {lyrics?.lines.length ? (
                                    <div className="space-y-5">
                                        {lyrics.lines.map((line, index) => {
                                            const isCurrentLine = index === currentLineIndex;
                                            const isPastLine = index < currentLineIndex;
                                            const isFutureLine = index > currentLineIndex;

                                            return (
                                                <div
                                                    key={index}
                                                    ref={isCurrentLine ? currentLineRef : null}
                                                    className={cn(
                                                        "transition-all duration-300 ease-out",
                                                        isPastLine && "opacity-40",
                                                        isFutureLine && "opacity-50"
                                                    )}
                                                >
                                                    {/* Per-word animation for current line */}
                                                    {isCurrentLine && line.words.length > 0 ? (
                                                        <p className="text-3xl font-bold text-left leading-snug">
                                                            {line.words.map((word, wordIndex) => {
                                                                const progress = getWordProgress(word);
                                                                return (
                                                                    <span
                                                                        key={wordIndex}
                                                                        className="inline-block mr-[0.3em] transition-all duration-100"
                                                                        style={{
                                                                            color: `rgba(255, 255, 255, ${0.4 + progress * 0.6})`,
                                                                            textShadow: progress > 0.1
                                                                                ? `0 0 ${progress * 20}px rgba(255, 255, 255, ${progress * 0.4})`
                                                                                : "none",
                                                                        }}
                                                                    >
                                                                        {word.text}
                                                                    </span>
                                                                );
                                                            })}
                                                        </p>
                                                    ) : (
                                                        <p
                                                            className={cn(
                                                                "text-left leading-snug font-semibold",
                                                                isCurrentLine
                                                                    ? "text-3xl text-white"
                                                                    : "text-2xl text-white/50"
                                                            )}
                                                        >
                                                            {line.text || "• • •"}
                                                        </p>
                                                    )}

                                                    {/* Romanization */}
                                                    {showRomanization && line.romanized && (
                                                        <p
                                                            className={cn(
                                                                "text-left italic mt-1",
                                                                isCurrentLine
                                                                    ? "text-base text-white/50"
                                                                    : "text-sm text-white/30"
                                                            )}
                                                        >
                                                            {line.romanized}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-start justify-center h-full">
                                        <p className="text-white/40 text-3xl font-semibold">• • •</p>
                                        <p className="text-white/30 text-lg mt-2">
                                            {error || "Lyrics will appear here when available"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Album Only Mode - Show larger album */}
                    {!showLyrics && (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-white/30 text-xl">Album view</p>
                        </div>
                    )}

                    {/* Queue Panel */}
                    <AnimatePresence>
                        {showQueue && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 300, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex-shrink-0 bg-black/60 backdrop-blur-xl overflow-hidden border-l border-white/10"
                            >
                                <div className="p-5 h-full flex flex-col">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-lg">
                                        <ListMusic className="w-5 h-5" />
                                        Up Next
                                    </h3>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {queue.length > 0 ? (
                                            queue.map((item) => (
                                                <div
                                                    key={item.position}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <p className="text-white text-sm font-medium truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-white/50 text-xs truncate">
                                                        {item.artist}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-white/40 text-sm text-center py-8">
                                                Queue is empty
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Click outside to close menu */}
                {showMenu && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
