"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
    Fingerprint,
    Smartphone,
    Mail,
    MessageSquare,
    Shield,
    CheckCircle,
    XCircle,
    RefreshCw,
    ArrowRight,
    Lock,
    Key,
    ChevronLeft,
} from "lucide-react";
import { useSession, getAvatarUrl } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";
import {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

type MFAMethod = "passkey" | "totp" | "otp-discord" | "otp-email";
type MFAStep = "select" | "setup" | "verify" | "success";

const MFA_METHODS: { id: MFAMethod; label: string; icon: React.ElementType; description: string; recommended?: boolean }[] = [
    {
        id: "passkey",
        label: "Passkey",
        icon: Fingerprint,
        description: "Use fingerprint or Face ID",
        recommended: true,
    },
    {
        id: "totp",
        label: "Authenticator App",
        icon: Smartphone,
        description: "Google Authenticator, Authy, etc.",
    },
    {
        id: "otp-discord",
        label: "Discord DM",
        icon: MessageSquare,
        description: "Get code via SONORA bot DM",
    },
    {
        id: "otp-email",
        label: "Email",
        icon: Mail,
        description: "Get code via email",
    },
];

export default function MFAPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoggedIn, isLoading } = useSession();

    const [step, setStep] = useState<MFAStep>("select");
    const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // OTP state
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
    const [countdown, setCountdown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // TOTP state
    const [totpSecret, setTotpSecret] = useState("");
    const [totpQR, setTotpQR] = useState("");

    // Passkey state
    const [supportsPasskey, setSupportsPasskey] = useState(false);

    const redirectTo = searchParams?.get("redirect") || "/admin";

    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            router.push("/login");
        }
    }, [isLoading, isLoggedIn, router]);

    useEffect(() => {
        setSupportsPasskey(browserSupportsWebAuthn());
    }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Handle Passkey registration
    const handlePasskeySetup = async () => {
        setIsProcessing(true);
        setError("");

        try {
            // Get registration options from server
            const optionsRes = await fetch("/api/mfa/passkey/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id }),
            });

            if (!optionsRes.ok) {
                throw new Error("Failed to get registration options");
            }

            const options = await optionsRes.json();

            // Start WebAuthn registration
            const credential = await startRegistration({ optionsJSON: options });

            // Verify with server
            const verifyRes = await fetch("/api/mfa/passkey/register/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.id,
                    credential
                }),
            });

            if (!verifyRes.ok) {
                throw new Error("Failed to register passkey");
            }

            setSuccess(true);
            setStep("success");

            setTimeout(() => {
                router.push(redirectTo);
            }, 1500);

        } catch (err: any) {
            console.error("Passkey error:", err);
            setError(err.message || "Failed to setup passkey");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Passkey verification
    const handlePasskeyVerify = async () => {
        setIsProcessing(true);
        setError("");

        try {
            // Get authentication options
            const optionsRes = await fetch("/api/mfa/passkey/authenticate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id }),
            });

            if (!optionsRes.ok) {
                throw new Error("Failed to get authentication options");
            }

            const options = await optionsRes.json();

            // Start WebAuthn authentication
            const credential = await startAuthentication({ optionsJSON: options });

            // Verify with server
            const verifyRes = await fetch("/api/mfa/passkey/authenticate/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.id,
                    credential
                }),
            });

            if (!verifyRes.ok) {
                throw new Error("Authentication failed");
            }

            setSuccess(true);
            setStep("success");

            setTimeout(() => {
                router.push(redirectTo);
            }, 1500);

        } catch (err: any) {
            console.error("Passkey verify error:", err);
            setError(err.message || "Authentication failed");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle TOTP setup
    const handleTOTPSetup = async () => {
        setIsProcessing(true);
        setError("");

        try {
            const res = await fetch("/api/mfa/totp/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id }),
            });

            if (!res.ok) {
                throw new Error("Failed to setup authenticator");
            }

            const data = await res.json();
            setTotpSecret(data.secret);
            setTotpQR(data.qrCode);
            setStep("setup");

        } catch (err: any) {
            setError(err.message || "Failed to setup authenticator");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle OTP send
    const handleSendOTP = async (method: "discord" | "email") => {
        setIsProcessing(true);
        setError("");

        try {
            const res = await fetch("/api/verify/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.id,
                    method
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to send code");
            }

            setCountdown(60);
            setStep("verify");

        } catch (err: any) {
            setError(err.message || "Failed to send verification code");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle OTP verification
    const handleVerifyOTP = async () => {
        const code = otpCode.join("");
        if (code.length !== 6) return;

        setIsProcessing(true);
        setError("");

        try {
            const res = await fetch("/api/verify/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.id,
                    code
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.verified) {
                throw new Error(data.error || "Invalid code");
            }

            setSuccess(true);
            setStep("success");

            setTimeout(() => {
                router.push(redirectTo);
            }, 1500);

        } catch (err: any) {
            setError(err.message || "Verification failed");
            setOtpCode(["", "", "", "", "", ""]);
            otpRefs.current[0]?.focus();
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle OTP input
    const handleOTPChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...otpCode];
        newCode[index] = value.slice(-1);
        setOtpCode(newCode);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (newCode.every(d => d) && newCode.join("").length === 6) {
            setTimeout(handleVerifyOTP, 100);
        }
    };

    const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleMethodSelect = (method: MFAMethod) => {
        setSelectedMethod(method);
        setError("");

        if (method === "passkey") {
            handlePasskeyVerify();
        } else if (method === "totp") {
            setStep("verify");
        } else if (method === "otp-discord") {
            handleSendOTP("discord");
        } else if (method === "otp-email") {
            handleSendOTP("email");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                        {user && (
                            <div className="flex justify-center mb-4">
                                <Image
                                    src={getAvatarUrl(user)}
                                    alt={user.username}
                                    width={64}
                                    height={64}
                                    className="rounded-full ring-2 ring-purple-500/50"
                                />
                            </div>
                        )}
                        <h1 className="text-xl font-bold text-white mb-1">
                            Verify Your Identity
                        </h1>
                        <p className="text-white/50 text-sm">
                            {step === "select" && "Choose a verification method"}
                            {step === "setup" && "Complete setup"}
                            {step === "verify" && "Enter verification code"}
                            {step === "success" && "Verified!"}
                        </p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step: Select Method */}
                    {step === "select" && (
                        <div className="space-y-3">
                            {MFA_METHODS.map((method) => {
                                const isDisabled = method.id === "passkey" && !supportsPasskey;
                                return (
                                    <button
                                        key={method.id}
                                        onClick={() => !isDisabled && handleMethodSelect(method.id)}
                                        disabled={isDisabled || isProcessing}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                                            isDisabled
                                                ? "opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-800/50"
                                                : "border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-3 rounded-xl",
                                            method.recommended
                                                ? "bg-purple-500/20 text-purple-400"
                                                : "bg-zinc-800 text-zinc-400"
                                        )}>
                                            <method.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white">
                                                    {method.label}
                                                </span>
                                                {method.recommended && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/50">
                                                {method.description}
                                            </p>
                                        </div>
                                        {isProcessing && selectedMethod === method.id ? (
                                            <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                                        ) : (
                                            <ArrowRight className="w-5 h-5 text-white/30" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Step: TOTP Setup */}
                    {step === "setup" && selectedMethod === "totp" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                {totpQR && (
                                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                                        <img src={totpQR} alt="QR Code" className="w-48 h-48" />
                                    </div>
                                )}
                                <p className="text-sm text-white/70">
                                    Scan this QR code with your authenticator app
                                </p>
                                {totpSecret && (
                                    <p className="mt-2 text-xs font-mono bg-zinc-800 rounded-lg p-2 text-white/50">
                                        {totpSecret}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setStep("verify")}
                                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition-colors"
                            >
                                I've Added It
                            </button>
                        </div>
                    )}

                    {/* Step: Verify (OTP/TOTP) */}
                    {step === "verify" && (selectedMethod === "totp" || selectedMethod?.startsWith("otp")) && (
                        <div className="space-y-4">
                            <div className="flex justify-center gap-2">
                                {otpCode.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => { otpRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOTPChange(index, e.target.value)}
                                        onKeyDown={e => handleOTPKeyDown(index, e)}
                                        className={cn(
                                            "w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all",
                                            "bg-zinc-800 border-2 border-zinc-700 text-white",
                                            "focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                        )}
                                    />
                                ))}
                            </div>

                            {selectedMethod?.startsWith("otp") && (
                                <div className="text-center">
                                    {countdown > 0 ? (
                                        <p className="text-sm text-white/50">
                                            Resend code in {countdown}s
                                        </p>
                                    ) : (
                                        <button
                                            onClick={() => handleSendOTP(selectedMethod === "otp-discord" ? "discord" : "email")}
                                            disabled={isProcessing}
                                            className="text-sm text-purple-400 hover:text-purple-300"
                                        >
                                            Resend code
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleVerifyOTP}
                                disabled={otpCode.some(d => !d) || isProcessing}
                                className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Shield className="w-5 h-5" />
                                )}
                                Verify
                            </button>

                            <button
                                onClick={() => {
                                    setStep("select");
                                    setSelectedMethod(null);
                                    setOtpCode(["", "", "", "", "", ""]);
                                }}
                                className="w-full py-2 text-sm text-white/50 hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4 inline mr-1" />
                                Try another method
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === "success" && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Verified Successfully!
                            </h2>
                            <p className="text-white/50 text-sm">
                                Redirecting to dashboard...
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Security Note */}
                <p className="text-center text-white/30 text-xs mt-4 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Protected with bank-level security
                </p>
            </motion.div>
        </div>
    );
}
