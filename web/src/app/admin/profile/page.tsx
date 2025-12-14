"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    User,
    Camera,
    AtSign,
    Calendar,
    Shield,
    Crown,
    Server,
    Check,
    X,
    Edit3,
    Upload,
    Trash2,
    Crop,
} from "lucide-react";
import { useSession, getAvatarUrl, getServerIconUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

// Maximum file size (25MB) 
const MAX_FILE_SIZE = 25 * 1024 * 1024;
// Target compressed size for localStorage (500KB)
const TARGET_SIZE = 500 * 1024;

interface CropArea {
    x: number;
    y: number;
    size: number;
}

export default function ProfilePage() {
    const { user, displayName: contextDisplayName, setDisplayName: setContextDisplayName, customAvatar, setCustomAvatar, managedGuilds } = useSession();
    const { isDark, t } = useSettings();
    const [localDisplayName, setLocalDisplayName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image cropping states
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, size: 200 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const cropImageRef = useRef<HTMLImageElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Initialize local display name from context
    useEffect(() => {
        if (contextDisplayName) {
            setLocalDisplayName(contextDisplayName);
        }
    }, [contextDisplayName]);

    const handleSave = async () => {
        if (!localDisplayName.trim()) return;

        setIsSaving(true);
        setSaveMessage(null);

        // Save to context (which persists to localStorage)
        setContextDisplayName(localDisplayName.trim());

        await new Promise(resolve => setTimeout(resolve, 300));

        setSaveMessage({ type: 'success', text: t('profile.saved') });
        setIsEditing(false);
        setIsSaving(false);

        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleCancel = () => {
        setLocalDisplayName(contextDisplayName || user?.username || "");
        setIsEditing(false);
    };

    // Handle file upload
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            setSaveMessage({ type: 'error', text: 'Only PNG, JPG, JPEG files are supported' });
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setSaveMessage({ type: 'error', text: 'File size must be less than 25MB' });
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }

        // Read and display image
        const reader = new FileReader();
        reader.onload = (event) => {
            setUploadedImage(event.target?.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    };

    // Compress image to target size
    const compressImage = useCallback(async (dataUrl: string, targetWidth: number = 256): Promise<string> => {
        return new Promise((resolve) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetWidth;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, targetWidth, targetWidth);

                // Start with high quality
                let quality = 0.9;
                let result = canvas.toDataURL('image/jpeg', quality);

                // Reduce quality until size is acceptable
                while (result.length > TARGET_SIZE && quality > 0.1) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(result);
            };
            img.src = dataUrl;
        });
    }, []);

    // Handle crop and save
    const handleCropSave = useCallback(async () => {
        if (!uploadedImage || !cropImageRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Get actual image dimensions
        const img = cropImageRef.current;
        const displayedWidth = img.clientWidth;
        const displayedHeight = img.clientHeight;
        const scaleX = img.naturalWidth / displayedWidth;
        const scaleY = img.naturalHeight / displayedHeight;

        // Calculate crop dimensions
        const cropX = cropArea.x * scaleX;
        const cropY = cropArea.y * scaleY;
        const cropSize = cropArea.size * Math.min(scaleX, scaleY);

        canvas.width = 256;
        canvas.height = 256;

        ctx.drawImage(
            img,
            cropX, cropY, cropSize, cropSize,
            0, 0, 256, 256
        );

        // Compress and save
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const compressed = await compressImage(croppedDataUrl);

        setCustomAvatar(compressed);
        setShowCropModal(false);
        setUploadedImage(null);
        setSaveMessage({ type: 'success', text: t('profile.saved') });
        setTimeout(() => setSaveMessage(null), 3000);
    }, [uploadedImage, cropArea, compressImage, setCustomAvatar, t]);

    // Handle removing custom avatar
    const handleRemoveAvatar = () => {
        setCustomAvatar(null);
        setSaveMessage({ type: 'success', text: t('profile.saved') });
        setTimeout(() => setSaveMessage(null), 3000);
    };

    // Mouse events for crop dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !cropImageRef.current) return;

        const imgRect = cropImageRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(e.clientX - dragStart.x, imgRect.width - cropArea.size));
        const newY = Math.max(0, Math.min(e.clientY - dragStart.y, imgRect.height - cropArea.size));

        setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    }, [isDragging, dragStart, cropArea.size]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Initialize crop area when image loads
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageSize({ width: img.clientWidth, height: img.clientHeight });
        const minDim = Math.min(img.clientWidth, img.clientHeight);
        const size = Math.min(200, minDim * 0.8);
        setCropArea({
            x: (img.clientWidth - size) / 2,
            y: (img.clientHeight - size) / 2,
            size
        });
    };

    // Handle resize slider
    const handleSizeChange = (newSize: number) => {
        if (!cropImageRef.current) return;
        const maxSize = Math.min(imageSize.width, imageSize.height);
        const size = Math.min(maxSize, Math.max(50, newSize));

        // Keep centered when resizing
        const centerX = cropArea.x + cropArea.size / 2;
        const centerY = cropArea.y + cropArea.size / 2;
        const newX = Math.max(0, Math.min(centerX - size / 2, imageSize.width - size));
        const newY = Math.max(0, Math.min(centerY - size / 2, imageSize.height - size));

        setCropArea({ x: newX, y: newY, size });
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className={isDark ? "text-zinc-500" : "text-gray-500"}>Loading profile...</p>
            </div>
        );
    }

    // Use custom avatar if set, otherwise Discord avatar
    const avatarUrl = customAvatar || getAvatarUrl(user);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className={cn(
                    "text-3xl font-bold mb-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>{t('profile.title')}</h1>
                <p className={isDark ? "text-zinc-400" : "text-gray-500"}>{t('profile.subtitle')}</p>
            </div>

            {/* Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "p-8 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}
            >
                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                    <div className="relative group">
                        <Image
                            src={avatarUrl}
                            alt={user.username}
                            width={120}
                            height={120}
                            className="rounded-2xl object-cover"
                            unoptimized={!!customAvatar} // Skip optimization for data URLs
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                title="Upload new avatar"
                            >
                                <Upload className="w-5 h-5 text-white" />
                            </button>
                            {customAvatar && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    className="p-2 bg-rose-500/50 rounded-lg hover:bg-rose-500/70 transition-colors"
                                    title="Remove custom avatar"
                                >
                                    <Trash2 className="w-5 h-5 text-white" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 p-2 bg-[#7B1E3C] rounded-full hover:bg-[#9B2E4C] transition-colors"
                        >
                            <Camera className="w-4 h-4 text-white" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    <div className="flex-1">
                        <div className="mb-4">
                            <label className={cn(
                                "text-sm mb-1 block",
                                isDark ? "text-zinc-500" : "text-gray-500"
                            )}>{t('profile.displayName')}</label>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={localDisplayName}
                                        onChange={(e) => setLocalDisplayName(e.target.value)}
                                        className={cn(
                                            "flex-1 px-4 py-2 rounded-lg border focus:outline-none",
                                            isDark
                                                ? "bg-zinc-800 border-zinc-700 focus:border-[#7B1E3C] text-white"
                                                : "bg-gray-100 border-gray-200 focus:border-[#7B1E3C] text-gray-900"
                                        )}
                                        maxLength={32}
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || !localDisplayName.trim()}
                                        className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-gray-200 hover:bg-gray-300"
                                        )}
                                    >
                                        <X className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h2 className={cn(
                                        "text-2xl font-bold",
                                        isDark ? "text-white" : "text-gray-900"
                                    )}>{localDisplayName || user.username}</h2>
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            setTimeout(() => inputRef.current?.focus(), 100);
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-colors",
                                            isDark
                                                ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                        )}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {saveMessage && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "text-sm mb-4",
                                    saveMessage.type === 'success' ? 'text-green-400' : 'text-rose-400'
                                )}
                            >
                                {saveMessage.text}
                            </motion.p>
                        )}

                        <div className="space-y-2">
                            <div className={cn(
                                "flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                <AtSign className="w-4 h-4" />
                                <span className="text-sm">
                                    {t('profile.discord')}: <span className={isDark ? "text-white" : "text-gray-900"}>@{user.username}</span>
                                </span>
                            </div>
                            <div className={cn(
                                "flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-gray-500"
                            )}>
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                    {t('profile.discordId')}: <code className="text-[#7B1E3C]">{user.id}</code>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className={cn(
                    "border-t my-6",
                    isDark ? "border-zinc-800" : "border-gray-200"
                )} />

                {/* Account Info */}
                <div>
                    <h3 className={cn(
                        "text-lg font-semibold mb-4 flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <User className="w-5 h-5 text-[#7B1E3C]" />
                        {t('profile.accountInfo')}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-zinc-800/50" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-zinc-500" : "text-gray-500"}>{t('profile.discordUsername')}</p>
                            <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{user.username}</p>
                            <p className={cn("text-xs mt-1", isDark ? "text-zinc-600" : "text-gray-400")}>
                                {t('profile.cannotChange')}
                            </p>
                        </div>
                        <div className={cn(
                            "p-4 rounded-xl",
                            isDark ? "bg-zinc-800/50" : "bg-gray-100"
                        )}>
                            <p className={isDark ? "text-zinc-500" : "text-gray-500"}>{t('profile.accountType')}</p>
                            <p className="font-medium text-[#7B1E3C]">Admin</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Managed Servers */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                    "p-8 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
                )}
            >
                <h3 className={cn(
                    "text-lg font-semibold mb-6 flex items-center gap-2",
                    isDark ? "text-white" : "text-gray-900"
                )}>
                    <Server className="w-5 h-5 text-cyan-400" />
                    {t('profile.managedServers')} ({managedGuilds.length})
                </h3>

                {managedGuilds.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {managedGuilds.map((guild) => {
                            const iconUrl = getServerIconUrl(guild);
                            return (
                                <div
                                    key={guild.id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl transition-colors",
                                        isDark
                                            ? "bg-zinc-800/50 hover:bg-zinc-800"
                                            : "bg-gray-100/50 hover:bg-gray-100"
                                    )}
                                >
                                    {iconUrl ? (
                                        <Image
                                            src={iconUrl}
                                            alt={guild.name}
                                            width={48}
                                            height={48}
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center",
                                            isDark ? "bg-zinc-700" : "bg-gray-200"
                                        )}>
                                            <Server className={cn("w-6 h-6", isDark ? "text-zinc-500" : "text-gray-400")} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "font-medium truncate",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>{guild.name}</p>
                                        <p className={cn(
                                            "text-sm flex items-center gap-1",
                                            isDark ? "text-zinc-500" : "text-gray-500"
                                        )}>
                                            {guild.owner ? (
                                                <>
                                                    <Crown className="w-3 h-3 text-yellow-500" />
                                                    <span>Owner</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-3 h-3 text-[#7B1E3C]" />
                                                    <span>Administrator</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className={cn(
                        "text-center py-8",
                        isDark ? "text-zinc-500" : "text-gray-500"
                    )}>
                        {t('profile.noServers')}
                    </p>
                )}
            </motion.div>

            {/* Danger Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "p-8 rounded-2xl border border-rose-500/30",
                    isDark ? "bg-zinc-900" : "bg-white"
                )}
            >
                <h3 className="text-lg font-semibold mb-4 text-rose-400">{t('profile.dangerZone')}</h3>
                <p className={cn(
                    "text-sm mb-4",
                    isDark ? "text-zinc-400" : "text-gray-500"
                )}>
                    {t('profile.logoutWarning')}
                </p>
                <button
                    onClick={() => {
                        document.cookie = 'sonora-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        document.cookie = 'sonora-mfa-verified=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                        window.location.href = '/login';
                    }}
                    className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-colors"
                >
                    {t('profile.logout')}
                </button>
            </motion.div>

            {/* Image Crop Modal */}
            <AnimatePresence>
                {showCropModal && uploadedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                        onClick={() => setShowCropModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "w-full max-w-lg p-6 rounded-2xl",
                                isDark ? "bg-zinc-900" : "bg-white"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={cn(
                                    "text-lg font-semibold flex items-center gap-2",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    <Crop className="w-5 h-5" />
                                    Crop Image
                                </h3>
                                <button
                                    onClick={() => setShowCropModal(false)}
                                    className={cn(
                                        "p-2 rounded-lg",
                                        isDark ? "hover:bg-zinc-800" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-900")} />
                                </button>
                            </div>

                            {/* Image with crop overlay */}
                            <div className="relative mb-4 flex justify-center">
                                <div className="relative inline-block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        ref={cropImageRef}
                                        src={uploadedImage}
                                        alt="Crop preview"
                                        className="max-w-full max-h-[300px] rounded-lg"
                                        onLoad={handleImageLoad}
                                    />
                                    {/* Dark overlay */}
                                    <div className="absolute inset-0 bg-black/50 rounded-lg pointer-events-none" />
                                    {/* Crop area (clear) */}
                                    <div
                                        className="absolute border-2 border-white cursor-move"
                                        style={{
                                            left: cropArea.x,
                                            top: cropArea.y,
                                            width: cropArea.size,
                                            height: cropArea.size,
                                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                            background: 'transparent',
                                        }}
                                        onMouseDown={handleMouseDown}
                                    >
                                        {/* Corner handles */}
                                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
                                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Size slider */}
                            <div className="mb-6">
                                <label className={cn(
                                    "text-sm mb-2 block",
                                    isDark ? "text-zinc-400" : "text-gray-500"
                                )}>
                                    Crop Size: {Math.round(cropArea.size)}px
                                </label>
                                <input
                                    type="range"
                                    min={50}
                                    max={Math.min(imageSize.width, imageSize.height) || 300}
                                    value={cropArea.size}
                                    onChange={(e) => handleSizeChange(Number(e.target.value))}
                                    className="w-full accent-[#7B1E3C]"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCropModal(false)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-lg font-medium transition-colors",
                                        isDark
                                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                                            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                    )}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCropSave}
                                    className="flex-1 py-2.5 rounded-lg font-medium bg-[#7B1E3C] text-white hover:bg-[#9B2E4C] transition-colors"
                                >
                                    Save Cropped Image
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <canvas ref={cropCanvasRef} className="hidden" />
        </div>
    );
}
