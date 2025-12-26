"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Server,
  Users,
  User,
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
  isMember,
  userRole,
  isDark
}: {
  guild: Guild;
  onControl: (action: string) => void;
  isManaged?: boolean;
  isMember?: boolean;
  userRole?: "owner" | "admin" | "member" | null;
  isDark: boolean;
}) {
  const canControl = isManaged || isMember;
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
            {userRole === "member" && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium" title="Member">
                <User className="w-3 h-3" />
                Member
              </span>
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

          {/* Controls - show for managed and member servers */}
          {canControl && (
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
  const { user, managedGuilds, guilds: userGuilds, isLoggedIn } = useSession();
  const { isDark, t } = useSettings();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("managed");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controlToast, setControlToast] = useState<{ message: string; username: string } | null>(null);

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

  // Listen for control change events via SocketIO
  useEffect(() => {
    const BOT_API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';
    let socket: any = null;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io(BOT_API_BASE, {
          transports: ['websocket', 'polling'],
          reconnection: true,
        });

        socket.on('control_change', (data: { action: string; status: string; controlled_by: { username: string } }) => {
          // Don't show toast for own actions
          if (data.controlled_by?.username && data.controlled_by.username !== user?.username) {
            const actionText = data.status === 'paused' ? 'paused' :
              data.status === 'resumed' ? 'resumed' :
                data.status === 'skipped' ? 'skipped to next track' :
                  data.status === 'stopped' ? 'stopped' : data.status;

            setControlToast({
              message: `${actionText} playback`,
              username: data.controlled_by.username
            });

            // Auto-hide toast after 4 seconds
            setTimeout(() => setControlToast(null), 4000);

            // Refresh guild data
            fetchGuilds();
          }
        });
      } catch (err) {
        console.log('SocketIO not available for control notifications');
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?.username]);

  const handleControl = async (guildId: number, action: string) => {
    try {
      // Pass user info for control notification
      const controlledBy = user ? {
        userId: user.id,
        username: user.username,
        avatar: user.avatar
      } : undefined;

      await api.control(guildId, action as "pause" | "resume" | "skip" | "stop", controlledBy);
      await fetchGuilds();
    } catch (err) {
      console.error("Control failed:", err);
    }
  };

  // Get managed guild IDs for quick lookup
  const managedGuildIds = new Set(managedGuilds?.map(g => g.id) || []);

  // Get user role for a guild
  const getUserRole = (guildId: string | number, isMemberServer: boolean = false): "owner" | "admin" | "member" | null => {
    const guild = managedGuilds?.find(g => g.id === String(guildId));
    if (!guild) {
      // If not in managedGuilds, it's a member server
      return isMemberServer ? "member" : null;
    }
    if (guild.owner) return "owner";
    if ((guild.permissions & 0x8) === 0x8) return "admin";
    return null;
  };

  // Filter guilds by search
  const searchFilteredGuilds = guilds.filter(guild =>
    guild.name.toLowerCase().includes(search.toLowerCase())
  );

  // Separate into Manager (owner/admin) and Member (no permissions) guilds  
  const managerGuilds = searchFilteredGuilds.filter(guild =>
    managedGuildIds.has(String(guild.id))
  );

  // Member guilds = servers where:
  // 1. User is in the server (from userGuilds/Discord OAuth)
  // 2. User is NOT admin/owner (not in managedGuildIds)
  // 3. Bot SONORA is in the server (exists in guilds from API)
  const userGuildIds = new Set(userGuilds?.map(g => g.id) || []);
  const memberGuilds = searchFilteredGuilds.filter(guild =>
    userGuildIds.has(String(guild.id)) && !managedGuildIds.has(String(guild.id))
  );

  // Stats - user's servers (managed + member) that have SONORA
  const userServersWithSonora = [...managerGuilds, ...memberGuilds];
  const stats = {
    total: userServersWithSonora.length,
    playing: userServersWithSonora.filter(g => g.is_playing).length,
    members: userServersWithSonora.reduce((sum, g) => sum + (g.member_count || 0), 0),
    managed: managerGuilds.length,
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
      {/* Control Change Toast Notification */}
      <AnimatePresence>
        {controlToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed top-20 left-1/2 z-50"
          >
            <div className={cn(
              "px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3",
              isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
            )}>
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                  <span className="text-cyan-400">{controlToast.username}</span> {controlToast.message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {`Manage your servers (${searchFilteredGuilds.length})`}
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
              "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors w-full sm:w-auto",
              isDark
                ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
                : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"
            )}
            title={t('servers.refresh')}
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            <span className="font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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

      {/* Manager Guilds Section */}
      {managerGuilds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
              Servers You Manage
            </h2>
            <span className={cn(
              "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
              "bg-yellow-500/20 text-yellow-400"
            )}>
              {managerGuilds.length}
            </span>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {managerGuilds.map((guild) => (
              <GuildCard
                key={guild.id}
                guild={guild}
                onControl={(action) => handleControl(guild.id, action)}
                isManaged={true}
                userRole={getUserRole(guild.id)}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {/* Member Guilds Section */}
      {memberGuilds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>
              Other Servers
            </h2>
            <span className={cn(
              "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
              "bg-cyan-500/20 text-cyan-400"
            )}>
              {memberGuilds.length}
            </span>
            <span className={cn("text-xs ml-2", isDark ? "text-zinc-500" : "text-gray-400")}>
              (Join voice to control)
            </span>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {memberGuilds.map((guild) => (
              <GuildCard
                key={guild.id}
                guild={guild}
                onControl={(action) => handleControl(guild.id, action)}
                isManaged={false}
                isMember={true}
                userRole="member"
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {managerGuilds.length === 0 && memberGuilds.length === 0 && !error && (
        <div className="text-center py-16">
          <Server className={cn(
            "w-16 h-16 mx-auto mb-4",
            isDark ? "text-zinc-700" : "text-gray-300"
          )} />
          <p className={cn("text-xl", isDark ? "text-zinc-500" : "text-gray-500")}>
            {t('servers.noServers')}
          </p>
          <p className={cn("mt-2", isDark ? "text-zinc-600" : "text-gray-400")}>
            {search
              ? "Try a different search term"
              : "Bot is not connected to any of your servers"
            }
          </p>
        </div>
      )}
    </div>
  );
}
