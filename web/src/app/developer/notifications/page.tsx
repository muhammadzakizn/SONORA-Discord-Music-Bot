"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
    Upload,
    Trash2,
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

    // Image upload state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Supported image formats
    const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const MAX_SIZE_MB = 25;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    // Convert image to JPEG and compress
    const convertToJpeg = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Draw white background for transparency
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    // Convert to JPEG with quality 0.85
                    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(jpegDataUrl);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        setUploadError(null);

        // Validate format
        if (!SUPPORTED_FORMATS.includes(file.type)) {
            setUploadError(`Unsupported format. Use: JPG, PNG, GIF, WebP, BMP`);
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE_BYTES) {
            setUploadError(`File too large. Max size: ${MAX_SIZE_MB}MB`);
            return;
        }

        setIsUploading(true);
        try {
            const jpegDataUrl = await convertToJpeg(file);
            setUploadedImage(jpegDataUrl);
            setImageUrl(''); // Clear URL if file uploaded
        } catch (error) {
            setUploadError('Failed to process image');
            console.error('Image conversion error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    // Clear uploaded image
    const clearUploadedImage = () => {
        setUploadedImage(null);
        setUploadError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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

        // Use uploaded image if available, otherwise use URL
        const finalImage = uploadedImage || imageUrl || undefined;

        try {
            const response = await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    body,
                    image: finalImage,
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
                setUploadedImage(null);
                setUploadError(null);
                setLinkUrl("");
                setType("general");
                setPriority("normal");
                setSound("default");
                setSelectedUsers([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
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

                        {/* Image Upload + URL */}
                        <div>
                            <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-white/70" : "text-gray-700")}>
                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                Image (optional)
                            </label>

                            {/* Uploaded image preview */}
                            {uploadedImage ? (
                                <div className="relative mb-3">
                                    <img
                                        src={uploadedImage}
                                        alt="Preview"
                                        className="w-full max-h-48 object-contain rounded-lg border border-white/10"
                                    />
                                    <button
                                        onClick={clearUploadedImage}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className={cn(
                                        "absolute bottom-2 left-2 px-2 py-1 rounded text-xs",
                                        "bg-green-500/80 text-white"
                                    )}>
                                        Converted to JPEG
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Drag & Drop zone */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "relative mb-3 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                                            isDragging
                                                ? "border-pink-500 bg-pink-500/10"
                                                : isDark
                                                    ? "border-white/20 hover:border-white/40 bg-white/5"
                                                    : "border-gray-300 hover:border-gray-400 bg-gray-50"
                                        )}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                                            onChange={handleFileInputChange}
                                            className="hidden"
                                        />

                                        <div className="flex flex-col items-center text-center">
                                            {isUploading ? (
                                                <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
                                            ) : (
                                                <Upload className={cn(
                                                    "w-8 h-8 mb-2",
                                                    isDark ? "text-white/40" : "text-gray-400"
                                                )} />
                                            )}
                                            <p className={cn(
                                                "text-sm font-medium",
                                                isDark ? "text-white/70" : "text-gray-600"
                                            )}>
                                                {isUploading ? 'Converting...' : 'Drop image or click to upload'}
                                            </p>
                                            <p className={cn(
                                                "text-xs mt-1",
                                                isDark ? "text-white/40" : "text-gray-400"
                                            )}>
                                                PNG, JPG, GIF, WebP, BMP • Max {MAX_SIZE_MB}MB • Auto-converts to JPEG
                                            </p>
                                        </div>
                                    </div>

                                    {/* Upload error */}
                                    {uploadError && (
                                        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                                            {uploadError}
                                        </div>
                                    )}

                                    {/* Or URL input */}
                                    <div className="relative">
                                        <span className={cn(
                                            "absolute left-0 right-0 -top-2 text-center text-xs",
                                            isDark ? "text-white/30" : "text-gray-400"
                                        )}>
                                            or use URL
                                        </span>
                                    </div>
                                    <input
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.png"
                                        className={cn(
                                            "w-full px-4 py-2.5 rounded-lg border transition-colors mt-2",
                                            isDark
                                                ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                        )}
                                    />
                                </>
                            )}
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
                                                    const badge = getStatusBadge(user.notificationStatus);

                                                    return (
                                                        <div
                                                            key={user.id}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer",
                                                                selectedUsers.includes(user.id)
                                                                    ? isDark ? "bg-pink-500/10" : "bg-pink-50"
                                                                    : isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                                            )}
                                                            onClick={() => {
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
                                                                onChange={() => { }}
                                                                className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
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
