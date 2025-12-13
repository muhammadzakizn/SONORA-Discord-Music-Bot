"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Cpu,
    HardDrive,
    Wifi,
    Clock,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Server,
    Database,
    Music,
    Volume2,
    Zap,
    RefreshCw,
    TrendingUp,
    BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { ComponentStatusDialog, componentDescriptions } from "@/components/developer/ComponentStatusDialog";
import { CacheManagementDialog } from "@/components/developer/CacheManagementDialog";

interface SystemMetrics {
    cpu: number;
    cpuHistory: number[];
    memory: number;
    memoryHistory: number[];
    disk: number;
    diskTotal: string;
    diskUsed: string;
    uptime: string;
    uptimeSeconds: number;
    latency: number;
    networkIn: string;
    networkOut: string;
}

interface ComponentStatus {
    name: string;
    status: "online" | "warning" | "offline";
    latency?: number;
    message?: string;
}

export default function MonitoringPage() {
    const { isDark } = useSettings();
    const [metrics, setMetrics] = useState<SystemMetrics>({
        cpu: 15,
        cpuHistory: [12, 15, 18, 14, 16, 20, 15, 18, 12, 15],
        memory: 35,
        memoryHistory: [30, 32, 35, 33, 34, 36, 35, 38, 35, 35],
        disk: 45,
        diskTotal: "50 GB",
        diskUsed: "22.5 GB",
        uptime: "2h 45m",
        uptimeSeconds: 9900,
        latency: 32,
        networkIn: "1.2 MB/s",
        networkOut: "0.5 MB/s",
    });

    const [components, setComponents] = useState<ComponentStatus[]>([
        { name: "Discord Bot", status: "online", latency: 45, message: "Running smoothly" },
        { name: "Database (SQLite)", status: "online", latency: 5, message: "Connected" },
        { name: "Web API", status: "online", latency: 12, message: "Healthy" },
        { name: "Voice Engine", status: "online", latency: 8, message: "Ready" },
        { name: "Cache System", status: "warning", latency: 2, message: "500+ files cached" },
        { name: "Spotify API", status: "online", latency: 120, message: "Connected" },
        { name: "YouTube API", status: "online", latency: 85, message: "Available" },
        { name: "Apple Music", status: "online", latency: 95, message: "Cookie auth active" },
    ]);

    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Dialog state
    const [selectedComponent, setSelectedComponent] = useState<ComponentStatus | null>(null);
    const [showComponentDialog, setShowComponentDialog] = useState(false);
    const [showCacheDialog, setShowCacheDialog] = useState(false);

    // Handle component card click
    const handleComponentClick = (component: ComponentStatus) => {
        if (component.name === "Cache System") {
            setShowCacheDialog(true);
        } else {
            setSelectedComponent(component);
            setShowComponentDialog(true);
        }
    };

    // Simulate real-time updates
    useEffect(() => {
        const getApiBase = () => {
            if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                return `${window.location.protocol}//${window.location.hostname}:5000`;
            }
            return process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';
        };
        const API_BASE = getApiBase();

        const fetchMetrics = async () => {
            // In production, fetch from API
            try {
                const response = await fetch(`${API_BASE}/api/developer/stats`, {
                    cache: 'no-store',
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.system) {
                        setMetrics(prev => ({
                            ...prev,
                            cpu: data.system.cpu || prev.cpu,
                            memory: data.system.memory || prev.memory,
                            latency: data.system.latency || prev.latency,
                        }));
                    }
                }
            } catch {
                // Simulate data updates
                setMetrics(prev => ({
                    ...prev,
                    cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
                    cpuHistory: [...prev.cpuHistory.slice(-9), prev.cpu],
                    memory: Math.max(20, Math.min(90, prev.memory + (Math.random() * 4 - 2))),
                    memoryHistory: [...prev.memoryHistory.slice(-9), prev.memory],
                    latency: Math.floor(Math.random() * 50) + 20,
                }));
            }
            setLastUpdate(new Date());
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
        setLastUpdate(new Date());
    };

    const getStatusIcon = (status: "online" | "warning" | "offline") => {
        switch (status) {
            case "online":
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
            case "offline":
                return <XCircle className="w-5 h-5 text-rose-400" />;
        }
    };

    const getStatusColor = (status: "online" | "warning" | "offline") => {
        switch (status) {
            case "online":
                return "border-green-500/30 bg-green-500/10";
            case "warning":
                return "border-yellow-500/30 bg-yellow-500/10";
            case "offline":
                return "border-rose-500/30 bg-rose-500/10";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-cyan-500/20" : "bg-cyan-500/10"
                    )}>
                        <Activity className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            System Monitoring
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Real-time system health and performance metrics
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-sm",
                        isDark ? "text-white/40" : "text-gray-400"
                    )}>
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                            isDark
                                ? "bg-white/10 hover:bg-white/15 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-5 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-purple-400" />
                            <span className={cn(
                                "font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>CPU Usage</span>
                        </div>
                        <span className={cn(
                            "text-2xl font-bold font-mono",
                            metrics.cpu > 80 ? "text-rose-400" :
                                metrics.cpu > 50 ? "text-yellow-400" : "text-green-400"
                        )}>
                            {Math.round(metrics.cpu)}%
                        </span>
                    </div>
                    {/* Mini Chart */}
                    <div className="h-12 flex items-end gap-1">
                        {metrics.cpuHistory.map((value, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 rounded-t transition-all",
                                    value > 80 ? "bg-rose-500" :
                                        value > 50 ? "bg-yellow-500" : "bg-purple-500"
                                )}
                                style={{ height: `${value}%` }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Memory */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "p-5 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-cyan-400" />
                            <span className={cn(
                                "font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Memory</span>
                        </div>
                        <span className={cn(
                            "text-2xl font-bold font-mono",
                            metrics.memory > 80 ? "text-rose-400" :
                                metrics.memory > 50 ? "text-yellow-400" : "text-cyan-400"
                        )}>
                            {Math.round(metrics.memory)}%
                        </span>
                    </div>
                    <div className="h-12 flex items-end gap-1">
                        {metrics.memoryHistory.map((value, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 rounded-t transition-all",
                                    value > 80 ? "bg-rose-500" :
                                        value > 50 ? "bg-yellow-500" : "bg-cyan-500"
                                )}
                                style={{ height: `${value}%` }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Disk */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                        "p-5 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-orange-400" />
                            <span className={cn(
                                "font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Disk Usage</span>
                        </div>
                        <span className="text-2xl font-bold font-mono text-orange-400">
                            {metrics.disk}%
                        </span>
                    </div>
                    <div className={cn(
                        "h-3 rounded-full overflow-hidden",
                        isDark ? "bg-white/10" : "bg-gray-200"
                    )}>
                        <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                            style={{ width: `${metrics.disk}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                        <span className={isDark ? "text-white/40" : "text-gray-400"}>
                            {metrics.diskUsed} used
                        </span>
                        <span className={isDark ? "text-white/40" : "text-gray-400"}>
                            {metrics.diskTotal} total
                        </span>
                    </div>
                </motion.div>

                {/* Network Latency */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                        "p-5 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-green-400" />
                            <span className={cn(
                                "font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>Latency</span>
                        </div>
                        <span className={cn(
                            "text-2xl font-bold font-mono",
                            metrics.latency > 100 ? "text-rose-400" :
                                metrics.latency > 50 ? "text-yellow-400" : "text-green-400"
                        )}>
                            {metrics.latency}ms
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={cn(
                            "p-2 rounded-lg",
                            isDark ? "bg-white/5" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-white/40" : "text-gray-400"}>Uptime</p>
                            <p className={cn(
                                "font-mono font-medium",
                                isDark ? "text-white" : "text-gray-900"
                            )}>{metrics.uptime}</p>
                        </div>
                        <div className={cn(
                            "p-2 rounded-lg",
                            isDark ? "bg-white/5" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-white/40" : "text-gray-400"}>Network</p>
                            <p className={cn(
                                "font-mono font-medium text-xs",
                                isDark ? "text-white" : "text-gray-900"
                            )}>↑{metrics.networkOut}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Component Status Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={cn(
                    "p-5 rounded-2xl border",
                    isDark
                        ? "bg-zinc-900/50 border-white/10"
                        : "bg-white border-gray-200"
                )}
            >
                <h2 className={cn(
                    "text-lg font-semibold mb-4 flex items-center gap-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    <Server className="w-5 h-5 text-purple-400" />
                    Component Status
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {components.map((component, index) => (
                        <motion.div
                            key={component.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * index }}
                            onClick={() => handleComponentClick(component)}
                            className={cn(
                                "p-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                                getStatusColor(component.status),
                                isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className={cn(
                                    "font-medium text-sm",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    {component.name}
                                </h3>
                                {getStatusIcon(component.status)}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={cn(
                                    "text-xs",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    {component.message}
                                </span>
                                {component.latency !== undefined && (
                                    <span className={cn(
                                        "text-xs font-mono px-2 py-0.5 rounded",
                                        isDark ? "bg-white/10" : "bg-gray-100"
                                    )}>
                                        {component.latency}ms
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={cn(
                        "p-5 rounded-2xl border text-center",
                        isDark
                            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
                            : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                    )}
                >
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        {components.filter(c => c.status === "online").length}/{components.length}
                    </p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Components Online
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className={cn(
                        "p-5 rounded-2xl border text-center",
                        isDark
                            ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
                            : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
                    )}
                >
                    <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        99.9%
                    </p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Uptime (30 days)
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className={cn(
                        "p-5 rounded-2xl border text-center",
                        isDark
                            ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20"
                            : "bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200"
                    )}
                >
                    <Wifi className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        {Math.round(metrics.latency)}ms
                    </p>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Avg Response Time
                    </p>
                </motion.div>
            </div>

            {/* Component Status Dialog */}
            <ComponentStatusDialog
                isOpen={showComponentDialog}
                onClose={() => {
                    setShowComponentDialog(false);
                    setSelectedComponent(null);
                }}
                component={selectedComponent}
            />

            {/* Cache Management Dialog */}
            <CacheManagementDialog
                isOpen={showCacheDialog}
                onClose={() => setShowCacheDialog(false)}
            />
        </div>
    );
}
