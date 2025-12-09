"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Calendar,
  Music,
  Clock,
  User,
  Filter,
  Download,
} from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface HistoryItem {
  id: number;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  played_at: string;
  played_by: string;
  guild_name: string;
}

// Mock data for demonstration
const mockHistory: HistoryItem[] = [
  { id: 1, title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: 200, played_at: "2024-12-08 14:30:00", played_by: "User123", guild_name: "Music Server" },
  { id: 2, title: "Starboy", artist: "The Weeknd", album: "Starboy", duration: 230, played_at: "2024-12-08 14:25:00", played_by: "User456", guild_name: "Chill Zone" },
  { id: 3, title: "Shape of You", artist: "Ed Sheeran", album: "÷", duration: 233, played_at: "2024-12-08 14:20:00", played_by: "User123", guild_name: "Music Server" },
  { id: 4, title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", duration: 354, played_at: "2024-12-08 14:15:00", played_by: "User789", guild_name: "Rock Classics" },
  { id: 5, title: "Dance Monkey", artist: "Tones and I", duration: 210, played_at: "2024-12-08 14:10:00", played_by: "User456", guild_name: "Chill Zone" },
  { id: 6, title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", duration: 174, played_at: "2024-12-08 14:05:00", played_by: "User123", guild_name: "Music Server" },
  { id: 7, title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: 203, played_at: "2024-12-08 14:00:00", played_by: "User789", guild_name: "Pop Hits" },
  { id: 8, title: "Bad Guy", artist: "Billie Eilish", duration: 194, played_at: "2024-12-08 13:55:00", played_by: "User456", guild_name: "Music Server" },
];

function HistoryRow({ item, isDark }: { item: HistoryItem; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-colors",
        isDark
          ? "bg-zinc-900/50 hover:bg-zinc-900"
          : "bg-gray-100/50 hover:bg-gray-100"
      )}
    >
      {/* Artwork placeholder */}
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7B1E3C]/20 to-[#C4314B]/20 flex items-center justify-center shrink-0">
        <Music className="w-6 h-6 text-[#7B1E3C]" />
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", isDark ? "text-white" : "text-gray-900")}>{item.title}</p>
        <p className={cn("text-sm truncate", isDark ? "text-zinc-500" : "text-gray-500")}>{item.artist}</p>
      </div>

      {/* Duration */}
      <div className={cn(
        "hidden sm:flex items-center gap-2 text-sm w-20",
        isDark ? "text-zinc-500" : "text-gray-500"
      )}>
        <Clock className="w-4 h-4" />
        {formatDuration(item.duration)}
      </div>

      {/* Played by */}
      <div className={cn(
        "hidden md:flex items-center gap-2 text-sm w-28",
        isDark ? "text-zinc-500" : "text-gray-500"
      )}>
        <User className="w-4 h-4" />
        <span className="truncate">{item.played_by}</span>
      </div>

      {/* Guild */}
      <div className={cn(
        "hidden lg:block text-sm w-32 truncate",
        isDark ? "text-zinc-500" : "text-gray-500"
      )}>
        {item.guild_name}
      </div>

      {/* Time */}
      <div className={cn(
        "text-sm w-20 text-right",
        isDark ? "text-zinc-500" : "text-gray-500"
      )}>
        {new Date(item.played_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const { isDark, t } = useSettings();
  const [history, setHistory] = useState<HistoryItem[]>(mockHistory);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.artist.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const totalPlays = history.length;
  const totalDuration = history.reduce((sum, item) => sum + item.duration, 0);
  const uniqueArtists = new Set(history.map((item) => item.artist)).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn(
            "text-3xl font-bold flex items-center gap-3",
            isDark ? "text-white" : "text-gray-900"
          )}>
            <History className="w-8 h-8 text-cyan-400" />
            {t('history.title')}
          </h1>
          <p className={cn("mt-1", isDark ? "text-zinc-500" : "text-gray-500")}>
            {t('history.subtitle')}
          </p>
        </div>

        <button className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
          isDark
            ? "bg-zinc-800 hover:bg-zinc-700"
            : "bg-gray-200 hover:bg-gray-300"
        )}>
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Total Plays</p>
          <p className="text-2xl font-bold text-[#7B1E3C]">{totalPlays}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Total Duration</p>
          <p className="text-2xl font-bold text-cyan-400">{formatDuration(totalDuration)}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Unique Artists</p>
          <p className="text-2xl font-bold text-green-400">{uniqueArtists}</p>
        </div>
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Today</p>
          <p className="text-2xl font-bold text-yellow-400">{totalPlays}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5",
            isDark ? "text-zinc-500" : "text-gray-400"
          )} />
          <input
            type="text"
            placeholder="Search tracks or artists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-colors",
              isDark
                ? "bg-zinc-900 border-zinc-800 focus:border-[#7B1E3C] text-white placeholder:text-zinc-500"
                : "bg-white border-gray-200 focus:border-[#7B1E3C] text-gray-900 placeholder:text-gray-400"
            )}
          />
        </div>

        <div className="flex gap-2">
          <button className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors",
            isDark
              ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              : "bg-white border-gray-200 hover:border-gray-300"
          )}>
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Today</span>
          </button>
          <button className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors",
            isDark
              ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              : "bg-white border-gray-200 hover:border-gray-300"
          )}>
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-4 px-4 py-2 text-sm font-medium",
          isDark ? "text-zinc-500" : "text-gray-500"
        )}>
          <div className="w-12" />
          <div className="flex-1">Track</div>
          <div className="hidden sm:block w-20">Duration</div>
          <div className="hidden md:block w-28">Played By</div>
          <div className="hidden lg:block w-32">Server</div>
          <div className="w-20 text-right">Time</div>
        </div>

        {/* Items */}
        {filteredHistory.map((item) => (
          <HistoryRow key={item.id} item={item} isDark={isDark} />
        ))}

        {filteredHistory.length === 0 && (
          <div className="text-center py-16">
            <History className={cn(
              "w-16 h-16 mx-auto mb-4",
              isDark ? "text-zinc-700" : "text-gray-300"
            )} />
            <p className={cn("text-xl", isDark ? "text-zinc-500" : "text-gray-500")}>
              {t('history.noHistory')}
            </p>
            <p className={cn("mt-2", isDark ? "text-zinc-600" : "text-gray-400")}>
              {search ? "Try a different search term" : "Play history will appear here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
