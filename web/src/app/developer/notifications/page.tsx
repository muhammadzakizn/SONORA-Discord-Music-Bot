"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    Send,
    Users,
    Search,
    Filter,
    AlertTriangle,
    Info,
    Sparkles,
    Check,
    X,
    Image as ImageIcon,
    Link as LinkIcon,
    Volume2,
    VolumeX,
    Clock,
    ChevronDown,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import {
    NotificationPriority,
    NotificationType,
    NotificationSound,
    getPriorityColor,
    getPriorityLabel,
} from "@/lib/notifications";

// Types
type NotificationStatus = 'allowed' | 'denied' | 'disabled' | 'never_granted';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    notificationStatus: NotificationStatus;
}

// Helper to check if user can receive notifications
const canReceiveNotifications = (status: NotificationStatus) => status === 'allowed';

// Get status badge color and text
const getStatusBadge = (status: NotificationStatus) => {
    switch (status) {
        case 'allowed':
            return { color: 'bg-green-500/20 text-green-400', text: 'Enabled' };
        case 'denied':
            return { color: 'bg-red-500/20 text-red-400', text: 'Blocked' };
        case 'disabled':
            return { color: 'bg-yellow-500/20 text-yellow-500', text: 'Disabled' };
        case 'never_granted':
        default:
            return { color: 'bg-gray-500/20 text-gray-400', text: 'Not Set' };
    }
};

interface SentNotification {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    priority: NotificationPriority;
    sound: NotificationSound;
    image?: string;
    url?: string;
    sentAt: string;
    sentBy: string;
    targetType: "all" | "specific";
    targetUsers?: string[];
    recipientCount: number;
}

export default function NotificationsPage() {
    const { isDark, t } = useSettings();

    // Form state
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [type, setType] = useState<NotificationType>("general");
    const [priority, setPriority] = useState<NotificationPriority>("normal");
    const [sound, setSound] = useState<NotificationSound>("default");
    const [targetType, setTargetType] = useState<"all" | "specific">("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // UI state
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
    const [userSearch, setUserSearch] = useState("");
    const [showUserFilter, setShowUserFilter] = useState(false);
    const [userFilterEnabled, setUserFilterEnabled] = useState<boolean | null>(null);

    // Data state
    const [users, setUsers] = useState<User[]>([]);
    const [history, setHistory] = useState<SentNotification[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Fetch users and history on mount
    useEffect(() => {
        fetchUsers();
        fetchHistory();
    }, []);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            // Fetch users with notification status from API
            const response = await fetch("/api/push/users");
            if (response.ok) {
                const data = await response.json();
                const formattedUsers: User[] = (data.users || []).map((u: {
                    id: string;
                    username?: string;
                    displayName?: string;
                    avatar?: string;
                    notificationStatus?: NotificationStatus;
                }) => ({
                    id: u.id,
                    username: u.username || `User ${u.id}`,
                    displayName: u.displayName || u.username || `User ${u.id}`,
                    avatar: u.avatar,
                    notificationStatus: u.notificationStatus || 'never_granted',
                }));
                setUsers(formattedUsers);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            setUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch("/api/push/send?limit=50");
            if (response.ok) {
                const data = await response.json();
                setHistory(data.notifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Filtered users - sort by notification status (available first)
    const filteredUsers = useMemo(() => {
        const filtered = users.filter((user) => {
            const matchesSearch = userSearch === "" ||
                user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                user.displayName.toLowerCase().includes(userSearch.toLowerCase());

            if (userFilterEnabled === true) {
                return matchesSearch && canReceiveNotifications(user.notificationStatus);
            } else if (userFilterEnabled === false) {
                return matchesSearch && !canReceiveNotifications(user.notificationStatus);
            }
            return matchesSearch;
        });

        // Sort: allowed first, then others
        return filtered.sort((a, b) => {
            const aAvailable = canReceiveNotifications(a.notificationStatus);
            const bAvailable = canReceiveNotifications(b.notificationStatus);
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;
            return 0;
        });
    }, [users, userSearch, userFilterEnabled]);

    // Handle send notification
    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            setSendResult({ success: false, message: "Title and body are required" });
            return;
        }

        if (targetType === "specific" && selectedUsers.length === 0) {
            setSendResult({ success: false, message: "Please select at least one user" });
            return;
        }

        setIsSending(true);
        setSendResult(null);

        try {
            const response = await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    body,
                    image: imageUrl || undefined,
                    url: linkUrl || undefined,
                    type,
                    priority,
                    sound,
                    targetType,
                    targetUsers: targetType === "specific" ? selectedUsers : undefined,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSendResult({ success: true, message: "Notification sent successfully!" });
                // Reset form
                setTitle("");
                setBody("");
                setImageUrl("");
                setLinkUrl("");
                setType("general");
                setPriority("normal");
                setSound("default");
                setSelectedUsers([]);
                // Refresh history
                fetchHistory();
            } else {
                setSendResult({ success: false, message: data.error || "Failed to send notification" });
            }
        } catch (error) {
            console.error("Send error:", error);
            setSendResult({ success: false, message: "Network error. Please try again." });
        } finally {
            setIsSending(false);
        }
    };

    // Priority options
    const priorityOptions: { value: NotificationPriority; label: string; icon: React.ReactNode }[] = [
        { value: "urgent", label: "Urgent", icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
        { value: "important", label: "Important", icon: <Bell className="w-4 h-4 text-orange-400" /> },
        { value: "normal", label: "Normal", icon: <Info className="w-4 h-4 text-gray-400" /> },
        { value: "low", label: "Low", icon: <Sparkles className="w-4 h-4 text-blue-400" /> },
    ];

    // Type options
    const typeOptions: { value: NotificationType; label: string }[] = [
        { value: "general", label: "General" },
        { value: "changelog", label: "Changelog" },
        { value: "announcement", label: "Announcement" },
        { value: "personal", label: "Personal" },
    ];

    // Sound options
    const soundOptions: { value: NotificationSound; label: string; icon: React.ReactNode }[] = [
        { value: "default", label: "Default", icon: <Volume2 className="w-4 h-4" /> },
        { value: "changelog", label: "Changelog", icon: <Volume2 className="w-4 h-4" /> },
        { value: "urgent", label: "Urgent", icon: <Volume2 className="w-4 h-4" /> },
        { value: "none", label: "Silent", icon: <VolumeX className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        Notifications
                    </h1>
                    <p className={cn("mt-1", isDark ? "text-white/60" : "text-gray-500")}>
                        Send push notifications to users
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-sm",
                        isDark ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-600"
                    )}>
                        {users.length} users
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Send Notification Form */}
                <div className={cn(
                    "lg:col-span-2 rounded-xl border p-6",
                    isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                )}>
                    <h2 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
                        <Send className="w-5 h-5 inline mr-2" />
                        Send Notification
                    </h2>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Notification title"
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                    isDark
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-500"
                                )}
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                Message <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Notification message"
                                rows={3}
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-lg border transition-colors resize-none",
                                    isDark
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-500"
                                )}
                            />
                        </div>

                        {/* Type & Priority Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Type */}
                            <div>
                                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                    Type
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as NotificationType)}
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                        isDark
                                            ? "bg-white/5 border-white/10 text-white focus:border-pink-500"
                                            : "bg-white border-gray-200 text-gray-900 focus:border-pink-500"
                                    )}
                                >
                                    {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                    Priority
                                </label>
                                <div className="flex gap-1">
                                    {priorityOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPriority(opt.value)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs",
                                                priority === opt.value
                                                    ? "border-pink-500 bg-pink-500/20"
                                                    : isDark
                                                        ? "border-white/10 hover:border-white/30"
                                                        : "border-gray-200 hover:border-gray-300"
                                            )}
                                            title={opt.label}
                                        >
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sound */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                Sound
                            </label>
                            <div className="flex gap-2">
                                {soundOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSound(opt.value)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                                            sound === opt.value
                                                ? "border-pink-500 bg-pink-500/20"
                                                : isDark
                                                    ? "border-white/10 hover:border-white/30"
                                                    : "border-gray-200 hover:border-gray-300",
                                            isDark ? "text-white" : "text-gray-700"
                                        )}
                                    >
                                        {opt.icon}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Image URL */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                Image URL (optional)
                            </label>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.png"
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                    isDark
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                        </div>

                        {/* Link URL */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                <LinkIcon className="w-4 h-4 inline mr-1" />
                                Link URL (optional)
                            </label>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://sonora.muhammadzakizn.com/..."
                                className={cn(
                                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                    isDark
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                        </div>

                        {/* Target Selection */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                <Users className="w-4 h-4 inline mr-1" />
                                Target
                            </label>
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => { setTargetType("all"); setSelectedUsers([]); }}
                                    className={cn(
                                        "flex-1 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium",
                                        targetType === "all"
                                            ? "border-pink-500 bg-pink-500/20 text-pink-400"
                                            : isDark
                                                ? "border-white/10 text-white/70 hover:border-white/30"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    All Users
                                </button>
                                <button
                                    onClick={() => setTargetType("specific")}
                                    className={cn(
                                        "flex-1 px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium",
                                        targetType === "specific"
                                            ? "border-pink-500 bg-pink-500/20 text-pink-400"
                                            : isDark
                                                ? "border-white/10 text-white/70 hover:border-white/30"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    Specific Users ({selectedUsers.length})
                                </button>
                            </div>

                            {/* User selection (when specific) */}
                            <AnimatePresence>
                                {targetType === "specific" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={cn(
                                            "rounded-lg border overflow-hidden",
                                            isDark ? "border-white/10" : "border-gray-200"
                                        )}
                                    >
                                        {/* Search */}
                                        <div className={cn(
                                            "p-3 border-b flex gap-2",
                                            isDark ? "border-white/10" : "border-gray-200"
                                        )}>
                                            <div className="relative flex-1">
                                                <Search className={cn(
                                                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                                                    isDark ? "text-white/30" : "text-gray-400"
                                                )} />
                                                <input
                                                    type="text"
                                                    value={userSearch}
                                                    onChange={(e) => setUserSearch(e.target.value)}
                                                    placeholder="Search users..."
                                                    className={cn(
                                                        "w-full pl-9 pr-4 py-2 rounded-lg text-sm",
                                                        isDark
                                                            ? "bg-white/5 text-white placeholder:text-white/30"
                                                            : "bg-gray-100 text-gray-900 placeholder:text-gray-400"
                                                    )}
                                                />
                                            </div>
                                            <button
                                                onClick={() => setShowUserFilter(!showUserFilter)}
                                                className={cn(
                                                    "p-2 rounded-lg",
                                                    isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                                )}
                                            >
                                                <Filter className={cn("w-4 h-4", isDark ? "text-white/50" : "text-gray-500")} />
                                            </button>
                                        </div>

                                        {/* User list */}
                                        <div className="max-h-48 overflow-y-auto">
                                            {isLoadingUsers ? (
                                                <div className={cn(
                                                    "flex items-center justify-center py-8",
                                                    isDark ? "text-white/50" : "text-gray-400"
                                                )}>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Loading users...
                                                </div>
                                            ) : filteredUsers.length === 0 ? (
                                                <div className={cn(
                                                    "text-center py-8 text-sm",
                                                    isDark ? "text-white/40" : "text-gray-400"
                                                )}>
                                                    No users found
                                                </div>
                                            ) : (
                                                filteredUsers.map((user) => {
                                                    const isAvailable = canReceiveNotifications(user.notificationStatus);
                                                    const badge = getStatusBadge(user.notificationStatus);

                                                    return (
                                                        <div
                                                            key={user.id}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2 transition-colors",
                                                                !isAvailable && "opacity-50 cursor-not-allowed",
                                                                isAvailable && "cursor-pointer",
                                                                isAvailable && selectedUsers.includes(user.id)
                                                                    ? isDark ? "bg-pink-500/10" : "bg-pink-50"
                                                                    : isAvailable ? (isDark ? "hover:bg-white/5" : "hover:bg-gray-50") : ""
                                                            )}
                                                            onClick={() => {
                                                                if (!isAvailable) return;
                                                                if (selectedUsers.includes(user.id)) {
                                                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                                } else {
                                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                                }
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUsers.includes(user.id)}
                                                                disabled={!isAvailable}
                                                                onChange={() => { }}
                                                                className={cn(
                                                                    "rounded border-gray-300 text-pink-500 focus:ring-pink-500",
                                                                    !isAvailable && "opacity-50"
                                                                )}
                                                            />
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                                                isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-600"
                                                            )}>
                                                                {user.avatar ? (
                                                                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                                ) : (
                                                                    user.displayName.charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn("text-sm font-medium truncate", isDark ? "text-white" : "text-gray-900")}>
                                                                    {user.displayName}
                                                                </p>
                                                                <p className={cn("text-xs truncate", isDark ? "text-white/50" : "text-gray-500")}>
                                                                    @{user.username}
                                                                </p>
                                                            </div>
                                                            <span className={cn("text-xs px-2 py-0.5 rounded", badge.color)}>
                                                                {badge.text}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Send Result */}
                        <AnimatePresence>
                            {sendResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={cn(
                                        "flex items-center gap-2 p-3 rounded-lg",
                                        sendResult.success
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-red-500/20 text-red-400"
                                    )}
                                >
                                    {sendResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {sendResult.message}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={isSending || !title.trim() || !body.trim()}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-colors",
                                "bg-pink-600 hover:bg-pink-700 text-white",
                                (isSending || !title.trim() || !body.trim()) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send Notification
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* History Panel */}
                <div className={cn(
                    "rounded-xl border p-6",
                    isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
                            <Clock className="w-5 h-5 inline mr-2" />
                            History
                        </h2>
                        <button
                            onClick={fetchHistory}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                            )}
                        >
                            <RefreshCw className={cn("w-4 h-4", isDark ? "text-white/50" : "text-gray-500")} />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {isLoadingHistory ? (
                            <div className={cn(
                                "flex items-center justify-center py-8",
                                isDark ? "text-white/50" : "text-gray-400"
                            )}>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Loading...
                            </div>
                        ) : history.length === 0 ? (
                            <div className={cn(
                                "flex flex-col items-center justify-center py-8",
                                isDark ? "text-white/40" : "text-gray-400"
                            )}>
                                <Bell className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No notifications sent yet</p>
                            </div>
                        ) : (
                            history.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "p-3 rounded-lg border-l-4",
                                        isDark ? "bg-white/5" : "bg-gray-50"
                                    )}
                                    style={{ borderLeftColor: getPriorityColor(notif.priority) }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                            {notif.title}
                                        </p>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded",
                                            isDark ? "bg-white/10 text-white/50" : "bg-gray-200 text-gray-500"
                                        )}>
                                            {notif.targetType === "all" ? "All" : `${notif.targetUsers?.length || 0} users`}
                                        </span>
                                    </div>
                                    <p className={cn("text-xs mt-1 line-clamp-2", isDark ? "text-white/50" : "text-gray-500")}>
                                        {notif.body}
                                    </p>
                                    <p className={cn("text-xs mt-2", isDark ? "text-white/30" : "text-gray-400")}>
                                        {new Date(notif.sentAt).toLocaleString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
