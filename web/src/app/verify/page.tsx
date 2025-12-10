"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Shield,
    Mail,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";

export default function VerifyPage() {
    const router = useRouter();
    const { user, isLoggedIn, isLoading } = useSession();
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            router.push("/login");
        }
    }, [isLoading, isLoggedIn, router]);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Send verification code
    const sendCode = async () => {
        if (!user) return;

        setStatus("sending");
        setErrorMessage("");

        try {
            const response = await fetch("/api/verify/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus("sent");
                setCountdown(60); // 60 seconds before can resend
            } else {
                setStatus("error");
                setErrorMessage(data.error || "Failed to send verification code");
            }
        } catch {
            setStatus("error");
            setErrorMessage("Network error. Please try again.");
        }
    };

    // Verify code
    const verifyCode = async () => {
        if (!user) return;

        const fullCode = code.join("");
        if (fullCode.length !== 6) return;

        setStatus("verifying");
        setErrorMessage("");

        try {
            const response = await fetch("/api/verify/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, code: fullCode }),
            });

            const data = await response.json();

            if (response.ok && data.verified) {
                setStatus("success");
                // Redirect to admin after short delay
                setTimeout(() => {
                    router.push("/admin");
                }, 1500);
            } else {
                setStatus("error");
                setErrorMessage(data.error || "Invalid verification code");
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
            }
        } catch {
            setStatus("error");
            setErrorMessage("Network error. Please try again.");
        }
    };

    // Handle input change
    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only last digit
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits entered
        if (newCode.every(d => d) && newCode.join("").length === 6) {
            setTimeout(() => verifyCode(), 100);
        }
    };

    // Handle keydown for backspace
    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pasted.length; i++) {
            newCode[i] = pasted[i];
        }
        setCode(newCode);
        if (pasted.length === 6) {
            setTimeout(() => verifyCode(), 100);
        }
    };



    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-800 overflow-hidden">
                    {/* Header */}
                    <div className="p-8 text-center border-b border-zinc-800">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Verify Your Identity</h1>
                        <p className="text-zinc-400 text-sm">
                            For your security, we'll send a verification code to your Discord DM
                        </p>
                    </div>

                    {/* User Info */}
                    <div className="px-8 py-4 border-b border-zinc-800 bg-zinc-800/30">
                        <div className="flex items-center gap-4">
                            <Image
                                src={getAvatarUrl(user)}
                                alt={user.username}
                                width={48}
                                height={48}
                                className="rounded-full"
                            />
                            <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-zinc-500">Discord ID: {user.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <AnimatePresence mode="wait">
                            {status === "idle" && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-center"
                                >
                                    <Mail className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                                    <p className="text-zinc-400 mb-6">
                                        Click the button below to receive a 6-digit verification code from SONORA bot
                                    </p>
                                    <button
                                        onClick={sendCode}
                                        className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Send Verification Code
                                    </button>
                                </motion.div>
                            )}

                            {status === "sending" && (
                                <motion.div
                                    key="sending"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                    <p className="text-zinc-400">Sending code to your Discord DM...</p>
                                </motion.div>
                            )}

                            {(status === "sent" || status === "verifying" || status === "error") && (
                                <motion.div
                                    key="code"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <p className="text-center text-zinc-400 mb-6">
                                        Enter the 6-digit code sent to your Discord DM
                                    </p>

                                    {/* Code Input */}
                                    <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                                        {code.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => { inputRefs.current[i] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleChange(i, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(i, e)}
                                                disabled={status === "verifying"}
                                                className={cn(
                                                    "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-zinc-800 focus:outline-none transition-colors",
                                                    status === "error"
                                                        ? "border-rose-500 text-rose-400"
                                                        : "border-zinc-700 focus:border-purple-500"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    {/* Error Message */}
                                    {status === "error" && errorMessage && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 justify-center text-rose-400 text-sm mb-4"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>{errorMessage}</span>
                                        </motion.div>
                                    )}

                                    {/* Verifying State */}
                                    {status === "verifying" && (
                                        <div className="flex items-center justify-center gap-2 text-purple-400 mb-4">
                                            <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                            <span>Verifying...</span>
                                        </div>
                                    )}

                                    {/* Verify Button */}
                                    {status !== "verifying" && (
                                        <button
                                            onClick={verifyCode}
                                            disabled={code.join("").length !== 6}
                                            className={cn(
                                                "w-full py-3 mb-4 rounded-xl font-medium transition-all",
                                                code.join("").length === 6
                                                    ? "bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90"
                                                    : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                            )}
                                        >
                                            Verify Code
                                        </button>
                                    )}

                                    {/* Resend Button */}
                                    <div className="text-center">
                                        <button
                                            onClick={sendCode}
                                            disabled={countdown > 0 || status === "verifying"}
                                            className={cn(
                                                "flex items-center gap-2 mx-auto text-sm transition-colors",
                                                countdown > 0 || status === "verifying"
                                                    ? "text-zinc-600 cursor-not-allowed"
                                                    : "text-purple-400 hover:text-purple-300"
                                            )}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {status === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8"
                                >
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                                    <h3 className="text-xl font-bold text-green-400 mb-2">Verified!</h3>
                                    <p className="text-zinc-400">Redirecting to dashboard...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>


                </div>

                {/* Warning */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 flex items-center gap-2 justify-center text-zinc-600 text-xs"
                >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Make sure you can receive DMs from SONORA bot</span>
                </motion.div>
            </motion.div>
        </div>
    );
}
