"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Terminal,
  Server,
  Activity,
  Gauge,
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
  Power,
  AlertTriangle,
  Wrench,
  MessageSquare,
  Users,
  Database,
  Code,
  Ban,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionProvider, useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Footer } from "@/components/Footer";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/developer", icon: Gauge },
  { label: "Console", href: "/developer/console", icon: Terminal },
  { label: "Notifications", href: "/developer/notifications", icon: Bell },
  { label: "Servers", href: "/developer/servers", icon: Server },
  { label: "Monitoring", href: "/developer/monitoring", icon: Activity },
  { label: "Controls", href: "/developer/controls", icon: Power },
  { label: "Maintenance", href: "/developer/maintenance", icon: Wrench },
  { label: "Changelog", href: "/developer/changelog", icon: FileText },
  { label: "Messaging", href: "/developer/messaging", icon: MessageSquare },
  { label: "Users & Servers", href: "/developer/users-servers", icon: Users },
  { label: "Bans", href: "/developer/bans", icon: Ban },
  { label: "Access", href: "/developer/access", icon: Shield },
];



// Sidebar width constant
const SIDEBAR_WIDTH = 260;

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
  const { user } = useSession();

  const handleNavClick = () => {
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
          isMobile && "fixed left-3 top-3 bottom-3 z-50",
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

          {/* Developer Badge */}
          <div className="m-3 p-3 rounded-xl bg-gradient-to-r from-[#7B1E3C]/20 to-purple-500/20 border border-[#7B1E3C]/30">
            <div className="flex items-center gap-2 text-[#C4314B]">
              <Code className="w-4 h-4" />
              <span className="text-sm font-semibold">Developer Mode</span>
            </div>
            <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
              Full system access enabled
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className={cn(
              "px-3 pb-3 border-b shrink-0",
              isDark ? "border-white/[0.08]" : "border-black/[0.06]"
            )}>
              <div className={cn(
                "flex items-center gap-3 p-2 rounded-xl",
                isDark ? "bg-white/[0.05]" : "bg-black/[0.03]"
              )}>
                <Image
                  src={getAvatarUrl(user)}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="rounded-full"
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
                    <Shield className="w-3 h-3 text-[#7B1E3C]" />
                    Developer
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
              Developer Tools
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/developer" && pathname?.startsWith(item.href));
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
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {item.badge}
                    </span>
                  )}
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
              href="/admin"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm",
                isDark
                  ? "text-white/50 hover:text-white hover:bg-white/[0.08]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]"
              )}
            >
              <Home className="w-5 h-5" />
              <span>Back to Admin</span>
            </Link>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Header({ onMenuClick, sidebarOpen, isDark }: { onMenuClick: () => void; sidebarOpen: boolean; isDark: boolean }) {
  const [showProfile, setShowProfile] = useState(false);
  const { user, displayName, logout, devSession, devLogout } = useSession();

  // Get display name - prefer devSession displayName, then devSession username, then Discord
  const currentDisplayName = devSession?.displayName || devSession?.username || displayName || user?.username || 'Developer';

  // Get avatar - prefer devSession avatar, then Discord avatar
  const avatarContent = devSession?.avatar ? (
    <img
      src={devSession.avatar}
      alt="Profile"
      className="w-8 h-8 rounded-full object-cover"
    />
  ) : user ? (
    <Image
      src={getAvatarUrl(user)}
      alt={user.username}
      width={32}
      height={32}
      className="rounded-full"
    />
  ) : (
    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
      {currentDisplayName.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <header className={cn(
      "h-14 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30",
      isDark ? "text-white" : "text-gray-900"
    )}>
      {/* Left */}
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
        <h1 className={cn(
          "text-base font-semibold",
          isDark ? "text-white/90" : "text-gray-900"
        )}>Developer Console</h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Bot Connected
        </span>
      </div>

      {/* Right */}
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
            {avatarContent}
            <div className="hidden sm:block text-left">
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-white/90" : "text-gray-900"
              )}>{currentDisplayName}</p>
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
                  href="/admin/settings/profile"
                  onClick={() => setShowProfile(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm",
                    isDark
                      ? "text-white/70 hover:text-white hover:bg-white/[0.08]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]"
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/"
                  onClick={() => setShowProfile(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm",
                    isDark
                      ? "text-white/70 hover:text-white hover:bg-white/[0.08]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-black/[0.05]"
                  )}
                >
                  <Home className="w-4 h-4" />
                  <span>Back to Home</span>
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
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function DeveloperLayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { isLoggedIn, isLoading, isMfaVerified, isDeveloper } = useSession();
  const router = useRouter();
  const { isDark } = useSettings();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
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

  // Check for localStorage developer auth (for direct developer login)
  useEffect(() => {
    const devAuth = localStorage.getItem('sonora-dev-auth');
    if (devAuth) {
      try {
        const parsed = JSON.parse(atob(devAuth));
        if (parsed.role === 'developer') {
          // Developer logged in via developer portal - allow access
          return;
        }
      } catch {
        // Invalid auth, continue to check session
      }
    }

    // If no dev auth, check Discord session
    if (!isLoading && !isLoggedIn) {
      // Check localStorage again before redirecting
      const devAuthCheck = localStorage.getItem('sonora-dev-auth');
      if (!devAuthCheck) {
        router.push('/login');
      }
      return;
    }
    // Check if MFA verified (only for Discord users, not for dev login)
    if (!isLoading && isLoggedIn && !isMfaVerified) {
      router.push('/mfa?redirect=/developer');
      return;
    }
    // Check if developer (only for Discord users)
    if (!isLoading && isLoggedIn && !isDeveloper) {
      // Check if they have dev localStorage auth
      const devAuth = localStorage.getItem('sonora-dev-auth');
      if (!devAuth) {
        router.push('/admin'); // Redirect non-developers to admin
      }
    }
  }, [isLoading, isLoggedIn, isMfaVerified, isDeveloper, router]);


  if (isLoading) {
    return (
      <div className={cn(
        "h-screen flex items-center justify-center",
        isDark ? "bg-black" : "bg-gray-50"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
          <p className={isDark ? "text-white/50" : "text-gray-500"}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has access (either Discord login or developer localStorage auth)
  const hasDevAuth = typeof window !== 'undefined' && localStorage.getItem('sonora-dev-auth');

  if (!isLoggedIn && !hasDevAuth) {
    return null;
  }

  return (
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
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isDark={isDark}
        />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
          {/* Footer with negative margin to extend to edges */}
          <div className="-mx-4 md:-mx-6 -mb-4 md:-mb-6">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DeveloperLayoutContent>{children}</DeveloperLayoutContent>
    </SessionProvider>
  );
}
