"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Ban,
    User,
    Server,
    Search,
    Filter,
    UserX,
    UserCheck,
    Clock,
    History,
    Plus,
    X,
    RefreshCw,
    ExternalLink,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface BanRecord {
    id: string;
    type: "user" | "server";
    targetId: string;
    targetName: string;
    reason: string;
    bannedAt: string;
    expiresAt?: string;
    bannedBy: string;
    isActive: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

export default function BansPage() {
    const { isDark } = useSettings();
    const [bans, setBans] = useState<BanRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "user" | "server" | "active" | "expired">("all");
    const [search, setSearch] = useState("");
    const [showAddBan, setShowAddBan] = useState(false);
    const [newBan, setNewBan] = useState({
        type: "user" as "user" | "server",
        targetId: "",
        targetName: "",
        reason: "",
        duration: "permanent" as string,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch bans on mount
    useEffect(() => {
        fetchBans();
    }, []);

    const fetchBans = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/bans`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setBans(data);
            } else {
                setBans([]);
            }
        } catch {
            setBans([]);
        }
        setLoading(false);
    };

    const filteredBans = bans.filter(ban => {
        const matchesSearch =
            ban.targetName.toLowerCase().includes(search.toLowerCase()) ||
            ban.targetId.includes(search) ||
            ban.reason.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
            filter === "all" ||
            filter === ban.type ||
            (filter === "active" && ban.isActive) ||
            (filter === "expired" && !ban.isActive);

        return matchesSearch && matchesFilter;
    });

    const handleAddBan = async () => {
        if (!newBan.targetId || !newBan.reason) return;

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/api/admin/bans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: newBan.type,
                    targetId: newBan.targetId,
                    targetName: newBan.targetName || newBan.targetId,
                    reason: newBan.reason,
                    duration: newBan.duration,
                }),
            });

            if (response.ok) {
                fetchBans();
                setShowAddBan(false);
                setNewBan({ type: "user", targetId: "", targetName: "", reason: "", duration: "permanent" });
            }
        } catch (error) {
            console.error('Add ban failed:', error);
        }

        setIsSubmitting(false);
    };

    const handleUnban = async (id: string) => {
        try {
            await fetch(`${API_BASE}/api/admin/bans/${id}`, {
                method: 'DELETE',
            });
            fetchBans();
        } catch (error) {
            console.error('Unban failed:', error);
            setBans(prev => prev.map(ban =>
                ban.id === id ? { ...ban, isActive: false } : ban
            ));
        }
    };

    const handleReban = async (id: string) => {
        // For reban, we need to re-create the ban
        const ban = bans.find(b => b.id === id);
        if (!ban) return;

        try {
            await fetch(`${API_BASE}/api/admin/bans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: ban.type,
                    targetId: ban.targetId,
                    targetName: ban.targetName,
                    reason: ban.reason,
                }),
            });
            fetchBans();
        } catch (error) {
            console.error('Reban failed:', error);
            setBans(prev => prev.map(b =>
                b.id === id ? { ...b, isActive: true, bannedAt: new Date().toISOString() } : b
            ));
        }
    };

    const activeBans = bans.filter(b => b.isActive);
    const userBans = bans.filter(b => b.type === "user" && b.isActive);
    const serverBans = bans.filter(b => b.type === "server" && b.isActive);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-rose-500/20" : "bg-rose-500/10"
                    )}>
                        <Ban className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Ban Management
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            {activeBans.length} active bans ({userBans.length} users, {serverBans.length} servers)
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddBan(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Ban
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-4 rounded-xl border text-center",
                        isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                    )}
                >
                    <p className="text-3xl font-bold text-rose-400">{activeBans.length}</p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>Active Bans</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "p-4 rounded-xl border text-center",
                        isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                    )}
                >
                    <p className="text-3xl font-bold text-orange-400">{userBans.length}</p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>Banned Users</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                        "p-4 rounded-xl border text-center",
                        isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                    )}
                >
                    <p className="text-3xl font-bold text-purple-400">{serverBans.length}</p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>Banned Servers</p>
                </motion.div>
            </div>

            {/* Filters */}
            <div className={cn(
                "flex flex-col md:flex-row gap-4 p-4 rounded-xl border",
                isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
            )}>
                <div className="relative flex-1">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                        isDark ? "text-zinc-500" : "text-gray-400"
                    )} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or reason..."
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
                <div className="flex gap-2 flex-wrap">
                    {[
                        { value: "all", label: "All" },
                        { value: "user", label: "Users", icon: User },
                        { value: "server", label: "Servers", icon: Server },
                        { value: "active", label: "Active" },
                        { value: "expired", label: "Expired" },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setFilter(option.value as typeof filter)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
                                filter === option.value
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
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

            {/* Ban List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                )}
            >
                {filteredBans.length === 0 ? (
                    <div className={cn(
                        "p-8 text-center",
                        isDark ? "text-white/50" : "text-gray-500"
                    )}>
                        <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No bans found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredBans.map((ban, index) => (
                            <motion.div
                                key={ban.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4 flex flex-col md:flex-row md:items-center gap-4",
                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                )}
                            >
                                {/* Target Info */}
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        ban.type === "user"
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "bg-purple-500/20 text-purple-400"
                                    )}>
                                        {ban.type === "user" ? (
                                            <User className="w-5 h-5" />
                                        ) : (
                                            <Server className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className={cn(
                                            "font-medium",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {ban.targetName}
                                        </p>
                                        <p className={cn(
                                            "text-xs font-mono",
                                            isDark ? "text-white/30" : "text-gray-500"
                                        )}>
                                            ID: {ban.targetId}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="flex-1">
                                    <p className={cn(
                                        "text-sm",
                                        isDark ? "text-white/70" : "text-gray-600"
                                    )}>
                                        {ban.reason}
                                    </p>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        ban.isActive
                                            ? "bg-rose-500/20 text-rose-400"
                                            : "bg-zinc-500/20 text-zinc-400"
                                    )}>
                                        {ban.isActive ? "Banned" : "Expired"}
                                    </span>
                                    <button
                                        onClick={() => ban.isActive ? handleUnban(ban.id) : handleReban(ban.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                            ban.isActive
                                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                        )}
                                    >
                                        {ban.isActive ? "Unban" : "Reban"}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Add Ban Modal */}
            <AnimatePresence>
                {showAddBan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddBan(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-lg p-6 rounded-2xl",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={cn(
                                    "text-lg font-bold flex items-center gap-2",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    <Ban className="w-5 h-5 text-rose-400" />
                                    Add New Ban
                                </h3>
                                <button
                                    onClick={() => setShowAddBan(false)}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Ban Type */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Ban Type
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setNewBan(prev => ({ ...prev, type: "user" }))}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                                newBan.type === "user"
                                                    ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                                                    : isDark
                                                        ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                                        : "bg-gray-100 border-gray-200 text-gray-600"
                                            )}
                                        >
                                            <User className="w-4 h-4" />
                                            User
                                        </button>
                                        <button
                                            onClick={() => setNewBan(prev => ({ ...prev, type: "server" }))}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                                newBan.type === "server"
                                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                                    : isDark
                                                        ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                                        : "bg-gray-100 border-gray-200 text-gray-600"
                                            )}
                                        >
                                            <Server className="w-4 h-4" />
                                            Server
                                        </button>
                                    </div>
                                </div>

                                {/* Target ID */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        {newBan.type === "user" ? "User ID" : "Server ID"} *
                                    </label>
                                    <input
                                        type="text"
                                        value={newBan.targetId}
                                        onChange={(e) => setNewBan(prev => ({ ...prev, targetId: e.target.value }))}
                                        placeholder="123456789012345678"
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors font-mono",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Target Name */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        {newBan.type === "user" ? "Username" : "Server Name"} (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newBan.targetName}
                                        onChange={(e) => setNewBan(prev => ({ ...prev, targetName: e.target.value }))}
                                        placeholder={newBan.type === "user" ? "User#1234" : "Server Name"}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Reason *
                                    </label>
                                    <textarea
                                        value={newBan.reason}
                                        onChange={(e) => setNewBan(prev => ({ ...prev, reason: e.target.value }))}
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

                                {/* Duration */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Duration
                                    </label>
                                    <select
                                        value={newBan.duration}
                                        onChange={(e) => setNewBan(prev => ({ ...prev, duration: e.target.value }))}
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

                            {/* Support Link Note */}
                            <p className={cn(
                                "text-xs mt-4",
                                isDark ? "text-white/40" : "text-gray-500"
                            )}>
                                Banned users/servers will receive a message with the reason and link to support: https://s.id/SONORAbotSUPPORT
                            </p>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddBan(false)}
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
                                    onClick={handleAddBan}
                                    disabled={!newBan.targetId || !newBan.reason || isSubmitting}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2",
                                        newBan.targetId && newBan.reason
                                            ? "bg-rose-500 text-white hover:bg-rose-600"
                                            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Ban className="w-5 h-5" />
                                    )}
                                    Apply Ban
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
