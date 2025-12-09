"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, getServerIconUrl } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";

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
