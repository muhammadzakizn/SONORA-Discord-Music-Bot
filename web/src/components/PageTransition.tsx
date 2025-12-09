"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();

    // Skip animation for admin dashboard routes
    const isAdminRoute = pathname?.startsWith("/admin");
    const isDeveloperRoute = pathname?.startsWith("/developer");

    // No animation for dashboard routes - just render children
    if (isAdminRoute || isDeveloperRoute) {
        return <>{children}</>;
    }

    // Only animate for public pages (landing, login, etc.)
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                }}
            >
                {/* Dark overlay that slides in */}
                <motion.div
                    className="fixed inset-0 bg-black z-[9999] pointer-events-none"
                    initial={{ scaleY: 1, originY: 0 }}
                    animate={{ scaleY: 0, originY: 0 }}
                    exit={{ scaleY: 1, originY: 1 }}
                    transition={{
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                />
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

export default PageTransition;
