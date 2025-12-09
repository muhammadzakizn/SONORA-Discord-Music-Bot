"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Server,
  Users,
  Headphones,
  Clock,
  Wifi,
  WifiOff,
  Music,
  TrendingUp,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Pause,
  SkipForward,
  Square,
  Crown,
  Shield,
  Bot,
  ExternalLink,
} from "lucide-react";
import { api, BotStatus, Guild, HealthStatus, ActivityStats } from "@/lib/api";
import { formatUptime, formatNumber, cn } from "@/lib/utils";
import { useSession, getServerIconUrl, UserGuild } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";

// Stats Card Component - Theme Aware
function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "purple",
  isDark,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color?: "purple" | "cyan" | "green" | "rose" | "yellow";
  isDark: boolean;
}) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
    rose: "from-rose-500/20 to-rose-600/20 border-rose-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
  };

  const iconColors = {
    purple: "text-purple-400",
    cyan: "text-cyan-400",
    green: "text-green-400",
    rose: "text-rose-400",
    yellow: "text-yellow-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-sm",
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-500")}>{title}</p>
          <p className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>{value}</p>
          {trend && (
            <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isDark ? "bg-zinc-800/50" : "bg-black/5",
          iconColors[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

// User's Managed Server Card - Theme Aware
function ManagedServerCard({ guild, botInstalled, isDark }: { guild: UserGuild; botInstalled: boolean; isDark: boolean }) {
  const iconUrl = getServerIconUrl(guild);

  return (
    <Link href={`/admin/guilds/${guild.id}${botInstalled ? '' : '/settings'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "p-4 rounded-2xl cursor-pointer transition-all",
          "backdrop-blur-xl border",
          isDark
            ? "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]"
            : "bg-black/[0.02] border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.04]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        )}
      >
        <div className="flex items-center gap-4">
          {iconUrl ? (
            <Image
              src={iconUrl}
              alt={guild.name}
              width={48}
              height={48}
              className="rounded-xl object-cover"
            />
          ) : (
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isDark ? "bg-white/[0.05]" : "bg-black/[0.05]"
            )}>
              <Server className={cn("w-6 h-6", isDark ? "text-white/50" : "text-gray-400")} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold truncate flex items-center gap-2",
              isDark ? "text-white/90" : "text-gray-900"
            )}>
              {guild.name}
              {guild.owner && <Crown className="w-4 h-4 text-yellow-500" />}
            </h3>
            <div className={cn(
              "flex items-center gap-2 text-sm",
              isDark ? "text-white/50" : "text-gray-500"
            )}>
              <Shield className="w-3 h-3" />
              <span>{guild.owner ? 'Owner' : 'Admin'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {botInstalled ? (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <Bot className="w-4 h-4" />
                <span>Bot Active</span>
              </span>
            ) : (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(
                    `https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&guild_id=${guild.id}&scope=bot+applications.commands`,
                    '_blank'
                  );
                }}
                className="flex items-center gap-1.5 text-sm text-[#7B1E3C] hover:text-[#9B2E4C] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Add Bot</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Bot Guild Card Component - Theme Aware
function BotGuildCard({ guild, onControl, isDark }: { guild: Guild; onControl: (action: string) => void; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-4 rounded-xl border transition-all",
        isDark
          ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex items-center gap-4">
        {guild.icon ? (
          <img
            src={guild.icon}
            alt={guild.name}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isDark ? "bg-zinc-800" : "bg-gray-100"
          )}>
            <Server className={cn("w-6 h-6", isDark ? "text-zinc-500" : "text-gray-400")} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>{guild.name}</h3>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>{guild.member_count} members</p>
        </div>
        {guild.is_playing ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-400">Playing</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", isDark ? "bg-zinc-500" : "bg-gray-400")} />
            <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Idle</span>
          </div>
        )}
      </div>

      {guild.current_track && (
        <div className={cn(
          "mt-4 p-3 rounded-lg",
          isDark ? "bg-zinc-800/50" : "bg-gray-100"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium truncate", isDark ? "text-white" : "text-gray-900")}>{guild.current_track.title}</p>
              <p className={cn("text-sm truncate", isDark ? "text-zinc-500" : "text-gray-500")}>{guild.current_track.artist}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onControl("pause")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
                )}
              >
                <Pause className={cn("w-4 h-4", isDark ? "text-white" : "text-gray-600")} />
              </button>
              <button
                onClick={() => onControl("skip")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
                )}
              >
                <SkipForward className={cn("w-4 h-4", isDark ? "text-white" : "text-gray-600")} />
              </button>
              <button
                onClick={() => onControl("stop")}
                className={cn(
                  "p-2 rounded-lg transition-colors text-rose-400",
                  isDark ? "hover:bg-zinc-700" : "hover:bg-gray-200"
                )}
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// System Health Component - Theme Aware
function SystemHealth({ health, t, isDark }: { health: HealthStatus | null; t: (key: string) => string; isDark: boolean }) {
  if (!health) return null;

  return (
    <div className={cn(
      "p-6 rounded-2xl border",
      isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
    )}>
      <h3 className={cn(
        "text-lg font-semibold mb-4 flex items-center gap-2",
        isDark ? "text-white" : "text-gray-900"
      )}>
        <Activity className="w-5 h-5 text-green-400" />
        {t('dashboard.systemHealth')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn("p-4 rounded-xl", isDark ? "bg-zinc-800/50" : "bg-gray-100")}>
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>CPU</span>
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{health.system.cpu_percent}%</p>
        </div>
        <div className={cn("p-4 rounded-xl", isDark ? "bg-zinc-800/50" : "bg-gray-100")}>
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-4 h-4 text-purple-400" />
            <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Memory</span>
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{health.system.memory_mb.toFixed(0)} MB</p>
        </div>
        <div className={cn("p-4 rounded-xl", isDark ? "bg-zinc-800/50" : "bg-gray-100")}>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-yellow-400" />
            <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Database</span>
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{health.database.size_mb.toFixed(1)} MB</p>
        </div>
        <div className={cn("p-4 rounded-xl", isDark ? "bg-zinc-800/50" : "bg-gray-100")}>
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Latency</span>
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{health.bot.latency_ms.toFixed(0)} ms</p>
        </div>
      </div>
    </div>
  );
}

// Top Tracks Component - Theme Aware
function TopTracks({ activity, isDark }: { activity: ActivityStats | null; isDark: boolean }) {
  if (!activity) return null;

  return (
    <div className={cn(
      "p-6 rounded-2xl border",
      isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
    )}>
      <h3 className={cn(
        "text-lg font-semibold mb-4 flex items-center gap-2",
        isDark ? "text-white" : "text-gray-900"
      )}>
        <TrendingUp className="w-5 h-5 text-[#7B1E3C]" />
        Top Tracks (7 days)
      </h3>
      <div className="space-y-3">
        {activity.top_tracks.slice(0, 5).map((track, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl transition-colors",
              isDark
                ? "bg-zinc-800/50 hover:bg-zinc-800"
                : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7B1E3C] to-[#C4314B] flex items-center justify-center text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium truncate", isDark ? "text-white" : "text-gray-900")}>{track.title}</p>
              <p className={cn("text-sm truncate", isDark ? "text-zinc-500" : "text-gray-500")}>{track.artist}</p>
            </div>
            <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>{track.plays} plays</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, managedGuilds } = useSession();
  const { t, isDark } = useSettings();
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activity, setActivity] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [statusData, guildsData, healthData, activityData] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getGuilds().catch(() => []),
        api.getHealth().catch(() => null),
        api.getActivity(7).catch(() => null),
      ]);

      setStatus(statusData);
      setGuilds(guildsData);
      setHealth(healthData);
      setActivity(activityData);
      setError(null);
    } catch (err) {
      setError("Failed to connect to bot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (guildId: number, action: string) => {
    try {
      await api.control(guildId, action as 'pause' | 'resume' | 'skip' | 'stop');
      fetchData();
    } catch (err) {
      console.error("Control failed:", err);
    }
  };

  // Check if bot is installed in user's managed guilds
  const getServerWithBotStatus = (managedGuild: UserGuild) => {
    const botGuild = guilds.find(g => g.id.toString() === managedGuild.id);
    return { ...managedGuild, botInstalled: !!botGuild };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#7B1E3C]/30 border-t-[#7B1E3C] rounded-full animate-spin" />
          <p className={isDark ? "text-zinc-500" : "text-gray-500"}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-[#7B1E3C]/20 to-[#C4314B]/20 border border-[#7B1E3C]/30"
        >
          <h2 className={cn("text-2xl font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>{t('dashboard.welcome')}, {user.username}!</h2>
          <p className={isDark ? "text-zinc-400" : "text-gray-600"}>
            {t('dashboard.accessInfo').replace('{count}', managedGuilds.length.toString())}
          </p>
        </motion.div>
      )}

      {/* Connection Status */}
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center gap-3"
        >
          <WifiOff className="w-5 h-5 text-rose-400" />
          <span className="text-rose-400">{error}</span>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3"
        >
          <Wifi className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{t('dashboard.botStatus.connected')}</span>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('dashboard.stats.yourServers')}
          value={managedGuilds.length}
          icon={Crown}
          color="yellow"
          isDark={isDark}
        />
        <StatsCard
          title={t('dashboard.stats.botServers')}
          value={status?.guilds || 0}
          icon={Server}
          color="purple"
          isDark={isDark}
        />
        <StatsCard
          title={t('dashboard.stats.voiceConnections')}
          value={status?.voice_connections || 0}
          icon={Headphones}
          color="green"
          isDark={isDark}
        />
        <StatsCard
          title={t('dashboard.stats.uptime')}
          value={formatUptime(status?.uptime || 0)}
          icon={Clock}
          color="cyan"
          isDark={isDark}
        />
      </div>

      {/* User's Managed Servers */}
      {managedGuilds.length > 0 && (
        <div className="space-y-4">
          <h3 className={cn(
            "text-lg font-semibold flex items-center gap-2",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <Shield className="w-5 h-5 text-[#7B1E3C]" />
            {t('dashboard.managedServers')}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {managedGuilds.map((guild) => {
              const { botInstalled } = getServerWithBotStatus(guild);
              return (
                <ManagedServerCard
                  key={guild.id}
                  guild={guild}
                  botInstalled={botInstalled}
                  isDark={isDark}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* System Health */}
      <SystemHealth health={health} t={t} isDark={isDark} />

      {/* Bot Active Servers and Top Tracks */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className={cn(
            "text-lg font-semibold flex items-center gap-2",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <Bot className="w-5 h-5 text-cyan-400" />
            Active Bot Servers
          </h3>
          <div className="space-y-3">
            {guilds.slice(0, 5).map((guild) => (
              <BotGuildCard
                key={guild.id}
                guild={guild}
                onControl={(action) => handleControl(guild.id, action)}
                isDark={isDark}
              />
            ))}
            {guilds.length === 0 && (
              <div className={cn(
                "text-center py-8",
                isDark ? "text-zinc-500" : "text-gray-500"
              )}>
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No servers connected</p>
                <p className="text-sm mt-1">Add the bot to a server to get started</p>
              </div>
            )}
          </div>
        </div>

        <TopTracks activity={activity} isDark={isDark} />
      </div>
    </div>
  );
}
