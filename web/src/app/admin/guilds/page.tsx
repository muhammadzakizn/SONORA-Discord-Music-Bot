"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Server,
  Users,
  Music,
  Search,
  Pause,
  Play,
  SkipForward,
  Square,
  Volume2,
  ChevronRight,
  Wifi,
  WifiOff,
  Crown,
  Shield,
  Bot,
  Settings,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, Guild } from "@/lib/api";
import { useSession, getServerIconUrl, UserGuild } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";

type ViewMode = "all" | "managed";

function GuildCard({
  guild,
  onControl,
  isManaged,
  userRole,
  isDark
}: {
  guild: Guild;
  onControl: (action: string) => void;
  isManaged?: boolean;
  userRole?: "owner" | "admin" | null;
  isDark: boolean;
}) {
  const [isControlling, setIsControlling] = useState(false);

  const handleControl = async (action: string) => {
    setIsControlling(true);
    await onControl(action);
    setTimeout(() => setIsControlling(false), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border transition-all hover:shadow-lg",
        isDark ? "bg-zinc-900" : "bg-white",
        isManaged
          ? "border-[#7B1E3C]/30 hover:border-[#7B1E3C]/50"
          : isDark
            ? "border-zinc-800 hover:border-zinc-700"
            : "border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        {guild.icon ? (
          <img
            src={guild.icon}
            alt={guild.name}
            className="w-16 h-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B1E3C]/20 to-[#C4314B]/20 flex items-center justify-center">
            <Server className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-gray-400")} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-xl font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>
              {guild.name}
            </h3>
            {userRole === "owner" && (
              <span title="Owner"><Crown className="w-4 h-4 text-yellow-400 shrink-0" aria-label="Owner" /></span>
            )}
            {userRole === "admin" && (
              <span title="Admin"><Shield className="w-4 h-4 text-[#7B1E3C] shrink-0" aria-label="Admin" /></span>
            )}
          </div>
          <div className={cn("flex items-center gap-4 mt-1 text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {guild.member_count?.toLocaleString()} members
            </span>
            {guild.is_playing ? (
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Playing
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", isDark ? "bg-zinc-500" : "bg-gray-400")} />
                Idle
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Now Playing */}
      {guild.current_track ? (
        <div className={cn(
          "p-4 rounded-xl mb-4",
          isDark ? "bg-zinc-800/50" : "bg-gray-100"
        )}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center shrink-0">
              <Music className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>
                {guild.current_track.title}
              </p>
              <p className={cn("text-sm truncate", isDark ? "text-zinc-500" : "text-gray-500")}>
                {guild.current_track.artist}
              </p>
            </div>
          </div>

          {/* Controls - only show for managed servers */}
          {isManaged && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => handleControl("resume")}
                disabled={isControlling}
                className={cn(
                  "p-3 rounded-full transition-colors disabled:opacity-50",
                  isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-gray-200 hover:bg-gray-300"
                )}
                title="Resume"
              >
                <Play className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
              </button>
              <button
                onClick={() => handleControl("pause")}
                disabled={isControlling}
                className={cn(
                  "p-3 rounded-full transition-colors disabled:opacity-50",
                  isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-gray-200 hover:bg-gray-300"
                )}
                title="Pause"
              >
                <Pause className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
              </button>
              <button
                onClick={() => handleControl("skip")}
                disabled={isControlling}
                className={cn(
                  "p-3 rounded-full transition-colors disabled:opacity-50",
                  isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-gray-200 hover:bg-gray-300"
                )}
                title="Skip"
              >
                <SkipForward className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
              </button>
              <button
                onClick={() => handleControl("stop")}
                disabled={isControlling}
                className="p-3 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors disabled:opacity-50"
                title="Stop"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "p-4 rounded-xl mb-4 text-center",
          isDark ? "bg-zinc-800/30" : "bg-gray-100/50"
        )}>
          <p className={isDark ? "text-zinc-600" : "text-gray-400"}>No track playing</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/admin/guilds/${guild.id}`}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors text-sm",
            isDark
              ? "bg-zinc-800 hover:bg-zinc-700 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          )}
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </Link>
        {isManaged && (
          <Link
            href={`/admin/guilds/${guild.id}/settings`}
            className={cn(
              "p-3 rounded-xl transition-colors",
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700"
                : "bg-gray-100 hover:bg-gray-200"
            )}
            title="Server Settings"
          >
            <Settings className={cn("w-5 h-5", isDark ? "text-white" : "text-gray-700")} />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function GuildsPage() {
  const { user, managedGuilds, isLoggedIn } = useSession();
  const { isDark, t } = useSettings();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGuilds = async () => {
    try {
      const data = await api.getGuilds();
      setGuilds(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch servers. Make sure the bot is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGuilds();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchGuilds();
    const interval = setInterval(fetchGuilds, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (guildId: number, action: string) => {
    try {
      await api.control(guildId, action as "pause" | "resume" | "skip" | "stop");
      await fetchGuilds();
    } catch (err) {
      console.error("Control failed:", err);
    }
  };

  // Get managed guild IDs for quick lookup
  const managedGuildIds = new Set(managedGuilds?.map(g => g.id) || []);

  // Get user role for a guild
  const getUserRole = (guildId: string | number): "owner" | "admin" | null => {
    const guild = managedGuilds?.find(g => g.id === String(guildId));
    if (!guild) return null;
    if (guild.owner) return "owner";
    if ((guild.permissions & 0x8) === 0x8) return "admin";
    return null;
  };

  // Filter guilds based on view mode and search
  const filteredGuilds = guilds.filter(guild => {
    const matchesSearch = guild.name.toLowerCase().includes(search.toLowerCase());
    const matchesMode = viewMode === "all" || managedGuildIds.has(String(guild.id));
    return matchesSearch && matchesMode;
  });

  // Stats
  const stats = {
    total: guilds.length,
    playing: guilds.filter(g => g.is_playing).length,
    members: guilds.reduce((sum, g) => sum + (g.member_count || 0), 0),
    managed: guilds.filter(g => managedGuildIds.has(String(g.id))).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className={cn(
            "text-3xl font-bold flex items-center gap-3",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <Server className="w-8 h-8 text-cyan-400" />
            {t('servers.title')}
          </h1>
          <p className={cn("mt-1", isDark ? "text-zinc-500" : "text-gray-500")}>
            {`${t('servers.subtitle')} (${guilds.length})`}
          </p>
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
              isDark ? "text-zinc-500" : "text-gray-400"
            )} />
            <input
              type="text"
              placeholder={t('servers.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "pl-10 pr-4 py-3 rounded-xl border outline-none transition-colors w-full sm:w-64",
                isDark
                  ? "bg-zinc-900 border-zinc-800 focus:border-[#7B1E3C] text-white placeholder:text-zinc-500"
                  : "bg-white border-gray-200 focus:border-[#7B1E3C] text-gray-900 placeholder:text-gray-400"
              )}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-3 rounded-xl border transition-colors",
              isDark
                ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                : "bg-white border-gray-200 hover:bg-gray-100"
            )}
            title={t('servers.refresh')}
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-rose-400" />
          <span className="text-rose-400">{error}</span>
          <button
            onClick={handleRefresh}
            className="ml-auto px-4 py-2 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 text-rose-400 text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Total Servers</p>
          <p className="text-2xl font-bold text-[#7B1E3C]">{stats.total}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Currently Playing</p>
          <p className="text-2xl font-bold text-green-400">{stats.playing}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Total Members</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.members.toLocaleString()}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn(
            "text-sm flex items-center gap-1",
            isDark ? "text-zinc-500" : "text-gray-500"
          )}>
            <Crown className="w-3.5 h-3.5" /> Your Servers
          </p>
          <p className="text-2xl font-bold text-yellow-400">{stats.managed}</p>
        </div>
      </div>

      {/* Guild Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredGuilds.map((guild) => (
            <GuildCard
              key={guild.id}
              guild={guild}
              onControl={(action) => handleControl(guild.id, action)}
              isManaged={managedGuildIds.has(String(guild.id))}
              userRole={getUserRole(guild.id)}
              isDark={isDark}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredGuilds.length === 0 && !error && (
        <div className="text-center py-16">
          <Server className={cn(
            "w-16 h-16 mx-auto mb-4",
            isDark ? "text-zinc-700" : "text-gray-300"
          )} />
          <p className={cn("text-xl", isDark ? "text-zinc-500" : "text-gray-500")}>
            {viewMode === "managed"
              ? t('servers.noServers')
              : t('servers.noServers')
            }
          </p>
          <p className={cn("mt-2", isDark ? "text-zinc-600" : "text-gray-400")}>
            {search
              ? "Try a different search term"
              : viewMode === "managed"
                ? "You don't have owner/admin access to any servers with the bot"
                : "Bot is not connected to any servers"
            }
          </p>
        </div>
      )}
    </div>
  );
}
