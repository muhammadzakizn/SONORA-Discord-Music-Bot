"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    SkipForward,
    Square,
    ChevronDown,
    ListMusic,
    Music,
    Languages,
    MoreHorizontal,
    Eye,
    EyeOff,
    Maximize2,
    Minimize2,
    Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WebGLBackground from "./WebGLBackground";

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
    const [lyricsSource, setLyricsSource] = useState<'auto' | 'musixmatch' | 'lrclib'>('musixmatch');
    const [currentSource, setCurrentSource] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);
    const lastFetchTime = useRef<number>(0);
    const serverTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Apple Music-style scroll detection
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            // Always use the current lyricsSource (default: musixmatch for dashboard)
            const sourceParam = `?source=${lyricsSource}`;
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
    }, [guildId, lyricsSource]);

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

    // Scroll to current line - only when not user scrolling
    useEffect(() => {
        if (currentLineRef.current && lyricsContainerRef.current && !isUserScrolling) {
            currentLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [currentLineIndex, isUserScrolling]);

    // Handle user scroll - show all lyrics temporarily
    const handleLyricsScroll = useCallback(() => {
        setIsUserScrolling(true);

        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Reset after 3 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 3000);
    }, []);

    // Cleanup scroll timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

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
                {/* Beautiful-Lyrics Style WebGL Background */}
                <div className="absolute inset-0 overflow-hidden bg-black">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />

                    {/* WebGL Animated Background with rotating circles */}
                    {track?.artwork_url && (
                        <WebGLBackground artworkUrl={track.artwork_url} />
                    )}

                    {/* Fallback gradient orbs if no artwork or WebGL not supported */}
                    {!track?.artwork_url && (
                        <>
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
                        </>
                    )}

                    <div className="absolute inset-0 opacity-[0.03] bg-noise" />
                </div>

                {/* Content */}
                <div className={cn(
                    "relative z-10 flex h-full w-full",
                    !showLyrics && "justify-center"
                )}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="w-6 h-6 text-white" />
                    </button>



                    {/* LEFT PANEL - Album Art + Controls */}
                    <div className={cn(
                        "flex flex-col justify-center px-12 py-8 transition-all duration-300",
                        showLyrics ? "w-1/2" : "w-full max-w-[450px]"
                    )}>
                        {/* Album Art */}
                        <div className="mb-2">
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

                        {/* Track Info - Apple Music Style (Compact) */}
                        <div className="mb-2">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-white text-xl font-semibold truncate flex-1">
                                    {track?.title || "Unknown Track"}
                                </h2>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(!showMenu);
                                        }}
                                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    >
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {/* Dropdown Menu - Using Portal to fix click issues */}
                                    {showMenu && typeof document !== 'undefined' && createPortal(
                                        <div className="fixed inset-0 z-[9999]">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/20"
                                                onClick={() => setShowMenu(false)}
                                            />
                                            {/* Menu */}
                                            <div
                                                className="absolute left-1/2 bottom-[20%] -translate-x-1/2 w-64 py-2 bg-zinc-900/98 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 pointer-events-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Lyrics Section */}
                                                <div className="px-4 py-3 border-b border-white/10">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Type className="w-4 h-4 text-white/60" />
                                                            <span className="text-sm text-white/80">Lyrics</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowLyrics(!showLyrics)}
                                                            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${showLyrics ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}
                                                        >
                                                            {showLyrics ? 'ON' : 'OFF'}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-white/40 mb-2">Source</p>
                                                    <div className="flex gap-1">
                                                        {(['musixmatch', 'lrclib', 'auto'] as const).map((src) => (
                                                            <button
                                                                key={src}
                                                                onClick={() => setLyricsSource(src)}
                                                                className={`px-2 py-1 text-xs rounded-md transition-colors ${lyricsSource === src ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                                                            >
                                                                {src === 'auto' ? 'Auto' : src === 'musixmatch' ? 'Musixmatch' : 'LRCLIB'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {currentSource && (
                                                        <p className="text-xs text-white/30 mt-1.5">Current: {currentSource}</p>
                                                    )}
                                                </div>

                                                {/* Romanization Toggle */}
                                                <button
                                                    onClick={() => setShowRomanization(!showRomanization)}
                                                    className="w-full px-4 py-2.5 flex items-center justify-between text-white/80 hover:bg-white/5 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Languages className="w-4 h-4" />
                                                        <span className="text-sm">Romanization</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${showRomanization ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}>
                                                        {showRomanization ? 'ON' : 'OFF'}
                                                    </span>
                                                </button>

                                                {/* Queue Toggle */}
                                                <button
                                                    onClick={() => {
                                                        setShowQueue(!showQueue);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 flex items-center justify-between text-white/80 hover:bg-white/5 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ListMusic className="w-4 h-4" />
                                                        <span className="text-sm">Up Next</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${showQueue ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}>
                                                        {showQueue ? 'ON' : 'OFF'}
                                                    </span>
                                                </button>

                                                {/* Fullscreen Toggle */}
                                                <button
                                                    onClick={() => {
                                                        if (document.fullscreenElement) {
                                                            document.exitFullscreen();
                                                            setIsFullscreen(false);
                                                        } else {
                                                            document.documentElement.requestFullscreen();
                                                            setIsFullscreen(true);
                                                        }
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-white/80 hover:bg-white/5 transition-colors border-t border-white/10 mt-1"
                                                >
                                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    <span className="text-sm">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                                                </button>
                                            </div>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            </div>
                            <p className="text-white/60 text-sm truncate -mt-0.5">
                                {track?.artist || "Unknown Artist"} — {track?.album || "Unknown Album"}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-1">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all">
                                <motion.div
                                    className="h-full bg-white rounded-full"
                                    style={{
                                        width: `${track?.duration ? (currentTime / track.duration) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-white/50 text-xs mt-1">
                                <span>{formatTime(currentTime)}</span>
                                {/* Audio Quality Badge - Centered */}
                                <div className="flex items-center gap-1 text-white/40">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                    </svg>
                                    <span className="text-[10px] font-medium">Lossless</span>
                                </div>
                                <span>-{formatTime((track?.duration || 0) - currentTime)}</span>
                            </div>
                        </div>

                        {/* Controls - Apple Music Style */}
                        <div className="flex items-center justify-center gap-6 mt-4">
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
                                <Square className="w-7 h-7 text-white" fill="white" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL - Lyrics */}
                    {showLyrics && (
                        <div className="w-1/2 flex flex-col justify-center overflow-hidden">
                            <div
                                ref={lyricsContainerRef}
                                className="overflow-y-auto scrollbar-hide px-12 py-20 max-h-full"
                                onScroll={handleLyricsScroll}
                            >
                                {lyrics?.lines.length ? (
                                    <div className="space-y-4">
                                        {lyrics.lines.map((line, index) => {
                                            const isCurrentLine = index === currentLineIndex;
                                            const isPastLine = index < currentLineIndex;
                                            const isFutureLine = index > currentLineIndex;

                                            // Apple Music-style: past lines collapse unless scrolling
                                            const shouldCollapse = isPastLine && !isUserScrolling;

                                            return (
                                                <div
                                                    key={index}
                                                    ref={isCurrentLine ? currentLineRef : null}
                                                    className={cn(
                                                        "transition-all duration-500 ease-out overflow-hidden",
                                                        // When scrolling: show all lines normally
                                                        isUserScrolling && "opacity-100",
                                                        // Past lines: collapse when not scrolling
                                                        shouldCollapse && "max-h-0 opacity-0 my-0",
                                                        // Future lines: blur effect when not scrolling
                                                        isFutureLine && !isUserScrolling && "opacity-60"
                                                    )}
                                                    style={{
                                                        // Apply blur to future lines (not supported in all browsers via className)
                                                        filter: isFutureLine && !isUserScrolling ? 'blur(2px)' : 'none',
                                                        // Smooth collapse for past lines
                                                        maxHeight: shouldCollapse ? 0 : '200px',
                                                        marginTop: shouldCollapse ? 0 : undefined,
                                                        marginBottom: shouldCollapse ? 0 : undefined,
                                                    }}
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
                                                                "text-left leading-snug font-semibold transition-all duration-300",
                                                                isCurrentLine
                                                                    ? "text-3xl text-white"
                                                                    : isPastLine
                                                                        ? "text-2xl text-white/40"
                                                                        : "text-2xl text-white/60"
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
