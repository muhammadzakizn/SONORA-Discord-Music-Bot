"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Settings,
  Server,
  Volume2,
  Bell,
  Globe,
  ChevronRight,
  Crown,
  Shield,
  Check,
  ExternalLink,
  Music2,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, getServerIconUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";

// Types for history summary
interface HistorySummary {
  total_tracks: number;
  total_duration: number;
  unique_months: number;
  first_play: string | null;
  last_play: string | null;
}

interface HistoryMonth {
  year: number;
  month: number;
  track_count: number;
}

// Format duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Listening History Section Component
function ListeningHistorySection({
  isDark,
  userId
}: {
  isDark: boolean;
  userId?: string;
}) {
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [months, setMonths] = useState<HistoryMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'month' | 'year' | 'all';
    year?: number;
    month?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch summary and months
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [summaryRes, monthsRes] = await Promise.all([
          fetch(`/api/bot/history/summary?user_id=${userId}`),
          fetch(`/api/bot/history/months?user_id=${userId}`)
        ]);

        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        }
        if (monthsRes.ok) {
          const data = await monthsRes.json();
          setMonths(data.months || []);
        }
      } catch (err) {
        console.error("Failed to fetch history data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Delete handler
  const handleDelete = async () => {
    if (!showDeleteConfirm || !userId) return;

    setIsDeleting(true);
    try {
      let url = '';
      if (showDeleteConfirm.type === 'month') {
        url = `/api/bot/history/delete-month?user_id=${userId}&year=${showDeleteConfirm.year}&month=${showDeleteConfirm.month}`;
      } else if (showDeleteConfirm.type === 'year') {
        url = `/api/bot/history/delete-year?user_id=${userId}&year=${showDeleteConfirm.year}`;
      }

      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        // Refresh data
        const [summaryRes, monthsRes] = await Promise.all([
          fetch(`/api/bot/history/summary?user_id=${userId}`),
          fetch(`/api/bot/history/months?user_id=${userId}`)
        ]);
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (monthsRes.ok) {
          const data = await monthsRes.json();
          setMonths(data.months || []);
        }
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  // Get unique years
  const years = [...new Set(months.map(m => m.year))].sort((a, b) => b - a);

  const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  if (!userId) return null;

  return (
    <div className={cn(
      "p-6 rounded-2xl border",
      isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-3 rounded-xl",
          isDark ? "bg-zinc-800" : "bg-gray-100"
        )}>
          <Music2 className="w-5 h-5 text-[#C4314B]" />
        </div>
        <div>
          <h3 className={cn("font-semibold text-lg", isDark ? "text-white" : "text-gray-900")}>
            Listening History
          </h3>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
            Manage your playback history data
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className={cn(
          "py-8 text-center",
          isDark ? "text-zinc-500" : "text-gray-400"
        )}>
          Loading...
        </div>
      ) : !summary || summary.total_tracks === 0 ? (
        <div className={cn(
          "py-8 text-center",
          isDark ? "text-zinc-500" : "text-gray-400"
        )}>
          <Music2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No listening history yet</p>
          <p className="text-sm mt-1">Play some music to see your stats!</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className={cn(
            "grid grid-cols-3 gap-4 p-4 rounded-xl mb-4",
            isDark ? "bg-zinc-800" : "bg-gray-100"
          )}>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                {summary.total_tracks}
              </p>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                Tracks
              </p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                {formatDuration(summary.total_duration)}
              </p>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                Time
              </p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                {summary.unique_months}
              </p>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                Months
              </p>
            </div>
          </div>

          {/* Delete by Month/Year */}
          {years.length > 0 && (
            <div className="space-y-3">
              <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-gray-600")}>
                Delete History:
              </p>

              {years.slice(0, 2).map(year => {
                const yearMonths = months.filter(m => m.year === year);
                return (
                  <div key={year} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        {year}
                      </span>
                      <button
                        onClick={() => setShowDeleteConfirm({ type: 'year', year })}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg flex items-center gap-1",
                          isDark
                            ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            : "bg-rose-100 text-rose-600 hover:bg-rose-200"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Year
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {yearMonths.map(m => (
                        <button
                          key={`${m.year}-${m.month}`}
                          onClick={() => setShowDeleteConfirm({
                            type: 'month',
                            year: m.year,
                            month: m.month
                          })}
                          className={cn(
                            "px-2 py-1 rounded text-xs flex items-center gap-1",
                            isDark
                              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {MONTH_NAMES[m.month - 1]}
                          <span className="opacity-50">({m.track_count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Auto-cleanup notice */}
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-start gap-2",
            isDark ? "bg-amber-500/10" : "bg-amber-50"
          )}>
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className={cn("text-xs", isDark ? "text-amber-400" : "text-amber-700")}>
              History older than 1 year is automatically deleted on January 1st.
            </p>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-6 rounded-2xl max-w-sm w-full mx-4",
              isDark ? "bg-zinc-900" : "bg-white"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-rose-500/20">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h4 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
                Confirm Delete
              </h4>
            </div>
            <p className={cn("text-sm mb-4", isDark ? "text-zinc-400" : "text-gray-600")}>
              {showDeleteConfirm.type === 'month'
                ? `Delete all history from ${MONTH_NAMES[(showDeleteConfirm.month || 1) - 1]} ${showDeleteConfirm.year}?`
                : `Delete all history from ${showDeleteConfirm.year}?`}
              <br />
              <strong>This action cannot be undone.</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                className={cn(
                  "flex-1 py-2 rounded-lg",
                  isDark ? "bg-zinc-800 text-white" : "bg-gray-100 text-gray-900"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
  isDark,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  isDark: boolean;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-4">
      <div>
        <span className={cn("block font-medium", isDark ? "text-white" : "text-gray-900")}>{label}</span>
        {description && (
          <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>{description}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4",
          enabled ? "bg-[#7B1E3C]" : isDark ? "bg-zinc-700" : "bg-gray-300"
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

export default function SettingsPage() {
  const { user, managedGuilds } = useSession();
  const { isDark, t } = useSettings();

  // User preferences state
  const [preferences, setPreferences] = useState({
    // Notifications
    dmNotifications: true,
    trackAnnouncements: true,
    queueUpdates: false,

    // Dashboard
    compactView: false,
    autoRefresh: true,
  });

  // Get servers where bot is installed (has bot)
  const serversWithBot = managedGuilds?.filter(g => {
    // In real implementation, check if bot is in server
    return true; // Placeholder
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={cn(
          "text-3xl font-bold flex items-center gap-3",
          isDark ? "text-white" : "text-gray-900"
        )}>
          <Settings className="w-8 h-8 text-[#7B1E3C]" />
          {t('adminSettings.title')}
        </h1>
        <p className={cn("mt-1", isDark ? "text-zinc-500" : "text-gray-500")}>
          {t('adminSettings.subtitle')}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notification Preferences */}
          <div className={cn(
            "p-6 rounded-2xl border",
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "p-3 rounded-xl",
                isDark ? "bg-zinc-800" : "bg-gray-100"
              )}>
                <Bell className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className={cn("font-semibold text-lg", isDark ? "text-white" : "text-gray-900")}>
                  {t('adminSettings.notifications')}
                </h3>
                <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
                  {t('adminSettings.notificationsDesc')}
                </p>
              </div>
            </div>
            <div className={cn(
              "divide-y",
              isDark ? "divide-zinc-800" : "divide-gray-200"
            )}>
              <Toggle
                enabled={preferences.dmNotifications}
                onChange={(v) => setPreferences({ ...preferences, dmNotifications: v })}
                label={t('adminSettings.dmNotifications')}
                description={t('adminSettings.dmNotificationsDesc')}
                isDark={isDark}
              />
              <Toggle
                enabled={preferences.trackAnnouncements}
                onChange={(v) => setPreferences({ ...preferences, trackAnnouncements: v })}
                label={t('adminSettings.trackAnnouncements')}
                description={t('adminSettings.trackAnnouncementsDesc')}
                isDark={isDark}
              />
              <Toggle
                enabled={preferences.queueUpdates}
                onChange={(v) => setPreferences({ ...preferences, queueUpdates: v })}
                label={t('adminSettings.queueUpdates')}
                description={t('adminSettings.queueUpdatesDesc')}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Dashboard Preferences */}
          <div className={cn(
            "p-6 rounded-2xl border",
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "p-3 rounded-xl",
                isDark ? "bg-zinc-800" : "bg-gray-100"
              )}>
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className={cn("font-semibold text-lg", isDark ? "text-white" : "text-gray-900")}>
                  {t('adminSettings.dashboardPrefs')}
                </h3>
                <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
                  {t('adminSettings.dashboardPrefsDesc')}
                </p>
              </div>
            </div>
            <div className={cn(
              "divide-y",
              isDark ? "divide-zinc-800" : "divide-gray-200"
            )}>
              <Toggle
                enabled={preferences.compactView}
                onChange={(v) => setPreferences({ ...preferences, compactView: v })}
                label={t('adminSettings.compactView')}
                description={t('adminSettings.compactViewDesc')}
                isDark={isDark}
              />
              <Toggle
                enabled={preferences.autoRefresh}
                onChange={(v) => setPreferences({ ...preferences, autoRefresh: v })}
                label={t('adminSettings.autoRefresh')}
                description={t('adminSettings.autoRefreshDesc')}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Listening History */}
          <ListeningHistorySection isDark={isDark} userId={user?.id} />

          {/* Info */}
          <div className="p-4 rounded-xl bg-[#7B1E3C]/10 border border-[#7B1E3C]/30">
            <p className={cn("text-sm", isDark ? "text-[#C4314B]" : "text-[#7B1E3C]")}>
              <strong>💡 {t('adminSettings.tip')}:</strong> {t('adminSettings.tipText')}
            </p>
          </div>
        </div>

        {/* Right Column - Your Servers */}
        <div className="space-y-6">
          <div className={cn(
            "p-6 rounded-2xl border",
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "p-3 rounded-xl",
                isDark ? "bg-zinc-800" : "bg-gray-100"
              )}>
                <Server className="w-5 h-5 text-[#7B1E3C]" />
              </div>
              <div>
                <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
                  {t('adminSettings.yourServers')}
                </h3>
                <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
                  {serversWithBot.length} {t('adminSettings.serversWithBot')}
                </p>
              </div>
            </div>

            {serversWithBot.length > 0 ? (
              <div className="space-y-2">
                {serversWithBot.slice(0, 5).map((server) => (
                  <Link
                    key={server.id}
                    href={`/admin/guilds/${server.id}/settings`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors group",
                      isDark
                        ? "bg-zinc-800/50 hover:bg-zinc-800"
                        : "bg-gray-100/50 hover:bg-gray-100"
                    )}
                  >
                    {server.icon ? (
                      <Image
                        src={getServerIconUrl(server) || ""}
                        alt={server.name}
                        width={36}
                        height={36}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7B1E3C]/20 to-[#C4314B]/20 flex items-center justify-center">
                        <Server className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-gray-400")} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate text-sm", isDark ? "text-white" : "text-gray-900")}>
                        {server.name}
                      </p>
                      <p className={cn("text-xs flex items-center gap-1", isDark ? "text-zinc-500" : "text-gray-500")}>
                        {server.owner ? (
                          <><Crown className="w-3 h-3 text-yellow-400" /> Owner</>
                        ) : (
                          <><Shield className="w-3 h-3 text-[#7B1E3C]" /> Admin</>
                        )}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-colors",
                      isDark
                        ? "text-zinc-500 group-hover:text-white"
                        : "text-gray-400 group-hover:text-gray-900"
                    )} />
                  </Link>
                ))}

                {serversWithBot.length > 5 && (
                  <Link
                    href="/admin/guilds"
                    className="block text-center text-sm text-[#7B1E3C] hover:text-[#C4314B] py-2"
                  >
                    {t('adminSettings.viewAllServers').replace('{count}', serversWithBot.length.toString())} →
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Server className={cn("w-10 h-10 mx-auto mb-2", isDark ? "text-zinc-700" : "text-gray-300")} />
                <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
                  {t('adminSettings.noServersWithBot')}
                </p>
                <a
                  href="https://discord.com/oauth2/authorize?client_id=1443855259536461928&permissions=2534224044489536&scope=bot+applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm text-[#7B1E3C] hover:text-[#C4314B]"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('adminSettings.addToServer')}
                </a>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={cn(
            "p-6 rounded-2xl border",
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
          )}>
            <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
              {t('adminSettings.quickActions')}
            </h3>
            <div className="space-y-2">
              <Link
                href="/admin/profile"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors",
                  isDark
                    ? "bg-zinc-800/50 hover:bg-zinc-800"
                    : "bg-gray-100/50 hover:bg-gray-100"
                )}
              >
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                  {t('adminSettings.editProfile')}
                </span>
              </Link>
              <Link
                href="/admin/guilds"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors",
                  isDark
                    ? "bg-zinc-800/50 hover:bg-zinc-800"
                    : "bg-gray-100/50 hover:bg-gray-100"
                )}
              >
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                </div>
                <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                  {t('adminSettings.manageServers')}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
