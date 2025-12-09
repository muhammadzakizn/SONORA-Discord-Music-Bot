import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      // Spotify album art
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      // Apple Music album art
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is2-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is3-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is4-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is5-ssl.mzstatic.com',
      },
      // YouTube thumbnails
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  
  // API rewrites to Python bot backend
  // Works in both development and production server deployment
  // Disabled on Vercel (process.env.VERCEL is set)
  async rewrites() {
    // On Vercel, don't rewrite (can't reach localhost)
    if (process.env.VERCEL === '1') {
      return [];
    }
    
    // Bot API URL - configurable via environment
    const botApiUrl = process.env.BOT_API_URL || 'http://localhost:5000';
    
    return [
      {
        source: '/api/bot/:path*',
        destination: `${botApiUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${botApiUrl}/socket.io/:path*`,
      },
    ];
  },
  
  // Additional security headers (complementing middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Service Worker should not be cached
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Manifest should be served with correct MIME type
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
