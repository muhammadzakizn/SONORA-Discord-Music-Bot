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
    has_syllable_timing?: boolean;  // True when real per-word timing exists (not estimated)
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
    const [lyricsSource, setLyricsSource] = useState<'applemusic' | 'auto' | 'musixmatch' | 'lrclib'>('applemusic');
    const [currentSource, setCurrentSource] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Loading and error states for lyrics
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsFailed, setLyricsFailed] = useState(false);

    // Track transition state
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [previousTrack, setPreviousTrack] = useState<TrackInfo | null>(null);

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);
    const lastFetchTime = useRef<number>(0);
    const serverTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Apple Music-style scroll detection
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track change detection - prevent scroll during transition
    const trackChangingRef = useRef(false);

    // Lyrics timing offset - negative value delays highlighting to match audio
    // This compensates for server time being ahead of actual audio playback
    const LYRICS_OFFSET = -0.3; // seconds

    // Find current line index based on time (with offset applied)
    const currentLineIndex = useMemo(() => {
        if (!lyrics?.lines.length) return -1;

        const adjustedTime = currentTime + LYRICS_OFFSET;

        for (let i = 0; i < lyrics.lines.length; i++) {
            const line = lyrics.lines[i];
            if (adjustedTime >= line.start_time && adjustedTime <= line.end_time) {
                return i;
            }
        }

        // Find next upcoming line
        for (let i = 0; i < lyrics.lines.length; i++) {
            if (lyrics.lines[i].start_time > adjustedTime) {
                return i - 1;
            }
        }

        return lyrics.lines.length - 1;
    }, [lyrics, currentTime]);

    // ==================== BEAUTIFUL-LYRICS STYLE SPRING CLASS ====================
    // Damped harmonic oscillator for smooth natural animations
    class Spring {
        position: number;
        velocity: number = 0;
        target: number;
        damping: number;
        frequency: number;

        constructor(initial: number, damping = 0.5, frequency = 1) {
            this.position = initial;
            this.target = initial;
            this.damping = damping;
            this.frequency = frequency;
        }

        update(deltaTime: number): number {
            const force = (this.target - this.position) * this.frequency * 10;
            this.velocity += force * deltaTime;
            this.velocity *= (1 - this.damping);
            this.position += this.velocity * deltaTime;
            return this.position;
        }

        set(value: number) {
            this.position = value;
            this.target = value;
            this.velocity = 0;
        }

        isSleeping(): boolean {
            return Math.abs(this.velocity) < 0.001 && Math.abs(this.target - this.position) < 0.001;
        }
    }

    // ==================== LYRICS CACHING & TIME SYNC ====================
    const lastTrackIdRef = useRef<string>('');
    const lyricsLoadedRef = useRef<boolean>(false);

    // Fetch ONLY time sync from server (lightweight, frequent)
    const fetchTimeSync = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/guild/${guildId}/lyrics?source=${lyricsSource}`);
            const data = await response.json();

            if (data.error && !data.track) {
                setLyricsFailed(true);
                setLyricsLoading(false);
                return;
            }

            setIsPlaying(data.is_playing);
            setIsPaused(data.is_paused);

            // ALWAYS sync time from server (progress bar position) - critical for pause/resume
            const serverTime = data.current_time || 0;
            lastFetchTime.current = Date.now();
            serverTimeRef.current = serverTime;
            setCurrentTime(serverTime);

            // Check if track changed - if so, need to refetch lyrics
            const newTrackId = `${data.track?.title}-${data.track?.artist}`;
            if (newTrackId !== lastTrackIdRef.current && data.track) {
                console.log(`[Lyrics] Track changed: ${newTrackId}`);

                // Set transition flag to prevent scroll during change
                trackChangingRef.current = true;
                setIsTransitioning(true);
                setLyricsLoading(true);
                setLyricsFailed(false);

                // Save previous track for transition animation
                if (track) {
                    setPreviousTrack(track);
                }

                lastTrackIdRef.current = newTrackId;
                lyricsLoadedRef.current = false;
                setTrack(data.track);
                setLyrics(data.lyrics);

                const sourceUsed = data.lyrics_source || data.lyrics?.source || 'unknown';
                console.log(`[Lyrics] Source: ${sourceUsed}, Lines: ${data.lyrics?.lines?.length || 0}`);
                setCurrentSource(sourceUsed);

                // Check if lyrics loaded successfully
                if (data.lyrics?.lines?.length > 0) {
                    setLyricsLoading(false);
                    lyricsLoadedRef.current = true;
                } else {
                    setLyricsLoading(false);
                    setLyricsFailed(true);
                }

                // End transition after animation completes
                setTimeout(() => {
                    trackChangingRef.current = false;
                    setIsTransitioning(false);
                    setPreviousTrack(null);
                }, 600);
            }
        } catch (err) {
            console.error("Failed to sync time:", err);
            setLyricsLoading(false);
            setLyricsFailed(true);
        }
    }, [guildId, lyricsSource, track]);

    // Smooth time interpolation between fetches using requestAnimationFrame
    useEffect(() => {
        if (!isOpen || !isPlaying || isPaused) return;

        let lastFrameTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const deltaSeconds = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            // Interpolate time locally for smooth word animation
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

    // Initial fetch and time sync polling
    useEffect(() => {
        if (!isOpen) return;

        // Initial fetch
        fetchTimeSync();

        // Poll for time sync every 2 seconds - ensures sync after pause/resume
        const interval = setInterval(fetchTimeSync, 2000);

        return () => clearInterval(interval);
    }, [isOpen, fetchTimeSync]);

    // Flag to track if we're doing auto-scroll (not user scroll)
    const isAutoScrollingRef = useRef(false);

    // Scroll to current line - only when not user scrolling AND not during track change
    useEffect(() => {
        // Don't scroll during track transitions or user scrolling
        if (trackChangingRef.current || isUserScrolling) return;

        if (currentLineRef.current && lyricsContainerRef.current) {
            // Set flag before auto-scroll
            isAutoScrollingRef.current = true;

            currentLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            // Reset flag after scroll animation completes
            setTimeout(() => {
                isAutoScrollingRef.current = false;
            }, 500);
        }
    }, [currentLineIndex, isUserScrolling]);

    // Handle user scroll - show all lyrics temporarily
    // Only trigger if it's actually a user scroll, not auto-scroll
    const handleLyricsScroll = useCallback(() => {
        // Ignore scroll events caused by auto-scroll
        if (isAutoScrollingRef.current) return;

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
            await fetchTimeSync();
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

                    {/* Dark overlay for "black accents" and better text contrast */}
                    <div className="absolute inset-0 bg-black/50 z-[1]" />

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
                    // Mobile: vertical layout, Desktop: horizontal layout
                    "flex-col sm:flex-row",
                    !showLyrics && "sm:justify-center"
                )}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>

                    {/* ========== MOBILE LAYOUT ========== */}
                    <div className="sm:hidden flex flex-col h-full">
                        {showLyrics ? (
                            <>
                                {/* Mobile Header: Album Art + Title + Menu */}
                                <div className="shrink-0 px-4 pt-14 pb-2">
                                    <div className="flex items-center gap-3">
                                        {/* Album Art (small) */}
                                        <div className="w-14 h-14 shrink-0">
                                            {track?.artwork_url ? (
                                                <img
                                                    src={track.artwork_url}
                                                    alt={track.title}
                                                    className="w-full h-full rounded-lg shadow-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center">
                                                    <Music className="w-6 h-6 text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Track Info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-white text-base font-semibold truncate">
                                                {track?.title || "Unknown Track"}
                                            </h2>
                                            <p className="text-white/60 text-sm truncate">
                                                {track?.artist || "Unknown Artist"}
                                            </p>
                                        </div>
                                        {/* Menu Button */}
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
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Lyrics Area (scrollable, takes remaining space) */}
                                <div className="flex-1 overflow-hidden">
                                    {showLyrics && lyrics && lyrics.lines?.length > 0 ? (
                                        <div
                                            ref={lyricsContainerRef}
                                            className="h-full overflow-y-auto scrollbar-hide px-10 py-[30vh]"
                                            onScroll={() => {
                                                if (lyricsContainerRef.current) {
                                                    setIsUserScrolling(true);
                                                    if (scrollTimeoutRef.current) {
                                                        clearTimeout(scrollTimeoutRef.current);
                                                    }
                                                    scrollTimeoutRef.current = setTimeout(() => {
                                                        setIsUserScrolling(false);
                                                    }, 3000);
                                                }
                                            }}
                                        >
                                            <div className="space-y-3">
                                                {lyrics.lines.map((line, index) => {
                                                    const isCurrentLine = index === currentLineIndex;
                                                    const isPastLine = index < currentLineIndex;
                                                    const isFutureLine = index > currentLineIndex;
                                                    const hasWords = line.words && line.words.length > 0;
                                                    const displayText = showRomanization && line.romanized ? line.romanized : line.text;

                                                    // Only collapse past lines when not scrolling
                                                    const shouldCollapse = isPastLine && !isUserScrolling;

                                                    return (
                                                        <div
                                                            key={index}
                                                            ref={isCurrentLine ? currentLineRef : null}
                                                            data-lyric-index={index}
                                                            className={cn(
                                                                "transition-all duration-500 ease-out overflow-hidden",
                                                                // When scrolling: show all lines normally
                                                                isUserScrolling && "opacity-100",
                                                                // Past lines: fade, blur, and collapse
                                                                shouldCollapse && "max-h-0 opacity-0 blur-sm my-0",
                                                                // Future lines: grayed out
                                                                isFutureLine && !isUserScrolling && "opacity-50"
                                                            )}
                                                            style={{
                                                                maxHeight: shouldCollapse ? 0 : '200px',
                                                                marginTop: shouldCollapse ? 0 : undefined,
                                                                marginBottom: shouldCollapse ? 0 : undefined,
                                                                filter: shouldCollapse ? 'blur(4px)' : 'none',
                                                            }}
                                                        >
                                                            {hasWords && isCurrentLine ? (
                                                                <p className="text-xl font-bold leading-snug">
                                                                    {line.words.map((word, wordIdx) => {
                                                                        const progress = getWordProgress(word);
                                                                        return (
                                                                            <span
                                                                                key={wordIdx}
                                                                                className="inline-block transition-colors duration-100"
                                                                                style={{
                                                                                    color: progress > 0
                                                                                        ? `rgba(255, 255, 255, ${0.4 + progress * 0.6})`
                                                                                        : 'rgba(255, 255, 255, 0.4)',
                                                                                    textShadow: progress > 0.5 ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
                                                                                }}
                                                                            >
                                                                                {word.text}
                                                                                {wordIdx < line.words.length - 1 ? ' ' : ''}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </p>
                                                            ) : (
                                                                <p
                                                                    className={cn(
                                                                        "text-xl font-bold leading-snug transition-colors duration-300",
                                                                        isCurrentLine ? "text-white" : isPastLine ? "text-white/30" : "text-white/40"
                                                                    )}
                                                                >
                                                                    {displayText || "♪"}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="text-center text-white/40">
                                                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">{lyricsLoading ? "Loading lyrics..." : "No lyrics available"}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Mobile No-Lyrics View: Centered Album Art */
                            <div className="flex-1 flex flex-col items-center justify-center px-8">
                                {/* Large Album Art */}
                                <div className="w-full max-w-[280px] mb-6">
                                    {track?.artwork_url ? (
                                        <img
                                            src={track.artwork_url}
                                            alt={track.title}
                                            className="w-full aspect-square rounded-xl shadow-2xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center shadow-2xl">
                                            <Music className="w-20 h-20 text-white/80" />
                                        </div>
                                    )}
                                </div>
                                {/* Track Info */}
                                <div className="w-full max-w-[280px] mb-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <h2 className="text-white text-xl font-semibold truncate flex-1">
                                            {track?.title || "Unknown Track"}
                                        </h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(!showMenu);
                                            }}
                                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all shrink-0"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-white/60 text-sm truncate">
                                        {track?.artist || "Unknown Artist"} — {track?.album || "Unknown Album"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Mobile Controls (bottom fixed) */}
                        <div className="shrink-0 px-4 pb-6 pt-2">
                            {/* Progress Bar */}
                            <div className="mb-3">
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
                            {/* Control Buttons */}
                            <div className="flex items-center justify-center gap-8">
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
                                    className="p-3 hover:scale-110 transition-transform disabled:opacity-50"
                                >
                                    <SkipForward className="w-8 h-8 text-white" fill="white" />
                                </button>
                                <button
                                    onClick={() => handleControl("stop")}
                                    disabled={isControlling}
                                    className="p-3 hover:scale-110 transition-transform disabled:opacity-50"
                                >
                                    <Square className="w-7 h-7 text-white" fill="white" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ========== DESKTOP LAYOUT ========== */}
                    {/* LEFT PANEL - Album Art + Controls (Desktop Only) */}
                    <div className={cn(
                        "hidden sm:flex flex-col items-center justify-center py-8 transition-all duration-300",
                        showLyrics ? "w-1/2 px-16" : "w-full max-w-[450px] px-12"
                    )}>
                        {/* Content wrapper with max-width for the album art */}
                        <div className={cn(
                            "w-full",
                            showLyrics && "max-w-[320px]"
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
                                                        <div className="flex gap-1 flex-wrap">
                                                            {(['applemusic', 'musixmatch', 'lrclib', 'auto'] as const).map((src) => (
                                                                <button
                                                                    key={src}
                                                                    onClick={() => setLyricsSource(src)}
                                                                    className={`px-2 py-1 text-xs rounded-md transition-colors ${lyricsSource === src ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                                                                >
                                                                    {src === 'applemusic' ? 'Apple Music' : src === 'auto' ? 'Auto' : src === 'musixmatch' ? 'Musixmatch' : 'LRCLIB'}
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
                    </div>

                    {/* RIGHT PANEL - Lyrics (Desktop Only) */}
                    {showLyrics && (
                        <div className="hidden sm:flex w-1/2 flex-col justify-center overflow-hidden">
                            <div
                                ref={lyricsContainerRef}
                                className="overflow-y-auto scrollbar-hide px-8 lg:px-12 py-[40vh] max-h-full"
                                onScroll={handleLyricsScroll}
                            >
                                {lyrics?.lines.length ? (
                                    <div className="space-y-6">
                                        {lyrics.lines.map((line, index) => {
                                            const isCurrentLine = index === currentLineIndex;
                                            const isPastLine = index < currentLineIndex;
                                            const isFutureLine = index > currentLineIndex;

                                            // Only collapse past lines when not scrolling
                                            const shouldCollapse = isPastLine && !isUserScrolling;

                                            return (
                                                <div
                                                    key={index}
                                                    ref={isCurrentLine ? currentLineRef : null}
                                                    className={cn(
                                                        "transition-all duration-500 ease-out overflow-hidden",
                                                        // When scrolling: show all lines normally
                                                        isUserScrolling && "opacity-100",
                                                        // Past lines: fade, blur, and collapse
                                                        shouldCollapse && "max-h-0 opacity-0 blur-sm my-0",
                                                        // Future lines: grayed out
                                                        isFutureLine && !isUserScrolling && "opacity-50"
                                                    )}
                                                    style={{
                                                        maxHeight: shouldCollapse ? 0 : '200px',
                                                        marginTop: shouldCollapse ? 0 : undefined,
                                                        marginBottom: shouldCollapse ? 0 : undefined,
                                                        filter: shouldCollapse ? 'blur(4px)' : 'none',
                                                    }}
                                                >
                                                    {/* Current line with per-word highlighting (only when real syllable timing exists) */}
                                                    {isCurrentLine && line.words && line.words.length > 0 && lyrics?.has_syllable_timing ? (
                                                        <p className="text-4xl xs:text-5xl font-bold text-left leading-tight">
                                                            {line.words.map((word: { text: string; start_time: number; end_time: number }, wordIndex: number) => {
                                                                // Apply offset for accurate sync
                                                                const adjustedTime = currentTime + LYRICS_OFFSET;

                                                                // Calculate word progress (0 to 1)
                                                                let progress = 0;
                                                                if (adjustedTime >= word.end_time) {
                                                                    progress = 1;
                                                                } else if (adjustedTime >= word.start_time) {
                                                                    progress = (adjustedTime - word.start_time) / (word.end_time - word.start_time);
                                                                }

                                                                // Beautiful-lyrics style glow curve:
                                                                // 0-15%: ramp up to full glow
                                                                // 15-60%: sustain full glow
                                                                // 60-100%: fade out
                                                                let glowAlpha = 0;
                                                                if (progress < 0.15) {
                                                                    glowAlpha = progress / 0.15; // Quick ramp up
                                                                } else if (progress < 0.6) {
                                                                    glowAlpha = 1; // Sustain
                                                                } else {
                                                                    glowAlpha = 1 - ((progress - 0.6) / 0.4); // Fade out
                                                                }

                                                                // Brightness: starts dim, lights up as sung
                                                                const brightness = progress > 0 ? 0.5 + (progress * 0.5) : 0.35;

                                                                // Scale: subtle pop effect at start
                                                                const scale = progress > 0 && progress < 0.3
                                                                    ? 1 + (0.02 * (1 - progress / 0.3))
                                                                    : 1;

                                                                return (
                                                                    <span
                                                                        key={wordIndex}
                                                                        style={{
                                                                            color: `rgba(255, 255, 255, ${brightness})`,
                                                                            textShadow: glowAlpha > 0.1
                                                                                ? `0 0 ${4 + glowAlpha * 12}px rgba(255, 255, 255, ${glowAlpha * 0.5})`
                                                                                : "none",
                                                                            marginRight: "0.25em",
                                                                            display: "inline-block",
                                                                            transform: `scale(${scale})`,
                                                                            transition: "transform 0.1s ease-out",
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
                                                                "text-left leading-tight font-semibold transition-all duration-300",
                                                                isCurrentLine
                                                                    ? "text-4xl xs:text-5xl text-white"
                                                                    : "text-3xl lg:text-4xl text-white"
                                                            )}
                                                            style={isCurrentLine ? {
                                                                textShadow: "0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)"
                                                            } : undefined}
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
                                        {lyricsLoading ? (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    <p className="text-white/50 text-xl font-medium">Loading lyrics...</p>
                                                </div>
                                            </>
                                        ) : lyricsFailed ? (
                                            <>
                                                <p className="text-white/40 text-3xl font-semibold">• • •</p>
                                                <p className="text-white/30 text-lg mt-2">
                                                    Lyrics unavailable for this track
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-white/40 text-3xl font-semibold">• • •</p>
                                                <p className="text-white/30 text-lg mt-2">
                                                    {error || "Lyrics will appear here when available"}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Album Only Mode - Left panel already handles centered display when !showLyrics */}

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
