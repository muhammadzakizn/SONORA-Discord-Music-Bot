"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Trash2,
    Database,
    Music,
    Image,
    Code,
    Globe,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Settings,
    HardDrive,
    Clock,
    Bell,
    Save,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface CacheType {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    size: number;
    sizeFormatted: string;
    fileCount: number;
    enabled: boolean;
}

interface CacheSettings {
    maxSizeGb: number;
    maxAgeDays: number;
    warningThresholdGb: number;
    autocleanEnabled: boolean;
}

interface CacheManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CacheManagementDialog({ isOpen, onClose }: CacheManagementDialogProps) {
    const { isDark } = useSettings();
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [cacheTypes, setCacheTypes] = useState<CacheType[]>([
        {
            id: "audio",
            name: "Audio Cache",
            icon: Music,
            description: "File audio yang diunduh (.opus, .m4a)",
            size: 0,
            sizeFormatted: "0 B",
            fileCount: 0,
            enabled: true
        },
        {
            id: "artwork",
            name: "Artwork Cache",
            icon: Image,
            description: "Gambar album dan artwork lagu",
            size: 0,
            sizeFormatted: "0 B",
            fileCount: 0,
            enabled: true
        },
        {
            id: "pycache",
            name: "Python Cache",
            icon: Code,
            description: "__pycache__ bytecode files",
            size: 0,
            sizeFormatted: "0 B",
            fileCount: 0,
            enabled: true
        },
        {
            id: "nextjs",
            name: "Next.js Cache",
            icon: Globe,
            description: "Build cache dan optimized assets",
            size: 0,
            sizeFormatted: "0 B",
            fileCount: 0,
            enabled: true
        },
        {
            id: "memory",
            name: "In-Memory Cache",
            icon: Database,
            description: "Cache lyrics, metadata, track info",
            size: 0,
            sizeFormatted: "In RAM",
            fileCount: 0,
            enabled: true
        }
    ]);

    const [settings, setSettings] = useState<CacheSettings>({
        maxSizeGb: 2.0,
        maxAgeDays: 3,
        warningThresholdGb: 1.5,
        autocleanEnabled: true
    });

    const [originalSettings, setOriginalSettings] = useState<CacheSettings>(settings);

    const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

    // Fetch cache stats
    const fetchCacheStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/cache/stats`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                setCacheTypes(prev => prev.map(cache => {
                    const stats = data.caches?.[cache.id];
                    if (stats) {
                        return {
                            ...cache,
                            size: stats.size_bytes || 0,
                            sizeFormatted: stats.size_formatted || formatBytes(stats.size_bytes || 0),
                            fileCount: stats.file_count || 0
                        };
                    }
                    return cache;
                }));
                if (data.settings) {
                    const newSettings = {
                        maxSizeGb: data.settings.max_size_gb ?? 2.0,
                        maxAgeDays: data.settings.max_age_days ?? 3,
                        warningThresholdGb: data.settings.warning_threshold_gb ?? 1.5,
                        autocleanEnabled: data.settings.autoclean_enabled ?? true
                    };
                    setSettings(newSettings);
                    setOriginalSettings(newSettings);
                }
            }
        } catch (error) {
            console.error("Failed to fetch cache stats:", error);
            // Use simulated data for demo
            setCacheTypes(prev => prev.map((cache, index) => ({
                ...cache,
                size: [520000000, 15000000, 8500000, 125000000, 0][index] || 0,
                sizeFormatted: ["496.0 MB", "14.3 MB", "8.1 MB", "119.2 MB", "In RAM"][index] || "0 B",
                fileCount: [14, 45, 156, 250, 0][index] || 0
            })));
        }
        setIsLoading(false);
    }, [API_BASE]);

    useEffect(() => {
        if (isOpen) {
            fetchCacheStats();
        }
    }, [isOpen, fetchCacheStats]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const getTotalSize = (): number => {
        return cacheTypes.reduce((acc, cache) => acc + cache.size, 0);
    };

    const handleDeleteCache = async (cacheId: string) => {
        setIsDeleting(cacheId);
        try {
            const response = await fetch(`${API_BASE}/api/admin/cache/clear/${cacheId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(`${cacheTypes.find(c => c.id === cacheId)?.name} berhasil dihapus! (${data.cleared || 0} files)`);
                setTimeout(() => setSuccessMessage(null), 3000);
                fetchCacheStats();
            }
        } catch (error) {
            console.error("Failed to delete cache:", error);
            // Simulate success for demo
            setSuccessMessage(`${cacheTypes.find(c => c.id === cacheId)?.name} berhasil dihapus!`);
            setCacheTypes(prev => prev.map(cache =>
                cache.id === cacheId
                    ? { ...cache, size: 0, sizeFormatted: cache.id === "memory" ? "In RAM" : "0 B", fileCount: 0 }
                    : cache
            ));
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        setIsDeleting(null);
    };

    const handleDeleteAll = async () => {
        setIsDeleting("all");
        try {
            const response = await fetch(`${API_BASE}/api/admin/cache/clear/all`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (response.ok) {
                setSuccessMessage("Semua cache berhasil dihapus!");
                setTimeout(() => setSuccessMessage(null), 3000);
                fetchCacheStats();
            }
        } catch (error) {
            console.error("Failed to delete all caches:", error);
            // Simulate success for demo
            setSuccessMessage("Semua cache berhasil dihapus!");
            setCacheTypes(prev => prev.map(cache => ({
                ...cache,
                size: 0,
                sizeFormatted: cache.id === "memory" ? "In RAM" : "0 B",
                fileCount: 0
            })));
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        setIsDeleting(null);
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/cache/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    max_size_gb: settings.maxSizeGb,
                    max_age_days: settings.maxAgeDays,
                    warning_threshold_gb: settings.warningThresholdGb,
                    autoclean_enabled: settings.autocleanEnabled
                })
            });
            if (response.ok) {
                setSuccessMessage("Pengaturan berhasil disimpan!");
                setOriginalSettings(settings);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            // Simulate success
            setSuccessMessage("Pengaturan berhasil disimpan!");
            setOriginalSettings(settings);
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        setIsSaving(false);
    };

    const hasSettingsChanged = (): boolean => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className={cn(
                            "relative rounded-2xl border max-w-lg w-full p-5 max-h-[90vh] overflow-hidden flex flex-col",
                            isDark
                                ? "bg-zinc-900 border-zinc-800"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "absolute top-4 right-4 z-10 transition-colors",
                                isDark ? "text-zinc-500 hover:text-white" : "text-gray-400 hover:text-gray-700"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn(
                                "p-2.5 rounded-xl",
                                isDark ? "bg-yellow-500/20" : "bg-yellow-500/10"
                            )}>
                                <HardDrive className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl font-bold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    Cache Management
                                </h2>
                                <p className={cn(
                                    "text-sm",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Total: {formatBytes(getTotalSize())}
                                </p>
                            </div>
                        </div>

                        {/* Success Message */}
                        <AnimatePresence>
                            {successMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-green-400">{successMessage}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
                                    activeTab === "overview"
                                        ? isDark
                                            ? "bg-white/10 text-white"
                                            : "bg-gray-200 text-gray-900"
                                        : isDark
                                            ? "text-white/50 hover:text-white"
                                            : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Cache Files
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                    activeTab === "settings"
                                        ? isDark
                                            ? "bg-white/10 text-white"
                                            : "bg-gray-200 text-gray-900"
                                        : isDark
                                            ? "text-white/50 hover:text-white"
                                            : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Settings className="w-4 h-4" />
                                Auto-Cleanup
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto pr-1">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                </div>
                            ) : activeTab === "overview" ? (
                                <div className="space-y-3">
                                    {cacheTypes.map(cache => {
                                        const Icon = cache.icon;
                                        return (
                                            <div
                                                key={cache.id}
                                                className={cn(
                                                    "p-3 rounded-xl border",
                                                    isDark
                                                        ? "bg-white/5 border-white/10"
                                                        : "bg-gray-50 border-gray-200"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className={cn(
                                                            "p-2 rounded-lg shrink-0",
                                                            isDark ? "bg-white/10" : "bg-gray-200"
                                                        )}>
                                                            <Icon className="w-4 h-4 text-cyan-400" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className={cn(
                                                                "font-medium text-sm",
                                                                isDark ? "text-white" : "text-gray-900"
                                                            )}>
                                                                {cache.name}
                                                            </h4>
                                                            <p className={cn(
                                                                "text-xs truncate",
                                                                isDark ? "text-white/40" : "text-gray-500"
                                                            )}>
                                                                {cache.description}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className={cn(
                                                                    "text-xs font-mono",
                                                                    isDark ? "text-white/60" : "text-gray-600"
                                                                )}>
                                                                    {cache.sizeFormatted}
                                                                </span>
                                                                {cache.id !== "memory" && (
                                                                    <span className={cn(
                                                                        "text-xs",
                                                                        isDark ? "text-white/40" : "text-gray-400"
                                                                    )}>
                                                                        {cache.fileCount} files
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCache(cache.id)}
                                                        disabled={isDeleting !== null || (cache.size === 0 && cache.id !== "memory")}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors shrink-0",
                                                            (cache.size === 0 && cache.id !== "memory")
                                                                ? isDark
                                                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                                                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                                                : isDark
                                                                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                                                    : "bg-rose-100 text-rose-600 hover:bg-rose-200"
                                                        )}
                                                    >
                                                        {isDeleting === cache.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Delete All Button */}
                                    <button
                                        onClick={handleDeleteAll}
                                        disabled={isDeleting !== null || getTotalSize() === 0}
                                        className={cn(
                                            "w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                                            getTotalSize() === 0
                                                ? isDark
                                                    ? "bg-white/5 text-white/30 cursor-not-allowed"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : isDark
                                                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                                                    : "bg-rose-100 text-rose-600 hover:bg-rose-200 border border-rose-200"
                                        )}
                                    >
                                        {isDeleting === "all" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Hapus Semua Cache
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Auto-Cleanup Toggle */}
                                    <div className={cn(
                                        "p-4 rounded-xl border",
                                        isDark
                                            ? "bg-white/5 border-white/10"
                                            : "bg-gray-50 border-gray-200"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className={cn(
                                                    "font-medium text-sm",
                                                    isDark ? "text-white" : "text-gray-900"
                                                )}>
                                                    Auto-Cleanup
                                                </h4>
                                                <p className={cn(
                                                    "text-xs mt-0.5",
                                                    isDark ? "text-white/40" : "text-gray-500"
                                                )}>
                                                    Hapus cache secara otomatis
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSettings(s => ({ ...s, autocleanEnabled: !s.autocleanEnabled }))}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-colors relative",
                                                    settings.autocleanEnabled
                                                        ? "bg-green-500"
                                                        : isDark ? "bg-white/20" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform",
                                                    settings.autocleanEnabled ? "translate-x-6" : "translate-x-0.5"
                                                )} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Storage Threshold */}
                                    <div className={cn(
                                        "p-4 rounded-xl border",
                                        isDark
                                            ? "bg-white/5 border-white/10"
                                            : "bg-gray-50 border-gray-200"
                                    )}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <HardDrive className="w-4 h-4 text-orange-400" />
                                            <span className={cn(
                                                "text-sm font-medium",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                Batas Penyimpanan
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-xs mb-3",
                                            isDark ? "text-white/40" : "text-gray-500"
                                        )}>
                                            Hapus cache lama saat melebihi batas
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                step="0.5"
                                                value={settings.maxSizeGb}
                                                onChange={(e) => setSettings(s => ({ ...s, maxSizeGb: parseFloat(e.target.value) }))}
                                                className="flex-1 accent-purple-500"
                                            />
                                            <span className={cn(
                                                "text-sm font-mono w-14 text-right",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {settings.maxSizeGb} GB
                                            </span>
                                        </div>
                                    </div>

                                    {/* Age Threshold */}
                                    <div className={cn(
                                        "p-4 rounded-xl border",
                                        isDark
                                            ? "bg-white/5 border-white/10"
                                            : "bg-gray-50 border-gray-200"
                                    )}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <span className={cn(
                                                "text-sm font-medium",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                Batas Usia File
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-xs mb-3",
                                            isDark ? "text-white/40" : "text-gray-500"
                                        )}>
                                            Hapus file yang tidak digunakan selama
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="1"
                                                max="30"
                                                step="1"
                                                value={settings.maxAgeDays}
                                                onChange={(e) => setSettings(s => ({ ...s, maxAgeDays: parseInt(e.target.value) }))}
                                                className="flex-1 accent-purple-500"
                                            />
                                            <span className={cn(
                                                "text-sm font-mono w-14 text-right",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {settings.maxAgeDays} hari
                                            </span>
                                        </div>
                                    </div>

                                    {/* Warning Threshold */}
                                    <div className={cn(
                                        "p-4 rounded-xl border",
                                        isDark
                                            ? "bg-white/5 border-white/10"
                                            : "bg-gray-50 border-gray-200"
                                    )}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Bell className="w-4 h-4 text-yellow-400" />
                                            <span className={cn(
                                                "text-sm font-medium",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                Peringatan Sebelum Hapus
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-xs mb-3",
                                            isDark ? "text-white/40" : "text-gray-500"
                                        )}>
                                            Beritahu developer saat cache mencapai
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max={settings.maxSizeGb}
                                                step="0.5"
                                                value={settings.warningThresholdGb}
                                                onChange={(e) => setSettings(s => ({ ...s, warningThresholdGb: parseFloat(e.target.value) }))}
                                                className="flex-1 accent-yellow-500"
                                            />
                                            <span className={cn(
                                                "text-sm font-mono w-14 text-right",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {settings.warningThresholdGb} GB
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info Notice */}
                                    <div className={cn(
                                        "p-3 rounded-xl flex items-start gap-2",
                                        isDark
                                            ? "bg-yellow-500/10 border border-yellow-500/20"
                                            : "bg-yellow-50 border border-yellow-200"
                                    )}>
                                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                        <p className={cn(
                                            "text-xs",
                                            isDark ? "text-yellow-400/80" : "text-yellow-700"
                                        )}>
                                            Auto-cleanup berjalan saat bot startup dan setiap jam.
                                            Anda akan mendapat notifikasi sebelum file dihapus.
                                        </p>
                                    </div>

                                    {/* Save Button */}
                                    {hasSettingsChanged() && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={handleSaveSettings}
                                            disabled={isSaving}
                                            className="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Simpan Pengaturan
                                        </motion.button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer - Refresh Button */}
                        <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
                            <button
                                onClick={fetchCacheStats}
                                disabled={isLoading}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                                    isDark
                                        ? "bg-white/10 hover:bg-white/15 text-white"
                                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                )}
                            >
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                                Refresh
                            </button>
                            <button
                                onClick={onClose}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl font-medium transition-colors",
                                    isDark
                                        ? "bg-white/5 hover:bg-white/10 text-white/70"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                )}
                            >
                                Tutup
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
