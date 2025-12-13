"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Users,
    Server,
    Search,
    Filter,
    Ban,
    Shield,
    CheckCircle,
    XCircle,
    MoreVertical,
    RefreshCw,
    UserX,
    UserCheck,
    Clock,
    ExternalLink,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    isBanned: boolean;
    banReason?: string;
    banExpiry?: string;
    totalPlays: number;
    lastActive: string;
}

interface BannedServer {
    id: string;
    name: string;
    icon: string | null;
    reason: string;
    bannedAt: string;
    bannedBy: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

export default function UsersPage() {
    const { isDark } = useSettings();

    // Main tab state
    const [mainTab, setMainTab] = useState<"users" | "servers">("users");

    // Users state
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "banned">("all");

    // Servers (banned) state
    const [bannedServers, setBannedServers] = useState<BannedServer[]>([]);
    const [loadingServers, setLoadingServers] = useState(false);
    const [serverSearch, setServerSearch] = useState("");

    useEffect(() => {
        if (mainTab === "users") {
            fetchUsers();
        } else {
            fetchBannedServers();
        }
    }, [mainTab]);

    const fetchBannedServers = async () => {
        setLoadingServers(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/bans`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                // Filter only server bans
                const servers = data.filter((ban: { targetType?: string; target_type?: string }) =>
                    ban.targetType === 'server' || ban.target_type === 'server'
                ).map((ban: { targetId?: string; target_id?: string; targetName?: string; target_name?: string; reason?: string; bannedAt?: string; banned_at?: string; bannedBy?: string; banned_by?: string }) => ({
                    id: ban.targetId || ban.target_id,
                    name: ban.targetName || ban.target_name || 'Unknown Server',
                    icon: null,
                    reason: ban.reason || 'No reason provided',
                    bannedAt: ban.bannedAt || ban.banned_at || 'Unknown',
                    bannedBy: ban.bannedBy || ban.banned_by || 'Admin',
                }));
                setBannedServers(servers);
            } else {
                setBannedServers([]);
            }
        } catch {
            setBannedServers([]);
        }
        setLoadingServers(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/users`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                // Fallback to mock data if API fails
                setUsers([
                    { id: "1", username: "MusicLover", discriminator: "1234", avatar: null, isBanned: false, totalPlays: 150, lastActive: "2 hours ago" },
                    { id: "2", username: "DJMaster", discriminator: "5678", avatar: null, isBanned: false, totalPlays: 320, lastActive: "5 min ago" },
                ]);
            }
        } catch {
            setUsers([]);
        }
        setLoading(false);
    };

    const toggleBan = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        try {
            if (user.isBanned) {
                await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
                    method: 'DELETE',
                });
            } else {
                await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'Manual ban' }),
                });
            }
            // Refresh users list
            fetchUsers();
        } catch (error) {
            console.error('Ban toggle failed:', error);
            // Fallback to local state update
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, isBanned: !u.isBanned, banReason: u.isBanned ? undefined : "Manual ban" }
                    : u
            ));
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" ||
            (filter === "active" && !user.isBanned) ||
            (filter === "banned" && user.isBanned);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-cyan-500/20" : "bg-cyan-500/10"
                    )}>
                        <Users className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Users & Servers
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            {mainTab === "users"
                                ? `${users.filter(u => u.isBanned).length} banned • ${users.filter(u => !u.isBanned).length} active users`
                                : `${bannedServers.length} banned servers`
                            }
                        </p>
                    </div>
                </div>
                <button
                    onClick={mainTab === "users" ? fetchUsers : fetchBannedServers}
                    disabled={mainTab === "users" ? loading : loadingServers}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                        isDark
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", (loading || loadingServers) && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Main Tabs */}
            <div className={cn(
                "flex gap-2 p-1 rounded-xl",
                isDark ? "bg-zinc-900/50" : "bg-gray-100"
            )}>
                <button
                    onClick={() => setMainTab("users")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        mainTab === "users"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : isDark
                                ? "text-zinc-400 hover:bg-zinc-800"
                                : "text-gray-600 hover:bg-white"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Users
                </button>
                <button
                    onClick={() => setMainTab("servers")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        mainTab === "servers"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : isDark
                                ? "text-zinc-400 hover:bg-zinc-800"
                                : "text-gray-600 hover:bg-white"
                    )}
                >
                    <Server className="w-4 h-4" />
                    Banned Servers
                    {bannedServers.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500/30 text-red-400">
                            {bannedServers.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Users Tab Content */}
            {mainTab === "users" && (
                <>

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
                                placeholder="Search users..."
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
                                { value: "all", label: "All", icon: Users },
                                { value: "active", label: "Active", icon: UserCheck },
                                { value: "banned", label: "Banned", icon: UserX },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setFilter(option.value as typeof filter)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                        filter === option.value
                                            ? option.value === "banned"
                                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                            : isDark
                                                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Users Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "rounded-2xl border overflow-hidden",
                            isDark
                                ? "bg-zinc-900/50 border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Header */}
                        <div className={cn(
                            "grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b",
                            isDark
                                ? "bg-zinc-800/50 border-white/10 text-white/50"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                        )}>
                            <div className="col-span-4">User</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Total Plays</div>
                            <div className="col-span-2">Last Active</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Body */}
                        {loading ? (
                            <div className="p-8 text-center">
                                <RefreshCw className={cn(
                                    "w-8 h-8 mx-auto mb-2 animate-spin",
                                    isDark ? "text-zinc-600" : "text-gray-400"
                                )} />
                                <p className={isDark ? "text-white/50" : "text-gray-500"}>
                                    Loading users...
                                </p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className={cn(
                                "p-8 text-center",
                                isDark ? "text-white/50" : "text-gray-500"
                            )}>
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No users found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {filteredUsers.map((user, index) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={cn(
                                            "grid grid-cols-12 gap-4 px-6 py-4 items-center",
                                            isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                        )}
                                    >
                                        {/* User */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                                                user.isBanned
                                                    ? "bg-rose-500/20 text-rose-400"
                                                    : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                                            )}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "font-medium",
                                                    isDark ? "text-white" : "text-gray-900"
                                                )}>
                                                    {user.username}
                                                    <span className={isDark ? "text-white/30" : "text-gray-400"}>
                                                        #{user.discriminator}
                                                    </span>
                                                </p>
                                                <p className={cn(
                                                    "text-xs font-mono",
                                                    isDark ? "text-white/30" : "text-gray-500"
                                                )}>
                                                    ID: {user.id}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2">
                                            {user.isBanned ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 flex items-center gap-1">
                                                        <Ban className="w-3 h-3" />
                                                        Banned
                                                    </span>
                                                    {user.banExpiry && (
                                                        <span className={cn(
                                                            "text-xs flex items-center gap-1",
                                                            isDark ? "text-white/30" : "text-gray-500"
                                                        )}>
                                                            <Clock className="w-3 h-3" />
                                                            {user.banExpiry}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 flex items-center gap-1 w-fit">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Total Plays */}
                                        <div className="col-span-2">
                                            <p className={cn(
                                                "font-mono text-sm",
                                                isDark ? "text-white/70" : "text-gray-700"
                                            )}>
                                                {user.totalPlays}
                                            </p>
                                        </div>

                                        {/* Last Active */}
                                        <div className="col-span-2">
                                            <p className={cn(
                                                "text-sm",
                                                isDark ? "text-white/50" : "text-gray-500"
                                            )}>
                                                {user.lastActive}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 flex justify-end gap-2">
                                            <button
                                                onClick={() => toggleBan(user.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                                    user.isBanned
                                                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                        : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                                )}
                                            >
                                                {user.isBanned ? (
                                                    <>
                                                        <UserCheck className="w-3 h-3" />
                                                        Unban
                                                    </>
                                                ) : (
                                                    <>
                                                        <Ban className="w-3 h-3" />
                                                        Ban
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                className={cn(
                                                    "p-1.5 rounded-lg transition-colors",
                                                    isDark
                                                        ? "hover:bg-white/10 text-white/40"
                                                        : "hover:bg-gray-100 text-gray-400"
                                                )}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            {/* Servers (Banned) Tab Content */}
            {mainTab === "servers" && (
                <>
                    {/* Search */}
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
                                placeholder="Search banned servers..."
                                value={serverSearch}
                                onChange={(e) => setServerSearch(e.target.value)}
                                className={cn(
                                    "w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-colors text-sm",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white"
                                        : "bg-gray-100 border border-gray-200 text-gray-900"
                                )}
                            />
                        </div>
                    </div>

                    {/* Servers List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "rounded-2xl border overflow-hidden",
                            isDark
                                ? "bg-zinc-900/50 border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Header */}
                        <div className={cn(
                            "grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b",
                            isDark
                                ? "bg-zinc-800/50 border-white/10 text-white/50"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                        )}>
                            <div className="col-span-4">Server</div>
                            <div className="col-span-4">Reason</div>
                            <div className="col-span-2">Banned At</div>
                            <div className="col-span-2 text-right">Banned By</div>
                        </div>

                        {/* Body */}
                        {loadingServers ? (
                            <div className="p-8 text-center">
                                <RefreshCw className={cn(
                                    "w-8 h-8 mx-auto mb-2 animate-spin",
                                    isDark ? "text-zinc-600" : "text-gray-400"
                                )} />
                                <p className={isDark ? "text-white/50" : "text-gray-500"}>
                                    Loading banned servers...
                                </p>
                            </div>
                        ) : bannedServers.filter(s => s.name.toLowerCase().includes(serverSearch.toLowerCase())).length === 0 ? (
                            <div className={cn(
                                "p-8 text-center",
                                isDark ? "text-white/50" : "text-gray-500"
                            )}>
                                <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No banned servers</p>
                                <p className="text-sm mt-1">Servers banned via "Leave Server" will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {bannedServers
                                    .filter(s => s.name.toLowerCase().includes(serverSearch.toLowerCase()))
                                    .map((server, index) => (
                                        <motion.div
                                            key={server.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={cn(
                                                "grid grid-cols-12 gap-4 px-6 py-4 items-center",
                                                isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                            )}
                                        >
                                            {/* Server */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-red-500/20 text-red-400">
                                                    {server.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={cn(
                                                        "font-medium flex items-center gap-2",
                                                        isDark ? "text-white" : "text-gray-900"
                                                    )}>
                                                        {server.name}
                                                        <Ban className="w-3 h-3 text-red-400" />
                                                    </p>
                                                    <p className={cn(
                                                        "text-xs font-mono",
                                                        isDark ? "text-white/30" : "text-gray-500"
                                                    )}>
                                                        ID: {server.id}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Reason */}
                                            <div className="col-span-4">
                                                <p className={cn(
                                                    "text-sm line-clamp-2",
                                                    isDark ? "text-white/70" : "text-gray-700"
                                                )}>
                                                    {server.reason}
                                                </p>
                                            </div>

                                            {/* Banned At */}
                                            <div className="col-span-2">
                                                <p className={cn(
                                                    "text-sm",
                                                    isDark ? "text-white/50" : "text-gray-500"
                                                )}>
                                                    {new Date(server.bannedAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {/* Banned By */}
                                            <div className="col-span-2 text-right">
                                                <p className={cn(
                                                    "text-sm",
                                                    isDark ? "text-white/50" : "text-gray-500"
                                                )}>
                                                    {server.bannedBy}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </div>
    );
}
