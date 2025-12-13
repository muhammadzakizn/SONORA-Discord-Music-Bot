"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Home,
    Compass,
    User,
    Settings,
    ArrowUp,
    X,
    FileText,
    Shield,
    BookOpen,
    HelpCircle,
    LogIn,
    LogOut,
    LayoutDashboard,
    Globe,
    Sun,
    Moon,
    Monitor,
    Type,
    Eye,
    Zap,
    Accessibility,
    Lock,
    Menu,
    Info,
    Download,
    Sparkles,
    ExternalLink,
} from "lucide-react";
import { useSession, getAvatarUrl, DiscordUser } from "@/contexts/SessionContext";
import { useSettings, LANGUAGES, Language } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { WEB_VERSION } from "@/constants/version";
import { useUpdate } from "@/contexts/UpdateContext";
import { UpdateDialog } from "@/components/UpdateDialog";

// SONORA Brand Colors
const BRAND = {
    primary: "#7B1E3C",
    primaryLight: "#9B2E4C",
    primaryDark: "#5B0E2C",
};

// Developer Discord IDs
const DEVELOPER_IDS = ["564879374843854869"];

// Discord Icon
const DiscordIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

type PopupType = "explore" | "profile" | "settings" | null;

export default function NavLiquidGlass() {
    const pathname = usePathname();
    const { user, isLoggedIn, logout, devSession, isDevLoggedIn, devLogout } = useSession();
    const {
        isDark,
        t,
        language,
        setLanguage,
        theme,
        setTheme,
        reducedMotion,
        setReducedMotion,
        highContrast,
        setHighContrast,
        fontSize,
        setFontSize,
        dyslexicFont,
        setDyslexicFont,
    } = useSettings();

    const [activePopup, setActivePopup] = useState<PopupType>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [isNavHidden, setIsNavHidden] = useState(false);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Detect scroll for auto-hide nav and scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show scroll-to-top after 300px
            setShowScrollTop(currentScrollY > 300);

            // Auto-hide nav on scroll down, show on scroll up
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                // Scrolling down - hide nav after a delay
                if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                scrollTimeout.current = setTimeout(() => {
                    setIsNavHidden(true);
                    setActivePopup(null); // Close any open popup
                }, 150);
            } else if (currentScrollY < lastScrollY.current) {
                // Scrolling up - show nav immediately
                if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                setIsNavHidden(false);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    // Close popup when route changes
    useEffect(() => {
        setActivePopup(null);
    }, [pathname]);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-nav-popup]") && !target.closest("[data-nav-button]")) {
                setActivePopup(null);
            }
        };
        if (activePopup) {
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [activePopup]);

    const scrollToTop = () => {
        // Try multiple methods to ensure scrolling to absolute top
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0; // For Safari
    };

    const togglePopup = (popup: PopupType) => {
        setActivePopup(activePopup === popup ? null : popup);
    };

    const toggleNavVisibility = () => {
        setIsNavHidden(!isNavHidden);
    };

    const isDeveloper = (user ? DEVELOPER_IDS.includes(user.id) : false) || isDevLoggedIn;

    return (
        <>
            {/* Popup Menus */}
            <AnimatePresence>
                {activePopup && (
                    <motion.div
                        data-nav-popup
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
                            // Responsive width matching nav
                            "w-[calc(100%-2rem)] sm:w-[320px] md:w-[420px] lg:w-[500px]",
                            "rounded-[32px] sm:rounded-[36px] overflow-hidden",
                            // True Apple Liquid Glass - more transparent
                            "backdrop-blur-[40px] border",
                            isDark
                                ? "bg-white/10 border-white/30"
                                : "bg-black/10 border-white/40",
                            "shadow-[0_8px_40px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]"
                        )}
                    >
                        {activePopup === "explore" && <ExploreMenu isDark={isDark} t={t} onClose={() => setActivePopup(null)} />}
                        {activePopup === "profile" && (
                            <ProfileMenu
                                user={user}
                                isLoggedIn={isLoggedIn}
                                isDeveloper={isDeveloper}
                                isDark={isDark}
                                t={t}
                                logout={logout}
                                onClose={() => setActivePopup(null)}
                                devSession={devSession}
                                isDevLoggedIn={isDevLoggedIn}
                                devLogout={devLogout}
                            />
                        )}
                        {activePopup === "settings" && (
                            <SettingsMenu
                                isDark={isDark}
                                t={t}
                                language={language}
                                setLanguage={setLanguage}
                                theme={theme}
                                setTheme={setTheme}
                                reducedMotion={reducedMotion}
                                setReducedMotion={setReducedMotion}
                                highContrast={highContrast}
                                setHighContrast={setHighContrast}
                                fontSize={fontSize}
                                setFontSize={setFontSize}
                                dyslexicFont={dyslexicFont}
                                setDyslexicFont={setDyslexicFont}
                                onClose={() => setActivePopup(null)}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Bar Container - Fixed position with AnimatePresence for auto-hide */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
                <AnimatePresence mode="wait">
                    {!isNavHidden ? (
                        /* Main Nav Container - Visible */
                        <motion.nav
                            key="nav-bar"
                            initial={{ y: 100, opacity: 0 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                boxShadow: "0 0 40px rgba(255,255,255,0.1)"
                            }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={cn(
                                // Using CSS class for responsive sizing to avoid hydration issues
                                "nav-main-container",
                                // True Apple Liquid Glass - more transparent, subtle border
                                "backdrop-blur-[40px]",
                                isDark
                                    ? "bg-white/10 border border-white/10"
                                    : "bg-black/5 border border-black/5",
                                // Subtle shadow for depth
                                "shadow-[0_4px_30px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                            )}
                        >
                            {/* Home */}
                            <NavButton
                                icon={Home}
                                label={t("nav.home")}
                                isActive={pathname === "/"}
                                onClick={() => { }}
                                href="/"
                                isDark={isDark}
                            />

                            {/* Explore */}
                            <NavButton
                                icon={Compass}
                                label={t("nav.explore") || "Explore"}
                                isActive={activePopup === "explore"}
                                onClick={() => togglePopup("explore")}
                                isDark={isDark}
                                data-nav-button
                            />

                            {/* Settings */}
                            <NavButton
                                icon={Settings}
                                label={t("nav.settings")}
                                isActive={activePopup === "settings"}
                                onClick={() => togglePopup("settings")}
                                isDark={isDark}
                                data-nav-button
                            />

                            {/* Profile */}
                            <NavButton
                                icon={(isLoggedIn && user) || isDevLoggedIn ? undefined : User}
                                avatarUrl={
                                    isLoggedIn && user
                                        ? getAvatarUrl(user)
                                        : isDevLoggedIn && devSession?.avatar
                                            ? devSession.avatar
                                            : isDevLoggedIn
                                                ? '/default-dev-avatar.png'
                                                : undefined
                                }
                                label={t("nav.profile") || "Profile"}
                                isActive={activePopup === "profile"}
                                onClick={() => togglePopup("profile")}
                                isDark={isDark}
                                data-nav-button
                                showBadge={isDevLoggedIn}
                            />
                        </motion.nav>
                    ) : null}
                </AnimatePresence>

                {/* Scroll to Top - Always visible beside nav/menu button */}
                <motion.button
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", damping: 20 }}
                    whileHover={showScrollTop ? { scale: 1.05 } : {}}
                    whileTap={showScrollTop ? { scale: 0.95 } : {}}
                    onClick={showScrollTop ? scrollToTop : undefined}
                    disabled={!showScrollTop}
                    className={cn(
                        "scroll-top-btn",
                        "backdrop-blur-[40px] border transition-all",
                        isDark
                            ? "bg-white/10 border-white/30"
                            : "bg-black/10 border-black/20",
                        "shadow-[0_8px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]",
                        !showScrollTop && "cursor-default"
                    )}
                    aria-label="Scroll to top"
                    aria-disabled={!showScrollTop}
                >
                    <ArrowUp className={cn(
                        "scroll-top-icon transition-colors",
                        showScrollTop
                            ? isDark ? "text-white" : "text-gray-900"
                            : isDark ? "text-white/30" : "text-gray-400"
                    )} />
                </motion.button>
            </div>
        </>
    );
}

// Nav Button Component
function NavButton({
    icon: Icon,
    avatarUrl,
    label,
    isActive,
    onClick,
    href,
    isDark,
    ...props
}: {
    icon?: React.ElementType;
    avatarUrl?: string;
    label: string;
    isActive: boolean;
    onClick?: () => void;
    href?: string;
    isDark: boolean;
    [key: string]: unknown;
}) {
    const content = (
        <div className="nav-btn-container">
            <div
                className={cn(
                    "nav-btn-icon-wrapper transition-all",
                    isActive
                        ? "bg-[#7B1E3C] text-white shadow-[0_0_20px_rgba(123,30,60,0.5)]"
                        : isDark
                            ? "text-white/70 hover:text-white hover:bg-white/15"
                            : "text-gray-600 hover:text-gray-900 hover:bg-black/10"
                )}
            >
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt="Profile"
                        width={28}
                        height={28}
                        className="nav-btn-icon rounded-full"
                    />
                ) : Icon ? (
                    <Icon className="nav-btn-icon" />
                ) : null}
            </div>
            <span
                className={cn(
                    "nav-btn-label",
                    isActive
                        ? "text-[#7B1E3C]"
                        : isDark
                            ? "text-white/60"
                            : "text-gray-500"
                )}
            >
                {label}
            </span>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block" {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} className="block" {...props}>
            {content}
        </button>
    );
}

// Explore Menu
function ExploreMenu({ isDark, t, onClose }: { isDark: boolean; t: (key: string) => string; onClose: () => void }) {
    const links = [
        { icon: FileText, label: t("legal.terms") || "Terms of Service", href: "/terms" },
        { icon: Shield, label: t("legal.privacy") || "Privacy Policy", href: "/privacy" },
        { icon: BookOpen, label: t("docs.title") || "Documentation", href: "/docs" },
        { icon: HelpCircle, label: t("support.title") || "Support", href: "/support" },
    ];

    return (
        <div className="p-3">
            <div className="flex items-center justify-between mb-3 px-2">
                <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                    {t("nav.explore") || "Explore"}
                </h3>
                <button
                    onClick={onClose}
                    className={cn(
                        "p-1 rounded-lg transition-colors",
                        isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-gray-400"
                    )}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {links.map(({ icon: LinkIcon, label, href }) => (
                    <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isDark
                                ? "hover:bg-white/10 text-white/80"
                                : "hover:bg-black/5 text-gray-700"
                        )}
                    >
                        <LinkIcon className="w-5 h-5 text-[#7B1E3C]" />
                        <span className="text-sm font-medium">{label}</span>
                    </Link>
                ))}
            </div>
            {/* Status Link */}
            <div className={cn("mt-3 pt-3 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                <Link
                    href="/status"
                    onClick={onClose}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all",
                        isDark
                            ? "hover:bg-white/10 text-white/80"
                            : "hover:bg-black/5 text-gray-700"
                    )}
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <span className="text-sm font-medium">System Status</span>
                </Link>
            </div>
        </div>
    );
}

// Profile Menu
function ProfileMenu({
    user,
    isLoggedIn,
    isDeveloper,
    isDark,
    t,
    logout,
    onClose,
    devSession,
    isDevLoggedIn,
    devLogout,
}: {
    user: DiscordUser | null;
    isLoggedIn: boolean;
    isDeveloper: boolean;
    isDark: boolean;
    t: (key: string) => string;
    logout: () => void;
    onClose: () => void;
    devSession: { role: string; username: string; displayName?: string; avatar?: string } | null;
    isDevLoggedIn: boolean;
    devLogout: () => void;
}) {
    // Developer session active - show developer profile
    if (isDevLoggedIn && devSession) {
        return (
            <div className="p-3">
                <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                        Developer Profile
                    </h3>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1 rounded-lg transition-colors",
                            isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-gray-400"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Developer Info */}
                <div
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-xl mb-3",
                        isDark ? "bg-white/5" : "bg-gray-100"
                    )}
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                        {(devSession.displayName || devSession.username || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>
                            {devSession.displayName || devSession.username}
                        </p>
                        <p className={cn("text-sm truncate", isDark ? "text-white/50" : "text-gray-500")}>
                            {devSession.username}
                        </p>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400">
                        {devSession.role === 'owner' ? 'Owner' : 'Dev'}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-1">
                    <Link
                        href="/developer"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/10 text-white/80" : "hover:bg-black/5 text-gray-700"
                        )}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-sm font-medium">Developer Dashboard</span>
                    </Link>

                    <Link
                        href="/developer/profile"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/10 text-white/80" : "hover:bg-black/5 text-gray-700"
                        )}
                    >
                        <User className="w-5 h-5" />
                        <span className="text-sm font-medium">Profile Settings</span>
                    </Link>

                    <div className={cn("my-2 border-t", isDark ? "border-white/10" : "border-gray-200")} />

                    <button
                        onClick={() => {
                            devLogout();
                            onClose();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!isLoggedIn || !user) {
        // Not logged in - show login options
        return (
            <div className="p-3">
                <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                        {t("nav.profile") || "Profile"}
                    </h3>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-1 rounded-lg transition-colors",
                            isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-gray-400"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-2">
                    <Link
                        href="/login"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                        )}
                    >
                        <div className="p-2 rounded-lg bg-[#5865F2]/20">
                            <DiscordIcon />
                        </div>
                        <div className="flex-1">
                            <span className={cn("block text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                {t("login.admin")}
                            </span>
                            <span className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>
                                {t("login.admin.desc")}
                            </span>
                        </div>
                        <LogIn className="w-4 h-4 text-[#7B1E3C]" />
                    </Link>
                    <Link
                        href="/login"
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                        )}
                    >
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <Lock className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                            <span className={cn("block text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                {t("login.developer")}
                            </span>
                            <span className={cn("text-xs", isDark ? "text-white/50" : "text-gray-500")}>
                                {t("login.developer.desc")}
                            </span>
                        </div>
                        <LogIn className="w-4 h-4 text-[#7B1E3C]" />
                    </Link>
                </div>
            </div>
        );
    }

    // Logged in - show profile info
    return (
        <div className="p-3">
            <div className="flex items-center justify-between mb-3 px-2">
                <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                    {t("nav.profile") || "Profile"}
                </h3>
                <button
                    onClick={onClose}
                    className={cn(
                        "p-1 rounded-lg transition-colors",
                        isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-gray-400"
                    )}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* User Info */}
            <div
                className={cn(
                    "flex items-center gap-3 p-3 rounded-xl mb-3",
                    isDark ? "bg-white/5" : "bg-gray-100"
                )}
            >
                <Image
                    src={getAvatarUrl(user)}
                    alt={user.username}
                    width={48}
                    height={48}
                    className="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>
                        {user.username}
                    </p>
                    <p className={cn("text-sm truncate", isDark ? "text-white/50" : "text-gray-500")}>
                        @{user.username}
                    </p>
                </div>
                <div
                    className={cn(
                        "px-2 py-1 rounded-lg text-xs font-medium",
                        isDeveloper ? "bg-purple-500/20 text-purple-400" : "bg-[#7B1E3C]/20 text-[#C4314B]"
                    )}
                >
                    {isDeveloper ? "Dev" : "Admin"}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
                <Link
                    href="/admin"
                    onClick={onClose}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                        isDark ? "hover:bg-white/10 text-white/80" : "hover:bg-black/5 text-gray-700"
                    )}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-sm font-medium">
                        {isDeveloper ? "Developer Dashboard" : "Admin Dashboard"}
                    </span>
                </Link>

                <Link
                    href="/admin/profile"
                    onClick={onClose}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                        isDark ? "hover:bg-white/10 text-white/80" : "hover:bg-black/5 text-gray-700"
                    )}
                >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">{t("admin.profile")}</span>
                </Link>

                <div className={cn("my-2 border-t", isDark ? "border-white/10" : "border-gray-200")} />

                <button
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">{t("admin.logout")}</span>
                </button>
            </div>
        </div>
    );
}

// Settings Menu
function SettingsMenu({
    isDark,
    t,
    language,
    setLanguage,
    theme,
    setTheme,
    reducedMotion,
    setReducedMotion,
    highContrast,
    setHighContrast,
    fontSize,
    setFontSize,
    dyslexicFont,
    setDyslexicFont,
    onClose,
}: {
    isDark: boolean;
    t: (key: string) => string;
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: "light" | "dark" | "system";
    setTheme: (theme: "light" | "dark" | "system") => void;
    reducedMotion: boolean;
    setReducedMotion: (value: boolean) => void;
    highContrast: boolean;
    setHighContrast: (value: boolean) => void;
    fontSize: "normal" | "large" | "xlarge";
    setFontSize: (size: "normal" | "large" | "xlarge") => void;
    dyslexicFont: boolean;
    setDyslexicFont: (value: boolean) => void;
    onClose: () => void;
}) {
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

    return (
        <div className="p-3 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 px-2">
                <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                    {t("settings.title")}
                </h3>
                <button
                    onClick={onClose}
                    className={cn(
                        "p-1 rounded-lg transition-colors",
                        isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-gray-400"
                    )}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Language Selection - Opens fullscreen modal */}
                <div>
                    <label
                        className={cn(
                            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 px-1",
                            isDark ? "text-white/50" : "text-gray-400"
                        )}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        {t("settings.language")}
                    </label>
                    <button
                        onClick={() => setShowLanguageDropdown(true)}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                            isDark
                                ? "bg-white/5 hover:bg-white/10 border border-white/10"
                                : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                        )}
                    >
                        <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                            {LANGUAGES[language].nativeName}
                        </span>
                        <span className={cn("text-sm", isDark ? "text-white/50" : "text-gray-500")}>
                            {LANGUAGES[language].name}
                        </span>
                    </button>
                </div>

                {/* Fullscreen Language Modal */}
                <AnimatePresence>
                    {showLanguageDropdown && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowLanguageDropdown(false)}
                                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                            />
                            {/* Modal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                    "fixed inset-4 z-[101] flex flex-col rounded-[28px] overflow-hidden",
                                    "backdrop-blur-3xl border",
                                    isDark
                                        ? "bg-black/80 border-white/20"
                                        : "bg-white/80 border-white/50",
                                    "shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
                                )}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-white/10">
                                    <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
                                        {t("settings.language")}
                                    </h3>
                                    <button
                                        onClick={() => setShowLanguageDropdown(false)}
                                        className={cn(
                                            "p-2 rounded-xl transition-colors",
                                            isDark ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-gray-900"
                                        )}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {/* Language List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                setLanguage(lang);
                                                setShowLanguageDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                                                language === lang
                                                    ? "bg-[#7B1E3C] text-white"
                                                    : isDark
                                                        ? "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                                        : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200"
                                            )}
                                        >
                                            <span className="font-semibold text-lg">{LANGUAGES[lang].nativeName}</span>
                                            <span className="text-sm opacity-70">{LANGUAGES[lang].name}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Theme */}
                <div>
                    <label
                        className={cn(
                            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 px-1",
                            isDark ? "text-white/50" : "text-gray-400"
                        )}
                    >
                        <Sun className="w-3.5 h-3.5" />
                        {t("settings.theme")}
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: "light" as const, icon: Sun, label: t("settings.theme.light") },
                            { value: "dark" as const, icon: Moon, label: t("settings.theme.dark") },
                            { value: "system" as const, icon: Monitor, label: t("settings.theme.system") },
                        ].map(({ value, icon: ThemeIcon, label }) => (
                            <button
                                key={value}
                                onClick={() => setTheme(value)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all",
                                    theme === value
                                        ? "bg-[#7B1E3C] text-white"
                                        : isDark
                                            ? "bg-white/5 hover:bg-white/10 text-white/70"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                )}
                            >
                                <ThemeIcon className="w-4 h-4" />
                                <span className="text-xs">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accessibility */}
                <div>
                    <label
                        className={cn(
                            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 px-1",
                            isDark ? "text-white/50" : "text-gray-400"
                        )}
                    >
                        <Accessibility className="w-3.5 h-3.5" />
                        {t("settings.accessibility")}
                    </label>

                    <div className="space-y-2">
                        {/* Font Size */}
                        <div
                            className={cn(
                                "p-3 rounded-xl",
                                isDark ? "bg-white/5" : "bg-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Type className="w-4 h-4 text-[#7B1E3C]" />
                                <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                    {t("settings.fontSize")}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {(["normal", "large", "xlarge"] as const).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setFontSize(size)}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-lg text-sm transition-all",
                                            fontSize === size
                                                ? "bg-[#7B1E3C] text-white"
                                                : isDark
                                                    ? "bg-white/10 hover:bg-white/15 text-white/70"
                                                    : "bg-white hover:bg-gray-50 text-gray-600"
                                        )}
                                    >
                                        {size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toggle Options */}
                        <ToggleOption
                            icon={Zap}
                            label={t("settings.reducedMotion")}
                            description={t("settings.reducedMotion.desc")}
                            checked={reducedMotion}
                            onChange={setReducedMotion}
                            isDark={isDark}
                        />
                        <ToggleOption
                            icon={Eye}
                            label={t("settings.highContrast")}
                            description={t("settings.highContrast.desc")}
                            checked={highContrast}
                            onChange={setHighContrast}
                            isDark={isDark}
                        />
                        <ToggleOption
                            icon={Type}
                            label={t("settings.dyslexicFont")}
                            description={t("settings.dyslexicFont.desc")}
                            checked={dyslexicFont}
                            onChange={setDyslexicFont}
                            isDark={isDark}
                        />
                    </div>
                </div>

                {/* About Section */}
                <div>
                    <label
                        className={cn(
                            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 px-1",
                            isDark ? "text-white/50" : "text-gray-400"
                        )}
                    >
                        <Info className="w-3.5 h-3.5" />
                        About
                    </label>
                    <div className="space-y-2">
                        <AboutButton isDark={isDark} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Toggle Option Component
function ToggleOption({
    icon: Icon,
    label,
    description,
    checked,
    onChange,
    isDark,
}: {
    icon: React.ElementType;
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    isDark: boolean;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
            )}
        >
            <Icon className={cn("w-4 h-4", isDark ? "text-white/50" : "text-gray-400")} />
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{label}</p>
                <p className={cn("text-xs truncate", isDark ? "text-white/50" : "text-gray-500")}>{description}</p>
            </div>
            <div
                className={cn(
                    "w-10 h-5 rounded-full p-0.5 transition-all",
                    checked ? "bg-[#7B1E3C]" : isDark ? "bg-white/20" : "bg-gray-300"
                )}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                />
            </div>
        </button>
    );
}

// About Button with Version and Update
function AboutButton({ isDark }: { isDark: boolean }) {
    const { updateAvailable, currentVersion, newVersion, postponeCount } = useUpdate();
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowUpdateDialog(true)}
                className={cn(
                    "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                    isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                )}
            >
                <div className="relative">
                    <Sparkles className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-500")} />
                    {updateAvailable && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                        SONORA v{currentVersion}
                    </p>
                    <p className={cn("text-xs truncate", isDark ? "text-white/50" : "text-gray-500")}>
                        {updateAvailable
                            ? `Update v${newVersion} tersedia!`
                            : "Aplikasi terbaru"
                        }
                    </p>
                </div>
                {updateAvailable && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/20 text-green-500 text-xs font-medium">
                        <Download className="w-3 h-3" />
                        Update
                    </div>
                )}
            </button>

            <Link
                href="/changelog"
                className={cn(
                    "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                    isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                )}
            >
                <FileText className={cn("w-4 h-4", isDark ? "text-white/50" : "text-gray-400")} />
                <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                        Changelog
                    </p>
                    <p className={cn("text-xs truncate", isDark ? "text-white/50" : "text-gray-500")}>
                        Lihat riwayat perubahan
                    </p>
                </div>
                <ExternalLink className={cn("w-4 h-4", isDark ? "text-white/30" : "text-gray-300")} />
            </Link>

            <UpdateDialog
                isOpen={showUpdateDialog && updateAvailable}
                onClose={() => setShowUpdateDialog(false)}
            />
        </>
    );
}
