"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Settings, X, Globe, Sun, Moon, Monitor, Type, Accessibility,
    HelpCircle, MessageCircle, ExternalLink, Music, Eye, Zap
} from "lucide-react";
import { useSettings, LANGUAGES, Language } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

// SONORA Brand Colors
const BRAND = {
    primary: "#7B1E3C",      // Maroon/Burgundy
    primaryLight: "#9B2E4C",
    primaryDark: "#5B0E2C",
    accent: "#C4314B",       // Brighter accent
};

export function FloatingSettingsButton() {
    const { toggleSettings, isSettingsOpen, isDark } = useSettings();

    return (
        <>
            {/* Liquid Glass Floating Button - SONORA Brand */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleSettings}
                className={cn(
                    "fixed bottom-6 right-6 z-50 p-4 rounded-2xl transition-all",
                    "backdrop-blur-2xl border",
                    // SONORA brand styling with liquid glass
                    "bg-[#7B1E3C]/80 border-white/20",
                    "text-white shadow-[0_8px_32px_rgba(123,30,60,0.4)]",
                    "hover:bg-[#9B2E4C]/90 hover:shadow-[0_12px_40px_rgba(123,30,60,0.5)]"
                )}
                aria-label="Open settings"
                aria-expanded={isSettingsOpen}
            >
                <Settings className="w-6 h-6" />
            </motion.button>

            <SettingsPanel />
        </>
    );
}

function SettingsPanel() {
    const {
        isSettingsOpen,
        closeSettings,
        language,
        setLanguage,
        theme,
        setTheme,
        isDark,
        reducedMotion,
        setReducedMotion,
        highContrast,
        setHighContrast,
        fontSize,
        setFontSize,
        dyslexicFont,
        setDyslexicFont,
        t,
    } = useSettings();

    const brandColor = BRAND.primary;

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    {/* Backdrop - can be clicked to close */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSettings}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Panel - Apple Liquid Glass Style */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={cn(
                            "fixed top-3 right-3 bottom-3 z-50 w-full max-w-sm overflow-hidden",
                            // Apple Liquid Glass
                            "backdrop-blur-2xl rounded-2xl",
                            isDark
                                ? "bg-zinc-900/90 border border-white/[0.12]"
                                : "bg-white/90 border border-black/[0.08]",
                            "shadow-[0_8px_48px_rgba(0,0,0,0.4)]"
                        )}
                    >
                        {/* Header */}
                        <div className={cn(
                            "sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b",
                            isDark ? "border-white/[0.08]" : "border-black/[0.06]"
                        )}>
                            <h2 className={cn(
                                "text-lg font-semibold flex items-center gap-2",
                                isDark ? "text-white" : "text-gray-900"
                            )}>
                                <Settings className="w-5 h-5" style={{ color: brandColor }} />
                                {t('settings.title')}
                            </h2>
                            <button
                                onClick={closeSettings}
                                className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    isDark
                                        ? "hover:bg-white/[0.1] text-zinc-400 hover:text-white"
                                        : "hover:bg-black/[0.05] text-gray-500 hover:text-gray-900"
                                )}
                                aria-label={t('common.close')}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto h-[calc(100%-64px)] p-5 space-y-6">
                            {/* Language */}
                            <section>
                                <h3 className={cn(
                                    "text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2",
                                    isDark ? "text-zinc-500" : "text-gray-400"
                                )}>
                                    <Globe className="w-3.5 h-3.5" />
                                    {t('settings.language')}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang)}
                                            className={cn(
                                                "p-3 rounded-xl text-left transition-all",
                                                language === lang
                                                    ? "text-white border"
                                                    : isDark
                                                        ? "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] border border-white/[0.08]"
                                                        : "bg-black/[0.03] text-gray-700 hover:bg-black/[0.08] border border-black/[0.06]"
                                            )}
                                            style={language === lang ? {
                                                backgroundColor: brandColor,
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            } : {}}
                                        >
                                            <span className="block font-medium text-sm">{LANGUAGES[lang].nativeName}</span>
                                            <span className="text-xs opacity-60">{LANGUAGES[lang].name}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Theme */}
                            <section>
                                <h3 className={cn(
                                    "text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2",
                                    isDark ? "text-zinc-500" : "text-gray-400"
                                )}>
                                    <Sun className="w-3.5 h-3.5" />
                                    {t('settings.theme')}
                                </h3>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'light', icon: Sun, labelKey: 'settings.theme.light' },
                                        { value: 'dark', icon: Moon, labelKey: 'settings.theme.dark' },
                                        { value: 'system', icon: Monitor, labelKey: 'settings.theme.system' },
                                    ].map(({ value, icon: Icon, labelKey }) => (
                                        <button
                                            key={value}
                                            onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                                            className={cn(
                                                "flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-all",
                                                theme === value
                                                    ? "text-white border"
                                                    : isDark
                                                        ? "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] border border-white/[0.08]"
                                                        : "bg-black/[0.03] text-gray-700 hover:bg-black/[0.08] border border-black/[0.06]"
                                            )}
                                            style={theme === value ? {
                                                backgroundColor: brandColor,
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            } : {}}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-xs">{t(labelKey)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Accessibility */}
                            <section>
                                <h3 className={cn(
                                    "text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2",
                                    isDark ? "text-zinc-500" : "text-gray-400"
                                )}>
                                    <Accessibility className="w-3.5 h-3.5" />
                                    {t('settings.accessibility')}
                                </h3>
                                <div className="space-y-3">
                                    {/* Font Size */}
                                    <div>
                                        <label className={cn(
                                            "flex items-center gap-2 text-sm mb-2",
                                            isDark ? "text-zinc-300" : "text-gray-700"
                                        )}>
                                            <Type className="w-4 h-4" />
                                            {t('settings.fontSize')}
                                        </label>
                                        <div className="flex gap-2">
                                            {['normal', 'large', 'xlarge'].map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setFontSize(size as 'normal' | 'large' | 'xlarge')}
                                                    className={cn(
                                                        "flex-1 py-2 px-3 rounded-lg text-sm transition-all",
                                                        fontSize === size
                                                            ? "text-white"
                                                            : isDark
                                                                ? "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                                                                : "bg-black/[0.03] text-gray-600 hover:bg-black/[0.08]"
                                                    )}
                                                    style={fontSize === size ? { backgroundColor: brandColor } : {}}
                                                >
                                                    {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Toggle Options */}
                                    <div className="space-y-2">
                                        {/* Reduced Motion */}
                                        <ToggleOption
                                            icon={Zap}
                                            label={t('settings.reducedMotion')}
                                            description={t('settings.reducedMotion.desc')}
                                            checked={reducedMotion}
                                            onChange={setReducedMotion}
                                            isDark={isDark}
                                            brandColor={brandColor}
                                        />

                                        {/* High Contrast */}
                                        <ToggleOption
                                            icon={Eye}
                                            label={t('settings.highContrast')}
                                            description={t('settings.highContrast.desc')}
                                            checked={highContrast}
                                            onChange={setHighContrast}
                                            isDark={isDark}
                                            brandColor={brandColor}
                                        />

                                        {/* Dyslexic Font */}
                                        <ToggleOption
                                            icon={Type}
                                            label={t('settings.dyslexicFont')}
                                            description={t('settings.dyslexicFont.desc')}
                                            checked={dyslexicFont}
                                            onChange={setDyslexicFont}
                                            isDark={isDark}
                                            brandColor={brandColor}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Support Links */}
                            <section>
                                <h3 className={cn(
                                    "text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2",
                                    isDark ? "text-zinc-500" : "text-gray-400"
                                )}>
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    {t('settings.support')}
                                </h3>
                                <div className="space-y-2">
                                    <SupportLink
                                        icon={MessageCircle}
                                        label="WhatsApp"
                                        description="085156110231"
                                        href="https://wa.me/6285156110231"
                                        isDark={isDark}
                                    />
                                    <SupportLink
                                        icon={MessageCircle}
                                        label={t('settings.support.discord')}
                                        description="@thixxert"
                                        href="https://discord.com/users/thixxert"
                                        isDark={isDark}
                                    />
                                    <SupportLink
                                        icon={Music}
                                        label={t('settings.support.addBot')}
                                        description={t('settings.support.addBot.desc')}
                                        href="https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&scope=bot+applications.commands"
                                        isDark={isDark}
                                    />
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
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
    brandColor,
}: {
    icon: React.ElementType;
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    isDark: boolean;
    brandColor: string;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                isDark
                    ? "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                    : "bg-black/[0.02] hover:bg-black/[0.05] border border-black/[0.06]"
            )}
        >
            <Icon className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-gray-500")} />
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{label}</p>
                <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>{description}</p>
            </div>
            <div
                className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-all",
                    checked ? "" : isDark ? "bg-white/[0.15]" : "bg-black/[0.15]"
                )}
                style={checked ? { backgroundColor: brandColor } : {}}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-white shadow-md"
                />
            </div>
        </button>
    );
}

// Support Link Component
function SupportLink({
    icon: Icon,
    label,
    description,
    href,
    isDark,
}: {
    icon: React.ElementType;
    label: string;
    description?: string;
    href: string;
    isDark: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                isDark
                    ? "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                    : "bg-black/[0.02] hover:bg-black/[0.05] border border-black/[0.06]"
            )}
        >
            <Icon className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-gray-500")} />
            <div className="flex-1">
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{label}</p>
                {description && (
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>{description}</p>
                )}
            </div>
            <ExternalLink className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-gray-400")} />
        </a>
    );
}

export default FloatingSettingsButton;
