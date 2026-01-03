"use client";

import { motion } from "framer-motion";
import { History, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

export default function HistoryPage() {
  const { isDark, t } = useSettings();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Icon */}
        <div className="relative inline-block mb-6">
          <History className={cn(
            "w-24 h-24",
            isDark ? "text-zinc-700" : "text-gray-300"
          )} />
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="absolute -bottom-2 -right-2 p-2 rounded-full bg-gradient-to-br from-[#7B1E3C] to-[#C4314B]"
          >
            <Wrench className="w-6 h-6 text-white" />
          </motion.div>
        </div>

        {/* Title */}
        <h1 className={cn(
          "text-3xl font-bold mb-3",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {t('history.title')}
        </h1>

        {/* Coming Soon Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#7B1E3C] to-[#C4314B] text-white font-medium mb-4"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          Coming Soon
        </motion.div>

        {/* Description */}
        <p className={cn(
          "text-lg max-w-md mx-auto",
          isDark ? "text-zinc-400" : "text-gray-500"
        )}>
          This feature is currently under development.
        </p>
        <p className={cn(
          "text-sm mt-2",
          isDark ? "text-zinc-500" : "text-gray-400"
        )}>
          Track your listening history across all servers - coming in a future update.
        </p>
      </motion.div>
    </div>
  );
}
