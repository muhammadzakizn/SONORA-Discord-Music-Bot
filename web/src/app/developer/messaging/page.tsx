"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Send,
    Server,
    Hash,
    CheckCircle,
    XCircle,
    RefreshCw,
    ChevronDown,
    Image as ImageIcon,
    X,
    Users,
    Mic,
    Radio,
    AtSign,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface BroadcastResult {
    success: boolean;
    serversReached: number;
    failed: number;
    timestamp: string;
}

interface Channel {
    id: string;
    name: string;
    type: string;
    category?: string;
    can_send: boolean;
    permissions: {
        send_messages?: boolean;
        mention_everyone?: boolean;
    };
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    member_count?: number;
    sendable_channels?: number;
    channels: Channel[];
}

interface UserData {
    id: string;
    username: string;
    displayName?: string;
    avatar: string | null;
    isBanned: boolean;
    serverName?: string;
}

// Use internal Next.js API proxy to Flask backend
const API_BASE = '/api/bot';

export default function MessagingPage() {
    const { isDark } = useSettings();

    // Target type: servers, channel, users
    const [targetType, setTargetType] = useState<"all_servers" | "specific_channel" | "users">("all_servers");

    // Guild and channel selection
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
    const [showGuildDropdown, setShowGuildDropdown] = useState(false);
    const [showChannelDropdown, setShowChannelDropdown] = useState(false);

    // Users selection
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userSearch, setUserSearch] = useState("");

    // Message content
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [image, setImage] = useState("");

    // Mention options
    const [mentionType, setMentionType] = useState<"none" | "everyone" | "here">("none");

    // State
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<BroadcastResult | null>(null);
    const [history, setHistory] = useState<BroadcastResult[]>([]);
    const [loadingGuilds, setLoadingGuilds] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Fetch guilds and channels on mount
    useEffect(() => {
        fetchGuilds();
        fetchUsers();
    }, []);

    const fetchGuilds = async () => {
        setLoadingGuilds(true);
        try {
            const response = await fetch(`${API_BASE}/admin/guilds/channels`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setGuilds(data);
            }
        } catch (error) {
            console.error('Failed to fetch guilds:', error);
        }
        setLoadingGuilds(false);
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await fetch(`${API_BASE}/admin/users`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
        setLoadingUsers(false);
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        setResult(null);

        try {
            let response;

            if (targetType === "users") {
                // Send DMs to selected users
                response = await fetch(`${API_BASE}/admin/dm-users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        message: title ? `**${title}**\n\n${message}` : message,
                        user_ids: selectedUsers.map(u => u.id),
                    }),
                });
            } else {
                // Send to channels
                response = await fetch(`${API_BASE}/admin/broadcast`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: title ? `**${title}**\n\n${message}` : message,
                        all_channels: targetType === "all_servers",
                        channel_ids: selectedChannels.map(c => c.id),
                        guild_ids: targetType === "specific_channel" && selectedGuild && selectedChannels.length === 0
                            ? [selectedGuild.id]
                            : [],
                        mention_type: mentionType,
                    }),
                });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                const newResult: BroadcastResult = {
                    success: true,
                    serversReached: data.sent || 0,
                    failed: data.failed || 0,
                    timestamp: new Date().toLocaleString(),
                };

                setResult(newResult);
                setHistory(prev => [newResult, ...prev].slice(0, 10));

                setTimeout(() => {
                    setTitle("");
                    setMessage("");
                    setImage("");
                    setResult(null);
                    setSelectedChannels([]);
                    setSelectedUsers([]);
                }, 3000);
            } else {
                setResult({
                    success: false,
                    serversReached: 0,
                    failed: data.failed || 1,
                    timestamp: new Date().toLocaleString(),
                });
            }
        } catch (error) {
            console.error('Broadcast error:', error);
            setResult({
                success: false,
                serversReached: 0,
                failed: 1,
                timestamp: new Date().toLocaleString(),
            });
        }

        setSending(false);
    };

    const toggleChannelSelection = (channel: Channel) => {
        if (selectedChannels.find(c => c.id === channel.id)) {
            setSelectedChannels(prev => prev.filter(c => c.id !== channel.id));
        } else {
            setSelectedChannels(prev => [...prev, channel]);
        }
    };

    const toggleUserSelection = (user: UserData) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const selectAllSendableChannels = () => {
        if (!selectedGuild) return;
        const sendable = selectedGuild.channels.filter(c => c.can_send);
        setSelectedChannels(sendable);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase()))
    );

    // Count sendable servers (servers with at least 1 sendable channel)
    const sendableServersCount = guilds.filter(g => (g.sendable_channels || 0) > 0).length;

    const getChannelIcon = (type: string) => {
        switch (type) {
            case "voice": return Mic;
            case "stage": return Radio;
            default: return Hash;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-blue-500/20" : "bg-blue-500/10"
                    )}>
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Broadcast Messaging
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Send announcements to Discord servers ({sendableServersCount} servers available) • {users.length} users
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { fetchGuilds(); fetchUsers(); }}
                    disabled={loadingGuilds || loadingUsers}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                        isDark
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", (loadingGuilds || loadingUsers) && "animate-spin")} />
                    Refresh
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Composer */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "p-6 rounded-2xl border",
                            isDark
                                ? "bg-zinc-900/50 border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        <h2 className={cn(
                            "text-lg font-semibold mb-4",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Compose Message
                        </h2>

                        {/* Target Selection - 3 options */}
                        <div className="mb-4">
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Target
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        setTargetType("all_servers");
                                        setSelectedGuild(null);
                                        setSelectedChannels([]);
                                        setSelectedUsers([]);
                                    }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "all_servers"
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : isDark
                                                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                                : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    <Server className="w-4 h-4" />
                                    <span className="hidden sm:inline">All Servers</span>
                                    <span className="sm:hidden">All</span>
                                    <span className="text-xs">({sendableServersCount})</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setTargetType("specific_channel");
                                        setSelectedUsers([]);
                                    }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "specific_channel"
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                            : isDark
                                                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                                : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    <Hash className="w-4 h-4" />
                                    <span className="hidden sm:inline">Specific Channel</span>
                                    <span className="sm:hidden">Channel</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setTargetType("users");
                                        setSelectedGuild(null);
                                        setSelectedChannels([]);
                                    }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "users"
                                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                            : isDark
                                                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                                : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden sm:inline">DM Users</span>
                                    <span className="sm:hidden">Users</span>
                                    <span className="text-xs">({users.length})</span>
                                </button>
                            </div>
                        </div>

                        {/* Server & Channel Selection */}
                        <AnimatePresence>
                            {targetType === "specific_channel" && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-4 space-y-3 overflow-visible"
                                >
                                    {/* Server Dropdown */}
                                    <div>
                                        <label className={cn(
                                            "block text-sm font-medium mb-2",
                                            isDark ? "text-white/70" : "text-gray-700"
                                        )}>
                                            Select Server
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowGuildDropdown(!showGuildDropdown)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl flex items-center justify-between border",
                                                    isDark
                                                        ? "bg-zinc-800 border-zinc-700 text-white"
                                                        : "bg-gray-100 border-gray-200 text-gray-900"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {selectedGuild ? (
                                                        <>
                                                            {selectedGuild.icon ? (
                                                                <img
                                                                    src={selectedGuild.icon}
                                                                    alt=""
                                                                    className="w-6 h-6 rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                                    {selectedGuild.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <span>{selectedGuild.name}</span>
                                                            <span className="text-xs text-green-400">
                                                                ({selectedGuild.sendable_channels} sendable)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                                            {loadingGuilds ? "Loading servers..." : "Select a server"}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronDown className={cn(
                                                    "w-5 h-5 transition-transform",
                                                    showGuildDropdown && "rotate-180"
                                                )} />
                                            </button>

                                            {showGuildDropdown && (
                                                <div className={cn(
                                                    "absolute z-50 w-full mt-2 rounded-xl border shadow-lg max-h-60 overflow-y-auto",
                                                    isDark
                                                        ? "bg-zinc-800 border-zinc-700"
                                                        : "bg-white border-gray-200"
                                                )}>
                                                    {guilds.map(guild => (
                                                        <button
                                                            key={guild.id}
                                                            onClick={() => {
                                                                setSelectedGuild(guild);
                                                                setSelectedChannels([]);
                                                                setShowGuildDropdown(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-3 flex items-center gap-3 transition-colors",
                                                                isDark
                                                                    ? "hover:bg-zinc-700"
                                                                    : "hover:bg-gray-100",
                                                                selectedGuild?.id === guild.id && (isDark ? "bg-zinc-700" : "bg-gray-100")
                                                            )}
                                                        >
                                                            {guild.icon ? (
                                                                <img
                                                                    src={guild.icon}
                                                                    alt=""
                                                                    className="w-8 h-8 rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                                                    {guild.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="text-left flex-1">
                                                                <p className={cn(
                                                                    "font-medium",
                                                                    isDark ? "text-white" : "text-gray-900"
                                                                )}>
                                                                    {guild.name}
                                                                </p>
                                                                <p className="text-xs text-green-400">
                                                                    {guild.sendable_channels || 0} sendable channels
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Channel Selection */}
                                    {selectedGuild && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={cn(
                                                    "text-sm font-medium",
                                                    isDark ? "text-white/70" : "text-gray-700"
                                                )}>
                                                    Select Channels ({selectedChannels.length} selected)
                                                </label>
                                                <button
                                                    onClick={selectAllSendableChannels}
                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                >
                                                    Select All Sendable
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                                                    className={cn(
                                                        "w-full px-4 py-3 rounded-xl flex items-center justify-between border",
                                                        isDark
                                                            ? "bg-zinc-800 border-zinc-700 text-white"
                                                            : "bg-gray-100 border-gray-200 text-gray-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {selectedChannels.length > 0 ? (
                                                            selectedChannels.slice(0, 3).map(ch => (
                                                                <span key={ch.id} className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                                                                    <Hash className="w-3 h-3" />
                                                                    {ch.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                                                Click to select channels
                                                            </span>
                                                        )}
                                                        {selectedChannels.length > 3 && (
                                                            <span className="text-xs text-zinc-400">
                                                                +{selectedChannels.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ChevronDown className={cn(
                                                        "w-5 h-5 transition-transform",
                                                        showChannelDropdown && "rotate-180"
                                                    )} />
                                                </button>

                                                {showChannelDropdown && (
                                                    <div className={cn(
                                                        "absolute z-50 w-full mt-2 rounded-xl border shadow-lg max-h-72 overflow-y-auto",
                                                        isDark
                                                            ? "bg-zinc-800 border-zinc-700"
                                                            : "bg-white border-gray-200"
                                                    )}>
                                                        {selectedGuild.channels.map(channel => {
                                                            const ChannelIcon = getChannelIcon(channel.type);
                                                            const isSelected = selectedChannels.find(c => c.id === channel.id);

                                                            return (
                                                                <button
                                                                    key={channel.id}
                                                                    onClick={() => channel.can_send && toggleChannelSelection(channel)}
                                                                    disabled={!channel.can_send}
                                                                    className={cn(
                                                                        "w-full px-4 py-2.5 flex items-center gap-3 transition-colors",
                                                                        channel.can_send
                                                                            ? isDark ? "hover:bg-zinc-700" : "hover:bg-gray-100"
                                                                            : "opacity-50 cursor-not-allowed",
                                                                        isSelected && "bg-purple-500/10"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                                        isSelected
                                                                            ? "bg-purple-500 border-purple-500"
                                                                            : isDark ? "border-zinc-600" : "border-gray-300"
                                                                    )}>
                                                                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                                    </div>
                                                                    <ChannelIcon className={cn(
                                                                        "w-4 h-4",
                                                                        channel.type === "voice" ? "text-green-400" :
                                                                            channel.type === "stage" ? "text-purple-400" :
                                                                                "text-zinc-500"
                                                                    )} />
                                                                    <span className={cn(
                                                                        "flex-1 text-left",
                                                                        isDark ? "text-white" : "text-gray-900"
                                                                    )}>
                                                                        {channel.name}
                                                                    </span>
                                                                    {channel.category && (
                                                                        <span className="text-xs text-zinc-500">
                                                                            {channel.category}
                                                                        </span>
                                                                    )}
                                                                    {channel.can_send ? (
                                                                        <span className="text-xs text-green-400">✓ Can Send</span>
                                                                    ) : (
                                                                        <span className="text-xs text-red-400">✗ No Permission</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* User Selection */}
                        <AnimatePresence>
                            {targetType === "users" && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mb-4 overflow-visible"
                                >
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Select Users ({selectedUsers.length} selected)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            onFocus={() => setShowUserDropdown(true)}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl border",
                                                isDark
                                                    ? "bg-zinc-800 border-zinc-700 text-white"
                                                    : "bg-gray-100 border-gray-200 text-gray-900"
                                            )}
                                        />

                                        {showUserDropdown && (
                                            <div className={cn(
                                                "absolute z-50 w-full mt-2 rounded-xl border shadow-lg max-h-60 overflow-y-auto",
                                                isDark
                                                    ? "bg-zinc-800 border-zinc-700"
                                                    : "bg-white border-gray-200"
                                            )}>
                                                {filteredUsers.slice(0, 50).map(user => {
                                                    const isSelected = selectedUsers.find(u => u.id === user.id);
                                                    return (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => toggleUserSelection(user)}
                                                            className={cn(
                                                                "w-full px-4 py-2.5 flex items-center gap-3 transition-colors",
                                                                isDark ? "hover:bg-zinc-700" : "hover:bg-gray-100",
                                                                isSelected && "bg-cyan-500/10"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                                isSelected
                                                                    ? "bg-cyan-500 border-cyan-500"
                                                                    : isDark ? "border-zinc-600" : "border-gray-300"
                                                            )}>
                                                                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                                                {user.username.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <p className={cn(
                                                                    "font-medium",
                                                                    isDark ? "text-white" : "text-gray-900"
                                                                )}>
                                                                    {user.username}
                                                                </p>
                                                                {user.serverName && (
                                                                    <p className="text-xs text-zinc-500">
                                                                        {user.serverName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {filteredUsers.length === 0 && (
                                                    <p className="px-4 py-3 text-sm text-zinc-500">
                                                        No users found
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected users chips */}
                                    {selectedUsers.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {selectedUsers.map(user => (
                                                <span
                                                    key={user.id}
                                                    className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs flex items-center gap-1"
                                                >
                                                    <User className="w-3 h-3" />
                                                    {user.username}
                                                    <button
                                                        onClick={() => toggleUserSelection(user)}
                                                        className="ml-1 hover:text-cyan-200"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mention Options (only for servers/channels) */}
                        {targetType !== "users" && (
                            <div className="mb-4">
                                <label className={cn(
                                    "block text-sm font-medium mb-2",
                                    isDark ? "text-white/70" : "text-gray-700"
                                )}>
                                    Mention
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { value: "none", label: "None" },
                                        { value: "everyone", label: "@everyone" },
                                        { value: "here", label: "@here" },
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setMentionType(option.value as typeof mentionType)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                                mentionType === option.value
                                                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                    : isDark
                                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            <AtSign className="w-3 h-3" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div className="mb-4">
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Announcement title..."
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500"
                                        : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                )}
                            />
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your announcement here..."
                                rows={5}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500"
                                        : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                )}
                            />
                        </div>

                        {/* Image URL */}
                        <div className="mb-6">
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Image URL (Optional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    placeholder="https://example.com/image.png"
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-xl outline-none transition-colors",
                                        isDark
                                            ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500"
                                            : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                    )}
                                />
                                {image && (
                                    <button
                                        onClick={() => setImage("")}
                                        className={cn(
                                            "p-3 rounded-xl",
                                            isDark
                                                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        )}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || sending || result?.success ||
                                (targetType === "users" && selectedUsers.length === 0) ||
                                (targetType === "specific_channel" && !selectedGuild)}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                result?.success
                                    ? "bg-green-500 text-white"
                                    : result?.success === false
                                        ? "bg-rose-500 text-white"
                                        : "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                            )}
                        >
                            {sending ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : result?.success ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Sent to {result.serversReached} {targetType === "users" ? "users" : "channels"}!
                                </>
                            ) : result?.success === false ? (
                                <>
                                    <XCircle className="w-5 h-5" />
                                    Failed to send
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send {targetType === "users" ? "DM" : "Broadcast"}
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>

                {/* Preview & History */}
                <div className="space-y-6">
                    {/* Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={cn(
                            "p-6 rounded-2xl border",
                            isDark
                                ? "bg-zinc-900/50 border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        <h3 className={cn(
                            "text-sm font-semibold mb-3",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Preview
                        </h3>
                        <div className={cn(
                            "p-4 rounded-xl border-l-4 border-[#7B1E3C]",
                            isDark ? "bg-zinc-800" : "bg-gray-50"
                        )}>
                            {mentionType !== "none" && targetType !== "users" && (
                                <p className="text-blue-400 font-medium mb-1">
                                    @{mentionType}
                                </p>
                            )}
                            {title && (
                                <h4 className={cn(
                                    "font-bold mb-2",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    {title}
                                </h4>
                            )}
                            <p className={cn(
                                "text-sm whitespace-pre-wrap",
                                isDark ? "text-white/80" : "text-gray-700"
                            )}>
                                {message || "Your message will appear here..."}
                            </p>
                            {image && (
                                <div className="mt-3 relative">
                                    <ImageIcon className={cn(
                                        "w-8 h-8",
                                        isDark ? "text-zinc-600" : "text-gray-400"
                                    )} />
                                    <span className={cn(
                                        "text-xs",
                                        isDark ? "text-white/40" : "text-gray-500"
                                    )}>
                                        Image attached
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={cn(
                            "mt-3 text-xs",
                            isDark ? "text-white/40" : "text-gray-500"
                        )}>
                            {targetType === "all_servers" && (
                                <>Sending to: All servers ({sendableServersCount} servers, 1 channel each)</>
                            )}
                            {targetType === "specific_channel" && selectedGuild && (
                                <>
                                    Sending to: {selectedGuild.name}
                                    {selectedChannels.length > 0 && ` > ${selectedChannels.length} channel(s)`}
                                </>
                            )}
                            {targetType === "users" && (
                                <>DM to: {selectedUsers.length} user(s)</>
                            )}
                        </div>
                    </motion.div>

                    {/* History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                            "p-6 rounded-2xl border",
                            isDark
                                ? "bg-zinc-900/50 border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        <h3 className={cn(
                            "text-sm font-semibold mb-3",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Recent Broadcasts
                        </h3>
                        {history.length > 0 ? (
                            <div className="space-y-2">
                                {history.map((item, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "p-3 rounded-lg flex items-center justify-between",
                                            isDark ? "bg-zinc-800" : "bg-gray-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.success ? (
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-rose-400" />
                                            )}
                                            <span className={cn(
                                                "text-sm",
                                                isDark ? "text-white/70" : "text-gray-600"
                                            )}>
                                                {item.serversReached} sent
                                            </span>
                                        </div>
                                        <span className={cn(
                                            "text-xs",
                                            isDark ? "text-white/40" : "text-gray-500"
                                        )}>
                                            {item.timestamp}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={cn(
                                "text-sm text-center py-4",
                                isDark ? "text-white/40" : "text-gray-500"
                            )}>
                                No broadcasts yet
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Click outside to close dropdowns */}
            {(showGuildDropdown || showChannelDropdown || showUserDropdown) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowGuildDropdown(false);
                        setShowChannelDropdown(false);
                        setShowUserDropdown(false);
                    }}
                />
            )}
        </div>
    );
}
