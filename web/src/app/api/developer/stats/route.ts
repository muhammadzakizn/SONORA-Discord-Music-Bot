import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/developer/stats`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return mock data if Python API is not available
      return NextResponse.json({
        system: {
          cpu: 0,
          memory: 0,
          disk: 0,
          uptime: 'N/A',
          latency: 0,
          networkIn: 'N/A',
          networkOut: 'N/A',
        },
        bot: {
          online: false,
          voiceConnections: 0,
          totalServers: 0,
          activeUsers: 0,
          tracksPlayed: 0,
          commandsExecuted: 0,
        },
        components: [
          { name: 'Discord Bot', status: 'offline' },
          { name: 'Database', status: 'unknown' },
          { name: 'Web API', status: 'online' },
          { name: 'Voice Engine', status: 'unknown' },
          { name: 'Cache System', status: 'unknown' },
        ],
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch developer stats:', error);
    
    // Return fallback data if connection fails
    return NextResponse.json({
      system: {
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 'N/A',
        latency: 0,
        networkIn: 'N/A',
        networkOut: 'N/A',
      },
      bot: {
        online: false,
        voiceConnections: 0,
        totalServers: 0,
        activeUsers: 0,
        tracksPlayed: 0,
        commandsExecuted: 0,
      },
      components: [
        { name: 'Discord Bot', status: 'offline' },
        { name: 'Database', status: 'unknown' },
        { name: 'Web API', status: 'online' },
        { name: 'Voice Engine', status: 'unknown' },
        { name: 'Cache System', status: 'unknown' },
      ],
    });
  }
}
