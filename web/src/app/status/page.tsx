"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Server,
    Wifi,
    Database,
    Cpu,
    MemoryStick,
    Activity,
    RefreshCw,
    Home,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import NavLiquidGlass from "@/components/NavLiquidGlass";

interface SystemStatus {
    status: "operational" | "degraded" | "outage" | "unknown";
    lastChecked: Date;
    uptime: number;
    components: {
        name: string;
        status: "operational" | "degraded" | "outage";
        latency?: number;
        description?: string;
    }[];
    incidents: {
        id: string;
        title: string;
        status: "investigating" | "identified" | "monitoring" | "resolved";
        createdAt: Date;
        updatedAt: Date;
        description: string;
    }[];
    metrics: {
        cpu: number;
        memory: number;
        latency: number;
        uptime: number;
    } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function StatusIndicator({ status }: { status: "operational" | "degraded" | "outage" | "unknown" }) {
    const config = {
        operational: { color: "bg-green-500", text: "Operational", icon: CheckCircle2 },
        degraded: { color: "bg-yellow-500", text: "Degraded", icon: AlertTriangle },
        outage: { color: "bg-red-500", text: "Outage", icon: XCircle },
        unknown: { color: "bg-gray-500", text: "Unknown", icon: AlertTriangle },
    };

    const { color, text, icon: Icon } = config[status];

    return (
        <div className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full", color, status === "operational" && "animate-pulse")} />
            <Icon className={cn("w-5 h-5", color.replace("bg-", "text-"))} />
            <span className="font-medium">{text}</span>
        </div>
    );
}

function ComponentCard({
    name,
    status,
    latency,
    description,
    icon: Icon,
    isDark
}: {
    name: string;
    status: "operational" | "degraded" | "outage";
    latency?: number;
    description?: string;
    icon: React.ElementType;
    isDark: boolean;
}) {
    const statusColors = {
        operational: "border-green-500/30 bg-green-500/10",
        degraded: "border-yellow-500/30 bg-yellow-500/10",
        outage: "border-red-500/30 bg-red-500/10",
    };

    const dotColors = {
        operational: "bg-green-500",
        degraded: "bg-yellow-500",
        outage: "bg-red-500",
    };

    return (
        <div className={cn(
            "p-4 rounded-xl border transition-all",
            statusColors[status],
            isDark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.02]"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", isDark ? "text-white/70" : "text-gray-600")} />
                    <div>
                        <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{name}</p>
                        {description && (
                            <p className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {latency !== undefined && (
                        <span className={cn("text-sm", isDark ? "text-white/50" : "text-gray-500")}>
                            {latency}ms
                        </span>
                    )}
                    <span className={cn("w-3 h-3 rounded-full", dotColors[status])} />
                </div>
            </div>
        </div>
    );
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export default function StatusPage() {
    const { isDark, t } = useSettings();
    const [status, setStatus] = useState<SystemStatus>({
        status: "unknown",
        lastChecked: new Date(),
        uptime: 0,
        components: [],
        incidents: [],
        metrics: null,
    });
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/admin/health`, {
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Bot offline');
            }

            const data = await response.json();

            // Build status from health data
            setStatus({
                status: "operational",
                lastChecked: new Date(),
                uptime: data.system?.uptime_seconds || 0,
                components: [
                    {
                        name: "Discord Bot",
                        status: "operational",
                        latency: Math.round(data.bot?.latency_ms || 0),
                        description: `Connected to ${data.bot?.guilds || 0} servers`,
                    },
                    {
                        name: "Voice System",
                        status: data.voice?.connected > 0 ? "operational" : "operational",
                        description: `${data.voice?.playing || 0} active connections`,
                    },
                    {
                        name: "Database",
                        status: data.database?.status === "connected" ? "operational" : "degraded",
                        description: `${data.database?.size_mb?.toFixed(1) || 0} MB`,
                    },
                    {
                        name: "API Server",
                        status: "operational",
                        latency: Math.round(data.bot?.latency_ms || 0),
                    },
                ],
                incidents: [],
                metrics: {
                    cpu: data.system?.cpu_percent || 0,
                    memory: data.system?.memory_mb || 0,
                    latency: data.bot?.latency_ms || 0,
                    uptime: data.system?.uptime_seconds || 0,
                },
            });
        } catch (err) {
            setStatus(prev => ({
                ...prev,
                status: "outage",
                lastChecked: new Date(),
                components: [
                    { name: "Discord Bot", status: "outage", description: "Unable to connect" },
                    { name: "Voice System", status: "outage" },
                    { name: "Database", status: "outage" },
                    { name: "API Server", status: "outage" },
                ],
            }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchStatus();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const componentIcons: Record<string, React.ElementType> = {
        "Discord Bot": Server,
        "Voice System": Wifi,
        "Database": Database,
        "API Server": Activity,
    };

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-300",
            isDark ? "bg-black text-white" : "bg-gray-50 text-gray-900"
        )}>
            {/* Header */}
            <div className={cn(
                "border-b",
                isDark ? "border-white/[0.08] bg-zinc-900/50" : "border-gray-200 bg-white/50"
            )}>
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-2">
                                <img src="/sonora-logo.png" alt="SONORA" className="h-8 w-auto" />
                            </Link>
                            <div className={cn(
                                "h-6 w-px",
                                isDark ? "bg-white/[0.1]" : "bg-gray-300"
                            )} />
                            <h1 className={cn(
                                "text-lg font-semibold",
                                isDark ? "text-white/90" : "text-gray-900"
                            )}>
                                System Status
                            </h1>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={cn(
                                "p-2 rounded-xl transition-colors",
                                isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]"
                            )}
                        >
                            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
                {/* Overall Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-6 rounded-2xl border",
                        status.status === "operational"
                            ? "bg-green-500/10 border-green-500/30"
                            : status.status === "degraded"
                                ? "bg-yellow-500/10 border-yellow-500/30"
                                : "bg-red-500/10 border-red-500/30"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className={cn(
                                "text-2xl font-bold mb-2",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                {status.status === "operational"
                                    ? "All Systems Operational"
                                    : status.status === "degraded"
                                        ? "Some Systems Degraded"
                                        : "System Outage Detected"}
                            </h2>
                            <p className={isDark ? "text-white/60" : "text-gray-600"}>
                                Last checked: {status.lastChecked.toLocaleTimeString()}
                            </p>
                        </div>
                        <StatusIndicator status={status.status} />
                    </div>
                </motion.div>

                {/* Metrics */}
                {status.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={cn(
                            "p-4 rounded-xl border",
                            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="w-4 h-4 text-cyan-400" />
                                <span className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>CPU</span>
                            </div>
                            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                                {status.metrics.cpu.toFixed(1)}%
                            </p>
                        </div>
                        <div className={cn(
                            "p-4 rounded-xl border",
                            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <MemoryStick className="w-4 h-4 text-purple-400" />
                                <span className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>Memory</span>
                            </div>
                            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                                {status.metrics.memory.toFixed(0)} MB
                            </p>
                        </div>
                        <div className={cn(
                            "p-4 rounded-xl border",
                            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <Wifi className="w-4 h-4 text-green-400" />
                                <span className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>Latency</span>
                            </div>
                            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                                {status.metrics.latency.toFixed(0)} ms
                            </p>
                        </div>
                        <div className={cn(
                            "p-4 rounded-xl border",
                            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>Uptime</span>
                            </div>
                            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                                {formatUptime(status.metrics.uptime)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Components */}
                <div className="space-y-4">
                    <h3 className={cn(
                        "text-lg font-semibold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        System Components
                    </h3>
                    <div className="space-y-3">
                        {status.components.map((component) => (
                            <ComponentCard
                                key={component.name}
                                {...component}
                                icon={componentIcons[component.name] || Server}
                                isDark={isDark}
                            />
                        ))}
                    </div>
                </div>

                {/* Incidents */}
                {status.incidents.length > 0 && (
                    <div className="space-y-4">
                        <h3 className={cn(
                            "text-lg font-semibold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Recent Incidents
                        </h3>
                        <div className="space-y-3">
                            {status.incidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    className={cn(
                                        "p-4 rounded-xl border",
                                        isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">{incident.title}</h4>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            incident.status === "resolved"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-yellow-500/20 text-yellow-400"
                                        )}>
                                            {incident.status}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-sm",
                                        isDark ? "text-white/60" : "text-gray-600"
                                    )}>
                                        {incident.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No incidents */}
                {status.incidents.length === 0 && status.status === "operational" && (
                    <div className={cn(
                        "p-6 rounded-xl border text-center",
                        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
                    )}>
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className={cn(
                            "font-medium",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            No Active Incidents
                        </p>
                        <p className={cn(
                            "text-sm mt-1",
                            isDark ? "text-white/50" : "text-gray-500"
                        )}>
                            All systems are running smoothly
                        </p>
                    </div>
                )}

                {/* Footer Links */}
                <div className="flex items-center justify-center gap-4 pt-8">
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]"
                        )}
                    >
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                    </Link>
                    <Link
                        href="/changelog"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]"
                        )}
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Changelog</span>
                    </Link>
                </div>
            </div>

            {/* Navigation */}
            <NavLiquidGlass />
        </div>
    );
}
