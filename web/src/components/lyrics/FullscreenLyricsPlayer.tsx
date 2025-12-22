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
    ChevronUp,
    Trash2,
    Upload,
    Search,
    X,
    Check,
    AlertTriangle,
    FileText,
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
    onQueueRemove?: (position: number) => Promise<void>;
    onQueueMove?: (fromPosition: number, toPosition: number) => Promise<void>;
}

const API_BASE = '/api/bot';

// Marquee component for scrolling long text
function MarqueeText({ text, className }: { text: string; className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [scrollDuration, setScrollDuration] = useState(10);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const textWidth = textRef.current.scrollWidth;
                setShouldScroll(textWidth > containerWidth);
                // Calculate duration based on text length (slower for longer text, then speed up)
                const baseDuration = Math.max(8, (textWidth - containerWidth) / 30);
                setScrollDuration(baseDuration);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [text]);

    if (!shouldScroll) {
        return (
            <div ref={containerRef} className={cn("overflow-hidden", className)}>
                <span ref={textRef} className="whitespace-nowrap">{text}</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn("overflow-hidden relative", className)}>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    10% { transform: translateX(0); }
                    15% { transform: translateX(-5%); }
                    85% { transform: translateX(-100%); }
                    90% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                }
                .marquee-text {
                    animation: marquee ${scrollDuration}s ease-in-out infinite;
                    animation-delay: 3s;
                }
            `}</style>
            <span
                ref={textRef}
                className="marquee-text inline-block whitespace-nowrap pr-12"
            >
                {text}
            </span>
        </div>
    );
}

export default function FullscreenLyricsPlayer({
    guildId,
    isOpen,
    onClose,
    queue = [],
    onControl,
    onQueueRemove,
    onQueueMove,
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
    const [lyricsSource, setLyricsSource] = useState<'applemusic' | 'auto' | 'musixmatch' | 'lrclib' | 'lyricify'>('auto');
    const [currentSource, setCurrentSource] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Loading and error states for lyrics
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsFailed, setLyricsFailed] = useState(false);

    // Audio quality dialog state
    const [showQualityDialog, setShowQualityDialog] = useState(false);

    // Track transition state
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState<string>('');
    const [previousTrack, setPreviousTrack] = useState<TrackInfo | null>(null);
    const [trackEnded, setTrackEnded] = useState(false);

    // Lyrics panel state
    const [showLyricsPanel, setShowLyricsPanel] = useState(false);
    const [previewLyrics, setPreviewLyrics] = useState<LyricsData | null>(null);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [isApplyingLyrics, setIsApplyingLyrics] = useState(false);
    const [customLyrics, setCustomLyrics] = useState<LyricsData | null>(null);
    const [lyricsSearchQuery, setLyricsSearchQuery] = useState('');
    const [lyricsSearchResults, setLyricsSearchResults] = useState<any[]>([]);
    const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isLoadingSourcePreview, setIsLoadingSourcePreview] = useState(false);
    const [pendingSource, setPendingSource] = useState<typeof lyricsSource | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Flag to prevent scroll detection during programmatic lyrics apply
    const isApplyingLyricsRef = useRef(false);

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

            // Detect if track ended (no track playing)
            if (!data.track && !data.is_playing) {
                setTrackEnded(true);
                setTrack(null);
                setLyrics(null);
                lastTrackIdRef.current = '';
                return;
            }

            // Track is playing, clear ended state
            setTrackEnded(false);

            // Check if track changed - if so, need to refetch lyrics
            const newTrackId = `${data.track?.title}-${data.track?.artist}`;
            if (newTrackId !== lastTrackIdRef.current && data.track) {
                console.log(`[Lyrics] Track changed: ${newTrackId}`);

                // Set transition flag to prevent scroll during change
                trackChangingRef.current = true;
                setIsTransitioning(true);
                setLyricsLoading(true);
                setLyricsFailed(false);

                // Show loading phases
                setLoadingPhase('Fetching metadata...');

                // Save previous track for transition animation
                if (track) {
                    setPreviousTrack(track);
                }

                lastTrackIdRef.current = newTrackId;
                lyricsLoadedRef.current = false;

                // Simulate loading phases for better UX
                setTimeout(() => setLoadingPhase('Loading artwork...'), 200);
                setTimeout(() => setLoadingPhase('Fetching lyrics...'), 500);

                setTrack(data.track);
                setLyrics(data.lyrics);

                const sourceUsed = data.lyrics_source || data.lyrics?.source || 'unknown';
                console.log(`[Lyrics] Source: ${sourceUsed}, Lines: ${data.lyrics?.lines?.length || 0}`);
                setCurrentSource(sourceUsed);

                // Check if lyrics loaded successfully
                if (data.lyrics?.lines?.length > 0) {
                    setTimeout(() => setLoadingPhase('Preparing playback...'), 300);
                    setTimeout(() => {
                        setLyricsLoading(false);
                        lyricsLoadedRef.current = true;
                        setLoadingPhase('');
                    }, 500);
                } else {
                    setLyricsLoading(false);
                    setLyricsFailed(true);
                    setLoadingPhase('');
                }

                // End transition after animation completes
                setTimeout(() => {
                    trackChangingRef.current = false;
                    setIsTransitioning(false);
                    setPreviousTrack(null);
                }, 800);
            }
        } catch (err) {
            console.error("Failed to sync time:", err);
            setLyricsLoading(false);
            setLyricsFailed(true);
            setLoadingPhase('');
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
    // Use wheel and touch events instead of scroll events to avoid auto-scroll triggers
    const handleUserScrollStart = useCallback((e: WheelEvent | TouchEvent) => {
        // Ignore if currently applying lyrics
        if (isApplyingLyricsRef.current) return;

        // For wheel events, check if there's actual movement
        if (e instanceof WheelEvent && Math.abs(e.deltaY) < 5) return;

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

    // Attach wheel and touch listeners to lyrics container
    useEffect(() => {
        const container = lyricsContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => handleUserScrollStart(e);
        const handleTouchStart = (e: TouchEvent) => handleUserScrollStart(e);

        container.addEventListener('wheel', handleWheel, { passive: true });
        container.addEventListener('touchmove', handleTouchStart, { passive: true });

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('touchmove', handleTouchStart);
        };
    }, [handleUserScrollStart]);

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

    // Parse LRC format lyrics
    const parseLRC = (content: string): LyricsData | null => {
        const lines: any[] = [];
        const lrcLines = content.split('\n');

        // LRC timestamp regex: [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
        const timestampRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

        let hasTimestamps = false;

        for (const line of lrcLines) {
            const matches = [...line.matchAll(timestampRegex)];
            if (matches.length > 0) {
                hasTimestamps = true;
                const text = line.replace(timestampRegex, '').trim();
                if (text) {
                    for (const match of matches) {
                        const minutes = parseInt(match[1]);
                        const seconds = parseInt(match[2]);
                        const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                        const startTime = minutes * 60 + seconds + ms / 1000;

                        lines.push({
                            start_time: startTime,
                            end_time: startTime + 5, // Default 5s duration, will be adjusted
                            text: text,
                            words: null
                        });
                    }
                }
            }
        }

        if (!hasTimestamps) {
            return null; // Reject if no timestamps
        }

        // Sort by start time
        lines.sort((a, b) => a.start_time - b.start_time);

        // Adjust end times based on next line
        for (let i = 0; i < lines.length - 1; i++) {
            lines[i].end_time = lines[i + 1].start_time;
        }

        return {
            lines,
            source: 'custom',
            offset: 0,
            total_lines: lines.length,
            is_synced: true
        };
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseLRC(content);

            if (!parsed) {
                setUploadError('File tidak memiliki timestamp. Format yang didukung: [mm:ss.xx]text');
                return;
            }

            setPreviewLyrics(parsed);
            setShowPreviewDialog(true);
        };
        reader.readAsText(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Apply previewed lyrics
    const handleApplyLyrics = () => {
        if (!previewLyrics) return;

        setIsApplyingLyrics(true);
        setShowPreviewDialog(false);

        // Set flag to prevent scroll detection during apply
        isApplyingLyricsRef.current = true;

        // Simulate loading for UX
        setTimeout(() => {
            setCustomLyrics(previewLyrics);
            setLyrics(previewLyrics);
            setPreviewLyrics(null);
            setIsApplyingLyrics(false);
            setShowLyricsPanel(false);
            setIsUserScrolling(false); // Reset user scrolling state

            // Reset flag after lyrics are applied
            setTimeout(() => {
                isApplyingLyricsRef.current = false;
            }, 500);
        }, 1000);
    };

    // Cancel preview
    const handleCancelPreview = () => {
        setPreviewLyrics(null);
        setShowPreviewDialog(false);
        setPendingSource(null);
    };

    // Search lyrics - re-fetch with custom query
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchNoResults, setSearchNoResults] = useState(false);

    const handleSearchLyrics = async () => {
        if (!lyricsSearchQuery.trim()) {
            setSearchError('Masukkan kata kunci pencarian');
            return;
        }

        setIsSearchingLyrics(true);
        setLyricsSearchResults([]);
        setSearchError(null);
        setSearchNoResults(false);

        try {
            // Use the lyrics search endpoint
            const response = await fetch(`/api/bot/lyrics/search?q=${encodeURIComponent(lyricsSearchQuery)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.found && data.lyrics?.lines?.length > 0) {
                    // Found lyrics, show preview
                    setPreviewLyrics(data.lyrics);
                    setShowPreviewDialog(true);
                } else {
                    setSearchNoResults(true);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setSearchError(errorData.error || 'Gagal mencari lyrics. Coba lagi.');
            }
        } catch (err) {
            console.error('Lyrics search failed:', err);
            setSearchError('Terjadi kesalahan saat mencari lyrics.');
        } finally {
            setIsSearchingLyrics(false);
        }
    };

    // Select search result for preview
    const handleSelectSearchResult = (result: any) => {
        if (result.lyrics) {
            setPreviewLyrics(result.lyrics);
            setShowPreviewDialog(true);
        }
    };

    // Preview lyrics from a specific source before applying
    const handleSourcePreview = async (source: typeof lyricsSource) => {
        if (!guildId || !track) return;
        if (source === lyricsSource) return; // Already using this source

        setIsLoadingSourcePreview(true);
        setPendingSource(source);

        try {
            // Fetch lyrics with the new source
            const response = await fetch(
                `/api/bot/guild/${guildId}/lyrics?source=${source}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.lyrics?.lines?.length > 0) {
                    setPreviewLyrics(data.lyrics);
                    setShowPreviewDialog(true);
                } else {
                    // No lyrics found from this source
                    alert(`Tidak ditemukan lirik dari ${source === 'applemusic' ? 'Apple Music' :
                        source === 'lyricify' ? 'Lyricify (QQ)' :
                            source === 'musixmatch' ? 'Musixmatch' :
                                source === 'lrclib' ? 'LRCLIB' : 'Auto'}`);
                }
            } else {
                console.error('Failed to fetch lyrics from source:', source);
                alert('Gagal mengambil lirik dari source tersebut');
            }
        } catch (err) {
            console.error('Source preview failed:', err);
            alert('Terjadi kesalahan saat mengambil lirik');
        } finally {
            setIsLoadingSourcePreview(false);
        }
    };

    // Apply lyrics from source preview
    const handleApplySourcePreview = () => {
        if (pendingSource && previewLyrics) {
            // Set flag to prevent scroll detection during apply
            isApplyingLyricsRef.current = true;

            setLyricsSource(pendingSource);
            setLyrics(previewLyrics);
            setPreviewLyrics(null);
            setShowPreviewDialog(false);
            setPendingSource(null);
            setIsUserScrolling(false); // Reset user scrolling state

            // Reset flag after lyrics are applied
            setTimeout(() => {
                isApplyingLyricsRef.current = false;
            }, 500);
        }
    };

    // Check if lyrics are plain text (no proper sync)
    const isPlainTextLyrics = useMemo(() => {
        if (!lyrics?.lines?.length) return false;
        // If all lines have the same or very close start times, it's plain text
        const times = lyrics.lines.map(l => l.start_time);
        const uniqueTimes = new Set(times);
        return uniqueTimes.size < lyrics.lines.length * 0.5;
    }, [lyrics]);

    // Interlude detection - gaps >= 3.5 seconds between lyrics
    const INTERLUDE_THRESHOLD = 3.5; // seconds
    const interludeInfo = useMemo(() => {
        if (!lyrics?.lines?.length) return null;

        const adjustedTime = currentTime + LYRICS_OFFSET;

        // Check intro (before first lyric)
        const firstLine = lyrics.lines[0];
        if (adjustedTime < firstLine.start_time && firstLine.start_time >= INTERLUDE_THRESHOLD) {
            const progress = adjustedTime / firstLine.start_time;
            return {
                isActive: true,
                progress: Math.max(0, Math.min(1, progress)),
                gapDuration: firstLine.start_time,
                isIntro: true
            };
        }

        // Check gaps between lyrics
        for (let i = 0; i < lyrics.lines.length - 1; i++) {
            const currentLine = lyrics.lines[i];
            const nextLine = lyrics.lines[i + 1];
            const gapStart = currentLine.end_time;
            const gapEnd = nextLine.start_time;
            const gap = gapEnd - gapStart;

            if (gap >= INTERLUDE_THRESHOLD && adjustedTime > gapStart && adjustedTime < gapEnd) {
                const progress = (adjustedTime - gapStart) / gap;
                return {
                    isActive: true,
                    progress: Math.max(0, Math.min(1, progress)),
                    gapDuration: gap,
                    isIntro: false
                };
            }
        }

        return null;
    }, [lyrics, currentTime, LYRICS_OFFSET]);

    // Calculate individual dot opacities based on interlude progress
    const dotOpacities = useMemo(() => {
        if (!interludeInfo?.isActive) return [0.2, 0.2, 0.2];

        const progress = interludeInfo.progress;

        // Base opacity (dimmed like upcoming lyrics)
        const baseOpacity = 0.2;
        const fullOpacity = 1.0;

        // Dot 1: starts lighting up at 0%, full at 30%
        // Dot 2: starts lighting up at 30%, full at 70%
        // Dot 3: starts lighting up at 70%, full at 100%

        const dot1Progress = Math.min(1, progress / 0.3);
        const dot2Progress = progress > 0.3 ? Math.min(1, (progress - 0.3) / 0.4) : 0;
        const dot3Progress = progress > 0.7 ? Math.min(1, (progress - 0.7) / 0.3) : 0;

        return [
            baseOpacity + (fullOpacity - baseOpacity) * dot1Progress,
            baseOpacity + (fullOpacity - baseOpacity) * dot2Progress,
            baseOpacity + (fullOpacity - baseOpacity) * dot3Progress
        ];
    }, [interludeInfo]);

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
                    <div className="absolute inset-0 bg-black/70 z-[1]" />

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

                {/* Loading Overlay for Track Transitions */}
                <AnimatePresence>
                    {((isTransitioning || loadingPhase) && queue.length > 0) ||
                        (track && currentTime >= track.duration - 0.5 && queue.length > 0 && !trackEnded) ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xl"
                        >
                            <div className="text-center">
                                {/* Spinner */}
                                <div className="w-16 h-16 mx-auto mb-6">
                                    <div className="w-full h-full border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                                {/* Loading Phase Text */}
                                <motion.p
                                    key={loadingPhase || 'preparing'}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white/90 text-lg font-medium"
                                >
                                    {loadingPhase || 'Preparing next track...'}
                                </motion.p>
                                <p className="text-white/50 text-sm mt-2">
                                    Please wait a moment
                                </p>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {/* Empty State - No Track Playing */}
                <AnimatePresence>
                    {trackEnded && !isTransitioning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 flex items-center justify-center"
                        >
                            <div className="text-center px-8">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                                    <Music className="w-10 h-10 text-white/40" />
                                </div>
                                <h3 className="text-white text-xl font-semibold mb-2">
                                    No Track Playing
                                </h3>
                                <p className="text-white/50 text-sm max-w-xs mx-auto">
                                    {queue.length > 0
                                        ? `${queue.length} track${queue.length > 1 ? 's' : ''} in queue. Waiting for playback to start...`
                                        : 'The queue is empty. Add some music to get started!'}
                                </p>
                                <button
                                    onClick={onClose}
                                    className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors"
                                >
                                    Close Player
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                            className="h-full overflow-y-auto scrollbar-hide px-12 py-[30vh]"
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
                                                {/* Interlude Dots Animation */}
                                                <AnimatePresence>
                                                    {interludeInfo?.isActive && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.3 }}
                                                            animate={{
                                                                opacity: interludeInfo.progress >= 0.98 ? 0 : 1,
                                                                scale: interludeInfo.progress >= 0.98 ? 0.3 : 1
                                                            }}
                                                            exit={{ opacity: 0, scale: 0.3 }}
                                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                                            style={{ transformOrigin: 'center' }}
                                                            className="flex items-center justify-center gap-3 py-8"
                                                        >
                                                            {[0, 1, 2].map((dotIndex) => (
                                                                <motion.div
                                                                    key={dotIndex}
                                                                    className="w-3 h-3 rounded-full bg-white"
                                                                    style={{ opacity: dotOpacities[dotIndex] }}
                                                                    animate={{
                                                                        scale: dotOpacities[dotIndex] > 0.8 ? [1, 1.2, 1] : 1
                                                                    }}
                                                                    transition={{
                                                                        scale: {
                                                                            duration: 0.3,
                                                                            repeat: dotOpacities[dotIndex] > 0.8 ? Infinity : 0,
                                                                            repeatDelay: 0.5
                                                                        }
                                                                    }}
                                                                />
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

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
                                                            {/* Mobile: Always highlight full line (no per-word) for better readability */}
                                                            <p
                                                                className={cn(
                                                                    "text-2xl font-bold leading-snug transition-all duration-300",
                                                                    isCurrentLine ? "text-white" : isPastLine ? "text-white/30" : "text-white/40"
                                                                )}
                                                            >
                                                                {displayText || "♪"}
                                                            </p>
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
                                    <MarqueeText
                                        text={`${track?.artist || "Unknown Artist"} — ${track?.album || "Unknown Album"}`}
                                        className="text-white/60 text-sm"
                                    />
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
                                <div className="flex justify-between items-center text-white/50 text-xs mt-1">
                                    <span>{formatTime(currentTime)}</span>
                                    {/* Audio Quality Badge */}
                                    <button
                                        onClick={() => setShowQualityDialog(true)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors border border-transparent hover:border-white/30"
                                    >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3 2v3h2V8H5zm4 0v8h2V8H9zm4 0v5h2V8h-2zm4 0v6h2V8h-2z" />
                                        </svg>
                                        <span className="text-white/60">Lossless</span>
                                    </button>
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
                                                    {/* Lyrics Section - Opens Panel */}
                                                    <button
                                                        onClick={() => {
                                                            setShowLyricsPanel(true);
                                                            setShowMenu(false);
                                                        }}
                                                        className="w-full px-4 py-2.5 flex items-center justify-between text-white/80 hover:bg-white/5 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Type className="w-4 h-4" />
                                                            <span className="text-sm">Lyrics</span>
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${showLyrics ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}>
                                                            {showLyrics ? 'ON' : 'OFF'}
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
                                                            <span className="text-sm">Queue</span>
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
                                <MarqueeText
                                    text={`${track?.artist || "Unknown Artist"} — ${track?.album || "Unknown Album"}`}
                                    className="text-white/60 text-sm -mt-0.5"
                                />
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
                                    {/* Audio Quality Badge - Desktop */}
                                    <button
                                        onClick={() => setShowQualityDialog(true)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 transition-colors border border-transparent hover:border-white/30"
                                    >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3 2v3h2V8H5zm4 0v8h2V8H9zm4 0v5h2V8h-2zm4 0v6h2V8h-2z" />
                                        </svg>
                                        <span className="text-[10px] font-medium text-white/60">Lossless</span>
                                    </button>
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
                            >
                                {lyrics?.lines.length ? (
                                    <div className="space-y-6">
                                        {/* Interlude Dots Animation - Desktop */}
                                        <AnimatePresence>
                                            {interludeInfo?.isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.3 }}
                                                    animate={{
                                                        opacity: interludeInfo.progress >= 0.98 ? 0 : 1,
                                                        scale: interludeInfo.progress >= 0.98 ? 0.3 : 1
                                                    }}
                                                    exit={{ opacity: 0, scale: 0.3 }}
                                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                                    style={{ transformOrigin: 'left center' }}
                                                    className="flex items-center justify-start gap-4 py-8 pl-1"
                                                >
                                                    {[0, 1, 2].map((dotIndex) => (
                                                        <motion.div
                                                            key={dotIndex}
                                                            className="w-4 h-4 rounded-full bg-white"
                                                            style={{ opacity: dotOpacities[dotIndex] }}
                                                            animate={{
                                                                scale: dotOpacities[dotIndex] > 0.8 ? [1, 1.2, 1] : 1
                                                            }}
                                                            transition={{
                                                                scale: {
                                                                    duration: 0.3,
                                                                    repeat: dotOpacities[dotIndex] > 0.8 ? Infinity : 0,
                                                                    repeatDelay: 0.5
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

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
                                                                    const rawProgress = (adjustedTime - word.start_time) / (word.end_time - word.start_time);
                                                                    // Apply ease-out for smoother animation
                                                                    progress = 1 - Math.pow(1 - rawProgress, 2);
                                                                }

                                                                // Beautiful-lyrics style glow curve
                                                                let glowAlpha = 0;
                                                                if (progress < 0.15) {
                                                                    glowAlpha = progress / 0.15;
                                                                } else if (progress < 0.6) {
                                                                    glowAlpha = 1;
                                                                } else {
                                                                    glowAlpha = 1 - ((progress - 0.6) / 0.4);
                                                                }

                                                                // Y-offset: subtle bounce up at start, settle back
                                                                let yOffset = 0;
                                                                if (progress > 0 && progress < 0.9) {
                                                                    // Peak at 0.7 progress, then settle
                                                                    const bounceProgress = progress < 0.7
                                                                        ? progress / 0.7
                                                                        : 1 - ((progress - 0.7) / 0.3);
                                                                    yOffset = -2 * bounceProgress; // Move up by 2px at peak
                                                                }

                                                                // Scale: pop effect with spring-like decay
                                                                let scale = 1;
                                                                if (progress > 0 && progress < 0.7) {
                                                                    const scaleProgress = progress / 0.7;
                                                                    // Start at 0.95, peak at 1.025, settle at 1
                                                                    if (scaleProgress < 0.5) {
                                                                        scale = 0.95 + (0.075 * (scaleProgress / 0.5));
                                                                    } else {
                                                                        scale = 1.025 - (0.025 * ((scaleProgress - 0.5) / 0.5));
                                                                    }
                                                                }

                                                                // Text shadow glow intensity
                                                                const glowBlur = 4 + (8 * glowAlpha);
                                                                const glowOpacity = glowAlpha * 0.7;

                                                                // Brightness based on progress (dim -> bright)
                                                                const brightness = progress > 0 ? 0.4 + (0.6 * progress) : 0.35;

                                                                return (
                                                                    <span
                                                                        key={wordIndex}
                                                                        className="syllable-word"
                                                                        style={{
                                                                            display: "inline-block",
                                                                            marginRight: "0.15em",
                                                                            transform: `translateY(${yOffset}px) scale(${scale})`,
                                                                            transition: "transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                                                                            // Simple color transition instead of gradient
                                                                            color: `rgba(255, 255, 255, ${brightness})`,
                                                                            // Glow effect for active words
                                                                            textShadow: glowAlpha > 0.1
                                                                                ? `0 0 ${glowBlur}px rgba(255,255,255,${glowOpacity})`
                                                                                : 'none',
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
                                                            style={undefined}
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
                                        Queue
                                        {queue.length > 0 && (
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                                {queue.length}
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {queue.length > 0 ? (
                                            queue.map((item, index) => (
                                                <div
                                                    key={item.position}
                                                    className="group p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Track number */}
                                                        <span className="text-white/30 text-xs font-mono mt-0.5 w-4">
                                                            {item.position}
                                                        </span>
                                                        {/* Track info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-medium truncate">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-white/50 text-xs truncate">
                                                                {item.artist}
                                                            </p>
                                                        </div>
                                                        {/* Action buttons - show on hover */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {/* Move Up */}
                                                            {index > 0 && onQueueMove && (
                                                                <button
                                                                    onClick={() => onQueueMove(item.position, item.position - 1)}
                                                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                                                    title="Move up"
                                                                >
                                                                    <ChevronUp className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {/* Move Down */}
                                                            {index < queue.length - 1 && onQueueMove && (
                                                                <button
                                                                    onClick={() => onQueueMove(item.position, item.position + 1)}
                                                                    className="p-1.5 rounded-lg hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                                                    title="Move down"
                                                                >
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {/* Remove */}
                                                            {onQueueRemove && (
                                                                <button
                                                                    onClick={() => onQueueRemove(item.position)}
                                                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/60 hover:text-rose-400 transition-colors"
                                                                    title="Remove from queue"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
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

                {/* Audio Quality Dialog Modal */}
                <AnimatePresence>
                    {showQualityDialog && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={() => setShowQualityDialog(false)}
                        >
                            {/* Backdrop */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                            {/* Dialog Content */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full border border-white/20"
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3 2v3h2V8H5zm4 0v8h2V8H9zm4 0v5h2V8h-2zm4 0v6h2V8h-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">Lossless</h3>
                                        <p className="text-white/50 text-sm">Audio Quality</p>
                                    </div>
                                </div>

                                {/* Quality Details */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-white/60 text-sm">Format</span>
                                        <span className="text-white font-medium">AAC / Opus</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-white/60 text-sm">Bit Depth</span>
                                        <span className="text-white font-medium">16-bit</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-white/60 text-sm">Sample Rate</span>
                                        <span className="text-white font-medium">48 kHz</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                                        <span className="text-white/60 text-sm">Bitrate</span>
                                        <span className="text-white font-medium">256 kbps</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-white/60 text-sm">Source</span>
                                        <span className="text-white font-medium">YouTube Music</span>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowQualityDialog(false)}
                                    className="mt-6 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Lyrics Panel */}
                <AnimatePresence>
                    {showLyricsPanel && (
                        <motion.div
                            initial={{ x: 320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 320, opacity: 0 }}
                            className="fixed right-0 top-0 bottom-0 w-80 z-50 bg-black/60 backdrop-blur-xl border-l border-white/10"
                        >
                            <div className="p-5 h-full flex flex-col overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                                        <Type className="w-5 h-5" />
                                        Lyrics Settings
                                    </h3>
                                    <button
                                        onClick={() => setShowLyricsPanel(false)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Controls */}
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    {/* Lyrics Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <Type className="w-4 h-4 text-white/60" />
                                            <span className="text-white text-sm">Lyrics</span>
                                        </div>
                                        <button
                                            onClick={() => setShowLyrics(!showLyrics)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${showLyrics ? 'bg-white text-black' : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {showLyrics ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    {/* Romanization Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <Languages className="w-4 h-4 text-white/60" />
                                            <span className="text-white text-sm">Romanization</span>
                                        </div>
                                        <button
                                            onClick={() => setShowRomanization(!showRomanization)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${showRomanization ? 'bg-white text-black' : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {showRomanization ? 'ON' : 'OFF'}
                                        </button>
                                    </div>

                                    {/* Source Selection */}
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <p className="text-white/60 text-xs mb-2">Source (tap to preview)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(['applemusic', 'lyricify', 'musixmatch', 'lrclib', 'auto'] as const).map((src) => (
                                                <button
                                                    key={src}
                                                    onClick={() => handleSourcePreview(src)}
                                                    disabled={isLoadingSourcePreview || lyricsSource === src}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${lyricsSource === src
                                                        ? 'bg-white text-black'
                                                        : pendingSource === src && isLoadingSourcePreview
                                                            ? 'bg-white/30 text-white animate-pulse'
                                                            : 'bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-50'
                                                        }`}
                                                >
                                                    {pendingSource === src && isLoadingSourcePreview ? '...' :
                                                        src === 'applemusic' ? 'Apple Music' :
                                                            src === 'lyricify' ? 'Lyricify (QQ)' :
                                                                src === 'musixmatch' ? 'Musixmatch' :
                                                                    src === 'lrclib' ? 'LRCLIB' : 'Auto'}
                                                </button>
                                            ))}
                                        </div>
                                        {currentSource && (
                                            <p className="text-white/40 text-xs mt-2">Current: {currentSource}</p>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-white/10 my-4" />

                                    {/* Manual Upload */}
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <p className="text-white/60 text-xs mb-2">Upload Lyrics</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".lrc,.txt"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Choose LRC File
                                        </button>
                                        <p className="text-white/40 text-xs mt-2 text-center">
                                            Format: .lrc atau .txt dengan timestamp
                                        </p>
                                        {uploadError && (
                                            <div className="mt-2 p-2 rounded-lg bg-rose-500/20 border border-rose-500/30">
                                                <p className="text-rose-400 text-xs flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {uploadError}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Search Lyrics */}
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <p className="text-white/60 text-xs mb-2">Search Lyrics</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={lyricsSearchQuery}
                                                onChange={(e) => {
                                                    setLyricsSearchQuery(e.target.value);
                                                    setSearchError(null);
                                                    setSearchNoResults(false);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearchLyrics()}
                                                placeholder="Judul atau artis..."
                                                className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
                                            />
                                            <button
                                                onClick={handleSearchLyrics}
                                                disabled={isSearchingLyrics}
                                                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                                            >
                                                {isSearchingLyrics ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Search className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Search Error */}
                                        {searchError && (
                                            <div className="mt-2 p-2 rounded-lg bg-rose-500/20 border border-rose-500/30">
                                                <p className="text-rose-400 text-xs flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {searchError}
                                                </p>
                                            </div>
                                        )}

                                        {/* No Results */}
                                        {searchNoResults && (
                                            <div className="mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                                                <p className="text-amber-400 text-xs">
                                                    Tidak ada lyrics ditemukan untuk "{lyricsSearchQuery}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Search Results */}
                                        {lyricsSearchResults.length > 0 && (
                                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                                                {lyricsSearchResults.map((result, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSelectSearchResult(result)}
                                                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                                    >
                                                        <p className="text-white text-sm truncate">{result.title || 'Unknown'}</p>
                                                        <p className="text-white/50 text-xs truncate">{result.source || 'Unknown source'}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Lyrics Indicator */}
                                    {customLyrics && (
                                        <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-400 text-sm">Custom lyrics applied</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setCustomLyrics(null);
                                                        setLyrics(null);
                                                    }}
                                                    className="text-white/50 hover:text-white text-xs"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Preview Dialog */}
                <AnimatePresence>
                    {showPreviewDialog && previewLyrics && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                            onClick={handleCancelPreview}
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative bg-zinc-900/90 backdrop-blur-xl rounded-2xl max-w-md w-full border border-white/20 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-white/10">
                                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Lyrics Preview
                                    </h3>
                                    <p className="text-white/50 text-sm mt-1">
                                        {previewLyrics.total_lines} lines found
                                    </p>
                                </div>

                                {/* Preview Content */}
                                <div className="p-5 max-h-60 overflow-y-auto">
                                    <div className="space-y-2">
                                        {previewLyrics.lines.slice(0, 8).map((line, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <span className="text-white/30 text-xs font-mono shrink-0 mt-0.5">
                                                    [{Math.floor(line.start_time / 60)}:{String(Math.floor(line.start_time % 60)).padStart(2, '0')}]
                                                </span>
                                                <p className="text-white/80 text-sm">{line.text}</p>
                                            </div>
                                        ))}
                                        {previewLyrics.lines.length > 8 && (
                                            <p className="text-white/40 text-sm text-center pt-2">
                                                ... dan {previewLyrics.lines.length - 8} baris lagi
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Warning */}
                                <div className="px-5 py-3 bg-amber-500/10 border-t border-amber-500/20">
                                    <p className="text-amber-400 text-xs flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        Audio mungkin akan terganggu selama proses ini
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="p-5 flex gap-3 border-t border-white/10">
                                    <button
                                        onClick={handleCancelPreview}
                                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={pendingSource ? handleApplySourcePreview : handleApplyLyrics}
                                        className="flex-1 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        {pendingSource ? 'Use This Source' : 'Apply Lyrics'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Applying Lyrics Loading */}
                <AnimatePresence>
                    {isApplyingLyrics && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xl"
                        >
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-4 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                <p className="text-white font-medium">Applying lyrics...</p>
                                <p className="text-white/50 text-sm mt-1">Audio mungkin terganggu sementara</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div >
        </AnimatePresence >
    );
}
