"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Calendar, Tag, ChevronRight } from 'lucide-react';
import { CHANGELOG, WEB_VERSION, BOT_VERSION } from '@/constants/version';
import { cn } from '@/lib/utils';

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/80 border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/explore"
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Kembali</span>
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <Tag className="w-4 h-4" />
                            Web v{WEB_VERSION} • Bot v{BOT_VERSION}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Changelog
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Riwayat perubahan dan pembaruan SONORA Dashboard
                    </p>
                </motion.div>

                {/* Changelog List */}
                <div className="space-y-8">
                    {CHANGELOG.map((entry, index) => {
                        const isLatest = index === 0;

                        return (
                            <motion.div
                                key={entry.version}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "relative rounded-2xl border p-6 transition-all",
                                    isLatest
                                        ? "bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
                                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                                )}
                            >
                                {/* Latest Badge */}
                                {isLatest && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        TERBARU
                                    </div>
                                )}

                                {/* Version Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            isLatest
                                                ? "bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
                                                : "text-white"
                                        )}>
                                            v{entry.version}
                                        </span>
                                        <span className="text-zinc-500">—</span>
                                        <span className="text-zinc-300 font-medium">{entry.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <Calendar className="w-4 h-4" />
                                        {entry.date}
                                    </div>
                                </div>

                                {/* Highlights */}
                                <div className="mb-6 p-4 rounded-xl bg-black/30 border border-white/5">
                                    <p className="text-sm font-medium text-zinc-400 mb-3">Highlights</p>
                                    <ul className="grid sm:grid-cols-2 gap-2">
                                        {entry.highlights.map((highlight, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <ChevronRight className={cn(
                                                    "w-4 h-4 shrink-0 mt-0.5",
                                                    isLatest ? "text-purple-400" : "text-zinc-500"
                                                )} />
                                                <span className="text-zinc-300">{highlight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Detailed Changes */}
                                <div className="space-y-4">
                                    {entry.changes.map((change, i) => (
                                        <div key={i}>
                                            <p className={cn(
                                                "text-sm font-semibold mb-2",
                                                isLatest ? "text-purple-300" : "text-zinc-400"
                                            )}>
                                                {change.category}
                                            </p>
                                            <ul className="space-y-1 pl-4">
                                                {change.items.map((item, j) => (
                                                    <li key={j} className="text-sm text-zinc-400 list-disc list-outside">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-zinc-500 text-sm">
                    <p>SONORA © 2025 • Dibuat dengan ❤️</p>
                </div>
            </div>
        </div>
    );
}
