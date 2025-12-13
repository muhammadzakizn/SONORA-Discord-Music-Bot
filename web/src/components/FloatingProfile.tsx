"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    User,
    LayoutDashboard,
    LogOut,
    ChevronUp,
    Shield,
} from "lucide-react";
import { useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

// Developer Discord IDs
const DEVELOPER_IDS = ["564879374843854869"]; // @thixxert

export function FloatingProfileButton() {
    const { user, displayName, isLoggedIn, logout } = useSession();
    const { isDark, t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);

    // Don't show if not logged in
    if (!isLoggedIn || !user) return null;

    const isDeveloper = DEVELOPER_IDS.includes(user.id);
    const dashboardPath = "/admin"; // Both admin and developer go to same dashboard

    return (
        <>
            {/* Profile Button - positioned next to Settings button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-24 z-50 p-2 rounded-2xl transition-all",
                    "backdrop-blur-2xl border",
                    isDark
                        ? "bg-zinc-900/80 border-white/20"
                        : "bg-white/80 border-black/10",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
                    "hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
                )}
                aria-label="Profile menu"
            >
                <Image
                    src={getAvatarUrl(user)}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="rounded-xl"
                />
            </motion.button>

            {/* Profile Popup */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={cn(
                                "fixed bottom-24 right-6 z-50 w-72 overflow-hidden rounded-2xl",
                                "backdrop-blur-2xl border",
                                isDark
                                    ? "bg-zinc-900/95 border-white/[0.15]"
                                    : "bg-white/95 border-black/[0.1]",
                                "shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                            )}
                        >
                            {/* User Info */}
                            <div className={cn(
                                "p-4 border-b",
                                isDark ? "border-white/[0.1]" : "border-black/[0.06]"
                            )}>
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={getAvatarUrl(user)}
                                        alt={user.username}
                                        width={48}
                                        height={48}
                                        className="rounded-xl"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "font-semibold truncate",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {displayName || user.username}
                                        </p>
                                        <p className={cn(
                                            "text-sm truncate",
                                            isDark ? "text-white/50" : "text-gray-500"
                                        )}>
                                            @{user.username}
                                        </p>
                                    </div>
                                </div>

                                {/* Role Badge */}
                                <div className={cn(
                                    "mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                                    isDeveloper
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-[#7B1E3C]/20 text-[#C4314B]"
                                )}>
                                    <Shield className="w-3 h-3" />
                                    {isDeveloper ? "Developer" : "Admin"}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-2">
                                <Link
                                    href={dashboardPath}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                                        isDark
                                            ? "text-white/80 hover:text-white hover:bg-white/[0.08]"
                                            : "text-gray-700 hover:text-gray-900 hover:bg-black/[0.05]"
                                    )}
                                >
                                    <LayoutDashboard className="w-5 h-5" />
                                    <span className="text-sm font-medium">
                                        {isDeveloper ? "Developer Dashboard" : "Admin Dashboard"}
                                    </span>
                                </Link>

                                <Link
                                    href="/admin/profile"
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                                        isDark
                                            ? "text-white/80 hover:text-white hover:bg-white/[0.08]"
                                            : "text-gray-700 hover:text-gray-900 hover:bg-black/[0.05]"
                                    )}
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-sm font-medium">{t('admin.profile')}</span>
                                </Link>

                                <div className={cn(
                                    "my-2 border-t",
                                    isDark ? "border-white/[0.1]" : "border-black/[0.06]"
                                )} />

                                <button
                                    onClick={() => {
                                        logout();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full text-left text-rose-500 hover:bg-rose-500/10"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-medium">{t('admin.logout')}</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Export for use in home page hero
export function DashboardButton({ isDark }: { isDark: boolean }) {
    const { user, isLoggedIn, devSession, isDevLoggedIn, isLoading } = useSession();
    const { t } = useSettings();
    const [mounted, setMounted] = useState(false);

    // Ensure hydration is complete
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDeveloper = user ? DEVELOPER_IDS.includes(user.id) : false;

    // Show login button during SSR and initial hydration
    if (!mounted || isLoading) {
        return (
            <Link
                href="/login"
                className={cn(
                    "px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 border flex items-center justify-center gap-2",
                    isDark
                        ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        : "bg-gray-900/10 border-gray-900/20 hover:bg-gray-900/20 text-gray-900"
                )}
            >
                <span>Dashboard Login</span>
            </Link>
        );
    }

    // Check if developer is logged in via dev portal
    if (isDevLoggedIn && devSession) {
        return (
            <Link
                href="/developer"
                className={cn(
                    "px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 border flex items-center justify-center gap-3",
                    isDark
                        ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        : "bg-gray-900/10 border-gray-900/20 hover:bg-gray-900/20 text-gray-900"
                )}
            >
                {devSession.avatar ? (
                    <Image
                        src={devSession.avatar}
                        alt={devSession.username}
                        width={28}
                        height={28}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {devSession.username?.charAt(0).toUpperCase() || 'D'}
                    </div>
                )}
                <span>Developer Panel</span>
            </Link>
        );
    }

    // Check if logged in via Discord OAuth
    if (isLoggedIn && user) {
        return (
            <Link
                href="/admin"
                className={cn(
                    "px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 border flex items-center justify-center gap-3",
                    isDark
                        ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        : "bg-gray-900/10 border-gray-900/20 hover:bg-gray-900/20 text-gray-900"
                )}
            >
                <Image
                    src={getAvatarUrl(user)}
                    alt={user.username}
                    width={28}
                    height={28}
                    className="rounded-full"
                />
                <span>{isDeveloper ? "Developer Panel" : "Admin Panel"}</span>
            </Link>
        );
    }

    // Show login button when not logged in
    return (
        <Link
            href="/login"
            className={cn(
                "px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 border flex items-center justify-center gap-2",
                isDark
                    ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    : "bg-gray-900/10 border-gray-900/20 hover:bg-gray-900/20 text-gray-900"
            )}
        >
            <span>Dashboard Login</span>
        </Link>
    );
}
