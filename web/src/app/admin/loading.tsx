"use client";

import { motion } from "framer-motion";

export default function AdminLoading() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-zinc-500 text-sm">Loading...</p>
            </motion.div>
        </div>
    );
}
