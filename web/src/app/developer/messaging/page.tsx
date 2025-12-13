"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Send,
    Server,
    Hash,
    CheckCircle,
    XCircle,
    RefreshCw,
    ChevronDown,
    Image as ImageIcon,
    X,
    Users,
    Mic,
    Radio,
    AtSign,
    User,
    Upload,
    Trash2,
    Check,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface BroadcastResult {
    success: boolean;
    serversReached: number;
    failed: number;
    timestamp: string;
}

interface Channel {
    id: string;
    name: string;
    type: string;
    category?: string;
    can_send: boolean;
    permissions: {
        send_messages?: boolean;
        mention_everyone?: boolean;
    };
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    member_count?: number;
    sendable_channels?: number;
    channels: Channel[];
}

interface UserData {
    id: string;
    username: string;
    displayName?: string;
    avatar: string | null;
    isBanned: boolean;
    serverName?: string;
}

const API_BASE = '/api/bot';

export default function MessagingPage() {
    const { isDark } = useSettings();

    // Target type
    const [targetType, setTargetType] = useState<"all_servers" | "specific_channel" | "users">("all_servers");

    // Multi-select guilds and channels
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [selectedGuilds, setSelectedGuilds] = useState<Guild[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
    const [showServerDialog, setShowServerDialog] = useState(false);
    const [showChannelDialog, setShowChannelDialog] = useState(false);

    // Users selection
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [userSearch, setUserSearch] = useState("");

    // Message content
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    // Image file upload
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mention options
    const [mentionType, setMentionType] = useState<"none" | "everyone" | "here">("none");

    // State
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<BroadcastResult | null>(null);
    const [history, setHistory] = useState<BroadcastResult[]>([]);
    const [loadingGuilds, setLoadingGuilds] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        fetchGuilds();
        fetchUsers();
    }, []);

    const fetchGuilds = async () => {
        setLoadingGuilds(true);
        try {
            const response = await fetch(`${API_BASE}/admin/guilds/channels`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setGuilds(data);
            }
        } catch (error) {
            console.error('Failed to fetch guilds:', error);
        }
        setLoadingGuilds(false);
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await fetch(`${API_BASE}/admin/users`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
        setLoadingUsers(false);
    };

    // Image file handling
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPG, JPEG, PNG, or GIF)');
                return;
            }
            if (file.size > 8 * 1024 * 1024) {
                alert('Image must be less than 8MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSend = async () => {
        if (!message.trim()) return;

        setSending(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('message', title ? `**${title}**\n\n${message}` : message);
            if (imageFile) formData.append('image', imageFile);

            let response;

            if (targetType === "users") {
                formData.append('user_ids', JSON.stringify(selectedUsers.map(u => u.id)));
                response = await fetch(`${API_BASE}/admin/dm-users`, { method: 'POST', body: formData });
            } else {
                formData.append('all_channels', targetType === "all_servers" ? 'true' : 'false');
                formData.append('channel_ids', JSON.stringify(selectedChannels.map(c => c.id)));
                if (targetType === "specific_channel" && selectedGuilds.length > 0 && selectedChannels.length === 0) {
                    formData.append('guild_ids', JSON.stringify(selectedGuilds.map(g => g.id)));
                }
                formData.append('mention_type', mentionType);
                response = await fetch(`${API_BASE}/admin/broadcast`, { method: 'POST', body: formData });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                const newResult: BroadcastResult = {
                    success: true,
                    serversReached: data.sent || 0,
                    failed: data.failed || 0,
                    timestamp: new Date().toLocaleString(),
                };
                setResult(newResult);
                setHistory(prev => [newResult, ...prev].slice(0, 10));
                setTimeout(() => {
                    setTitle("");
                    setMessage("");
                    clearImage();
                    setResult(null);
                    setSelectedChannels([]);
                    setSelectedUsers([]);
                    setSelectedGuilds([]);
                }, 3000);
            } else {
                setResult({ success: false, serversReached: 0, failed: data.failed || 1, timestamp: new Date().toLocaleString() });
            }
        } catch (error) {
            console.error('Broadcast error:', error);
            setResult({ success: false, serversReached: 0, failed: 1, timestamp: new Date().toLocaleString() });
        }
        setSending(false);
    };

    const toggleGuildSelection = (guild: Guild) => {
        if (selectedGuilds.find(g => g.id === guild.id)) {
            setSelectedGuilds(prev => prev.filter(g => g.id !== guild.id));
            setSelectedChannels(prev => prev.filter(c => !guild.channels.some(gc => gc.id === c.id)));
        } else {
            setSelectedGuilds(prev => [...prev, guild]);
        }
    };

    const toggleChannelSelection = (channel: Channel) => {
        if (selectedChannels.find(c => c.id === channel.id)) {
            setSelectedChannels(prev => prev.filter(c => c.id !== channel.id));
        } else {
            setSelectedChannels(prev => [...prev, channel]);
        }
    };

    const toggleUserSelection = (user: UserData) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const selectAllSendableChannels = () => {
        const allSendable: Channel[] = [];
        selectedGuilds.forEach(guild => {
            guild.channels.filter(c => c.can_send).forEach(c => {
                if (!allSendable.find(sc => sc.id === c.id)) allSendable.push(c);
            });
        });
        setSelectedChannels(allSendable);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase()))
    );

    const sendableServersCount = guilds.filter(g => (g.sendable_channels || 0) > 0).length;

    const getChannelIcon = (type: string) => {
        switch (type) {
            case "voice": return Mic;
            case "stage": return Radio;
            default: return Hash;
        }
    };

    // Get all sendable channels from selected guilds
    const availableChannels = selectedGuilds.flatMap(g => g.channels.filter(c => c.can_send));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", isDark ? "bg-blue-500/20" : "bg-blue-500/10")}>
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            Broadcast Messaging
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Send announcements ({sendableServersCount} servers • {users.length} users)
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { fetchGuilds(); fetchUsers(); }}
                    disabled={loadingGuilds || loadingUsers}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium",
                        isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", (loadingGuilds || loadingUsers) && "animate-spin")} />
                    Refresh
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Composer */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "p-6 rounded-2xl border",
                            isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                        )}
                    >
                        <h2 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
                            Compose Message
                        </h2>

                        {/* Target Selection */}
                        <div className="mb-4">
                            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                Target
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => { setTargetType("all_servers"); setSelectedGuilds([]); setSelectedChannels([]); setSelectedUsers([]); }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "all_servers"
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                            : isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-gray-100 border-gray-200 text-gray-600"
                                    )}
                                >
                                    <Server className="w-4 h-4" />
                                    <span className="hidden sm:inline">All Servers</span>
                                    <span className="text-xs">({sendableServersCount})</span>
                                </button>
                                <button
                                    onClick={() => { setTargetType("specific_channel"); setSelectedUsers([]); }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "specific_channel"
                                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                                            : isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-gray-100 border-gray-200 text-gray-600"
                                    )}
                                >
                                    <Hash className="w-4 h-4" />
                                    <span className="hidden sm:inline">Specific</span>
                                </button>
                                <button
                                    onClick={() => { setTargetType("users"); setSelectedGuilds([]); setSelectedChannels([]); }}
                                    className={cn(
                                        "py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border-2",
                                        targetType === "users"
                                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                            : isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-gray-100 border-gray-200 text-gray-600"
                                    )}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden sm:inline">DM Users</span>
                                    <span className="text-xs">({users.length})</span>
                                </button>
                            </div>
                        </div>

                        {/* Server & Channel Selection with Dialogs */}
                        <AnimatePresence>
                            {targetType === "specific_channel" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 space-y-3">
                                    {/* Select Servers Button */}
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                            Select Servers ({selectedGuilds.length} selected)
                                        </label>
                                        <button
                                            onClick={() => setShowServerDialog(true)}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl flex items-center justify-between border",
                                                isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-gray-100 border-gray-200 text-gray-900"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {selectedGuilds.length > 0 ? (
                                                    selectedGuilds.slice(0, 3).map(g => (
                                                        <span key={g.id} className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                                                            <Server className="w-3 h-3" />
                                                            {g.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                                        Click to select servers...
                                                    </span>
                                                )}
                                                {selectedGuilds.length > 3 && <span className="text-xs text-zinc-400">+{selectedGuilds.length - 3} more</span>}
                                            </div>
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Select Channels Button (only if servers selected) */}
                                    {selectedGuilds.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-gray-700")}>
                                                    Select Channels ({selectedChannels.length} selected)
                                                </label>
                                                <button onClick={selectAllSendableChannels} className="text-xs text-blue-400 hover:text-blue-300">
                                                    Select All Sendable
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setShowChannelDialog(true)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl flex items-center justify-between border",
                                                    isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-gray-100 border-gray-200 text-gray-900"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {selectedChannels.length > 0 ? (
                                                        selectedChannels.slice(0, 4).map(ch => (
                                                            <span key={ch.id} className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                                                                <Hash className="w-3 h-3" />
                                                                {ch.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                                            Click to select channels...
                                                        </span>
                                                    )}
                                                    {selectedChannels.length > 4 && <span className="text-xs text-zinc-400">+{selectedChannels.length - 4} more</span>}
                                                </div>
                                                <ChevronDown className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Users Selection */}
                        <AnimatePresence>
                            {targetType === "users" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
                                    <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                        Select Users ({selectedUsers.length} selected)
                                    </label>
                                    <button
                                        onClick={() => setShowUserDialog(true)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl flex items-center justify-between border",
                                            isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-gray-100 border-gray-200 text-gray-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedUsers.length > 0 ? (
                                                selectedUsers.slice(0, 4).map(u => (
                                                    <span key={u.id} className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {u.username}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className={isDark ? "text-zinc-500" : "text-gray-500"}>
                                                    Click to select users...
                                                </span>
                                            )}
                                            {selectedUsers.length > 4 && <span className="text-xs text-zinc-400">+{selectedUsers.length - 4} more</span>}
                                        </div>
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mention Options */}
                        {targetType !== "users" && (
                            <div className="mb-4">
                                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                    Mention
                                </label>
                                <div className="flex gap-2">
                                    {[{ value: "none", label: "None" }, { value: "everyone", label: "@everyone" }, { value: "here", label: "@here" }].map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setMentionType(option.value as typeof mentionType)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                                mentionType === option.value
                                                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                    : isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-600"
                                            )}
                                        >
                                            <AtSign className="w-3 h-3" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div className="mb-4">
                            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Announcement title..."
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors",
                                    isDark ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500" : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                )}
                            />
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your announcement here..."
                                rows={5}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none",
                                    isDark ? "bg-zinc-800 border border-zinc-700 text-white focus:border-blue-500" : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-blue-500"
                                )}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="mb-6">
                            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-white/70" : "text-gray-700")}>
                                Image (Optional) - JPG, PNG, GIF (Max 8MB)
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            {!imagePreview ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors",
                                        isDark ? "border-zinc-700 hover:border-zinc-600 text-zinc-500" : "border-gray-300 hover:border-gray-400 text-gray-500"
                                    )}
                                >
                                    <Upload className="w-8 h-8" />
                                    <span>Click to upload image</span>
                                </button>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full max-h-80 object-contain rounded-xl border border-zinc-700"
                                    />
                                    <button
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || sending || result?.success ||
                                (targetType === "users" && selectedUsers.length === 0) ||
                                (targetType === "specific_channel" && selectedGuilds.length === 0)}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                result?.success ? "bg-green-500 text-white" :
                                    result?.success === false ? "bg-rose-500 text-white" :
                                        "bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                            )}
                        >
                            {sending ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> Sending...</>
                            ) : result?.success ? (
                                <><CheckCircle className="w-5 h-5" /> Sent to {result.serversReached} {targetType === "users" ? "users" : "channels"}!</>
                            ) : result?.success === false ? (
                                <><XCircle className="w-5 h-5" /> Failed to send</>
                            ) : (
                                <><Send className="w-5 h-5" /> Send {targetType === "users" ? "DM" : "Broadcast"}</>
                            )}
                        </button>
                    </motion.div>
                </div>

                {/* Preview & History */}
                <div className="space-y-6">
                    {/* Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={cn("p-6 rounded-2xl border", isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200")}
                    >
                        <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white/70" : "text-gray-700")}>Preview</h3>
                        <div className={cn("p-4 rounded-xl border-l-4 border-[#7B1E3C]", isDark ? "bg-zinc-800" : "bg-gray-50")}>
                            {mentionType !== "none" && targetType !== "users" && <p className="text-blue-400 font-medium mb-1">@{mentionType}</p>}
                            {title && <h4 className={cn("font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>{title}</h4>}
                            <p className={cn("text-sm whitespace-pre-wrap", isDark ? "text-white/80" : "text-gray-700")}>
                                {message || "Your message will appear here..."}
                            </p>
                            {imagePreview && (
                                <div className="mt-3">
                                    <img src={imagePreview} alt="Attached" className="max-w-full max-h-48 rounded-lg object-contain" />
                                </div>
                            )}
                        </div>
                        <div className={cn("mt-3 text-xs", isDark ? "text-white/40" : "text-gray-500")}>
                            {targetType === "all_servers" && <>Sending to: All servers ({sendableServersCount} servers)</>}
                            {targetType === "specific_channel" && selectedGuilds.length > 0 && (
                                <>Sending to: {selectedGuilds.length} server(s), {selectedChannels.length} channel(s)</>
                            )}
                            {targetType === "users" && <>DM to: {selectedUsers.length} user(s)</>}
                        </div>
                    </motion.div>

                    {/* History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn("p-6 rounded-2xl border", isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200")}
                    >
                        <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white/70" : "text-gray-700")}>Recent Broadcasts</h3>
                        {history.length > 0 ? (
                            <div className="space-y-2">
                                {history.map((item, index) => (
                                    <div key={index} className={cn("p-3 rounded-lg flex items-center justify-between", isDark ? "bg-zinc-800" : "bg-gray-50")}>
                                        <div className="flex items-center gap-2">
                                            {item.success ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                                            <span className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>{item.serversReached} sent</span>
                                        </div>
                                        <span className={cn("text-xs", isDark ? "text-white/40" : "text-gray-500")}>{item.timestamp}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={cn("text-sm text-center py-4", isDark ? "text-white/40" : "text-gray-500")}>No broadcasts yet</p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Server Selection Dialog */}
            <AnimatePresence>
                {showServerDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowServerDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full max-w-lg max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
                                isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
                            )}
                        >
                            <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>Select Servers</h3>
                                <button onClick={() => setShowServerDialog(false)} className="p-1 rounded hover:bg-white/10">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {guilds.map(guild => {
                                    const isSelected = selectedGuilds.find(g => g.id === guild.id);
                                    return (
                                        <button
                                            key={guild.id}
                                            onClick={() => toggleGuildSelection(guild)}
                                            className={cn(
                                                "w-full p-3 rounded-xl flex items-center gap-3 transition-colors mb-1",
                                                isSelected ? "bg-purple-500/20" : isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                isSelected ? "bg-purple-500 border-purple-500" : isDark ? "border-zinc-600" : "border-gray-300"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            {guild.icon ? (
                                                <img src={guild.icon} alt="" className="w-10 h-10 rounded-full" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                                    {guild.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1 text-left">
                                                <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{guild.name}</p>
                                                <p className="text-xs text-green-400">{guild.sendable_channels || 0} sendable channels</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className={cn("p-4 border-t", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <button
                                    onClick={() => setShowServerDialog(false)}
                                    className="w-full py-2.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600"
                                >
                                    Done ({selectedGuilds.length} selected)
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Channel Selection Dialog */}
            <AnimatePresence>
                {showChannelDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowChannelDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full max-w-lg max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
                                isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
                            )}
                        >
                            <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>Select Channels</h3>
                                <button onClick={() => setShowChannelDialog(false)} className="p-1 rounded hover:bg-white/10">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {selectedGuilds.map(guild => (
                                    <div key={guild.id} className="mb-4">
                                        <p className={cn("text-xs font-semibold px-3 py-1", isDark ? "text-zinc-500" : "text-gray-500")}>
                                            {guild.name}
                                        </p>
                                        {guild.channels.filter(c => c.can_send).map(channel => {
                                            const isSelected = selectedChannels.find(c => c.id === channel.id);
                                            const ChannelIcon = getChannelIcon(channel.type);
                                            return (
                                                <button
                                                    key={channel.id}
                                                    onClick={() => toggleChannelSelection(channel)}
                                                    className={cn(
                                                        "w-full p-2.5 rounded-xl flex items-center gap-3 transition-colors mb-1",
                                                        isSelected ? "bg-green-500/20" : isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                        isSelected ? "bg-green-500 border-green-500" : isDark ? "border-zinc-600" : "border-gray-300"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <ChannelIcon className="w-4 h-4 text-zinc-500" />
                                                    <span className={isDark ? "text-white" : "text-gray-900"}>{channel.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className={cn("p-4 border-t", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <button
                                    onClick={() => setShowChannelDialog(false)}
                                    className="w-full py-2.5 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600"
                                >
                                    Done ({selectedChannels.length} selected)
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Selection Dialog */}
            <AnimatePresence>
                {showUserDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowUserDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full max-w-lg max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
                                isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
                            )}
                        >
                            <div className={cn("p-4 border-b", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>Select Users</h3>
                                    <button onClick={() => setShowUserDialog(false)} className="p-1 rounded hover:bg-white/10">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder="Search users..."
                                        className={cn(
                                            "w-full pl-10 pr-4 py-2 rounded-xl outline-none",
                                            isDark ? "bg-zinc-800 border border-zinc-700 text-white" : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedUsers.find(u => u.id === user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleUserSelection(user)}
                                            disabled={user.isBanned}
                                            className={cn(
                                                "w-full p-3 rounded-xl flex items-center gap-3 transition-colors mb-1",
                                                user.isBanned ? "opacity-50 cursor-not-allowed" :
                                                    isSelected ? "bg-cyan-500/20" : isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                isSelected ? "bg-cyan-500 border-cyan-500" : isDark ? "border-zinc-600" : "border-gray-300"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 text-left">
                                                <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{user.displayName || user.username}</p>
                                                <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>@{user.username}</p>
                                            </div>
                                            {user.isBanned && <span className="text-xs text-red-400">Banned</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className={cn("p-4 border-t", isDark ? "border-zinc-700" : "border-gray-200")}>
                                <button
                                    onClick={() => setShowUserDialog(false)}
                                    className="w-full py-2.5 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600"
                                >
                                    Done ({selectedUsers.length} selected)
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
