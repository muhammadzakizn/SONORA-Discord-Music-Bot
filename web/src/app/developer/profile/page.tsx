"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Save, Camera, Check, ArrowLeft, Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useSession } from "@/contexts/SessionContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const TARGET_SIZE = 500 * 1024; // Compress to ~500KB for storage

// Compress image to target size
async function compressImage(file: File, maxSize: number = TARGET_SIZE): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if too large
                const maxDimension = 512;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to get under target size
                let quality = 0.9;
                let result = canvas.toDataURL('image/jpeg', quality);

                while (result.length > maxSize && quality > 0.1) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(result);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

export default function DeveloperProfilePage() {
    const { isDark } = useSettings();
    const { devSession, isDevLoggedIn, updateDevProfile } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [displayName, setDisplayName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!isDevLoggedIn) {
            router.push("/login");
        }
    }, [isDevLoggedIn, router]);

    // Load initial values from session
    useEffect(() => {
        if (devSession) {
            setDisplayName(devSession.displayName || devSession.username || "");
            setAvatar(devSession.avatar || "");
        }
    }, [devSession]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError("");

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setUploadError("Please select a PNG or JPEG image");
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setUploadError(`File too large. Maximum size is 20MB`);
            return;
        }

        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            setAvatar(compressed);
        } catch (err) {
            setUploadError("Failed to process image. Please try another.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatar("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        // Update the session with new profile data
        updateDevProfile({
            displayName: displayName.trim() || undefined,
            avatar: avatar || undefined,
        });

        // Simulate save delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setIsSaving(false);
        setSaveSuccess(true);

        // Reset success indicator after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    if (!isDevLoggedIn || !devSession) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-white/50">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/developer"
                        className={cn(
                            "p-2 rounded-xl transition-colors",
                            isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                        )}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className={cn(
                        "p-2 rounded-xl",
                        isDark ? "bg-purple-500/20" : "bg-purple-500/10"
                    )}>
                        <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-2xl font-bold",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Profile Settings
                        </h1>
                        <p className={isDark ? "text-white/50" : "text-gray-500"}>
                            Customize your developer profile
                        </p>
                    </div>
                </div>

                <motion.button
                    onClick={handleSave}
                    disabled={isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                        "px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2",
                        saveSuccess
                            ? "bg-green-500 text-white"
                            : "bg-purple-500 text-white hover:bg-purple-600",
                        isSaving && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {saveSuccess ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </>
                    )}
                </motion.button>
            </div>

            {/* Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-2xl p-6",
                    isDark
                        ? "bg-white/5 border border-white/10"
                        : "bg-white border border-gray-200"
                )}
            >
                <h2 className={cn(
                    "text-lg font-semibold mb-6",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    Profile Information
                </h2>

                <div className="grid gap-6">
                    {/* Avatar Upload */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-3",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Profile Photo
                        </label>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {avatar ? (
                                    <>
                                        <img
                                            src={avatar}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-2xl object-cover"
                                        />
                                        <button
                                            onClick={handleRemoveAvatar}
                                            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-3xl">
                                        {(displayName || devSession.username || 'D').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".png,.jpg,.jpeg"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className={cn(
                                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-colors",
                                        isDark
                                            ? "bg-white/10 hover:bg-white/20 text-white"
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                    )}
                                >
                                    {isUploading ? (
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-5 h-5" />
                                    )}
                                    <span>{isUploading ? "Processing..." : "Upload Photo"}</span>
                                </label>
                                <p className={cn(
                                    "mt-2 text-xs",
                                    isDark ? "text-white/30" : "text-gray-400"
                                )}>
                                    PNG, JPG, JPEG up to 20MB
                                </p>
                                {uploadError && (
                                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Username (read-only) */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-2",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={devSession.username}
                            disabled
                            className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-sm cursor-not-allowed",
                                isDark
                                    ? "bg-white/5 border border-white/10 text-white/50"
                                    : "bg-gray-100 border border-gray-200 text-gray-500"
                            )}
                        />
                        <p className={cn(
                            "mt-1 text-xs",
                            isDark ? "text-white/30" : "text-gray-400"
                        )}>
                            Username cannot be changed
                        </p>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-2",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={devSession.username}
                            className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-sm",
                                isDark
                                    ? "bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500"
                                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-500"
                            )}
                        />
                        <p className={cn(
                            "mt-1 text-xs",
                            isDark ? "text-white/30" : "text-gray-400"
                        )}>
                            This is how your name appears in the dashboard
                        </p>
                    </div>

                    {/* Role Badge */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-2",
                            isDark ? "text-white/70" : "text-gray-700"
                        )}>
                            Role
                        </label>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium",
                                devSession.role === 'owner'
                                    ? "bg-purple-500/20 text-purple-400"
                                    : "bg-blue-500/20 text-blue-400"
                            )}>
                                {devSession.role === 'owner' ? 'Owner' : 'Developer'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Session Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                    "rounded-2xl p-6",
                    isDark
                        ? "bg-white/5 border border-white/10"
                        : "bg-white border border-gray-200"
                )}
            >
                <h2 className={cn(
                    "text-lg font-semibold mb-4",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    Session Information
                </h2>

                <div className="grid gap-4">
                    <div className="flex justify-between items-center py-2">
                        <span className={isDark ? "text-white/50" : "text-gray-500"}>Session Expires</span>
                        <span className={isDark ? "text-white" : "text-gray-900"}>
                            {new Date((devSession.timestamp || 0) + 24 * 60 * 60 * 1000).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className={isDark ? "text-white/50" : "text-gray-500"}>Login Method</span>
                        <span className={isDark ? "text-white" : "text-gray-900"}>
                            Developer Portal
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
