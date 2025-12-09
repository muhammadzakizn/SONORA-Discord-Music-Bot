const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface BotStatus {
  status: string;
  guilds: number;
  users: number;
  voice_connections: number;
  playing: number;
  uptime: number;
  latency: number;
}

export interface Guild {
  id: number;
  name: string;
  icon: string | null;
  member_count: number;
  is_playing: boolean;
  current_track: TrackInfo | null;
}

export interface TrackInfo {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  current_time?: number;
  artwork_url?: string;
}

export interface HealthStatus {
  system: {
    cpu_percent: number;
    memory_mb: number;
    uptime_seconds: number;
  };
  bot: {
    latency_ms: number;
    guilds: number;
    users: number;
  };
  voice: {
    connected: number;
    playing: number;
  };
  database: {
    size_mb: number;
    status: string;
  };
  modules: {
    loaded: string[];
    count: number;
  };
}

export interface ActivityStats {
  period_days: number;
  total_plays: number;
  total_duration: number;
  top_users: Array<{
    username: string;
    user_id: number;
    plays: number;
    duration: number;
  }>;
  top_tracks: Array<{
    title: string;
    artist: string;
    plays: number;
  }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Bot Status
  async getStatus(): Promise<BotStatus> {
    return this.fetch<BotStatus>('/api/status');
  }

  // Guilds
  async getGuilds(): Promise<Guild[]> {
    return this.fetch<Guild[]>('/api/guilds');
  }

  async getGuild(guildId: number): Promise<Guild> {
    return this.fetch<Guild>(`/api/guild/${guildId}`);
  }

  // Admin
  async getHealth(): Promise<HealthStatus> {
    return this.fetch<HealthStatus>('/api/admin/health');
  }

  async getActivity(days: number = 7): Promise<ActivityStats> {
    return this.fetch<ActivityStats>(`/api/admin/activity?days=${days}`);
  }

  async getCache(): Promise<{
    downloads: { count: number; size_mb: number; recent: Array<{ name: string; size_mb: number }> };
    cache: { count: number; size_mb: number };
  }> {
    return this.fetch('/api/admin/cache');
  }

  // Controls
  async control(guildId: number, action: 'pause' | 'resume' | 'skip' | 'stop'): Promise<{ status: string }> {
    return this.fetch(`/api/control/${guildId}/${action}`, {
      method: 'POST',
    });
  }

  // Admin Actions
  async shutdownBot(): Promise<{ status: string }> {
    return this.fetch('/api/admin/shutdown', {
      method: 'POST',
    });
  }

  async clearCache(): Promise<{ status: string; cleared: number }> {
    return this.fetch('/api/admin/cache/clear', {
      method: 'POST',
    });
  }

  async broadcast(message: string, options: {
    guild_ids?: string[];
    channel_ids?: string[];
    all_channels?: boolean;
    mention_type?: 'none' | 'everyone' | 'here';
  }): Promise<{ success: boolean; sent: number; failed: number }> {
    return this.fetch('/api/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message, ...options }),
    });
  }

  // Logs
  async getLogs(type: 'all' | 'error' | 'warning' | 'info' = 'all', lines: number = 100): Promise<{
    logs: Array<{ timestamp: string; level: string; message: string; file?: string }>;
    total: number;
  }> {
    return this.fetch(`/api/admin/logs?type=${type}&lines=${lines}`);
  }

  // Guilds with Channels (for broadcast)
  async getGuildsWithChannels(): Promise<Array<{
    id: string;
    name: string;
    icon: string | null;
    channels: Array<{ id: string; name: string; type: string }>;
  }>> {
    return this.fetch('/api/admin/guilds/channels');
  }
}

export const api = new ApiClient();

