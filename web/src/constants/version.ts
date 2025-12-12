/**
 * Version and Changelog Constants for SONORA Web Dashboard
 */

export const WEB_VERSION = "3.6.0";
export const BOT_VERSION = "3.6.0";

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
          "Status Page integration",
          "Completion dialog with summary"
        ]
      },
      {
        category: "Ban Management",
        items: [
          "User ban with reason and duration",
          "Server ban with auto-leave on reinvite",
          "Ban list with search and filter",
          "Unban/Reban functionality",
          "Ban statistics dashboard"
        ]
      },
      {
        category: "Admin Support Dashboard",
        items: [
          "Support ticket management",
          "Status change: Open, In Progress, Resolved, Closed",
          "Reply to tickets from dashboard",
          "Ticket statistics overview",
          "Filter and search tickets"
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
