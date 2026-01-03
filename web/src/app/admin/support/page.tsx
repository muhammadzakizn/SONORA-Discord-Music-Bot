"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Headphones,
    Search,
    Clock,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    User,
    ChevronRight,
    RefreshCw,
    Send,
    X,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useSession } from "@/contexts/SessionContext";

// API URL
const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:5000";

// Types matching the real API
interface Message {
    id: string;
    ticket_id: string;
    sender_type: "user" | "developer";
    sender_id: string;
    content: string;
    created_at: string;
}

interface SupportTicket {
    id: string;
    user_id: string;
    user_name: string;
    ticket_type: "feedback" | "issue" | "live";
    status: "pending" | "in_progress" | "waiting_user" | "resolved" | "closed";
    subject: string;
    description: string;
    priority: "low" | "normal" | "high" | "urgent";
    assigned_to: string | null;
    messages: Message[];
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Menunggu" },
    in_progress: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Ditangani" },
    waiting_user: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Menunggu User" },
    resolved: { bg: "bg-green-500/20", text: "text-green-400", label: "Selesai" },
    closed: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Ditutup" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400" },
    normal: { bg: "bg-blue-500/20", text: "text-blue-400" },
    high: { bg: "bg-orange-500/20", text: "text-orange-400" },
    urgent: { bg: "bg-rose-500/20", text: "text-rose-400" },
};

const TYPE_LABELS: Record<string, string> = {
    feedback: "💡 Feedback",
    issue: "🐛 Bug Report",
    live: "💬 Live Support",
};

export default function SupportPage() {
    const { isDark } = useSettings();
    const { user, isDeveloper } = useSession();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Ticket ID search
    const [ticketIdSearch, setTicketIdSearch] = useState("");
    const [searchingTicket, setSearchingTicket] = useState(false);

    // Search ticket by ID
    const searchTicketById = async () => {
        if (!ticketIdSearch.trim()) return;

        setSearchingTicket(true);
        try {
            const ticketId = ticketIdSearch.trim().toUpperCase();
            const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}`);
            const data = await res.json();

            if (data.success && data.ticket) {
                setSelectedTicket(data.ticket);
                setError(null);
            } else {
                setError(`Tiket "${ticketId}" tidak ditemukan`);
            }
        } catch (err) {
            setError("Gagal mencari tiket. Pastikan API terhubung.");
        } finally {
            setSearchingTicket(false);
        }
    };

    // Fetch tickets from real API
    const fetchTickets = useCallback(async () => {
        try {
            const url = filter === "all"
                ? `${API_BASE}/api/support/tickets`
                : `${API_BASE}/api/support/tickets?status=${filter}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setTickets(data.tickets || []);
                setError(null);
            } else {
                setError(data.error || "Failed to fetch tickets");
            }
        } catch (err) {
            setError("Unable to connect to support API");
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    // Initial fetch and refresh
    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(fetchTickets, 15000);
        return () => clearInterval(interval);
    }, [fetchTickets]);

    // Update status
    const updateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                fetchTickets();
                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket(prev => prev ? { ...prev, status: newStatus as SupportTicket["status"] } : null);
                }
            }
        } catch (err) {
            console.error("Update status error:", err);
        }
    };

    // Send reply
    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;

        setIsSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${selectedTicket.id}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: replyText,
                    sender_id: user?.id || "admin"
                }),
            });
            const data = await res.json();

            if (data.success) {
                setReplyText("");
                // Refresh ticket to get new message
                const ticketRes = await fetch(`${API_BASE}/api/support/tickets/${selectedTicket.id}`);
                const ticketData = await ticketRes.json();
                if (ticketData.success) {
                    setSelectedTicket(ticketData.ticket);
                }
                fetchTickets();
            }
        } catch (err) {
            console.error("Send reply error:", err);
        } finally {
            setIsSending(false);
        }
    };

    // Filter tickets
    const filteredTickets = tickets.filter(ticket => {
        if (search) {
            return (
                ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
                ticket.id.toLowerCase().includes(search.toLowerCase()) ||
                ticket.user_name.toLowerCase().includes(search.toLowerCase())
            );
        }
        return true;
    });

    // Stats
    const stats = {
        pending: tickets.filter(t => t.status === "pending").length,
        inProgress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
        total: tickets.length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-[#7B1E3C]/20" : "bg-[#7B1E3C]/10"
                    )}>
                        <Headphones className="w-6 h-6 text-[#7B1E3C]" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Support Dashboard
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Manage support tickets and user inquiries
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchTickets}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                        isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/20 text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Search Ticket by ID */}
            <div className={cn(
                "p-4 rounded-xl border",
                isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
            )}>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className={cn(
                            "block text-sm font-medium mb-2",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Cari Tiket Berdasarkan ID
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Contoh: SNRA-AB12-CD34"
                                value={ticketIdSearch}
                                onChange={(e) => setTicketIdSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && searchTicketById()}
                                className={cn(
                                    "flex-1 px-4 py-2 rounded-lg outline-none text-sm uppercase",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500"
                                        : "bg-gray-100 border border-gray-200 text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                            <button
                                onClick={searchTicketById}
                                disabled={!ticketIdSearch.trim() || searchingTicket}
                                className="px-4 py-2 rounded-lg bg-[#7B1E3C] text-white font-medium hover:bg-[#9B2E4C] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {searchingTicket ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Cari
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Menunggu", value: stats.pending, color: "amber" },
                    { label: "Ditangani", value: stats.inProgress, color: "blue" },
                    { label: "Selesai", value: stats.resolved, color: "green" },
                    { label: "Total", value: stats.total, color: "purple" },
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            "p-4 rounded-xl border text-center",
                            isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                        )}
                    >
                        <p className={cn(
                            "text-2xl font-bold",
                            stat.color === "amber" && "text-amber-400",
                            stat.color === "blue" && "text-blue-400",
                            stat.color === "green" && "text-green-400",
                            stat.color === "purple" && "text-[#7B1E3C]"
                        )}>
                            {stat.value}
                        </p>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>{stat.label}</p>
                    </motion.div>
                ))}
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
                        placeholder="Search tickets..."
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
                    {["all", "pending", "in_progress", "resolved", "closed"].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                filter === status
                                    ? "bg-[#7B1E3C] text-white"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {status === "all" ? "Semua" : STATUS_COLORS[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ticket List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                )}
            >
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#7B1E3C]" />
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>Loading tickets...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className={cn(
                        "p-8 text-center",
                        isDark ? "text-white/50" : "text-gray-500"
                    )}>
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Tidak ada tiket</p>
                        <p className="text-sm mt-1">Tiket baru akan muncul di sini</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredTickets.map((ticket, index) => (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedTicket(ticket)}
                                className={cn(
                                    "p-4 cursor-pointer transition-colors",
                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={cn(
                                                "text-xs font-mono px-2 py-0.5 rounded",
                                                isDark ? "bg-white/10" : "bg-gray-100"
                                            )}>
                                                {ticket.id}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                STATUS_COLORS[ticket.status]?.bg,
                                                STATUS_COLORS[ticket.status]?.text
                                            )}>
                                                {STATUS_COLORS[ticket.status]?.label}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                PRIORITY_COLORS[ticket.priority]?.bg,
                                                PRIORITY_COLORS[ticket.priority]?.text
                                            )}>
                                                {ticket.priority}
                                            </span>
                                        </div>
                                        <h3 className={cn(
                                            "font-medium mb-1 truncate",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {ticket.subject}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className={isDark ? "text-white/40" : "text-gray-500"}>
                                                {ticket.user_name}
                                            </span>
                                            <span className={isDark ? "text-white/40" : "text-gray-500"}>
                                                {new Date(ticket.created_at).toLocaleDateString("id-ID")}
                                            </span>
                                            <span className={isDark ? "text-white/40" : "text-gray-500"}>
                                                {ticket.messages?.length || 0} messages
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-5 h-5 shrink-0",
                                        isDark ? "text-white/30" : "text-gray-400"
                                    )} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Ticket Detail Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={cn(
                                "p-4 border-b flex items-start justify-between shrink-0",
                                isDark ? "border-white/10" : "border-gray-200"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-xs font-mono px-2 py-0.5 rounded",
                                            isDark ? "bg-white/10" : "bg-gray-100"
                                        )}>
                                            {selectedTicket.id}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            STATUS_COLORS[selectedTicket.status]?.bg,
                                            STATUS_COLORS[selectedTicket.status]?.text
                                        )}>
                                            {STATUS_COLORS[selectedTicket.status]?.label}
                                        </span>
                                        <span className="text-xs">
                                            {TYPE_LABELS[selectedTicket.ticket_type] || selectedTicket.ticket_type}
                                        </span>
                                    </div>
                                    <h2 className={cn(
                                        "text-lg font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {selectedTicket.subject}
                                    </h2>
                                    <p className={cn(
                                        "text-sm mt-1",
                                        isDark ? "text-white/50" : "text-gray-500"
                                    )}>
                                        From: {selectedTicket.user_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Description */}
                            <div className={cn(
                                "p-4 border-b shrink-0",
                                isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                            )}>
                                <p className={cn(
                                    "text-sm whitespace-pre-wrap",
                                    isDark ? "text-white/70" : "text-gray-600"
                                )}>
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {(selectedTicket.messages || []).map(msg => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            msg.sender_type === "developer" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "max-w-[80%] p-3 rounded-xl",
                                            msg.sender_type === "developer"
                                                ? "bg-[#7B1E3C] text-white"
                                                : isDark
                                                    ? "bg-white/10 text-white"
                                                    : "bg-gray-100 text-gray-900"
                                        )}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={cn(
                                                "text-xs mt-1",
                                                msg.sender_type === "developer"
                                                    ? "text-white/50"
                                                    : isDark
                                                        ? "text-white/30"
                                                        : "text-gray-500"
                                            )}>
                                                {new Date(msg.created_at).toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className={cn(
                                "p-4 border-t shrink-0",
                                isDark ? "border-white/10" : "border-gray-200"
                            )}>
                                {/* Status Change */}
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {(["pending", "in_progress", "resolved", "closed"] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => updateStatus(selectedTicket.id, status)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                selectedTicket.status === status
                                                    ? `${STATUS_COLORS[status]?.bg} ${STATUS_COLORS[status]?.text}`
                                                    : isDark
                                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {STATUS_COLORS[status]?.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Reply */}
                                {selectedTicket.status !== "closed" && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Ketik balasan..."
                                            onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                                            className={cn(
                                                "flex-1 px-4 py-2 rounded-xl outline-none transition-colors",
                                                isDark
                                                    ? "bg-zinc-800 border border-zinc-700 text-white"
                                                    : "bg-gray-100 border border-gray-200 text-gray-900"
                                            )}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || isSending}
                                            className="px-4 py-2 rounded-xl bg-[#7B1E3C] text-white font-medium hover:bg-[#9B2E4C] transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSending ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Kirim
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
