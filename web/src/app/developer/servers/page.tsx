"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Server,
    Users,
    Music,
    VolumeX,
    Volume2,
    Search,
    RefreshCw,
    ExternalLink,
    MoreVertical,
    Square,
    Trash2,
    LogOut,
    Hash,
    Mic,
    Radio,
    X,
    Ban,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
    CheckCircle,
    Info,
    List,
    HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    member_count: number;
    is_playing: boolean;
    current_track?: {
        title: string;
        artist: string;
        duration: number;
        current_time: number;
    };
}

interface Channel {
    id: string;
    name: string;
    type: "text" | "voice" | "stage";
    position: number;
    isDisabled: boolean;
    disableInfo?: {
        disabled_at: string;
        disabled_by: string;
        reason: string;
    };
    permissions?: {
        sendMessages: boolean;
        embedLinks: boolean;
    };
    members?: number;
}

interface QueueItem {
    position: number;
    title: string;
    artist: string;
    duration: number;
    requested_by: string;
}

interface GuildDetails {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    voiceChannel: {
        id: string;
        name: string;
        members: number;
    } | null;
    isPlaying: boolean;
    currentTrack: {
        title: string;
        artist: string;
        duration: number;
        current_time: number;
        artwork_url?: string;
    } | null;
    queueLength: number;
    queueItems: QueueItem[];
    channels: Channel[];
    members: {
        id: string;
        username: string;
        displayName: string;
        avatar: string | null;
        isBanned: boolean;
        banReason?: string;
    }[];
    sendableChannels: {
        id: string;
        name: string;
        position: number;
    }[];
}

// Use internal Next.js API proxy to Flask backend
const API_BASE = '/api/bot';

export default function ServersPage() {
    const { isDark } = useSettings();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "playing" | "idle">("all");

    // Modal state
    const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
    const [guildDetails, setGuildDetails] = useState<GuildDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "channels" | "members" | "controls">("overview");

    // Action states
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Dropdown menu state
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Ban modal
    const [showBanModal, setShowBanModal] = useState(false);
    const [banTarget, setBanTarget] = useState<{ id: string; username: string } | null>(null);
    const [banReason, setBanReason] = useState("");
    const [banDuration, setBanDuration] = useState("permanent");

    // Leave Server modal
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveReason, setLeaveReason] = useState("");
    const [leaveTargetChannel, setLeaveTargetChannel] = useState<string>("all");
    const [leaveBanServer, setLeaveBanServer] = useState(false);

    useEffect(() => {
        fetchGuilds();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchGuilds = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/guilds`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setGuilds(data);
            } else {
                setGuilds([]);
            }
        } catch {
            setGuilds([]);
        }
        setLoading(false);
    };

    const fetchGuildDetails = useCallback(async (guildId: string) => {
        setLoadingDetails(true);
        setGuildDetails(null); // Reset previous data
        try {
            console.log(`Fetching guild details for: ${guildId}`);
            const response = await fetch(`${API_BASE}/admin/guild/${guildId}/details`, {
                cache: 'no-store',
            });
            console.log(`Response status: ${response.status}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Guild details:', data);
                setGuildDetails(data);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch guild details:', response.status, errorText);
                showToast(`Failed to load server details: ${response.status}`, "error");
            }
        } catch (error) {
            console.error('Failed to fetch guild details:', error);
            showToast("Failed to connect to API", "error");
        }
        setLoadingDetails(false);
    }, []);

    const openGuildModal = async (guild: Guild) => {
        setSelectedGuild(guild);
        setActiveTab("overview");
        await fetchGuildDetails(guild.id);
    };

    const closeModal = () => {
        setSelectedGuild(null);
        setGuildDetails(null);
    };

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Server control actions
    const handleStopAudio = async (guildId: string) => {
        setActionLoading("stop");
        setDropdownOpen(null);
        try {
            const response = await fetch(`${API_BASE}/admin/guild/${guildId}/stop-audio`, {
                method: 'POST',
            });
            if (response.ok) {
                showToast("Audio stopped successfully", "success");
                await fetchGuildDetails(guildId);
                fetchGuilds();
            } else {
                const data = await response.json();
                showToast(data.error || "Failed to stop audio", "error");
            }
        } catch {
            showToast("Failed to stop audio", "error");
        }
        setActionLoading(null);
    };

    const handleClearQueue = async (guildId: string) => {
        setActionLoading("clear");
        setDropdownOpen(null);
        try {
            const response = await fetch(`${API_BASE}/admin/guild/${guildId}/clear-queue`, {
                method: 'POST',
            });
            if (response.ok) {
                const data = await response.json();
                showToast(`Cleared ${data.cleared_count} tracks from queue`, "success");
                await fetchGuildDetails(guildId);
            } else {
                const data = await response.json();
                showToast(data.error || "Failed to clear queue", "error");
            }
        } catch {
            showToast("Failed to clear queue", "error");
        }
        setActionLoading(null);
    };

    // Open leave server modal
    const handleLeaveServer = () => {
        setDropdownOpen(null);
        setLeaveReason("");
        setLeaveTargetChannel("all");
        setLeaveBanServer(false);
        setShowLeaveModal(true);
    };

    // Confirm and execute leave server
    const confirmLeaveServer = async () => {
        if (!selectedGuild) return;

        setActionLoading("leave");
        try {
            const response = await fetch(`${API_BASE}/admin/guild/${selectedGuild.id}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: leaveReason || "Bot removed by administrator",
                    target_channel: leaveTargetChannel,
                    ban_server: leaveBanServer
                }),
            });
            if (response.ok) {
                const data = await response.json();
                showToast(
                    leaveBanServer
                        ? `Left and banned server: ${data.guild_name}`
                        : `Left server: ${data.guild_name}`,
                    "success"
                );
                setShowLeaveModal(false);
                closeModal();
                fetchGuilds();
            } else {
                const data = await response.json();
                showToast(data.error || "Failed to leave server", "error");
            }
        } catch {
            showToast("Failed to leave server", "error");
        }
        setActionLoading(null);
    };

    // Channel disable/enable
    const handleToggleChannel = async (guildId: string, channelId: string, isDisabled: boolean) => {
        setActionLoading(`channel-${channelId}`);
        try {
            const response = await fetch(`${API_BASE}/admin/guild/${guildId}/channels/${channelId}/disable`, {
                method: isDisabled ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: isDisabled ? undefined : JSON.stringify({ reason: 'Disabled from server management' }),
            });
            if (response.ok) {
                showToast(isDisabled ? "Channel enabled" : "Channel disabled", "success");
                await fetchGuildDetails(guildId);
            } else {
                showToast("Failed to toggle channel", "error");
            }
        } catch {
            showToast("Failed to toggle channel", "error");
        }
        setActionLoading(null);
    };

    // Ban user
    const openBanModal = (user: { id: string; username: string }) => {
        setBanTarget(user);
        setBanReason("");
        setBanDuration("permanent");
        setShowBanModal(true);
    };

    const handleBanUser = async () => {
        if (!banTarget || !selectedGuild) return;

        setActionLoading("ban");
        try {
            const response = await fetch(`${API_BASE}/admin/guild/${selectedGuild.id}/ban-user/${banTarget.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: banReason || 'Banned from server management',
                    duration: banDuration,
                }),
            });
            if (response.ok) {
                showToast(`${banTarget.username} has been banned`, "success");
                setShowBanModal(false);
                await fetchGuildDetails(selectedGuild.id);
            } else {
                showToast("Failed to ban user", "error");
            }
        } catch {
            showToast("Failed to ban user", "error");
        }
        setActionLoading(null);
    };

    const filteredGuilds = guilds.filter(guild => {
        const matchesSearch = guild.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" ||
            (filter === "playing" && guild.is_playing) ||
            (filter === "idle" && !guild.is_playing);
        return matchesSearch && matchesFilter;
    });

    const getChannelIcon = (type: string) => {
        switch (type) {
            case "voice": return Mic;
            case "stage": return Radio;
            default: return Hash;
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                            "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg",
                            toast.type === "success"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                        )}
                    >
                        {toast.type === "success" ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5" />
                        )}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

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
            ) : guilds.length === 0 ? (
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
                        No servers connected
                    </h3>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        The bot is not connected to any servers or the API is unreachable
                    </p>
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
                                guild.is_playing
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
                                    {guild.icon ? (
                                        <img
                                            src={guild.icon}
                                            alt={guild.name}
                                            className="w-full h-full rounded-xl object-cover"
                                        />
                                    ) : (
                                        guild.name.charAt(0)
                                    )}
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
                                            {guild.member_count} members
                                        </span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    guild.is_playing
                                        ? "bg-green-500/20 text-green-400"
                                        : isDark
                                            ? "bg-zinc-800 text-zinc-500"
                                            : "bg-gray-100 text-gray-400"
                                )}>
                                    {guild.is_playing ? (
                                        <Volume2 className="w-4 h-4" />
                                    ) : (
                                        <VolumeX className="w-4 h-4" />
                                    )}
                                </div>
                            </div>

                            {guild.is_playing && guild.current_track && (
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
                                            {guild.current_track.title}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xs mt-1",
                                        isDark ? "text-white/40" : "text-gray-500"
                                    )}>
                                        by {guild.current_track.artist}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openGuildModal(guild)}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                        isDark
                                            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    )}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View
                                </button>
                                <div className="relative" ref={dropdownOpen === guild.id ? dropdownRef : null}>
                                    <button
                                        onClick={() => setDropdownOpen(dropdownOpen === guild.id ? null : guild.id)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            dropdownOpen === guild.id
                                                ? "bg-purple-500/20 text-purple-400"
                                                : isDark
                                                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        )}
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {dropdownOpen === guild.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                className={cn(
                                                    "absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden border",
                                                    isDark
                                                        ? "bg-zinc-900 border-white/10"
                                                        : "bg-white border-gray-200"
                                                )}
                                            >
                                                <button
                                                    onClick={() => handleStopAudio(guild.id)}
                                                    disabled={actionLoading === "stop"}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                                                        isDark
                                                            ? "hover:bg-red-500/10 text-red-400"
                                                            : "hover:bg-red-50 text-red-500"
                                                    )}
                                                >
                                                    <Square className="w-4 h-4" />
                                                    Stop Audio
                                                </button>
                                                <button
                                                    onClick={() => handleClearQueue(guild.id)}
                                                    disabled={actionLoading === "clear"}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                                                        isDark
                                                            ? "hover:bg-orange-500/10 text-orange-400"
                                                            : "hover:bg-orange-50 text-orange-500"
                                                    )}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Clear Queue
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedGuild(guild);
                                                        handleLeaveServer();
                                                    }}
                                                    disabled={actionLoading === "leave"}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                                                        isDark
                                                            ? "hover:bg-red-500/10 text-red-400"
                                                            : "hover:bg-red-50 text-red-500"
                                                    )}
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Leave Server
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredGuilds.length === 0 && guilds.length > 0 && (
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

            {/* Server Detail Modal */}
            <AnimatePresence>
                {selectedGuild && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className={cn(
                                "flex items-center justify-between p-4 border-b",
                                isDark ? "border-white/10" : "border-gray-200"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold",
                                        "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                    )}>
                                        {guildDetails?.icon ? (
                                            <img
                                                src={guildDetails.icon}
                                                alt={guildDetails.name}
                                                className="w-full h-full rounded-xl object-cover"
                                            />
                                        ) : (
                                            selectedGuild.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h2 className={cn(
                                            "font-bold",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {selectedGuild.name}
                                        </h2>
                                        <p className={cn(
                                            "text-sm",
                                            isDark ? "text-white/50" : "text-gray-500"
                                        )}>
                                            {guildDetails?.memberCount || selectedGuild.member_count} members
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className={cn(
                                "flex border-b px-4 overflow-x-auto",
                                isDark ? "border-white/10" : "border-gray-200"
                            )}>
                                {[
                                    { id: "overview", label: "Overview", icon: Info },
                                    { id: "channels", label: "Channels", icon: Hash },
                                    { id: "members", label: "Members", icon: Users },
                                    { id: "controls", label: "Controls", icon: Square },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                                            activeTab === tab.id
                                                ? "border-purple-500 text-purple-400"
                                                : isDark
                                                    ? "border-transparent text-white/50 hover:text-white/80"
                                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {loadingDetails ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                                    </div>
                                ) : !guildDetails ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
                                        <h3 className={cn(
                                            "font-semibold mb-2",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            Failed to load server details
                                        </h3>
                                        <p className={cn(
                                            "text-sm mb-4 text-center",
                                            isDark ? "text-white/50" : "text-gray-500"
                                        )}>
                                            Could not connect to the bot API. Make sure the bot is running.
                                        </p>
                                        <button
                                            onClick={() => fetchGuildDetails(selectedGuild!.id)}
                                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Overview Tab */}
                                        {activeTab === "overview" && guildDetails && (
                                            <div className="space-y-4">
                                                {/* Now Playing */}
                                                {guildDetails.isPlaying && guildDetails.currentTrack ? (
                                                    <div className={cn(
                                                        "p-4 rounded-xl border",
                                                        "border-green-500/30 bg-green-500/5"
                                                    )}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Volume2 className="w-5 h-5 text-green-400" />
                                                            <span className="text-green-400 font-medium">Now Playing</span>
                                                        </div>
                                                        <h3 className={cn(
                                                            "font-semibold text-lg",
                                                            isDark ? "text-white" : "text-gray-900"
                                                        )}>
                                                            {guildDetails.currentTrack.title}
                                                        </h3>
                                                        <p className={isDark ? "text-white/60" : "text-gray-600"}>
                                                            {guildDetails.currentTrack.artist}
                                                        </p>
                                                        {guildDetails.voiceChannel && (
                                                            <p className={cn(
                                                                "text-sm mt-2",
                                                                isDark ? "text-white/40" : "text-gray-500"
                                                            )}>
                                                                <Mic className="w-3 h-3 inline mr-1" />
                                                                in #{guildDetails.voiceChannel.name} ({guildDetails.voiceChannel.members} listeners)
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "p-4 rounded-xl border",
                                                        isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                    )}>
                                                        <div className="flex items-center gap-2">
                                                            <VolumeX className="w-5 h-5 text-zinc-500" />
                                                            <span className={isDark ? "text-white/60" : "text-gray-500"}>
                                                                Not playing anything
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stats */}
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className={cn(
                                                        "p-4 rounded-xl border text-center",
                                                        isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                    )}>
                                                        <p className="text-2xl font-bold text-purple-400">{guildDetails.channels?.filter(c => c.type === 'text').length || 0}</p>
                                                        <p className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>Text Channels</p>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 rounded-xl border text-center",
                                                        isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                    )}>
                                                        <p className="text-2xl font-bold text-blue-400">{guildDetails.channels?.filter(c => c.type === 'voice').length || 0}</p>
                                                        <p className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>Voice Channels</p>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 rounded-xl border text-center",
                                                        isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                    )}>
                                                        <p className="text-2xl font-bold text-orange-400">{guildDetails.queueLength}</p>
                                                        <p className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>Queue Length</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Channels Tab - Now shows ALL channels */}
                                        {activeTab === "channels" && guildDetails && (
                                            <div className="space-y-2">
                                                <p className={cn(
                                                    "text-sm mb-4",
                                                    isDark ? "text-white/50" : "text-gray-500"
                                                )}>
                                                    Disabled channels will show a warning when users try to use bot commands.
                                                </p>
                                                {guildDetails.channels?.map(channel => {
                                                    const ChannelIcon = getChannelIcon(channel.type);
                                                    return (
                                                        <div
                                                            key={channel.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-lg",
                                                                channel.isDisabled
                                                                    ? "bg-red-500/10 border border-red-500/20"
                                                                    : isDark
                                                                        ? "bg-zinc-800/50"
                                                                        : "bg-gray-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ChannelIcon className={cn(
                                                                    "w-4 h-4",
                                                                    channel.isDisabled ? "text-red-400" : isDark ? "text-white/50" : "text-gray-500"
                                                                )} />
                                                                <span className={cn(
                                                                    channel.isDisabled ? "text-red-400" : isDark ? "text-white" : "text-gray-900"
                                                                )}>
                                                                    {channel.name}
                                                                </span>
                                                                <span className={cn(
                                                                    "text-xs px-1.5 py-0.5 rounded",
                                                                    channel.type === 'voice'
                                                                        ? "bg-blue-500/20 text-blue-400"
                                                                        : channel.type === 'stage'
                                                                            ? "bg-purple-500/20 text-purple-400"
                                                                            : "bg-zinc-500/20 text-zinc-400"
                                                                )}>
                                                                    {channel.type}
                                                                </span>
                                                                {channel.isDisabled && (
                                                                    <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                                                                        Disabled
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleToggleChannel(selectedGuild.id, channel.id, channel.isDisabled)}
                                                                disabled={actionLoading === `channel-${channel.id}`}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-colors",
                                                                    channel.isDisabled
                                                                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                                        : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                                )}
                                                            >
                                                                {actionLoading === `channel-${channel.id}` ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                ) : channel.isDisabled ? (
                                                                    <ToggleRight className="w-4 h-4" />
                                                                ) : (
                                                                    <ToggleLeft className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Members Tab */}
                                        {activeTab === "members" && guildDetails && (
                                            <div className="space-y-2">
                                                <p className={cn(
                                                    "text-sm mb-4",
                                                    isDark ? "text-white/50" : "text-gray-500"
                                                )}>
                                                    Banned users will be added to the global ban list and cannot use the bot.
                                                </p>
                                                {guildDetails.members.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-lg",
                                                            member.isBanned
                                                                ? "bg-red-500/10 border border-red-500/20"
                                                                : isDark
                                                                    ? "bg-zinc-800/50"
                                                                    : "bg-gray-50"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                                "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                                            )}>
                                                                {member.avatar ? (
                                                                    <img
                                                                        src={member.avatar}
                                                                        alt={member.username}
                                                                        className="w-full h-full rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    member.username.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className={cn(
                                                                    "font-medium",
                                                                    member.isBanned ? "text-red-400" : isDark ? "text-white" : "text-gray-900"
                                                                )}>
                                                                    {member.displayName}
                                                                </p>
                                                                <p className={cn(
                                                                    "text-xs",
                                                                    isDark ? "text-white/40" : "text-gray-500"
                                                                )}>
                                                                    @{member.username}
                                                                </p>
                                                            </div>
                                                            {member.isBanned && (
                                                                <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                                                                    Banned{member.banReason ? `: ${member.banReason}` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!member.isBanned && (
                                                            <button
                                                                onClick={() => openBanModal(member)}
                                                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Controls Tab */}
                                        {activeTab === "controls" && guildDetails && (
                                            <div className="space-y-4">
                                                <div className={cn(
                                                    "p-4 rounded-xl border",
                                                    isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                )}>
                                                    <h3 className={cn(
                                                        "font-semibold mb-4",
                                                        isDark ? "text-white" : "text-gray-900"
                                                    )}>
                                                        Playback Controls
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <button
                                                            onClick={() => handleStopAudio(selectedGuild.id)}
                                                            disabled={actionLoading === "stop"}
                                                            className={cn(
                                                                "flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors",
                                                                "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                            )}
                                                        >
                                                            {actionLoading === "stop" ? (
                                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Square className="w-5 h-5" />
                                                            )}
                                                            Stop Audio
                                                        </button>
                                                        <button
                                                            onClick={() => handleClearQueue(selectedGuild.id)}
                                                            disabled={actionLoading === "clear"}
                                                            className={cn(
                                                                "flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors",
                                                                "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                                            )}
                                                        >
                                                            {actionLoading === "clear" ? (
                                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-5 h-5" />
                                                            )}
                                                            Clear Queue
                                                        </button>
                                                        <button
                                                            onClick={handleLeaveServer}
                                                            disabled={actionLoading === "leave"}
                                                            className={cn(
                                                                "flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors",
                                                                "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                            )}
                                                        >
                                                            {actionLoading === "leave" ? (
                                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <LogOut className="w-5 h-5" />
                                                            )}
                                                            Leave Server
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Queue Display */}
                                                <div className={cn(
                                                    "p-4 rounded-xl border",
                                                    isDark ? "border-white/10 bg-zinc-800/50" : "border-gray-200 bg-gray-50"
                                                )}>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <List className="w-5 h-5 text-purple-400" />
                                                        <h3 className={cn(
                                                            "font-semibold",
                                                            isDark ? "text-white" : "text-gray-900"
                                                        )}>
                                                            Queue ({guildDetails.queueLength} tracks)
                                                        </h3>
                                                    </div>
                                                    {guildDetails.queueItems && guildDetails.queueItems.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {guildDetails.queueItems.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-3 rounded-lg",
                                                                        isDark ? "bg-zinc-700/50" : "bg-gray-100"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={cn(
                                                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                                            isDark ? "bg-zinc-600 text-white" : "bg-gray-300 text-gray-700"
                                                                        )}>
                                                                            {item.position}
                                                                        </span>
                                                                        <div>
                                                                            <p className={cn(
                                                                                "font-medium text-sm",
                                                                                isDark ? "text-white" : "text-gray-900"
                                                                            )}>
                                                                                {item.title}
                                                                            </p>
                                                                            <p className={cn(
                                                                                "text-xs",
                                                                                isDark ? "text-white/40" : "text-gray-500"
                                                                            )}>
                                                                                {item.artist}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-xs",
                                                                        isDark ? "text-white/40" : "text-gray-500"
                                                                    )}>
                                                                        {formatDuration(item.duration)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {guildDetails.queueLength > 20 && (
                                                                <p className={cn(
                                                                    "text-sm text-center py-2",
                                                                    isDark ? "text-white/40" : "text-gray-500"
                                                                )}>
                                                                    +{guildDetails.queueLength - 20} more tracks...
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={cn(
                                                            "text-center py-6",
                                                            isDark ? "text-white/40" : "text-gray-500"
                                                        )}>
                                                            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-sm">Queue is empty</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={cn(
                                                    "p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5"
                                                )}>
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                                                        <div>
                                                            <h4 className="font-medium text-yellow-400">Warning</h4>
                                                            <p className={cn(
                                                                "text-sm mt-1",
                                                                isDark ? "text-white/60" : "text-gray-600"
                                                            )}>
                                                                These actions will immediately affect all users in the server.
                                                                A notification will be sent to Discord.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ban User Modal */}
            <AnimatePresence>
                {showBanModal && banTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowBanModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-md p-6 rounded-2xl",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-red-500/20">
                                    <Ban className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className={cn(
                                        "font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        Ban User
                                    </h3>
                                    <p className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>
                                        {banTarget.username}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Reason
                                    </label>
                                    <textarea
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        placeholder="Reason for the ban..."
                                        rows={3}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Duration
                                    </label>
                                    <select
                                        value={banDuration}
                                        onChange={(e) => setBanDuration(e.target.value)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    >
                                        <option value="permanent">Permanent</option>
                                        <option value="1">1 Day</option>
                                        <option value="7">7 Days</option>
                                        <option value="30">30 Days</option>
                                        <option value="90">90 Days</option>
                                    </select>
                                </div>
                            </div>

                            <div className={cn(
                                "flex items-start gap-2 mt-4 p-3 rounded-xl",
                                isDark ? "bg-yellow-500/10" : "bg-yellow-50"
                            )}>
                                <HelpCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className={cn(
                                    "text-xs",
                                    isDark ? "text-white/60" : "text-gray-600"
                                )}>
                                    User will be shown a warning message with reason and support link when trying to use bot commands.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-medium",
                                        isDark
                                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBanUser}
                                    disabled={actionLoading === "ban"}
                                    className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    {actionLoading === "ban" ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Ban className="w-5 h-5" />
                                    )}
                                    Ban User
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leave Server Modal */}
            <AnimatePresence>
                {showLeaveModal && selectedGuild && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowLeaveModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-md p-6 rounded-2xl",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-red-500/20">
                                    <LogOut className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className={cn(
                                        "font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        Leave Server
                                    </h3>
                                    <p className={isDark ? "text-white/50 text-sm" : "text-gray-500 text-sm"}>
                                        {selectedGuild.name}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Reason
                                    </label>
                                    <textarea
                                        value={leaveReason}
                                        onChange={(e) => setLeaveReason(e.target.value)}
                                        placeholder="Reason for leaving this server..."
                                        rows={3}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Send Goodbye Message To
                                    </label>
                                    <select
                                        value={leaveTargetChannel}
                                        onChange={(e) => setLeaveTargetChannel(e.target.value)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    >
                                        <option value="all">All Sendable Channels</option>
                                        {guildDetails?.sendableChannels?.map(channel => (
                                            <option key={channel.id} value={channel.id}>
                                                #{channel.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border cursor-pointer",
                                    leaveBanServer
                                        ? isDark ? "border-red-500/50 bg-red-500/10" : "border-red-500/50 bg-red-50"
                                        : isDark ? "border-zinc-700 bg-zinc-800" : "border-gray-200 bg-gray-50"
                                )}
                                    onClick={() => setLeaveBanServer(!leaveBanServer)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={leaveBanServer}
                                        onChange={(e) => setLeaveBanServer(e.target.checked)}
                                        className="w-5 h-5 rounded border text-red-500 focus:ring-red-500"
                                    />
                                    <div>
                                        <p className={cn(
                                            "font-medium",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            Ban this server
                                        </p>
                                        <p className={cn(
                                            "text-xs",
                                            isDark ? "text-white/50" : "text-gray-500"
                                        )}>
                                            If re-invited, bot will auto-leave and notify owner
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {leaveBanServer && (
                                <div className={cn(
                                    "flex items-start gap-2 mt-4 p-3 rounded-xl",
                                    isDark ? "bg-red-500/10" : "bg-red-50"
                                )}>
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className={cn(
                                        "text-xs",
                                        isDark ? "text-white/60" : "text-gray-600"
                                    )}>
                                        Server will be banned permanently. Re-inviting the bot will result in automatic removal and a DM to the server owner with the ban reason.
                                    </p>
                                </div>
                            )}

                            <div className={cn(
                                "flex items-start gap-2 mt-4 p-3 rounded-xl",
                                isDark ? "bg-blue-500/10" : "bg-blue-50"
                            )}>
                                <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className={cn(
                                    "text-xs",
                                    isDark ? "text-white/60" : "text-gray-600"
                                )}>
                                    A goodbye message with reason and support link will be sent to the selected channel(s) before leaving.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowLeaveModal(false)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-medium",
                                        isDark
                                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmLeaveServer}
                                    disabled={actionLoading === "leave"}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2",
                                        leaveBanServer
                                            ? "bg-red-500 text-white hover:bg-red-600"
                                            : "bg-orange-500 text-white hover:bg-orange-600"
                                    )}
                                >
                                    {actionLoading === "leave" ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <LogOut className="w-5 h-5" />
                                    )}
                                    {leaveBanServer ? "Leave & Ban" : "Leave Server"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
