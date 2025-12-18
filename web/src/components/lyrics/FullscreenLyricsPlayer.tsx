"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Play,
    Pause,
    SkipForward,
    Square,
    ChevronDown,
    ChevronUp,
    ListMusic,
    Music,
    Languages,
    Maximize2,
    Minimize2,
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
    const [showRomanization, setShowRomanization] = useState(true);
    const [isControlling, setIsControlling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);
    const lastFetchTime = useRef<number>(0);
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
            const response = await fetch(`${API_BASE}/guild/${guildId}/lyrics`);
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

            // Update current time from server
            lastFetchTime.current = Date.now();
            setCurrentTime(data.current_time || 0);
        } catch (err) {
            console.error("Failed to fetch lyrics:", err);
            setError("Failed to load lyrics");
        }
    }, [guildId]);

    // Animate time locally between fetches for smooth sync
    useEffect(() => {
        if (!isOpen || !isPlaying || isPaused) return;

        const animate = () => {
            const elapsed = (Date.now() - lastFetchTime.current) / 1000;
            setCurrentTime(prev => prev + elapsed / 60); // Small increments
            lastFetchTime.current = Date.now();
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isOpen, isPlaying, isPaused]);

    // Fetch lyrics on open and poll
    useEffect(() => {
        if (!isOpen) return;

        fetchLyrics();
        const interval = setInterval(fetchLyrics, 2000);

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
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Get word progress (0 to 1) for per-word animation
    const getWordProgress = (word: LyricWord) => {
        if (currentTime < word.start_time) return 0;
        if (currentTime >= word.end_time) return 1;
        return (currentTime - word.start_time) / (word.end_time - word.start_time);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col"
            >
                {/* Apple Music Style Animated Background */}
                <div className="absolute inset-0 overflow-hidden bg-black">
                    {/* Base gradient */}
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

                    {/* Album art color extraction overlay */}
                    {track?.artwork_url && (
                        <img
                            src={track.artwork_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover scale-150 blur-[150px] opacity-30 mix-blend-overlay"
                        />
                    )}

                    {/* Subtle noise texture */}
                    <div className="absolute inset-0 opacity-[0.03] bg-noise" />
                </div>

                {/* Content - Apple Music Style Layout */}
                <div className="relative z-10 flex h-full">
                    {/* Close button - minimal */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="w-6 h-6 text-white" />
                    </button>

                    {/* Settings buttons - top right */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        <button
                            onClick={() => setShowRomanization(!showRomanization)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showRomanization ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                            )}
                            title="Toggle Romanization"
                        >
                            <Languages className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                showQueue ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                            )}
                        >
                            <ListMusic className="w-5 h-5" />
                        </button>
                    </div>

                    {/* LEFT PANEL - Album Art + Info + Controls */}
                    <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col items-center justify-center p-8 md:p-12">
                        {/* Album Art */}
                        <div className="relative mb-6">
                            {track?.artwork_url ? (
                                <img
                                    src={track.artwork_url}
                                    alt={track.title}
                                    className="w-64 h-64 md:w-72 md:h-72 rounded-xl shadow-2xl object-cover"
                                />
                            ) : (
                                <div className="w-64 h-64 md:w-72 md:h-72 rounded-xl bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center shadow-2xl">
                                    <Music className="w-24 h-24 text-white/80" />
                                </div>
                            )}
                        </div>

                        {/* Track Info */}
                        <div className="text-center mb-4 w-full max-w-[300px]">
                            <h2 className="text-white text-xl font-bold truncate">
                                {track?.title || "Unknown Track"}
                            </h2>
                            <p className="text-white/60 text-sm truncate">
                                {track?.artist || "Unknown Artist"} — {track?.album || "Unknown Album"}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-[300px] mb-6">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white rounded-full"
                                    style={{
                                        width: `${track?.duration ? (currentTime / track.duration) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-white/50 text-xs mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>-{formatTime((track?.duration || 0) - currentTime)}</span>
                            </div>
                        </div>

                        {/* Controls - Apple Music style */}
                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={() => handleControl(isPaused ? "resume" : "pause")}
                                disabled={isControlling}
                                className="p-3 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                {isPaused ? (
                                    <Play className="w-10 h-10 text-white" fill="white" />
                                ) : (
                                    <Pause className="w-10 h-10 text-white" fill="white" />
                                )}
                            </button>
                            <button
                                onClick={() => handleControl("skip")}
                                disabled={isControlling}
                                className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                <SkipForward className="w-7 h-7 text-white" fill="white" />
                            </button>
                            <button
                                onClick={() => handleControl("stop")}
                                disabled={isControlling}
                                className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                <Square className="w-6 h-6 text-rose-400" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL - Lyrics */}
                    <div className="hidden md:flex flex-1 flex-col justify-center overflow-hidden">
                        <div
                            ref={lyricsContainerRef}
                            className="overflow-y-auto scrollbar-hide px-8 py-16 max-h-full"
                        >
                            {lyrics?.lines.length ? (
                                <div className="space-y-6">
                                    {lyrics.lines.map((line, index) => {
                                        const isCurrentLine = index === currentLineIndex;
                                        const isPastLine = index < currentLineIndex;
                                        const isFutureLine = index > currentLineIndex;

                                        return (
                                            <div
                                                key={index}
                                                ref={isCurrentLine ? currentLineRef : null}
                                                className={cn(
                                                    "transition-all duration-500 ease-out",
                                                    isCurrentLine && "scale-100",
                                                    isPastLine && "opacity-40",
                                                    isFutureLine && "opacity-50"
                                                )}
                                            >
                                                {/* Per-word animation for current line */}
                                                {isCurrentLine && line.words.length > 0 ? (
                                                    <p className="text-3xl md:text-4xl font-bold text-left leading-relaxed">
                                                        {line.words.map((word, wordIndex) => {
                                                            const progress = getWordProgress(word);
                                                            return (
                                                                <span
                                                                    key={wordIndex}
                                                                    className="inline-block mr-2 transition-all duration-150"
                                                                    style={{
                                                                        color: progress > 0
                                                                            ? `rgba(255, 255, 255, ${0.5 + progress * 0.5})`
                                                                            : "rgba(255, 255, 255, 0.5)",
                                                                        textShadow: progress > 0
                                                                            ? `0 0 ${progress * 30}px rgba(255, 255, 255, ${progress * 0.6})`
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
                                                            "text-left leading-relaxed transition-all duration-300 font-semibold",
                                                            isCurrentLine
                                                                ? "text-3xl md:text-4xl text-white"
                                                                : "text-2xl md:text-3xl text-white/50"
                                                        )}
                                                    >
                                                        {line.text || "• • •"}
                                                    </p>
                                                )}

                                                {/* Romanization */}
                                                {showRomanization && line.romanized && (
                                                    <p
                                                        className={cn(
                                                            "text-left italic mt-1 transition-all duration-300",
                                                            isCurrentLine
                                                                ? "text-xl text-white/60"
                                                                : "text-lg text-white/30"
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
                                        {error || "Lyrics will appear here"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Queue Panel (Collapsible) - Now on far right */}
                    <AnimatePresence>
                        {showQueue && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 280, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex-shrink-0 bg-black/60 backdrop-blur-xl overflow-hidden border-l border-white/10"
                            >
                                <div className="p-4 h-full flex flex-col">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <ListMusic className="w-5 h-5" />
                                        Queue ({queue.length})
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
            </motion.div>
        </AnimatePresence>
    );
}
