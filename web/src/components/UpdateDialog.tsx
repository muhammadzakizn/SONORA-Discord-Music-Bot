"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdate } from '@/contexts/UpdateContext';
import { CHANGELOG } from '@/constants/version';
import {
    Download,
    Check,
    X,
    Sparkles,
    Clock,
    ExternalLink,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface UpdateDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UpdateDialog({ isOpen, onClose }: UpdateDialogProps) {
    const {
        updateAvailable,
        currentVersion,
        newVersion,
        postponeCount,
        isUpdating,
        updateProgress,
        updateComplete,
        triggerUpdate,
        postponeUpdate,
        dismissSuccess,
        getChangelog,
    } = useUpdate();

    const [countdown, setCountdown] = useState(15);
    const changelog = getChangelog();
    const canPostpone = postponeCount < 3;

    // Countdown for auto-refresh
    useEffect(() => {
        if (!updateComplete) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [updateComplete]);

    if (!isOpen && !isUpdating && !updateComplete) return null;

    // Full-screen updating state
    if (isUpdating) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-8 max-w-md px-6"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 mx-auto"
                    >
                        <RefreshCw className="w-20 h-20 text-purple-500" />
                    </motion.div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Memperbarui SONORA...</h2>
                        <p className="text-zinc-400">Mohon tunggu, jangan tutup halaman ini</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${updateProgress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    <p className="text-zinc-500 text-sm">{Math.round(updateProgress)}%</p>

                    {/* Update details */}
                    {changelog && (
                        <div className="text-left bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                            <p className="text-sm text-zinc-400 mb-2">Perubahan di v{newVersion}:</p>
                            <ul className="space-y-1">
                                {changelog.highlights.slice(0, 3).map((item, i) => (
                                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    // Update complete success dialog
    if (updateComplete) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-6 text-center space-y-6"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10 }}
                        className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
                    >
                        <Check className="w-10 h-10 text-green-500" />
                    </motion.div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Update Berhasil! 🎉</h2>
                        <p className="text-zinc-400">
                            SONORA telah diperbarui ke versi {newVersion}
                        </p>
                    </div>

                    {/* Changes summary */}
                    {changelog && (
                        <div className="text-left bg-zinc-800/50 rounded-xl p-4">
                            <p className="text-sm font-medium text-white mb-2">Yang baru:</p>
                            <ul className="space-y-1">
                                {changelog.highlights.map((item, i) => (
                                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <Link
                            href="/changelog"
                            className="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Lihat Changelog Lengkap
                        </Link>

                        <button
                            onClick={dismissSuccess}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all"
                        >
                            OK ({countdown}s)
                        </button>
                    </div>

                    <p className="text-xs text-zinc-500">
                        Halaman akan refresh otomatis dalam {countdown} detik
                    </p>
                </motion.div>
            </div>
        );
    }

    // Update available dialog
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={canPostpone ? onClose : undefined}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-6 space-y-6"
                    >
                        {/* Close button - only if can postpone */}
                        {canPostpone && (
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        {/* Icon */}
                        <div className="flex items-center justify-center">
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center"
                            >
                                <Download className="w-8 h-8 text-purple-400" />
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white mb-2">Update Tersedia</h2>
                            <p className="text-zinc-400">
                                Versi baru <span className="text-purple-400 font-semibold">v{newVersion}</span> tersedia!
                            </p>
                            <p className="text-sm text-zinc-500 mt-1">
                                Versi saat ini: v{currentVersion}
                            </p>
                        </div>

                        {/* Highlights */}
                        {changelog && (
                            <div className="bg-zinc-800/50 rounded-xl p-4">
                                <p className="text-sm font-medium text-white mb-3">Pembaruan:</p>
                                <ul className="space-y-2">
                                    {changelog.highlights.map((item, i) => (
                                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warning if at limit */}
                        {!canPostpone && (
                            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-lg p-3">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Update wajib karena sudah ditunda 3 kali
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <Link
                                href="/changelog"
                                className="flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Lihat Changelog Lengkap
                            </Link>

                            <div className="flex gap-3">
                                {canPostpone && (
                                    <button
                                        onClick={() => {
                                            postponeUpdate();
                                            onClose();
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Nanti
                                    </button>
                                )}
                                <button
                                    onClick={triggerUpdate}
                                    className={`${canPostpone ? 'flex-1' : 'w-full'} py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2`}
                                >
                                    <Download className="w-4 h-4" />
                                    Update Sekarang
                                </button>
                            </div>

                            {canPostpone && (
                                <p className="text-xs text-zinc-500 text-center">
                                    Sisa tunda: {3 - postponeCount}x
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
