"use client";

import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
}

// Simple passthrough - let Next.js loading.tsx handle transition states
// This avoids hydration mismatch from AnimatePresence with dynamic keys
export function PageTransition({ children }: PageTransitionProps) {
    return <>{children}</>;
}

export default PageTransition;
