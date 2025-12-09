-- Analytics tracking tables

-- Command usage tracking
CREATE TABLE IF NOT EXISTS command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    guild_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command_name);
CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);

-- Platform usage tracking
CREATE TABLE IF NOT EXISTS platform_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL, -- 'spotify', 'youtube', 'apple_music'
    track_title TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    guild_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_usage_platform ON platform_usage(platform);
CREATE INDEX IF NOT EXISTS idx_platform_usage_timestamp ON platform_usage(timestamp);

-- Play method tracking
CREATE TABLE IF NOT EXISTS play_method (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL, -- 'playlist', 'search', 'direct_url', 'album'
    track_title TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    guild_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_play_method_method ON play_method(method);
CREATE INDEX IF NOT EXISTS idx_play_method_timestamp ON play_method(timestamp);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    romanization_enabled BOOLEAN DEFAULT 1,
    translation_language TEXT DEFAULT NULL,
    theme TEXT DEFAULT 'dark', -- 'dark' or 'light'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Download history
CREATE TABLE IF NOT EXISTS download_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    track_title TEXT NOT NULL,
    track_artist TEXT,
    download_type TEXT NOT NULL, -- 'audio', 'lyrics', 'artwork', 'full'
    format TEXT, -- 'mp3', 'opus', 'lrc', 'jpg', etc
    file_path TEXT,
    file_size INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_download_history_user ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_timestamp ON download_history(timestamp);
