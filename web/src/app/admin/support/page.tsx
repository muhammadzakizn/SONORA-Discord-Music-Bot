"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Headphones,
    Search,
    Filter,
    Clock,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    User,
    Calendar,
    ChevronRight,
    RefreshCw,
    Send,
    X,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface SupportTicket {
    id: string;
    code: string;
    subject: string;
    category: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    createdAt: string;
    updatedAt: string;
    userName: string;
    userEmail: string;
    messages: {
        id: string;
        sender: "user" | "admin";
        content: string;
        timestamp: string;
    }[];
}

const STATUS_COLORS = {
    open: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Open" },
    in_progress: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "In Progress" },
    resolved: { bg: "bg-green-500/20", text: "text-green-400", label: "Resolved" },
    closed: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Closed" },
};

const PRIORITY_COLORS = {
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400" },
    medium: { bg: "bg-blue-500/20", text: "text-blue-400" },
    high: { bg: "bg-orange-500/20", text: "text-orange-400" },
    urgent: { bg: "bg-rose-500/20", text: "text-rose-400" },
};

export default function SupportPage() {
    const { isDark } = useSettings();
    const [tickets, setTickets] = useState<SupportTicket[]>([
        {
            id: "1",
            code: "SONORA-001",
            subject: "Bot not responding to /play command",
            category: "Bug Report",
            status: "open",
            priority: "high",
            createdAt: "2024-12-12T10:00:00Z",
            updatedAt: "2024-12-12T10:00:00Z",
            userName: "MusicFan#1234",
            userEmail: "user@example.com",
            messages: [
                { id: "m1", sender: "user", content: "The bot is not responding when I use /play command. It was working fine yesterday.", timestamp: "2024-12-12T10:00:00Z" },
            ],
        },
        {
            id: "2",
            code: "SONORA-002",
            subject: "Feature request: Playlist saving",
            category: "Feature Request",
            status: "in_progress",
            priority: "medium",
            createdAt: "2024-12-11T14:00:00Z",
            updatedAt: "2024-12-12T09:00:00Z",
            userName: "DJPro#5678",
            userEmail: "djpro@example.com",
            messages: [
                { id: "m1", sender: "user", content: "Would be great to have playlist saving feature!", timestamp: "2024-12-11T14:00:00Z" },
                { id: "m2", sender: "admin", content: "Thank you for the suggestion! We're looking into implementing this.", timestamp: "2024-12-12T09:00:00Z" },
            ],
        },
        {
            id: "3",
            code: "SONORA-003",
            subject: "How to change volume?",
            category: "Question",
            status: "resolved",
            priority: "low",
            createdAt: "2024-12-10T08:00:00Z",
            updatedAt: "2024-12-10T09:30:00Z",
            userName: "NewUser#9999",
            userEmail: "newuser@example.com",
            messages: [
                { id: "m1", sender: "user", content: "How do I change the volume of the bot?", timestamp: "2024-12-10T08:00:00Z" },
                { id: "m2", sender: "admin", content: "You can use the /volume command followed by a number (0-100) to adjust volume.", timestamp: "2024-12-10T09:30:00Z" },
            ],
        },
    ]);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
            ticket.code.toLowerCase().includes(search.toLowerCase()) ||
            ticket.userName.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === "all" || ticket.status === filter;

        return matchesSearch && matchesFilter;
    });

    const handleStatusChange = (ticketId: string, newStatus: SupportTicket["status"]) => {
        setTickets(prev => prev.map(t =>
            t.id === ticketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
        ));
        if (selectedTicket?.id === ticketId) {
            setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;

        setIsSending(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const newMessage = {
            id: Date.now().toString(),
            sender: "admin" as const,
            content: replyText,
            timestamp: new Date().toISOString(),
        };

        setTickets(prev => prev.map(t =>
            t.id === selectedTicket.id
                ? { ...t, messages: [...t.messages, newMessage], updatedAt: new Date().toISOString() }
                : t
        ));

        setSelectedTicket(prev => prev ? { ...prev, messages: [...prev.messages, newMessage] } : null);
        setReplyText("");
        setIsSending(false);
    };

    const stats = {
        open: tickets.filter(t => t.status === "open").length,
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
                        isDark ? "bg-purple-500/20" : "bg-purple-500/10"
                    )}>
                        <Headphones className="w-6 h-6 text-purple-400" />
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
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Open", value: stats.open, color: "blue" },
                    { label: "In Progress", value: stats.inProgress, color: "yellow" },
                    { label: "Resolved", value: stats.resolved, color: "green" },
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
                            stat.color === "blue" && "text-blue-400",
                            stat.color === "yellow" && "text-yellow-400",
                            stat.color === "green" && "text-green-400",
                            stat.color === "purple" && "text-purple-400"
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
                    {["all", "open", "in_progress", "resolved", "closed"].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                                filter === status
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {status === "in_progress" ? "In Progress" : status === "all" ? "All" : status}
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
                {filteredTickets.length === 0 ? (
                    <div className={cn(
                        "p-8 text-center",
                        isDark ? "text-white/50" : "text-gray-500"
                    )}>
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No tickets found</p>
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "text-xs font-mono px-2 py-0.5 rounded",
                                                isDark ? "bg-white/10" : "bg-gray-100"
                                            )}>
                                                {ticket.code}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                STATUS_COLORS[ticket.status].bg,
                                                STATUS_COLORS[ticket.status].text
                                            )}>
                                                {STATUS_COLORS[ticket.status].label}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                                PRIORITY_COLORS[ticket.priority].bg,
                                                PRIORITY_COLORS[ticket.priority].text
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
                                                {ticket.userName}
                                            </span>
                                            <span className={isDark ? "text-white/40" : "text-gray-500"}>
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className={isDark ? "text-white/40" : "text-gray-500"}>
                                                {ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}
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
                                            {selectedTicket.code}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            STATUS_COLORS[selectedTicket.status].bg,
                                            STATUS_COLORS[selectedTicket.status].text
                                        )}>
                                            {STATUS_COLORS[selectedTicket.status].label}
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
                                        From: {selectedTicket.userName} • {selectedTicket.category}
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

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedTicket.messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            msg.sender === "admin" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "max-w-[80%] p-3 rounded-xl",
                                            msg.sender === "admin"
                                                ? "bg-purple-500/20 text-purple-100"
                                                : isDark
                                                    ? "bg-white/10 text-white"
                                                    : "bg-gray-100 text-gray-900"
                                        )}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={cn(
                                                "text-xs mt-1",
                                                msg.sender === "admin"
                                                    ? "text-purple-300/50"
                                                    : isDark
                                                        ? "text-white/30"
                                                        : "text-gray-500"
                                            )}>
                                                {new Date(msg.timestamp).toLocaleString()}
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
                                    {(["open", "in_progress", "resolved", "closed"] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(selectedTicket.id, status)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                                                selectedTicket.status === status
                                                    ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`
                                                    : isDark
                                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {status === "in_progress" ? "In Progress" : status}
                                        </button>
                                    ))}
                                </div>

                                {/* Reply */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your reply..."
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
                                        className="px-4 py-2 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSending ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Send
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
