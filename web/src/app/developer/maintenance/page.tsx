"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wrench,
    Clock,
    CheckCircle,
    AlertTriangle,
    Save,
    RefreshCw,
    History,
    Globe,
    X,
    Plus,
    Trash2,
    FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface MaintenanceState {
    enabled: boolean;
    reason: string;
    progress: number;
    stage: string;
    stage_label?: string;
    started_at: number | null;
    message_ids: Record<string, Record<string, string>>;
    changelog_items: string[];
    history: Array<{
        reason: string;
        completion_reason: string;
        started_at: number;
        completed_at: number;
        changelog_items: string[];
    }>;
}

const MAINTENANCE_STAGES = [
    { value: "starting", label: "Starting Maintenance" },
    { value: "backup", label: "Creating Backups" },
    { value: "updating", label: "Applying Updates" },
    { value: "testing", label: "Testing Systems" },
    { value: "finalizing", label: "Finalizing Changes" },
    { value: "complete", label: "Completing" },
];

// Use internal Next.js API proxy to Flask backend
const API_BASE = '/api/bot';

export default function MaintenancePage() {
    const { isDark } = useSettings();
    const [state, setState] = useState<MaintenanceState>({
        enabled: false,
        reason: "",
        progress: 0,
        stage: "starting",
        started_at: null,
        message_ids: {},
        changelog_items: [],
        history: []
    });
    const [newReason, setNewReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completionReason, setCompletionReason] = useState("");
    const [newChangelogItem, setNewChangelogItem] = useState("");

    // Fetch maintenance status
    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/status`);
            if (response.ok) {
                const data = await response.json();
                setState(data);
            }
        } catch (error) {
            console.error("Failed to fetch maintenance status:", error);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleActivateMaintenance = async () => {
        if (!newReason.trim()) return;

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: newReason })
            });

            if (response.ok) {
                setStatusMessage("Maintenance mode activated!");
                setNewReason("");
                await fetchStatus();
            } else {
                const error = await response.json();
                setStatusMessage(`Error: ${error.error}`);
            }
        } catch (error) {
            setStatusMessage("Failed to activate maintenance mode");
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMessage(""), 3000);
        }
    };

    const handleSaveProgress = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    progress: state.progress,
                    stage: state.stage,
                    reason: state.reason
                })
            });

            if (response.ok) {
                setStatusMessage("Progress saved successfully!");
            } else {
                const error = await response.json();
                setStatusMessage(`Error: ${error.error}`);
            }
        } catch (error) {
            setStatusMessage("Failed to save progress");
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMessage(""), 3000);
        }
    };

    const handleAddChangelogItem = async () => {
        if (!newChangelogItem.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/changelog-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: newChangelogItem })
            });

            if (response.ok) {
                const data = await response.json();
                setState(prev => ({ ...prev, changelog_items: data.items }));
                setNewChangelogItem("");
            }
        } catch (error) {
            console.error("Failed to add changelog item:", error);
        }
    };

    const handleRemoveChangelogItem = async (item: string) => {
        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/changelog-item`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item })
            });

            if (response.ok) {
                const data = await response.json();
                setState(prev => ({ ...prev, changelog_items: data.items }));
            }
        } catch (error) {
            console.error("Failed to remove changelog item:", error);
        }
    };

    const handleCompleteMaintenance = async () => {
        if (!completionReason.trim()) return;

        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/admin/maintenance/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: completionReason,
                    changelog_items: state.changelog_items
                })
            });

            if (response.ok) {
                setStatusMessage("Maintenance completed successfully!");
                setShowCompleteDialog(false);
                setCompletionReason("");
                await fetchStatus();
            } else {
                const error = await response.json();
                setStatusMessage(`Error: ${error.error}`);
            }
        } catch (error) {
            setStatusMessage("Failed to complete maintenance");
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMessage(""), 3000);
        }
    };

    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return "";
        return new Date(timestamp * 1000).toLocaleTimeString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-2 rounded-xl",
                    state.enabled ? "bg-yellow-500/20" : "bg-purple-500/20"
                )}>
                    <Wrench className={cn(
                        "w-6 h-6",
                        state.enabled ? "text-yellow-400" : "text-purple-400"
                    )} />
                </div>
                <div>
                    <h1 className={cn(
                        "text-2xl font-bold flex items-center gap-3",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        Maintenance Mode
                        {state.enabled && (
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
                        className={cn(
                            "p-3 rounded-xl border text-center",
                            statusMessage.startsWith("Error")
                                ? "bg-red-500/20 border-red-500/30 text-red-400"
                                : "bg-green-500/20 border-green-500/30 text-green-400"
                        )}
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
                    state.enabled
                        ? "bg-yellow-500/5 border-yellow-500/30"
                        : isDark
                            ? "bg-zinc-900/50 border-white/10"
                            : "bg-white border-gray-200"
                )}
            >
                {!state.enabled ? (
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
                                value={newReason}
                                onChange={(e) => setNewReason(e.target.value)}
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
                            disabled={!newReason.trim() || isSaving}
                            className={cn(
                                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                newReason.trim() && !isSaving
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Wrench className="w-5 h-5" />
                            )}
                            Activate Maintenance Mode
                        </button>
                    </div>
                ) : (
                    /* Active Maintenance Dashboard */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-yellow-400">
                                Maintenance in Progress
                            </h2>
                            <div className="flex items-center gap-2 text-yellow-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Started: {formatTime(state.started_at)}</span>
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
                                <span className="text-yellow-400 font-bold">{state.progress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={state.progress}
                                onChange={(e) => setState(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
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
                                        onClick={() => setState(prev => ({ ...prev, stage: s.value }))}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            state.stage === s.value
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
                                value={state.reason}
                                onChange={(e) => setState(prev => ({ ...prev, reason: e.target.value }))}
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

            {/* Changelog Items Section (only show when maintenance active) */}
            {state.enabled && (
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
                    <h2 className={cn(
                        "text-lg font-semibold mb-4 flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <FileText className="w-5 h-5 text-blue-400" />
                        Changelog Items
                    </h2>
                    <p className={cn(
                        "text-sm mb-4",
                        isDark ? "text-white/50" : "text-gray-500"
                    )}>
                        Add items that will be included in the changelog when maintenance completes.
                    </p>

                    {/* Add new item */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newChangelogItem}
                            onChange={(e) => setNewChangelogItem(e.target.value)}
                            placeholder="e.g., Fixed audio caching issue"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChangelogItem()}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-xl outline-none transition-colors",
                                isDark
                                    ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500"
                                    : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                            )}
                        />
                        <button
                            onClick={handleAddChangelogItem}
                            disabled={!newChangelogItem.trim()}
                            className={cn(
                                "px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2",
                                newChangelogItem.trim()
                                    ? "bg-blue-500 text-white hover:bg-blue-600"
                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>

                    {/* List items */}
                    <div className="space-y-2">
                        {state.changelog_items.length === 0 ? (
                            <p className={cn(
                                "text-center py-4 text-sm",
                                isDark ? "text-white/30" : "text-gray-400"
                            )}>
                                No changelog items yet. Add items above.
                            </p>
                        ) : (
                            state.changelog_items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl",
                                        isDark ? "bg-zinc-800" : "bg-gray-100"
                                    )}
                                >
                                    <span className={isDark ? "text-white" : "text-gray-900"}>
                                        • {item}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveChangelogItem(item)}
                                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

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
                    {state.history.length === 0 ? (
                        <p className={cn(
                            "text-center py-4 text-sm",
                            isDark ? "text-white/30" : "text-gray-400"
                        )}>
                            No maintenance history yet.
                        </p>
                    ) : (
                        state.history.slice().reverse().map((log, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "p-4 rounded-xl border",
                                    isDark ? "bg-green-500/5 border-green-500/20" : "bg-green-50 border-green-200"
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
                                            {new Date(log.started_at * 1000).toLocaleString()}
                                            {log.completed_at && ` → ${new Date(log.completed_at * 1000).toLocaleString()}`}
                                        </p>
                                        {log.changelog_items && log.changelog_items.length > 0 && (
                                            <div className="mt-2">
                                                <p className={cn(
                                                    "text-xs font-medium",
                                                    isDark ? "text-white/40" : "text-gray-400"
                                                )}>
                                                    Changes:
                                                </p>
                                                <ul className={cn(
                                                    "text-xs mt-1",
                                                    isDark ? "text-white/50" : "text-gray-500"
                                                )}>
                                                    {log.changelog_items.map((item, i) => (
                                                        <li key={i}>• {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                        Completed
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
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

                            {/* Show changelog items that will be added */}
                            {state.changelog_items.length > 0 && (
                                <div className="mb-4">
                                    <p className={cn(
                                        "text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Changelog items to be added:
                                    </p>
                                    <ul className={cn(
                                        "text-sm p-3 rounded-xl",
                                        isDark ? "bg-zinc-800" : "bg-gray-100"
                                    )}>
                                        {state.changelog_items.map((item, idx) => (
                                            <li key={idx} className={isDark ? "text-white/70" : "text-gray-600"}>
                                                • {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

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
