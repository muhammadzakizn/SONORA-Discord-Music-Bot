"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Settings,
    ArrowLeft,
    Server,
    Volume2,
    Users,
    Hash,
    Shield,
    Crown,
    Save,
    Check,
    Music,
    MessageSquare,
    SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/contexts/SessionContext";

function Toggle({
    enabled,
    onChange,
    label,
    description,
}: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <label className="flex items-center justify-between cursor-pointer py-4">
            <div>
                <span className="block font-medium">{label}</span>
                {description && (
                    <span className="text-sm text-zinc-500">{description}</span>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={cn(
                    "relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4",
                    enabled ? "bg-purple-600" : "bg-zinc-700"
                )}
            >
                <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: enabled ? 24 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </button>
        </label>
    );
}

export default function ServerSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { managedGuilds } = useSession();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const guildId = params.guildId as string;

    // Find the server from user's managed guilds
    const server = managedGuilds?.find(g => g.id === guildId);
    const isOwner = server?.owner ?? false;
    const isAdmin = server ? (server.permissions & 0x8) === 0x8 : false;

    // Server-specific settings
    const [settings, setSettings] = useState({
        // Playback
        defaultVolume: 80,
        announceTrack: true,
        autoPlay: true,

        // Permissions
        djRoleId: "",
        djOnly: false,
        allowRequests: true,
        maxQueuePerUser: 10,

        // Commands
        prefix: "!",
        deleteCommands: true,

        // Channels
        musicChannelId: "",
        restrictToChannel: false,
    });

    const handleSave = async () => {
        setSaving(true);
        // TODO: Save to bot API for this specific server
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (!server) {
        return (
            <div className="text-center py-16">
                <Server className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-xl text-zinc-500">Server not found</p>
                <p className="text-zinc-600 mt-2">You may not have access to this server</p>
                <Link
                    href="/admin/guilds"
                    className="inline-flex items-center gap-2 mt-4 text-purple-400 hover:text-purple-300"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Servers
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Back Button */}
            <Link
                href={`/admin/guilds/${guildId}`}
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Server
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {server.icon ? (
                        <img
                            src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                            alt={server.name}
                            className="w-16 h-16 rounded-2xl"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Server className="w-8 h-8 text-zinc-500" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{server.name}</h1>
                            {isOwner && <Crown className="w-5 h-5 text-yellow-400" />}
                            {!isOwner && isAdmin && <Shield className="w-5 h-5 text-purple-400" />}
                        </div>
                        <p className="text-zinc-500">Server Settings</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                        saved
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
                    )}
                >
                    {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : saved ? (
                        <>
                            <Check className="w-5 h-5" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Playback Settings */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-zinc-800">
                            <Volume2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Playback</h3>
                            <p className="text-sm text-zinc-500">Music playback settings for this server</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">
                                Default Volume: {settings.defaultVolume}%
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={settings.defaultVolume}
                                onChange={(e) => setSettings({ ...settings, defaultVolume: parseInt(e.target.value) })}
                                className="w-full accent-purple-500"
                            />
                        </div>
                        <div className="divide-y divide-zinc-800">
                            <Toggle
                                enabled={settings.announceTrack}
                                onChange={(v) => setSettings({ ...settings, announceTrack: v })}
                                label="Announce Now Playing"
                                description="Send a message when a new track starts"
                            />
                            <Toggle
                                enabled={settings.autoPlay}
                                onChange={(v) => setSettings({ ...settings, autoPlay: v })}
                                label="Auto-play Next"
                                description="Automatically play next track in queue"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-zinc-800">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Permissions</h3>
                            <p className="text-sm text-zinc-500">Control who can use the bot</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="divide-y divide-zinc-800">
                            <Toggle
                                enabled={settings.djOnly}
                                onChange={(v) => setSettings({ ...settings, djOnly: v })}
                                label="DJ Only Mode"
                                description="Only users with DJ role can control playback"
                            />
                            <Toggle
                                enabled={settings.allowRequests}
                                onChange={(v) => setSettings({ ...settings, allowRequests: v })}
                                label="Allow Song Requests"
                                description="Let anyone request songs to the queue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Max Queue per User</label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={settings.maxQueuePerUser}
                                onChange={(e) => setSettings({ ...settings, maxQueuePerUser: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-purple-500 outline-none transition-colors"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Maximum songs a user can add at once</p>
                        </div>
                    </div>
                </div>

                {/* Commands */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-zinc-800">
                            <MessageSquare className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Commands</h3>
                            <p className="text-sm text-zinc-500">Bot command settings</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Command Prefix</label>
                            <input
                                type="text"
                                value={settings.prefix}
                                onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                                maxLength={3}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-purple-500 outline-none transition-colors"
                                placeholder="!"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Example: {settings.prefix}play, {settings.prefix}skip</p>
                        </div>
                        <Toggle
                            enabled={settings.deleteCommands}
                            onChange={(v) => setSettings({ ...settings, deleteCommands: v })}
                            label="Delete Command Messages"
                            description="Remove user commands after processing"
                        />
                    </div>
                </div>

                {/* Channel Restrictions */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-zinc-800">
                            <Hash className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Channels</h3>
                            <p className="text-sm text-zinc-500">Channel restrictions</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Toggle
                            enabled={settings.restrictToChannel}
                            onChange={(v) => setSettings({ ...settings, restrictToChannel: v })}
                            label="Restrict to Music Channel"
                            description="Only allow commands in designated channel"
                        />
                        {settings.restrictToChannel && (
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Music Channel ID</label>
                                <input
                                    type="text"
                                    value={settings.musicChannelId}
                                    onChange={(e) => setSettings({ ...settings, musicChannelId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-purple-500 outline-none transition-colors"
                                    placeholder="Enter channel ID"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
