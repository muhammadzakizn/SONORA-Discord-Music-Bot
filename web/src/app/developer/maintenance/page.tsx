"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wrench,
    Clock,
    CheckCircle,
    AlertTriangle,
    Save,
    Send,
    RefreshCw,
    History,
    Globe,
    MessageSquare,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface MaintenanceLog {
    id: string;
    startTime: string;
    endTime?: string;
    reason: string;
    progress: number;
    stage: string;
    completed: boolean;
}

const MAINTENANCE_STAGES = [
    { value: "starting", label: "Starting Maintenance" },
    { value: "backup", label: "Creating Backups" },
    { value: "updating", label: "Applying Updates" },
    { value: "testing", label: "Testing Systems" },
    { value: "finalizing", label: "Finalizing Changes" },
    { value: "complete", label: "Completing" },
];

export default function MaintenancePage() {
    const { isDark } = useSettings();
    const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
    const [reason, setReason] = useState("");
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState("starting");
    const [statusMessage, setStatusMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<MaintenanceLog[]>([
        {
            id: "1",
            startTime: "2024-12-12T10:00:00Z",
            endTime: "2024-12-12T10:30:00Z",
            reason: "System update v3.4.0",
            progress: 100,
            stage: "complete",
            completed: true,
        },
        {
            id: "2",
            startTime: "2024-12-10T14:00:00Z",
            endTime: "2024-12-10T14:15:00Z",
            reason: "Database optimization",
            progress: 100,
            stage: "complete",
            completed: true,
        },
    ]);
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completionReason, setCompletionReason] = useState("");

    const handleActivateMaintenance = () => {
        if (!reason.trim()) return;

        setIsMaintenanceActive(true);
        setProgress(0);
        setStage("starting");

        // Add to logs
        const newLog: MaintenanceLog = {
            id: Date.now().toString(),
            startTime: new Date().toISOString(),
            reason: reason,
            progress: 0,
            stage: "starting",
            completed: false,
        };
        setLogs(prev => [newLog, ...prev]);
    };

    const handleSaveProgress = async () => {
        setIsSaving(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update current log
        setLogs(prev => prev.map((log, idx) =>
            idx === 0 && !log.completed
                ? { ...log, progress, stage, reason }
                : log
        ));

        setIsSaving(false);
        setStatusMessage("Progress saved successfully!");
        setTimeout(() => setStatusMessage(""), 3000);
    };

    const handleCompleteMaintenance = async () => {
        if (!completionReason.trim()) return;

        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Complete maintenance
        setIsMaintenanceActive(false);
        setProgress(100);
        setStage("complete");

        // Update log
        setLogs(prev => prev.map((log, idx) =>
            idx === 0 && !log.completed
                ? { ...log, endTime: new Date().toISOString(), progress: 100, stage: "complete", completed: true }
                : log
        ));

        setShowCompleteDialog(false);
        setCompletionReason("");
        setReason("");
        setIsSaving(false);
        setStatusMessage("Maintenance completed successfully!");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl",
                    isMaintenanceActive ? "bg-yellow-500/20" : "bg-purple-500/20"
                )}>
                    <Wrench className={cn(
                        "w-6 h-6",
                        isMaintenanceActive ? "text-yellow-400" : "text-purple-400"
                    )} />
                </div>
                <div>
                    <h1 className={cn(
                        "text-2xl font-bold flex items-center gap-3",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        Maintenance Mode
                        {isMaintenanceActive && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500 text-black font-semibold animate-pulse">
                                ACTIVE
                            </span>
                        )}
                    </h1>
                    <p className={isDark ? "text-white/50" : "text-gray-500"}>
                        Manage system maintenance and display progress to users
                    </p>
                </div>
            </div>

            {/* Status Message */}
            <AnimatePresence>
                {statusMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-center"
                    >
                        {statusMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Maintenance Control Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-6 rounded-2xl border",
                    isMaintenanceActive
                        ? "bg-yellow-500/5 border-yellow-500/30"
                        : isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                )}
            >
                {!isMaintenanceActive ? (
                    /* Activate Maintenance */
                    <div className="space-y-4">
                        <h2 className={cn(
                            "text-lg font-semibold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Start Maintenance
                        </h2>
                        <div>
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Reason for Maintenance *
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Applying system updates, database optimization..."
                                rows={3}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white focus:border-purple-500"
                                        : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-purple-500"
                                )}
                            />
                        </div>
                        <button
                            onClick={handleActivateMaintenance}
                            disabled={!reason.trim()}
                            className={cn(
                                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                reason.trim()
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            <Wrench className="w-5 h-5" />
                            Activate Maintenance Mode
                        </button>
                    </div>
                ) : (
                    /* Active Maintenance Dashboard */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className={cn(
                                "text-lg font-semibold text-yellow-400"
                            )}>
                                Maintenance in Progress
                            </h2>
                            <div className="flex items-center gap-2 text-yellow-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Started: {new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>

                        {/* Progress */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-sm font-medium",
                                    isDark ? "text-white/70" : "text-gray-700"
                                )}>
                                    Progress
                                </span>
                                <span className="text-yellow-400 font-bold">{progress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => setProgress(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-700 accent-yellow-500"
                            />
                        </div>

                        {/* Stage */}
                        <div>
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Current Stage
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {MAINTENANCE_STAGES.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() => setStage(s.value)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            stage === s.value
                                                ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50"
                                                : isDark
                                                    ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason Update */}
                        <div>
                            <label className={cn(
                                "block text-sm font-medium mb-2",
                                isDark ? "text-white/70" : "text-gray-700"
                            )}>
                                Status Message (visible to users)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                    isDark
                                        ? "bg-zinc-800 border border-zinc-700 text-white focus:border-yellow-500"
                                        : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-yellow-500"
                                )}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveProgress}
                                disabled={isSaving}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                    "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                )}
                            >
                                {isSaving ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                Save Progress
                            </button>
                            <button
                                onClick={() => setShowCompleteDialog(true)}
                                className="flex-1 py-3 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Complete
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                    "p-4 rounded-xl border flex items-start gap-3",
                    "bg-blue-500/10 border-blue-500/30"
                )}
            >
                <Globe className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-blue-400">Status Page Integration</h3>
                    <p className={cn(
                        "text-sm mt-1",
                        isDark ? "text-white/60" : "text-gray-600"
                    )}>
                        Maintenance status is automatically displayed on the SONORA Status Page.
                        Users who try to use bot commands will receive the current progress update.
                    </p>
                </div>
            </motion.div>

            {/* Maintenance History */}
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
                <h2 className={cn(
                    "text-lg font-semibold mb-4 flex items-center gap-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    <History className="w-5 h-5 text-purple-400" />
                    Maintenance History
                </h2>
                <div className="space-y-3">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={cn(
                                "p-4 rounded-xl border",
                                log.completed
                                    ? isDark ? "bg-green-500/5 border-green-500/20" : "bg-green-50 border-green-200"
                                    : isDark ? "bg-yellow-500/5 border-yellow-500/20" : "bg-yellow-50 border-yellow-200"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className={cn(
                                        "font-medium",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {log.reason}
                                    </p>
                                    <p className={cn(
                                        "text-sm mt-1",
                                        isDark ? "text-white/50" : "text-gray-500"
                                    )}>
                                        {new Date(log.startTime).toLocaleString()}
                                        {log.endTime && ` → ${new Date(log.endTime).toLocaleString()}`}
                                    </p>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    log.completed
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-yellow-500/20 text-yellow-400"
                                )}>
                                    {log.completed ? "Completed" : `${log.progress}%`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Complete Maintenance Dialog */}
            <AnimatePresence>
                {showCompleteDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCompleteDialog(false)}
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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={cn(
                                    "text-lg font-bold",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    Complete Maintenance
                                </h3>
                                <button
                                    onClick={() => setShowCompleteDialog(false)}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mb-4">
                                <label className={cn(
                                    "block text-sm font-medium mb-2",
                                    isDark ? "text-white/70" : "text-gray-700"
                                )}>
                                    Completion Summary *
                                </label>
                                <textarea
                                    value={completionReason}
                                    onChange={(e) => setCompletionReason(e.target.value)}
                                    placeholder="What was completed during this maintenance?"
                                    rows={3}
                                    className={cn(
                                        "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                        isDark
                                            ? "bg-zinc-800 border border-zinc-700 text-white"
                                            : "bg-gray-100 border border-gray-200 text-gray-900"
                                    )}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCompleteDialog(false)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl font-medium",
                                        isDark
                                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteMaintenance}
                                    disabled={!completionReason.trim() || isSaving}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                                        completionReason.trim()
                                            ? "bg-green-500 text-white hover:bg-green-600"
                                            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                    )}
                                >
                                    {isSaving ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Complete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
