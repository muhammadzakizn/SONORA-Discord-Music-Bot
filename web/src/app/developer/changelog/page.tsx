"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Tag,
    Calendar,
    Sparkles,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import Link from "next/link";

interface ChangelogEntry {
    id: string;
    version: string;
    date: string;
    title: string;
    highlights: string[];
    changes: {
        category: string;
        items: string[];
    }[];
}

interface ChangelogData {
    web_version: string;
    bot_version: string;
    last_updated?: string;
    entries: ChangelogEntry[];
}

const API_BASE = '/api/bot';

export default function ChangelogManagementPage() {
    const { isDark } = useSettings();
    const [changelog, setChangelog] = useState<ChangelogData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // Edit states
    const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
    const [isNewEntry, setIsNewEntry] = useState(false);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

    // New entry form
    const [newVersion, setNewVersion] = useState("");
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTitle, setNewTitle] = useState("");
    const [newHighlights, setNewHighlights] = useState<string[]>([""]);
    const [newChanges, setNewChanges] = useState<{ category: string; items: string[] }[]>([
        { category: "", items: [""] }
    ]);

    const fetchChangelog = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/changelog`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setChangelog(data);
            }
        } catch (error) {
            console.error('Failed to fetch changelog:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchChangelog();
    }, [fetchChangelog]);

    const showStatus = (message: string, isError = false) => {
        setStatusMessage(isError ? `Error: ${message}` : message);
        setTimeout(() => setStatusMessage(""), 3000);
    };

    const handleCreateEntry = async () => {
        if (!newVersion.trim() || !newTitle.trim()) {
            showStatus("Version and title are required", true);
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/changelog/entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version: newVersion,
                    date: newDate,
                    title: newTitle,
                    highlights: newHighlights.filter(h => h.trim()),
                    changes: newChanges
                        .filter(c => c.category.trim())
                        .map(c => ({
                            category: c.category,
                            items: c.items.filter(i => i.trim())
                        })),
                    update_version: true
                })
            });

            if (response.ok) {
                showStatus("Changelog entry created!");
                setIsNewEntry(false);
                resetNewForm();
                fetchChangelog();
            } else {
                const error = await response.json();
                showStatus(error.error || "Failed to create", true);
            }
        } catch (error) {
            showStatus("Failed to create entry", true);
        }
        setSaving(false);
    };

    const handleUpdateEntry = async (entry: ChangelogEntry) => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/changelog/entries/${entry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });

            if (response.ok) {
                showStatus("Entry updated!");
                setEditingEntry(null);
                fetchChangelog();
            } else {
                const error = await response.json();
                showStatus(error.error || "Failed to update", true);
            }
        } catch (error) {
            showStatus("Failed to update entry", true);
        }
        setSaving(false);
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm("Are you sure you want to delete this changelog entry?")) return;

        setSaving(true);
        try {
            const response = await fetch(`${API_BASE}/changelog/entries/${entryId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showStatus("Entry deleted!");
                fetchChangelog();
            } else {
                showStatus("Failed to delete", true);
            }
        } catch (error) {
            showStatus("Failed to delete entry", true);
        }
        setSaving(false);
    };

    const resetNewForm = () => {
        setNewVersion("");
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewTitle("");
        setNewHighlights([""]);
        setNewChanges([{ category: "", items: [""] }]);
    };

    const toggleExpanded = (id: string) => {
        const newSet = new Set(expandedEntries);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedEntries(newSet);
    };

    const addHighlight = () => setNewHighlights([...newHighlights, ""]);
    const removeHighlight = (index: number) => setNewHighlights(newHighlights.filter((_, i) => i !== index));
    const updateHighlight = (index: number, value: string) => {
        const updated = [...newHighlights];
        updated[index] = value;
        setNewHighlights(updated);
    };

    const addChangeCategory = () => setNewChanges([...newChanges, { category: "", items: [""] }]);
    const removeChangeCategory = (index: number) => setNewChanges(newChanges.filter((_, i) => i !== index));
    const updateCategory = (index: number, category: string) => {
        const updated = [...newChanges];
        updated[index].category = category;
        setNewChanges(updated);
    };
    const addChangeItem = (categoryIndex: number) => {
        const updated = [...newChanges];
        updated[categoryIndex].items.push("");
        setNewChanges(updated);
    };
    const removeChangeItem = (categoryIndex: number, itemIndex: number) => {
        const updated = [...newChanges];
        updated[categoryIndex].items = updated[categoryIndex].items.filter((_, i) => i !== itemIndex);
        setNewChanges(updated);
    };
    const updateChangeItem = (categoryIndex: number, itemIndex: number, value: string) => {
        const updated = [...newChanges];
        updated[categoryIndex].items[itemIndex] = value;
        setNewChanges(updated);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", isDark ? "bg-purple-500/20" : "bg-purple-500/10")}>
                        <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            Changelog Management
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Manage changelog entries for /changelog page
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/changelog"
                        target="_blank"
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                            isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        )}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Page
                    </Link>
                    <button
                        onClick={fetchChangelog}
                        disabled={loading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                            isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Current Version */}
            {changelog && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center justify-between",
                    isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                )}>
                    <div className="flex items-center gap-4">
                        <Tag className="w-5 h-5 text-purple-400" />
                        <span className={isDark ? "text-white" : "text-gray-900"}>
                            Current Version: <strong>Web v{changelog.web_version}</strong> • <strong>Bot v{changelog.bot_version}</strong>
                        </span>
                    </div>
                    <span className={cn("text-sm", isDark ? "text-white/40" : "text-gray-500")}>
                        {changelog.entries.length} entries
                    </span>
                </div>
            )}

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

            {/* Add New Entry Button */}
            {!isNewEntry && (
                <button
                    onClick={() => setIsNewEntry(true)}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add New Changelog Entry
                </button>
            )}

            {/* New Entry Form */}
            <AnimatePresence>
                {isNewEntry && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                            "p-6 rounded-2xl border overflow-hidden",
                            isDark ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                New Changelog Entry
                            </h3>
                            <button onClick={() => { setIsNewEntry(false); resetNewForm(); }} className="text-zinc-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Version (e.g. 3.9.0)"
                                value={newVersion}
                                onChange={(e) => setNewVersion(e.target.value)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl outline-none",
                                    isDark ? "bg-zinc-800 border border-zinc-700 text-white" : "bg-white border border-gray-200"
                                )}
                            />
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl outline-none",
                                    isDark ? "bg-zinc-800 border border-zinc-700 text-white" : "bg-white border border-gray-200"
                                )}
                            />
                            <input
                                type="text"
                                placeholder="Title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl outline-none",
                                    isDark ? "bg-zinc-800 border border-zinc-700 text-white" : "bg-white border border-gray-200"
                                )}
                            />
                        </div>

                        {/* Highlights */}
                        <div className="mb-4">
                            <label className={cn("text-sm font-medium mb-2 block", isDark ? "text-white/70" : "text-gray-700")}>
                                Highlights
                            </label>
                            {newHighlights.map((h, i) => (
                                <div key={i} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Highlight item..."
                                        value={h}
                                        onChange={(e) => updateHighlight(i, e.target.value)}
                                        className={cn(
                                            "flex-1 px-4 py-2 rounded-xl outline-none text-sm",
                                            isDark ? "bg-zinc-800 border border-zinc-700 text-white" : "bg-white border border-gray-200"
                                        )}
                                    />
                                    <button onClick={() => removeHighlight(i)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button onClick={addHighlight} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Highlight
                            </button>
                        </div>

                        {/* Changes */}
                        <div className="mb-4">
                            <label className={cn("text-sm font-medium mb-2 block", isDark ? "text-white/70" : "text-gray-700")}>
                                Changes
                            </label>
                            {newChanges.map((change, ci) => (
                                <div key={ci} className={cn("p-4 rounded-xl mb-3", isDark ? "bg-zinc-800/50" : "bg-white")}>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Category name..."
                                            value={change.category}
                                            onChange={(e) => updateCategory(ci, e.target.value)}
                                            className={cn(
                                                "flex-1 px-4 py-2 rounded-xl outline-none text-sm font-medium",
                                                isDark ? "bg-zinc-700 border border-zinc-600 text-white" : "bg-gray-50 border border-gray-200"
                                            )}
                                        />
                                        <button onClick={() => removeChangeCategory(ci)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {change.items.map((item, ii) => (
                                        <div key={ii} className="flex gap-2 mb-1 ml-4">
                                            <input
                                                type="text"
                                                placeholder="Change item..."
                                                value={item}
                                                onChange={(e) => updateChangeItem(ci, ii, e.target.value)}
                                                className={cn(
                                                    "flex-1 px-3 py-1.5 rounded-lg outline-none text-sm",
                                                    isDark ? "bg-zinc-700 border border-zinc-600 text-white" : "bg-gray-50 border border-gray-200"
                                                )}
                                            />
                                            <button onClick={() => removeChangeItem(ci, ii)} className="p-1 text-red-400 hover:bg-red-500/10 rounded">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addChangeItem(ci)} className="text-xs text-zinc-400 hover:text-zinc-300 ml-4 flex items-center gap-1 mt-1">
                                        <Plus className="w-3 h-3" /> Add item
                                    </button>
                                </div>
                            ))}
                            <button onClick={addChangeCategory} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Category
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsNewEntry(false); resetNewForm(); }}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl font-medium",
                                    isDark ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateEntry}
                                disabled={saving || !newVersion.trim() || !newTitle.trim()}
                                className="flex-1 py-2.5 rounded-xl font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Create Entry
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Entries List */}
            <div className="space-y-4">
                {changelog?.entries.map((entry, index) => {
                    const isExpanded = expandedEntries.has(entry.id);
                    const isLatest = index === 0;

                    return (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "rounded-2xl border overflow-hidden",
                                isLatest
                                    ? "border-purple-500/30"
                                    : isDark ? "border-white/10" : "border-gray-200",
                                isDark ? "bg-zinc-900/50" : "bg-white"
                            )}
                        >
                            {/* Entry Header */}
                            <div
                                className={cn(
                                    "p-4 flex items-center justify-between cursor-pointer",
                                    isLatest && "bg-purple-500/10"
                                )}
                                onClick={() => toggleExpanded(entry.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {isLatest && (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">
                                            LATEST
                                        </span>
                                    )}
                                    <span className={cn("font-bold", isDark ? "text-white" : "text-gray-900")}>
                                        v{entry.version}
                                    </span>
                                    <span className={isDark ? "text-white/50" : "text-gray-500"}>—</span>
                                    <span className={isDark ? "text-white/70" : "text-gray-700"}>{entry.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-sm", isDark ? "text-white/40" : "text-gray-500")}>
                                        {entry.date}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className={cn("p-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                                            {/* Highlights */}
                                            {entry.highlights.length > 0 && (
                                                <div className="mb-4">
                                                    <p className={cn("text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                                        Highlights:
                                                    </p>
                                                    <ul className="list-disc list-inside text-sm space-y-1">
                                                        {entry.highlights.map((h, i) => (
                                                            <li key={i} className={isDark ? "text-white/60" : "text-gray-600"}>{h}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Changes */}
                                            {entry.changes.length > 0 && (
                                                <div>
                                                    <p className={cn("text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                                        Changes:
                                                    </p>
                                                    {entry.changes.map((change, ci) => (
                                                        <div key={ci} className="mb-3">
                                                            <p className={cn("text-sm font-semibold", isDark ? "text-purple-400" : "text-purple-600")}>
                                                                {change.category}
                                                            </p>
                                                            <ul className="list-disc list-inside text-sm ml-4 space-y-0.5">
                                                                {change.items.map((item, ii) => (
                                                                    <li key={ii} className={isDark ? "text-white/60" : "text-gray-600"}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Loading State */}
            {loading && !changelog && (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            )}
        </div>
    );
}
