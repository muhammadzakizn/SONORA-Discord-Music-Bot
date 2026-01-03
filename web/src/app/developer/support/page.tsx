"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Send,
    CheckCircle,
    Clock,
    AlertCircle,
    User,
    RefreshCw,
    Bell,
    BellOff,
    Search,
    Filter,
    ChevronRight,
    X,
    Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

// Ticket types
interface Message {
    id: string;
    ticket_id: string;
    sender_type: "user" | "developer";
    sender_id: string;
    content: string;
    created_at: string;
}

interface Ticket {
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

// Status colors
const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Menunggu" },
    in_progress: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Ditangani" },
    waiting_user: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Menunggu User" },
    resolved: { bg: "bg-green-500/20", text: "text-green-400", label: "Selesai" },
    closed: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Ditutup" },
};

// Type colors
const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
    feedback: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: "💡" },
    issue: { bg: "bg-red-500/20", text: "text-red-400", icon: "🐛" },
    live: { bg: "bg-blue-500/20", text: "text-blue-400", icon: "💬" },
};

// Priority colors
const priorityColors: Record<string, { ring: string; label: string }> = {
    low: { ring: "ring-gray-500", label: "Rendah" },
    normal: { ring: "ring-blue-500", label: "Normal" },
    high: { ring: "ring-orange-500", label: "Tinggi" },
    urgent: { ring: "ring-red-500", label: "Mendesak" },
};

// API URL
const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:5000";

export default function SupportPage() {
    const { isDark } = useSettings();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [stats, setStats] = useState<{ active: number; total: number } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Fetch tickets
    const fetchTickets = useCallback(async () => {
        try {
            const url = filter === "all"
                ? `${API_BASE}/api/support/tickets`
                : `${API_BASE}/api/support/tickets?status=${filter}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                const prevCount = tickets.length;
                setTickets(data.tickets);

                // Play sound if new ticket
                if (data.tickets.length > prevCount && soundEnabled && audioRef.current) {
                    audioRef.current.play().catch(() => { });
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Failed to fetch tickets");
        } finally {
            setLoading(false);
        }
    }, [filter, soundEnabled, tickets.length]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/stats`);
            const data = await res.json();
            if (data.success) {
                setStats({ active: data.stats.active, total: data.stats.total });
            }
        } catch {
            // Ignore stats errors
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchTickets();
        fetchStats();
    }, [fetchTickets, fetchStats]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchTickets();
            fetchStats();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchTickets, fetchStats]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [selectedTicket?.messages]);

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
                    setSelectedTicket({ ...selectedTicket, status: newStatus as Ticket["status"] });
                }
            }
        } catch {
            // Ignore
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!message.trim() || !selectedTicket) return;

        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${selectedTicket.id}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: message, sender_id: "developer" }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage("");
                // Refresh ticket to get new message
                const ticketRes = await fetch(`${API_BASE}/api/support/tickets/${selectedTicket.id}`);
                const ticketData = await ticketRes.json();
                if (ticketData.success) {
                    setSelectedTicket(ticketData.ticket);
                }
            }
        } catch {
            // Ignore
        } finally {
            setSending(false);
        }
    };

    // Filter tickets
    const filteredTickets = tickets.filter((t) => {
        if (search) {
            return (
                t.id.toLowerCase().includes(search.toLowerCase()) ||
                t.user_name.toLowerCase().includes(search.toLowerCase()) ||
                t.subject.toLowerCase().includes(search.toLowerCase())
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Notification sound */}
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={cn(
                        "text-2xl font-bold flex items-center gap-3",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <MessageSquare className="w-7 h-7 text-[#7B1E3C]" />
                        Customer Support
                    </h1>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Kelola tiket support dari pengguna SONORA
                    </p>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "px-4 py-2 rounded-xl flex items-center gap-2",
                            isDark ? "bg-white/5" : "bg-black/5"
                        )}>
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className={isDark ? "text-white/70" : "text-gray-600"}>
                                {stats.active} Aktif
                            </span>
                        </div>
                        <div className={cn(
                            "px-4 py-2 rounded-xl",
                            isDark ? "bg-white/5" : "bg-black/5"
                        )}>
                            <span className={isDark ? "text-white/70" : "text-gray-600"}>
                                {stats.total} Total
                            </span>
                        </div>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={cn(
                                "p-2 rounded-xl transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title={soundEnabled ? "Matikan notifikasi suara" : "Aktifkan notifikasi suara"}
                        >
                            {soundEnabled ? (
                                <Volume2 className="w-5 h-5 text-green-400" />
                            ) : (
                                <BellOff className={cn("w-5 h-5", isDark ? "text-white/30" : "text-gray-400")} />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className={cn(
                "flex flex-wrap items-center gap-3 p-4 rounded-2xl",
                isDark ? "bg-white/5" : "bg-black/5"
            )}>
                {/* Search */}
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]",
                    isDark ? "bg-white/5" : "bg-white"
                )}>
                    <Search className={cn("w-4 h-4", isDark ? "text-white/30" : "text-gray-400")} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari tiket, user, atau subjek..."
                        className={cn(
                            "flex-1 bg-transparent outline-none text-sm",
                            isDark ? "text-white placeholder:text-white/30" : "text-gray-900 placeholder:text-gray-400"
                        )}
                    />
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-2">
                    <Filter className={cn("w-4 h-4", isDark ? "text-white/30" : "text-gray-400")} />
                    {["all", "pending", "in_progress", "resolved"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                filter === status
                                    ? "bg-[#7B1E3C] text-white"
                                    : isDark
                                        ? "bg-white/5 text-white/60 hover:bg-white/10"
                                        : "bg-black/5 text-gray-600 hover:bg-black/10"
                            )}
                        >
                            {status === "all" ? "Semua" : statusColors[status]?.label || status}
                        </button>
                    ))}
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchTickets}
                    className={cn(
                        "p-2 rounded-xl transition-colors",
                        isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", isDark ? "text-white/50" : "text-gray-500")} />
                </button>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ticket list */}
                <div className={cn(
                    "lg:col-span-1 rounded-2xl border overflow-hidden",
                    isDark
                        ? "bg-zinc-900/50 border-white/10"
                        : "bg-white border-black/10"
                )}>
                    <div className={cn(
                        "p-4 border-b",
                        isDark ? "border-white/10" : "border-black/10"
                    )}>
                        <h2 className={cn(
                            "font-semibold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Tiket ({filteredTickets.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7B1E3C]" />
                                <p className={isDark ? "text-white/50" : "text-gray-500"}>Loading...</p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className={cn("w-12 h-12 mx-auto mb-3", isDark ? "text-white/20" : "text-gray-300")} />
                                <p className={isDark ? "text-white/50" : "text-gray-500"}>Tidak ada tiket</p>
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={cn(
                                        "w-full p-4 text-left transition-colors",
                                        selectedTicket?.id === ticket.id
                                            ? "bg-[#7B1E3C]/20"
                                            : isDark
                                                ? "hover:bg-white/5"
                                                : "hover:bg-black/5"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
                                                    typeColors[ticket.ticket_type]?.bg,
                                                    typeColors[ticket.ticket_type]?.text
                                                )}>
                                                    {typeColors[ticket.ticket_type]?.icon} {ticket.ticket_type}
                                                </span>
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
                                                    statusColors[ticket.status]?.bg,
                                                    statusColors[ticket.status]?.text
                                                )}>
                                                    {statusColors[ticket.status]?.label}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "font-medium truncate",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {ticket.subject}
                                            </p>
                                            <p className={cn(
                                                "text-sm truncate",
                                                isDark ? "text-white/50" : "text-gray-500"
                                            )}>
                                                {ticket.user_name} • {ticket.id}
                                            </p>
                                        </div>
                                        <ChevronRight className={cn(
                                            "w-4 h-4 shrink-0",
                                            isDark ? "text-white/30" : "text-gray-400"
                                        )} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat panel */}
                <div className={cn(
                    "lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col",
                    isDark
                        ? "bg-zinc-900/50 border-white/10"
                        : "bg-white border-black/10"
                )}>
                    {selectedTicket ? (
                        <>
                            {/* Ticket header */}
                            <div className={cn(
                                "p-4 border-b flex items-center justify-between",
                                isDark ? "border-white/10" : "border-black/10"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            typeColors[selectedTicket.ticket_type]?.bg,
                                            typeColors[selectedTicket.ticket_type]?.text
                                        )}>
                                            {typeColors[selectedTicket.ticket_type]?.icon} {selectedTicket.ticket_type}
                                        </span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            statusColors[selectedTicket.status]?.bg,
                                            statusColors[selectedTicket.status]?.text
                                        )}>
                                            {statusColors[selectedTicket.status]?.label}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-mono",
                                            isDark ? "text-white/40" : "text-gray-400"
                                        )}>
                                            {selectedTicket.id}
                                        </span>
                                    </div>
                                    <h3 className={cn(
                                        "font-semibold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {selectedTicket.subject}
                                    </h3>
                                    <p className={cn(
                                        "text-sm flex items-center gap-2",
                                        isDark ? "text-white/50" : "text-gray-500"
                                    )}>
                                        <User className="w-3 h-3" />
                                        {selectedTicket.user_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Status buttons */}
                                    {selectedTicket.status !== "closed" && (
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm border-none outline-none",
                                                isDark ? "bg-white/10 text-white" : "bg-black/5 text-gray-900"
                                            )}
                                        >
                                            <option value="pending">Menunggu</option>
                                            <option value="in_progress">Ditangani</option>
                                            <option value="waiting_user">Menunggu User</option>
                                            <option value="resolved">Selesai</option>
                                            <option value="closed">Tutup</option>
                                        </select>
                                    )}
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                                        )}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className={cn(
                                "p-4 border-b",
                                isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
                            )}>
                                <p className={cn(
                                    "text-sm whitespace-pre-wrap",
                                    isDark ? "text-white/70" : "text-gray-600"
                                )}>
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-4" data-notification-panel>
                                {selectedTicket.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            msg.sender_type === "developer" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "max-w-[70%] rounded-2xl px-4 py-2",
                                            msg.sender_type === "developer"
                                                ? "bg-[#7B1E3C] text-white"
                                                : isDark
                                                    ? "bg-white/10 text-white"
                                                    : "bg-black/10 text-gray-900"
                                        )}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={cn(
                                                "text-[10px] mt-1",
                                                msg.sender_type === "developer"
                                                    ? "text-white/50"
                                                    : isDark
                                                        ? "text-white/30"
                                                        : "text-gray-400"
                                            )}>
                                                {new Date(msg.created_at).toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            {selectedTicket.status !== "closed" && (
                                <div className={cn(
                                    "p-4 border-t",
                                    isDark ? "border-white/10" : "border-black/10"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                            placeholder="Ketik balasan..."
                                            className={cn(
                                                "flex-1 px-4 py-3 rounded-xl outline-none",
                                                isDark
                                                    ? "bg-white/5 text-white placeholder:text-white/30"
                                                    : "bg-black/5 text-gray-900 placeholder:text-gray-400"
                                            )}
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={!message.trim() || sending}
                                            className={cn(
                                                "p-3 rounded-xl transition-colors",
                                                message.trim()
                                                    ? "bg-[#7B1E3C] text-white hover:bg-[#9B2E4C]"
                                                    : isDark
                                                        ? "bg-white/5 text-white/30"
                                                        : "bg-black/5 text-gray-400"
                                            )}
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-12">
                            <div className="text-center">
                                <MessageSquare className={cn(
                                    "w-16 h-16 mx-auto mb-4",
                                    isDark ? "text-white/20" : "text-gray-300"
                                )} />
                                <p className={cn(
                                    "text-lg font-medium mb-2",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Pilih tiket untuk melihat detail
                                </p>
                                <p className={isDark ? "text-white/30" : "text-gray-400"}>
                                    Klik tiket di sebelah kiri untuk memulai chat
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
