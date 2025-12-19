"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Server,
    Users,
    Music,
    ArrowLeft,
    Pause,
    Play,
    SkipForward,
    Square,
    Volume2,
    VolumeX,
    ListMusic,
    Clock,
    Settings,
    RefreshCw,
    Crown,
    Shield,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import FullscreenLyricsPlayer from "@/components/lyrics/FullscreenLyricsPlayer";

interface GuildDetail {
    id: string;  // String to handle Discord snowflake IDs
    name: string;
    icon: string | null;
    member_count: number;
    voice_channel: string | null;
    is_playing: boolean;
    current_track: {
        title: string;
        artist: string;
        album?: string;
        duration: number;
        current_time: number;
        artwork_url?: string;
        requested_by?: string;
        is_playing?: boolean;
        is_paused?: boolean;
    } | null;
    queue: Array<{
        position: number;
        title: string;
        artist: string;
        duration: number;
    }>;
    queue_length: number;
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Proxy at /api/bot/[...path] forwards to BOT_API_URL/api/{path}
// So /api/bot/guild/xxx -> BOT_API_URL/api/guild/xxx
const API_BASE = '/api/bot';

export default function GuildDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { managedGuilds, user } = useSession();
    const { isDark } = useSettings();
    const [guild, setGuild] = useState<GuildDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isControlling, setIsControlling] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lyricsOpen, setLyricsOpen] = useState(false);

    // For smooth progress bar animation
    const [displayProgress, setDisplayProgress] = useState(0);
    const progressRef = useRef<number>(0);
    const animationRef = useRef<number | undefined>(undefined);
    const lastUpdateRef = useRef<number>(Date.now());

    const guildId = params.guildId as string;

    // Check if user has management access
    const managedGuild = managedGuilds?.find(g => g.id === guildId);
    const isManaged = !!managedGuild;
    const userRole = managedGuild?.owner ? "owner" : (managedGuild?.permissions && (managedGuild.permissions & 0x8) === 0x8) ? "admin" : null;
    const username = user?.username || 'Admin';

    const fetchGuild = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/guild/${guildId}`);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to fetch");
            }
            const data = await response.json();

            // Debug log for artwork
            if (data.current_track) {
                console.log('[DEBUG] Current track artwork_url:', data.current_track.artwork_url);
            }

            setGuild(data);
            setError(null);

            // Update progress reference
            if (data.current_track) {
                progressRef.current = (data.current_track.current_time / data.current_track.duration) * 100;
                lastUpdateRef.current = Date.now();
            }
        } catch (err: any) {
            setError(err.message || "Failed to load server details");
        } finally {
            setLoading(false);
        }
    }, [guildId]);

    // Smooth progress bar animation
    useEffect(() => {
        const animate = () => {
            if (guild?.current_track && guild.current_track.is_paused !== true) {
                const elapsed = (Date.now() - lastUpdateRef.current) / 1000;
                const additionalProgress = (elapsed / guild.current_track.duration) * 100;
                const newProgress = Math.min(progressRef.current + additionalProgress, 100);
                setDisplayProgress(newProgress);
            }
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [guild?.current_track?.duration, guild?.current_track?.is_paused]);

    useEffect(() => {
        fetchGuild();
        // Polling every 3 seconds
        const interval = setInterval(fetchGuild, 3000);
        return () => clearInterval(interval);
    }, [fetchGuild]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchGuild();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleControl = async (action: string) => {
        // Allow all users to control if they're in voice (backend verifies)
        setIsControlling(true);
        setActionMessage(null);

        try {
            const response = await fetch(`${API_BASE}/control/${guildId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    user_id: user?.id  // Send Discord user ID for voice check and notification mention
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Special handling for voice channel requirement
                if (data.voice_required) {
                    setActionMessage(`🎤 ${data.error}`);
                } else {
                    setActionMessage(`⚠️ ${data.error || 'Action failed'}`);
                }
            } else {
                const actionLabels: Record<string, string> = {
                    pause: '⏸️ Paused',
                    resume: '▶️ Resumed',
                    skip: '⏭️ Skipped',
                    stop: '⏹️ Stopped'
                };
                setActionMessage(actionLabels[action] || '✓ Action completed');
                await fetchGuild();
            }
        } catch (err) {
            setActionMessage('❌ Connection error');
        }

        setTimeout(() => {
            setIsControlling(false);
            setTimeout(() => setActionMessage(null), 3000);
        }, 300);
    };

    const handleQueueRemove = async (position: number) => {
        // Allow all users in voice to modify queue (backend verifies)
        try {
            const response = await fetch(`${API_BASE}/queue/${guildId}/remove/${position}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    user_id: user?.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                setActionMessage('🗑️ Track removed');
                await fetchGuild();
            } else {
                if (data.voice_required) {
                    setActionMessage(`🎤 ${data.error}`);
                } else {
                    setActionMessage(`⚠️ ${data.error || 'Failed to remove'}`);
                }
            }
        } catch (err) {
            setActionMessage('❌ Failed to remove track');
        }

        setTimeout(() => setActionMessage(null), 3000);
    };

    const handleQueueMove = async (position: number, direction: 'up' | 'down') => {
        if (!isManaged) return;
        const newPosition = direction === 'up' ? position - 1 : position + 1;

        if (newPosition < 1 || (guild && newPosition > guild.queue_length)) return;

        try {
            const response = await fetch(`${API_BASE}/queue/${guildId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_position: position,
                    to_position: newPosition,
                    username
                })
            });

            if (response.ok) {
                setActionMessage(`↕️ Moved to #${newPosition}`);
                await fetchGuild();
            }
        } catch (err) {
            setActionMessage('❌ Failed to move track');
        }

        setTimeout(() => setActionMessage(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !guild) {
        return (
            <div className="text-center py-16">
                <Server className={cn("w-16 h-16 mx-auto mb-4", isDark ? "text-zinc-700" : "text-gray-300")} />
                <p className={cn("text-xl", isDark ? "text-zinc-500" : "text-gray-500")}>{error || "Server not found"}</p>
                <p className={cn("text-sm mt-2", isDark ? "text-zinc-600" : "text-gray-400")}>
                    Make sure the bot is running and connected to this server
                </p>
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                        onClick={handleRefresh}
                        className={cn(
                            "px-4 py-2 rounded-xl flex items-center gap-2 transition-colors",
                            isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        Retry
                    </button>
                    <Link
                        href="/admin/guilds"
                        className="inline-flex items-center gap-2 text-[#7B1E3C] hover:text-[#9B2E4C]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Servers
                    </Link>
                </div>
            </div>
        );
    }

    // Calculate display time from smooth progress
    const displayTime = guild.current_track
        ? (displayProgress / 100) * guild.current_track.duration
        : 0;

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <Link
                href="/admin/guilds"
                className={cn(
                    "inline-flex items-center gap-2 transition-colors",
                    isDark ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                )}
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Servers
            </Link>

            {/* Server Header */}
            <div className="flex flex-col md:flex-row items-start gap-6">
                {guild.icon ? (
                    <img
                        src={guild.icon}
                        alt={guild.name}
                        className="w-24 h-24 rounded-2xl object-cover"
                        onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className={cn(
                        "w-24 h-24 rounded-2xl flex items-center justify-center",
                        "bg-gradient-to-br from-[#7B1E3C]/20 to-[#C4314B]/20"
                    )}>
                        <Server className={cn("w-12 h-12", isDark ? "text-zinc-500" : "text-gray-400")} />
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            {guild.name}
                        </h1>
                        {userRole === "owner" && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm flex items-center gap-1">
                                <Crown className="w-4 h-4" />
                                Owner
                            </span>
                        )}
                        {userRole === "admin" && (
                            <span className="px-3 py-1 rounded-full bg-[#7B1E3C]/20 text-[#C4314B] text-sm flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                Admin
                            </span>
                        )}
                    </div>
                    <div className={cn(
                        "flex items-center gap-6 mt-2",
                        isDark ? "text-zinc-400" : "text-gray-500"
                    )}>
                        <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {guild.member_count?.toLocaleString()} members
                        </span>
                        {guild.voice_channel && (
                            <span className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                {guild.voice_channel}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className={cn(
                            "p-3 rounded-xl transition-colors",
                            isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200"
                        )}
                        title="Refresh"
                    >
                        <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                    </button>
                    {isManaged && (
                        <Link
                            href={`/admin/guilds/${guildId}/settings`}
                            className={cn(
                                "px-4 py-2 rounded-xl transition-colors flex items-center gap-2",
                                isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                    )}
                </div>
            </div>

            {/* Action Message */}
            <AnimatePresence>
                {actionMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                            "p-4 rounded-xl border",
                            actionMessage.includes('⚠️') || actionMessage.includes('❌')
                                ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                                : "bg-green-500/20 border-green-500/30 text-green-400"
                        )}
                    >
                        {actionMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Now Playing */}
                <div className={cn(
                    "lg:col-span-2 p-4 sm:p-6 rounded-xl sm:rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <h2 className={cn(
                        "text-lg font-semibold mb-4 flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <Music className="w-5 h-5 text-[#7B1E3C]" />
                        Now Playing
                        {guild.is_playing && (
                            <span className="ml-auto flex items-center gap-1.5 text-sm text-green-400">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Live
                            </span>
                        )}
                    </h2>

                    {guild.current_track ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {/* Album Artwork */}
                                <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden">
                                    {guild.current_track.artwork_url ? (
                                        <img
                                            src={guild.current_track.artwork_url}
                                            alt={guild.current_track.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Replace with fallback on error
                                                (e.target as HTMLImageElement).src = '';
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center">
                                            <Music className="w-10 h-10 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-xl font-semibold truncate",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {guild.current_track.title}
                                    </p>
                                    <p className={cn(
                                        "truncate",
                                        isDark ? "text-zinc-400" : "text-gray-500"
                                    )}>
                                        {guild.current_track.artist}
                                    </p>
                                    {guild.current_track.requested_by && (
                                        <p className={cn(
                                            "text-sm mt-1",
                                            isDark ? "text-zinc-500" : "text-gray-400"
                                        )}>
                                            Requested by {guild.current_track.requested_by}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Smooth Progress Bar */}
                            <div className="space-y-2">
                                <div className={cn(
                                    "h-2 rounded-full overflow-hidden",
                                    isDark ? "bg-zinc-800" : "bg-gray-200"
                                )}>
                                    <div
                                        className="h-full bg-gradient-to-r from-[#7B1E3C] to-[#C4314B] transition-[width] duration-100 ease-linear"
                                        style={{ width: `${displayProgress}%` }}
                                    />
                                </div>
                                <div className={cn(
                                    "flex justify-between text-sm tabular-nums",
                                    isDark ? "text-zinc-500" : "text-gray-400"
                                )}>
                                    <span>{formatDuration(displayTime)}</span>
                                    <span>{formatDuration(guild.current_track.duration)}</span>
                                </div>
                            </div>

                            {/* Controls - Available to all users (backend verifies voice channel) */}
                            <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 pt-4">
                                <button
                                    onClick={() => handleControl(guild.current_track?.is_paused ? "resume" : "pause")}
                                    disabled={isControlling}
                                    className={cn(
                                        "p-2.5 sm:p-4 rounded-full transition-colors disabled:opacity-50",
                                        isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300"
                                    )}
                                    title={guild.current_track?.is_paused ? "Resume" : "Pause"}
                                >
                                    {guild.current_track?.is_paused ? (
                                        <Play className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-white" : "text-gray-700")} />
                                    ) : (
                                        <Pause className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-white" : "text-gray-700")} />
                                    )}
                                </button>
                                <button
                                    onClick={() => handleControl("skip")}
                                    disabled={isControlling}
                                    className={cn(
                                        "p-2.5 sm:p-4 rounded-full transition-colors disabled:opacity-50",
                                        isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300"
                                    )}
                                    title="Skip"
                                >
                                    <SkipForward className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-white" : "text-gray-700")} />
                                </button>
                                <button
                                    onClick={() => handleControl("stop")}
                                    disabled={isControlling}
                                    className="p-2.5 sm:p-4 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors disabled:opacity-50"
                                    title="Stop & Disconnect"
                                >
                                    <Square className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                                {/* Lyrics Button */}
                                <button
                                    onClick={() => setLyricsOpen(true)}
                                    className={cn(
                                        "p-2.5 sm:p-4 rounded-full transition-colors",
                                        isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300"
                                    )}
                                    title="Show Lyrics"
                                >
                                    <Mic2 className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-white" : "text-gray-700")} />
                                </button>
                            </div>

                            {/* Info message about voice channel requirement */}
                            <p className={cn(
                                "text-center text-sm pt-2",
                                isDark ? "text-zinc-500" : "text-gray-400"
                            )}>
                                {isManaged ? "Manager access" : "Join voice channel to control"}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <VolumeX className={cn(
                                "w-12 h-12 mx-auto mb-3",
                                isDark ? "text-zinc-700" : "text-gray-300"
                            )} />
                            <p className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                No track currently playing
                            </p>
                        </div>
                    )}
                </div>

                {/* Queue with Management */}
                <div className={cn(
                    "p-4 sm:p-6 rounded-xl sm:rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <h2 className={cn(
                        "text-lg font-semibold mb-4 flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <ListMusic className="w-5 h-5 text-cyan-400" />
                        Queue
                        {guild.queue_length > 0 && (
                            <span className={cn(
                                "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                                "bg-cyan-500/20 text-cyan-400"
                            )}>
                                {guild.queue_length} tracks
                            </span>
                        )}
                    </h2>

                    {guild.queue.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {guild.queue.map((track, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex items-center gap-2 p-3 rounded-xl transition-colors group",
                                        isDark ? "bg-zinc-800/50 hover:bg-zinc-800" : "bg-gray-100 hover:bg-gray-200"
                                    )}
                                >
                                    <span className={cn(
                                        "text-sm w-6 text-center shrink-0",
                                        isDark ? "text-zinc-500" : "text-gray-400"
                                    )}>
                                        {track.position}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {track.title}
                                        </p>
                                        <p className={cn(
                                            "text-xs truncate",
                                            isDark ? "text-zinc-500" : "text-gray-400"
                                        )}>
                                            {track.artist}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "text-xs shrink-0",
                                        isDark ? "text-zinc-500" : "text-gray-400"
                                    )}>
                                        {formatDuration(track.duration)}
                                    </span>

                                    {/* Queue controls - visible on hover */}
                                    {isManaged && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleQueueMove(track.position, 'up')}
                                                disabled={track.position === 1}
                                                className={cn(
                                                    "p-1 rounded-lg transition-colors disabled:opacity-30",
                                                    isDark ? "hover:bg-zinc-700" : "hover:bg-gray-300"
                                                )}
                                                title="Move up"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleQueueMove(track.position, 'down')}
                                                disabled={track.position === guild.queue_length}
                                                className={cn(
                                                    "p-1 rounded-lg transition-colors disabled:opacity-30",
                                                    isDark ? "hover:bg-zinc-700" : "hover:bg-gray-300"
                                                )}
                                                title="Move down"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleQueueRemove(track.position)}
                                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ListMusic className={cn(
                                "w-10 h-10 mx-auto mb-2",
                                isDark ? "text-zinc-700" : "text-gray-300"
                            )} />
                            <p className={cn(
                                "text-sm",
                                isDark ? "text-zinc-500" : "text-gray-400"
                            )}>
                                Queue is empty
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={cn(
                    "p-4 rounded-xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Queue Length</p>
                    <p className="text-2xl font-bold text-[#7B1E3C]">{guild.queue_length}</p>
                </div>
                <div className={cn(
                    "p-4 rounded-xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Status</p>
                    <p className={cn(
                        "text-2xl font-bold",
                        guild.is_playing ? "text-green-400" : isDark ? "text-zinc-500" : "text-gray-400"
                    )}>
                        {guild.is_playing ? "Playing" : "Idle"}
                    </p>
                </div>
                <div className={cn(
                    "p-4 rounded-xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Voice Channel</p>
                    <p className="text-2xl font-bold text-cyan-400 truncate">
                        {guild.voice_channel || "None"}
                    </p>
                </div>
                <div className={cn(
                    "p-4 rounded-xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}>
                    <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Members</p>
                    <p className="text-2xl font-bold text-yellow-400">{guild.member_count?.toLocaleString()}</p>
                </div>
            </div>

            {/* Fullscreen Lyrics Player */}
            <FullscreenLyricsPlayer
                guildId={guildId}
                isOpen={lyricsOpen}
                onClose={() => setLyricsOpen(false)}
                queue={guild?.queue}
                onControl={handleControl}
            />
        </div>
    );
}
