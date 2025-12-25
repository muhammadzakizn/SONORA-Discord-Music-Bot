/**
 * Version and Changelog Constants for SONORA Web Dashboard
 */

export const WEB_VERSION = "3.29.0";
export const BOT_VERSION = "3.25.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  changes: {
    category: string;
    items: string[];
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.29.0",
    date: "2025-12-26",
    title: "Official Domain URLs",
    highlights: [
      "Semua shortlinks diganti ke domain resmi",
      "Link support sekarang ke sonora.muhammadzakizn.com/support",
      "Link docs sekarang ke sonora.muhammadzakizn.com/docs",
      "Link status sekarang ke sonora.muhammadzakizn.com/status"
    ],
    changes: [
      {
        category: "Link Updates",
        items: [
          "s.id/SONORAbot → sonora.muhammadzakizn.com",
          "bit.ly/SONORAbotSTATUS → sonora.muhammadzakizn.com/status",
          "s.id/SONORAbotSUPPORT → sonora.muhammadzakizn.com/support",
          "s.id/SONORAbotDOCS → sonora.muhammadzakizn.com/docs",
          "s.id/SONORAbotPRIVACY → sonora.muhammadzakizn.com/privacy",
          "s.id/SONORAbotTERMS → sonora.muhammadzakizn.com/terms"
        ]
      },
      {
        category: "Files Updated",
        items: [
          "Bot: commands/info.py, commands/donate.py, core/bot.py",
          "UI: ui/welcome.py, ui/menu_view.py, ui/media_player.py",
          "Web: web/api/app.py, terms/page.tsx, bans/page.tsx",
          "Docs: sonora_spec.md, changelog files"
        ]
      }
    ]
  },
  {
    version: "3.28.0",
    date: "2025-12-23",
    title: "Top 10 Tracks Feature",
    highlights: [
      "Monthly Top 10 tracks carousel on Dashboard",
      "Listening history management in Settings",
      "Album artwork display with rank badges",
      "Privacy-compliant annual auto-cleanup"
    ],
    changes: [
      {
        category: "New Components",
        items: [
          "TopTracksCarousel with shimmer loading",
          "Month/Year navigation selector",
          "ListeningHistorySection in Settings"
        ]
      },
      {
        category: "Database & API",
        items: [
          "artwork_url column in play_history",
          "Monthly/yearly top tracks APIs",
          "History management delete endpoints"
        ]
      }
    ]
  },
  {
    version: "3.27.0",
    date: "2025-12-23",
    title: "Dynamic Time-Based Welcome Message",
    highlights: [
      "Personalized greetings based on local time",
      "Animated SVG illustrations for each time period",
      "5 time periods: Morning, Afternoon, Evening, Night, Midnight",
      "Random greeting messages for variety"
    ],
    changes: [
      {
        category: "New Components",
        items: [
          "TimeBasedGreeting component with animated illustrations",
          "Morning: Rising sun with floating clouds",
          "Afternoon: Bright sun with radiating rays",
          "Evening: Sunset with flying birds",
          "Night: Crescent moon with twinkling stars",
          "Midnight: Full moon with shooting star animation"
        ]
      },
      {
        category: "Admin Dashboard",
        items: [
          "Replaced static welcome message with dynamic TimeBasedGreeting",
          "Greeting updates based on user's local device time",
          "SSR-safe with hydration handling"
        ]
      }
    ]
  },
  {
    version: "3.26.0",
    date: "2025-12-22",
    title: "Apple Music Liquid Glass Navigation",
    highlights: [
      "Sliding active indicator dengan animasi spring",
      "Background 20% lebih transparan",
      "Bentuk kapsul lebih compact",
      "Responsive indicator sizing"
    ],
    changes: [
      {
        category: "UI Improvements",
        items: [
          "NavLiquidGlass sliding indicator untuk nav item aktif",
          "Transparansi ditingkatkan (bg-white/8)",
          "Tinggi nav dikurangi 10%",
          "Border radius lebih besar untuk bentuk kapsul"
        ]
      }
    ]
  },
  {
    version: "3.8.0",
    date: "2025-12-17",
    title: "Storage Optimization - Auto-Delete Audio",
    highlights: [
      "Semua file audio langsung dihapus setelah diputar",
      "Hemat storage hingga 90%",
      "Cocok untuk VPS/Pterodactyl dengan disk terbatas",
      "FTP cache tetap menyimpan untuk penggunaan ulang"
    ],
    changes: [
      {
        category: "Storage Optimization",
        items: [
          "Auto-delete ALL audio files after playback (bukan hanya >100MB)",
          "File dari FTP cache: diunduh, diputar, lalu dihapus dari local",
          "File download sementara langsung dihapus",
          "Log lebih detail menampilkan ukuran file yang dihapus"
        ]
      },
      {
        category: "Files Modified",
        items: [
          "ui/media_player.py - _cleanup_audio_file() always deletes",
          "services/audio/download_manager.py - _cleanup_old_tracks() always deletes",
          "services/audio/playlist_cache.py - _cleanup_track() with size logging"
        ]
      }
    ]
  },
  {
    version: "3.7.0",
    date: "2025-12-13",
    title: "Multi-Factor Authentication",
    highlights: [
      "Passkey (WebAuthn) biometric authentication",
      "TOTP Authenticator App support",
      "OTP via Discord DM or Email",
      "Bank-level security"
    ],
    changes: [
      {
        category: "Authentication Methods",
        items: [
          "Passkey (WebAuthn) - fingerprint/Face ID default",
          "TOTP Authenticator - Google Authenticator, Authy",
          "OTP via Discord DM - existing method",
          "OTP via Email - new method"
        ]
      },
      {
        category: "API Endpoints",
        items: [
          "Passkey registration (register + complete)",
          "Passkey authentication (authenticate + complete)",
          "TOTP setup with QR code generation",
          "TOTP verification"
        ]
      },
      {
        category: "Security",
        items: [
          "Challenge-response authentication",
          "Rate limiting on OTP requests",
          "@simplewebauthn integration",
          "otplib TOTP implementation"
        ]
      }
    ]
  },
  {
    version: "3.6.0",
    date: "2025-12-13",
    title: "Maintenance, Bans & Support System",
    highlights: [
      "Maintenance Mode with progress tracking",
      "User & Server Ban Management",
      "Support Dashboard for Admin",
      "Phase 3-6 Complete"
    ],
    changes: [
      {
        category: "Maintenance System",
        items: [
          "Maintenance Mode page with progress stages",
          "Real-time progress percentage slider",
          "Maintenance history log",
          "Status Page integration"
        ]
      },
      {
        category: "Ban Management",
        items: [
          "User ban with reason and duration",
          "Server ban with auto-leave on reinvite",
          "Ban list with search and filter",
          "Unban/Reban functionality"
        ]
      },
      {
        category: "Admin Support Dashboard",
        items: [
          "Support ticket management",
          "Status change workflow",
          "Reply to tickets from dashboard",
          "Ticket statistics overview"
        ]
      }
    ]
  },
  {

    version: "3.5.0",
    date: "2025-12-13",
    title: "Developer Dashboard Major Upgrade",
    highlights: [
      "Complete Developer Dashboard redesign with Admin-style UI",
      "Real-time System Monitoring with CPU, Memory, Disk metrics",
      "Bot Controls: Shutdown, Restart, Pause/Resume, Maintenance Mode",
      "Server & User Management pages"
    ],
    changes: [
      {
        category: "Developer Dashboard",
        items: [
          "New Dashboard overview with system stats and quick actions",
          "Redesigned layout matching Admin Dashboard style",
          "Real-time Console page with log filtering and export",
          "System Monitoring page with live metrics and component status",
          "Bot Controls page with shutdown, restart, maintenance mode",
          "Server Management page with search and status display",
          "Broadcast Messaging page with preview and history",
          "User Management page with ban/unban functionality"
        ]
      },
      {
        category: "Backend API",
        items: [
          "New /api/developer/stats endpoint for system metrics",
          "CPU, Memory, Disk usage monitoring",
          "Bot statistics: servers, voice connections, users"
        ]
      },
      {
        category: "UI/UX Improvements",
        items: [
          "Liquid Glass sidebar design",
          "Dark/Light mode support on all pages",
          "Responsive layout for mobile devices",
          "Smooth animations and transitions"
        ]
      }
    ]
  },
  {
    version: "3.4.0",
    date: "2025-12-12",
    title: "Dashboard Controls & Donate Features",
    highlights: [
      "Full dashboard control integration with Discord bot",
      "Donate, Website, Help commands and menu options",
      "Auto-disconnect after queue empty",
      "CSP fixes for CDN images"
    ],
    changes: [
      {
        category: "New Features",
        items: [
          "Added /donate, /website, /help slash commands",
          "Added Donate, Website, Help options to Menu Kontrol",
          "Auto-disconnect after 5 seconds when queue empty",
          "Vote & Rate button with Top.gg link",
          "Queue remove/move notifications from dashboard"
        ]
      },
      {
        category: "Dashboard Improvements",
        items: [
          "Stop action now clears queue and disconnects (like /stop)",
          "Fixed Content Security Policy for external images",
          "Service Worker now skips external URLs",
          "Dashboard correctly shows idle state when not playing",
          "Server icon fallback for broken images"
        ]
      },
      {
        category: "Bug Fixes",
        items: [
          "Fixed notification sending to player message channel",
          "Fixed progress bar sync issues",
          "Fixed 403 Forbidden errors for dashboard notifications"
        ]
      }
    ]
  },
  {
    version: "3.3.0",
    date: "2025-12-11",
    title: "YouTube Music & Track Verification",
    highlights: [
      "Force YouTube Music downloads for better audio",
      "Track verification with fuzzy matching",
      "Cookie support for all platforms"
    ],
    changes: [
      {
        category: "Audio Quality",
        items: [
          "All Spotify/YouTube Music tracks now download from music.youtube.com",
          "Track verification with metadata matching",
          "3-attempt retry logic for failed downloads"
        ]
      },
      {
        category: "Improvements",
        items: [
          "Cookie integration for Spotify, Apple Music, YouTube",
          "Improved download reliability",
          "Better error messages"
        ]
      }
    ]
  },
  {
    version: "3.2.0",
    date: "2025-12-10",
    title: "Media Player Embed Cleanup",
    highlights: [
      "Cleaner now playing embed",
      "Fixed Requested by attribution",
      "Removed unnecessary fields"
    ],
    changes: [
      {
        category: "UI Improvements",
        items: [
          "Removed music emoji from NOW PLAYING title",
          "Removed album name and source from embed",
          "Added spacing for live lyrics",
          "Requested by now shows clickable mention"
        ]
      }
    ]
  },
  {
    version: "3.1.0",
    date: "2025-12-09",
    title: "Dashboard Integration",
    highlights: [
      "Full Next.js dashboard integration",
      "Real-time console and controls",
      "Liquid Glass UI design"
    ],
    changes: [
      {
        category: "Dashboard",
        items: [
          "New Next.js dashboard replaces old Flask UI",
          "Real-time bot console",
          "Guild controls (pause, resume, skip, stop)",
          "Queue management from browser"
        ]
      },
      {
        category: "Design",
        items: [
          "Liquid Glass UI standard",
          "Dark/Light mode support",
          "Responsive design for all devices"
        ]
      }
    ]
  },
  {
    version: "3.0.0",
    date: "2025-12-08",
    title: "Initial Dashboard Release",
    highlights: [
      "Web dashboard for bot management",
      "Discord OAuth login",
      "Multi-server support"
    ],
    changes: [
      {
        category: "Core Features",
        items: [
          "Web-based admin dashboard",
          "Discord OAuth2 authentication",
          "Multi-guild management",
          "System health monitoring"
        ]
      }
    ]
  }
];

// Get latest version
export const getLatestVersion = () => CHANGELOG[0].version;

// Check if version is latest
export const isLatestVersion = (version: string) => version === getLatestVersion();

// Get changelog for specific version
export const getVersionChangelog = (version: string) => 
  CHANGELOG.find(c => c.version === version);
