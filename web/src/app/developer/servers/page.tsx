"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
    Server,
    Users,
    Music,
    VolumeX,
    Volume2,
    Pause,
    Play,
    Power,
    Search,
    RefreshCw,
    ExternalLink,
    MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    members: number;
    isPlaying: boolean;
    currentTrack?: string;
    voiceChannel?: string;
}

export default function ServersPage() {
    const { isDark } = useSettings();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "playing" | "idle">("all");

    useEffect(() => {
        fetchGuilds();
    }, []);

    const fetchGuilds = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/guilds');
            if (response.ok) {
                const data = await response.json();
                setGuilds(data);
            } else {
                // Mock data for demo
                setGuilds([
                    { id: "1", name: "SONORA Test Server", icon: null, members: 150, isPlaying: true, currentTrack: "Bohemian Rhapsody", voiceChannel: "Music" },
                    { id: "2", name: "Gaming Hub", icon: null, members: 500, isPlaying: false },
                    { id: "3", name: "Chill Lounge", icon: null, members: 230, isPlaying: true, currentTrack: "Lofi Beats", voiceChannel: "Lofi" },
                    { id: "4", name: "Developer Zone", icon: null, members: 85, isPlaying: false },
                ]);
            }
        } catch {
            // Mock data
            setGuilds([
                { id: "1", name: "SONORA Test Server", icon: null, members: 150, isPlaying: true, currentTrack: "Bohemian Rhapsody", voiceChannel: "Music" },
                { id: "2", name: "Gaming Hub", icon: null, members: 500, isPlaying: false },
            ]);
        }
        setLoading(false);
    };

    const filteredGuilds = guilds.filter(guild => {
        const matchesSearch = guild.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" ||
            (filter === "playing" && guild.isPlaying) ||
            (filter === "idle" && !guild.isPlaying);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-purple-500/20" : "bg-purple-500/10"
                    )}>
                        <Server className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Server Management
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            {guilds.length} servers connected
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchGuilds}
                    disabled={loading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                        isDark
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className={cn(
                "flex flex-col md:flex-row gap-4 p-4 rounded-xl border",
                isDark
                    ? "bg-zinc-900/50 border-white/10"
                    : "bg-white border-gray-200"
            )}>
                <div className="relative flex-1">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                        isDark ? "text-zinc-500" : "text-gray-400"
                    )} />
                    <input
                        type="text"
                        placeholder="Search servers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                            "w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-colors text-sm",
                            isDark
                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                : "bg-gray-100 border border-gray-200 text-gray-900"
                        )}
                    />
                </div>
                <div className="flex gap-2">
                    {[
                        { value: "all", label: "All" },
                        { value: "playing", label: "Playing" },
                        { value: "idle", label: "Idle" },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setFilter(option.value as typeof filter)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                filter === option.value
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Server Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={cn(
                                "p-4 rounded-xl animate-pulse",
                                isDark ? "bg-zinc-900" : "bg-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-zinc-800" />
                                <div className="flex-1">
                                    <div className="h-4 w-24 bg-zinc-800 rounded mb-2" />
                                    <div className="h-3 w-16 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGuilds.map((guild, index) => (
                        <motion.div
                            key={guild.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "p-4 rounded-xl border transition-all",
                                guild.isPlaying
                                    ? "border-green-500/30 bg-green-500/5"
                                    : isDark
                                        ? "bg-zinc-900/50 border-white/10"
                                        : "bg-white border-gray-200"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                                    "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                )}>
                                    {guild.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(
                                        "font-semibold truncate",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {guild.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="w-3 h-3" />
                                        <span className={isDark ? "text-white/50" : "text-gray-500"}>
                                            {guild.members} members
                                        </span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    guild.isPlaying
                                        ? "bg-green-500/20 text-green-400"
                                        : isDark
                                            ? "bg-zinc-800 text-zinc-500"
                                            : "bg-gray-100 text-gray-400"
                                )}>
                                    {guild.isPlaying ? (
                                        <Volume2 className="w-4 h-4" />
                                    ) : (
                                        <VolumeX className="w-4 h-4" />
                                    )}
                                </div>
                            </div>

                            {guild.isPlaying && (
                                <div className={cn(
                                    "p-3 rounded-lg mb-3",
                                    isDark ? "bg-white/5" : "bg-gray-50"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <Music className="w-4 h-4 text-green-400" />
                                        <span className={cn(
                                            "text-sm truncate",
                                            isDark ? "text-white/80" : "text-gray-700"
                                        )}>
                                            {guild.currentTrack}
                                        </span>
                                    </div>
                                    {guild.voiceChannel && (
                                        <p className={cn(
                                            "text-xs mt-1",
                                            isDark ? "text-white/40" : "text-gray-500"
                                        )}>
                                            in #{guild.voiceChannel}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                    isDark
                                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                )}>
                                    <ExternalLink className="w-4 h-4" />
                                    View
                                </button>
                                <button className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isDark
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                )}>
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredGuilds.length === 0 && (
                <div className={cn(
                    "text-center py-12 rounded-xl border",
                    isDark
                        ? "bg-zinc-900/50 border-white/10"
                        : "bg-white border-gray-200"
                )}>
                    <Server className={cn(
                        "w-12 h-12 mx-auto mb-4",
                        isDark ? "text-zinc-600" : "text-gray-400"
                    )} />
                    <h3 className={cn(
                        "font-medium mb-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        No servers found
                    </h3>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Try adjusting your search or filter
                    </p>
                </div>
            )}
        </div>
    );
}
