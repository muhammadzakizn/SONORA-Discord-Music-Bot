/**
 * SONORA WebSocket Client
 * Real-time connection to Flask-SocketIO backend
 */

import { io, Socket } from 'socket.io-client';

type StatusUpdate = {
  guilds: number;
  voice_connections: number;
  playing: number;
  timestamp: number;
};

type GuildUpdate = {
  is_playing: boolean;
  is_paused: boolean;
  current_time: number;
  timestamp: number;
};

type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  module?: string;
};

class SocketClient {
  private socket: Socket | null = null;
  private statusListeners: Set<(data: StatusUpdate) => void> = new Set();
  private guildListeners: Map<string, Set<(data: GuildUpdate) => void>> = new Map();
  private logListeners: Set<(log: LogEntry) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  connect() {
    if (this.socket?.connected) return;

    // Socket.IO is disabled in production (Vercel cannot proxy WebSocket to Flask)
    // Only enable in development mode
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      console.log('[Socket] Disabled in production - using REST API polling instead');
      return;
    }

    // Connect to Flask-SocketIO (development only)
    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      this.connectionListeners.forEach(cb => cb(true));
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from backend');
      this.connectionListeners.forEach(cb => cb(false));
    });

    this.socket.on('connected', (data) => {
      console.log('[Socket] Server acknowledged:', data);
    });

    this.socket.on('status_update', (data: StatusUpdate) => {
      this.statusListeners.forEach(cb => cb(data));
    });

    this.socket.on('log_entry', (log: LogEntry) => {
      this.logListeners.forEach(cb => cb(log));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Subscribe to connection status changes
  onConnection(callback: (connected: boolean) => void) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // Subscribe to bot status updates
  onStatusUpdate(callback: (data: StatusUpdate) => void) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  // Subscribe to guild-specific updates
  subscribeToGuild(guildId: string, callback: (data: GuildUpdate) => void) {
    if (!this.guildListeners.has(guildId)) {
      this.guildListeners.set(guildId, new Set());
      
      // Tell server we want updates for this guild
      this.socket?.emit('subscribe_guild', { guild_id: guildId });
      
      // Listen for updates
      this.socket?.on(`guild_update_${guildId}`, (data: GuildUpdate) => {
        this.guildListeners.get(guildId)?.forEach(cb => cb(data));
      });
    }
    
    this.guildListeners.get(guildId)!.add(callback);
    
    return () => {
      this.guildListeners.get(guildId)?.delete(callback);
    };
  }

  // Subscribe to log entries
  onLogEntry(callback: (log: LogEntry) => void) {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }
}

// Singleton instance
export const socketClient = new SocketClient();

// React hook for socket connection
export function useSocket() {
  return socketClient;
}
