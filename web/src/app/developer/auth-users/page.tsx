"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Shield,
    Search,
    RefreshCw,
    UserCheck,
    UserX,
    Clock,
    Key,
    Smartphone,
    Mail,
    MessageSquare,
    Fingerprint,
    History,
    X,
    ChevronRight,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface AuthUser {
    id: number;
    discord_id: string;
    username: string;
    email?: string;
    avatar_url?: string;
    status: 'pending' | 'active' | 'suspended' | 'banned';
    mfa_enabled: boolean;
    role: 'user' | 'admin' | 'developer';
    created_at: string;
    last_login?: string;
    failed_attempts: number;
}

interface MFAMethod {
    id: number;
    method_type: 'totp' | 'discord' | 'passkey' | 'email';
    is_primary: boolean;
    is_active: boolean;
    created_at: string;
    last_used?: string;
}

interface SecurityLogEntry {
    id: number;
    event_type: string;
    ip_address?: string;
    success: boolean;
    created_at: string;
}

const API_BASE = '/api/bot';

const STATUS_COLORS = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
    active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
    suspended: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Suspended' },
    banned: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Banned' },
};

const MFA_ICONS = {
    totp: Smartphone,
    discord: MessageSquare,
    passkey: Fingerprint,
    email: Mail,
};

export default function AuthUsersPage() {
    const { isDark } = useSettings();
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
    const [userMfaMethods, setUserMfaMethods] = useState<MFAMethod[]>([]);
    const [userSecurityLog, setUserSecurityLog] = useState<SecurityLogEntry[]>([]);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/users`, {
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            } else {
                setUsers([]);
            }
        } catch {
            setUsers([]);
        }
        setLoading(false);
    };

    const fetchUserDetails = async (user: AuthUser) => {
        setSelectedUser(user);
        setShowUserDetails(true);

        try {
            const [mfaRes, logRes] = await Promise.all([
                fetch(`${API_BASE}/api/auth/mfa/methods?user_id=${user.id}`),
                fetch(`${API_BASE}/api/auth/security-log?user_id=${user.id}&limit=20`),
            ]);

            if (mfaRes.ok) {
                const mfaData = await mfaRes.json();
                setUserMfaMethods(mfaData.methods || []);
            }

            if (logRes.ok) {
                const logData = await logRes.json();
                setUserSecurityLog(logData.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch user details:', error);
        }
    };

    const updateUserStatus = async (userId: number, status: string) => {
        setUpdating(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/user/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                // Update local state
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, status: status as AuthUser['status'] } : u
                ));
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, status: status as AuthUser['status'] } : null);
                }
            }
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
        setUpdating(false);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.discord_id.includes(search) ||
            user.email?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        pending: users.filter(u => u.status === 'pending').length,
        mfaEnabled: users.filter(u => u.mfa_enabled).length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-purple-500/20" : "bg-purple-500/10"
                    )}>
                        <Shield className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Auth Users
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Manage authenticated users and MFA settings
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors",
                        isDark
                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.total, color: 'text-purple-400' },
                    { label: 'Active', value: stats.active, color: 'text-green-400' },
                    { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
                    { label: 'MFA Enabled', value: stats.mfaEnabled, color: 'text-cyan-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "p-4 rounded-xl border text-center",
                            isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                        )}
                    >
                        <p className={cn("text-3xl font-bold", stat.color)}>{stat.value}</p>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className={cn(
                "flex flex-col md:flex-row gap-4 p-4 rounded-xl border",
                isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
            )}>
                <div className="relative flex-1">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                        isDark ? "text-zinc-500" : "text-gray-400"
                    )} />
                    <input
                        type="text"
                        placeholder="Search by username, Discord ID, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                            "w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-colors text-sm",
                            isDark
                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                : "bg-gray-100 border border-gray-200 text-gray-900"
                        )}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'active', 'pending', 'suspended', 'banned'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                                statusFilter === status
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                )}
            >
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-purple-400" />
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className={cn("p-8 text-center", isDark ? "text-white/50" : "text-gray-500")}>
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No users found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredUsers.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => fetchUserDetails(user)}
                                className={cn(
                                    "p-4 flex items-center gap-4 cursor-pointer transition-colors",
                                    isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                )}
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            isDark ? "bg-zinc-700" : "bg-gray-200"
                                        )}>
                                            <Users className="w-5 h-5 text-zinc-400" />
                                        </div>
                                    )}
                                    {user.mfa_enabled && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <Shield className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "font-medium truncate",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>
                                        {user.username}
                                    </p>
                                    <p className={cn(
                                        "text-xs font-mono truncate",
                                        isDark ? "text-white/30" : "text-gray-500"
                                    )}>
                                        {user.discord_id}
                                    </p>
                                </div>

                                {/* Role */}
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium capitalize hidden sm:block",
                                    user.role === 'developer' ? "bg-purple-500/20 text-purple-400" :
                                        user.role === 'admin' ? "bg-cyan-500/20 text-cyan-400" :
                                            isDark ? "bg-zinc-700 text-zinc-400" : "bg-gray-100 text-gray-600"
                                )}>
                                    {user.role}
                                </span>

                                {/* Status */}
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    STATUS_COLORS[user.status].bg,
                                    STATUS_COLORS[user.status].text
                                )}>
                                    {STATUS_COLORS[user.status].label}
                                </span>

                                <ChevronRight className={cn(
                                    "w-4 h-4",
                                    isDark ? "text-white/30" : "text-gray-400"
                                )} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* User Details Modal */}
            <AnimatePresence>
                {showUserDetails && selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowUserDetails(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* User Header */}
                            <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-inherit">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        {selectedUser.avatar_url ? (
                                            <img
                                                src={selectedUser.avatar_url}
                                                alt={selectedUser.username}
                                                className="w-16 h-16 rounded-full"
                                            />
                                        ) : (
                                            <div className={cn(
                                                "w-16 h-16 rounded-full flex items-center justify-center",
                                                isDark ? "bg-zinc-700" : "bg-gray-200"
                                            )}>
                                                <Users className="w-8 h-8 text-zinc-400" />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className={cn(
                                                "text-xl font-bold",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {selectedUser.username}
                                            </h2>
                                            <p className={cn(
                                                "text-sm font-mono",
                                                isDark ? "text-white/50" : "text-gray-500"
                                            )}>
                                                {selectedUser.discord_id}
                                            </p>
                                            {selectedUser.email && (
                                                <p className={cn(
                                                    "text-sm",
                                                    isDark ? "text-white/40" : "text-gray-400"
                                                )}>
                                                    {selectedUser.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowUserDetails(false)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                        )}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Status Actions */}
                                <div>
                                    <h3 className={cn(
                                        "text-sm font-medium mb-3",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        Account Status
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['active', 'suspended', 'banned'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => updateUserStatus(selectedUser.id, status)}
                                                disabled={updating || selectedUser.status === status}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-2",
                                                    selectedUser.status === status
                                                        ? `${STATUS_COLORS[status as keyof typeof STATUS_COLORS].bg} ${STATUS_COLORS[status as keyof typeof STATUS_COLORS].text}`
                                                        : isDark
                                                            ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                                                    (updating || selectedUser.status === status) && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {status === 'active' && <UserCheck className="w-4 h-4" />}
                                                {status === 'suspended' && <Clock className="w-4 h-4" />}
                                                {status === 'banned' && <UserX className="w-4 h-4" />}
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* MFA Methods */}
                                <div>
                                    <h3 className={cn(
                                        "text-sm font-medium mb-3 flex items-center gap-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        <Key className="w-4 h-4" />
                                        MFA Methods
                                    </h3>
                                    {userMfaMethods.length === 0 ? (
                                        <p className={cn(
                                            "text-sm p-3 rounded-lg",
                                            isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500"
                                        )}>
                                            No MFA methods configured
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {userMfaMethods.map(method => {
                                                const Icon = MFA_ICONS[method.method_type] || Shield;
                                                return (
                                                    <div
                                                        key={method.id}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-lg",
                                                            isDark ? "bg-zinc-800" : "bg-gray-100"
                                                        )}
                                                    >
                                                        <Icon className={cn(
                                                            "w-5 h-5",
                                                            method.is_active ? "text-green-400" : "text-zinc-500"
                                                        )} />
                                                        <div className="flex-1">
                                                            <p className={cn(
                                                                "font-medium capitalize",
                                                                isDark ? "text-white" : "text-gray-900"
                                                            )}>
                                                                {method.method_type}
                                                            </p>
                                                            <p className={cn(
                                                                "text-xs",
                                                                isDark ? "text-white/40" : "text-gray-500"
                                                            )}>
                                                                {method.last_used
                                                                    ? `Last used: ${new Date(method.last_used).toLocaleDateString()}`
                                                                    : 'Never used'}
                                                            </p>
                                                        </div>
                                                        {method.is_primary && (
                                                            <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Security Log */}
                                <div>
                                    <h3 className={cn(
                                        "text-sm font-medium mb-3 flex items-center gap-2",
                                        isDark ? "text-white/70" : "text-gray-700"
                                    )}>
                                        <History className="w-4 h-4" />
                                        Recent Security Events
                                    </h3>
                                    {userSecurityLog.length === 0 ? (
                                        <p className={cn(
                                            "text-sm p-3 rounded-lg",
                                            isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500"
                                        )}>
                                            No security events
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {userSecurityLog.map(log => (
                                                <div
                                                    key={log.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg text-sm",
                                                        isDark ? "bg-zinc-800" : "bg-gray-100"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        log.success ? "bg-green-400" : "bg-rose-400"
                                                    )} />
                                                    <span className={cn(
                                                        "flex-1",
                                                        isDark ? "text-white/80" : "text-gray-700"
                                                    )}>
                                                        {log.event_type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs",
                                                        isDark ? "text-white/30" : "text-gray-400"
                                                    )}>
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Account Info */}
                                <div className={cn(
                                    "p-4 rounded-lg text-sm",
                                    isDark ? "bg-zinc-800" : "bg-gray-100"
                                )}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className={isDark ? "text-white/40" : "text-gray-500"}>Created</p>
                                            <p className={isDark ? "text-white" : "text-gray-900"}>
                                                {new Date(selectedUser.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={isDark ? "text-white/40" : "text-gray-500"}>Last Login</p>
                                            <p className={isDark ? "text-white" : "text-gray-900"}>
                                                {selectedUser.last_login
                                                    ? new Date(selectedUser.last_login).toLocaleDateString()
                                                    : 'Never'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={isDark ? "text-white/40" : "text-gray-500"}>Role</p>
                                            <p className={cn(
                                                "capitalize",
                                                isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {selectedUser.role}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={isDark ? "text-white/40" : "text-gray-500"}>Failed Attempts</p>
                                            <p className={cn(
                                                selectedUser.failed_attempts > 0 ? "text-rose-400" : isDark ? "text-white" : "text-gray-900"
                                            )}>
                                                {selectedUser.failed_attempts}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
