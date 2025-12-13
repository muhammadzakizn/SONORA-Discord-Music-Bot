"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Activity,
    Clock,
    Zap,
    Info,
    AlertCircle,
    Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface ComponentInfo {
    name: string;
    status: "online" | "warning" | "offline";
    latency?: number;
    message?: string;
    description?: string;
    details?: string[];
    issues?: string[];
    lastChecked?: string;
}

interface ComponentStatusDialogProps {
    isOpen: boolean;
    onClose: () => void;
    component: ComponentInfo | null;
}

// Component descriptions and details
export const componentDescriptions: Record<string, { description: string; details: string[] }> = {
    "Discord Bot": {
        description: "Bot Discord utama yang menjalankan semua perintah musik dan interaksi dengan pengguna. Menggunakan Discord.py untuk koneksi ke Discord Gateway.",
        details: [
            "Menangani semua perintah slash dan prefix",
            "Terhubung ke Discord Gateway via WebSocket",
            "Mengelola sesi suara di semua server",
            "Memproses antrian musik dan pemutaran"
        ]
    },
    "Database (SQLite)": {
        description: "Database lokal SQLite untuk menyimpan pengaturan server, riwayat lagu, dan data pengguna. Ringan dan tidak memerlukan server terpisah.",
        details: [
            "Menyimpan pengaturan per-server",
            "Melacak riwayat pemutaran lagu",
            "Mengelola preferensi pengguna",
            "Mendukung backup otomatis"
        ]
    },
    "Web API": {
        description: "Flask REST API yang menyediakan endpoint untuk dashboard web. Menghubungkan frontend Next.js dengan bot Discord.",
        details: [
            "Menyediakan endpoint untuk statistik",
            "Menangani autentikasi developer",
            "Mendukung kontrol bot jarak jauh",
            "CORS enabled untuk keamanan"
        ]
    },
    "Voice Engine": {
        description: "Engine pemutaran audio yang menangani streaming musik ke voice channel Discord. Menggunakan FFmpeg untuk processing audio.",
        details: [
            "Streaming audio real-time ke Discord",
            "Mendukung Opus codec untuk kualitas tinggi",
            "Volume control per-server",
            "Auto-reconnect jika koneksi terputus"
        ]
    },
    "Cache System": {
        description: "Sistem cache multi-layer untuk menyimpan file audio yang diunduh, artwork, dan metadata. Menghemat bandwidth dan mempercepat pemutaran.",
        details: [
            "Cache audio dengan batas 2GB",
            "Auto-cleanup file >3 hari tidak terpakai",
            "Cache artwork album dan track",
            "Cache metadata untuk respons cepat"
        ]
    },
    "Spotify API": {
        description: "Integrasi dengan Spotify Web API untuk mengambil metadata lagu, playlist, dan album. Memerlukan Client ID dan Secret.",
        details: [
            "Mengambil metadata lagu dari Spotify",
            "Mendukung link playlist dan album",
            "Auto-refresh token OAuth",
            "Rate limiting untuk menghindari ban"
        ]
    },
    "YouTube API": {
        description: "Menggunakan yt-dlp untuk mengekstrak dan mengunduh audio dari YouTube. Tidak memerlukan API key resmi.",
        details: [
            "Mengunduh audio dari YouTube Music",
            "Mendukung pencarian lagu",
            "Konversi otomatis ke Opus",
            "Cookie support untuk konten terbatas"
        ]
    },
    "Apple Music": {
        description: "Integrasi dengan Apple Music menggunakan cookies untuk mengakses katalog musik. Memerlukan autentikasi cookie.",
        details: [
            "Mengambil metadata dari Apple Music",
            "Mendukung link lagu dan album",
            "Cookie-based authentication",
            "Fallback ke YouTube Music untuk audio"
        ]
    }
};

export function ComponentStatusDialog({ isOpen, onClose, component }: ComponentStatusDialogProps) {
    const { isDark } = useSettings();

    if (!component) return null;

    const info = componentDescriptions[component.name] || {
        description: "Komponen sistem SONORA Bot.",
        details: []
    };

    const getStatusIcon = () => {
        switch (component.status) {
            case "online":
                return <CheckCircle className="w-8 h-8 text-green-400" />;
            case "warning":
                return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
            case "offline":
                return <XCircle className="w-8 h-8 text-rose-400" />;
        }
    };

    const getStatusText = () => {
        switch (component.status) {
            case "online":
                return "Berjalan Normal";
            case "warning":
                return "Perlu Perhatian";
            case "offline":
                return "Offline / Error";
        }
    };

    const getStatusColor = () => {
        switch (component.status) {
            case "online":
                return "text-green-400";
            case "warning":
                return "text-yellow-400";
            case "offline":
                return "text-rose-400";
        }
    };

    const getStatusBg = () => {
        switch (component.status) {
            case "online":
                return "bg-green-500/20";
            case "warning":
                return "bg-yellow-500/20";
            case "offline":
                return "bg-rose-500/20";
        }
    };

    // Get issues for non-online status
    const getIssues = () => {
        if (component.status === "online") return [];
        if (component.issues && component.issues.length > 0) return component.issues;

        // Default issues based on component type
        switch (component.name) {
            case "Cache System":
                if (component.status === "warning") {
                    return ["Cache mendekati batas kapasitas", "Pertimbangkan untuk membersihkan cache lama"];
                }
                return ["Cache system error", "Periksa disk space dan permissions"];
            case "Discord Bot":
                return ["Koneksi ke Discord Gateway terputus", "Periksa token bot dan koneksi internet"];
            case "Database (SQLite)":
                return ["Tidak dapat terhubung ke database", "Periksa file bot.db dan permissions"];
            case "Web API":
                return ["API server tidak merespons", "Periksa port 5000 dan firewall"];
            case "Voice Engine":
                return ["FFmpeg tidak ditemukan", "Pastikan FFmpeg terinstall dengan benar"];
            case "Spotify API":
                return ["Token Spotify expired", "Refresh credentials di .env file"];
            case "YouTube API":
                return ["yt-dlp perlu diupdate", "Jalankan: pip install -U yt-dlp"];
            case "Apple Music":
                return ["Cookie Apple Music expired", "Update cookie di folder cookies/"];
            default:
                return ["Komponen mengalami masalah"];
        }
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
                            "relative rounded-2xl border max-w-md w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto",
                            isDark
                                ? "bg-zinc-900 border-zinc-800"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "absolute top-4 right-4 transition-colors",
                                isDark ? "text-zinc-500 hover:text-white" : "text-gray-400 hover:text-gray-700"
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header with Icon */}
                        <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-xl", getStatusBg())}>
                                {getStatusIcon()}
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl font-bold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    {component.name}
                                </h2>
                                <p className={cn("text-sm font-medium", getStatusColor())}>
                                    {getStatusText()}
                                </p>
                            </div>
                        </div>

                        {/* Status Message */}
                        {component.message && (
                            <div className={cn(
                                "flex items-center gap-2 text-sm px-3 py-2 rounded-lg",
                                isDark ? "bg-white/5" : "bg-gray-100"
                            )}>
                                <Activity className="w-4 h-4 text-cyan-400" />
                                <span className={isDark ? "text-white/70" : "text-gray-600"}>
                                    {component.message}
                                </span>
                            </div>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-3">
                            {component.latency !== undefined && (
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    isDark ? "bg-white/5" : "bg-gray-100"
                                )}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        <span className={cn(
                                            "text-xs",
                                            isDark ? "text-white/50" : "text-gray-500"
                                        )}>Latency</span>
                                    </div>
                                    <p className={cn(
                                        "text-lg font-mono font-bold",
                                        component.latency > 100 ? "text-rose-400" :
                                            component.latency > 50 ? "text-yellow-400" : "text-green-400"
                                    )}>
                                        {component.latency}ms
                                    </p>
                                </div>
                            )}
                            <div className={cn(
                                "p-3 rounded-xl",
                                isDark ? "bg-white/5" : "bg-gray-100"
                            )}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    <span className={cn(
                                        "text-xs",
                                        isDark ? "text-white/50" : "text-gray-500"
                                    )}>Last Check</span>
                                </div>
                                <p className={cn(
                                    "text-sm font-medium",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    {component.lastChecked || "Just now"}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-white/5" : "bg-gray-50"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4 text-cyan-400" />
                                <span className={cn(
                                    "text-sm font-medium",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Deskripsi</span>
                            </div>
                            <p className={cn(
                                "text-sm leading-relaxed",
                                isDark ? "text-white/60" : "text-gray-600"
                            )}>
                                {info.description}
                            </p>
                        </div>

                        {/* Features */}
                        {info.details.length > 0 && (
                            <div>
                                <h3 className={cn(
                                    "text-sm font-medium mb-2 flex items-center gap-2",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    Fitur & Fungsi
                                </h3>
                                <ul className="space-y-1">
                                    {info.details.map((detail, i) => (
                                        <li
                                            key={i}
                                            className={cn(
                                                "text-sm flex items-start gap-2",
                                                isDark ? "text-white/60" : "text-gray-600"
                                            )}
                                        >
                                            <span className="text-cyan-400">•</span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Issues (if not online) */}
                        {component.status !== "online" && (
                            <div className={cn(
                                "p-4 rounded-xl border",
                                component.status === "warning"
                                    ? "bg-yellow-500/10 border-yellow-500/30"
                                    : "bg-rose-500/10 border-rose-500/30"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className={cn(
                                        "w-4 h-4",
                                        component.status === "warning" ? "text-yellow-400" : "text-rose-400"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        component.status === "warning" ? "text-yellow-400" : "text-rose-400"
                                    )}>
                                        {component.status === "warning" ? "Peringatan" : "Masalah Terdeteksi"}
                                    </span>
                                </div>
                                <ul className="space-y-1">
                                    {getIssues().map((issue, i) => (
                                        <li
                                            key={i}
                                            className={cn(
                                                "text-sm flex items-start gap-2",
                                                component.status === "warning" ? "text-yellow-300/80" : "text-rose-300/80"
                                            )}
                                        >
                                            <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                                            {issue}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Footer */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "w-full py-3 rounded-xl font-medium transition-colors",
                                isDark
                                    ? "bg-white/10 hover:bg-white/15 text-white"
                                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            )}
                        >
                            Tutup
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
