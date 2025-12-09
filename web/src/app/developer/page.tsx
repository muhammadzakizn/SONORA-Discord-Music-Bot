"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Trash2,
  Download,
  Search,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  Power,
  Play,
  Megaphone,
  HardDrive,
  Send,
  X,
  FileText,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  module: string;
  message: string;
}

// Mock logs for demonstration
const mockLogs: LogEntry[] = [
  { id: 1, timestamp: "14:30:01", level: "INFO", module: "bot", message: "Bot started successfully" },
  { id: 2, timestamp: "14:30:02", level: "INFO", module: "voice", message: "Voice manager initialized" },
  { id: 3, timestamp: "14:30:03", level: "DEBUG", module: "database", message: "Connected to bot.db" },
  { id: 4, timestamp: "14:30:05", level: "INFO", module: "cogs", message: "Loaded PlayCommand" },
  { id: 5, timestamp: "14:30:05", level: "INFO", module: "cogs", message: "Loaded QueueCommands" },
  { id: 6, timestamp: "14:30:06", level: "WARNING", module: "cache", message: "Cache directory has 500+ files" },
  { id: 7, timestamp: "14:30:10", level: "INFO", module: "bot", message: "Synced 15 slash commands" },
  { id: 8, timestamp: "14:31:00", level: "DEBUG", module: "play", message: "Processing /play request" },
  { id: 9, timestamp: "14:31:01", level: "INFO", module: "spotify", message: "Fetching track metadata..." },
];

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

function LogLine({ log }: { log: LogEntry }) {
  const Icon = levelIcons[log.level];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-3 px-4 py-2 hover:bg-zinc-800/50 font-mono text-sm",
        levelBgColors[log.level]
      )}
    >
      <span className="text-zinc-600 w-20 shrink-0">{log.timestamp}</span>
      <div className={cn("flex items-center gap-1 w-20 shrink-0", levelColors[log.level])}>
        <Icon className="w-4 h-4" />
        <span className="uppercase text-xs">{log.level}</span>
      </div>
      <span className="text-cyan-400 w-24 shrink-0">[{log.module}]</span>
      <span className="text-zinc-300 break-all">{log.message}</span>
    </motion.div>
  );
}

function QuickStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Uptime", value: "2h 45m", color: "green" },
        { label: "Memory", value: "128 MB", color: "cyan" },
        { label: "CPU", value: "2.3%", color: "purple" },
        { label: "Errors", value: "0", color: "rose" },
      ].map((stat, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
          <p className={cn(
            "text-2xl font-bold font-mono",
            stat.color === "green" && "text-green-400",
            stat.color === "cyan" && "text-cyan-400",
            stat.color === "purple" && "text-purple-400",
            stat.color === "rose" && "text-rose-400",
          )}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function BroadcastModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [target, setTarget] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
      }, 1500);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Megaphone className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold">Broadcast Message</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Target</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTarget("all")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border",
                  target === "all"
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                )}
              >
                All Servers
              </button>
              <button
                onClick={() => setTarget("specific")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border",
                  target === "specific"
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                )}
              >
                Specific Channel
              </button>
            </div>
          </div>

          {target === "specific" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Channel ID</label>
              <input
                type="text"
                placeholder="123456789..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your announcement..."
              className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!message || sending || sent}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              sent
                ? "bg-green-500 text-white"
                : "bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {sent ? (
              <>
                <Check className="w-5 h-5" />
                Sent!
              </>
            ) : sending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CacheManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [files, setFiles] = useState([
    { id: 1, name: "track_83921.mp3", size: "4.2 MB", time: "2m ago" },
    { id: 2, name: "cover_art_992.jpg", size: "128 KB", time: "5m ago" },
    { id: 3, name: "track_11202.mp3", size: "8.1 MB", time: "12m ago" },
    { id: 4, name: "metadata_index.json", size: "45 KB", time: "1h ago" },
    { id: 5, name: "track_55432.mp3", size: "3.5 MB", time: "3h ago" },
  ]);

  const handleDelete = (id: number) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cache Manager</h3>
              <p className="text-xs text-zinc-400">{files.length} files cached</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] bg-zinc-950/50 rounded-xl border border-zinc-800 p-2 space-y-1 mb-6">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
              <CheckCircle className="w-8 h-8 text-zinc-600" />
              <p>Cache is empty</p>
            </div>
          ) : (
            files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900 transition-colors group">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                  <div>
                    <p className="text-sm font-medium text-zinc-300">{file.name}</p>
                    <p className="text-xs text-zinc-500">{file.size} • {file.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium text-sm"
          >
            Close
          </button>
          <button
            onClick={handleClearAll}
            disabled={files.length === 0}
            className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Cache
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickActions({
  onBroadcast,
  onCache,
  onRestart,
  isRunning,
  toggleRunning
}: {
  onBroadcast: () => void;
  onCache: () => void;
  onRestart: () => void;
  isRunning: boolean;
  toggleRunning: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        onClick={toggleRunning}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
          isRunning
            ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
            : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
        )}
      >
        {isRunning ? <Power className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {isRunning ? "Shutdown Bot" : "Start Bot"}
      </button>

      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Restart Bot
      </button>

      <button
        onClick={onBroadcast}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
      >
        <Megaphone className="w-4 h-4" />
        Broadcast
      </button>

      <button
        onClick={onCache}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
      >
        <HardDrive className="w-4 h-4" />
        Manage Cache
      </button>

      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
        <Download className="w-4 h-4" />
        Export Logs
      </button>
    </div>
  );
}

export default function DeveloperConsole() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [filter, setFilter] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "booting">("connected");
  const [bootProgress, setBootProgress] = useState(0);

  // Modals state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showCache, setShowCache] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [consoleInput, setConsoleInput] = useState("");

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
    setLogs(prev => [...prev.slice(-100), newLog]);

    // Simulate response
    setTimeout(() => {
      setLogs(prev => [...prev.slice(-100), {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        level: "DEBUG",
        module: "system",
        message: `Command executed: ${cmd}`,
      }]);
    }, 200);
  };

  const handleRestart = () => {
    if (connectionStatus !== "connected") return;

    setConnectionStatus("booting");
    setBootProgress(0);
    setLogs(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      level: "WARNING",
      module: "system",
      message: "Restart signal received. Rebooting...",
    }]);

    // Simulate boot sequence
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setBootProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setConnectionStatus("connected");
        setLogs(prev => [...prev, {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          level: "INFO",
          module: "system",
          message: "Bot restarted successfully (PID: 8821)",
        }]);
      }
    }, 500);
  };

  const handleToggleRunning = () => {
    if (connectionStatus === "connected") {
      // Shutdown
      setConnectionStatus("disconnected");
      setLogs(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        level: "ERROR",
        module: "system",
        message: "Shutdown signal received. System halted.",
      }]);
    } else {
      // Start (Boot)
      setConnectionStatus("booting");
      setBootProgress(0);

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setBootProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setConnectionStatus("connected");
          setLogs(prev => [...prev, {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
            level: "INFO",
            module: "system",
            message: "System boot complete. Online.",
          }]);
        }
      }, 300);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Simulate new logs coming in
  useEffect(() => {
    if (connectionStatus !== "connected") return;

    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        level: ["DEBUG", "INFO", "INFO", "INFO", "WARNING"][Math.floor(Math.random() * 5)] as "DEBUG" | "INFO" | "WARNING" | "ERROR",
        module: ["voice", "play", "queue", "cache", "api"][Math.floor(Math.random() * 5)],
        message: [
          "Processing request...",
          "Cache hit for track",
          "Voice connection stable",
          "Queue updated",
          "API response received",
        ][Math.floor(Math.random() * 5)],
      };

      setLogs(prev => [...prev.slice(-100), newLog]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesText = log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.module.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesText && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Terminal className="w-7 h-7 text-green-400" />
          Live Console
        </h1>
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" && (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-500">Live</span>
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

      {/* Quick Stats */}
      <QuickStats />

      {/* Quick Actions */}
      <QuickActions
        onBroadcast={() => setShowBroadcast(true)}
        onCache={() => setShowCache(true)}
        onRestart={handleRestart}
        isRunning={connectionStatus === "connected"}
        toggleRunning={handleToggleRunning}
      />

      {/* Modals */}
      <BroadcastModal isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} />
      <CacheManagerModal isOpen={showCache} onClose={() => setShowCache(false)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-green-500 outline-none transition-colors text-sm"
          >
            <option value="all">All Levels</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-500">
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
        className="h-[500px] rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden relative"
      >
        {/* Connection Overlay */}
        <AnimatePresence>
          {connectionStatus === "disconnected" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center"
            >
              <Power className="w-16 h-16 text-rose-500 mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-rose-500">SYSTEM OFFLINE</h2>
              <p className="text-zinc-500 mt-2 font-mono">Connection to bot instance lost.</p>
              <button
                onClick={handleToggleRunning}
                className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-mono text-sm"
              >
                ./boot_system.sh
              </button>
            </motion.div>
          )}
          {connectionStatus === "booting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center"
            >
              <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${bootProgress}%` }}
                />
              </div>
              <p className="text-green-500 font-mono text-sm">
                &gt; System booting... {bootProgress}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-full overflow-auto code-scroll">
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-4 font-mono text-xs text-zinc-500 z-10 w-full">
            <span className="w-20">TIME</span>
            <span className="w-20">LEVEL</span>
            <span className="w-24">MODULE</span>
            <span>MESSAGE</span>
          </div>

          <div className="py-2">
            {filteredLogs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-zinc-600">
                No logs matching your filter
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>{filteredLogs.length} logs displayed</span>
        <span>Total: {logs.length} logs</span>
      </div>

      {/* Interactive Console Input */}
      <form onSubmit={handleConsoleCommand} className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-mono">
          <ChevronRight className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={consoleInput}
          onChange={(e) => setConsoleInput(e.target.value)}
          placeholder="Enter console command..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-4 font-mono text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-zinc-300 placeholder:text-zinc-600"
        />
      </form>
    </div>
  );
}
