"use client";

import { ReactNode } from "react";
import { SessionProvider } from "@/contexts/SessionContext";

export default function VerifyLayout({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
}
