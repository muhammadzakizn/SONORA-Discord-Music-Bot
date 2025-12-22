"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  LayoutDashboard,
  Server,
  History,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Bell,
  UserCircle,
  Shield,
  Home,
  PanelLeft,
  PanelLeftClose,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionProvider, useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { TutorialOverlay, useTutorial } from "@/components/TutorialOverlay";
import { useSettings } from "@/contexts/SettingsContext";
import { Footer } from "@/components/Footer";
import { TimeAmbientBackground } from "@/components/admin/TimeAmbientBackground";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { labelKey: "admin.dashboard", href: "/admin", icon: LayoutDashboard },
  { labelKey: "admin.servers", href: "/admin/guilds", icon: Server },
  { labelKey: "admin.history", href: "/admin/history", icon: History },
  { labelKey: "Support", href: "/admin/support", icon: Headphones },
  { labelKey: "admin.settings", href: "/admin/settings", icon: Settings },
];


// Sidebar width constant
const SIDEBAR_WIDTH = 260; // 16.25rem = 260px

function Sidebar({
  isOpen,
  onClose,
  isDark,
  isMobile,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  isMobile: boolean;
}) {
  const pathname = usePathname();
  const { user, managedGuilds, customAvatar } = useSession();
  const { t } = useSettings();

  const handleNavClick = () => {
    // Close sidebar on mobile when nav item clicked
    if (isMobile) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : isMobile ? -SIDEBAR_WIDTH - 20 : 0,
          width: isMobile ? SIDEBAR_WIDTH : (isOpen ? SIDEBAR_WIDTH : 0),
          marginLeft: !isMobile && isOpen ? 12 : 0,
          marginTop: !isMobile && isOpen ? 12 : 0,
          marginBottom: !isMobile && isOpen ? 12 : 0,
          opacity: isOpen ? 1 : (isMobile ? 1 : 0),
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "flex flex-col overflow-hidden shrink-0",
          // Mobile: fixed floating
          isMobile && "fixed left-3 top-3 bottom-3 z-50",
          // Liquid Glass Frosted Effect
          "backdrop-blur-2xl rounded-2xl",
          isDark
            ? "bg-zinc-900/90 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-white/90 border border-black/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
        )}
        style={{
          height: isMobile ? 'calc(100vh - 24px)' : (isOpen ? 'calc(100% - 24px)' : '100%'),
          width: isMobile ? SIDEBAR_WIDTH : undefined
        }}
      >
        <div style={{ width: SIDEBAR_WIDTH }} className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-b shrink-0",
            isDark ? "border-white/[0.08]" : "border-black/[0.06]"
          )}>
            <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
              <Image
                src="/sonora-logo.png"
                alt="SONORA"
                width={100}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            {/* Close button for mobile */}
            {isMobile && (
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDark ? "hover:bg-white/[0.1]" : "hover:bg-black/[0.05]"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className={cn(
              "p-3 border-b shrink-0",
              isDark ? "border-white/[0.08]" : "border-black/[0.06]"
            )}>
              <div className={cn(
                "flex items-center gap-3 p-2 rounded-xl",
                isDark ? "bg-white/[0.05]" : "bg-black/[0.03]"
              )}>
                <Image
                  src={customAvatar || getAvatarUrl(user)}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized={!!customAvatar}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isDark ? "text-white" : "text-gray-900"
                  )}>{user.username}</p>
                  <p className={cn(
                    "text-xs flex items-center gap-1",
                    isDark ? "text-white/50" : "text-gray-500"
                  )}>
                    <Shield className="w-3 h-3" />
                    {managedGuilds?.length || 0} servers
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-3 py-2",
              isDark ? "text-white/30" : "text-gray-400"
            )}>
              {t('admin.menu')}
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm",
                    isActive
                      ? "bg-[#7B1E3C] text-white"
                      : isDark
                        ? "text-white/60 hover:text-white hover:bg-white/[0.08]"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-white")} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-2 border-t shrink-0",
            isDark ? "border-white/[0.08]" : "border-black/[0.06]"
          )}>
            <Link
              href="/"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm",
                isDark
                  ? "text-white/50 hover:text-white hover:bg-white/[0.08]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]"
              )}
            >
              <Home className="w-5 h-5" />
              <span>{t('admin.backToHome')}</span>
            </Link>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Header({ onMenuClick, sidebarOpen, isDark, isScrolled }: { onMenuClick: () => void; sidebarOpen: boolean; isDark: boolean; isScrolled: boolean }) {
  const [showProfile, setShowProfile] = useState(false);
  const { user, displayName, logout, customAvatar } = useSession();
  const { t } = useSettings();

  return (
    <header className={cn(
      "h-14 px-4 lg:px-6 flex items-center justify-between relative transition-all duration-300",
      isDark ? "text-white" : "text-gray-900"
    )}>
      {/* Dark gradient overlay - dark at top, transparent at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isScrolled ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
          zIndex: -1
        }}
      />
      {/* Extended gradient fade below header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isScrolled ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-x-0 top-full h-16 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 100%)'
        }}
      />
      {/* Left - Menu button and Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className={cn(
            "p-2 rounded-xl transition-colors",
            sidebarOpen
              ? "bg-[#7B1E3C]/20 text-[#7B1E3C]"
              : isDark
                ? "hover:bg-white/[0.1] text-white/70"
                : "hover:bg-black/[0.05] text-gray-600"
          )}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeft className="w-5 h-5" />
          )}
        </button>

        {/* Title - animates position */}
        <motion.h1
          animate={{
            opacity: isScrolled ? 0 : 1,
            scale: isScrolled ? 0.9 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "text-base font-semibold whitespace-nowrap",
            isDark ? "text-white/90" : "text-gray-900"
          )}
        >
          {t('admin.title')}
        </motion.h1>
      </div>

      {/* Center - Title when scrolled (just bold text, no pill) */}
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{
          opacity: isScrolled ? 1 : 0,
          y: isScrolled ? 0 : -10,
        }}
        transition={{ duration: 0.25 }}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 text-base font-bold",
          isDark ? "text-white" : "text-gray-900",
          !isScrolled && "pointer-events-none"
        )}
      >
        {t('admin.title')}
      </motion.span>

      {/* Right - Notifications & Profile (stays in place) */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className={cn(
          "relative p-2 rounded-xl transition-colors",
          isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]"
        )}>
          <Bell className={cn("w-5 h-5", isDark ? "text-white/60" : "text-gray-500")} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded-xl transition-colors",
              isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]"
            )}
          >
            {user ? (
              <Image
                src={customAvatar || getAvatarUrl(user)}
                alt={user.username}
                width={32}
                height={32}
                className="rounded-full"
                unoptimized={!!customAvatar}
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-white/90" : "text-gray-900"
              )}>{displayName || user?.username || 'Admin'}</p>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isDark ? "text-white/40" : "text-gray-400",
              showProfile && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl",
                  "backdrop-blur-2xl border",
                  isDark
                    ? "bg-zinc-900/95 border-white/[0.15]"
                    : "bg-white/95 border-black/[0.1]",
                  "shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                )}
              >
                {user && (
                  <div className={cn(
                    "p-3 border-b",
                    isDark ? "border-white/[0.1]" : "border-black/[0.06]"
                  )}>
                    <p className={cn(
                      "font-medium",
                      isDark ? "text-white/90" : "text-gray-900"
                    )}>{displayName || user.username}</p>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-white/40" : "text-gray-500"
                    )}>@{user.username}</p>
                  </div>
                )}

                <Link
                  href="/admin/profile"
                  onClick={() => setShowProfile(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm",
                    isDark
                      ? "text-white/70 hover:text-white hover:bg-white/[0.08]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]"
                  )}
                >
                  <UserCircle className="w-4 h-4" />
                  <span>{t('admin.profile')}</span>
                </Link>
                <div className={cn(
                  "border-t",
                  isDark ? "border-white/[0.1]" : "border-black/[0.06]"
                )} />
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-rose-500 hover:bg-rose-500/10 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('admin.logout')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}


function AdminLayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { isLoggedIn, isLoading } = useSession();
  const router = useRouter();
  const { t, isDark } = useSettings();

  const { showTutorial, completeTutorial, skipTutorial } = useTutorial();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll detection for header animation
  useEffect(() => {
    // Use a small delay to ensure ref is attached
    const timer = setTimeout(() => {
      const mainElement = mainRef.current;
      if (!mainElement) return;

      const handleScroll = () => {
        setIsScrolled(mainElement.scrollTop > 50);
      };

      mainElement.addEventListener('scroll', handleScroll, { passive: true });

      // Initial check
      handleScroll();

      return () => mainElement.removeEventListener('scroll', handleScroll);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Check for MFA verified cookie
  const [isMfaVerified, setIsMfaVerified] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if MFA verification is complete
    const cookies = document.cookie;
    const hasMfaCookie = cookies.includes('sonora-mfa-verified=true');
    setIsMfaVerified(hasMfaCookie);
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
      return;
    }
    // Security: If logged in but MFA not verified, redirect to login
    if (!isLoading && isLoggedIn && isMfaVerified === false) {
      console.warn('[Security] User logged in but MFA not verified - redirecting to login');
      router.push('/login?mfa_pending=true');
      return;
    }
  }, [isLoading, isLoggedIn, isMfaVerified, router]);

  // Show loading while checking session or MFA status
  if (isLoading || isMfaVerified === null) {
    return (
      <div className={cn(
        "h-screen flex items-center justify-center",
        isDark ? "bg-black" : "bg-gray-50"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
          <p className={isDark ? "text-white/50" : "text-gray-500"}>{t('admin.loading')}</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in or MFA not verified
  if (!isLoggedIn || isMfaVerified === false) {
    return null;
  }

  return (
    <>
      <TutorialOverlay
        isOpen={showTutorial}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />
      <div className={cn(
        "h-screen flex overflow-hidden transition-colors duration-300",
        isDark ? "bg-black text-white" : "bg-gray-50 text-gray-900"
      )}>
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isDark={isDark}
          isMobile={isMobile}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
          {/* Immersive Time Ambient Background */}
          <TimeAmbientBackground className="z-0" />

          {/* Scrollable container with header inside */}
          <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
            {/* Sticky Header - stays at top while content scrolls behind */}
            <div className="sticky top-0 z-40">
              <Header
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
                isDark={isDark}
                isScrolled={isScrolled}
              />
            </div>

            {/* Content with padding */}
            <div className="p-4 md:p-6 relative z-10">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
              {/* Footer with negative margin to extend to edges */}
              <div className="-mx-4 md:-mx-6 -mb-4 md:-mb-6">
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SessionProvider>
  );
}
