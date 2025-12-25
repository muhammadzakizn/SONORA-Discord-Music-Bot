import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { BotStatusProvider } from "@/contexts/BotStatusProvider";
import { UpdateProvider } from "@/contexts/UpdateContext";
import { FullscreenLyricsProvider } from "@/contexts/FullscreenLyricsContext";
import NavLiquidGlass from "@/components/NavLiquidGlass";
import PageTransition from "@/components/PageTransition";
import BotStatusBanner from "@/components/BotStatusBanner";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#6a1b3d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "SONORA - Discord Music Bot",
  description: "High-quality Discord music bot with Spotify, Apple Music, and YouTube support. Stream music in crystal-clear quality.",
  keywords: ["Discord", "Music Bot", "Spotify", "YouTube", "Apple Music", "SONORA"],
  authors: [{ name: "SONORA Bot Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SONORA",
  },
  openGraph: {
    title: "SONORA - Discord Music Bot",
    description: "High-quality Discord music bot with multi-source support",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/opendyslexic"
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var settings = JSON.parse(localStorage.getItem('sonora-settings') || '{}');
                  var theme = settings.theme || 'dark';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  document.documentElement.classList.add(isDark ? 'dark' : 'light');
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        {/* Register Service Worker for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker registered:', registration.scope);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New content available, show update notification
                              if (window.showPWAUpdateNotification) {
                                window.showPWAUpdateNotification();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(error) {
                      console.log('[PWA] Service Worker registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SettingsProvider>
          <SessionProvider>
            <UpdateProvider>
              <BotStatusProvider>
                <FullscreenLyricsProvider>
                  {/* Bot offline banner */}
                  <BotStatusBanner />

                  {/* Skip to main content link for accessibility */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg"
                  >
                    Skip to main content
                  </a>

                  <main id="main-content">
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </main>

                  <NavLiquidGlass />
                </FullscreenLyricsProvider>
              </BotStatusProvider>
            </UpdateProvider>
          </SessionProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
