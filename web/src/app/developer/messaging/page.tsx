"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Send,
    Server,
    Users,
    CheckCircle,
    XCircle,
    RefreshCw,
    Image as ImageIcon,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface BroadcastResult {
    success: boolean;
    serversReached: number;
    failed: number;
    timestamp: string;
}

export default function MessagingPage() {
    const { isDark } = useSettings();
    const [target, setTarget] = useState<"all" | "specific">("all");
    const [channelId, setChannelId] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [image, setImage] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<BroadcastResult | null>(null);
    const [history, setHistory] = useState<BroadcastResult[]>([]);

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        setResult(null);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

            const response = await fetch(`${API_BASE}/api/admin/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: title ? `**${title}**\n\n${message}` : message,
                    all_channels: target === "all",
                    channel_ids: target === "specific" && channelId ? [channelId] : [],
                    mention_type: 'none',
                }),
            });

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

                // Clear form after success
                setTimeout(() => {
                    setTitle("");
                    setMessage("");
                    setImage("");
                    setResult(null);
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

    return (
        <div className="space-y-6">
            {/* Header */}
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
                        Send announcements to Discord servers
                    </p>
                </div>
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

                        {/* Target Selection */}
                        <div className="mb-4">
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Target
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setTarget("all")}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        target === "all"
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : isDark
                                                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                                : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    <Server className="w-4 h-4" />
                                    All Servers
                                </button>
                                <button
                                    onClick={() => setTarget("specific")}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        target === "specific"
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : isDark
                                                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                                : "bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    <Users className="w-4 h-4" />
                                    Specific Channel
                                </button>
                            </div>
                        </div>

                        {/* Channel ID (for specific) */}
                        <AnimatePresence>
                            {target === "specific" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-4 overflow-hidden"
                                >
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Channel ID
                                    </label>
                                    <input
                                        type="text"
                                        value={channelId}
                                        onChange={(e) => setChannelId(e.target.value)}
                                        placeholder="123456789012345678"
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl outline-none transition-colors font-mono text-sm",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500"
                                                : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                        )}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                            disabled={!message.trim() || sending || result?.success}
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
                                    Sent to {result.serversReached} servers!
                                </>
                            ) : result?.success === false ? (
                                <>
                                    <XCircle className="w-5 h-5" />
                                    Failed to send
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send Broadcast
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
                                                {item.serversReached} servers
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
        </div>
    );
}
