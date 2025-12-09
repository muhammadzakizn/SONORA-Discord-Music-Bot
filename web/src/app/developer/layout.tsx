"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Bug,
  Activity,
  Database,
  Settings,
  FlaskConical,
  Code,
  Music,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Console", href: "/developer", icon: Terminal },
  { label: "Debug", href: "/developer/debug", icon: Bug },
  { label: "Performance", href: "/developer/performance", icon: Activity },
  { label: "Database", href: "/developer/database", icon: Database },
  { label: "API Tester", href: "/developer/api", icon: Code },
  { label: "Feature Flags", href: "/developer/flags", icon: FlaskConical, badge: "Beta" },
];

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const sidebarVariants = {
    mobile: {
      x: isOpen ? 0 : "-100%",
    },
    desktop: {
      x: 0,
    },
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col",
          "lg:static lg:z-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        initial={false}
        animate={isDesktop ? "desktop" : "mobile"}
        variants={sidebarVariants}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-green-400">SONORA</span>
              <p className="text-xs text-zinc-500">Developer Console</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Beta Warning */}
        <div className="m-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Beta Version</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Connected to beta bot instance
          </p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider px-3 mb-4">
            Developer Tools
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all relative",
                  isActive
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                )}
                onClick={onClose}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-green-400")} />
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

        {/* Logout */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <Link
            href="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Link>
        </div>
      </motion.aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-zinc-400">Beta Bot Connected</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 font-mono">
          Port: 5001
        </span>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          <Music className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </Link>
      </div>
    </header>
  );
}

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-zinc-950 text-white flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen w-full max-w-full overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
