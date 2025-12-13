"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Power,
    RefreshCw,
    Pause,
    Play,
    Wrench,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Shield,
    Volume2,
    VolumeX,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface ActionState {
    loading: boolean;
    success?: boolean;
    error?: string;
}

export default function ControlsPage() {
    const { isDark } = useSettings();
    const router = useRouter();
    const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);

    const setActionState = (action: string, state: ActionState) => {
        setActionStates(prev => ({ ...prev, [action]: state }));
        if (state.success || state.error) {
            setTimeout(() => {
                setActionStates(prev => ({ ...prev, [action]: { loading: false } }));
            }, 3000);
        }
    };

    // Use internal Next.js API proxy to Flask backend
    const API_BASE = '/api/bot';

    const handleAction = async (action: string, endpoint: string, method: string = 'POST') => {
        setActionState(action, { loading: true });
        try {
            // Convert endpoint from /api/admin/xxx to /admin/xxx for proxy
            const cleanEndpoint = endpoint.replace(/^\/api\//, '/');
            const fullEndpoint = `${API_BASE}${cleanEndpoint}`;
            const response = await fetch(fullEndpoint, { method });
            const data = await response.json();

            if (response.ok) {
                setActionState(action, { loading: false, success: true });
                if (action === 'maintenance') {
                    setMaintenanceMode(!maintenanceMode);
                }
            } else {
                setActionState(action, { loading: false, error: data.error || 'Action failed' });
            }
        } catch (err) {
            setActionState(action, { loading: false, error: 'Network error' });
        }
    };

    const confirmAction = (action: string) => {
        setShowConfirmDialog(action);
    };

    const executeConfirmedAction = () => {
        if (!showConfirmDialog) return;

        switch (showConfirmDialog) {
            case 'shutdown':
                handleAction('shutdown', '/api/admin/shutdown');
                break;
            case 'restart':
                handleAction('restart', '/api/admin/bot/restart');
                break;
            case 'pause':
                handleAction('pause', '/api/admin/bot/pause');
                break;
            case 'resume':
                handleAction('resume', '/api/admin/bot/resume');
                break;
            case 'maintenance':
                handleAction('maintenance', '/api/admin/maintenance');
                break;
        }
        setShowConfirmDialog(null);
    };

    const getButtonState = (action: string) => actionStates[action] || { loading: false };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl",
                    isDark ? "bg-yellow-500/20" : "bg-yellow-500/10"
                )}>
                    <Power className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                    <h1 className={cn(
                        "text-2xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        Bot Controls
                    </h1>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Manage bot power state and system operations
                    </p>
                </div>
            </div>

            {/* Warning Banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-4 rounded-xl border-2 flex items-start gap-3",
                    "bg-yellow-500/10 border-yellow-500/30"
                )}
            >
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-yellow-500">System Controls</h3>
                    <p className={cn(
                        "text-sm mt-1",
                        isDark ? "text-white/60" : "text-gray-600"
                    )}>
                        These controls affect the bot globally. Shutdown and restart will disconnect all voice connections.
                        Use with caution.
                    </p>
                </div>
            </motion.div>

            {/* Control Cards Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Shutdown */}
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
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-rose-500/20">
                                <Power className="w-6 h-6 text-rose-400" />
                            </div>
                            <div>
                                <h3 className={cn(
                                    "font-semibold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Shutdown Bot</h3>
                                <p className={cn(
                                    "text-sm",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Gracefully shutdown the bot
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => confirmAction('shutdown')}
                        disabled={getButtonState('shutdown').loading}
                        className={cn(
                            "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                            getButtonState('shutdown').success
                                ? "bg-green-500 text-white"
                                : getButtonState('shutdown').error
                                    ? "bg-rose-500 text-white"
                                    : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                        )}
                    >
                        {getButtonState('shutdown').loading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : getButtonState('shutdown').success ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Shutting down...
                            </>
                        ) : getButtonState('shutdown').error ? (
                            <>
                                <XCircle className="w-5 h-5" />
                                {getButtonState('shutdown').error}
                            </>
                        ) : (
                            <>
                                <Power className="w-5 h-5" />
                                Shutdown
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Restart */}
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
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-yellow-500/20">
                                <RefreshCw className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className={cn(
                                    "font-semibold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Restart Bot</h3>
                                <p className={cn(
                                    "text-sm",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Restart and rebuild connections
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => confirmAction('restart')}
                        disabled={getButtonState('restart').loading}
                        className={cn(
                            "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                            getButtonState('restart').success
                                ? "bg-green-500 text-white"
                                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        )}
                    >
                        {getButtonState('restart').loading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : getButtonState('restart').success ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Restarting...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Restart
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Pause All */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                        "p-6 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-orange-500/20">
                                <Pause className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                                <h3 className={cn(
                                    "font-semibold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Pause All Playback</h3>
                                <p className={cn(
                                    "text-sm",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Pause music in all servers
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => handleAction('pause', '/api/admin/bot/pause')}
                        disabled={getButtonState('pause').loading}
                        className={cn(
                            "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                            getButtonState('pause').success
                                ? "bg-green-500 text-white"
                                : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                        )}
                    >
                        {getButtonState('pause').loading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : getButtonState('pause').success ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Paused All
                            </>
                        ) : (
                            <>
                                <VolumeX className="w-5 h-5" />
                                Pause All
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Resume All */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={cn(
                        "p-6 rounded-2xl border",
                        isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                    )}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-green-500/20">
                                <Play className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className={cn(
                                    "font-semibold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>Resume All Playback</h3>
                                <p className={cn(
                                    "text-sm",
                                    isDark ? "text-white/50" : "text-gray-500"
                                )}>
                                    Resume music in all servers
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => handleAction('resume', '/api/admin/bot/resume')}
                        disabled={getButtonState('resume').loading}
                        className={cn(
                            "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                            getButtonState('resume').success
                                ? "bg-green-500 text-white"
                                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        )}
                    >
                        {getButtonState('resume').loading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : getButtonState('resume').success ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Resumed All
                            </>
                        ) : (
                            <>
                                <Volume2 className="w-5 h-5" />
                                Resume All
                            </>
                        )}
                    </button>
                </motion.div>
            </div>

            {/* Maintenance Mode Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={cn(
                    "p-6 rounded-2xl border",
                    maintenanceMode
                        ? "bg-purple-500/10 border-purple-500/30"
                        : isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                )}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-3 rounded-xl",
                            maintenanceMode ? "bg-purple-500/30" : "bg-purple-500/20"
                        )}>
                            <Wrench className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className={cn(
                                "font-semibold flex items-center gap-2",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                Maintenance Mode
                                {maintenanceMode && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500 text-white">
                                        ACTIVE
                                    </span>
                                )}
                            </h3>
                            <p className={cn(
                                "text-sm",
                                isDark ? "text-white/50" : "text-gray-500"
                            )}>
                                {maintenanceMode
                                    ? "Bot is currently in maintenance mode. Commands are disabled."
                                    : "Enable to disable all commands temporarily for maintenance."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/developer/maintenance')}
                        className={cn(
                            "px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2",
                            maintenanceMode
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        )}
                    >
                        <Wrench className="w-5 h-5" />
                        {maintenanceMode ? "Manage Maintenance" : "Enable Maintenance"}
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConfirmDialog(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-md p-6 rounded-2xl",
                                isDark
                                    ? "bg-zinc-900 border border-white/10"
                                    : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-yellow-500/20">
                                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className={cn(
                                        "text-lg font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>Confirm Action</h3>
                                    <p className={cn(
                                        "text-sm",
                                        isDark ? "text-white/50" : "text-gray-500"
                                    )}>
                                        {showConfirmDialog === 'shutdown' && "Are you sure you want to shutdown the bot?"}
                                        {showConfirmDialog === 'restart' && "Are you sure you want to restart the bot?"}
                                        {showConfirmDialog === 'maintenance' && (
                                            maintenanceMode
                                                ? "Are you sure you want to disable maintenance mode?"
                                                : "Are you sure you want to enable maintenance mode?"
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmDialog(null)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl font-medium transition-colors",
                                        isDark
                                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeConfirmedAction}
                                    className="flex-1 py-2.5 rounded-xl font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
