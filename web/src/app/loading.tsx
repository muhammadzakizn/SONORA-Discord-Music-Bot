"use client";

import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            {/* Simple loading spinner */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="w-12 h-12 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Loading...</p>
            </motion.div>
        </div>
    );
}
