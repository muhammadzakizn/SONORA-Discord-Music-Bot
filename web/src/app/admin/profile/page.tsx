"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
    User,
    Camera,
    AtSign,
    Mail,
    Calendar,
    Shield,
    Crown,
    Server,
    Check,
    X,
    Edit3,
} from "lucide-react";
import { useSession, getAvatarUrl, getServerIconUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { user, displayName: contextDisplayName, setDisplayName: setContextDisplayName, managedGuilds } = useSession();
    const { isDark, t } = useSettings();
    const [localDisplayName, setLocalDisplayName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize local display name from context
    useEffect(() => {
        if (contextDisplayName) {
            setLocalDisplayName(contextDisplayName);
        }
    }, [contextDisplayName]);

    const handleSave = async () => {
        if (!localDisplayName.trim()) return;

        setIsSaving(true);
        setSaveMessage(null);

        // Save to context (which persists to localStorage)
        setContextDisplayName(localDisplayName.trim());

        await new Promise(resolve => setTimeout(resolve, 300));

        setSaveMessage({ type: 'success', text: t('profile.saved') });
        setIsEditing(false);
        setIsSaving(false);

        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleCancel = () => {
        setLocalDisplayName(contextDisplayName || user?.username || "");
        setIsEditing(false);
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className={isDark ? "text-zinc-500" : "text-gray-500"}>Loading profile...</p>
            </div>
        );
    }

    const avatarUrl = getAvatarUrl(user);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className={cn(
                    "text-3xl font-bold mb-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>{t('profile.title')}</h1>
                <p className={isDark ? "text-zinc-400" : "text-gray-500"}>{t('profile.subtitle')}</p>
            </div>

            {/* Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-8 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}
            >
                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                    <div className="relative group">
                        <Image
                            src={avatarUrl}
                            alt={user.username}
                            width={120}
                            height={120}
                            className="rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <button className="absolute -bottom-2 -right-2 p-2 bg-[#7B1E3C] rounded-full hover:bg-[#9B2E4C] transition-colors">
                            <Camera className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    <div className="flex-1">
                        <div className="mb-4">
                            <label className={cn(
                                "text-sm mb-1 block",
                                isDark ? "text-zinc-500" : "text-gray-500"
                            )}>{t('profile.displayName')}</label>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={localDisplayName}
                                        onChange={(e) => setLocalDisplayName(e.target.value)}
                                        className={cn(
                                            "flex-1 px-4 py-2 rounded-lg border focus:outline-none",
                                            isDark
                                                ? "bg-zinc-800 border-zinc-700 focus:border-[#7B1E3C] text-white"
                                                : "bg-gray-100 border-gray-200 focus:border-[#7B1E3C] text-gray-900"
                                        )}
                                        maxLength={32}
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || !localDisplayName.trim()}
                                        className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-gray-200 hover:bg-gray-300"
                                        )}
                                    >
                                        <X className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h2 className={cn(
                                        "text-2xl font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>{localDisplayName || user.username}</h2>
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            setTimeout(() => inputRef.current?.focus(), 100);
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors",
                                            isDark
                                                ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                        )}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {saveMessage && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "text-sm mb-4",
                                    saveMessage.type === 'success' ? 'text-green-400' : 'text-rose-400'
                                )}
                            >
                                {saveMessage.text}
                            </motion.p>
                        )}

                        <div className="space-y-2">
                            <div className={cn(
                                "flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                <AtSign className="w-4 h-4" />
                                <span className="text-sm">
                                    {t('profile.discord')}: <span className={isDark ? "text-white" : "text-gray-900"}>@{user.username}</span>
                                </span>
                            </div>
                            {user.email && (
                                <div className={cn(
                                    "flex items-center gap-2",
                                    isDark ? "text-zinc-400" : "text-gray-500"
                                )}>
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                            )}
                            <div className={cn(
                                "flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                    {t('profile.discordId')}: <code className="text-[#7B1E3C]">{user.id}</code>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className={cn(
                    "border-t my-6",
                    isDark ? "border-zinc-800" : "border-gray-200"
                )} />

                {/* Account Info */}
                <div>
                    <h3 className={cn(
                        "text-lg font-semibold mb-4 flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <User className="w-5 h-5 text-[#7B1E3C]" />
                        {t('profile.accountInfo')}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-zinc-800/50" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-zinc-500" : "text-gray-500"}>{t('profile.discordUsername')}</p>
                            <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{user.username}</p>
                            <p className={cn("text-xs mt-1", isDark ? "text-zinc-600" : "text-gray-400")}>
                                {t('profile.cannotChange')}
                            </p>
                        </div>
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-zinc-800/50" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-zinc-500" : "text-gray-500"}>{t('profile.accountType')}</p>
                            <p className="font-medium text-[#7B1E3C]">Admin</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Managed Servers */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                    "p-8 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}
            >
                <h3 className={cn(
                    "text-lg font-semibold mb-6 flex items-center gap-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    <Server className="w-5 h-5 text-cyan-400" />
                    {t('profile.managedServers')} ({managedGuilds.length})
                </h3>

                {managedGuilds.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {managedGuilds.map((guild) => {
                            const iconUrl = getServerIconUrl(guild);
                            return (
                                <div
                                    key={guild.id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl transition-colors",
                                        isDark
                                            ? "bg-zinc-800/50 hover:bg-zinc-800"
                                            : "bg-gray-100/50 hover:bg-gray-100"
                                    )}
                                >
                                    {iconUrl ? (
                                        <Image
                                            src={iconUrl}
                                            alt={guild.name}
                                            width={48}
                                            height={48}
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center",
                                            isDark ? "bg-zinc-700" : "bg-gray-200"
                                        )}>
                                            <Server className={cn("w-6 h-6", isDark ? "text-zinc-500" : "text-gray-400")} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "font-medium truncate",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>{guild.name}</p>
                                        <p className={cn(
                                            "text-sm flex items-center gap-1",
                                            isDark ? "text-zinc-500" : "text-gray-500"
                                        )}>
                                            {guild.owner ? (
                                                <>
                                                    <Crown className="w-3 h-3 text-yellow-500" />
                                                    <span>Owner</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-3 h-3 text-[#7B1E3C]" />
                                                    <span>Administrator</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className={cn(
                        "text-center py-8",
                        isDark ? "text-zinc-500" : "text-gray-500"
                    )}>
                        {t('profile.noServers')}
                    </p>
                )}
            </motion.div>

            {/* Danger Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "p-8 rounded-2xl border border-rose-500/30",
                    isDark ? "bg-zinc-900" : "bg-white"
                )}
            >
                <h3 className="text-lg font-semibold mb-4 text-rose-400">{t('profile.dangerZone')}</h3>
                <p className={cn(
                    "text-sm mb-4",
                    isDark ? "text-zinc-400" : "text-gray-500"
                )}>
                    {t('profile.logoutWarning')}
                </p>
                <button
                    onClick={() => {
                        document.cookie = 'sonora-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        window.location.href = '/login';
                    }}
                    className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-colors"
                >
                    {t('profile.logout')}
                </button>
            </motion.div>
        </div>
    );
}
