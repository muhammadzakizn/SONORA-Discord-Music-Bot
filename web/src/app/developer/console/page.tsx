"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Terminal,
    Search,
    Filter,
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle,
    Power,
    ChevronRight,
    Download,
    Trash2,
    Pause,
    Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface LogEntry {
    id: number;
    timestamp: string;
    level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
    module: string;
    message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

const levelIcons = {
    DEBUG: Info,
    INFO: CheckCircle,
    WARNING: AlertTriangle,
    ERROR: AlertCircle,
};

const levelColors = {
    DEBUG: "text-zinc-500",
    INFO: "text-green-400",
    WARNING: "text-yellow-400",
    ERROR: "text-rose-400",
};

const levelBgColors = {
    DEBUG: "bg-zinc-500/10",
    INFO: "bg-green-500/10",
    WARNING: "bg-yellow-500/10",
    ERROR: "bg-rose-500/10",
};

function LogLine({ log, isDark, isNew }: { log: LogEntry; isDark: boolean; isNew?: boolean }) {
    const Icon = levelIcons[log.level] || Info;

    return (
        <div
            className={cn(
                "flex items-start gap-3 px-4 py-1.5 font-mono text-xs transition-all duration-300",
                isDark ? "hover:bg-white/5" : "hover:bg-black/5",
                isNew && "bg-green-500/10 border-l-2 border-green-500"
            )}
        >
            <span className={cn(
                "w-16 shrink-0 tabular-nums",
                isDark ? "text-zinc-600" : "text-gray-400"
            )}>{log.timestamp}</span>
            <div className={cn("flex items-center gap-1 w-16 shrink-0", levelColors[log.level] || "text-zinc-500")}>
                <Icon className="w-3 h-3" />
                <span className="uppercase text-[10px] font-medium">{log.level}</span>
            </div>
            <span className={cn(
                "w-20 shrink-0 truncate",
                "text-cyan-400"
            )}>[{log.module}]</span>
            <span className={cn(
                "flex-1 break-all",
                isDark ? "text-zinc-300" : "text-gray-700"
            )}>{log.message}</span>
        </div>
    );
}

export default function DeveloperConsole() {
    const { isDark } = useSettings();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<string>("");
    const [levelFilter, setLevelFilter] = useState<string>("all");
    const [autoScroll, setAutoScroll] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "booting">("booting");
    const [bootProgress, setBootProgress] = useState(0);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [consoleInput, setConsoleInput] = useState("");
    const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
    const prevLogCount = useRef(0);

    // Fetch logs from real API
    const fetchLogs = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/logs?lines=200`, {
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data = await response.json();

            if (data.logs && Array.isArray(data.logs)) {
                // Parse logs from API response - better parsing
                const parsedLogs: LogEntry[] = data.logs.map((log: { timestamp: string; level: string; message: string; file?: string }, index: number) => {
                    let timestamp = log.timestamp || '';
                    let level = log.level || 'INFO';
                    let message = log.message || '';
                    let module = 'system';

                    // Clean up timestamp (extract just HH:MM:SS)
                    const timeMatch = timestamp.match(/(\d{2}:\d{2}:\d{2})/);
                    if (timeMatch) {
                        timestamp = timeMatch[1];
                    }

                    // Extract module from message patterns like "[WELCOME]" or "load_commands:319"
                    const bracketMatch = message.match(/^\[([A-Za-z_]+)\]/);
                    const colonMatch = message.match(/^([a-z_]+):/i);

                    if (bracketMatch) {
                        module = bracketMatch[1].toLowerCase();
                        message = message.replace(bracketMatch[0], '').trim();
                    } else if (colonMatch) {
                        module = colonMatch[1];
                    } else if (message.includes('Bot is ready') || message.includes('Bot started')) {
                        module = 'bot';
                    } else if (message.includes('voice') || message.includes('Voice')) {
                        module = 'voice';
                    } else if (message.includes('Commands loaded') || message.includes('Synced')) {
                        module = 'cogs';
                    }

                    // Remove line numbers from message (e.g., ":319 - ")
                    message = message.replace(/^:\d+\s*-?\s*/, '').trim();

                    return {
                        id: index + 1,
                        timestamp,
                        level: level.toUpperCase() as LogEntry['level'],
                        module,
                        message,
                    };
                });

                // Identify new logs for animation
                const newCount = parsedLogs.length;
                if (newCount > prevLogCount.current && prevLogCount.current > 0) {
                    const newIds = new Set<number>();
                    for (let i = prevLogCount.current; i < newCount; i++) {
                        newIds.add(parsedLogs[i].id);
                    }
                    setNewLogIds(newIds);
                    // Clear new log animation after 1 second
                    setTimeout(() => setNewLogIds(new Set()), 1000);
                }
                prevLogCount.current = newCount;

                setLogs(parsedLogs);
                setConnectionStatus("connected");
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            setConnectionStatus("disconnected");
        }
    }, []);

    // Initial fetch and polling
    useEffect(() => {
        fetchLogs();

        const interval = setInterval(() => {
            if (!isPaused) {
                fetchLogs();
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [fetchLogs, isPaused]);

    const handleConsoleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!consoleInput.trim()) return;

        const cmd = consoleInput;
        setConsoleInput("");

        // Add command to logs
        const newLog: LogEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            level: "INFO",
            module: "console",
            message: `> ${cmd}`,
        };
        setLogs(prev => [...prev.slice(-200), newLog]);

        // TODO: Send command to backend
        setTimeout(() => {
            setLogs(prev => [...prev.slice(-200), {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
                level: "DEBUG",
                module: "system",
                message: `Command sent: ${cmd}`,
            }]);
        }, 200);
    };

    // Auto scroll to bottom
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);
    const filteredLogs = logs.filter(log => {
        const matchesText = log.message.toLowerCase().includes(filter.toLowerCase()) ||
            log.module.toLowerCase().includes(filter.toLowerCase());
        const matchesLevel = levelFilter === "all" || log.level === levelFilter;
        return matchesText && matchesLevel;
    });

    const clearLogs = () => {
        setLogs([]);
    };

    const exportLogs = () => {
        const logText = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.module}] ${l.message}`).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sonora-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-green-500/20" : "bg-green-500/10"
                    )}>
                        <Terminal className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Live Console
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Real-time bot logs and system messages
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {connectionStatus === "connected" && (
                        <>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className={cn(
                                "text-sm font-medium",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>Live</span>
                        </>
                    )}
                    {connectionStatus === "disconnected" && (
                        <>
                            <span className="w-2 h-2 bg-rose-500 rounded-full" />
                            <span className="text-sm text-rose-500 font-medium">Offline</span>
                        </>
                    )}
                    {connectionStatus === "booting" && (
                        <>
                            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            <span className="text-sm text-yellow-500 font-medium">Booting...</span>
                        </>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className={cn(
                "flex flex-wrap gap-4 items-center p-4 rounded-xl border",
                isDark
                    ? "bg-zinc-900/50 border-white/10"
                    : "bg-white border-gray-200"
            )}>
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                        isDark ? "text-zinc-500" : "text-gray-400"
                    )} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className={cn(
                            "w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-colors font-mono text-sm",
                            isDark
                                ? "bg-zinc-800 border border-zinc-700 focus:border-green-500 text-white"
                                : "bg-gray-100 border border-gray-200 focus:border-green-500 text-gray-900"
                        )}
                    />
                </div>

                {/* Level Filter */}
                <div className="flex items-center gap-2">
                    <Filter className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-gray-400")} />
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className={cn(
                            "px-3 py-2 rounded-lg outline-none transition-colors text-sm",
                            isDark
                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                : "bg-gray-100 border border-gray-200 text-gray-900"
                        )}
                    >
                        <option value="all">All Levels</option>
                        <option value="DEBUG">Debug</option>
                        <option value="INFO">Info</option>
                        <option value="WARNING">Warning</option>
                        <option value="ERROR">Error</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                            isPaused
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        )}
                    >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                        onClick={exportLogs}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                            isDark
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear
                    </button>
                </div>

                {/* Auto-scroll */}
                <label className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer",
                    isDark ? "text-zinc-500" : "text-gray-500"
                )}>
                    <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700"
                    />
                    Auto-scroll
                </label>
            </div>

            {/* Log Console */}
            <div
                ref={logContainerRef}
                className={cn(
                    "h-[500px] rounded-xl border overflow-hidden relative",
                    isDark
                        ? "bg-zinc-950 border-zinc-800"
                        : "bg-gray-50 border-gray-200"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "sticky top-0 border-b px-4 py-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider z-10",
                    isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-500"
                        : "bg-gray-100 border-gray-200 text-gray-500"
                )}>
                    <span className="w-16">Time</span>
                    <span className="w-16">Level</span>
                    <span className="w-20">Module</span>
                    <span className="flex-1">Message</span>
                </div>

                {/* Logs */}
                <div className="h-full overflow-auto">
                    <div className="py-2">
                        {filteredLogs.map((log) => (
                            <LogLine key={log.id} log={log} isDark={isDark} isNew={newLogIds.has(log.id)} />
                        ))}

                        {filteredLogs.length === 0 && (
                            <div className={cn(
                                "text-center py-12",
                                isDark ? "text-zinc-600" : "text-gray-400"
                            )}>
                                No logs matching your filter
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className={cn(
                "flex items-center justify-between text-sm",
                isDark ? "text-zinc-600" : "text-gray-500"
            )}>
                <span>{filteredLogs.length} logs displayed</span>
                <span>Total: {logs.length} logs</span>
            </div>

            {/* Interactive Console Input */}
            <form onSubmit={handleConsoleCommand} className="relative">
                <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 font-mono",
                    isDark ? "text-green-500" : "text-green-600"
                )}>
                    <ChevronRight className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="Enter console command..."
                    className={cn(
                        "w-full rounded-xl pl-10 pr-4 py-4 font-mono text-sm outline-none transition-all",
                        isDark
                            ? "bg-zinc-950 border border-zinc-800 focus:border-green-500 text-zinc-300 placeholder:text-zinc-600"
                            : "bg-gray-50 border border-gray-200 focus:border-green-500 text-gray-900 placeholder:text-gray-400"
                    )}
                />
            </form>
        </div>
    );
}
