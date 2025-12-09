"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    TrendingUp,
    Settings,
    ExternalLink,
    RefreshCw,
    Crown,
    Shield,
    Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useSession } from "@/contexts/SessionContext";

interface GuildDetail {
    id: number;
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

export default function GuildDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { managedGuilds } = useSession();
    const [guild, setGuild] = useState<GuildDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isControlling, setIsControlling] = useState(false);

    const guildId = params.guildId as string;

    // Check if user has management access
    const managedGuild = managedGuilds?.find(g => g.id === guildId);
    const isManaged = !!managedGuild;
    const userRole = managedGuild?.owner ? "owner" : (managedGuild?.permissions && (managedGuild.permissions & 0x8) === 0x8) ? "admin" : null;

    const fetchGuild = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/guild/${guildId}`);
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setGuild(data);
            setError(null);
        } catch (err) {
            setError("Failed to load server details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuild();
        const interval = setInterval(fetchGuild, 5000);
        return () => clearInterval(interval);
    }, [guildId]);

    const handleControl = async (action: string) => {
        if (!isManaged) return;
        setIsControlling(true);
        try {
            await api.control(Number(guildId), action as "pause" | "resume" | "skip" | "stop");
            await fetchGuild();
        } catch (err) {
            console.error("Control failed:", err);
        }
        setTimeout(() => setIsControlling(false), 300);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !guild) {
        return (
            <div className="text-center py-16">
                <Server className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-xl text-zinc-500">{error || "Server not found"}</p>
                <Link
                    href="/admin/guilds"
                    className="inline-flex items-center gap-2 mt-4 text-purple-400 hover:text-purple-300"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Servers
                </Link>
            </div>
        );
    }

    const progress = guild.current_track
        ? (guild.current_track.current_time / guild.current_track.duration) * 100
        : 0;

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <Link
                href="/admin/guilds"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
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
                    />
                ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Server className="w-12 h-12 text-zinc-500" />
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold">{guild.name}</h1>
                        {userRole === "owner" && (
                            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm flex items-center gap-1">
                                <Crown className="w-4 h-4" />
                                Owner
                            </span>
                        )}
                        {userRole === "admin" && (
                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                Admin
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-zinc-400">
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

                {isManaged && (
                    <Link
                        href={`/admin/guilds/${guildId}/settings`}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </Link>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Now Playing */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Music className="w-5 h-5 text-purple-400" />
                        Now Playing
                    </h2>

                    {guild.current_track ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
                                    <Music className="w-10 h-10 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xl font-semibold truncate">{guild.current_track.title}</p>
                                    <p className="text-zinc-400 truncate">{guild.current_track.artist}</p>
                                    {guild.current_track.requested_by && (
                                        <p className="text-sm text-zinc-500 mt-1">
                                            Requested by {guild.current_track.requested_by}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                                        style={{ width: `${progress}%` }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm text-zinc-500">
                                    <span>{formatDuration(guild.current_track.current_time)}</span>
                                    <span>{formatDuration(guild.current_track.duration)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            {isManaged && (
                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <button
                                        onClick={() => handleControl(guild.current_track?.is_paused ? "resume" : "pause")}
                                        disabled={isControlling}
                                        className="p-4 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        {guild.current_track?.is_paused ? (
                                            <Play className="w-6 h-6" />
                                        ) : (
                                            <Pause className="w-6 h-6" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleControl("skip")}
                                        disabled={isControlling}
                                        className="p-4 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => handleControl("stop")}
                                        disabled={isControlling}
                                        className="p-4 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <VolumeX className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-500">No track currently playing</p>
                        </div>
                    )}
                </div>

                {/* Queue */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ListMusic className="w-5 h-5 text-cyan-400" />
                        Queue
                        {guild.queue_length > 0 && (
                            <span className="ml-auto text-sm text-zinc-500">{guild.queue_length} tracks</span>
                        )}
                    </h2>

                    {guild.queue.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {guild.queue.map((track, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                                >
                                    <span className="text-sm text-zinc-500 w-6 text-center">{track.position}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{track.title}</p>
                                        <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                                    </div>
                                    <span className="text-xs text-zinc-500">{formatDuration(track.duration)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ListMusic className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                            <p className="text-sm text-zinc-500">Queue is empty</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Queue Length</p>
                    <p className="text-2xl font-bold text-purple-400">{guild.queue_length}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Status</p>
                    <p className="text-2xl font-bold text-green-400">
                        {guild.is_playing ? "Playing" : "Idle"}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Voice Channel</p>
                    <p className="text-2xl font-bold text-cyan-400 truncate">
                        {guild.voice_channel || "None"}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Members</p>
                    <p className="text-2xl font-bold text-yellow-400">{guild.member_count?.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
