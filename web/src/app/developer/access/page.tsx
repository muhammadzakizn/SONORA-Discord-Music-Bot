"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Shield,
    Plus,
    Trash2,
    Lock,
    Eye,
    EyeOff,
    Save,
    Check,
    X,
    Crown,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useSession } from "@/contexts/SessionContext";

interface DeveloperAccount {
    id: string;
    discordUsername: string;
    email?: string;
    isOwner: boolean;
    addedAt: string;
    permissions: {
        console: boolean;
        monitoring: boolean;
        controls: boolean;
        maintenance: boolean;
        messaging: boolean;
        bans: boolean;
        users: boolean;
        servers: boolean;
        accessManagement: boolean;
    };
}

const DEFAULT_PERMISSIONS = {
    console: true,
    monitoring: true,
    controls: false,
    maintenance: false,
    messaging: false,
    bans: false,
    users: false,
    servers: true,
    accessManagement: false,
};

const PERMISSION_LABELS: Record<string, string> = {
    console: "Console",
    monitoring: "Monitoring",
    controls: "Bot Controls",
    maintenance: "Maintenance Mode",
    messaging: "Broadcast Messaging",
    bans: "Ban Management",
    users: "User Management",
    servers: "Server List",
    accessManagement: "Access Management",
};

// Owner accounts (cannot be deleted)
const OWNER_ACCOUNTS: DeveloperAccount[] = [
    {
        id: "owner-1",
        discordUsername: "thixxert",
        email: "muhammadzakizn.07@gmail.com",
        isOwner: true,
        addedAt: "2024-01-01",
        permissions: {
            console: true,
            monitoring: true,
            controls: true,
            maintenance: true,
            messaging: true,
            bans: true,
            users: true,
            servers: true,
            accessManagement: true,
        },
    },
    {
        id: "owner-2",
        discordUsername: "zacksylvn",
        email: "muhammadzakizn@icloud.com",
        isOwner: true,
        addedAt: "2024-01-01",
        permissions: {
            console: true,
            monitoring: true,
            controls: true,
            maintenance: true,
            messaging: true,
            bans: true,
            users: true,
            servers: true,
            accessManagement: true,
        },
    },
];

export default function AccessManagementPage() {
    const { isDark } = useSettings();
    const { user } = useSession();
    const [accounts, setAccounts] = useState<DeveloperAccount[]>([...OWNER_ACCOUNTS]);
    const [showAccounts, setShowAccounts] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPermissions, setNewPermissions] = useState(DEFAULT_PERMISSIONS);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Load additional accounts from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("sonora-developer-accounts");
        if (stored) {
            try {
                const additional = JSON.parse(stored);
                setAccounts([...OWNER_ACCOUNTS, ...additional]);
            } catch {
                // Ignore parsing errors
            }
        }
    }, []);

    // Save accounts to localStorage
    const saveAccounts = (newAccounts: DeveloperAccount[]) => {
        const nonOwners = newAccounts.filter(a => !a.isOwner);
        localStorage.setItem("sonora-developer-accounts", JSON.stringify(nonOwners));
        setAccounts(newAccounts);
    };

    const handleAddAccount = () => {
        if (!newUsername.trim()) return;

        const newAccount: DeveloperAccount = {
            id: Date.now().toString(),
            discordUsername: newUsername.trim(),
            email: newEmail.trim() || undefined,
            isOwner: false,
            addedAt: new Date().toISOString().split("T")[0],
            permissions: { ...newPermissions },
        };

        saveAccounts([...accounts, newAccount]);
        setNewUsername("");
        setNewEmail("");
        setNewPermissions(DEFAULT_PERMISSIONS);
        setShowAddModal(false);
    };

    const handleRemoveAccount = (id: string) => {
        const account = accounts.find(a => a.id === id);
        if (account?.isOwner) return; // Cannot remove owners

        saveAccounts(accounts.filter(a => a.id !== id));
        setConfirmDelete(null);
    };

    const handleTogglePermission = (id: string, permission: string) => {
        const account = accounts.find(a => a.id === id);
        if (account?.isOwner) return; // Cannot modify owners

        const updated = accounts.map(a => {
            if (a.id === id) {
                return {
                    ...a,
                    permissions: {
                        ...a.permissions,
                        [permission]: !a.permissions[permission as keyof typeof a.permissions],
                    },
                };
            }
            return a;
        });

        saveAccounts(updated);
    };

    const maskEmail = (email?: string) => {
        if (!email) return "—";
        const [local, domain] = email.split("@");
        return `${local.slice(0, 2)}${"•".repeat(Math.min(local.length - 2, 6))}@${domain}`;
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
                            Access Management
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Manage developer accounts and permissions
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAccounts(!showAccounts)}
                        className={cn(
                            "px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2",
                            isDark
                                ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                        )}
                    >
                        {showAccounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showAccounts ? "Hide" : "Show"} Accounts
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Developer
                    </button>
                </div>
            </div>

            {/* Security Warning */}
            <div className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
            )}>
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                    <p className={cn("font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                        Security Notice
                    </p>
                    <p className={cn("text-sm mt-1", isDark ? "text-yellow-400/70" : "text-yellow-600")}>
                        Developer accounts have administrative access. Only add trusted users.
                        Owner accounts (marked with 👑) cannot be modified or deleted.
                    </p>
                </div>
            </div>

            {/* Account List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-gray-200"
                )}
            >
                <div className={cn(
                    "p-4 border-b",
                    isDark ? "border-white/10" : "border-gray-200"
                )}>
                    <h2 className={cn(
                        "font-semibold flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <Users className="w-5 h-5" />
                        Developer Accounts ({accounts.length})
                    </h2>
                </div>

                {!showAccounts ? (
                    <div className={cn(
                        "p-8 text-center",
                        isDark ? "text-white/50" : "text-gray-500"
                    )}>
                        <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Accounts are hidden for security</p>
                        <button
                            onClick={() => setShowAccounts(true)}
                            className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                        >
                            Click to reveal
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {accounts.map((account, index) => (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4",
                                    account.isOwner && (isDark ? "bg-purple-500/5" : "bg-purple-50")
                                )}
                            >
                                {/* Account Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                            account.isOwner
                                                ? "bg-purple-500/20 text-purple-400"
                                                : isDark
                                                    ? "bg-zinc-700 text-white"
                                                    : "bg-gray-200 text-gray-700"
                                        )}>
                                            {account.discordUsername.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-semibold",
                                                    isDark ? "text-white" : "text-gray-900"
                                                )}>
                                                    @{account.discordUsername}
                                                </span>
                                                {account.isOwner && (
                                                    <span className="text-yellow-500">👑</span>
                                                )}
                                                {account.isOwner && (
                                                    <Lock className="w-4 h-4 text-zinc-500" />
                                                )}
                                            </div>
                                            <p className={cn(
                                                "text-sm",
                                                isDark ? "text-white/40" : "text-gray-500"
                                            )}>
                                                {maskEmail(account.email)} • Added {account.addedAt}
                                            </p>
                                        </div>
                                    </div>

                                    {!account.isOwner && (
                                        <div className="flex gap-2">
                                            {confirmDelete === account.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRemoveAccount(account.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-medium"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete(null)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-sm font-medium",
                                                            isDark ? "bg-zinc-700 text-white" : "bg-gray-100 text-gray-700"
                                                        )}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDelete(account.id)}
                                                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Permissions */}
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(account.permissions).map(([key, enabled]) => (
                                        <button
                                            key={key}
                                            onClick={() => !account.isOwner && handleTogglePermission(account.id, key)}
                                            disabled={account.isOwner}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                                enabled
                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                    : isDark
                                                        ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
                                                        : "bg-gray-100 text-gray-400 border border-gray-200",
                                                account.isOwner && "cursor-not-allowed opacity-70"
                                            )}
                                        >
                                            {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {PERMISSION_LABELS[key]}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Add Account Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={cn(
                                "w-full max-w-lg rounded-2xl p-6",
                                isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className={cn(
                                "text-xl font-bold mb-4 flex items-center gap-2",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                <Plus className="w-5 h-5 text-purple-400" />
                                Add Developer Account
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-1",
                                        isDark ? "text-white/70" : "text-gray-600"
                                    )}>
                                        Discord Username *
                                    </label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        placeholder="username"
                                        className={cn(
                                            "w-full px-4 py-2 rounded-lg outline-none transition-colors",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-1",
                                        isDark ? "text-white/70" : "text-gray-600"
                                    )}>
                                        Email (optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className={cn(
                                            "w-full px-4 py-2 rounded-lg outline-none transition-colors",
                                            isDark
                                                ? "bg-zinc-800 border border-zinc-700 text-white"
                                                : "bg-gray-100 border border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        isDark ? "text-white/70" : "text-gray-600"
                                    )}>
                                        Permissions
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(newPermissions).map(([key, enabled]) => (
                                            <button
                                                key={key}
                                                onClick={() => setNewPermissions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                                                    enabled
                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                        : isDark
                                                            ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
                                                            : "bg-gray-100 text-gray-400 border border-gray-200"
                                                )}
                                            >
                                                {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {PERMISSION_LABELS[key]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-medium",
                                        isDark ? "bg-zinc-800 text-white" : "bg-gray-100 text-gray-700"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddAccount}
                                    disabled={!newUsername.trim()}
                                    className="flex-1 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Add Account
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
